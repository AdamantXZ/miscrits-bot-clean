require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Carregar comandos
client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
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

// ✅ SERVIDOR WEB PARA O RENDER (IMPORTANTE!)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Miscrits Online!\n');
});

// ✅ USA A PORTA DO RENDER CORRETAMENTE
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

client.login(process.env.BOT_TOKEN);