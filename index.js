require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const https = require('https');

console.log('🔧 INICIANDO BOT COM OTIMIZAÇÕES WEBSOCKET');

// 🔧 CONFIGURAÇÕES ESPECÍFICAS PARA RENDER FREE
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // ✅ OTIMIZAÇÕES SUGERIDAS PELOS COMENTÁRIOS
  rest: {
    timeout: 30000,
    retries: 3,
    offset: 100
  },
  ws: {
    large_threshold: 50,
    compress: false,
    properties: {
      $os: 'linux',
      $browser: 'discord.js',
      $device: 'discord.js'
    }
  },
  // ✅ EVITA RECONEXÕES MUITO RÁPIDAS (problema comum)
  failIfNotExists: false,
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: false
  },
  // ✅ CONFIGURAÇÃO DE SHARDS (útil para conexões problemáticas)
  shards: 'auto',
  shardCount: 1,
  presence: {
    status: 'online',
    activities: [{
      name: '/miscrits help',
      type: 0 // Playing
    }]
  }
});

// 🛡️ SISTEMA DE CONEXÃO MELHORADO (baseado nos comentários)
let connectionAttempts = 0;
const maxConnectionAttempts = 8;
let connectionTimeout = null;
let isConnecting = false;

// ✅ PADRÃO SINGLETON SUGERIDO NOS COMENTÁRIOS
class ConnectionManager {
  constructor() {
    this.retryDelay = 5000;
    this.maxRetries = 10;
  }

  async connect() {
    if (isConnecting) {
      console.log('⚠️ Conexão já em andamento...');
      return;
    }

    isConnecting = true;
    connectionAttempts++;

    console.log(`🔑 Tentativa ${connectionAttempts}/${maxConnectionAttempts} de conexão WebSocket...`);

    try {
      // ✅ TIMEOUT PARA EVITAR CONGELAMENTO (sugerido nos comentários)
      const connectPromise = client.login(process.env.BOT_TOKEN);
      
      const timeoutPromise = new Promise((_, reject) => {
        connectionTimeout = setTimeout(() => {
          reject(new Error('WebSocket handshake timeout (Render Free limitation)'));
        }, 15000); // 15 segundos
      });

      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log('🎉 Conexão WebSocket estabelecida com sucesso!');
      connectionAttempts = 0;
      isConnecting = false;
      
    } catch (error) {
      isConnecting = false;
      clearTimeout(connectionTimeout);
      
      this.handleConnectionError(error);
    }
  }

  handleConnectionError(error) {
    console.error(`❌ Falha na conexão WebSocket: ${error.message}`);
    
    // ✅ DIAGNÓSTICO ESPECÍFICO (baseado nos comentários)
    if (error.message.includes('timeout')) {
      console.log('🔧 DIAGNÓSTICO: Timeout no handshake WebSocket');
      console.log('💡 PROVÁVEL: Render Free bloqueando conexões persistentes');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.log('🔧 DIAGNÓSTICO: Problema de DNS/rede');
      console.log('💡 SUGESTÃO: Tentar novamente com backoff exponencial');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('🔧 DIAGNÓSTICO: Token inválido');
      console.log('💡 SOLUÇÃO: Verificar BOT_TOKEN nas variáveis de ambiente');
    }

    this.scheduleReconnection();
  }

  scheduleReconnection() {
    if (connectionAttempts >= maxConnectionAttempts) {
      console.log(`🚨 MÁXIMO DE TENTATIVAS (${maxConnectionAttempts}) - Entrando em modo de espera`);
      console.log('💡 O Render Free pode ter limitações de WebSocket persistentes');
      
      // ✅ MODO DE ESPERA INTELLIGENTE
      const longDelay = 10 * 60 * 1000; // 10 minutos
      console.log(`⏰ Próxima tentativa em ${longDelay/1000/60} minutos...`);
      
      setTimeout(() => {
        connectionAttempts = 0;
        this.connect();
      }, longDelay);
      return;
    }

    // ✅ BACKOFF EXPONENCIAL (sugerido nos comentários)
    const delay = Math.min(30000 * Math.pow(1.5, connectionAttempts), 300000); // Max 5 minutos
    console.log(`🔄 Reconexão em ${delay/1000} segundos...`);
    
    setTimeout(() => this.connect(), delay);
  }
}

