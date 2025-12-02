import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTextMessage, sendButtonMessage, sendListMessage, sendImageMessage } from './whatsappService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const PORT = 3000;
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// --- IN-MEMORY STORAGE ---
let activeFlow = {
  isRunning: false,
  config: null,
  nodes: [],
  edges: []
};

const userSessions = {};

// --- HELPER FUNCTIONS ---

const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  // Evolution envia com @s.whatsapp.net, removemos
  let p = phone.replace('@s.whatsapp.net', '');
  return p.replace(/\D/g, '');
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
  if (!activeFlow.isRunning || !activeFlow.config) return;

  const cleanPhone = cleanPhoneNumber(userPhone);

  // Inicializa sessão
  if (!userSessions[cleanPhone]) {
    const startNode = activeFlow.nodes.find(n => n.type === 'start');
    if (!startNode) return;
    
    userSessions[cleanPhone] = {
      currentNodeId: startNode.id,
      variables: { phone: cleanPhone }
    };
    
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
         session.variables[currentNode.data.variable] = userInput;
      }
      // Tenta achar edge pelo ID, se falhar, tenta pelo texto (fallback)
      const next = getNextNode(currentNode.id, optionId) || getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
    }
  }
};

const executeNode = async (node, userPhone) => {
  const session = userSessions[userPhone];
  session.currentNodeId = node.id;
  const config = activeFlow.config;

  await new Promise(r => setTimeout(r, 500));
  console.log(`[Engine] Executando nó ${node.type} para ${userPhone}`);

  switch (node.type) {
    case 'message':
      const text = replaceVariables(node.data.content, session.variables);
      await sendTextMessage(userPhone, text, config);
      const nextMsg = getNextNode(node.id);
      if (nextMsg) await executeNode(nextMsg, userPhone);
      break;

    case 'image':
      await sendImageMessage(userPhone, node.data.content, '', config);
      const nextImg = getNextNode(node.id);
      if (nextImg) await executeNode(nextImg, userPhone);
      break;

    case 'interactive':
      const bodyText = replaceVariables(node.data.content, session.variables);
      const type = node.data.interactiveType || 'button';
      
      if (type === 'button') {
        await sendButtonMessage(userPhone, bodyText, node.data.options || [], config);
      } else {
        await sendListMessage(userPhone, bodyText, 'Abrir Menu', node.data.options || [], config);
      }
      break;

    case 'input':
      const question = replaceVariables(node.data.content, session.variables);
      await sendTextMessage(userPhone, question, config);
      break;

    case 'set_variable':
      if (node.data.variable && node.data.value) {
        session.variables[node.data.variable] = replaceVariables(node.data.value, session.variables);
      }
      const nextVar = getNextNode(node.id);
      if (nextVar) await executeNode(nextVar, userPhone);
      break;

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


// --- API ROUTES ---
const apiRouter = express.Router();

apiRouter.post('/start', (req, res) => {
  const { flowData, ...config } = req.body;
  if (!flowData || !flowData.nodes) {
    return res.status(400).json({ success: false, message: 'Dados do fluxo inválidos' });
  }

  activeFlow = {
    isRunning: true,
    config: config,
    nodes: flowData.nodes,
    edges: flowData.edges
  };

  console.log(`🤖 BOT ATIVADO: ${config.instanceName} (Evolution)`);
  res.json({ success: true, message: 'Bot Ativado' });
});

apiRouter.post('/stop', (req, res) => {
  activeFlow.isRunning = false;
  console.log('🤖 BOT PARADO');
  res.json({ success: true, message: 'Bot parado' });
});

apiRouter.post('/send-message', async (req, res) => {
  const { to, message, config } = req.body;
  const cleanTo = cleanPhoneNumber(to);
  
  console.log(`\n📨 Teste Manual (Evolution) para: ${cleanTo}`);

  if (!config?.evolutionUrl) {
    return res.status(400).json({ success: false, message: 'Configuração Evolution incompleta.' });
  }

  const result = await sendTextMessage(cleanTo, message, config);
  res.json(result);
});

// --- WEBHOOK EVOLUTION API ---
// O endpoint que você deve configurar na Evolution é: http://seu-ip:3000/api/webhook
apiRouter.post('/webhook', async (req, res) => {
  // A Evolution espera um 200 OK rápido
  res.status(200).json({ status: 'success' });

  try {
    const body = req.body;
    
    // Log para debug
    // console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2));

    // Verifica formato padrão Evolution v2 (Event Type: MESSAGES_UPSERT)
    if (body.event === 'messages.upsert') {
       const msgData = body.data;
       
       // Ignora mensagens enviadas por mim mesmo (fromMe: true)
       if (msgData.key.fromMe) return;

       const remoteJid = msgData.key.remoteJid; // 5511999...@s.whatsapp.net
       const from = cleanPhoneNumber(remoteJid);
       const messageContent = msgData.message;

       if (!messageContent) return;

       console.log(`📩 Webhook Evolution: Mensagem de ${from}`);

       let userInput = null;
       let optionId = null;

       // Extração de texto (Vários formatos possíveis no Baileys)
       if (messageContent.conversation) {
         userInput = messageContent.conversation;
       } 
       else if (messageContent.extendedTextMessage?.text) {
         userInput = messageContent.extendedTextMessage.text;
       }
       else if (messageContent.buttonsResponseMessage) {
         // Resposta de Botão Antigo
         userInput = messageContent.buttonsResponseMessage.selectedDisplayText;
         optionId = messageContent.buttonsResponseMessage.selectedButtonId;
       }
       else if (messageContent.listResponseMessage) {
         // Resposta de Lista
         userInput = messageContent.listResponseMessage.title;
         optionId = messageContent.listResponseMessage.singleSelectReply.selectedRowId;
       }
       // Resposta de botão template (novo)
       else if (messageContent.templateButtonReplyMessage) {
          userInput = messageContent.templateButtonReplyMessage.selectedDisplayText;
          optionId = messageContent.templateButtonReplyMessage.selectedId;
       }

       if (userInput && activeFlow.isRunning) {
         console.log(`   Conteúdo: "${userInput}"`);
         await processFlowStep(from, userInput, optionId);
       }
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
  }
});

// Mount API Router
app.use('/api', apiRouter);

// --- FRONTEND ROUTES ---
const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  console.error("❌ ERRO: A pasta 'dist' não foi encontrada.");
}
app.use('/painel', express.static(distPath));
app.get('/painel/*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send("Frontend não encontrado.");
  }
});
app.get('/', (req, res) => res.redirect('/painel'));

app.listen(PORT, () => {
  console.log(`\n🚀 Flow (Evolution Edition) rodando em: http://localhost:${PORT}/painel`);
});