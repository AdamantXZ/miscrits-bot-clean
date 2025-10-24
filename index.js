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

// Mapear subcomandos para arquivos (ATUALIZADO)
const commandMap = {
  'info': 'miscrits-info',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list',
  'evos-moves': 'miscrits-evos-moves',
  'relics': 'miscrits-relics'
};

// ✅ CARREGAMENTO SEGURO DOS COMANDOS
try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  
  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${file}`);
      
      // ✅ VERIFICA SE O COMANDO TEM A ESTRUTURA CORRETA
      if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando carregado: ${command.data.name}`);
      } else {
        console.error(`❌ Comando inválido: ${file} - falta propriedade 'data' ou 'data.name'`);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar comando ${file}:`, error.message);
    }
  }
} catch (error) {
  console.error('❌ Erro ao ler pasta commands:', error.message);
}

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`📋 Comandos carregados: ${client.commands.size}`);
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
      
      // Autocomplete para info, evos-moves e relics
      if (subcommand === "info" || subcommand === "evos-moves" || subcommand === "relics") {
        
        let commandName;
        if (subcommand === "info") {
          commandName = 'miscrits-info';
        } else if (subcommand === "evos-moves") {
          commandName = 'miscrits-evos-moves';
        } else if (subcommand === "relics") {
          commandName = 'miscrits-relics';
        }
        
        const command = client.commands.get(commandName);
        if (command && command.autocomplete) {
          try {
            await command.autocomplete(interaction);
          } catch (error) {
            console.error("❌ Erro no autocomplete:", error);
          }
        }
      }
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "miscrits") {
      const subcommand = interaction.options.getSubcommand();
      
      let commandName = commandMap[subcommand];
      
      const command = client.commands.get(commandName);
      
      if (!command) {
        console.error(`Command not found: ${commandName} for subcommand: ${subcommand}`);
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