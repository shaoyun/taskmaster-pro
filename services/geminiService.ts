import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client
// NOTE: In a real production app, you should proxy requests through a backend.
// Here we use the environment variable as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const breakdownTaskWithAI = async (taskTitle: string): Promise<string[]> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `Break down the following task into 3-5 smaller, actionable sub-tasks. Return only the sub-tasks as a JSON array of strings. Task: "${taskTitle}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return [];
    
    const result = JSON.parse(jsonStr);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Fail gracefully
    return [];
  }
};