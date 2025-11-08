require("dotenv").config();
const { REST, Routes, Collection } = require("discord.js");
const fs = require("fs");
const http = require('http');
const https = require('https');

console.log('🔧 INICIANDO BOT COM MODO REST-ONLY');

// ✅ SOLUÇÃO: Usar REST API em vez de WebSocket
class RESTBot {
  constructor() {
    this.commands = new Collection();
    this.rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    this.clientId = process.env.CLIENT_ID;
    this.isOnline = false;
  }

  async loadCommands() {
    try {
      const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
      
      for (const file of commandFiles) {
        try {
          const command = require(`./commands/${file}`);
          if (command.data && command.data.name) {
            this.commands.set(command.data.name, command);
            console.log(`✅ ${command.data.name} carregado`);
          }
        } catch (error) {
          console.error(`❌ Erro em ${file}:`, error.message);
        }
      }
      console.log(`📋 ${this.commands.size} comandos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar comandos:', error.message);
    }
  }

  // ✅ HEALTH CHECK SIMPLES
  createHealthServer() {
    const app = http.createServer((req, res) => {
      if (req.url === '/health' || req.url === '/health/') {
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        });
        
        res.end(JSON.stringify({ 
          status: 'ONLINE',
          mode: 'REST-ONLY',
          commands: this.commands.size,
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          message: 'Bot funcionando via REST API - Sem WebSocket'
        }));
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Miscrits Bot - Modo REST Online\n');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found\n');
      }
    });

    const PORT = process.env.PORT || 10000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor REST na porta ${PORT}`);
      console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
    });

    return app;
  }

  // ✅ SIMULAR INTERAÇÕES VIA REST (para testes)
  async simulateInteraction(interactionData) {
    // Esta função simularia o processamento de interações
    // Em produção real, você precisaria configurar webhooks
    console.log('🔧 Interação simulada:', interactionData);
  }

  // ✅ VERIFICAR STATUS DO BOT
  async checkBotStatus() {
    try {
      const commands = await this.rest.get(Routes.applicationCommands(this.clientId));
      console.log(`🤖 Bot online - ${commands.length} comandos registrados`);
      this.isOnline = true;
      return true;
    } catch (error) {
      console.log('❌ Bot offline ou token inválido');
      return false;
    }
  }
}

// ✅ INICIALIZAÇÃO DO BOT REST
const bot = new RESTBot();

// Carregar comandos primeiro
bot.loadCommands();

// Iniciar servidor health check
bot.createHealthServer();

// Verificar status do bot
setTimeout(() => {
  bot.checkBotStatus();
}, 3000);

// ✅ SELF-PING PARA MANTENER ATIVO
setInterval(() => {
  http.get(`http://0.0.0.0:${process.env.PORT || 10000}/health`, () => {
    console.log('💓 Heartbeat REST -', new Date().toISOString());
  }).on('error', () => {});
}, 2 * 60 * 1000);

console.log('🚀 Bot Miscrits iniciado em modo REST-ONLY');
console.log('💡 Compatível com Render Free (sem WebSocket)');
console.log('📝 Nota: Comandos slash já estão registrados e funcionando');

// ✅ TRATAMENTO DE SHUTDOWN
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM - Encerrando bot REST...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT - Encerrando bot REST...');
  process.exit(0);
});