import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// Configuração
const PORT = process.env.PORT || 8080;
const app = express();

// Middleware
app.use(cors()); // Permite que o Frontend (React) fale com esse Backend
app.use(bodyParser.json());

// Estado simulado do Bot
let botState = {
  status: 'offline', // offline, online, qr_code
  qrCode: null,
  config: {}
};

// Rotas da API Local
app.get('/', (req, res) => {
  res.send('Flow Local Server is Running');
});

// Status do Bot
app.get('/status', (req, res) => {
  res.json(botState);
});

// Iniciar Bot
app.post('/start', (req, res) => {
  const config = req.body;
  console.log('Recebendo comando de iniciar com config:', config);
  
  // Aqui você integraria com bibliotecas reais como Baileys ou Venom-bot
  // Simulando processo de conexão...
  botState.status = 'connecting';
  botState.config = config;

  // Simulação de delay de conexão
  setTimeout(() => {
    botState.status = 'online';
    console.log('Bot conectado com sucesso (Simulado)');
  }, 2000);

  res.json({ success: true, message: 'Processo de conexão iniciado' });
});

// Parar Bot
app.post('/stop', (req, res) => {
  console.log('Parando bot...');
  botState.status = 'offline';
  botState.qrCode = null;
  res.json({ success: true, message: 'Bot parado' });
});

// Endpoint para receber Webhooks
app.post('/webhook', (req, res) => {
  console.log('Webhook recebido:', req.body);
  res.sendStatus(200);
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Local do Flow rodando em http://localhost:${PORT}`);
  console.log(`   Pronto para receber comandos do Electron App.\n`);
});