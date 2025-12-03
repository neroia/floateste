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
  sendAudioMessage,
  isConnected 
} from './whatsappService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(cors());
// Aumentado o limite para aceitar imagens Base64 grandes no upload do fluxo
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

const cleanVarName = (name) => {
    if (!name) return '';
    // Remove @, {{, }}, e espaços extras, deixa minúsculo
    return name.replace(/[@\{\}]/g, '').trim(); 
};

const replaceVariables = (text, variables) => {
  if (!text) return '';
  return text.replace(/\{\{([\w\s]+)\}\}/g, (_, key) => {
      const cleanKey = cleanVarName(key);
      return String(variables[cleanKey] || '');
  });
};

const getNextNode = (currentNodeId, sourceHandle = null) => {
  const edges = activeFlow.edges;
  if (sourceHandle) {
    // Procura edge exato (True/False ou Opção específica)
    const edge = edges.find(e => e.source === currentNodeId && e.sourceHandle === sourceHandle);
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  } else {
    // Tenta achar conexão padrão (default) ou qualquer uma se não tiver handle específico
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
              const varKey = cleanVarName(currentNode.data.variable);
              session.variables[varKey] = matchedOption.label;
          }
          
          // Segue caminho específico da opção
          const next = getNextNode(currentNode.id, matchedOption.id);
          if (next) await executeNode(next, cleanPhone);
          else finishSession(cleanPhone);
          
      } else {
          // Opção Inválida - Reenvia o menu
          await sendTextMessage(userPhone, "⚠️ Opção inválida. Por favor, selecione uma opção da lista.");
          // Mantém no mesmo nó, não avança
          // Opcional: Reenviar o menu
          await executeNode(currentNode, cleanPhone); 
      }
  } 
  
  // B. Resposta de Texto Livre (Input)
  else if (currentNode.type === 'input') {
      console.log(`[Flow] Input de texto recebido.`);
      
      if (currentNode.data.variable && userInput) {
          const varKey = cleanVarName(currentNode.data.variable);
          session.variables[varKey] = userInput;
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
        const varName = cleanVarName(node.data.variable);
        const checkVal = node.data.conditionValue;
        const actualVal = session.variables[varName];
        
        const normActual = normalizeStr(actualVal);
        const normCheck = normalizeStr(checkVal);
        
        // Comparação robusta (string vs string)
        const isTrue = normActual === normCheck;
        
        console.log(`[Flow Debug] IF '${varName}' ('${normActual}') == '${normCheck}' ? ${isTrue ? 'VERDADEIRO' : 'FALSO'}`);
        
        const nextCondition = getNextNode(node.id, isTrue ? 'true' : 'false');
        
        if (nextCondition) {
            await executeNode(nextCondition, userPhone);
        } else {
            console.log(`[Flow] Condição sem caminho definido (${isTrue ? 'true' : 'false'}). Encerrando.`);
            finishSession(userPhone);
        }
        return;
    }

    if (node.type === 'set_variable') {
        if (node.data.variable && node.data.value) {
           const val = replaceVariables(node.data.value, session.variables);
           const varKey = cleanVarName(node.data.variable);
           session.variables[varKey] = val;
           console.log(`[Flow Debug] SET ${varKey} = '${val}'`);
        }
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'api_request') {
        try {
            const url = replaceVariables(node.data.apiUrl, session.variables);
            const method = node.data.apiMethod || 'GET';
            let headers = {};
            let body = undefined;

            if (node.data.apiHeaders) {
                 try { headers = JSON.parse(replaceVariables(node.data.apiHeaders, session.variables)); } catch(e) {}
            }
            if (node.data.apiBody && method !== 'GET') {
                 body = replaceVariables(node.data.apiBody, session.variables);
            }

            const res = await fetch(url, { 
                method, 
                headers: { 'Content-Type': 'application/json', ...headers }, 
                body 
            });
            const json = await res.json();
            
            if (node.data.variable) {
                const varKey = cleanVarName(node.data.variable);
                session.variables[varKey] = JSON.stringify(json);
                console.log(`[Flow Debug] API Sucesso. Salvo em ${varKey}`);
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
                
                const result = await model.generateContent({
                     contents: [{ role: 'user', parts: [{ text: prompt }] }],
                     systemInstruction: node.data.systemInstruction ? { parts: [{ text: node.data.systemInstruction }] } : undefined
                });
                
                const response = result.response.text();
                if (node.data.variable) {
                    const varKey = cleanVarName(node.data.variable);
                    session.variables[varKey] = response;
                }
            }
        } catch(e) { console.error("Erro AI", e); }
        await continueFlow(node, userPhone);
        return;
    }

    // === NÓS DE MÍDIA ===
    
    if (node.type === 'image') {
        await delay(500);
        await sendImageMessage(userPhone, node.data.content);
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'audio') {
        await delay(500);
        await sendAudioMessage(userPhone, node.data.content);
        await continueFlow(node, userPhone);
        return;
    }

    // === NÓS DE INTERAÇÃO (Enviam mensagem e PAUSAM esperando usuário) ===

    if (node.type === 'message') {
        await delay(800);
        const text = replaceVariables(node.data.content, session.variables);
        await sendTextMessage(userPhone, text);
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'interactive') {
        await delay(800);
        const text = replaceVariables(node.data.content, session.variables);
        await sendListMessage(userPhone, text, "Ver Opções", node.data.options || []);
        console.log(`[Flow] Aguardando escolha em menu...`);
        return; 
    }

    if (node.type === 'input') {
        await delay(800);
        const text = replaceVariables(node.data.content, session.variables);
        await sendTextMessage(userPhone, text);
        console.log(`[Flow] Aguardando input de texto...`);
        return;
    }
    
    if (node.type === 'delay') {
        const seconds = node.data.duration || 1;
        await delay(seconds * 1000);
        await continueFlow(node, userPhone);
        return;
    }
    
    // Default fallback
    await continueFlow(node, userPhone);

  } catch (err) {
    console.error(`[Flow Error] Nó ${node.id}:`, err);
    await continueFlow(node, userPhone);
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
} else {
    console.warn("⚠️ Pasta 'dist' não encontrada. Execute 'npm run build' antes.");
}

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Rodando em http://localhost:${PORT}/painel`);
});