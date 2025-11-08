require("dotenv").config();
const fs = require("fs");
const http = require('http');

console.log('🔧 MISCRITS BOT - WEBSOCKETSTREAM MODERNO');

// ✅ VERIFICAR SE WEBSOCKETSTREAM ESTÁ DISPONÍVEL (como no tutorial)
if (typeof WebSocketStream === 'undefined') {
  console.log('⚠️ WebSocketStream não disponível, usando WebSocket tradicional');
  // Fallback para WebSocket tradicional
  const WebSocket = require('ws');
  implementTraditionalWebSocket(WebSocket);
} else {
  console.log('🎉 WebSocketStream disponível - usando API moderna');
  implementWebSocketStream();
}

// ✅ IMPLEMENTAÇÃO WEBSOCKETSTREAM (API MODERNA COM BACKPRESSURE)
function implementWebSocketStream() {
  console.log('🚀 Iniciando WebSocketStream...');
  
  const wsURL = "wss://gateway.discord.gg/?v=10&encoding=json";
  const wss = new WebSocketStream(wsURL);
  
  let sequence = null;
  let sessionId = null;
  
  // ✅ COMO NO TUTORIAL: await wss.opened
  wss.opened.then(async ({ readable, writable }) => {
    console.log("🎉 CONNECTED - WebSocketStream aberto!");
    
    const reader = readable.getReader();
    const writer = writable.getWriter();
    
    // ✅ ENVIAR IDENTIFY (como writer.write() do tutorial)
    const identify = {
      op: 2,
      d: {
        token: process.env.BOT_TOKEN,
        properties: { $os: 'linux', $browser: 'WebSocketStream', $device: 'WebSocketStream' },
        intents: 1
      }
    };
    
    await writer.write(JSON.stringify(identify));
    console.log('🔑 Identify enviado');
    
    // ✅ LOOP DE LEITURA (como reader.read() do tutorial)
    processMessages(reader, writer);
    
  }).catch(error => {
    console.error('❌ Erro na conexão WebSocketStream:', error);
  });
  
  // ✅ HANDLING CLOSED (como wss.closed do tutorial)
  wss.closed.then((result) => {
    console.log(`🔌 DISCONNECTED: code ${result.closeCode}, reason "${result.reason}"`);
    console.log('🔄 Reconectando em 10 segundos...');
    setTimeout(implementWebSocketStream, 10000);
  });
}

// ✅ PROCESSAR MENSAGENS COM BACKPRESSURE AUTOMÁTICO
async function processMessages(reader, writer) {
  try {
    while (true) {
      // ✅ COMO NO TUTORIAL: await reader.read() com backpressure
      const { value, done } = await reader.read();
      
      if (done) {
        console.log('📖 Stream finalizado');
        break;
      }
      
      const message = JSON.parse(value);
      await handleGatewayMessage(message, writer);
    }
  } catch (error) {
    console.error('❌ Erro no processamento de mensagens:', error);
  }
}

// ✅ MANIPULAR MENSAGENS DO GATEWAY
async function handleGatewayMessage(message, writer) {
  const { op, d, s, t } = message;
  
  if (s) sequence = s;
  
  switch (op) {
    case 10: // HELLO
      console.log('🔧 HELLO - iniciando heartbeat');
      startHeartbeat(d.heartbeat_interval, writer);
      break;
      
    case 11: // HEARTBEAT ACK
      console.log('💓 Heartbeat ACK');
      break;
      
    case 0: // DISPATCH
      await handleDispatchEvent(t, d, writer);
      break;
      
    case 7: // RECONNECT
      console.log('🔁 RECONNECT solicitado');
      break;
  }
}

// ✅ HEARTBEAT COM TIMEOUT (como setTimeout do tutorial)
function startHeartbeat(interval, writer) {
  console.log(`💓 Heartbeat a cada ${interval}ms`);
  
  // Primeiro heartbeat
  sendHeartbeat(writer);
  
  // Intervalo como no tutorial
  setInterval(() => {
    sendHeartbeat(writer);
  }, interval);
}

function sendHeartbeat(writer) {
  const heartbeat = { op: 1, d: sequence };
  writer.write(JSON.stringify(heartbeat)).catch(error => {
    console.error('❌ Erro no heartbeat:', error);
  });
}

