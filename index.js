// index.js - Miscritbot com Interactions API, WebSocket e Autocomplete (CORRIGIDO)
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

// ====================================================
// ✅ Verificação da assinatura do Discord (Ed25519)
// ====================================================
function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;

  try {
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(PUBLIC_KEY, "hex")
    );
    if (!isVerified) console.error("❌ Assinatura inválida recebida");
    return isVerified;
  } catch (err) {
    console.error("❌ Erro ao verificar assinatura:", err.message);
    return false;
  }
}

// ====================================================
// ✅ Função para Autocomplete (corrigido)
// ====================================================
async function handleAutocomplete(interaction) {
  const commandName = interaction.data.name;
  const subcommandName = interaction.data.options?.[0]?.name;
  const focusedOption = interaction.data.options?.[0]?.options?.find(opt => opt.focused);

  console.log(`🔍 Autocomplete: /${commandName} ${subcommandName} - ${focusedOption?.name}`);

  const handler = commands[commandName]?.[subcommandName];
  if (!handler || !handler.autocomplete) {
    console.log("❌ Nenhum handler de autocomplete encontrado");
    return { type: 8, data: { choices: [] } };
  }

  try {
    const fakeInteraction = {
      options: {
        getFocused: () => focusedOption?.value || ""
      },
      responded: null,
      respond: async (choices) => {
        fakeInteraction.responded = choices;
      }
    };

    await handler.autocomplete(fakeInteraction);

    if (fakeInteraction.responded) {
      return { type: 8, data: { choices: fakeInteraction.responded } };
    } else {
      return { type: 8, data: { choices: [] } };
    }

  } catch (err) {
    console.error("❌ Erro no autocomplete:", err);
    return { type: 8, data: { choices: [] } };
  }
}

// ====================================================
// ✅ Processar Comandos - CORRIGIDO (sem Authorization header)
// ====================================================
async function handleCommand(interaction) {
  try {
    const commandName = interaction.data.name;
    const subcommandName = interaction.data.options?.[0]?.name;
    console.log(`🔧 Comando recebido: /${commandName} ${subcommandName || ''}`);

    const commandHandler = commands[commandName]?.[subcommandName];
    if (!commandHandler) {
      return {
        type: 4,
        data: { content: "❌ Comando não encontrado ou não implementado.", flags: 64 }
      };
    }

    let hasReplied = false;
    const interactionObj = {
      options: {
        getString: (name) =>
          interaction.data.options?.[0]?.options?.find(opt => opt.name === name)?.value || null,
        getFocused: () => ""
      },
      reply: async (response) => {
        if (hasReplied) return interactionObj.followUp(response);
        hasReplied = true;
        
        // ✅ CORREÇÃO: REMOVIDO Authorization header para ephemeral funcionar
        await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
            // ❌ REMOVIDO: "Authorization": `Bot ${TOKEN}`
          },
          body: JSON.stringify(response)
        });
      },
      followUp: async (response) => {
        // ✅ CORREÇÃO: REMOVIDO Authorization header para ephemeral funcionar
        await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
            // ❌ REMOVIDO: "Authorization": `Bot ${TOKEN}`
          },
          body: JSON.stringify(response)
        });
      }
    };

    console.log(`✅ Executando comando: ${subcommandName}`);
    await commandHandler.execute(interactionObj);

    if (!hasReplied) {
      await interactionObj.reply({
        content: `✅ Comando **/${commandName} ${subcommandName}** executado!`,
        flags: 64
      });
    }

    return { type: 5 };

  } catch (err) {
    console.error("❌ Erro ao executar comando:", err);
    return {
      type: 4,
      data: { content: "❌ Erro interno ao executar o comando.", flags: 64 }
    };
  }
}

// ====================================================
// ✅ Servidor HTTP
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
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid signature" }));
      }

      try {
        const interaction = JSON.parse(body);

        // PING
        if (interaction.type === 1) {
          console.log("✅ Ping recebido - verificação do Discord.");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }

        // Slash Command
        if (interaction.type === 2) {
          console.log(`🎯 Slash command recebido: ${interaction.data.name}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: 5 }));

          setTimeout(() => handleCommand(interaction), 100);
          return;
        }

        // Autocomplete
        if (interaction.type === 4) {
          const response = await handleAutocomplete(interaction);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(response));
        }

      } catch (err) {
        console.error("❌ Erro no processamento:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
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
    if (msg.t === "READY")
      console.log(`🤖 Bot conectado como ${msg.d.user.username}`);
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
  console.log("📋 Comandos disponíveis:");
  Object.keys(commands.miscrits).forEach(cmd => console.log(`   /miscrits ${cmd}`));
  connectWebSocket();
});

process.on("SIGTERM", () => {
  console.log("🛑 Encerrando...");
  if (ws) ws.close();
  if (heartbeat) clearInterval(heartbeat);
  process.exit(0);
});