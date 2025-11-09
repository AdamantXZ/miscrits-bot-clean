// index.js — Miscrits Bot (WebSocket otimizado para Render)
require('dotenv').config();
const fs = require('fs');
const http = require('http');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

console.log('🔧 MISCRITS BOT - DISCORD.JS OTIMIZADO PARA RENDER');

// ✅ VALIDAÇÃO DO TOKEN
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ BOT_TOKEN não encontrado');
  process.exit(1);
}

// ✅ CLIENT DISCORD.JS COM CONFIGURAÇÕES PARA RENDER
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  // 🔧 Configurações para evitar timeout e compressão no Render
  rest: {
    timeout: 30000,
    retries: 1,
    offset: 50
  },
  ws: {
    compress: false,
    large_threshold: 50
  },
  presence: {
    status: 'online',
    activities: [{ name: '/miscrits help', type: 0 }]
  }
});

// ✅ CARREGAR COMANDOS
client.commands = new Collection();
const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  'relics': 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

try {
  const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
      console.log(`✅ ${command.data.name} carregado`);
    }
  }
  console.log(`📋 ${client.commands.size} comandos carregados`);
} catch (err) {
  console.error('❌ Erro ao carregar comandos:', err.message);
}

// ✅ EVENTO READY
client.once('ready', () => {
  console.log(`🎉 ${client.user.tag} online!`);
  console.log(`📊 Conectado em ${client.guilds.cache.size} servidores`);
});

// ✅ INTERAÇÕES
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const sub = interaction.options.getSubcommand(false);

  console.log(`⚡ Comando recebido: /${commandName} ${sub || ''}`);

  let targetCommand;
  if (commandName === 'miscrits' || commandName === 'miscrits-test') {
    targetCommand = commandMap[sub];
  }

  const command = client.commands.get(targetCommand);
  if (!command) {
    return interaction.reply({ content: '❌ Subcomando não encontrado!', ephemeral: true });
  }

  try {
    await command.execute(interaction);
    console.log(`✅ Executado: ${targetCommand}`);
  } catch (err) {
    console.error(`❌ Erro em ${targetCommand}: ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Erro ao executar comando!', ephemeral: true }).catch(() => {});
    }
  }
});

// ✅ MONITORAMENTO DE CONEXÃO
client.on('disconnect', () => console.log('🔌 DISCONNECTED - WebSocket tradicional'));
client.on('reconnecting', () => console.log('🔁 RECONNECTING...'));
client.on('error', (err) => console.error('🚨 ERRO WS:', err.message));

// ✅ HEALTH CHECK HTTP
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const status = client.isReady() ? 'ONLINE' : 'CONNECTING';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status,
      bot: client.user?.tag || 'Desconectado',
      guilds: client.guilds?.cache.size || 0,
      uptime: Math.floor(process.uptime()),
      memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot - Discord.js otimizado\n');
  }
});

// ✅ PORTA DO SERVIDOR
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
  console.log('🚀 Conectando ao Discord...');
  connectBot();
});

// ✅ CONEXÃO COM FALLBACK
async function connectBot(retry = 0) {
  try {
    await client.login(TOKEN);
    console.log('🎉 CONNECTED - WebSocket tradicional!');
  } catch (err) {
    console.error('❌ Falha no login:', err.message);
    const delay = Math.min(30000 * (retry + 1), 120000);
    console.log(`🔄 Tentando novamente em ${delay / 1000}s...`);
    setTimeout(() => connectBot(retry + 1), delay);
  }
}

// ✅ ENCERRAMENTO LIMPO
function shutdown() {
  console.log('🛑 Encerrando...');
  client.destroy();
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
