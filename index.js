require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const https = require('https');

// 🚨 DEBUG INICIAL
console.log('🔧 Node.js version:', process.version);
console.log('🔧 Starting Discord bot...');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds]
});

// 🛡️ SISTEMA DE AUTO-RECOVERY MELHORADO
let restartCount = 0;
let lastRestart = 0;

process.on('unhandledRejection', (error) => {
  if (error.code === 10062 || error.code === 40060) return;
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 CRITICAL ERROR - Bot crashed!', error);
  
  const now = Date.now();
  if (restartCount < 3 && (now - lastRestart) > 300000) {
    restartCount++;
    lastRestart = now;
    console.log(`🔄 Restarting bot automatically... (attempt ${restartCount}/3)`);
    setTimeout(() => process.exit(1), 10000);
  } else {
    console.log('⚠️ Restart limit reached, waiting for manual intervention.');
  }
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

// Mapear subcomandos para arquivos - PARA COMANDO PRINCIPAL
const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves',
  'relics': 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

// ✅ SIMPLIFICADO: Agora usa o mesmo objeto, evitando inconsistência
const testCommandMap = commandMap;

// ✅ CARREGAMENTO SEGURO DOS COMANDOS
try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  
  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${file}`);
      
      if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Command loaded: ${command.data.name}`);
      } else {
        console.error(`❌ Invalid command: ${file} - missing 'data' or 'data.name' property`);
      }
    } catch (error) {
      console.error(`❌ Error loading command ${file}:`, error.message);
    }
  }
} catch (error) {
  console.error('❌ Error reading commands folder:', error.message);
}

// ✅ CORRIGIDO: Usa 'clientReady' conforme deprecation warning
client.once("clientReady", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  console.log(`📋 Commands loaded: ${client.commands.size}`);
  console.log(`🛡️ Auto-recovery system activated`);
});

// 🛡️ AUTO-RECONNECTION (ENGLISH)
client.on("disconnect", () => {
  console.log('⚠️ Bot disconnected from Discord - reconnecting in 5 seconds...');
  setTimeout(() => {
    console.log('🔄 Attempting automatic reconnection...');
    client.destroy().then(() => {
      client.login(process.env.BOT_TOKEN).catch(err => {
        console.error('❌ Reconnection failed:', err.message);
      });
    });
  }, 5000);
});

client.on("resume", () => {
  console.log('✅ Discord connection restored');
  restartCount = 0;
});

client.on("error", (error) => {
  console.error('❌ Discord connection error:', error);
});

// Keep-alive para prevenir "cold start"
setInterval(() => {
  if (client.isReady()) {
    console.log('💓 Bot heartbeat -', new Date().toISOString());
  }
}, 300000);

// ✅ FUNÇÃO AUXILIAR PARA AUTOOCOMPLETE SEGURO
async function handleAutocompleteSafely(interaction, command) {
  try {
    // Verifica múltiplas condições antes de responder
    if (!interaction.responded && !interaction.replied && command.autocomplete) {
      await command.autocomplete(interaction);
    }
  } catch (error) {
    // Ignora silenciosamente erros de interação já processada
    if (error.code === 10062 || error.code === 40060) return;
    console.error("❌ Autocomplete error:", error.message);
  }
}

// ✅ FUNÇÃO AUXILIAR PARA EXECUÇÃO SEGURA DE COMANDOS
async function executeCommandSafely(interaction, command) {
  try {
    await command.execute(interaction);
  } catch (error) {
    // Ignora erro "Unknown interaction" (interação expirou)
    if (error.code === 10062) {
      console.log('⚠️ Expired interaction - ignoring error');
      return;
    }
    
    console.error('❌ Command error:', error.message);
    
    try {
      // ✅ Compatível com ambas as versões do Discord.js
      const reply = {
        content: "❌ An error occurred while executing this command!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      
      // Verifica se ainda podemos responder
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(reply);
      } else if (interaction.deferred) {
        await interaction.followUp(reply);
      }
    } catch (replyError) {
      // Ignora erros de interação expirada
      if (replyError.code !== 10062) {
        console.error('❌ Error sending error message:', replyError.message);
      }
    }
  }
}