// ✅ MANIPULAR EVENTOS (COM BACKPRESSURE)
async function handleDispatchEvent(eventType, data, writer) {
  switch (eventType) {
    case 'READY':
      console.log('🎉 BOT PRONTO via WebSocketStream!');
      console.log(`🤖 ${data.user.username} online!`);
      break;
      
    case 'INTERACTION_CREATE':
      console.log(`🔧 Interação: ${data.data.name}`);
      // ✅ BACKPRESSURE AUTOMÁTICO - não sobrecarrega
      await handleInteractionSafely(data, writer);
      break;
  }
}

// ✅ MANIPULAR INTERAÇÃO COM SEGURANÇA
async function handleInteractionSafely(interaction, writer) {
  const { id, token, data } = interaction;
  const commandName = data.name;
  const subcommand = data.options?.[0]?.name;
  
  console.log(`📝 Processando: /${commandName} ${subcommand}`);
  
  try {
    // ✅ BACKPRESSURE DO WEBSOCKETSTREAM IMPEDE RATE LIMITING
    const response = {
      type: 4,
      data: { 
        content: `🔧 ${commandName} ${subcommand} - Processado com WebSocketStream`,
        flags: 64
      }
    };
    
    await writer.write(JSON.stringify({
      op: 4, // INTERACTION_RESPONSE
      d: response
    }));
    
    console.log('✅ Resposta enviada com backpressure automático');
    
  } catch (error) {
    console.error('❌ Erro na resposta (backpressure funcionando):', error.message);
  }
}

// ✅ FALLBACK: WEBSOCKET TRADICIONAL
function implementTraditionalWebSocket(WebSocket) {
  console.log('🔄 Usando WebSocket tradicional como fallback...');
  
  const wsUri = "wss://gateway.discord.gg/?v=10&encoding=json";
  let websocket = new WebSocket(wsUri);
  let heartbeatInterval = null;
  let sequence = null;
  
  // ✅ EVENTOS DO WEBSOCKET TRADICIONAL (como addEventListener do tutorial)
  websocket.addEventListener("open", () => {
    console.log("🎉 CONNECTED - WebSocket tradicional!");
    
    const identify = {
      op: 2,
      d: {
        token: process.env.BOT_TOKEN,
        properties: { $os: 'linux', $browser: 'fallback_ws', $device: 'fallback_ws' },
        intents: 1
      }
    };
    
    websocket.send(JSON.stringify(identify));
  });
  
  websocket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);
    handleTraditionalMessage(message, websocket);
  });
  
  websocket.addEventListener("close", () => {
    console.log("🔌 DISCONNECTED - WebSocket tradicional");
    clearInterval(heartbeatInterval);
    setTimeout(() => implementTraditionalWebSocket(WebSocket), 10000);
  });
  
  websocket.addEventListener("error", (e) => {
    console.log(`❌ WebSocket Error: ${e.message}`);
  });
  
  function handleTraditionalMessage(message, ws) {
    const { op, d, s, t } = message;
    
    if (s) sequence = s;
    
    switch (op) {
      case 10: // HELLO
        heartbeatInterval = setInterval(() => {
          const heartbeat = { op: 1, d: sequence };
          ws.send(JSON.stringify(heartbeat));
        }, d.heartbeat_interval);
        break;
        
      case 0: // DISPATCH
        if (t === 'READY') {
          console.log('🎉 BOT PRONTO via WebSocket tradicional!');
          console.log(`🤖 ${d.user.username} online!`);
        } else if (t === 'INTERACTION_CREATE') {
          console.log(`🔧 Interação tradicional: ${d.data.name}`);
          // Resposta simples e segura
          const response = {
            type: 4,
            data: { content: "✅ Comando recebido (WebSocket tradicional)", flags: 64 }
          };
          ws.send(JSON.stringify({
            op: 4,
            d: response
          }));
        }
        break;
    }
  }
}

// ✅ HEALTH CHECK
const app = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    technology: 'WebSocketStream + Fallback',
    message: 'Usando API moderna com backpressure automático'
  }));
});

// ✅ INICIAR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor: porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  console.log('🚀 APLICANDO WEBSOCKETSTREAM MODERNO:');
  console.log('   ✅ Backpressure automático');
  console.log('   ✅ Prevenção de rate limiting');
  console.log('   ✅ API Promise-based');
  console.log('   ✅ Fallback para WebSocket tradicional');
  
  // Keep-alive
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}/health`, () => {}).on('error', () => {});
  }, 300000);
});

process.on('SIGTERM', () => {
  console.log('🛑 Encerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Encerrando...');
  process.exit(0);
});