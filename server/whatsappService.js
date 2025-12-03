import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const wppconnect = require('@wppconnect-team/wppconnect');

// Estado global
let client = null;
let qrCodeData = null;
let status = 'close'; // 'open', 'connecting', 'close'
let messageHandler = null;

// Helper para verificar status
export function isConnected() {
  return status === 'open' && client !== null;
}

// Iniciar WPPConnect
export async function startWhatsApp() {
  status = 'connecting';
  
  try {
    wppconnect.create({
      session: 'flow_session',
      catchQR: (base64Qr, asciiQR) => {
        console.log('📷 QR Code gerado pelo WPPConnect');
        qrCodeData = base64Qr; 
        status = 'connecting';
      },
      statusFind: (statusSession, session) => {
        console.log(`📡 Status Sessão: ${statusSession}`);
        
        if (statusSession === 'isLogged' || statusSession === 'inChat') {
          status = 'open';
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
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
      autoClose: 0, 
      disableWelcome: true,
      updatesLog: false,
    })
    .then((wppClient) => {
      client = wppClient;
      status = 'open';
      console.log('✅ WPPConnect Iniciado e Conectado!');

      // Listener de Mensagens
      client.onMessage((message) => {
        if (!messageHandler || message.isGroupMsg) return;

        // Extrair dados úteis da mensagem
        const remoteJid = message.from;
        let textBody = message.body;
        let selectedId = null;

        // Tratamento para Listas
        if (message.type === 'list_response') {
            selectedId = message.selectedRowId;
            textBody = message.listResponse?.title || message.body;
        }
        // Fallback para botões antigos
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
      status = 'close';
      // Tentar reconectar após delay se falhar no inicio
      setTimeout(startWhatsApp, 10000);
    });

  } catch (e) {
    console.error("Erro fatal WPP:", e);
  }
}

export function setMessageHandler(handler) {
  messageHandler = handler;
}

export function getStatusData() {
  return {
    status: status,
    qrCode: qrCodeData
  };
}

export async function logout() {
  try {
    if (client) {
      await client.logout();
      client = null;
    }
    status = 'close';
    qrCodeData = null;
    setTimeout(startWhatsApp, 3000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- ENVIO DE MENSAGENS ---

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
    // Verifica se é Data URI (Base64 do PC) ou URL
    if (content && content.startsWith('data:')) {
        // WPPConnect sendFile lida com Data URI se passado corretamente como 'content'
        await client.sendFile(id, content, 'imagem.jpg', caption);
    } else {
        await client.sendFile(id, content, 'imagem.jpg', caption);
    }
    console.log(`[WPP] Imagem enviada para ${to}`);
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
    // sendPtt envia como nota de voz (microfone)
    // Suporta URL ou Base64 Data URI
    await client.sendPtt(id, content);
    console.log(`[WPP] Áudio enviado para ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Erro WPP Audio:', error);
    return { success: false };
  }
}

export async function sendListMessage(to, text, buttonText, sections) {
    if (!client) return { success: false };
    const id = to.includes('@') ? to : `${to}@c.us`;

    // Formato Nativo RIGOROSO para Lista (Menu)
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
        console.error("Erro crítico ao enviar lista nativa:", e);
        
        // Fallback Texto Formatado
        const fallbackText = `*${text}*\n\n${sections.map((s, i) => `*${i + 1}.* ${s.label}`).join('\n')}\n\n_Digite o número da opção._`;
        await client.sendText(id, fallbackText);
        return { success: true };
    }
}