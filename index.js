// index.js - Miscrits Bot (versão otimizada e segura para Render Free)
// -------------------------------------------
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

console.log('🔧 MISCRITS BOT - Discord.js (versão refinada e segura)');

// ✅ VALIDAÇÃO DO TOKEN
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ BOT_TOKEN não encontrado. Configure no painel do Render.');
  process.exit(1);
}

// ✅ RATE-LIMITED LOGGER (anti-spam)
const logCache = new Map();
function rateLog(key, msg, interval = 15000) {
  const now = Date.now();
  const last = logCache.get(key) || 0;
  if (now - last > interval) {
    console.log(msg);
    logCache.set(key, now);
  }
}

// ✅ CLIENT DISCORD.JS CONFIGURADO PARA RENDER
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  rest: { timeout: 30000, retries: 1, offset: 50 },
  ws: { compress: false, large_threshold: 50 },
  failIfNotExists: false,
  presence: {
    status: 'online',
    activities: [{ name: '/miscrits help', type: 0 }]
  }
});

// ✅ CARREGAR COMANDOS
client.commands = new Collection();
const commandMap = {
  info: 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  relics: 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  tierlist: 'miscrits-tier-list'
};

try {
  const files = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/${file}`);
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Comando carregado: ${command.data.name}`);
    }
  }
  console.log(`📋 ${client.commands.size} comandos carregados`);
} catch (err) {
  console.error('❌ Erro ao carregar comandos:', err.message);
}

// ✅ EVENTO: BOT PRONTO
client.once('ready', () => {
  console.log(`🎉 ${client.user.tag} online e conectado a ${client.guilds.cache.size} servidores.`);
});

// ✅ EVENTO: INTERAÇÕES (slash commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand(false);
  const target = (commandName === 'miscrits' || commandName === 'miscrits-test')
    ? commandMap[subcommand]
    : null;

  if (!target) {
    return interaction.reply({ content: '❌ Subcomando não configurado!', ephemeral: true });
  }

  const command = client.commands.get(target);
  if (!command) {
    return interaction.reply({ content: '❌ Comando não encontrado!', ephemeral: true });
  }

  // Execução com segurança e defer automático
  const deferTimeout = setTimeout(async () => {
    if (!interaction.deferred && !interaction.replied) {
      try { await interaction.deferReply(); } catch { /* ignora */ }
    }
  }, 750);

  try {
    await command.execute(interaction);
    clearTimeout(deferTimeout);
    rateLog('exec-success', `✅ Executado: /${commandName} ${subcommand || ''}`);
  } catch (error) {
    clearTimeout(deferTimeout);
    rateLog('exec-error', `❌ Erro em /${commandName} ${subcommand || ''}: ${error.message}`);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Erro ao executar comando!', ephemeral: true });
      } else {
        await interaction.followUp({ content: '❌ Erro ao executar comando (follow-up)!', ephemeral: true });
      }
    } catch { /* ignora */ }
  }
});

// ✅ EVENTOS DE CONEXÃO (LOG CONTROLADO)
client.on('disconnect', (e) => rateLog('disconnect', `🔌 Desconectado: ${e?.code || 'desconhecido'}`));
client.on('reconnecting', () => rateLog('reconnect', '🔁 Tentando reconectar...'));
client.on('error', (err) => rateLog('client-error', `⚠️ Erro Discord: ${err.message}`));
client.on('warn', (info) => rateLog('client-warn', `⚠️ Aviso: ${info}`));

// ✅ HEALTH CHECK HTTP (Render + UptimeRobot)
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: client.isReady() ? 'ONLINE' : 'CONNECTING',
      bot: client.user?.tag || 'Desconectado',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Miscrits Bot — Online\n');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP iniciado (porta ${PORT})`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
});

// ✅ HEARTBEAT SILENCIOSO PARA MANTER RENDER ATIVO
setInterval(() => {
  http.get(`http://127.0.0.1:${PORT}/health`, () => { }).on('error', () => { });
}, 5 * 60 * 1000); // 5 minutos

// ✅ LOGIN + RECONEXÃO CONTROLADA
async function connectBot(retry = 0) {
  try {
    await client.login(TOKEN);
  } catch (err) {
    const delay = Math.min(30000 * (retry + 1), 180000);
    rateLog('login-fail', `❌ Falha no login: ${err.message}. Tentando novamente em ${delay / 1000}s.`);
    setTimeout(() => connectBot(retry + 1), delay);
  }
}
connectBot();

// ✅ TRATAMENTO DE SAÍDA GRACIOSA
function shutdown() {
  console.log('🛑 Encerrando Miscritbot...');
  client.destroy();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ✅ TRATAMENTO GLOBAL DE ERROS
process.on('unhandledRejection', (r) => rateLog('unhandled', `🚨 Rejeição não tratada: ${r}`));
process.on('uncaughtException', (e) => {
  rateLog('uncaught', `💥 Erro fatal: ${e.message}`);
  setTimeout(() => process.exit(1), 2000);
});