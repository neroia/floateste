import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const getClient = () => {
  // API key must be obtained exclusively from the environment variable process.env.API_KEY
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    // In a real env this should be assumed valid, but we return null to handle potential misconfig gracefully in UI logs
    console.warn("API_KEY not found in environment variables.");
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
  if (!ai) return "Erro: API Key do Gemini não configurada (process.env.API_KEY ausente).";

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
    return "Erro ao comunicar com a IA.";
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