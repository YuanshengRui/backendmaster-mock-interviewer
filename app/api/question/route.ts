import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize AI on server side
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
    
    if (!topic) {
        return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const model = "gemini-2.5-flash";
    let specificInstruction = "";
    
    if (topic === 'Code 编程能力实战') { // Using string matching based on enum value or update types to share
      specificInstruction = `
        Generate a coding problem similar to LeetCode Medium/Hard or a practical utility implementation (e.g., implement a RateLimiter, LRU Cache, or a ThreadPool).
        Require the candidate to write actual code.
        Focus on correctness, edge cases, and time/space complexity.
      `;
    } else if (topic === '设计模式与重构') {
      specificInstruction = `
        Describe a real-world software design problem (e.g., payment processing, notification system, legacy code refactoring).
        Ask the candidate to suggest appropriate Design Patterns to solve it and explain why.
        Do not ask for simple definitions like "What is Singleton?".
      `;
    } else {
      specificInstruction = `
        Rules:
        1. DO NOT ask simple definition questions (e.g., "What is a HashMap?").
        2. Ask about production scenarios, debugging, trade-offs, architecture, or performance optimization.
        3. The question should require deep understanding of internals.
      `;
    }

    const prompt = `
      Act as a strict Senior Technical Lead or Architect at a top-tier tech company.
      I am a candidate interviewing for a Senior Backend Engineer position.
      
      Generate a challenging, scenario-based interview question focusing on: ${topic}.
      
      ${specificInstruction}
      
      Keep the question concise but detailed enough to set the context.
      Do not provide the answer yet.
      OUTPUT MUST BE IN CHINESE (Simplified Chinese).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.9,
      }
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }
}
