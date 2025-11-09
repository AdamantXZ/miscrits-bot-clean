// index.js - Miscritbot com Interactions API e comandos reais (versão final)
require("dotenv").config();
const http = require("http");
const nacl = require("tweetnacl");
const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const APP_ID = process.env.APPLICATION_ID;
const PORT = process.env.PORT || 10000;

// ✅ IMPORTAR TODOS OS COMANDOS
const miscritsInfo = require("./commands/miscrits-info.js");
const miscritsDays = require("./commands/miscrits-days.js");
const miscritsTierList = require("./commands/miscrits-tier-list.js");
const miscritsRelics = require("./commands/miscrits-relics.js");
const miscritsEvosMoves = require("./commands/miscrits-evos-moves.js");

// ✅ MAPA DE COMANDOS
const commands = {
  "miscrits": {
    "info": miscritsInfo,
    "spawn-days": miscritsDays,
    "tierlist": miscritsTierList,
    "relics": miscritsRelics,
    "moves-and-evos": miscritsEvosMoves
  }
};

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API (final)");
console.log(`🌐 HTTP ativo na porta ${PORT}`);
console.log("🚀 Conectando ao Discord...");

// ====================================================
// ✅ VERIFICAÇÃO USANDO Ed25519 + BASE64
// ====================================================
function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;

  try {
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(PUBLIC_KEY, "base64") // 🔧 base64 (correto)
    );
    if (!isVerified) console.error("❌ Assinatura inválida recebida");
    return isVerified;
  } catch (err) {
    console.error("❌ Erro ao verificar assinatura:", err.message);
    return false;
  }
}

// ====================================================
// ✅ PROCESSAR COMANDOS
// ====================================================
async function handleCommand(interaction) {
  try {
    const commandName = interaction.data.name;
    const subcommandName = interaction.data.options?.[0]?.name;
    console.log(`🔧 Comando recebido: /${commandName} ${subcommandName || ''}`);

    let commandHandler;
    if (commandName === "miscrits" && subcommandName) {
      commandHandler = commands.miscrits[subcommandName];
    }

    if (!commandHandler) {
      console.log(`❌ Comando não encontrado: ${commandName} ${subcommandName}`);
      return {
        type: 4,
        data: {
          content: "❌ Comando não encontrado ou não implementado!",
          flags: 64
        }
      };
    }

    const interactionObj = {
      options: {
        getString: (optionName) => {
          const option = interaction.data.options?.[0]?.options?.find(opt => opt.name === optionName);
          return option?.value;
        },
        getFocused: () => ""
      },
      replied: false,
      reply: async (response) => {
        interactionObj.replied = true;
        await fetch(
          `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response)
          }
        );
      },
      followUp: async (response) => {
        await fetch(
          `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response)
          }
        );
      }
    };

    console.log(`✅ Executando comando: ${subcommandName}`);
    await commandHandler.execute(interactionObj);

    if (!interactionObj.replied) {
      await fetch(
        `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `✅ Comando **/${commandName} ${subcommandName}** executado com sucesso!`,
            flags: 64
          })
        }
      );
    }

    return { type: 5 };
  } catch (error) {
    console.error("❌ Erro ao executar comando:", error);
    try {
      await fetch(
        `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "❌ Erro interno ao executar o comando!",
            flags: 64
          })
        }
      );
    } catch (fetchError) {
      console.error("❌ Erro ao enviar mensagem de erro:", fetchError);
    }
    return { type: 5 };
  }
}

// ====================================================
// ✅ SERVIDOR HTTP
// ====================================================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      message: "Miscritbot rodando normalmente!",
      commands: Object.keys(commands.miscrits)
    }));
  }

  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid request signature" }));
      }

      try {
        const interaction = JSON.parse(body);
        if (interaction.type === 1) {
          console.log("✅ Ping recebido do Discord - Respondendo...");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }
        if (interaction.type === 2) {
          const response = await handleCommand(interaction);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(response));
        }
        if (interaction.type === 4) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ type: 1 }));
      } catch (err) {
        console.error("❌ Erro ao processar /interactions:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Miscritbot está ativo! Use /miscrits para ver os comandos.");
});

// ====================================================
// ✅ WEBSOCKET COM RECONEXÃO AUTOMÁTICA
// ====================================================
const WebSocket = require("ws");
let ws;
let heartbeatInterval;

function connectWebSocket() {
  ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.on("open", () => {
    console.log("🎉 CONNECTED ao Discord Gateway");
    const identify = {
      op: 2,
      d: {
        token: TOKEN,
        intents: 1,
        properties: { $os: "linux", $browser: "miscritbot", $device: "miscritbot" },
      },
    };
    ws.send(JSON.stringify(identify));
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.op === 10) {
      console.log("💓 Heartbeat configurado");
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 1, d: null }));
        }
      }, msg.d.heartbeat_interval);
    }
    if (msg.t === "READY") {
      console.log(`🤖 Bot conectado como ${msg.d.user.username}`);
      console.log("✅ Comandos carregados:", Object.keys(commands.miscrits));
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`🔌 Gateway fechado (${code}) - ${reason || 'Sem motivo'}`);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    console.log("🔄 Tentando reconectar em 10 segundos...");
    setTimeout(connectWebSocket, 10000);
  });

  ws.on("error", (err) => {
    console.error("🚨 WebSocket error:", err.message);
  });
}

// ====================================================
// ✅ INICIAR SERVIDOR E CONEXÃO
// ====================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor HTTP escutando na porta ${PORT}`);
  console.log("📋 Comandos disponíveis:");
  Object.keys(commands.miscrits).forEach(cmd => {
    console.log(`   /miscrits ${cmd}`);
  });
  connectWebSocket();
});

process.on("SIGTERM", () => {
  console.log("🛑 Encerrando...");
  if (ws) ws.close();
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  process.exit(0);
});
