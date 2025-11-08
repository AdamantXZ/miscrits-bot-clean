require("dotenv").config();
const { REST, Routes, Collection } = require("discord.js");
const WebSocket = require('ws');
const fs = require("fs");
const http = require('http');
const crypto = require('crypto');

console.log('🔧 MISCRITS BOT - WEBSOCKET CUSTOM PARA RENDER');

class CustomDiscordWS {
  constructor() {
    this.ws = null;
    this.sequence = null;
    this.sessionId = null;
    this.heartbeatInterval = null;
    this.isConnected = false;
  }

  connect() {
    console.log('🔗 Conectando via WebSocket custom...');
    
    this.ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
    
    this.ws.on('open', () => {
      console.log('🎉 WebSocket conectado - enviando identify...');
      this.sendIdentify();
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data));
    });
    
    this.ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket fechado: ${code} - ${reason}`);
      this.isConnected = false;
      this.clearIntervals();
      
      // Reconectar após 10 segundos
      setTimeout(() => this.connect(), 10000);
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
  }
  
  sendIdentify() {
    const identify = {
      op: 2,
      d: {
        token: process.env.BOT_TOKEN,
        properties: {
          $os: 'linux',
          $browser: 'custom_ws',
          $device: 'custom_ws'
        },
        intents: 1 << 0 // GUILDS intent
      }
    };
    this.ws.send(JSON.stringify(identify));
  }
  
  handleMessage(message) {
    const { op, d, s, t } = message;
    
    if (s) this.sequence = s;
    
    switch (op) {
      case 10: // HELLO
        console.log('🔧 HELLO recebido - iniciando heartbeat');
        const interval = d.heartbeat_interval;
        this.startHeartbeat(interval);
        break;
        
      case 11: // HEARTBEAT ACK
        console.log('💓 Heartbeat ACK');
        break;
        
      case 0: // DISPATCH
        if (t === 'READY') {
          console.log('🎉 BOT PRONTO via WebSocket custom!');
          console.log(`🤖 Logado como: ${d.user.username}`);
          this.isConnected = true;
          this.sessionId = d.session_id;
        }
        break;
    }
  }
  
  startHeartbeat(interval) {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = { op: 1, d: this.sequence };
        this.ws.send(JSON.stringify(heartbeat));
        console.log('💓 Heartbeat enviado');
      }
    }, interval);
  }
  
  clearIntervals() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// ✅ BOT PRINCIPAL COM DISCORD.JS (para comandos)
const client = new (require("discord.js").Client)({ 
  intents: [require("discord.js").GatewayIntentBits.Guilds] 
});

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
  console.error('❌ Erro comandos:', error.message);
}

// ✅ HEALTH CHECK
const app = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    mode: 'Custom WebSocket + Discord.js REST',
    message: 'Bot funcionando em modo híbrido'
  }));
});

// ✅ INTERAÇÕES COM DISCORD.JS
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  let targetCommandName = commandMap[subcommand];
  
  if (!targetCommandName) {
    return await interaction.reply({ content: "❌ Subcomando não configurado!", ephemeral: true });
  }
  
  const command = client.commands.get(targetCommandName);
  if (!command) {
    return await interaction.reply({ content: "❌ Comando não configurado!", ephemeral: true });
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Erro comando:', error.message);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Erro no comando!", ephemeral: true });
      }
    } catch (e) {}
  }
});

// ✅ INICIAR TUDO
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  // ✅ HEARTBEAT HTTP
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}`, () => {
      console.log('💓 HTTP Heartbeat -', new Date().toLocaleTimeString());
    }).on('error', () => {});
  }, 120000);
  
  // ✅ TENTAR CONEXÃO DISCORD.JS PRIMEIRO
  setTimeout(() => {
    console.log('🔑 Tentando Discord.js...');
    client.login(process.env.BOT_TOKEN).catch(error => {
      console.error('❌ Discord.js falhou:', error.message);
      console.log('🔄 Iniciando WebSocket custom...');
      
      // ✅ SE DISCORD.JS FALHAR, TENTAR WEBSOCKET CUSTOM
      const customWS = new CustomDiscordWS();
      customWS.connect();
    });
  }, 2000);
});

// ✅ EVENTO READY DO DISCORD.JS (se funcionar)
client.once("ready", () => {
  console.log(`🎉 DISCORD.JS CONECTADO: ${client.user.tag}`);
});

client.on("error", (error) => {
  console.error('❌ Discord.js error:', error.message);
});

console.log('🚀 Bot iniciado - Modo híbrido WebSocket + REST');