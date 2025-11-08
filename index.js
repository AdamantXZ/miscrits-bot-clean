// index.js - Miscrits Bot (compatível com subcomandos e comandos individuais)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Client, GatewayIntentBits, Collection } = require("discord.js");

console.log("🔧 MISCRITS BOT - Iniciando...");

// ✅ TOKEN
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ ERRO: BOT_TOKEN não encontrado!");
  console.log("💡 Configure BOT_TOKEN no Render.com");
  process.exit(1);
}

// ✅ CLIENT DISCORD.JS
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  ws: { large_threshold: 50, compress: false },
  rest: { timeout: 30000, retries: 3 },
});

// ✅ MAPA DE COMANDOS PARA SUBCOMANDOS
const commandMap = {
  info: "miscrits-info",
  "moves-and-evos": "miscrits-evos-moves", 
  relics: "miscrits-relics",
  "spawn-days": "miscrits-days",
  tierlist: "miscrits-tier-list"
};

// ✅ MAPA DE COMANDOS INDIVIDUAIS
const individualCommandMap = {
  "miscrits-info": "miscrits-info",
  "miscrits-evos-moves": "miscrits-evos-moves",
  "miscrits-relics": "miscrits-relics", 
  "miscrits-days": "miscrits-days",
  "miscrits-tier-list": "miscrits-tier-list"
};

// ✅ CARREGAR COMANDOS
client.commands = new Collection();
try {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Comando carregado: ${command.data.name}`);
    }
  }
  console.log(`📋 ${client.commands.size} comandos carregados`);
} catch (err) {
  console.error("❌ Erro ao carregar comandos:", err.message);
}

// ✅ EVENTO: READY
client.once("ready", () => {
  console.log("=".repeat(50));
  console.log(`🎉 BOT ONLINE: ${client.user.tag}`);
  console.log(`📊 Conectado em ${client.guilds.cache.size} servidores`);
  console.log("=".repeat(50));
});

// ✅ EVENTO: INTERAÇÃO (COMPATÍVEL COM AMBOS OS FORMATOS)
client.on("interactionCreate", async (interaction) => {
  // Autocomplete
  if (interaction.isAutocomplete()) {
    const commandName = interaction.commandName;
    
    let target;
    if (commandName === "miscrits" || commandName === "miscrits-test") {
      const subcommand = interaction.options.getSubcommand(false);
      target = commandMap[subcommand];
    } else {
      target = individualCommandMap[commandName];
    }
    
    const cmd = client.commands.get(target);
    if (cmd?.autocomplete) {
      try {
        await cmd.autocomplete(interaction);
      } catch (err) {
        console.error("❌ Erro no autocomplete:", err.message);
      }
    }
    return;
  }

  // Slash command
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand(false);

  let target;
  
  // ✅ FORMATO 1: /miscrits info (subcomando)
  if (commandName === "miscrits" || commandName === "miscrits-test") {
    target = commandMap[subcommand];
  } 
  // ✅ FORMATO 2: /miscrits-info (comando individual)
  else {
    target = individualCommandMap[commandName];
  }

  const command = client.commands.get(target);

  if (!command) {
    return interaction.reply({ content: "❌ Comando não encontrado!", ephemeral: true });
  }

  try {
    console.log(`⚡ Executando: ${commandName} ${subcommand || ''}`);
    await command.execute(interaction);
  } catch (err) {
    console.error(`❌ Erro em ${commandName} ${subcommand || ''}:`, err.message);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Erro ao executar comando!", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Erro ao executar comando!", ephemeral: true });
      }
    } catch {}
  }
});

// ✅ EVENTOS DE CONEXÃO
client.on("error", (err) => console.error("🚨 Erro Discord:", err.message));
client.on("warn", (info) => console.warn("⚠️ Aviso Discord:", info));

// ✅ HEALTH CHECK
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: client.isReady() ? "ONLINE" : "CONNECTING",
      bot: client.user?.tag || "Desconectado",
      guilds: client.guilds?.cache.size || 0,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscrits Bot - Online\n");
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP na porta ${PORT}`);
});

// ✅ CONEXÃO
client.login(TOKEN).catch(err => {
  console.error("❌ FALHA NA CONEXÃO:", err.message);
  process.exit(1);
});