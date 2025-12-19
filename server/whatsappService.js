import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);

// Estado global
let client = null;
let qrCodeData = null;
let status = 'close'; 
let statusMessage = "Desconectado";
let messageHandler = null;
let initAttemptCount = 0;
let wppconnect = null;

// DIAGNÓSTICO PRÉVIO DE DEPENDÊNCIAS
try {
  // Teste isolado do Sharp (Frequentemente falha no Windows se não compilado corretamente)
  require('sharp');
} catch (e) {
  console.error("[FATAL] Erro ao carregar Sharp:", e.message);
  status = 'error_dependency';
  statusMessage = "Erro de DLL/Sharp. Instale o 'Visual C++ Redistributable' ou recompile.";
}

// Se o Sharp passou (ou se tentamos continuar mesmo assim), carregamos o WPPConnect
if (status !== 'error_dependency') {
  try {
    wppconnect = require('@wppconnect-team/wppconnect');
  } catch (e) {
    console.error("[FATAL ERROR] Falha ao carregar @wppconnect-team/wppconnect");
    console.error(e);
    status = 'error_dependency';
    statusMessage = `Erro Modulo Nativo (WPP): ${e.message}`; 
  }
}

// CONFIGURAÇÃO DE CAMINHO SEGURO
const APPDATA_PATH = process.env.APPDATA_PATH;

const SESSION_PATH = APPDATA_PATH ? path.join(APPDATA_PATH, 'flow_session') : 'flow_session';
const CHROME_DATA_PATH = APPDATA_PATH ? path.join(APPDATA_PATH, 'wpp_chrome_data') : 'wpp_chrome_data';

export function isConnected() {
  return status === 'open' && client !== null;
}

export async function restartWhatsApp() {
    console.log("[WPP] Solicitado reinício forçado...");
    statusMessage = "Reiniciando serviço...";
    if (client) {
        try { await client.close(); } catch(e) {}
        client = null;
    }
    status = 'close';
    qrCodeData = null;
    setTimeout(startWhatsApp, 2000);
    return { success: true };
}

export async function startWhatsApp() {
  // Bloqueio se já identificamos erro de dependência no boot
  if (status === 'error_dependency') {
      console.error("[WhaleFlow] Abortando startWhatsApp devido a erro de dependência prévio.");
      return;
  }

  if (!wppconnect) {
      console.error("[WhaleFlow] WPPConnect não disponível.");
      status = 'error_dependency';
      statusMessage = "Erro Crítico: Biblioteca WPPConnect não carregada.";
      return;
  }

  if (status === 'initializing_browser' || status === 'open') return;

  status = 'initializing_browser';
  statusMessage = "Iniciando motor do WhatsApp (Pode demorar na 1ª vez)...";
  qrCodeData = null;
  initAttemptCount++;
  
  console.log(`[WPP] Iniciando sessão (Tentativa ${initAttemptCount})`);

  // Timeout removido para permitir download do Chrome/QR Code sem interrupção
  
  try {
    wppconnect.create({
      session: 'default',
      folderNameToken: SESSION_PATH,
      puppeteerOptions: {
        userDataDir: CHROME_DATA_PATH,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',    
            '--disable-extensions'
        ]
      },
      catchQR: (base64Qr, asciiQR) => {
        console.log('📷 QR Code gerado');
        qrCodeData = base64Qr; 
        status = 'qr_pending';
        statusMessage = "QR Code gerado. Aguardando leitura.";
      },
      statusFind: (statusSession, session) => {
        console.log(`📡 Status Sessão: ${statusSession}`);
        
        if (statusSession === 'browserClose') statusMessage = "Navegador fechou. Reiniciando...";
        else if (statusSession === 'qrReadFail') statusMessage = "Falha ao ler QR Code.";
        else if (statusSession === 'autocloseCalled') statusMessage = "Sessão fechada automaticamente.";
        else if (statusSession === 'isLogged') statusMessage = "Autenticado!";
        else statusMessage = `Estado: ${statusSession}`;

        if (statusSession === 'isLogged' || statusSession === 'inChat') {
          status = 'open';
          statusMessage = "Conectado e Pronto.";
          qrCodeData = null;
        }
        
        if (statusSession === 'browserClose' || statusSession === 'qrReadFail' || statusSession === 'autocloseCalled') {
          status = 'close';
          client = null;
        }
      },
      headless: true, 
      devtools: false,
      useChrome: true,
      debug: false,
      logQR: false,
      autoClose: 0, 
      disableWelcome: true,
      updatesLog: false,
      browserArgs: ['--no-sandbox'] 
    })
    .then((wppClient) => {
      client = wppClient;
      status = 'open';
      statusMessage = "Conectado.";
      qrCodeData = null;
      console.log('✅ WPPConnect Iniciado e Conectado!');

      client.onMessage((message) => {
        if (!messageHandler || message.isGroupMsg) return;

        const remoteJid = message.from;
        let textBody = message.body;
        let selectedId = null;

        if (message.type === 'list_response') {
            selectedId = message.selectedRowId;
            textBody = message.listResponse?.title || message.body;
        }
        else if (message.type === 'buttons_response') {
            selectedId = message.selectedButtonId || message.selectedBtnId;
        } 

        const normalizedMsg = {
            key: { remoteJid: remoteJid, fromMe: message.fromMe },
            message: { conversation: textBody },
            selectedId: selectedId
        };
        
        messageHandler(normalizedMsg);
      });
    })
    .catch((error) => {
      console.log("Erro ao iniciar WPPConnect:", error);
      status = 'error_start';
      statusMessage = "Falha ao iniciar motor: " + error.message;
      setTimeout(() => {
          if (status === 'error_start') startWhatsApp();
      }, 15000);
    });

  } catch (e) {
    console.error("Erro fatal WPP:", e);
    status = 'error_fatal';
    statusMessage = "Erro Crítico: " + e.message;
  }
}

