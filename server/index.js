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
app.use(bodyParser.json());

// --- IN-MEMORY STORAGE (Para Micro SaaS sem Banco de Dados) ---
// Em produção real, use Redis ou PostgreSQL
let activeFlow = {
  isRunning: false,
  config: null,
  nodes: [],
  edges: []
};

// Armazena o estado atual de cada usuário (número de telefone)
// Ex: { '551199999999': { currentNodeId: 'node-1', variables: {} } }
const userSessions = {};

// --- HELPER FUNCTIONS ---

// Limpa número de telefone (apenas dígitos)
const cleanPhoneNumber = (phone) => {
  return phone.replace(/\D/g, '');
};

// Substitui variáveis no texto (ex: {{nome}})
const replaceVariables = (text, variables) => {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] || ''));
};

// Encontra o próximo nó baseado na conexão
const getNextNode = (currentNodeId, sourceHandle = null) => {
  const edges = activeFlow.edges;
  
  if (sourceHandle) {
    // Busca aresta específica (ex: Botão clicado ou Condição)
    const edge = edges.find(e => e.source === currentNodeId && e.sourceHandle === sourceHandle);
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  } else {
    // Busca aresta padrão
    const edge = edges.find(e => e.source === currentNodeId);
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  }
};

// --- ENGINE DE FLUXO (O Cérebro do Bot) ---
const processFlowStep = async (userPhone, userInput = null, optionId = null) => {
  if (!activeFlow.isRunning || !activeFlow.config) return;

  // Inicializa sessão se não existir
  if (!userSessions[userPhone]) {
    const startNode = activeFlow.nodes.find(n => n.type === 'start');
    if (!startNode) return;
    
    userSessions[userPhone] = {
      currentNodeId: startNode.id,
      variables: { phone: userPhone }
    };
    
    // Se for o primeiro contato, já move para o próximo do Start
    const nextNode = getNextNode(startNode.id);
    if (nextNode) {
      userSessions[userPhone].currentNodeId = nextNode.id;
      await executeNode(nextNode, userPhone);
    }
    return;
  }

  const session = userSessions[userPhone];
  const currentNode = activeFlow.nodes.find(n => n.id === session.currentNodeId);

  // Se estamos esperando input (ex: Input de Texto ou Botão)
  if (currentNode) {
    // 1. Processar Input do usuário no nó atual
    if (currentNode.type === 'input' && userInput) {
      if (currentNode.data.variable) {
        session.variables[currentNode.data.variable] = userInput;
      }
      // Avança
      const next = getNextNode(currentNode.id);
      if (next) await executeNode(next, userPhone);
    } 
    else if (currentNode.type === 'interactive' && optionId) {
      // Input de Botão/Lista
      if (currentNode.data.variable) {
         session.variables[currentNode.data.variable] = userInput; // Label do botão
      }
      // Avança pelo Handle específico da opção
      const next = getNextNode(currentNode.id, optionId);
      if (next) await executeNode(next, userPhone);
    }
    else {
       // Se o usuário mandou mensagem mas o bot não estava esperando input (ex: estava processando),
       // ou se é um comando de "Reiniciar", podemos tratar aqui.
       // Por enquanto, vamos assumir fluxo linear.
    }
  }
};

// Executa a ação do nó e chama recursivamente o próximo
const executeNode = async (node, userPhone) => {
  const session = userSessions[userPhone];
  session.currentNodeId = node.id;
  const config = activeFlow.config;

  // Pequeno delay para naturalidade
  await new Promise(r => setTimeout(r, 500));

  console.log(`[Engine] Executando nó ${node.type} para ${userPhone}`);

  switch (node.type) {
    case 'message':
      const text = replaceVariables(node.data.content, session.variables);
      await sendTextMessage(userPhone, text, config);
      // Auto-avançar
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
      // PAUSA: O bot para aqui e espera o webhook trazer a resposta do botão
      break;

    case 'input':
      const question = replaceVariables(node.data.content, session.variables);
      await sendTextMessage(userPhone, question, config);
      // PAUSA: O bot para aqui e espera o webhook trazer texto
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

    // Adicione outros tipos (API, AI, Condition) aqui conforme necessário
    default:
      console.log('Nó não implementado ou desconhecido, pulando...');
      const nextDef = getNextNode(node.id);
      if (nextDef) await executeNode(nextDef, userPhone);
  }
};


// --- API ROUTES (Prefix: /api) ---
const apiRouter = express.Router();

apiRouter.get('/', (req, res) => {
  res.send('Flow API is Running');
});

// Ativar o Bot
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

  console.log(`🤖 BOT ATIVADO: ${config.instanceName}`);
  console.log(`   Carregados ${activeFlow.nodes.length} nós e ${activeFlow.edges.length} conexões.`);
  
  res.json({ success: true, message: 'Bot Ativado e Memória Carregada' });
});

apiRouter.post('/stop', (req, res) => {
  activeFlow.isRunning = false;
  console.log('🤖 BOT PARADO');
  res.json({ success: true, message: 'Bot parado' });
});

// Disparo Manual
apiRouter.post('/send-message', async (req, res) => {
  const { to, message, config } = req.body;
  
  // Validação de número
  const cleanTo = cleanPhoneNumber(to);
  
  console.log(`\n📨 Tentando enviar mensagem para: ${cleanTo}`);

  if (!config?.phoneNumberId || !config?.accessToken) {
    return res.status(400).json({ success: false, message: 'Configuração incompleta.' });
  }

  const result = await sendTextMessage(cleanTo, message, config);

  if (result.success) {
     res.json({ success: true, messageId: result.messageId });
  } else {
     res.status(500).json({ success: false, error: result.error });
  }
});

// --- WEBHOOK REAL ---
apiRouter.post('/webhook', async (req, res) => {
  // Responde imediatamente para o Meta não tentar reenviar
  res.sendStatus(200);

  try {
    const body = req.body;

    // Verifica se é uma mensagem do WhatsApp
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const from = message.from; // Número do usuário
        const type = message.type;
        
        console.log(`📩 Webhook: Mensagem recebida de ${from} [${type}]`);

        // Ignora status updates
        if (type === 'status') return;

        let userInput = null;
        let optionId = null;

        if (type === 'text') {
          userInput = message.text.body;
        } else if (type === 'interactive') {
          const interactive = message.interactive;
          if (interactive.type === 'button_reply') {
            userInput = interactive.button_reply.title;
            optionId = interactive.button_reply.id;
          } else if (interactive.type === 'list_reply') {
            userInput = interactive.list_reply.title;
            optionId = interactive.list_reply.id;
          }
        }

        // DISPARA A ENGINE
        if (activeFlow.isRunning) {
          await processFlowStep(from, userInput, optionId);
        } else {
          console.log('Bot está desligado. Ignorando mensagem.');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
  }
});

// Verificação do Webhook (Meta Requirement)
apiRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === 'flow_token_secret') {
      console.log('✅ WEBHOOK VERIFICADO COM SUCESSO');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Mount API Router
app.use('/api', apiRouter);

// --- FRONTEND ROUTES ---
const distPath = path.join(__dirname, '../dist');

if (!fs.existsSync(distPath)) {
  console.error("❌ ERRO: A pasta 'dist' não foi encontrada. Rode 'npm run build'.");
}

app.use('/painel', express.static(distPath));

app.get('/painel/*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send("Aplicação Frontend não encontrada.");
  }
});

app.get('/', (req, res) => {
  res.redirect('/painel');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Flow Micro SaaS rodando em: http://localhost:${PORT}/painel`);
});
