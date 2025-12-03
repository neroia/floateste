import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { 
  startWhatsApp, 
  setMessageHandler, 
  getStatusData, 
  logout,
  sendTextMessage, 
  sendButtonMessage, 
  sendListMessage, 
  sendImageMessage,
  isConnected 
} from './whatsappService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// --- INICIALIZAÇÃO DO WHATSAPP LOCAL ---
startWhatsApp(); // Inicia o socket do Baileys

// --- ESTADO DO FLUXO ---
let activeFlow = {
  isRunning: false,
  nodes: [],
  edges: []
};

const userSessions = {};

// --- HELPER FUNCTIONS ---
const cleanPhoneNumber = (jid) => {
  if (!jid) return '';
  return jid.replace('@s.whatsapp.net', '').split(':')[0];
};

const replaceVariables = (text, variables) => {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] || ''));
};

const getNextNode = (currentNodeId, sourceHandle = null) => {
  const edges = activeFlow.edges;
  if (sourceHandle) {
    const edge = edges.find(e => e.source === currentNodeId && e.sourceHandle === sourceHandle);
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  } else {
    const edge = edges.find(e => e.source === currentNodeId);
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  }
};

// --- ENGINE DE FLUXO ---
const processFlowStep = async (userPhone, userInput = null, optionId = null) => {
  // Verificação Dupla: Bot Ativo E Conectado
  if (!activeFlow.isRunning) return;
  if (!isConnected()) {
    console.log('[Flow] Ignorando mensagem: WhatsApp desconectado.');
    return;
  }

  const cleanPhone = cleanPhoneNumber(userPhone);

  if (!userSessions[cleanPhone]) {
    const startNode = activeFlow.nodes.find(n => n.type === 'start');
    if (!startNode) return;
    
    // Verificações de Gatilho
    if (startNode.data.triggerType === 'keyword_exact' && startNode.data.triggerKeywords) {
       if (userInput?.toLowerCase() !== startNode.data.triggerKeywords.toLowerCase()) return;
    }
    if (startNode.data.triggerType === 'keyword_contains' && startNode.data.triggerKeywords) {
       if (!userInput?.toLowerCase().includes(startNode.data.triggerKeywords.toLowerCase())) return;
    }
    
    userSessions[cleanPhone] = {
      currentNodeId: startNode.id,
      variables: { phone: cleanPhone }
    };
    
    console.log(`[Flow] Iniciando para ${cleanPhone}`);
    
    const nextNode = getNextNode(startNode.id);
    if (nextNode) {
      userSessions[cleanPhone].currentNodeId = nextNode.id;
      await executeNode(nextNode, cleanPhone);
    }
    return;
  }

  const session = userSessions[cleanPhone];
  const currentNode = activeFlow.nodes.find(n => n.id === session.currentNodeId);

  if (currentNode) {
    if (currentNode.type === 'input' && userInput) {
      if (currentNode.data.variable) {
        session.variables[currentNode.data.variable] = userInput;
      }
      const next = getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
    } 
    else if (currentNode.type === 'interactive' && (optionId || userInput)) {
      if (currentNode.data.variable) {
         session.variables[currentNode.data.variable] = userInput; // Ou optionId
      }
      // Tenta seguir caminho específico do botão ou caminho padrão
      const next = getNextNode(currentNode.id, optionId) || getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
    }
  }
};

