import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Estado global da conexão
let sock = null;
let qrCodeUrl = null;
let connectionStatus = 'close'; // 'open', 'connecting', 'close'
let messageHandler = null; // Função de callback para quando chegar mensagem

// Helper para verificar status externamente
export function isConnected() {
  return connectionStatus === 'open';
}

// Função para iniciar o WhatsApp
export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Mostra no terminal também para debug
    logger: pino({ level: 'silent' }), // Logs limpos
    browser: ["Flow Builder", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Converte o código QR puro em uma URL de imagem (Data URI) para o frontend
      qrCodeUrl = await QRCode.toDataURL(qr);
      connectionStatus = 'connecting';
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      connectionStatus = 'close';
      qrCodeUrl = null;
      
      console.log(`Conexão fechada. Reconectar? ${shouldReconnect}`);
      
      if (shouldReconnect) {
        // Delay de 5 segundos para evitar loop infinito rápido
        setTimeout(() => {
          startWhatsApp(); 
        }, 5000);
      } else {
        console.log('Desconectado. Delete a pasta auth_info_baileys para gerar novo QR.');
        // Opcional: limpar pasta automaticamente
        // fs.rmSync('auth_info_baileys', { recursive: true, force: true });
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Conectado!');
      connectionStatus = 'open';
      qrCodeUrl = null;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify') {
      for (const msg of messages) {
        if (!msg.key.fromMe && messageHandler) {
           messageHandler(msg);
        }
      }
    }
  });
}

// Configura quem vai processar as mensagens (o index.js)
export function setMessageHandler(handler) {
  messageHandler = handler;
}

// Retorna status e QR para o frontend
export function getStatusData() {
  return {
    status: connectionStatus,
    qrCode: qrCodeUrl
  };
}

// Forçar desconexão
export async function logout() {
  try {
    if (sock) {
      await sock.logout();
      sock = null;
      connectionStatus = 'close';
      qrCodeUrl = null;
      // Opcional: Apagar a pasta auth_info_baileys para limpar sessão
      try {
        fs.rmSync('auth_info_baileys', { recursive: true, force: true });
      } catch (err) {
        console.error("Erro ao limpar pasta auth", err);
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- FUNÇÕES DE ENVIO ---

export async function sendTextMessage(to, text) {
  if (!sock) return { success: false, error: 'WhatsApp desconectado' };
  
  // Baileys usa formato JID (ex: 551199999999@s.whatsapp.net)
  const id = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;

  try {
    await sock.sendMessage(id, { text: text });
    return { success: true };
  } catch (error) {
    console.error('Erro envio texto:', error);
    return { success: false, error: error.message };
  }
}

export async function sendImageMessage(to, imageUrl, caption = '') {
  if (!sock) return { success: false };
  const id = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
  
  try {
    await sock.sendMessage(id, { 
      image: { url: imageUrl }, 
      caption: caption 
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function sendButtonMessage(to, text, buttons) {
  if (!sock) return { success: false };
  const id = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
  
  const buttonsPayload = buttons.map((b, idx) => ({
    buttonId: b.id || `id-${idx}`, 
    buttonText: { displayText: b.label }, 
    type: 1 
  }));

  try {
    await sock.sendMessage(id, {
      text: text,
      footer: 'Flow Bot',
      buttons: buttonsPayload,
      headerType: 1
    });
    return { success: true };
  } catch (error) {
    console.error("Erro botões:", error);
    // Fallback para texto
    const fallbackText = `${text}\n\n${buttons.map(b => `[ ${b.label} ]`).join('\n')}`;
    await sock.sendMessage(id, { text: fallbackText });
    return { success: true };
  }
}

export async function sendListMessage(to, text, buttonText, sections) {
    if (!sock) return { success: false };
    const id = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;

    const sectionsPayload = [{
      title: "Opções",
      rows: sections.map((s, idx) => ({
        title: s.label,
        rowId: s.id || `id-${idx}`,
        description: s.description || ""
      }))
    }];

    try {
      await sock.sendMessage(id, {
        text: text,
        buttonText: buttonText || "Ver Opções",
        sections: sectionsPayload
      });
      return { success: true };
    } catch (e) {
      const fallbackText = `${text}\n\n${sections.map(s => `* ${s.label}`).join('\n')}`;
      await sock.sendMessage(id, { text: fallbackText });
      return { success: true };
    }
}