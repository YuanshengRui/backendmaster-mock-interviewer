import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topic, contextQuestion, userQuery } = await req.json();

    const model = "gemini-2.5-flash";
    const prompt = `
      You are a Senior Technical Mentor.
      The user is in a mock interview session about: ${topic}.
      The previous interview question was: "${contextQuestion}".
      
      The user has a follow-up question or needs clarification on a concept: "${userQuery}".
      
      Please explain this concept clearly in Chinese (Simplified Chinese). 
      - Keep it relevant to the context of the interview question.
      - Use code snippets (Java/SQL/etc) if helpful for explanation.
      - Be encouraging but technically precise.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return NextResponse.json({ text: response.text });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to explain concept" }, { status: 500 });
  }
}
