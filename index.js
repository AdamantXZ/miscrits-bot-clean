// index.js - Miscritbot SEM mensagem de processamento (CORRIGIDO)
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

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");
console.log(`🌐 HTTP ativo na porta ${PORT}`);
console.log("🚀 Conectando ao Discord...");

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
// ✅ Função para Autocomplete
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
      options: { getFocused: () => focusedOption?.value || "" },
      responded: null,
      respond: async (choices) => {
        fakeInteraction.responded = choices;
      }
    };

    await handler.autocomplete(fakeInteraction);

    return { type: 8, data: { choices: fakeInteraction.responded || [] } };
  } catch (err) {
    console.error("❌ Erro no autocomplete:", err);
    return { type: 8, data: { choices: [] } };
  }
}

// ====================================================
// ✅ Processar Comandos - CORREÇÃO FINAL
// ====================================================
async function handleCommand(interaction) {
  try {
    const commandName = interaction.data.name;
    const subcommandName = interaction.data.options?.[0]?.name;
    console.log(`🔧 Comando recebido: /${commandName} ${subcommandName || ""}`);

    const commandHandler = commands[commandName]?.[subcommandName];
    if (!commandHandler) {
      // Enviar resposta de erro diretamente
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "❌ Comando não encontrado.",
          flags: 64
        })
      });
      return;
    }

    let hasReplied = false;

    const interactionObj = {
      options: {
        getString: (name) =>
          interaction.data.options?.[0]?.options?.find(opt => opt.name === name)?.value || null,
        getFocused: () => ""
      },

      // ✅ envia resposta principal
      reply: async (response) => {
        if (hasReplied) return interactionObj.followUp(response);
        hasReplied = true;

        const webhookData = { ...response };
        if (webhookData.ephemeral === true) {
          webhookData.flags = 64;
          delete webhookData.ephemeral;
        }

        console.log(`📤 Enviando resposta ${webhookData.flags === 64 ? "EPHEMERAL" : "PUBLIC"}`);
        
        // ✅ CORREÇÃO: Usar POST para criar mensagem em vez de PATCH
        await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookData)
        });
      },

      // ✅ follow-up opcional
      followUp: async (response) => {
        const webhookData = { ...response };
        if (webhookData.ephemeral === true) {
          webhookData.flags = 64;
          delete webhookData.ephemeral;
        }

        console.log(`📤 Enviando followUp ${webhookData.flags === 64 ? "EPHEMERAL" : "PUBLIC"}`);
        
        await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookData)
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

  } catch (err) {
    console.error("❌ Erro ao executar comando:", err);
    try {
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "❌ Erro interno ao executar o comando.",
          flags: 64
        })
      });
    } catch (fetchError) {
      console.error("❌ Erro ao enviar mensagem de erro:", fetchError);
    }
  }
}

// ====================================================
// ✅ Servidor HTTP - CORREÇÃO FINAL
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

      try {
        const interaction = JSON.parse(body);

        // PING
        if (interaction.type === 1) {
          console.log("✅ Ping recebido - verificação do Discord");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }

        // Slash command - CORREÇÃO: defer sem mensagem visível
        if (interaction.type === 2) {
          console.log(`🎯 Slash command recebido: ${interaction.data.name}`);
          
          // ✅ CORREÇÃO: defer IMEDIATO sem mensagem
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: 5 })); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

          // Processar o comando em background
          handleCommand(interaction).catch(err => {
            console.error("❌ Erro não tratado em handleCommand:", err);
          });
          
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
    if (msg.t === "READY") {
      console.log(`🤖 Bot conectado como ${msg.d.user.username}`);
      console.log("✅ Comandos carregados:", Object.keys(commands.miscrits));
    }
  });

  ws.on("close", () => {
    console.log("🔌 Conexão encerrada. Tentando reconectar...");
    if (heartbeat) clearInterval(heartbeat);
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
  Object.keys(commands.miscrits).forEach(cmd => {
    console.log(`   /miscrits ${cmd}`);
  });
  connectWebSocket();
});

process.on("SIGTERM", () => {
  console.log("🛑 Encerrando...");
  if (ws) ws.close();
  if (heartbeat) clearInterval(heartbeat);
  process.exit(0);
});