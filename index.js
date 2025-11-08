require("dotenv").config();
const WebSocket = require('ws');
const fs = require("fs");
const http = require('http');

console.log('🔧 MISCRITS BOT - WEBSOCKET CLIENT PURA (TUTORIAL)');

// ✅ CONFIGURAÇÃO DO WEBSOCKET COMO NO TUTORIAL
const wsUri = "wss://gateway.discord.gg/?v=10&encoding=json";
let websocket = null;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;

// ✅ CARREGAR COMANDOS PARA AS INTERAÇÕES
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

// ✅ 1. CRIANDO WEBSOCKET OBJECT (como no tutorial)
function createWebSocket() {
  console.log('🔗 Criando WebSocket object...');
  websocket = new WebSocket(wsUri);

  // ✅ 2. LISTENING FOR OPEN EVENT
  websocket.addEventListener("open", () => {
    console.log("🎉 CONNECTED - WebSocket aberto!");
    // Enviar IDENTIFY assim que conectar
    sendIdentify();
  });

  // ✅ 3. LISTENING FOR ERRORS
  websocket.addEventListener("error", (e) => {
    console.log(`❌ ERROR: ${e.message}`);
  });

  // ✅ 4. RECEIVING MESSAGES
  websocket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);
    handleGatewayMessage(message);
  });

  // ✅ 5. HANDLING DISCONNECT
  websocket.addEventListener("close", () => {
    console.log("🔌 DISCONNECTED");
    clearIntervals();
    // Reconectar após 5 segundos
    setTimeout(() => createWebSocket(), 5000);
  });
}

// ✅ ENVIAR IDENTIFY PARA DISCORD
function sendIdentify() {
  console.log('🔑 Enviando IDENTIFY...');
  const identify = {
    op: 2, // IDENTIFY
    d: {
      token: process.env.BOT_TOKEN,
      properties: {
        $os: 'linux',
        $browser: 'custom_ws',
        $device: 'custom_ws'
      },
      intents: 1 // GUILDS intent apenas
    }
  };
  sendMessage(identify);
}

// ✅ 4. SENDING MESSAGES (como no tutorial)
function sendMessage(data) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(data));
  }
}

// ✅ MANIPULAR MENSAGENS DO GATEWAY
function handleGatewayMessage(message) {
  const { op, d, s, t } = message;
  
  if (s) sequence = s;
  
  switch (op) {
    case 10: // HELLO
      console.log('🔧 HELLO recebido - configurando heartbeat');
      setupHeartbeat(d.heartbeat_interval);
      break;
      
    case 11: // HEARTBEAT ACK
      console.log('💓 Heartbeat acknowledged');
      break;
      
    case 0: // DISPATCH
      handleDispatch(t, d);
      break;
  }
}

// ✅ CONFIGURAR HEARTBEAT (como o ping do tutorial)
function setupHeartbeat(interval) {
  console.log(`💓 Iniciando heartbeat a cada ${interval}ms`);
  
  // Enviar primeiro heartbeat imediatamente
  sendHeartbeat();
  
  // Configurar intervalo como no tutorial
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, interval);
}

function sendHeartbeat() {
  const heartbeat = { op: 1, d: sequence };
  sendMessage(heartbeat);
  console.log('💓 Heartbeat enviado');
}

// ✅ MANIPULAR EVENTOS DISPATCH
function handleDispatch(eventType, data) {
  switch (eventType) {
    case 'READY':
      console.log('🎉 BOT PRONTO via WebSocket puro!');
      console.log(`🤖 Logado como: ${data.user.username}`);
      sessionId = data.session_id;
      break;
      
    case 'INTERACTION_CREATE':
      handleInteraction(data);
      break;
  }
}

// ✅ MANIPULAR INTERAÇÕES
async function handleInteraction(interaction) {
  if (interaction.type === 2) { // APPLICATION_COMMAND
    const commandName = interaction.data.name;
    const subcommand = interaction.data.options?.[0]?.name;
    
    console.log(`🔧 Interação: ${commandName} ${subcommand}`);
    
    let targetCommandName;
    if (commandName === "miscrits" || commandName === "miscrits-test") {
      targetCommandName = commandMap[subcommand];
    }
    
    if (targetCommandName) {
      const command = commands.get(targetCommandName);
      if (command) {
        try {
          // Simular a interação do Discord.js
          const mockInteraction = {
            reply: async (content) => {
              // Enviar resposta via WebSocket
              sendInteractionResponse(interaction.id, interaction.token, content);
            },
            options: {
              getSubcommand: () => subcommand,
              getString: (name) => interaction.data.options?.[0]?.options?.find(opt => opt.name === name)?.value
            },
            commandName: commandName
          };
          
          await command.execute(mockInteraction);
        } catch (error) {
          console.error('❌ Erro no comando:', error);
          sendInteractionResponse(interaction.id, interaction.token, {
            content: "❌ Erro ao executar comando!"
          });
        }
      }
    }
  }
}

// ✅ ENVIAR RESPOSTA DE INTERAÇÃO
function sendInteractionResponse(interactionId, interactionToken, data) {
  const response = {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: data
  };
  
  // Usar REST API para responder (mais confiável)
  fetch(`https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${process.env.BOT_TOKEN}`
    },
    body: JSON.stringify(response)
  }).catch(error => {
    console.error('❌ Erro ao enviar resposta:', error);
  });
}

// ✅ LIMPAR INTERVALOS
function clearIntervals() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ✅ HEALTH CHECK SERVER
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const isConnected = websocket && websocket.readyState === WebSocket.OPEN;
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: isConnected ? 'ONLINE' : 'CONNECTING',
      websocket_state: websocket ? websocket.readyState : 'null',
      timestamp: new Date().toISOString(),
      mode: 'Pure WebSocket Client',
      message: 'Seguindo tutorial WebSocket MDN'
    }));
  } else if (req.url === '/start-websocket') {
    createWebSocket();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket iniciado\n');
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - WebSocket Puro\n');
  }
});

// ✅ INICIAR SERVIDOR E WEBSOCKET
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Start WS: http://0.0.0.0:${PORT}/start-websocket`);
  
  // ✅ HEARTBEAT HTTP (manter ativo)
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {
      console.log('🌐 HTTP Heartbeat -', new Date().toLocaleTimeString());
    }).on('error', () => {});
  }, 120000);
  
  // ✅ INICIAR WEBSOCKET (como no tutorial)
  console.log('🚀 Iniciando WebSocket em 3 segundos...');
  setTimeout(() => {
    createWebSocket();
  }, 3000);
});

// ✅ 5. HANDLING DISCONNECT (shutdown)
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

console.log('📖 Seguindo tutorial WebSocket:');
console.log('1. ✅ Creating WebSocket object');
console.log('2. ✅ Listening for open event'); 
console.log('3. ✅ Listening for errors');
console.log('4. ✅ Sending messages & Receiving messages');
console.log('5. ✅ Handling disconnect');