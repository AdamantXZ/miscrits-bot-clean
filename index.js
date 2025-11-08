require("dotenv").config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const http = require('http');

console.log('🔧 INICIANDO BOT COM ESTRATÉGIA WEBSOCKET + FALLBACK');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // 🔧 CONFIGURAÇÕES OTIMIZADAS PARA RENDER
  rest: {
    timeout: 10000,
    retries: 2
  },
  ws: {
    compress: false
  }
});

// 🛡️ SISTEMA DE CONEXÃO INTELIGENTE
let connectionAttempts = 0;
const maxConnectionAttempts = 3;
let isConnected = false;

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
      console.log(`✅ ${command.data.name} carregado`);
    }
  }
  console.log(`📋 ${client.commands.size} comandos carregados`);
} catch (error) {
  console.error('❌ Erro ao carregar comandos:', error.message);
}

// ✅ HEALTH CHECK COM STATUS REAL
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: isConnected ? 'ONLINE' : 'CONNECTING',
      discord_connected: isConnected,
      connection_attempts: connectionAttempts,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      mode: 'WebSocket with Fallback',
      render_issue: 'WebSocket may be limited on Free tier'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - WebSocket Connection\n');
  }
});

// ✅ EVENTO READY - CONEXÃO BEM-SUCEDIDA
client.once("ready", () => {
  isConnected = true;
  console.log(`🎉 BOT CONECTADO: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log(`💓 Ping: ${client.ws.ping}ms`);
});

// ✅ EVENTOS DE ERRO - DIAGNÓSTICO
client.on("error", (error) => {
  console.error(`❌ Erro Discord: ${error.message}`);
});

client.on("disconnect", () => {
  isConnected = false;
  console.log('🔌 Desconectado do Discord');
  scheduleReconnection();
});

// ✅ INTERAÇÕES - MESMA LÓGICA
async function handleAutocompleteSafely(interaction, command) {
  try {
    if (!interaction.responded && !interaction.replied && command.autocomplete) {
      await command.autocomplete(interaction);
    }
  } catch (error) {
    if (error.code === 10062 || error.code === 40060) return;
    console.error("❌ Autocomplete:", error.message);
  }
}

async function executeCommandSafely(interaction, command) {
  try {
    await command.execute(interaction);
  } catch (error) {
    if (error.code === 10062) return;
    console.error('❌ Comando:', error.message);
    
    try {
      const reply = { content: "❌ Erro no comando!", ephemeral: true };
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(reply);
      } else if (interaction.deferred) {
        await interaction.followUp(reply);
      }
    } catch (replyError) {
      if (replyError.code !== 10062) {
        console.error('❌ Erro resposta:', replyError.message);
      }
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
      return await interaction.reply({ 
        content: "❌ Comando não reconhecido!", 
        ephemeral: true 
      });
    }
    
    if (!targetCommandName) {
      return await interaction.reply({ 
        content: "❌ Subcomando não configurado!", 
        ephemeral: true 
      });
    }
    
    const command = client.commands.get(targetCommandName);
    
    if (!command) {
      return await interaction.reply({ 
        content: "❌ Comando não configurado!", 
        ephemeral: true 
      });
    }
    
    try {
      console.log(`🚀 Executando: ${targetCommandName}`);
      await executeCommandSafely(interaction, command);
    } catch (error) {
      console.error('❌ Erro fatal:', error.message);
    }
  }
});

// ✅ CONEXÃO INTELIGENTE COM FALLBACK
async function connectToDiscord() {
  if (connectionAttempts >= maxConnectionAttempts) {
    console.log('🚨 MÁXIMO DE TENTATIVAS WEBSOCKET ATINGIDO');
    console.log('💡 Modo: Comandos funcionam, bot offline no Discord');
    console.log('🔧 Health check permanece ativo');
    return;
  }

  connectionAttempts++;
  console.log(`🔑 Tentativa ${connectionAttempts}/${maxConnectionAttempts} de conexão WebSocket...`);

  try {
    // ✅ TIMEOUT MAIS CURTO PARA DETECTAR RÁPIDO
    const connectPromise = client.login(process.env.BOT_TOKEN);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('WebSocket timeout - Render Free limit')), 10000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    
  } catch (error) {
    console.error(`❌ Falha WebSocket: ${error.message}`);
    
    if (error.message.includes('timeout') || error.message.includes('WebSocket')) {
      console.log('🔧 DIAGNÓSTICO: Render Free bloqueando WebSocket');
      console.log('💡 SOLUÇÃO: Comandos funcionam, mas bot aparece offline');
    }
    
    // ✅ AGENDAR RECONEXÃO INTELIGENTE
    const delay = Math.min(30000 * connectionAttempts, 120000);
    console.log(`🔄 Próxima tentativa em ${delay/1000} segundos...`);
    setTimeout(connectToDiscord, delay);
  }
}

function scheduleReconnection() {
  if (connectionAttempts < maxConnectionAttempts) {
    const delay = 15000; // 15 segundos
    console.log(`🔄 Reconexão agendada em ${delay/1000} segundos`);
    setTimeout(connectToDiscord, delay);
  }
}

// ✅ INICIAR SERVIDOR E CONEXÃO
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor na porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  // SELF-PING
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {
      console.log('💓 Heartbeat -', new Date().toISOString());
    }).on('error', () => {});
  }, 2 * 60 * 1000);

  // INICIAR CONEXÃO DISCORD
  setTimeout(connectToDiscord, 2000);
});

// ✅ SHUTDOWN
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