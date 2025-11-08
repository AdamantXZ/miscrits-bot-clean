require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const https = require('https');

console.log('🔧 Testing shared port WebSocket configuration...');

// 🚀 CONFIGURAÇÃO ESPECÍFICA PARA RENDER
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // Configurações específicas para problemas de rede
  rest: {
    timeout: 10000,
    retries: 3,
  },
  ws: {
    version: '10' // Forçar versão específica do gateway
  }
});

// 🛡️ SISTEMA DE AUTO-RECOVERY
let restartCount = 0;

process.on('unhandledRejection', (error) => {
  if (error.code === 10062 || error.code === 40060) return;
  console.error('❌ Unhandled Rejection:', error);
});

// Health Check com WebSocket test
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const botStatus = client.isReady() ? 'connected' : 'disconnected';
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: botStatus === 'connected' ? 'OK' : 'ERROR',
      bot: botStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      commands: client.commands?.size || 0
    }));
  } else if (req.url === '/websocket-test') {
    // Endpoint para testar WebSocket manualmente
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      websocket: 'available',
      discord_gateway: 'wss://gateway.discord.gg'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Miscrits Online - WebSocket Shared Port\n');
  }
});

// Carregar comandos
client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

commandFiles.forEach(file => {
  try {
    const command = require(`./commands/${file}`);
    if (command.data && command.data.name) {
      client.commands.set(command.data.name, command);
      console.log(`✅ ${command.data.name}`);
    }
  } catch (error) {
    console.error(`❌ ${file}:`, error.message);
  }
});

// ✅ EVENTOS DO CLIENT
client.once("clientReady", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  console.log(`📋 Commands: ${client.commands.size}`);
  console.log(`🌐 WebSocket Gateway: ${client.ws.gateway}`);
});

client.on("disconnect", () => {
  console.log('⚠️ Disconnected - reconnecting...');
  setTimeout(() => {
    client.destroy().then(() => {
      client.login(process.env.BOT_TOKEN).catch(console.error);
    });
  }, 5000);
});

client.on("error", (error) => {
  console.error('❌ Discord error:', error.message);
});

// ✅ INTERACTION HANDLER
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ ${interaction.commandName}:`, error.message);
    await interaction.reply({ content: "❌ Error!", flags: 64 });
  }
});

// ✅ PORTA DO RENDER
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server on Render port ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 WebSocket test: http://0.0.0.0:${PORT}/websocket-test`);
  
  // Self-ping
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || "https://miscrit-bot.onrender.com";
    https.get(`${url}/health`, (res) => {
      console.log("🌐 Ping:", res.statusCode);
    }).on('error', () => {});
  }, 240000);
});

// 🚀 CONEXÃO COM FALLBACKS
function connectBot() {
  console.log('🔑 Connecting to Discord Gateway...');
  
  // Timeout de 15 segundos
  const timeout = setTimeout(() => {
    console.log('⏰ Gateway timeout - Render network issue detected');
  }, 15000);

  client.login(process.env.BOT_TOKEN)
    .then(() => {
      clearTimeout(timeout);
      console.log('🎉 Gateway connected successfully!');
    })
    .catch(error => {
      clearTimeout(timeout);
      console.error('❌ Gateway failed:', error.message);
      console.log('🔧 Error code:', error.code || 'UNKNOWN');
      
      // Tentar reconexão com delay crescente
      const delay = Math.min(30000 * (restartCount + 1), 300000);
      console.log(`🔄 Retrying in ${delay/1000}s...`);
      restartCount++;
      setTimeout(connectBot, delay);
    });
}

// Iniciar
connectBot();

// Monitor de conexão
setInterval(() => {
  if (!client.isReady()) {
    console.log('⚠️ Connection lost - restarting...');
    client.destroy().then(() => {
      setTimeout(connectBot, 5000);
    });
  }
}, 30000);