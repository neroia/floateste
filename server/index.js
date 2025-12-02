import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const PORT = 3000;
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- API ROUTES (Prefix: /api) ---
const apiRouter = express.Router();

// Estado simulado do Bot
let botState = {
  status: 'offline', // offline, online, qr_code
  qrCode: null,
  config: {}
};

apiRouter.get('/', (req, res) => {
  res.send('Flow API is Running');
});

apiRouter.get('/status', (req, res) => {
  res.json(botState);
});

apiRouter.post('/start', (req, res) => {
  const config = req.body;
  console.log('Recebendo comando de iniciar com config:', config);
  
  botState.status = 'connecting';
  botState.config = config;

  setTimeout(() => {
    botState.status = 'online';
    console.log('Bot conectado com sucesso (Simulado)');
  }, 2000);

  res.json({ success: true, message: 'Processo de conexão iniciado' });
});

apiRouter.post('/stop', (req, res) => {
  console.log('Parando bot...');
  botState.status = 'offline';
  botState.qrCode = null;
  res.json({ success: true, message: 'Bot parado' });
});

apiRouter.post('/webhook', (req, res) => {
  console.log('Webhook recebido:', req.body);
  res.sendStatus(200);
});

// Mount API Router
app.use('/api', apiRouter);

// --- FRONTEND ROUTES (Prefix: /painel) ---
const distPath = path.join(__dirname, '../dist');

// Check if build exists
if (!fs.existsSync(distPath)) {
  console.error("❌ ERRO: A pasta 'dist' não foi encontrada.");
  console.error("   Certifique-se de rodar 'npm run build' antes de iniciar o servidor.");
}

app.use('/painel', express.static(distPath));

// SPA Fallback: Return index.html for any unknown route under /painel
app.get('/painel/*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send("Aplicação Frontend não encontrada. Rode 'npm run build'.");
  }
});

// Redirect root to /painel
app.get('/', (req, res) => {
  res.redirect('/painel');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Flow Micro SaaS rodando em:`);
  console.log(`   Frontend: http://localhost:${PORT}/painel`);
  console.log(`   API:      http://localhost:${PORT}/api`);
});