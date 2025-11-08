require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');

console.log('🔧 INICIANDO BOT MISCRITS - RENDER FREE COMPATIBLE');

// 🔧 CONFIGURAÇÃO SIMPLIFICADA
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  ws: {
    compress: false
  }
});

client.commands = new Collection();

// ✅ CARREGAR COMANDOS
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
  console.error('❌ Erro ao carregar comandos:', error.message);
}

// ✅ HEALTH CHECK
const app = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ONLINE',
    bot_connected: client.isReady(),
    timestamp: new Date().toISOString(),
    message: 'Miscrits Bot - Commands should work via REST'
  }));
});

// ✅ EVENTOS
client.once("ready", () => {
  console.log(`🎉 BOT CONECTADO: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
});

client.on("error", (error) => {
  console.error(`❌ Discord Error: ${error.message}`);
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
    console.error('❌ Erro no comando:', error.message);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Erro no comando!", ephemeral: true });
      }
    } catch (e) {}
  }
});

// ✅ CONEXÃO SIMPLES
function connectBot() {
  console.log('🔑 Conectando ao Discord...');
  
  client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('❌ Falha na conexão:', error.message);
    console.log('💡 Comandos podem funcionar via REST API');
    console.log('🔄 Tentando novamente em 30 segundos...');
    
    setTimeout(connectBot, 30000);
  });
}

// ✅ INICIAR SERVIDOR
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP na porta ${PORT}`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  
  // ✅ HEARTBEAT PARA MANTENER ATIVO
  setInterval(() => {
    http.get(`http://0.0.0.0:${PORT}`, () => {
      console.log('💓 Heartbeat -', new Date().toLocaleTimeString());
    }).on('error', () => {});
  }, 120000);
  
  // ✅ INICIAR CONEXÃO DISCORD
  setTimeout(connectBot, 2000);
});

// ✅ SHUTDOWN APENAS QUANDO NECESSÁRIO
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido - Encerrando graciosamente...');
  if (client.isReady()) {
    client.destroy();
  }
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido - Encerrando graciosamente...');
  if (client.isReady()) {
    client.destroy();
  }
  setTimeout(() => process.exit(0), 1000);
});

console.log('🚀 Bot Miscrits iniciado - Aguardando conexão Discord...');