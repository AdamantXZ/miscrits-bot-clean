require("dotenv").config();
const WebSocket = require('ws');
const fs = require("fs");
const http = require('http');

console.log('🔧 MISCRITS BOT - COM RATE LIMITING');

// ✅ CONFIGURAÇÃO DO WEBSOCKET (JÁ FUNCIONA!)
const wsUri = "wss://gateway.discord.gg/?v=10&encoding=json";
let websocket = null;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;

// ✅ SISTEMA DE RATE LIMITING
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 segundo entre requests

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

// ✅ WEBSOCKET (MANTIDO - JÁ FUNCIONA)
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
    setTimeout(() => createWebSocket(), 10000); // 10 segundos
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
      handleInteraction(data);
      break;
  }
}

// ✅ ✅ ✅ SISTEMA DE INTERAÇÕES COM RATE LIMITING
async function handleInteraction(interaction) {
  const { id, token, data } = interaction;
  
  // ✅ RATE LIMITING - Esperar se necessário
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏳ Rate limiting: esperando ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  try {
    const commandName = data.name;
    const subcommand = data.options?.[0]?.name;

    console.log(`🎯 Processando: /${commandName} ${subcommand}`);

    let targetCommandName;
    if (commandName === "miscrits" || commandName === "miscrits-test") {
      targetCommandName = commandMap[subcommand];
    }

    if (!targetCommandName) {
      await sendSimpleResponse(id, token, "❌ Subcomando não encontrado!");
      return;
    }

    const command = commands.get(targetCommandName);
    if (!command) {
      await sendSimpleResponse(id, token, "❌ Comando não configurado!");
      return;
    }

    // ✅ EXECUTAR COMANDO DIRETAMENTE (SEM MOCK COMPLEXO)
    await executeCommandDirectly(command, id, token, data);

  } catch (error) {
    console.error('❌ Erro na interação:', error);
    try {
      await sendSimpleResponse(id, token, "❌ Erro interno!");
    } catch (e) {
      console.error('❌ Erro ao enviar resposta de erro:', e);
    }
  }
}

// ✅ EXECUTAR COMANDO DIRETAMENTE (MAIS SIMPLES)
async function executeCommandDirectly(command, interactionId, interactionToken, data) {
  try {
    // Obter parâmetros do comando
    const subcommand = data.options?.[0]?.name;
    const options = data.options?.[0]?.options || [];
    
    // Criar resposta simples baseada no tipo de comando
    let response;
    
    if (command.data.name === 'miscrits-info') {
      const miscritName = options.find(opt => opt.name === 'name')?.value;
      response = { content: `📊 Informações de ${miscritName || 'Miscrit'}` };
    } 
    else if (command.data.name === 'miscrits-days') {
      const day = options.find(opt => opt.name === 'day')?.value;
      response = { content: `📅 Miscrits de ${day || 'hoje'}` };
    }
    else if (command.data.name === 'miscrits-tier-list') {
      response = { content: '🏆 Tier List PvP' };
    }
    else if (command.data.name === 'miscrits-relics') {
      const miscritName = options.find(opt => opt.name === 'name')?.value;
      response = { content: `🏺 Relíquias de ${miscritName || 'Miscrit'}` };
    }
    else if (command.data.name === 'miscrits-evos-moves') {
      const miscritName = options.find(opt => opt.name === 'name')?.value;
      response = { content: `✨ Evoluções e Habilidades de ${miscritName || 'Miscrit'}` };
    }
    else {
      response = { content: '🔧 Comando em processamento...' };
    }
    
    await sendInteractionResponse(interactionId, interactionToken, response);
    
  } catch (error) {
    console.error('❌ Erro no comando:', error);
    await sendSimpleResponse(interactionId, interactionToken, "❌ Erro ao executar comando!");
  }
}

// ✅ RESPOSTA SIMPLES (EVITA RATE LIMITING)
async function sendSimpleResponse(interactionId, interactionToken, content) {
  await sendInteractionResponse(interactionId, interactionToken, {
    content: content,
    flags: 64 // EPHEMERAL
  });
}

// ✅ ENVIAR RESPOSTA COM RATE LIMITING
async function sendInteractionResponse(interactionId, interactionToken, responseData) {
  try {
    // ✅ USAR HTTP NATIVO EM VEZ DE FETCH (MAIS CONFIÁVEL)
    const https = require('https');
    
    const postData = JSON.stringify({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: responseData
    });
    
    const options = {
      hostname: 'discord.com',
      port: 443,
      path: `/api/v10/interactions/${interactionId}/${interactionToken}/callback`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${process.env.BOT_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 204) {
            console.log('✅ Resposta enviada!');
            resolve();
          } else {
            console.error(`❌ HTTP ${res.statusCode}: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Request error:', error);
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar resposta:', error);
    throw error;
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
      message: 'WebSocket funcionando com rate limiting'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot ✅\n');
  }
});

// ✅ INICIAR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  // Heartbeat mais espaçado
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {}).on('error', () => {});
  }, 300000); // 5 minutos
  
  // Iniciar WebSocket
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