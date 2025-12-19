
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch'; 
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { 
  startWhatsApp, 
  setMessageHandler, 
  getStatusData, 
  logout,
  restartWhatsApp,
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
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- TRATAMENTO GLOBAL DE ERROS ---
process.on('uncaughtException', (err) => {
    const msg = `[FATAL ERROR] Exceção não tratada: ${err.message}`;
    console.error(msg);
});

process.on('unhandledRejection', (reason, promise) => {
    const msg = `[FATAL ERROR] Rejeição não tratada: ${reason}`;
    console.error(msg);
});

// --- INICIALIZAÇÃO ---
startWhatsApp(); 

// --- ESTADO & ESTATÍSTICAS ---
let activeFlow = {
  isRunning: false,
  nodes: [],
  edges: [],
  config: {} 
};

let userSessions = {};

let systemStats = {
  startTime: null,
  messagesProcessed: 0,
  logs: []
};

const logSystem = (msg) => {
  const time = new Date().toLocaleTimeString();
  const logLine = `[${time}] ${msg}`;
  console.log(logLine);
  
  systemStats.logs.unshift(logLine);
  if (systemStats.logs.length > 50) systemStats.logs.pop();
};

// --- CONFIGURAÇÃO DE DIRETÓRIOS ---
const APPDATA_PATH = process.env.APPDATA_PATH;
const BASE_DATA_DIR = APPDATA_PATH ? path.join(APPDATA_PATH, 'whaleflow_data') : path.join(__dirname, '..');
const DB_FOLDER = path.join(BASE_DATA_DIR, 'database');
const SESSIONS_FILE = path.join(DB_FOLDER, 'active_sessions.json');

if (!fs.existsSync(DB_FOLDER)) {
  fs.mkdirSync(DB_FOLDER, { recursive: true });
}

// --- PERSISTÊNCIA DE SESSÃO ---
const loadSessions = () => {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
      userSessions = JSON.parse(data);
    }
  } catch (e) {
    userSessions = {};
  }
};

const saveSessions = () => {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(userSessions, null, 2));
  } catch (e) {}
};

loadSessions();

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
    const edge = edges.find(e => e.source === currentNodeId && e.sourceHandle === sourceHandle);
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  } else {
    const edge = edges.find(e => e.source === currentNodeId && (e.sourceHandle === 'default' || !e.sourceHandle));
    return edge ? activeFlow.nodes.find(n => n.id === edge.target) : null;
  }
};

