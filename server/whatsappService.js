import fetch from 'node-fetch';

// Helper to validate config for Evolution API
const validateConfig = (config) => {
  if (!config || !config.evolutionUrl || !config.evolutionApiKey || !config.instanceName) {
    console.error('❌ Configuração da Evolution API incompleta.');
    return false;
  }
  return true;
};

// Formata headers padrão da Evolution
const getHeaders = (config) => ({
  'Content-Type': 'application/json',
  'apikey': config.evolutionApiKey
});

// Enviar mensagem de texto
export async function sendTextMessage(to, text, config) {
  if (!validateConfig(config)) return { success: false, error: 'Configuração inválida' };

  const url = `${config.evolutionUrl}/message/sendText/${config.instanceName}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        number: to, // Evolution usa 'number' (ex: 551199999999)
        options: {
          delay: 1200,
          presence: "composing",
          linkPreview: false
        },
        textMessage: {
          text: text
        }
      })
    });

    const data = await response.json();
    
    // Verifica sucesso (Evolution pode retornar status: 201 ou errors)
    if (response.status !== 201 && response.status !== 200) {
       console.error('❌ Erro Evolution API:', JSON.stringify(data, null, 2));
       return { success: false, error: data };
    }
    
    console.log('✅ Mensagem enviada (Evolution).');
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Erro na requisição (Evolution):', error);
    return { success: false, error: error.message };
  }
}

// Enviar imagem
export async function sendImageMessage(to, imageUrl, caption = '', config) {
  if (!validateConfig(config)) return { success: false, error: 'Configuração inválida' };

  const url = `${config.evolutionUrl}/message/sendMedia/${config.instanceName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        number: to,
        options: {
          delay: 1200,
          presence: "composing"
        },
        mediaMessage: {
          mediatype: "image",
          caption: caption,
          media: imageUrl // URL da imagem
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar imagem (Evolution):', error);
    return null;
  }
}

// Enviar botões
// Nota: O suporte a botões nativos varia. Evolution usa lista ou botões dependendo da versão.
// Vamos usar o formato padrão da Evolution v2.
export async function sendButtonMessage(to, text, buttons, config) {
  if (!validateConfig(config)) return { success: false, error: 'Configuração inválida' };

  // Nota: Botões simples (Quick Reply)
  const url = `${config.evolutionUrl}/message/sendButtons/${config.instanceName}`;

  const formattedButtons = buttons.map((btn, idx) => ({
      type: "reply",
      displayText: btn.label,
      id: btn.id || `btn_${idx}`
  }));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        number: to,
        options: {
          delay: 1200,
          presence: "composing"
        },
        buttonMessage: {
            title: "Opções",
            description: text,
            buttons: formattedButtons
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar botões (Evolution):', error);
    return null;
  }
}

// Enviar lista
export async function sendListMessage(to, text, buttonText, sections, config) {
  if (!validateConfig(config)) return { success: false, error: 'Configuração inválida' };

  const url = `${config.evolutionUrl}/message/sendList/${config.instanceName}`;

  // Formata seções para Evolution
  const evolutionSections = [{
      title: "Opções Disponíveis",
      rows: sections.map((opt, idx) => ({
          title: opt.label,
          description: opt.description || "",
          rowId: opt.id || `opt_${idx}`
      }))
  }];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        number: to,
        options: {
          delay: 1200,
          presence: "composing"
        },
        listMessage: {
            title: "Menu",
            description: text,
            buttonText: buttonText || "Ver Opções",
            sections: evolutionSections
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar lista (Evolution):', error);
    return null;
  }
}