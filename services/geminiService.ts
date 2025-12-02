import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAIResponse = async (
  prompt: string,
  systemInstruction?: string,
  history: string[] = []
): Promise<string> => {
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
    return "Erro ao comunicar com a IA (Verifique sua Chave API).";
  }
};

export const suggestMessageContent = async (topic: string): Promise<string> => {
  try {
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