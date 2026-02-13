
import { GoogleGenAI } from "@google/genai";

export const getFinancialAdvice = async (summary: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Aşağıdaki apartman mali durumu için yöneticiye tek cümlelik, Türkçe, profesyonel bir tavsiye ver: ${JSON.stringify(summary)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Mali verileri düzenli tutmaya devam edin.";
  }
};
