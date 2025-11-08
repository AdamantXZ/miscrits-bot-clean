require("dotenv").config();
const WebSocket = require('ws');
const fs = require("fs");
const http = require('http');

console.log('🔧 MISCRITS BOT - SEGUINDO TUTORIAL WEBSOCKET MDN');

// ✅ 1. CREATING WEBSOCKET OBJECT (como no tutorial)
const wsUri = "wss://gateway.discord.gg/?v=10&encoding=json";
let websocket = null;
let heartbeatInterval = null;

// ✅ VARIÁVEIS DO TUTORIAL
let sequence = null;
let sessionId = null;
let isConnected = false;

// ✅ 2. LISTENING FOR OPEN EVENT
function setupWebSocket() {
  console.log('🔗 Creating WebSocket object...');
  websocket = new WebSocket(wsUri);

  websocket.addEventListener("open", () => {
    console.log("🎉 CONNECTED - WebSocket aberto!");
    // Como no tutorial: quando abre, envia identify
    sendIdentify();
  });

  // ✅ 3. LISTENING FOR ERRORS
  websocket.addEventListener("error", (e) => {
    console.log(`❌ WebSocket Error: ${e.message}`);
  });

  // ✅ 4. RECEIVING MESSAGES  
  websocket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);
    handleMessage(message);
  });

  // ✅ 5. HANDLING DISCONNECT
  websocket.addEventListener("close", () => {
    console.log("🔌 DISCONNECTED - WebSocket fechado");
    clearIntervals();
    
    // Como no tutorial: reconectar após delay
    console.log('🔄 Reconectando em 10 segundos...');
    setTimeout(() => setupWebSocket(), 10000);
  });
}

// ✅ ENVIAR IDENTIFY (equivalente ao "ping" do tutorial)
function sendIdentify() {
  console.log('🔑 Enviando IDENTIFY (como ping do tutorial)...');
  
  const identify = {
    op: 2, // IDENTIFY
    d: {
      token: process.env.BOT_TOKEN,
      properties: {
        $os: 'linux',
        $browser: 'custom_ws',
        $device: 'custom_ws'
      },
      intents: 1 // Apenas GUILDS - mínimo necessário
    }
  };
  
  sendToWebSocket(identify);
}

// ✅ 4. SENDING MESSAGES (como websocket.send() do tutorial)
function sendToWebSocket(data) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(data));
  }
}

// ✅ MANIPULAR MENSAGENS (como message event do tutorial)
function handleMessage(message) {
  const { op, d, s, t } = message;
  
  // Manter sequence atualizado
  if (s) sequence = s;
  
  switch (op) {
    case 10: // HELLO - Configurar heartbeat (como o intervalo do tutorial)
      console.log('🔧 HELLO recebido - configurando heartbeat...');
      startHeartbeat(d.heartbeat_interval);
      break;
      
    case 11: // HEARTBEAT ACK (como o "pong" do tutorial)
      console.log('💓 Heartbeat ACK (pong recebido)');
      break;
      
    case 0: // DISPATCH - Eventos normais
      handleDispatchEvent(t, d);
      break;
      
    case 7: // RECONNECT
      console.log('🔁 RECONNECT solicitado pelo Discord');
      websocket.close();
      break;
      
    case 9: // INVALID SESSION
      console.log('❌ Sessão inválida - reconectando...');
      websocket.close();
      break;
  }
}

// ✅ HEARTBEAT (como o ping do tutorial)
function startHeartbeat(interval) {
  console.log(`💓 Iniciando heartbeat a cada ${interval}ms (como ping do tutorial)`);
  
  // Enviar primeiro heartbeat imediatamente
  sendHeartbeat();
  
  // Configurar intervalo exatamente como no tutorial
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, interval);
}

function sendHeartbeat() {
  const heartbeat = { 
    op: 1, // HEARTBEAT
    d: sequence 
  };
  sendToWebSocket(heartbeat);
  console.log('💓 Heartbeat enviado (ping)');
}

// ✅ MANIPULAR EVENTOS DISPATCH
function handleDispatchEvent(eventType, data) {
  switch (eventType) {
    case 'READY':
      console.log('🎉 READY - Bot conectado com sucesso!');
      console.log(`🤖 ${data.user.username} está online!`);
      sessionId = data.session_id;
      isConnected = true;
      break;
      
    case 'INTERACTION_CREATE':
      console.log(`🔧 INTERACTION_CREATE: ${data.data.name}`);
      // ✅ ESTRATÉGIA SEGURA: Só logar, não responder (evitar rate limit)
      logInteraction(data);
      break;
      
    case 'RESUMED':
      console.log('🔁 Sessão retomada');
      break;
  }
}

// ✅ SÓ LOGAR INTERAÇÕES (EVITAR RATE LIMIT)
function logInteraction(interaction) {
  const { id, token, data } = interaction;
  const commandName = data.name;
  const subcommand = data.options?.[0]?.name;
  
  console.log(`📝 Interação recebida: /${commandName} ${subcommand}`);
  console.log(`   ID: ${id}, Token: ${token.substring(0, 10)}...`);
  
  // ✅ NÃO RESPONDER - IP PODE ESTAR BANIDO
  console.log('   ⚠️  Interação não respondida (evitando rate limit)');
}

// ✅ LIMPAR INTERVALOS (como clearInterval do tutorial)
function clearIntervals() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ✅ HEALTH CHECK SIMPLES
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const wsState = websocket ? websocket.readyState : 'null';
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: isConnected ? 'ONLINE' : 'CONNECTING',
      websocket_state: wsState,
      timestamp: new Date().toISOString(),
      mode: 'WebSocket Tutorial Mode',
      message: 'Seguindo tutorial MDN WebSocket - Apenas escutando'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - Modo Tutorial WebSocket\n');
  }
});

// ✅ INICIAR (como no tutorial)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  console.log('📖 APLICANDO TUTORIAL WEBSOCKET:');
  console.log('   1. ✅ Creating WebSocket object');
  console.log('   2. ✅ Listening for open event'); 
  console.log('   3. ✅ Listening for errors');
  console.log('   4. ✅ Sending messages & Receiving messages');
  console.log('   5. ✅ Handling disconnect');
  console.log('   🎯 Estratégia: Só escutar, não responder (evitar ban)');
  
  // ✅ HEARTBEAT HTTP (manter ativo)
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {
      console.log('🌐 HTTP Keep-alive');
    }).on('error', () => {});
  }, 300000); // 5 minutos
  
  // ✅ INICIAR WEBSOCKET (como no tutorial)
  console.log('🚀 Iniciando WebSocket em 3 segundos...');
  setTimeout(() => {
    setupWebSocket();
  }, 3000);
});

// ✅ SHUTDOWN (pagehide do tutorial)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM - Fechando WebSocket...');
  if (websocket) {
    websocket.close();
  }
  clearIntervals();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT - Fechando WebSocket...');
  if (websocket) {
    websocket.close();
  }
  clearIntervals();
  process.exit(0);
});