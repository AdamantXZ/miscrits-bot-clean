require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// ✅ TESTE APENAS UM COMANDO POR VEZ
// Carregue apenas miscrits-info.js primeiro
try {
  const command = require(`./commands/miscrits-info.js`);
  client.commands.set(command.data.name, command);
  console.log(`✅ Carregado: miscrits-info.js`);
} catch (error) {
  console.log(`❌ Erro em miscrits-info.js:`, error.message);
}

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error("❌ Erro no autocomplete:", error);
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Ocorreu um erro ao executar esse comando!",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "❌ Ocorreu um erro ao executar esse comando!",
          ephemeral: true
        });
      }
    }
  }
});

console.log('✅ Bot token length:', process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 'undefined');
client.login(process.env.BOT_TOKEN);