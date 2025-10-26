require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
  reconnect: true,
  closeTimeout: 30000
});

// 🛡️ SISTEMA DE AUTO-RECOVERY
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection - Bot pode travar:', error);
  // Não faz exit() aqui para evitar loop infinito
});

process.on('uncaughtException', (error) => {
  console.error('🚨 ERRO CRÍTICO - Bot travou! Reiniciando em 10 segundos:', error);
  
  // Delay para evitar restart instantâneo
  setTimeout(() => {
    console.log('🔄 Reiniciando bot automaticamente...');
    process.exit(1); // ⬅️ FORÇA O RENDER A REINICIAR
  }, 10000);
});

// Health Check melhorado
const app = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    const botStatus = client.isReady() ? 'connected' : 'disconnected';
    const uptime = process.uptime();
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({ 
      status: botStatus === 'connected' ? 'OK' : 'ERROR',
      bot: botStatus,
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      commands: client.commands?.size || 0
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Miscrits Online!\n');
  }
});

// Carregar comandos
client.commands = new Collection();

// Mapear subcomandos para arquivos (ATUALIZADO)
const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  'relics': 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

// ✅ CARREGAMENTO SEGURO DOS COMANDOS
try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  
  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${file}`);
      
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
  console.log(`🛡️ Sistema de auto-recovery ativado`);
});

// 🛡️ RECONEXÃO AUTOMÁTICA
client.on("disconnect", () => {
  console.log('⚠️ Bot desconectado do Discord - tentando reconectar em 5 segundos...');
  setTimeout(() => {
    console.log('🔄 Tentando reconexão automática...');
    client.destroy().then(() => {
      client.login(process.env.BOT_TOKEN).catch(err => {
        console.error('❌ Falha na reconexão:', err.message);
      });
    });
  }, 5000);
});

client.on("resume", () => {
  console.log('✅ Conexão com Discord restaurada');
});

client.on("error", (error) => {
  console.error('❌ Erro de conexão Discord:', error);
});

// Keep-alive para prevenir "cold start"
setInterval(() => {
  if (client.isReady()) {
    console.log('💓 Bot heartbeat -', new Date().toISOString());
  }
}, 300000); // A cada 5 minutos

client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "miscrits") {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === "info" || subcommand === "moves-and-evos" || subcommand === "relics") {
        
        let commandName;
        if (subcommand === "info") {
          commandName = 'miscrits-info';
        } else if (subcommand === "moves-and-evos") {
          commandName = 'miscrits-evos-moves';
        } else if (subcommand === "relics") {
          commandName = 'miscrits-relics';
        }
        
        const command = client.commands.get(commandName);
        if (command && command.autocomplete) {
          try {
            await command.autocomplete(interaction);
          } catch (error) {
            if (error.code === 10062) return;
            console.error("❌ Erro no autocomplete:", error.message);
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
          flags: 64 
        });
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        if (error.code === 10062) return;
        
        console.error('❌ Erro no comando:', error.message);
        
        try {
          const reply = { content: "❌ Ocorreu um erro ao executar esse comando!", flags: 64 };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch (replyError) {
          if (replyError.code !== 10062) {
            console.error('❌ Erro ao enviar mensagem de erro:', replyError.message);
          }
        }
      }
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🩺 Health check disponível em: http://0.0.0.0:${PORT}/health`);
});

// 🛡️ CONEXÃO SEGURA COM RETRY
function connectBot() {
  client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('❌ ERRO CRÍTICO: Não foi possível conectar ao Discord:', error.message);
    console.log('🔄 Tentando reconectar em 30 segundos...');
    setTimeout(connectBot, 30000);
  });
}

connectBot();