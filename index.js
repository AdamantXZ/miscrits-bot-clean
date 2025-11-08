require("dotenv").config();
const WebSocket = require('ws');
const fs = require("fs");
const http = require('http');

console.log('🔧 MISCRITS BOT - WEBSOCKET FUNCIONANDO! CORRIGINDO COMANDOS');

// ✅ CONFIGURAÇÃO DO WEBSOCKET (JÁ FUNCIONA!)
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
      console.log(`✅ ${command.data.name} carregado`);
    }
  }
  console.log(`📋 ${commands.size} comandos carregados`);
} catch (error) {
  console.error('❌ Erro comandos:', error.message);
}

// ✅ WEBSOCKET (JÁ FUNCIONA - MANTIDO)
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
    setTimeout(() => createWebSocket(), 5000);
  });
}

function sendIdentify() {
  console.log('🔑 Enviando IDENTIFY...');
  const identify = {
    op: 2,
    d: {
      token: process.env.BOT_TOKEN,
      properties: {
        $os: 'linux',
        $browser: 'custom_ws',
        $device: 'custom_ws'
      },
      intents: 1 | (1 << 9) // GUILDS + MESSAGE_CONTENT para interações
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
      console.log('🔧 HELLO - configurando heartbeat');
      setupHeartbeat(d.heartbeat_interval);
      break;
      
    case 11: // HEARTBEAT ACK
      console.log('💓 Heartbeat ACK');
      break;
      
    case 0: // DISPATCH
      handleDispatch(t, d);
      break;
  }
}

function setupHeartbeat(interval) {
  console.log(`💓 Heartbeat: ${interval}ms`);
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
      console.log(`🔧 INTERAÇÃO: ${data.data.name} ${data.data.options?.[0]?.name || ''}`);
      handleInteraction(data);
      break;
  }
}

// ✅ ✅ ✅ SISTEMA DE INTERAÇÕES CORRIGIDO
async function handleInteraction(interaction) {
  const { id, token, data } = interaction;
  
  try {
    // ✅ DETERMINAR QUAL COMANDO EXECUTAR
    let targetCommandName;
    const commandName = data.name;
    const subcommand = data.options?.[0]?.name;

    console.log(`🎯 Processando: /${commandName} ${subcommand}`);

    if (commandName === "miscrits" || commandName === "miscrits-test") {
      targetCommandName = commandMap[subcommand];
    }

    if (!targetCommandName) {
      await sendInteractionResponse(id, token, {
        content: "❌ Subcomando não encontrado!",
        flags: 64
      });
      return;
    }

    const command = commands.get(targetCommandName);
    if (!command) {
      await sendInteractionResponse(id, token, {
        content: "❌ Comando não configurado!",
        flags: 64
      });
      return;
    }

    // ✅ CRIAR INTERAÇÃO SIMULADA PARA O COMANDO
    const mockInteraction = {
      reply: async (response) => {
        await sendInteractionResponse(id, token, response);
      },
      deferReply: async () => {
        await sendDeferredResponse(id, token);
      },
      followUp: async (response) => {
        await sendFollowupMessage(token, response);
      },
      options: {
        getSubcommand: () => subcommand,
        getString: (optionName) => {
          const option = data.options?.[0]?.options?.find(opt => opt.name === optionName);
          return option?.value;
        }
      },
      commandName: commandName
    };

    // ✅ EXECUTAR COMANDO
    console.log(`🚀 Executando: ${targetCommandName}`);
    await command.execute(mockInteraction);

  } catch (error) {
    console.error('❌ Erro na interação:', error);
    try {
      await sendInteractionResponse(id, token, {
        content: "❌ Erro interno ao processar comando!",
        flags: 64
      });
    } catch (e) {
      console.error('❌ Erro ao enviar resposta de erro:', e);
    }
  }
}

// ✅ ✅ ✅ ENVIAR RESPOSTA DE INTERAÇÃO (CORRIGIDO)
async function sendInteractionResponse(interactionId, interactionToken, responseData) {
  try {
    const response = {
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: responseData
    };

    const fetch = await import('node-fetch').then(module => module.default);
    
    const res = await fetch(`https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${process.env.BOT_TOKEN}`
      },
      body: JSON.stringify(response)
    });

    if (!res.ok) {
      console.error(`❌ Resposta HTTP ${res.status}: ${await res.text()}`);
    } else {
      console.log('✅ Resposta enviada com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar resposta:', error);
  }
}

// ✅ RESPOSTA DEFERIDA (para comandos que demoram)
async function sendDeferredResponse(interactionId, interactionToken) {
  try {
    const fetch = await import('node-fetch').then(module => module.default);
    
    await fetch(`https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${process.env.BOT_TOKEN}`
      },
      body: JSON.stringify({
        type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      })
    });
  } catch (error) {
    console.error('❌ Erro ao deferir:', error);
  }
}

// ✅ FOLLOWUP MESSAGE
async function sendFollowupMessage(interactionToken, responseData) {
  try {
    const fetch = await import('node-fetch').then(module => module.default);
    
    const res = await fetch(`https://discord.com/api/v10/webhooks/${process.env.CLIENT_ID}/${interactionToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${process.env.BOT_TOKEN}`
      },
      body: JSON.stringify(responseData)
    });

    if (!res.ok) {
      console.error(`❌ Followup HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (error) {
    console.error('❌ Erro no followup:', error);
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
      websocket_state: websocket ? websocket.readyState : 'null',
      timestamp: new Date().toISOString(),
      message: 'WebSocket puro funcionando! Comandos corrigidos.'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - WebSocket Puro ✅\n');
  }
});

// ✅ INICIAR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  // Heartbeat
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {}).on('error', () => {});
  }, 120000);
  
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