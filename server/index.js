import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTextMessage } from './whatsappService.js';

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

apiRouter.get('/', (req, res) => {
  res.send('Flow API is Running');
});

apiRouter.post('/start', (req, res) => {
  // Em uma implementação real SaaS, salvaríamos o estado do bot no banco de dados
  console.log('Bot iniciado para configuração:', req.body.instanceName);
  res.json({ success: true, message: 'Bot Ativado' });
});

apiRouter.post('/stop', (req, res) => {
  console.log('Bot parado');
  res.json({ success: true, message: 'Bot parado' });
});

// Endpoint para Disparo Real de Teste
apiRouter.post('/send-message', async (req, res) => {
  const { to, message, config } = req.body;
  
  console.log(`\n📨 Tentando enviar mensagem para: ${to}`);
  console.log(`   Conteúdo: "${message}"`);
  console.log(`   Config ID: ${config?.phoneNumberId}`);

  if (!config?.phoneNumberId || !config?.accessToken) {
    return res.status(400).json({ 
      success: false, 
      message: 'Configuração da API incompleta. Preencha ID e Token na Engrenagem.' 
    });
  }

  const result = await sendTextMessage(to, message, config);

  if (result.success) {
     res.json({ success: true, messageId: result.messageId });
  } else {
     res.status(500).json({ success: false, error: result.error });
  }
});

apiRouter.post('/webhook', (req, res) => {
  // Webhook oficial do Meta exige validação GET e processamento POST
  console.log('Webhook recebido:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Webhook Verification (Meta Requirement)
apiRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === 'flow_token_secret') {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
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

// SPA Fallback
app.get('/painel/*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send("Aplicação Frontend não encontrada. Rode 'npm run build'.");
  }
});

app.get('/', (req, res) => {
  res.redirect('/painel');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Flow Micro SaaS rodando em:`);
  console.log(`   Frontend: http://localhost:${PORT}/painel`);
  console.log(`   API:      http://localhost:${PORT}/api`);
});