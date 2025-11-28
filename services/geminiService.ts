import { GoogleGenAI, Type, Schema } from "@google/genai";
import { EvaluationResult, InterviewTopic } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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

export const generateInterviewQuestion = async (topic: InterviewTopic): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Act as a strict Senior Technical Lead or Architect at a top-tier tech company.
      I am a candidate interviewing for a Senior Backend Engineer position.
      
      Generate a challenging, scenario-based interview question focusing on: ${topic}.
      
      Rules:
      1. DO NOT ask simple definition questions (e.g., "What is a HashMap?").
      2. Ask about production scenarios, debugging, trade-offs, architecture, or performance optimization.
      3. The question should require deep understanding of internals.
      4. Keep the question concise but detailed enough to set the context.
      5. Do not provide the answer yet.
      6. OUTPUT MUST BE IN CHINESE (Simplified Chinese).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.9,
      }
    });

    return response.text || "生成问题失败。";
  } catch (error) {
    console.error("Error generating question:", error);
    return "抱歉，生成面试题时出现错误，请重试。";
  }
};

export const evaluateCandidateAnswer = async (
  topic: InterviewTopic,
  question: string,
  answer: string
): Promise<EvaluationResult> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      You are evaluating a Senior Backend Engineer candidate.
      
      Topic: ${topic}
      Question: ${question}
      Candidate's Answer: ${answer}
      
      Evaluate the answer strictly. High scores (85+) should only be given for answers that demonstrate deep expertise, mention trade-offs, and cover edge cases.

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

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as EvaluationResult;
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return {
      score: 0,
      analysis: "AI 响应解析错误。",
      missingPoints: ["系统错误"],
      idealAnswer: "N/A"
    };
  }
};

export const explainConcept = async (
  topic: InterviewTopic,
  contextQuestion: string,
  userQuery: string
): Promise<string> => {
  try {
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

    return response.text || "抱歉，我无法解释这个概念。";
  } catch (error) {
    console.error("Error explaining concept:", error);
    return "抱歉，解答服务暂时不可用。";
  }
};