import { GoogleGenAI, Type } from "@google/genai";
import { Mission } from "../types";

const apiKey = process.env.API_KEY || '';

// Mock missions in case API key is missing or fails, to ensure app doesn't break
const FALLBACK_MISSIONS: Mission[] = [
  { id: '1', description: "Jump over 5 trains", completed: false },
  { id: '2', description: "Collect 100 coins in one run", completed: false },
  { id: '3', description: "Score 5000 points without stumbling", completed: false },
];

export const generateDailyMissions = async (totalRuns: number): Promise<Mission[]> => {
  if (!apiKey) {
    console.warn("API Key not found, using fallback missions.");
    return FALLBACK_MISSIONS;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Generate 3 short, exciting, and fun daily missions for a subway-surfer style endless runner game. 
      The player has played ${totalRuns} runs so far.
      Keep descriptions under 10 words. 
      Make them sound like a cyberpunk street challenge.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
            },
            required: ['description']
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as { description: string }[];
    
    return data.map((item, index) => ({
      id: `ai-${Date.now()}-${index}`,
      description: item.description,
      completed: false
    }));

  } catch (error) {
    console.error("Failed to generate missions:", error);
    return FALLBACK_MISSIONS;
  }
};