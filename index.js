require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const https = require('https');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds]
});

// 🛡️ SISTEMA DE AUTO-RECOVERY MELHORADO
let restartCount = 0;
let lastRestart = 0;

process.on('unhandledRejection', (error) => {
  if (error.code === 10062 || error.code === 40060) return; // Ignora interações expiradas
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 ERRO CRÍTICO - Bot travou!', error);
  
  const now = Date.now();
  if (restartCount < 3 && (now - lastRestart) > 300000) {
    restartCount++;
    lastRestart = now;
    console.log(`🔄 Reiniciando bot automaticamente... (tentativa ${restartCount}/3)`);
    setTimeout(() => process.exit(1), 10000);
  } else {
    console.log('⚠️ Limite de reinícios atingido, aguardando intervenção manual.');
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

// ✅ MELHORIA 1: Remove duplicação - usa o mesmo mapa para ambos
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

// ✅ CORRIGIDO: Usa 'clientReady' conforme deprecation warning
client.once("clientReady", () => {
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
  restartCount = 0;
});

client.on("error", (error) => {
  console.error('❌ Erro de conexão Discord:', error);
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
    console.error("❌ Erro no autocomplete:", error.message);
  }
}

// ✅ FUNÇÃO AUXILIAR PARA EXECUÇÃO SEGURA DE COMANDOS
async function executeCommandSafely(interaction, command) {
  try {
    await command.execute(interaction);
  } catch (error) {
    // Ignora erro "Unknown interaction" (interação expirou)
    if (error.code === 10062) {
      console.log('⚠️ Interação expirada - ignorando erro');
      return;
    }
    
    console.error('❌ Erro no comando:', error.message);
    
    try {
      // ✅ MELHORIA 2: Compatível com ambas as versões do Discord.js
      const reply = {
        content: "❌ Ocorreu um erro ao executar esse comando!",
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
        console.error('❌ Erro ao enviar mensagem de erro:', replyError.message);
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
      console.log(`🔧 Comando produção: /miscrits ${subcommand} -> ${targetCommandName}`);
    } else if (commandName === "miscrits-test") {
      targetCommandName = testCommandMap[subcommand];
      console.log(`🧪 Comando teste: /miscrits-test ${subcommand} -> ${targetCommandName}`);
    } else {
      console.log(`❓ Comando desconhecido: ${commandName}`);
      
      // ✅ USA MESMA LÓGICA DE COMPATIBILIDADE
      const reply = {
        content: "❌ Comando não reconhecido!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    if (!targetCommandName) {
      console.error(`❌ Subcomando não mapeado: ${commandName} ${subcommand}`);
      const reply = {
        content: "❌ Subcomando não configurado!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    const command = client.commands.get(targetCommandName);
    
    if (!command) {
      console.error(`❌ Arquivo de comando não encontrado: ${targetCommandName}`);
      const reply = {
        content: "❌ Comando não configurado corretamente!",
        ...(interaction.ephemeral !== undefined ? { ephemeral: true } : { flags: 64 })
      };
      return await interaction.reply(reply);
    }
    
    try {
      console.log(`🚀 Executando: ${targetCommandName} para ${commandName} ${subcommand}`);
      await executeCommandSafely(interaction, command);
    } catch (error) {
      console.error('❌ Erro fatal no comando:', error.message);
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🩺 Health check disponível em: http://0.0.0.0:${PORT}/health`);
  
  // 🔄 SELF-PING MELHORADO
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || "https://miscrit-bot.onrender.com";
    
    https.get(`${url}/health`, (res) => {
      console.log("🌐 Self-ping executado - Status:", res.statusCode);
      res.on('data', () => {});
    }).on('error', (err) => {
      console.warn(`⚠️ Self-ping falhou: ${err.message}`);
    }).setTimeout(10000, () => {
      console.warn('⚠️ Self-ping timeout');
    });
    
  }, 4 * 60 * 1000);
  
  console.log("🔁 Sistema de self-ping ativado");
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