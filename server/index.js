import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch'; 
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { 
  startWhatsApp, 
  setMessageHandler, 
  getStatusData, 
  logout,
  sendTextMessage, 
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

// --- INICIALIZAÇÃO ---
startWhatsApp(); 

// --- ESTADO ---
let activeFlow = {
  isRunning: false,
  nodes: [],
  edges: [],
  config: {} 
};

let userSessions = {};

// --- UTILS ---
const cleanPhoneNumber = (jid) => {
  if (!jid) return '';
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '').split(':')[0];
};

const normalizeStr = (str) => {
    return String(str || '').trim().toLowerCase();
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
    // Tenta achar conexão padrão (default) ou qualquer uma se não tiver handle
    const edge = edges.find(e => e.source === currentNodeId && (e.sourceHandle === 'default' || !e.sourceHandle));
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  }
};

// --- ENGINE PRINCIPAL ---
const processFlowStep = async (userPhone, userInput = null, selectedId = null) => {
  if (!activeFlow.isRunning) return;
  if (!isConnected()) {
    console.log('[Flow] Ignorando: WhatsApp Offline.');
    return;
  }

  const cleanPhone = cleanPhoneNumber(userPhone);
  const startNode = activeFlow.nodes.find(n => n.type === 'start');

  // === 1. NOVA SESSÃO ===
  if (!userSessions[cleanPhone]) {
    if (!startNode) return;
    
    // Gatilhos
    if (startNode.data.triggerType === 'keyword_exact' && startNode.data.triggerKeywords) {
       if (normalizeStr(userInput) !== normalizeStr(startNode.data.triggerKeywords)) return;
    }
    if (startNode.data.triggerType === 'keyword_contains' && startNode.data.triggerKeywords) {
       if (!normalizeStr(userInput).includes(normalizeStr(startNode.data.triggerKeywords))) return;
    }
    
    userSessions[cleanPhone] = {
      currentNodeId: startNode.id,
      variables: { phone: cleanPhone, name: 'Usuário' } // Inicia variáveis padrão
    };
    
    console.log(`[Flow] 🟢 Iniciando fluxo para ${cleanPhone}`);
    
    const nextNode = getNextNode(startNode.id);
    if (nextNode) await executeNode(nextNode, cleanPhone);
    return;
  }

  // === 2. SESSÃO EXISTENTE ===
  const session = userSessions[cleanPhone];
  const currentNode = activeFlow.nodes.find(n => n.id === session.currentNodeId);

  if (!currentNode) {
    console.log(`[Flow] Nó atual perdido. Reiniciando sessão.`);
    delete userSessions[cleanPhone];
    processFlowStep(userPhone, userInput, selectedId);
    return;
  }

  // --- Processamento de Respostas (Input/Interactive) ---
  
  // A. Resposta de MENU (Lista)
  if (currentNode.type === 'interactive') {
      console.log(`[Flow] Processando resposta interativa. Input: "${userInput}", ID: "${selectedId}"`);
      
      const options = currentNode.data.options || [];
      let matchedOption = null;

      // 1. Tenta pelo ID exato
      if (selectedId) {
          matchedOption = options.find(o => o.id === selectedId);
      }
      
      // 2. Tenta pelo Texto digitado (Smart Match)
      if (!matchedOption && userInput) {
          const normalInput = normalizeStr(userInput);
          matchedOption = options.find(o => normalizeStr(o.label) === normalInput);
          
          // 3. Tenta pelo Índice (ex: digitou "1" para primeira opção)
          if (!matchedOption && !isNaN(parseInt(normalInput))) {
              const index = parseInt(normalInput) - 1;
              if (index >= 0 && index < options.length) {
                  matchedOption = options[index];
              }
          }
      }

      if (matchedOption) {
          console.log(`[Flow] Opção válida identificada: ${matchedOption.label} (${matchedOption.id})`);
          
          // Salva variável se configurado
          if (currentNode.data.variable) {
              session.variables[currentNode.data.variable] = matchedOption.label;
          }
          
          // Segue caminho específico da opção
          const next = getNextNode(currentNode.id, matchedOption.id);
          if (next) await executeNode(next, cleanPhone);
          else finishSession(cleanPhone);
          
      } else {
          // Opção Inválida
          await sendTextMessage(userPhone, "⚠️ Opção inválida. Por favor, selecione uma opção do menu ou digite o número correspondente.");
      }
  } 
  
  // B. Resposta de Texto Livre (Input)
  else if (currentNode.type === 'input') {
      console.log(`[Flow] Input de texto recebido.`);
      
      if (currentNode.data.variable && userInput) {
          session.variables[currentNode.data.variable] = userInput;
      }
      
      const next = getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
      else finishSession(cleanPhone);
  }
  
  // C. Mensagem Inesperada
  else {
      // Se não é input nem interactive, o bot não deveria estar parado aqui.
      console.log(`[Flow] Estado inconsistente. Nó tipo ${currentNode.type} não aguarda input.`);
      const next = getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
  }
};

const finishSession = (userPhone) => {
  console.log(`[Flow] 🏁 Fim do fluxo para ${userPhone}`);
  delete userSessions[userPhone];
};

