import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const getClient = () => {
  // Priority: 1. User config (localStorage) for Desktop App, 2. Environment Variable for Web/Dev
  let apiKey = process.env.API_KEY;

  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('flow_bot_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.geminiApiKey) {
          apiKey = parsed.geminiApiKey;
        }
      } catch (e) {
        console.error("Failed to parse local config", e);
      }
    }
  }

  if (!apiKey) {
    console.warn("API_KEY not found in environment variables or local settings.");
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

export const generateAIResponse = async (
  prompt: string,
  systemInstruction?: string,
  history: string[] = []
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Erro: API Key do Gemini não configurada (Settings -> Gemini API).";

  try {
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
    return "Erro ao comunicar com a IA (Verifique a Chave API).";
  }
};

export const suggestMessageContent = async (topic: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Gere uma mensagem curta, amigável e profissional para um bot de WhatsApp sobre o tema: "${topic}". Não use aspas.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error suggesting content:", error);
    return "";
  }
};