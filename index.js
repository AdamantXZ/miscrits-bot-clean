require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const WebSocket = require('ws');

// 🛡️ SISTEMA DE FALLBACK PARA VARIÁVEIS DE AMBIENTE
function getEnvVar(key, defaultValue = null) {
  // Tenta todas as fontes possíveis
  const value = process.env[key] || defaultValue;
  
  if (!value && key === 'BOT_TOKEN') {
    console.error('🚨 CRÍTICO: BOT_TOKEN não encontrado em nenhuma fonte!');
    console.log('💡 Verifique as variáveis de ambiente no painel do Render');
  }
  
  return value;
}

// ✅ CONFIGURAÇÃO DO CLIENTE DISCORD
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // ✅ CONFIGURAÇÕES OTIMIZADAS PARA RENDER
  rest: {
    timeout: 30000,
    retries: 3
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

// ✅ WEBSOCKET SERVER PARA PROXY E MONITORAMENTO
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const botStatus = client.isReady() ? 'connected' : 'disconnected';
    
    // ✅ DIAGNÓSTICO DETALHADO DAS VARIÁVEIS
    const envDiagnosis = {
      BOT_TOKEN: getEnvVar('BOT_TOKEN') ? '✅ PRESENTE' : '❌ AUSENTE',
      PORT: getEnvVar('PORT', '10000'),
      RENDER_EXTERNAL_URL: getEnvVar('RENDER_EXTERNAL_URL', 'Não definida'),
      NODE_ENV: getEnvVar('NODE_ENV', 'Não definida')
    };
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.end(JSON.stringify({ 
      status: botStatus === 'connected' ? 'OK' : 'ERROR',
      bot: botStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      websocket: 'ACTIVE',
      commands: client.commands?.size || 0,
      environment_diagnosis: envDiagnosis,
      render_service: getEnvVar('RENDER_SERVICE_NAME', 'Não detectado')
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Miscrits Online - WebSocket Proxy Active!\n');
  }
});

// ✅ CRIANDO WEBSOCKET SERVER
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
  console.log(`🎉 BOT CONECTADO COM SUCESSO!`);
  console.log(`🤖 Nome: ${client.user.tag}`);
  console.log(`📋 Comandos: ${client.commands.size}`);
  console.log(`🔗 WebSocket Server: porta ${getEnvVar('PORT', '10000')}`);
  
  // ✅ BROADCAST VIA WEBSOCKET
  broadcastToWebSockets({
    type: 'BOT_READY',
    botName: client.user.tag,
    timestamp: new Date().toISOString(),
    status: 'CONNECTED'
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
      connectBot();
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
const PORT = getEnvVar('PORT', '10000');
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP/WebSocket rodando na porta ${PORT}`);
  console.log(`🩺 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 WebSocket: ws://0.0.0.0:${PORT}/websocket`);
  
  // ✅ DIAGNÓSTICO INICIAL
  console.log('🔍 Diagnóstico de Variáveis de Ambiente:');
  console.log(`   - BOT_TOKEN: ${getEnvVar('BOT_TOKEN') ? '✅ PRESENTE' : '❌ AUSENTE'}`);
  console.log(`   - PORT: ${getEnvVar('PORT', '10000 (fallback)')}`);
  console.log(`   - RENDER_EXTERNAL_URL: ${getEnvVar('RENDER_EXTERNAL_URL', 'Não definida')}`);
  
  console.log(`🔑 Iniciando conexão com Discord em 3 segundos...`);
  
  // ✅ CONEXÃO COM DISCORD
  setTimeout(() => {
    connectBot();
  }, 3000);
});

// 🛡️ CONEXÃO SEGURA COM DISCORD
function connectBot() {
  const botToken = getEnvVar('BOT_TOKEN');
  
  if (!botToken) {
    console.error('🚨 CRÍTICO: BOT_TOKEN não encontrado!');
    console.log('💡 AÇÃO: Verifique as variáveis de ambiente no painel do Render');
    console.log('🔄 Tentando novamente em 60 segundos...');
    setTimeout(connectBot, 60000);
    return;
  }
  
  console.log('🔑 Tentando conexão WebSocket com Discord...');
  console.log('⏱️ Timeout: 30 segundos');
  
  // ✅ TIMEOUT PARA DETECTAR BLOQUEIO
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('WEBSOCKET_TIMEOUT: Handshake excedeu 30s - Render bloqueando')), 30000);
  });
  
  const loginPromise = client.login(botToken);
  
  Promise.race([loginPromise, timeoutPromise])
    .then(() => {
      console.log('🎉 CONEXÃO WEBSOCKET ESTABELECIDA COM SUCESSO!');
      broadcastToWebSockets({
        type: 'WEBSOCKET_SUCCESS',
        message: 'Conectado ao Discord',
        timestamp: new Date().toISOString()
      });
    })
    .catch(error => {
      console.error('❌ ERRO NA CONEXÃO WEBSOCKET:', error.message);
      
      if (error.message.includes('WEBSOCKET_TIMEOUT')) {
        console.log('🚨 CONFIRMADO: Render está BLOQUEANDO WebSocket para Discord');
        console.log('💡 SOLUÇÃO: Necessário migrar para Railway/Heroku ou usar abordagem alternativa');
      } else if (error.message.includes('token') || error.message.includes('TOKEN_INVALID')) {
        console.log('🔐 ERRO: Token inválido ou formato incorreto');
        console.log('💡 VERIFIQUE: BOT_TOKEN no painel do Render');
      }
      
      console.log('🔄 Tentando reconectar em 45 segundos...');
      setTimeout(connectBot, 45000);
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