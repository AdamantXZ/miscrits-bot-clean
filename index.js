// Adicione isto ANTES do client.login():
console.log('🌐 Testando conectividade...');

// Teste de conectividade básica
const https = require('https');
https.get('https://discord.com/api/v10/gateway', (res) => {
  console.log(`📡 Conectividade Discord: ${res.statusCode}`);
}).on('error', (err) => {
  console.error('❌ Sem conectividade com Discord:', err.message);
});

// Timeout específico para login
console.log('🔑 Iniciando login...');
const loginTimeout = setTimeout(() => {
  console.log('⏰ TIMEOUT - Login travado após 30s');
}, 30000);

client.login(process.env.BOT_TOKEN)
  .then(() => {
    clearTimeout(loginTimeout);
    console.log('✅ Login bem-sucedido!');
  })
  .catch(err => {
    clearTimeout(loginTimeout);
    console.error('❌ ERRO NO LOGIN:', err.message);
    console.error('Código do erro:', err.code);
  });