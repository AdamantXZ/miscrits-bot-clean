require("dotenv").config();
const WebSocket = require('ws');
const fs = require("fs");
const http = require('http');

console.log('🔧 MISCRITS BOT - ESTRATÉGIA SEM API DISCORD');

// ✅ CONFIGURAÇÃO DO WEBSOCKET
const wsUri = "wss://gateway.discord.gg/?v=10&encoding=json";
let websocket = null;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;

// ✅ CARREGAR COMANDOS
const commands = new Map();
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
      commands.set(command.data.name, command);
    }
  }
  console.log(`📋 ${commands.size} comandos carregados`);
} catch (error) {
  console.error('❌ Erro comandos:', error.message);
}

// ✅ WEBSOCKET
function createWebSocket() {
  console.log('🔗 Criando WebSocket...');
  websocket = new WebSocket(wsUri);

  websocket.addEventListener("open", () => {
    console.log("🎉 CONNECTED!");
    sendIdentify();
  });

  websocket.addEventListener("error", (e) => {
    console.log(`❌ ERROR: ${e.message}`);
  });

  websocket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);
    handleGatewayMessage(message);
  });

  websocket.addEventListener("close", () => {
    console.log("🔌 DISCONNECTED");
    clearIntervals();
    setTimeout(() => createWebSocket(), 15000);
  });
}

function sendIdentify() {
  const identify = {
    op: 2,
    d: {
      token: process.env.BOT_TOKEN,
      properties: {
        $os: 'linux',
        $browser: 'custom_ws',
        $device: 'custom_ws'
      },
      intents: 1 // APENAS GUILDS
    }
  };
  sendMessage(identify);
}

function sendMessage(data) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(data));
  }
}

function handleGatewayMessage(message) {
  const { op, d, s, t } = message;
  
  if (s) sequence = s;
  
  switch (op) {
    case 10: // HELLO
      setupHeartbeat(d.heartbeat_interval);
      break;
      
    case 11: // HEARTBEAT ACK
      break;
      
    case 0: // DISPATCH
      handleDispatch(t, d);
      break;
  }
}

function setupHeartbeat(interval) {
  sendHeartbeat();
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, interval);
}

function sendHeartbeat() {
  const heartbeat = { op: 1, d: sequence };
  sendMessage(heartbeat);
}

function handleDispatch(eventType, data) {
  switch (eventType) {
    case 'READY':
      console.log('🎉 BOT PRONTO!');
      console.log(`🤖 ${data.user.username} online!`);
      sessionId = data.session_id;
      break;
      
    case 'INTERACTION_CREATE':
      console.log(`🔧 Interação: ${data.data.name} ${data.data.options?.[0]?.name || ''}`);
      // ✅ NÃO PROCESSAR AGORA - IP ESTÁ BANIDO
      console.log('⚠️ IP banido - ignorando interação');
      break;
  }
}

function clearIntervals() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ✅ HEALTH CHECK
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const isConnected = websocket && websocket.readyState === WebSocket.OPEN;
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: isConnected ? 'ONLINE' : 'CONNECTING',
      timestamp: new Date().toISOString(),
      message: 'Bot online - IP temporariamente banido pela API Discord',
      solution: 'Aguardando ban expirar ou migrar para outro hosting'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - Aguardando ban expirar\n');
  }
});

// ✅ INICIAR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  console.log('🚨 SITUAÇÃO: IP DO RENDER BANIDO PELO DISCORD');
  console.log('💡 SOLUÇÕES:');
  console.log('   1. Aguardar 1-2 horas para ban expirar');
  console.log('   2. Migrar para Railway.app (recomendado)');
  console.log('   3. Usar Fly.io ou outro hosting');
  console.log('   4. Contatar suporte do Render sobre IP banido');
  
  // Heartbeat mínimo
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {}).on('error', () => {});
  }, 300000);
  
  // Iniciar WebSocket (só para manter online)
  setTimeout(() => {
    createWebSocket();
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('🛑 Encerrando...');
  if (websocket) websocket.close();
  clearIntervals();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Encerrando...');
  if (websocket) websocket.close();
  clearIntervals();
  process.exit(0);
});