client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) {
    const commandName = interaction.commandName;
    const subcommand = interaction.options.getSubcommand();
    
    // ✅ SUPORTE PARA AMBOS OS COMANDOS: miscrits E miscrits-test
    if (commandName === "miscrits" || commandName === "miscrits-test") {
      if (subcommand === "info" || subcommand === "moves-and-evos" || subcommand === "relics") {
        
        let targetCommandName;
        if (subcommand === "info") {
          targetCommandName = 'miscrits-info';
        } else if (subcommand === "moves-and-evos") {
          targetCommandName = 'miscrits-evos-moves';
        } else if (subcommand === "relics") {
          targetCommandName = 'miscrits-relics';
        }
        
        const command = client.commands.get(targetCommandName);
        if (command) {
          await handleAutocompleteSafely(interaction, command);
        }
      }
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const commandName = interaction.commandName;
    const subcommand = interaction.options.getSubcommand();
    
    // ✅ DETERMINAR QUAL MAPA USAR BASEADO NO COMANDO PRINCIPAL
    let targetCommandName;
    
    if (commandName === "miscrits") {
      targetCommandName = commandMap[subcommand];
      console.log(`🔧 Production command: /miscrits ${subcommand} -> ${targetCommandName}`);
    } else if (commandName === "miscrits-test") {
      targetCommandName = testCommandMap[subcommand];
      console.log(`🧪 Test command: /miscrits-test ${subcommand} -> ${targetCommandName}`);
    } else {
      console.log(`❓ Unknown command: ${commandName}`);
      
      // ✅ USA MESMA LÓGICA DE COMPATIBILIDADE
      const reply = {
        content: "❌ Command not recognized!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    if (!targetCommandName) {
      console.error(`❌ Subcommand not mapped: ${commandName} ${subcommand}`);
      const reply = {
        content: "❌ Subcommand not configured!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    const command = client.commands.get(targetCommandName);
    
    if (!command) {
      console.error(`❌ Command file not found: ${targetCommandName}`);
      const reply = {
        content: "❌ Command not configured properly!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    try {
      console.log(`🚀 Executing: ${targetCommandName} for ${commandName} ${subcommand}`);
      await executeCommandSafely(interaction, command);
    } catch (error) {
      console.error('❌ Fatal command error:', error.message);
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🩺 Health check available at: http://0.0.0.0:${PORT}/health`);
  
  // 🔄 SELF-PING MELHORADO
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || "https://miscrit-bot.onrender.com";
    
    https.get(`${url}/health`, (res) => {
      console.log("🌐 Self-ping executed - Status:", res.statusCode);
      res.on('data', () => {});
    }).on('error', (err) => {
      console.warn(`⚠️ Self-ping failed: ${err.message}`);
    }).setTimeout(10000, () => {
      console.warn('⚠️ Self-ping timeout');
    });
    
  }, 4 * 60 * 1000);
  
  console.log("🔁 Self-ping system activated");
});

// 🚀 FORCED CONNECTION WITH WEB SOCKET DEBUG
function connectBot() {
  console.log('🔑 Starting Discord connection with WebSocket debug...');
  
  const loginPromise = client.login(process.env.BOT_TOKEN);

  // Timeout de 15 segundos para WebSocket
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('DISCORD_WS_TIMEOUT: WebSocket handshake timeout after 15s')), 15000);
  });

  Promise.race([loginPromise, timeoutPromise])
    .then(() => {
      console.log('🎉 Discord WebSocket connected successfully!');
    })
    .catch(error => {
      console.error('❌ WEB SOCKET ERROR:', error.message);
      console.log('🔧 Error type:', error.code || 'NO_CODE');
      
      if (error.message.includes('DISCORD_WS_TIMEOUT')) {
        console.log('🚨 CONFIRMED: Render is blocking WebSocket connection to Discord');
        console.log('💡 Solution required: Render support needs to allow Discord WebSocket connections');
      }
      
      console.log('🔄 Retrying in 30 seconds...');
      setTimeout(connectBot, 30000);
    });
}

// Conexão inicial + verificação periódica
connectBot();

// Verifica a cada minuto se ainda está conectado
setInterval(() => {
  if (!client.isReady()) {
    console.log('⚠️ Bot disconnected - reconnecting...');
    client.destroy().then(() => {
      setTimeout(connectBot, 5000);
    });
  }
}, 60000);