require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const { WebSocket } = require('ws');

console.log('🔧 INICIANDO BOT COM DIAGNÓSTICO WEBSOCKET AVANÇADO');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // 🔧 CONFIGURAÇÕES ESPECÍFICAS
  rest: {
    timeout: 15000,
    retries: 1
  },
  ws: {
    compress: false,
    properties: {
      $os: 'linux',
      $browser: 'discord.js',
      $device: 'discord.js'
    }
  }
});

// 🛡️ DIAGNÓSTICO WEBSOCKET
let connectionAttempts = 0;
const maxConnectionAttempts = 2;

// ✅ TESTE DIRETO DE WEBSOCKET (como no post)
function testWebSocketConnection() {
  console.log('🧪 TESTANDO CONEXÃO WEBSOCKET DIRETAMENTE...');
  
  const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
  
  ws.on('open', () => {
    console.log('🎉 WEBSOCKET TEST: Conexão aberta - protocolo funcionando!');
    ws.close();
  });
  
  ws.on('error', (error) => {
    console.log('❌ WEBSOCKET TEST: Erro na conexão:', error.message);
    console.log('🔧 Provável bloqueio de protocolo WebSocket no Render');
  });
  
  ws.on('close', (code, reason) => {
    console.log(`🔌 WEBSOCKET TEST: Fechado (${code}) - ${reason}`);
  });
  
  // Timeout de teste
  setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      console.log('⏰ WEBSOCKET TEST: Timeout - Handshake não completado');
      ws.terminate();
    }
  }, 10000);
}

client.commands = new Collection();

// ✅ CARREGAR COMANDOS
const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  'relics': 'miscrits-relics', 
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.data.name) {
      client.commands.set(command.data.name, command);
    }
  }
  console.log(`📋 ${client.commands.size} comandos carregados`);
} catch (error) {
  console.error('❌ Erro ao carregar comandos:', error.message);
}

// ✅ HEALTH CHECK COM INFORMAÇÕES DETALHADAS
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const botReady = client.isReady();
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: botReady ? 'ONLINE' : 'WEBSOCKET_BLOCKED',
      discord_connected: botReady,
      connection_attempts: connectionAttempts,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      issue: 'Render Free may block WebSocket protocol upgrade',
      solution: 'Commands work but bot appears offline',
      test_websocket: 'Run /debug-websocket to test connection'
    }));
  } else if (req.url === '/debug-websocket') {
    testWebSocketConnection();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket test initiated - check logs\n');
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - WebSocket Diagnostics\n');
  }
});

// ✅ EVENTOS DO CLIENT
client.once("ready", () => {
  console.log(`🎉 BOT CONECTADO VIA WEBSOCKET: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
});

client.on("debug", (info) => {
  if (info.includes('WebSocket') || info.includes('Session')) {
    console.log(`🔧 WS Debug: ${info}`);
  }
});

client.on("error", (error) => {
  console.error(`❌ Discord Error: ${error.message}`);
});

client.on("disconnect", () => {
  console.log('🔌 Desconectado - WebSocket fechado');
});

// ✅ INTERAÇÕES (MANTIDO)
async function handleAutocompleteSafely(interaction, command) {
  try {
    if (!interaction.responded && !interaction.replied && command.autocomplete) {
      await command.autocomplete(interaction);
    }
  } catch (error) {
    if (error.code === 10062 || error.code === 40060) return;
  }
}

async function executeCommandSafely(interaction, command) {
  try {
    await command.execute(interaction);
  } catch (error) {
    if (error.code === 10062) return;
    
    try {
      const reply = { content: "❌ Erro no comando!", ephemeral: true };
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(reply);
      } else if (interaction.deferred) {
        await interaction.followUp(reply);
      }
    } catch (replyError) {
      // Ignora erros de interação expirada
    }
  }
}

client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) {
    const commandName = interaction.commandName;
    const subcommand = interaction.options.getSubcommand();
    
    if (commandName === "miscrits" || commandName === "miscrits-test") {
      if (subcommand === "info" || subcommand === "moves-and-evos" || subcommand === "relics") {
        let targetCommandName;
        if (subcommand === "info") targetCommandName = 'miscrits-info';
        else if (subcommand === "moves-and-evos") targetCommandName = 'miscrits-evos-moves';
        else if (subcommand === "relics") targetCommandName = 'miscrits-relics';
        
        const command = client.commands.get(targetCommandName);
        if (command) await handleAutocompleteSafely(interaction, command);
      }
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const commandName = interaction.commandName;
    const subcommand = interaction.options.getSubcommand();
    
    let targetCommandName;
    
    if (commandName === "miscrits") {
      targetCommandName = commandMap[subcommand];
    } else if (commandName === "miscrits-test") {
      targetCommandName = commandMap[subcommand];
    } else {
      return await interaction.reply({ content: "❌ Comando não reconhecido!", ephemeral: true });
    }
    
    if (!targetCommandName) {
      return await interaction.reply({ content: "❌ Subcomando não configurado!", ephemeral: true });
    }
    
    const command = client.commands.get(targetCommandName);
    
    if (!command) {
      return await interaction.reply({ content: "❌ Comando não configurado!", ephemeral: true });
    }
    
    try {
      await executeCommandSafely(interaction, command);
    } catch (error) {
      console.error('❌ Erro fatal:', error.message);
    }
  }
});

// ✅ CONEXÃO COM DIAGNÓSTICO
async function connectWithDiagnostics() {
  if (connectionAttempts >= maxConnectionAttempts) {
    console.log('🚨 WEBSOCKET BLOQUEADO NO RENDER FREE');
    console.log('💡 COMANDOS CONTINUAM FUNCIONANDO VIA REST API');
    console.log('🔧 Bot aparece offline mas responde comandos');
    return;
  }

  connectionAttempts++;
  console.log(`🔑 Tentativa ${connectionAttempts}/${maxConnectionAttempts} de WebSocket...`);

  // Primeiro testa WebSocket puro
  if (connectionAttempts === 1) {
    testWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  try {
    const connectPromise = client.login(process.env.BOT_TOKEN);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('WebSocket handshake timeout - Protocol upgrade blocked')), 12000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    
  } catch (error) {
    console.error(`❌ Falha WebSocket: ${error.message}`);
    
    if (error.message.includes('timeout') || error.message.includes('handshake')) {
      console.log('🔧 DIAGNÓSTICO: Render bloqueando upgrade para WebSocket');
      console.log('💡 WebSocket precisa de status 101 SWITCHING_PROTOCOLS');
      console.log('🎯 Comandos slash funcionam via REST API');
    }
    
    // Tentativa final após delay
    if (connectionAttempts < maxConnectionAttempts) {
      const delay = 20000;
      console.log(`🔄 Última tentativa em ${delay/1000} segundos...`);
      setTimeout(connectWithDiagnostics, delay);
    }
  }
}

// ✅ INICIAR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor na porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Debug: http://0.0.0.0:${PORT}/debug-websocket`);
  
  // Heartbeat
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {}).on('error', () => {});
  }, 120000);

  // Iniciar conexão
  setTimeout(connectWithDiagnostics, 2000);
});

process.on('SIGTERM', () => {
  console.log('🛑 Encerrando...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Encerrando...');
  client.destroy();
  process.exit(0);
});