import { GoogleGenAI, Schema, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const EVALUATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "A score from 0 to 100 based on accuracy, depth, and seniority level.",
    },
    analysis: {
      type: Type.STRING,
      description: "A concise analysis of the candidate's answer in Chinese, highlighting strengths and main weaknesses.",
    },
    missingPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of critical technical concepts or keywords the candidate missed in Chinese.",
    },
    idealAnswer: {
      type: Type.STRING,
      description: "A senior-level, comprehensive answer to the question in Chinese, including code snippets if relevant.",
    },
  },
  required: ["score", "analysis", "missingPoints", "idealAnswer"],
};

export async function POST(req: NextRequest) {
  try {
    const { topic, question, answer } = await req.json();

    const model = "gemini-2.5-flash";
    const prompt = `
      You are evaluating a Senior Backend Engineer candidate.
      
      Topic: ${topic}
      Question: ${question}
      Candidate's Answer: ${answer}
      
      Evaluate the answer strictly. High scores (85+) should only be given for answers that demonstrate deep expertise, mention trade-offs, and cover edge cases.
      
      If the topic is Coding Ability, check for correctness, efficiency, and code style in the answer.

      IMPORTANT: Provide the analysis, missing points, and ideal answer in CHINESE (Simplified Chinese).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: EVALUATION_SCHEMA,
      }
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}
