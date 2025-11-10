// index.js - Miscritbot (versão final, sem “processando comando...”)
require("dotenv").config();
const http = require("http");
const nacl = require("tweetnacl");
const fetch = require("node-fetch");
const WebSocket = require("ws");

// 🔑 Variáveis de ambiente
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

// 🔗 Mapa de comandos (produção + teste)
const commands = {
  "miscrits": {
    "info": miscritsInfo,
    "spawn-days": miscritsDays,
    "tierlist": miscritsTierList,
    "relics": miscritsRelics,
    "moves-and-evos": miscritsEvosMoves
  },
  "miscrits-test": {
    "info": miscritsInfo,
    "spawn-days": miscritsDays,
    "tierlist": miscritsTierList,
    "relics": miscritsRelics,
    "moves-and-evos": miscritsEvosMoves
  }
};

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");
console.log(`🌐 HTTP ativo na porta ${PORT}`);
console.log("🚀 Conectando ao Discord...");

// ====================================================
// ✅ Verificação da assinatura (Ed25519)
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
  } catch (err) {
    console.error("❌ Erro ao verificar assinatura:", err.message);
    return false;
  }
}

// ====================================================
// ✅ Função de autocomplete
// ====================================================
async function handleAutocomplete(interaction) {
  const commandName = interaction.data.name;
  const subcommandName = interaction.data.options?.[0]?.name;
  const focusedOption = interaction.data.options?.[0]?.options?.find(opt => opt.focused);

  const handler = commands[commandName]?.[subcommandName];
  if (!handler?.autocomplete) return { type: 8, data: { choices: [] } };

  try {
    const fakeInteraction = {
      options: { getFocused: () => focusedOption?.value || "" },
      responded: null,
      respond: async (choices) => (fakeInteraction.responded = choices)
    };

    await handler.autocomplete(fakeInteraction);
    return { type: 8, data: { choices: fakeInteraction.responded || [] } };
  } catch {
    return { type: 8, data: { choices: [] } };
  }
}

// ====================================================
// ✅ Processamento dos comandos
// ====================================================
async function handleCommand(interaction) {
  const commandName = interaction.data.name;
  const subcommandName = interaction.data.options?.[0]?.name;
  const handler = commands[commandName]?.[subcommandName];

  console.log(`🔧 Comando recebido: /${commandName} ${subcommandName}`);

  if (!handler) {
    await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "❌ Comando não encontrado.", flags: 64 })
    });
    return;
  }

  const interactionObj = {
    options: {
      getString: (name) =>
        interaction.data.options?.[0]?.options?.find(opt => opt.name === name)?.value || null,
      getFocused: () => ""
    },
    reply: async (response) => {
      const body = { ...response };
      if (body.ephemeral === true) {
        body.flags = 64;
        delete body.ephemeral;
      }
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    },
    followUp: async (response) => {
      const body = { ...response };
      if (body.ephemeral === true) {
        body.flags = 64;
        delete body.ephemeral;
      }
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }
  };

  try {
    await handler.execute(interactionObj);
  } catch (err) {
    console.error("❌ Erro ao executar comando:", err);
    await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "❌ Erro interno ao executar o comando.", flags: 64 })
    });
  }
}

// ====================================================
// ✅ Servidor HTTP (sem “processando comando...”)
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

      // PING
      if (interaction.type === 1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: 1 }));
      }

      // ✅ Slash command - silencioso
      if (interaction.type === 2) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ type: 5 })); // deferReply silencioso

        setTimeout(() => {
          handleCommand(interaction).catch(err => console.error("❌ Erro em handleCommand:", err));
        }, 150);

        return;
      }

      // Autocomplete
      if (interaction.type === 4) {
        const response = await handleAutocomplete(interaction);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(response));
      }

      res.writeHead(200);
      res.end();
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Miscritbot está ativo!");
});

// ====================================================
// ✅ WebSocket com reconexão automática
// ====================================================
let ws;
let heartbeat;

function connectWebSocket() {
  ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.on("open", () => {
    console.log("🎉 CONNECTED ao Discord Gateway");
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
      console.log("💓 Heartbeat configurado");
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ op: 1, d: null }));
      }, msg.d.heartbeat_interval);
    }
    if (msg.t === "READY") {
      console.log(`🤖 Bot conectado como ${msg.d.user.username}`);
    }
  });

  ws.on("close", () => {
    console.log("🔌 Conexão encerrada. Tentando reconectar...");
    clearInterval(heartbeat);
    setTimeout(connectWebSocket, 10000);
  });

  ws.on("error", (err) => console.error("🚨 WebSocket error:", err.message));
}

// ====================================================
// ✅ Inicialização
// ====================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor HTTP escutando na porta ${PORT}`);
  connectWebSocket();
});