export function setMessageHandler(handler) {
  messageHandler = handler;
}

export function getStatusData() {
  return {
    status: status,
    qrCode: qrCodeData,
    message: statusMessage
  };
}

export async function logout() {
  try {
    if (client) {
      await client.logout();
      client = null;
    }
    status = 'close';
    statusMessage = "Desconectado.";
    qrCodeData = null;
    setTimeout(startWhatsApp, 3000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function sendTextMessage(to, text) {
  if (!client) return { success: false, error: 'WhatsApp desconectado' };
  const id = to.includes('@') ? to : `${to}@c.us`;

  try {
    await client.sendText(id, text);
    return { success: true };
  } catch (error) {
    console.error('Erro WPP Text:', error);
    return { success: false, error: error.message };
  }
}

export async function sendImageMessage(to, content, caption = '') {
  if (!client) return { success: false };
  const id = to.includes('@') ? to : `${to}@c.us`;
  
  try {
    if (content && content.startsWith('data:')) {
        await client.sendFile(id, content, 'imagem.jpg', caption);
    } else {
        await client.sendFile(id, content, 'imagem.jpg', caption);
    }
    return { success: true };
  } catch (error) {
    console.error('Erro WPP Image:', error);
    return { success: false };
  }
}

export async function sendAudioMessage(to, content) {
  if (!client) return { success: false };
  const id = to.includes('@') ? to : `${to}@c.us`;
  
  try {
    await client.sendPtt(id, content);
    return { success: true };
  } catch (error) {
    console.error('Erro WPP Audio:', error);
    return { success: false };
  }
}

export async function sendListMessage(to, text, buttonText, sections) {
    if (!client) return { success: false };
    const id = to.includes('@') ? to : `${to}@c.us`;

    const listData = [
        {
            title: 'Opções', 
            rows: sections.map(s => ({
                rowId: s.id,
                title: s.label,
                description: s.description || '' 
            }))
        }
    ];

    try {
        await client.sendListMessage(id, {
            buttonText: buttonText || 'Abrir Menu',
            description: text,
            title: 'Menu', 
            footer: 'Selecione uma opção', 
            sections: listData
        });
        return { success: true };
    } catch (e) {
        console.error("Erro lista:", e);
        const fallbackText = `*${text}*\n\n${sections.map((s, i) => `*${i + 1}.* ${s.label}`).join('\n')}\n\n_Digite o número da opção._`;
        await client.sendText(id, fallbackText);
        return { success: true };
    }
}