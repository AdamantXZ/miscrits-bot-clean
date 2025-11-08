require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');

console.log('🔧 INICIANDO BOT COM CONFIGURAÇÃO WEBSOCKET AGGRESSIVA');

// 🔧 CONFIGURAÇÃO EXTREMA PARA RENDER FREE
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // ✅ CONFIGURAÇÕES AGGRESSIVAS
  rest: {
    timeout: 20000,
    retries: 1,
    agent: null // Remove agent HTTP
  },
  ws: {
    compress: false,
    large_threshold: 50,
    version: 10
  },
  // ✅ TENTAR EVITAR RECONEXÕES RÁPIDAS
  closeTimeout: 60000,
  handshakeTimeout: 15000,
  // ✅ CONFIGURAÇÕES DE SESSÃO
  failIfNotExists: false,
  presence: {
    status: 'online',
    activities: [{
      name: 'with Miscrits',
      type: 0
    }]
  }
});

client.commands = new Collection();

// ✅ CARREGAR COMANDOS RÁPIDO
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
      client.commands.set(command.data.name, command);
    }
  }
  console.log(`📋 ${client.commands.size} comandos carregados`);
} catch (error) {
  console.error('❌ Erro comandos:', error.message);
}

// ✅ HEALTH CHECK SIMPLES
const app = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: client.isReady() ? 'ONLINE' : 'CONNECTING',
    timestamp: new Date().toISOString(),
    message: 'Discord.js WebSocket connection attempt'
  }));
});

// ✅ EVENTOS OTIMIZADOS
client.once("ready", () => {
  console.log(`🎉 CONEXÃO WEBSOCKET BEM-SUCEDIDA!`);
  console.log(`🤖 ${client.user.tag} online!`);
});

client.on("debug", (info) => {
  if (info.includes('WebSocket') || info.includes('Heartbeat')) {
    console.log(`🔧 ${info.substring(0, 80)}...`);
  }
});

client.on("error", (error) => {
  console.error(`❌ Discord: ${error.message}`);
});

// ✅ INTERAÇÕES
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  let targetCommandName = commandMap[subcommand];
  
  if (!targetCommandName) {
    return await interaction.reply({ content: "❌ Subcomando não configurado!", ephemeral: true });
  }
  
  const command = client.commands.get(targetCommandName);
  if (!command) {
    return await interaction.reply({ content: "❌ Comando não configurado!", ephemeral: true });
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Comando:', error.message);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Erro no comando!", ephemeral: true });
      }
    } catch (e) {}
  }
});

// ✅ CONEXÃO COM RETRY SIMPLES
async function connectDiscord() {
  console.log('🔑 Iniciando conexão Discord.js...');
  
  try {
    await client.login(process.env.BOT_TOKEN);
  } catch (error) {
    console.error('❌ Falha Discord.js:', error.message);
    console.log('💡 WebSocket funciona, mas Discord.js não completa handshake');
    console.log('🎯 Comandos podem funcionar via REST mesmo com bot offline');
    
    // Tentar novamente uma vez
    setTimeout(() => {
      console.log('🔄 Segunda tentativa de conexão...');
      connectDiscord();
    }, 10000);
  }
}

// ✅ INICIAR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor: porta ${PORT}`);
  
  // Heartbeat mínimo
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}`, () => {}).on('error', () => {});
  }, 120000);

  // Conexão Discord
  setTimeout(connectDiscord, 3000);
});

process.on('SIGTERM', () => {
  client.destroy();
  process.exit(0);
});