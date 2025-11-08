require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const WebSocket = require('ws');

// ✅ CONFIGURAÇÃO DO CLIENTE DISCORD COM WEBSOCKET CUSTOM
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // ✅ USA WEBSOCKET PERSONALIZADO
  ws: {
    properties: {
      $browser: "Discord iOS"
    }
  }
});

// 🛡️ SISTEMA DE AUTO-RECOVERY
let restartCount = 0;
let lastRestart = 0;

process.on('unhandledRejection', (error) => {
  if (error.code === 10062 || error.code === 40060) return;
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 ERRO CRÍTICO:', error);
  const now = Date.now();
  if (restartCount < 3 && (now - lastRestart) > 300000) {
    restartCount++;
    lastRestart = now;
    console.log(`🔄 Reiniciando... (tentativa ${restartCount}/3)`);
    setTimeout(() => process.exit(1), 10000);
  }
});

// ✅ WEBSOCKET SERVER PARA PROXY
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const botStatus = client.isReady() ? 'connected' : 'disconnected';
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: botStatus === 'connected' ? 'OK' : 'ERROR',
      bot: botStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      websocket: 'ACTIVE',
      commands: client.commands?.size || 0
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Miscrits Online - WebSocket Proxy Active!\n');
  }
});

// ✅ CRIANDO WEBSOCKET SERVER (ISSO É PERMITIDO NO RENDER)
const wss = new WebSocket.Server({ 
  server: server,
  path: '/websocket'
});

// ✅ GERENCIAMENTO DE CLIENTES WEBSOCKET
const wsClients = new Set();

wss.on('connection', function connection(ws) {
  console.log('✅ Novo cliente WebSocket conectado');
  wsClients.add(ws);
  
  ws.on('message', function message(data) {
    console.log('📨 Mensagem WebSocket recebida:', data.toString());
  });
  
  ws.on('close', function close() {
    console.log('❌ Cliente WebSocket desconectado');
    wsClients.delete(ws);
  });
  
  ws.on('error', function error(err) {
    console.error('❌ Erro WebSocket:', err.message);
  });
});

// ✅ FUNÇÃO PARA BROADCAST VIA WEBSOCKET
function broadcastToWebSockets(data) {
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Carregar comandos
client.commands = new Collection();

const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  'relics': 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

const testCommandMap = commandMap;

// ✅ CARREGAMENTO SEGURO DOS COMANDOS
try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  
  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${file}`);
      
      if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando carregado: ${command.data.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar comando ${file}:`, error.message);
    }
  }
} catch (error) {
  console.error('❌ Erro ao ler pasta commands:', error.message);
}

// ✅ EVENTOS DO CLIENTE DISCORD
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`📋 Comandos carregados: ${client.commands.size}`);
  console.log(`🔗 WebSocket Server ativo na porta ${process.env.PORT || 10000}`);
  
  // ✅ BROADCAST VIA WEBSOCKET
  broadcastToWebSockets({
    type: 'BOT_READY',
    botName: client.user.tag,
    timestamp: new Date().toISOString()
  });
});

client.on("disconnect", () => {
  console.log('⚠️ Bot desconectado - reconectando em 10s...');
  broadcastToWebSockets({
    type: 'BOT_DISCONNECTED',
    timestamp: new Date().toISOString()
  });
  
  setTimeout(() => {
    client.destroy().then(() => {
      client.login(process.env.BOT_TOKEN).catch(console.error);
    });
  }, 10000);
});

client.on("resume", () => {
  console.log('✅ Conexão restaurada');
  restartCount = 0;
  broadcastToWebSockets({
    type: 'BOT_RECONNECTED',
    timestamp: new Date().toISOString()
  });
});

// ✅ INTERAÇÕES E COMANDOS
async function handleAutocompleteSafely(interaction, command) {
  try {
    if (!interaction.responded && !interaction.replied && command.autocomplete) {
      await command.autocomplete(interaction);
    }
  } catch (error) {
    if (error.code === 10062 || error.code === 40060) return;
    console.error("❌ Erro no autocomplete:", error.message);
  }
}

async function executeCommandSafely(interaction, command) {
  try {
    await command.execute(interaction);
    
    // ✅ BROADCAST DE COMANDO EXECUTADO
    broadcastToWebSockets({
      type: 'COMMAND_EXECUTED',
      command: interaction.commandName,
      subcommand: interaction.options.getSubcommand(),
      user: interaction.user.tag,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    if (error.code === 10062) return;
    console.error('❌ Erro no comando:', error.message);
    
    try {
      const reply = {
        content: "❌ Ocorreu um erro ao executar esse comando!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(reply);
      } else if (interaction.deferred) {
        await interaction.followUp(reply);
      }
    } catch (replyError) {
      if (replyError.code !== 10062) {
        console.error('❌ Erro ao enviar mensagem de erro:', replyError.message);
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
        if (subcommand === "info") {
          targetCommandName = 'miscrits-info';
        } else if (subcommand === "moves-and-evos") {
          targetCommandName = 'miscrits-evos-moves';
        } else if (subcommand === "relics") {
          targetCommandName = 'miscrits-relics';
        }
        
        const command = client.commands.get(targetCommandName);
        if (command) {
          await handleAutocompleteSafely(interaction, command);
        }
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
      console.log(`🔧 Comando: /miscrits ${subcommand}`);
    } else if (commandName === "miscrits-test") {
      targetCommandName = testCommandMap[subcommand];
      console.log(`🧪 Comando teste: /miscrits-test ${subcommand}`);
    } else {
      const reply = {
        content: "❌ Comando não reconhecido!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    if (!targetCommandName) {
      const reply = {
        content: "❌ Subcomando não configurado!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    const command = client.commands.get(targetCommandName);
    
    if (!command) {
      const reply = {
        content: "❌ Comando não configurado corretamente!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    try {
      await executeCommandSafely(interaction, command);
    } catch (error) {
      console.error('❌ Erro fatal no comando:', error.message);
    }
  }
});

// ✅ INICIAR SERVIDOR
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP/WebSocket rodando na porta ${PORT}`);
  console.log(`🩺 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 WebSocket: ws://0.0.0.0:${PORT}/websocket`);
  console.log(`🔑 Iniciando conexão com Discord...`);
  
  // ✅ CONEXÃO COM DISCORD
  setTimeout(() => {
    connectBot();
  }, 2000);
});

// 🛡️ CONEXÃO SEGURA COM DISCORD
function connectBot() {
  console.log('🔑 Tentando conexão WebSocket com Discord...');
  
  client.login(process.env.BOT_TOKEN)
    .then(() => {
      console.log('✅ Conexão WebSocket estabelecida com Discord!');
    })
    .catch(error => {
      console.error('❌ ERRO NA CONEXÃO:', error.message);
      
      if (error.message.includes('WebSocket') || error.message.includes('timeout')) {
        console.log('🚨 WebSocket bloqueado - usando fallback...');
        // ✅ TENTATIVA COM CONFIGURAÇÃO ALTERNATIVA
        setTimeout(connectBot, 30000);
      } else {
        console.log('🔄 Reconectando em 30 segundos...');
        setTimeout(connectBot, 30000);
      }
    });
}

// ✅ KEEP-ALIVE
setInterval(() => {
  if (client.isReady()) {
    console.log('💓 Bot ativo -', new Date().toISOString());
    broadcastToWebSockets({
      type: 'HEARTBEAT',
      timestamp: new Date().toISOString(),
      clients: wsClients.size
    });
  }
}, 300000);