// --- ENGINE PRINCIPAL ---
const processFlowStep = async (userPhone, userInput = null, selectedId = null) => {
  if (!activeFlow.isRunning) return;
  if (!isConnected()) return;

  const cleanPhone = cleanPhoneNumber(userPhone);
  
  if (userSessions[cleanPhone]?.isPaused) return;

  const startNode = activeFlow.nodes.find(n => n.type === 'start');

  if (!userSessions[cleanPhone]) {
    if (!startNode) return;
    
    const triggerType = startNode.data.triggerType || 'all';
    const rawKeywords = startNode.data.triggerKeywords || '';
    const keywords = rawKeywords.split(',').map(k => normalizeStr(k)).filter(k => k.length > 0);
    const normalizedInput = normalizeStr(userInput);

    let shouldTrigger = false;
    if (triggerType === 'all') shouldTrigger = true;
    else if (triggerType === 'keyword_exact') shouldTrigger = keywords.some(k => normalizedInput === k);
    else if (triggerType === 'keyword_contains') shouldTrigger = keywords.some(k => normalizedInput.includes(k));

    if (!shouldTrigger) return;
    
    userSessions[cleanPhone] = {
      currentNodeId: startNode.id,
      variables: { phone: cleanPhone, name: 'Usuário' }, 
      isPaused: false,
      lastInteraction: Date.now()
    };
    
    saveSessions(); 
    logSystem(`[WhaleFlow] 🟢 Iniciando fluxo para ${cleanPhone}`);
    
    const nextNode = getNextNode(startNode.id);
    if (nextNode) await executeNode(nextNode, cleanPhone);
    return;
  }

  const session = userSessions[cleanPhone];
  session.lastInteraction = Date.now();
  const currentNode = activeFlow.nodes.find(n => n.id === session.currentNodeId);

  if (!currentNode) {
    delete userSessions[cleanPhone];
    saveSessions();
    processFlowStep(userPhone, userInput, selectedId);
    return;
  }

  if (currentNode.type === 'interactive') {
      const options = currentNode.data.options || [];
      let matchedOption = null;
      if (selectedId) matchedOption = options.find(o => o.id === selectedId);
      
      if (!matchedOption && userInput) {
          const normalInput = normalizeStr(userInput);
          matchedOption = options.find(o => normalizeStr(o.label) === normalInput);
          if (!matchedOption && !isNaN(parseInt(normalInput))) {
              const index = parseInt(normalInput) - 1;
              if (index >= 0 && index < options.length) matchedOption = options[index];
          }
      }

      if (matchedOption) {
          if (currentNode.data.variable) {
              const varKey = cleanVarName(currentNode.data.variable);
              session.variables[varKey] = matchedOption.label;
          }
          const next = getNextNode(currentNode.id, matchedOption.id);
          if (next) await executeNode(next, cleanPhone);
          else finishSession(cleanPhone);
      } else {
          await sendTextMessage(userPhone, "⚠️ Opção inválida. Selecione uma opção da lista.");
          await executeNode(currentNode, cleanPhone); 
      }
  } 
  else if (currentNode.type === 'input') {
      if (currentNode.data.variable && userInput) {
          const varKey = cleanVarName(currentNode.data.variable);
          session.variables[varKey] = userInput;
      }
      const next = getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
      else finishSession(cleanPhone);
  }
  else {
      const next = getNextNode(currentNode.id);
      if (next) await executeNode(next, cleanPhone);
  }
};

const finishSession = (userPhone) => {
  delete userSessions[userPhone];
  saveSessions();
};