// --- EXECUTOR DE NÓS ---
const executeNode = async (node, userPhone) => {
  if (!isConnected()) return;
  const session = userSessions[userPhone];
  if (!session) return;
  
  session.currentNodeId = node.id;
  
  try {
    // === NÓS DE LÓGICA (Executam e passam pro próximo imediatamente) ===
    
    if (node.type === 'condition') {
        const varName = node.data.variable;
        const checkVal = node.data.conditionValue;
        const actualVal = session.variables[varName];
        
        const normActual = normalizeStr(actualVal);
        const normCheck = normalizeStr(checkVal);
        
        const isTrue = normActual === normCheck;
        
        console.log(`[Flow Debug] IF '${varName}' ('${normActual}') == '${normCheck}' ? ${isTrue ? 'VERDADEIRO' : 'FALSO'}`);
        
        const nextCondition = getNextNode(node.id, isTrue ? 'true' : 'false');
        if (nextCondition) await executeNode(nextCondition, userPhone);
        else finishSession(userPhone);
        return;
    }

    if (node.type === 'set_variable') {
        if (node.data.variable && node.data.value) {
           const val = replaceVariables(node.data.value, session.variables);
           session.variables[node.data.variable] = val;
           console.log(`[Flow Debug] SET ${node.data.variable} = '${val}'`);
        }
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'api_request') {
        try {
            const url = replaceVariables(node.data.apiUrl, session.variables);
            const method = node.data.apiMethod || 'GET';
            // ... lógica de API (mantida) ...
            const res = await fetch(url, { method });
            const json = await res.json();
            if (node.data.variable) {
                session.variables[node.data.variable] = JSON.stringify(json);
                console.log(`[Flow Debug] API Sucesso. Salvo em ${node.data.variable}`);
            }
        } catch(e) { console.error("Erro API", e); }
        await continueFlow(node, userPhone);
        return;
    }
    
    if (node.type === 'ai_gemini') {
        try {
            const apiKey = activeFlow.config.geminiApiKey;
            if (apiKey) {
                const prompt = replaceVariables(node.data.content, session.variables);
                const ai = new GoogleGenAI({ apiKey });
                const model = ai.getGenerativeModel({ model: "gemini-2.5-flash"});
                const result = await model.generateContent(prompt);
                const response = result.response.text();
                if (node.data.variable) session.variables[node.data.variable] = response;
            }
        } catch(e) { console.error("Erro AI", e); }
        await continueFlow(node, userPhone);
        return;
    }

    // === NÓS DE INTERAÇÃO (Enviam mensagem e PAUSAM esperando usuário) ===

    if (node.type === 'message') {
        await delay(1000);
        const text = replaceVariables(node.data.content, session.variables);
        await sendTextMessage(userPhone, text);
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'interactive') {
        await delay(800);
        const text = replaceVariables(node.data.content, session.variables);
        // SEMPRE envia como LISTA, pois botões foram removidos.
        await sendListMessage(userPhone, text, "Ver Opções", node.data.options || []);
        console.log(`[Flow] Aguardando escolha em ${node.data.label}`);
        return; 
    }

    if (node.type === 'input') {
        await delay(800);
        const text = replaceVariables(node.data.content, session.variables);
        await sendTextMessage(userPhone, text);
        console.log(`[Flow] Aguardando input em ${node.data.label}`);
        return;
    }
    
    // Default fallback
    await continueFlow(node, userPhone);

  } catch (err) {
    console.error(`[Flow Error] Nó ${node.id}:`, err);
  }
};

const continueFlow = async (node, userPhone) => {
  const next = getNextNode(node.id);
  if (next) await executeNode(next, userPhone);
  else finishSession(userPhone);
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// --- HANDLER ---
setMessageHandler((msg) => {
  if (!isConnected() || !activeFlow.isRunning) return;

  const remoteJid = msg.key.remoteJid;
  const userText = msg.message?.conversation;
  const selectedId = msg.selectedId;

  if (userText || selectedId) {
    console.log(`📩 Msg de ${cleanPhoneNumber(remoteJid)}`);
    processFlowStep(remoteJid, userText, selectedId);
  }
});

// --- API ---
const apiRouter = express.Router();

apiRouter.get('/whatsapp/status', (req, res) => res.json(getStatusData()));
apiRouter.post('/whatsapp/logout', async (req, res) => res.json(await logout()));

apiRouter.post('/start', (req, res) => {
  const { flowData, ...config } = req.body;
  activeFlow.nodes = flowData.nodes || [];
  activeFlow.edges = flowData.edges || [];
  activeFlow.config = config || {};
  activeFlow.isRunning = true;
  console.log('🤖 Bot iniciado!');
  res.json({ success: true });
});

apiRouter.post('/stop', (req, res) => {
  activeFlow.isRunning = false;
  userSessions = {};
  console.log('🤖 Bot parado.');
  res.json({ success: true });
});

apiRouter.post('/send-message', async (req, res) => {
  const { to, message } = req.body;
  res.json(await sendTextMessage(to, message));
});

app.use('/api', apiRouter);

// --- STATIC ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use('/painel', express.static(distPath));
  app.get('/painel/*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.get('/', (req, res) => res.redirect('/painel'));
}

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Rodando em http://localhost:${PORT}/painel`);
});