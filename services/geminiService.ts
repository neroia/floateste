import { GoogleGenAI } from "@google/genai";

// Helper to get the AI client with the latest key from storage
const getClient = () => {
  let apiKey = '';
  try {
    const configStr = localStorage.getItem('flow_bot_config');
    if (configStr) {
      const config = JSON.parse(configStr);
      apiKey = config.geminiApiKey || '';
    }
  } catch (e) {
    console.error("Erro ao ler configuração", e);
  }
  
  // Instancia com a chave dinâmica do usuário
  return new GoogleGenAI({ apiKey: apiKey });
};

export const generateAIResponse = async (
  prompt: string,
  systemInstruction?: string,
  history: string[] = []
): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Você é um assistente útil no WhatsApp.",
        temperature: 0.7,
      },
    });

    return response.text || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao comunicar com a IA. Verifique se sua Chave API está configurada na Engrenagem.";
  }
};

export const suggestMessageContent = async (topic: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Gere uma mensagem curta, amigável e profissional para um bot de WhatsApp sobre o tema: "${topic}". Não use aspas na resposta.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error suggesting content:", error);
    return "";
  }
};