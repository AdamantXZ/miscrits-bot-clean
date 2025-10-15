require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds] 
});

console.log('✅ Bot iniciando...');
console.log('✅ Token length:', process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 'undefined');

client.once("ready", () => {
  console.log(`🎉 BOT ONLINE como ${client.user.tag}!`);
});

// ✅ SEM interactionCreate, SEM comandos
// ✅ SEM qualquer lógica adicional

client.login(process.env.BOT_TOKEN).catch(error => {
  console.error('❌ Erro no login:', error.message);
});