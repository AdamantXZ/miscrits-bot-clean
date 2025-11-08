// 🛡️ AUTO-RECONNECTION
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

// 🚀 FORCED CONNECTION WITH AGGRESSIVE RETRY
function connectBot() {
  console.log('🔑 Attempting to connect to Discord...');
  
  client.login(process.env.BOT_TOKEN)
    .then(() => {
      console.log('🎉 CONNECTED TO DISCORD!');
    })
    .catch(error => {
      console.error('❌ CONNECTION FAILED:', error.message);
      console.error('Error code:', error.code);
      console.log('🔄 Retrying in 30 seconds...');
      setTimeout(connectBot, 30000);
    });
}

// Verifica a cada minuto se ainda está conectado
setInterval(() => {
  if (!client.isReady()) {
    console.log('⚠️ Bot disconnected - reconnecting...');
    client.destroy().then(() => {
      setTimeout(connectBot, 5000);
    });
  }
}, 60000);