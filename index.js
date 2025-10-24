require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  // ✅ RECONEXÃO AUTOMÁTICA
  reconnect: true,
  closeTimeout: 30000
});

// Carregar comandos
client.commands = new Collection();

// Mapear subcomandos para arquivos (ATUALIZADO E CORRIGIDO)
const commandMap = {
  'info': 'miscrits-info',
  'spawn_days': 'miscrits-days', // CORRIGIDO: estava 'spawn_day' mas no deploy é 'spawn_days'
  'tier_list': 'miscrits-tier-list',
  'evos_moves': 'miscrits-evos-moves',
  'relics_build': 'miscrits-relics'
};

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// ✅ DETECTA QUANDO DESCONECTA
client.on("disconnect", () => {
  console.log('⚠️ Bot desconectado do Discord - tentando reconectar...');
});

// ✅ DETECTA ERROS DE CONEXÃO
client.on("error", (error) => {
  console.error('❌ Erro de conexão Discord:', error);
});

client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "miscrits") {
      const subcommand = interaction.options.getSubcommand();
      const subcommandGroup = interaction.options.getSubcommandGroup();
      
      console.log(`🔍 Autocomplete: group=${subcommandGroup}, subcommand=${subcommand}`);
      
      // Autocomplete para info, evos moves e relics build
      if ((!subcommandGroup && subcommand === "info") || 
          (subcommandGroup === "evos" && subcommand === "moves") ||
          (subcommandGroup === "relics" && subcommand === "build")) {
        
        let commandName;
        if (!subcommandGroup) {
          commandName = 'miscrits-info';
        } else if (subcommandGroup === "evos") {
          commandName = 'miscrits-evos-moves';
        } else if (subcommandGroup === "relics") {
          commandName = 'miscrits-relics';
        }
        
        console.log(`🎯 Executing autocomplete for: ${commandName}`);
        
        const command = client.commands.get(commandName);
        if (command && command.autocomplete) {
          try {
            await command.autocomplete(interaction);
          } catch (error) {
            console.error("❌ Erro no autocomplete:", error);
          }
        } else {
          console.error(`❌ Command not found for autocomplete: ${commandName}`);
        }
      }
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "miscrits") {
      const subcommand = interaction.options.getSubcommand();
      const subcommandGroup = interaction.options.getSubcommandGroup();
      
      console.log(`🚀 Executing: group=${subcommandGroup}, subcommand=${subcommand}`);
      
      let commandName;
      
      if (subcommandGroup && subcommand) {
        const key = `${subcommandGroup}_${subcommand}`;
        commandName = commandMap[key];
        console.log(`🔑 Looking for command: ${key} -> ${commandName}`);
      } else {
        commandName = commandMap[subcommand];
        console.log(`🔑 Looking for command: ${subcommand} -> ${commandName}`);
      }
      
      const command = client.commands.get(commandName);
      
      if (!command) {
        console.error(`❌ Command not found: ${commandName} for subcommand: ${subcommand}, group: ${subcommandGroup}`);
        console.log(`📋 Available commands:`, Object.keys(commandMap));
        return await interaction.reply({ 
          content: "❌ Command not configured properly!", 
          ephemeral: true 
        });
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        if (error.code === 10062) {
          console.log('⚠️ Interação cancelada pelo usuário (normal)');
          return;
        }
        
        console.error('❌ Erro no comando:', error);
        
        try {
          const reply = { content: "❌ Ocorreu um erro ao executar esse comando!", ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch (replyError) {
          if (replyError.code !== 10062) {
            console.error('❌ Erro ao enviar mensagem de erro:', replyError);
          }
        }
      }
    }
  }
});

// Servidor web para o Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Miscrits Online!\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

// ✅ LOGIN COM TRATAMENTO DE ERRO
client.login(process.env.BOT_TOKEN).catch(error => {
  console.error('❌ ERRO CRÍTICO: Não foi possível conectar ao Discord:', error.message);
  console.log('🔄 Tentando reconectar em 30 segundos...');
  setTimeout(() => {
    client.login(process.env.BOT_TOKEN);
  }, 30000);
});