const executeNode = async (node, userPhone) => {
  if (!isConnected()) return;
  const session = userSessions[userPhone];
  if (!session) return;
  
  session.currentNodeId = node.id;
  saveSessions();
  
  try {
    if (node.type === 'jump') {
        if (node.data.jumpNodeId) {
            const targetNode = activeFlow.nodes.find(n => n.id === node.data.jumpNodeId);
            if (targetNode) await executeNode(targetNode, userPhone);
        }
        return; 
    }

    if (node.type === 'webhook') {
        try {
            const url = replaceVariables(node.data.webhookUrl, session.variables);
            const method = node.data.webhookMethod || 'POST';
            logSystem(`[WhaleFlow] Disparando Webhook para: ${url}`);
            
            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'POST' ? JSON.stringify(session.variables) : undefined
            });
            logSystem(`[WhaleFlow] Webhook disparado com sucesso.`);
        } catch (e) {
            logSystem(`[WhaleFlow Error] Falha no Webhook: ${e.message}`);
        }
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'condition') {
        const varName = cleanVarName(node.data.variable);
        const checkVal = node.data.conditionValue;
        const actualVal = session.variables[varName];
        const isTrue = normalizeStr(actualVal) === normalizeStr(checkVal);
        const nextCondition = getNextNode(node.id, isTrue ? 'true' : 'false');
        if (nextCondition) await executeNode(nextCondition, userPhone);
        else finishSession(userPhone);
        return;
    }

    if (node.type === 'set_variable') {
        if (node.data.variable && node.data.value) {
           const val = replaceVariables(node.data.value, session.variables);
           const varKey = cleanVarName(node.data.variable);
           session.variables[varKey] = val;
        }
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'code') {
        try {
            const userCode = node.data.content || '';
            const runCode = new Function('variables', userCode);
            const resultVars = runCode({ ...session.variables });
            if (resultVars && typeof resultVars === 'object') session.variables = { ...session.variables, ...resultVars };
        } catch (e) {}
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'api_request') {
        try {
            const url = replaceVariables(node.data.apiUrl, session.variables);
            const method = node.data.apiMethod || 'GET';
            let headers = {};
            let body = undefined;
            if (node.data.apiHeaders) try { headers = JSON.parse(replaceVariables(node.data.apiHeaders, session.variables)); } catch(e) {}
            if (node.data.apiBody && method !== 'GET') body = replaceVariables(node.data.apiBody, session.variables);

            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body });
            const json = await res.json();
            if (node.data.variable) session.variables[cleanVarName(node.data.variable)] = JSON.stringify(json);
        } catch(e) {}
        await continueFlow(node, userPhone);
        return;
    }
    
    if (node.type === 'ai_gemini') {
        try {
            const apiKey = activeFlow.config.geminiApiKey;
            if (apiKey) {
                const prompt = replaceVariables(node.data.content, session.variables);
                const ai = new GoogleGenAI({ apiKey });
                const model = ai.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: prompt,
                  config: { systemInstruction: node.data.systemInstruction }
                });
                const response = await model;
                const responseText = response.text;
                if (node.data.variable) session.variables[cleanVarName(node.data.variable)] = responseText;
            }
        } catch(e) {}
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'message') {
        await delay(800);
        await sendTextMessage(userPhone, replaceVariables(node.data.content, session.variables));
        await continueFlow(node, userPhone);
        return;
    }

    if (node.type === 'interactive') {
        await delay(800);
        await sendListMessage(userPhone, replaceVariables(node.data.content, session.variables), "Opções", node.data.options || []);
        return; 
    }

    if (node.type === 'input') {
        await delay(800);
        await sendTextMessage(userPhone, replaceVariables(node.data.content, session.variables));
        return;
    }
    
    if (node.type === 'delay') {
        await delay((node.data.duration || 1) * 1000);
        await continueFlow(node, userPhone);
        return;
    }
    
    await continueFlow(node, userPhone);

  } catch (err) {
    await continueFlow(node, userPhone);
  }
};

const continueFlow = async (node, userPhone) => {
  const next = getNextNode(node.id);
  if (next) await executeNode(next, userPhone);
  else finishSession(userPhone);
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

setMessageHandler((msg) => {
  if (!isConnected() || !activeFlow.isRunning) return;
  const remoteJid = msg.key.remoteJid;
  const userText = msg.message?.conversation;
  const selectedId = msg.selectedId;
  if (userText || selectedId) {
    systemStats.messagesProcessed++;
    processFlowStep(remoteJid, userText, selectedId);
  }
});

const apiRouter = express.Router();
apiRouter.get('/whatsapp/status', (req, res) => res.json(getStatusData()));
apiRouter.post('/whatsapp/logout', async (req, res) => res.json(await logout()));
apiRouter.post('/whatsapp/restart', async (req, res) => res.json(await restartWhatsApp()));
apiRouter.get('/stats', (req, res) => res.json({ ...systemStats, activeSessions: Object.keys(userSessions).length }));
apiRouter.post('/start', (req, res) => {
  const { flowData, ...config } = req.body;
  activeFlow = { isRunning: true, nodes: flowData.nodes, edges: flowData.edges, config };
  if (!systemStats.startTime) systemStats.startTime = Date.now();
  res.json({ success: true });
});
apiRouter.post('/stop', (req, res) => {
  activeFlow.isRunning = false;
  res.json({ success: true });
});
app.use('/api', apiRouter);

const server = app.listen(PORT, () => console.log(`🚀 WhaleFlow Rodando em http://localhost:${PORT}`));
const gracefulShutdown = () => { server.close(() => process.exit(0)); };
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
