// index.js - Miscritbot (SOLUÇÃO DEFINITIVA - respostas 100% privadas)
require("dotenv").config();
const http = require("http");
const nacl = require("tweetnacl");
const fetch = require("node-fetch");
const WebSocket = require("ws");

const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const APP_ID = process.env.APPLICATION_ID;
const PORT = process.env.PORT || 10000;

// 📦 Importar comandos
const miscritsInfo = require("./commands/miscrits-info.js");
const miscritsDays = require("./commands/miscrits-days.js");
const miscritsTierList = require("./commands/miscrits-tier-list.js");
const miscritsRelics = require("./commands/miscrits-relics.js");
const miscritsEvosMoves = require("./commands/miscrits-evos-moves.js");

// 🔗 Mapa de comandos
const commands = {
  "miscrits": {
    "info": miscritsInfo,
    "spawn-days": miscritsDays,
    "tierlist": miscritsTierList,
    "relics": miscritsRelics,
    "moves-and-evos": miscritsEvosMoves
  }
};

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");
console.log(`🌐 HTTP ativo na porta ${PORT}`);

// ====================================================
// ✅ Verificação da assinatura do Discord
// ====================================================
function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(PUBLIC_KEY, "hex")
    );
  } catch {
    return false;
  }
}

// ====================================================
// ✅ Autocomplete
// ====================================================
async function handleAutocomplete(interaction) {
  const commandName = interaction.data.name;
  const subcommandName = interaction.data.options?.[0]?.name;
  const focusedOption = interaction.data.options?.[0]?.options?.find(opt => opt.focused);

  console.log(`🔍 Autocomplete: /${commandName} ${subcommandName}`);

  const handler = commands[commandName]?.[subcommandName];
  if (!handler?.autocomplete) return { type: 8, data: { choices: [] } };

  const fakeInteraction = {
    options: { getFocused: () => focusedOption?.value || "" },
    respond: async (choices) => (fakeInteraction.responded = choices)
  };

  await handler.autocomplete(fakeInteraction);
  return { type: 8, data: { choices: fakeInteraction.responded || [] } };
}

// ====================================================
// ✅ SOLUÇÃO DEFINITIVA - Respostas 100% PRIVADAS
// ====================================================
async function handleCommand(interaction) {
  try {
    const commandName = interaction.data.name;
    const subcommandName = interaction.data.options?.[0]?.name;
    const handler = commands[commandName]?.[subcommandName];

    if (!handler) {
      // ✅ Método 1: Resposta imediata ephemeral
      await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: {
            content: "❌ Comando não encontrado.",
            flags: 64
          }
        })
      });
      return;
    }

    const interactionObj = {
      options: {
        getString: (name) =>
          interaction.data.options?.[0]?.options?.find(o => o.name === name)?.value || null,
        getFocused: () => ""
      },
      
      // ✅ Método 2: Resposta via webhook com flags:64 FORÇADAS
      reply: async (response) => {
        const body = { ...response };
        
        // ✅ FORÇAR flags:64 em TODOS os casos
        body.flags = 64;
        if (body.ephemeral) delete body.ephemeral;
        
        console.log(`📤 Enviando resposta EPHEMERAL via webhook`);
        
        // Usar o endpoint de webhook diretamente
        await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      },

      followUp: async (response) => {
        const body = { ...response };
        body.flags = 64;
        if (body.ephemeral) delete body.ephemeral;
        
        console.log(`📤 Enviando followUp EPHEMERAL`);
        
        await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }
    };

    console.log(`⚡ Executando /${commandName} ${subcommandName}`);
    await handler.execute(interactionObj);

  } catch (err) {
    console.error("❌ Erro no comando:", err);
    
    // ✅ Método 3: Resposta de erro também ephemeral
    await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "❌ Erro interno ao executar o comando.",
        flags: 64
      })
    });
  }
}

// ====================================================
// ✅ Servidor HTTP - NÃO usar defer, responder diretamente
// ====================================================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      commands: Object.keys(commands.miscrits)
    }));
  }

  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", chunk => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid signature" }));
      }

      const interaction = JSON.parse(body);

      // ✅ PING
      if (interaction.type === 1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: 1 }));
      }

      // ✅ AUTOCOMPLETE
      if (interaction.type === 4) {
        const response = await handleAutocomplete(interaction);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(response));
      }

      // ✅ SLASH COMMAND - Processar diretamente SEM DEFER
      if (interaction.type === 2) {
        console.log(`🎯 Comando recebido: /${interaction.data.name} ${interaction.data.options?.[0]?.name || ''}`);
        
        // ✅ Responder ACK vazio e processar em background
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ type: 5 })); // Defer sem mensagem
        
        // Processar o comando
        setTimeout(() => handleCommand(interaction), 100);
        return;
      }

      res.writeHead(400);
      res.end();
    });
    return;
  }

  res.writeHead(200);
  res.end("Miscritbot está ativo!");
});

// ====================================================
// ✅ WebSocket + reconexão
// ====================================================
let ws, heartbeat;

function connectWebSocket() {
  ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.on("open", () => {
    console.log("🎉 Conectado ao Discord Gateway");
    ws.send(JSON.stringify({
      op: 2,
      d: {
        token: TOKEN,
        intents: 1,
        properties: { $os: "linux", $browser: "miscritbot", $device: "miscritbot" }
      }
    }));
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.op === 10) {
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ op: 1, d: null }));
      }, msg.d.heartbeat_interval);
    }
    if (msg.t === "READY")
      console.log(`🤖 Logado como ${msg.d.user.username}`);
  });

  ws.on("close", () => {
    console.log("🔌 Desconectado. Tentando reconectar...");
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(connectWebSocket, 10000);
  });
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor HTTP ouvindo na porta ${PORT}`);
  console.log("🚀 Bot pronto - Todas as respostas serão EPHEMERAL");
  connectWebSocket();
});