const connectionManager = new ConnectionManager();

// Health Check com diagnóstico WebSocket
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const botStatus = client.isReady() ? 'connected' : 'disconnected';
    const wsStatus = client.ws?.status || 'unknown';
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: botStatus === 'connected' ? 'OK' : 'CONNECTING',
      bot: botStatus,
      websocket: wsStatus,
      connection_attempts: connectionAttempts,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      render_issue: 'WebSocket may be blocked on Free tier',
      commands: client.commands?.size || 0
    }));
  } else if (req.url === '/debug') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      client_ready: client.isReady(),
      ws_status: client.ws?.status || 'unknown',
      ws_ping: client.ws?.ping || -1,
      gateway: 'wss://gateway.discord.gg',
      connection_attempts: connectionAttempts,
      is_connecting: isConnecting
    }));
  } else if (req.url === '/reconnect') {
    // ✅ ENDPOINT PARA FORÇAR RECONEXÃO (útil para debugging)
    if (!isConnecting) {
      connectionAttempts = 0;
      connectionManager.connect();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Reconnection triggered' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - WebSocket diagnostics enabled\n');
  }
});

// Carregar comandos
client.commands = new Collection();

const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  'relics': 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

// ✅ CARREGAMENTO SEGURO DOS COMANDOS
try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  
  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${file}`);
      
      if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
        console.log(`✅ ${command.data.name} carregado`);
      }
    } catch (error) {
      console.error(`❌ Erro em ${file}:`, error.message);
    }
  }
} catch (error) {
  console.error('❌ Erro ao carregar comandos:', error.message);
}

// ✅ EVENTO READY CORRETO
client.once("ready", () => {
  console.log(`🎉 BOT CONECTADO: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log(`🔧 WebSocket: ${client.ws.status}`);
  console.log(`💓 Ping: ${client.ws.ping}ms`);
});

// ✅ EVENTOS DE WEBSOCKET PARA DIAGNÓSTICO
client.on("debug", (info) => {
  if (info.includes('WebSocket') || info.includes('Heartbeat') || info.includes('Session')) {
    console.log(`🔧 WS: ${info.substring(0, 100)}...`);
  }
});

client.on("warn", (info) => {
  console.log(`⚠️ Discord: ${info}`);
});

client.on("error", (error) => {
  console.error(`❌ Discord Error:`, error.message);
});

client.on("disconnect", (event) => {
  console.log(`🔌 Desconectado: ${event.code} - ${event.reason}`);
  console.log('🔄 Agendando reconexão automática...');
  setTimeout(() => connectionManager.connect(), 5000);
});

client.on("resume", () => {
  console.log('✅ Sessão WebSocket retomada');
});

// ✅ INTERAÇÕES (mantido igual)
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
      const reply = {
        content: "❌ Erro no comando!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      
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
      await executeCommandSafely(interaction, command);
    } catch (error) {
      console.error('❌ Erro fatal:', error.message);
    }
  }
});

// ✅ INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Debug: http://0.0.0.0:${PORT}/debug`);
  console.log(`🔄 Reconnect: http://0.0.0.0:${PORT}/reconnect`);
  
  // ✅ SELF-PING OTIMIZADO
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log(`💓 Heartbeat - Bot: ${status.bot}, WS: ${status.websocket}`);
        } catch (e) {
          console.log('💓 Heartbeat - Status:', res.statusCode);
        }
      });
    }).on('error', () => {}).setTimeout(5000, () => {});
  }, 2 * 60 * 1000);
  
  // ✅ INICIAR CONEXÃO COM DISCORD
  setTimeout(() => {
    connectionManager.connect();
  }, 3000);
});

// ✅ TRATAMENTO DE SHUTDOWN
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM - Encerrando...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT - Encerrando...');
  client.destroy();
  process.exit(0);
});