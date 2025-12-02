import fetch from 'node-fetch';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Helper to validate config
const validateConfig = (config) => {
  if (!config || !config.phoneNumberId || !config.accessToken) {
    console.error('❌ Configuração da API do WhatsApp incompleta.');
    return false;
  }
  return true;
};

// Enviar mensagem de texto
export async function sendTextMessage(to, text, config) {
  if (!validateConfig(config)) return false;

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Erro Meta API:', JSON.stringify(data.error, null, 2));
      return { success: false, error: data.error };
    }
    
    console.log('✅ Mensagem enviada ID:', data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return { success: false, error: error.message };
  }
}

// Enviar imagem
export async function sendImageMessage(to, imageUrl, caption = '', config) {
  if (!validateConfig(config)) return false;

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption
          }
        })
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar imagem:', error);
    return null;
  }
}

// Enviar botões (máximo 3)
export async function sendButtonMessage(to, text, buttons, config) {
  if (!validateConfig(config)) return false;

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: text
            },
            action: {
              buttons: buttons.map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${idx}`,
                  title: btn.label.substring(0, 20) // Max 20 chars
                }
              }))
            }
          }
        })
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar botões:', error);
    return null;
  }
}

// Enviar lista (até 10 opções)
export async function sendListMessage(to, text, buttonText, sections, config) {
  if (!validateConfig(config)) return false;

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: text
            },
            action: {
              button: buttonText || 'Ver opções',
              sections: [{
                title: 'Opções',
                rows: sections.map((opt, idx) => ({
                  id: opt.id || `opt_${idx}`,
                  title: opt.label.substring(0, 24), // Max 24 chars
                  description: opt.description || ''
                }))
              }]
            }
          }
        })
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar lista:', error);
    return null;
  }
}