const executeNode = async (node, userPhone) => {
  // Segurança extra
  if (!isConnected()) return;

  const session = userSessions[userPhone];
  session.currentNodeId = node.id;

  await new Promise(r => setTimeout(r, 800)); // Delay humano natural

  switch (node.type) {
    case 'message':
      const text = replaceVariables(node.data.content, session.variables);
      await sendTextMessage(userPhone, text);
      const nextMsg = getNextNode(node.id);
      if (nextMsg) await executeNode(nextMsg, userPhone);
      break;

    case 'image':
      await sendImageMessage(userPhone, node.data.content);
      const nextImg = getNextNode(node.id);
      if (nextImg) await executeNode(nextImg, userPhone);
      break;

    case 'interactive':
      const bodyText = replaceVariables(node.data.content, session.variables);
      const type = node.data.interactiveType || 'button';
      
      if (type === 'button') {
        await sendButtonMessage(userPhone, bodyText, node.data.options || []);
      } else {
        await sendListMessage(userPhone, bodyText, 'Abrir Menu', node.data.options || []);
      }
      break;

    case 'input':
      const question = replaceVariables(node.data.content, session.variables);
      await sendTextMessage(userPhone, question);
      break;

    case 'set_variable':
      if (node.data.variable && node.data.value) {
        session.variables[node.data.variable] = replaceVariables(node.data.value, session.variables);
      }
      const nextVar = getNextNode(node.id);
      if (nextVar) await executeNode(nextVar, userPhone);
      break;
    
    // TODO: Implementar lógica de API Request e AI Gemini aqui também no backend para produção real
    // Por enquanto, simplificado para Message flow.

    case 'delay':
      const ms = (node.data.duration || 1) * 1000;
      await new Promise(r => setTimeout(r, ms));
      const nextDelay = getNextNode(node.id);
      if (nextDelay) await executeNode(nextDelay, userPhone);
      break;

    default:
      const nextDef = getNextNode(node.id);
      if (nextDef) await executeNode(nextDef, userPhone);
  }
};


// --- HANDLER DE MENSAGENS BAILEYS ---
setMessageHandler((msg) => {
  // O bot só processa se estiver ONLINE e RODANDO
  if (!isConnected()) return;
  if (!activeFlow.isRunning) return;

  const remoteJid = msg.key.remoteJid;
  const userText = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.buttonsResponseMessage?.selectedDisplayText ||
                   msg.message?.listResponseMessage?.title;
  
  const selectedButtonId = msg.message?.buttonsResponseMessage?.selectedButtonId || 
                           msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

  if (userText) {
    console.log(`📩 Mensagem recebida de ${remoteJid}: ${userText}`);
    processFlowStep(remoteJid, userText, selectedButtonId);
  }
});


// --- API ROUTES ---
const apiRouter = express.Router();

// Rotas para o Frontend controlar a conexão
apiRouter.get('/whatsapp/status', (req, res) => {
  const data = getStatusData();
  res.json(data);
});

apiRouter.post('/whatsapp/connect', (req, res) => {
  // Baileys já inicia automaticamente no start, mas podemos forçar recarregamento se precisar
  const data = getStatusData();
  res.json(data);
});

apiRouter.post('/whatsapp/logout', async (req, res) => {
  const result = await logout();
  res.json(result);
});

// Controle do Bot
apiRouter.post('/start', (req, res) => {
  const { flowData } = req.body;
  
  if (!isConnected()) {
    return res.json({ success: false, message: 'WhatsApp não está conectado. Vá em Configurações > Conectar.' });
  }

  activeFlow.nodes = flowData.nodes || [];
  activeFlow.edges = flowData.edges || [];
  activeFlow.isRunning = true;
  console.log('🤖 Bot iniciado com', activeFlow.nodes.length, 'nós');
  res.json({ success: true });
});

apiRouter.post('/stop', (req, res) => {
  activeFlow.isRunning = false;
  console.log('🤖 Bot parado');
  res.json({ success: true });
});

apiRouter.post('/send-message', async (req, res) => {
  if (!isConnected()) {
    return res.status(400).json({ success: false, error: 'WhatsApp Offline' });
  }
  const { to, message } = req.body;
  // Teste manual
  const result = await sendTextMessage(to, message);
  res.json(result);
});

app.use('/api', apiRouter);

// --- STATIC FRONTEND ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use('/painel', express.static(distPath));
  app.get('/painel/*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.get('/', (req, res) => res.redirect('/painel'));
} else {
  console.log("⚠️ Pasta 'dist' não encontrada. O frontend não será servido.");
}

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Rodando!`);
  console.log(`👉 Acesso: http://localhost:${PORT}/painel`);
});