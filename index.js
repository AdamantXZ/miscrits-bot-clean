require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const https = require('https');

console.log('🔧 Iniciando bot Miscrits...');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds]
});

// DEBUG seguro
console.log('🔑 BOT_TOKEN configurado:', process.env.BOT_TOKEN ? '✅ SIM' : '❌ NÃO');

// Carregar comandos
client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

commandFiles.forEach(file => {
  const command = require(`./commands/${file}`);
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
    console.log(`✅ ${command.data.name}`);
  }
});

client.once("ready", () => {
  console.log(`🎉 Bot online: ${client.user.tag}`);
  console.log(`📊 Comandos: ${client.commands.size}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Erro em ${interaction.commandName}:`, error.message);
    await interaction.reply({ content: "❌ Erro no comando!", flags: 64 });
  }
});

// Health check
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'OK', 
    bot: client.isReady() ? 'online' : 'offline',
    timestamp: new Date().toISOString()
  }));
});

server.listen(process.env.PORT || 10000, '0.0.0.0', () => {
  console.log(`🌐 Servidor na porta ${process.env.PORT || 10000}`);
});

// ✅ CONEXÃO COM DEBUG CORRIGIDO
console.log('🌐 Testando conectividade...');

// Teste de conectividade básica
https.get('https://discord.com/api/v10/gateway', (res) => {
  console.log(`📡 Conectividade Discord: ${res.statusCode}`);
}).on('error', (err) => {
  console.error('❌ Sem conectividade com Discord:', err.message);
});

// Timeout específico para login
console.log('🔑 Iniciando login...');
const loginTimeout = setTimeout(() => {
  console.log('⏰ TIMEOUT - Login travado após 30s');
}, 30000);

client.login(process.env.BOT_TOKEN)
  .then(() => {
    clearTimeout(loginTimeout);
    console.log('✅ Login bem-sucedido!');
  })
  .catch(err => {
    clearTimeout(loginTimeout);
    console.error('❌ ERRO NO LOGIN:', err.message);
    console.error('Código do erro:', err.code);
  });