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

        // Tratamento para Listas (Único formato interativo suportado agora)
        if (message.type === 'list_response') {
            selectedId = message.selectedRowId;
            textBody = message.listResponse?.title || message.body;
        }
        // Fallback para botões antigos caso ainda existam no whatsapp do cliente
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

export async function sendImageMessage(to, imageUrl, caption = '') {
  if (!client) return { success: false };
  const id = to.includes('@') ? to : `${to}@c.us`;
  
  try {
    // WPPConnect accepts URL or Base64 Data URI directly in the second parameter
    await client.sendImage(id, imageUrl, 'imagem', caption);
    return { success: true };
  } catch (error) {
    console.error('Erro WPP Image:', error);
    return { success: false };
  }
}

export async function sendAudioMessage(to, audioUrl) {
  if (!client) return { success: false };
  const id = to.includes('@') ? to : `${to}@c.us`;
  
  try {
    // For WPPConnect, we can use sendPtt (for audio notes) or sendVoice
    // Accepts Base64 or URL
    await client.sendPtt(id, audioUrl);
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
            title: 'Opções', // Título da seção (Obrigatório)
            rows: sections.map(s => ({
                rowId: s.id,
                title: s.label,
                description: s.description || '' // Descrição opcional da linha
            }))
        }
    ];

    try {
        await client.sendListMessage(id, {
            buttonText: buttonText || 'Abrir Menu',
            description: text,
            title: 'Menu de Opções', // Título da mensagem
            footer: 'Selecione uma opção', // Rodapé
            sections: listData
        });
        return { success: true };
    } catch (e) {
        console.error("Erro crítico ao enviar lista nativa:", e);
        
        // Fallback Texto Formatado se a lista nativa falhar
        const fallbackText = `*${text}*\n\n${sections.map((s, i) => `*${i + 1}.* ${s.label}`).join('\n')}\n\n_Digite o número da opção._`;
        await client.sendText(id, fallbackText);
        return { success: true };
    }
}