require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const { Server } = require("socket.io");

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds]
});

// ✅ SERVIDOR HTTP PRINCIPAL
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK',
      bot: client.isReady() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Miscrits Online!\n');
  }
});

// ✅ SOCKET.IO NO MESMO SERVIDOR (MESMA PORTA)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ✅ WEB SOCKET SERVER (AGORA NA MESMA PORTA)
io.on("connection", (socket) => {
  console.log('✅ Cliente Socket.IO conectado:', socket.id);
  
  socket.on("disconnect", () => {
    console.log('❌ Cliente Socket.IO desconectado:', socket.id);
  });
  
  socket.on("ping", (data) => {
    socket.emit("pong", { 
      message: "Bot online!",
      botStatus: client.isReady() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  });
});

// ✅ CONFIGURAÇÃO DOS COMANDOS (MANTIDO)
client.commands = new Collection();

const commandMap = {
  'info': 'miscrits-info',
  'moves-and-evos': 'miscrits-evos-moves', 
  'relics': 'miscrits-relics',
  'spawn-days': 'miscrits-days',
  'tierlist': 'miscrits-tier-list'
};

// ✅ CARREGAR COMANDOS
try {
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.data.name) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Comando carregado: ${command.data.name}`);
    }
  }
} catch (error) {
  console.error('❌ Erro ao carregar comandos:', error.message);
}

// ✅ EVENTOS DO DISCORD
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`🔗 Socket.IO ativo na mesma porta do HTTP`);
});

// ✅ INTERAÇÕES
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  let targetCommandName = commandMap[subcommand];
  if (!targetCommandName) return;
  
  const command = client.commands.get(targetCommandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Erro no comando:', error.message);
  }
});

// ✅ INICIAR TUDO NA MESMA PORTA
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP + Socket.IO rodando na porta ${PORT}`);
  console.log(`🩺 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 Socket.IO: conectando na mesma porta ${PORT}`);
  
  // ✅ CONECTAR DISCORD
  setTimeout(() => {
    connectBot();
  }, 2000);
});

// ✅ CONEXÃO COM DISCORD
function connectBot() {
  console.log('🔑 Tentando conexão WebSocket com Discord...');
  
  client.login(process.env.BOT_TOKEN)
    .then(() => {
      console.log('🎉 CONEXÃO COM DISCORD ESTABELECIDA!');
    })
    .catch(error => {
      console.error('❌ Erro na conexão Discord:', error.message);
      console.log('🔄 Tentando novamente em 30 segundos...');
      setTimeout(connectBot, 30000);
    });
}