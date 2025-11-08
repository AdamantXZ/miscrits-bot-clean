require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

console.log('🔑 Token do Render:', process.env.BOT_TOKEN ? 'PRESENTE' : 'AUSENTE');

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN não encontrado nas variáveis de ambiente!');
  process.exit(1);
}

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds] 
});

client.once('ready', () => {
  console.log('🎉 BOT CONECTOU AO DISCORD!');
});

client.login(process.env.BOT_TOKEN).catch(err => {
  console.error('❌ ERRO NO LOGIN:', err.message);
});

require('http').createServer((req, res) => {
  res.end('OK');
}).listen(process.env.PORT || 10000);