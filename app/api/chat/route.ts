import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// 定义与前端共用的类型（可以根据需要抽到单独文件）
export enum InterviewTopic {
  JAVA_CORE = 'Java 核心与并发',
  SPRING_BOOT = 'Spring Boot 与框架',
  REDIS = 'Redis 与缓存策略',
  MYSQL = 'MySQL 与调优',
  MONGO = 'MongoDB 与 NoSQL',
  KAFKA = 'Kafka 与消息队列',
  ELASTICSEARCH = 'Elasticsearch',
  DISTRIBUTED_SYSTEMS = '分布式系统设计',
  ALGORITHMS = '算法与数据结构',
}

export type ChatAction =
  | { type: 'generateQuestion'; topic: InterviewTopic }
  | { type: 'evaluateAnswer'; topic: InterviewTopic; question: string; answer: string }
  | { type: 'explainConcept'; topic: InterviewTopic; contextQuestion: string; userQuery: string };

export interface EvaluationResult {
  score: number;
  analysis: string;
  missingPoints: string[];
  idealAnswer: string;
}

const EVALUATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: 'A score from 0 to 100 based on accuracy, depth, and seniority level.',
    },
    analysis: {
      type: Type.STRING,
      description: "A concise analysis of the candidate's answer in Chinese, highlighting strengths and main weaknesses.",
    },
    missingPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A list of critical technical concepts or keywords the candidate missed in Chinese.',
    },
    idealAnswer: {
      type: Type.STRING,
      description: 'A senior-level, comprehensive answer to the question in Chinese, including code snippets if relevant.',
    },
  },
  required: ['score', 'analysis', 'missingPoints', 'idealAnswer'],
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }
  return new GoogleGenAI({ apiKey });
}

async function generateInterviewQuestion(topic: InterviewTopic): Promise<string> {
  const ai = getClient();
  const model = 'gemini-2.5-flash';
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
    },
  });

  return response.text || '生成问题失败。';
}

async function evaluateCandidateAnswer(
  topic: InterviewTopic,
  question: string,
  answer: string,
): Promise<EvaluationResult> {
  const ai = getClient();
  const model = 'gemini-2.5-flash';
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
      responseMimeType: 'application/json',
      responseSchema: EVALUATION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('No response from AI');

  return JSON.parse(text) as EvaluationResult;
}

async function explainConcept(
  topic: InterviewTopic,
  contextQuestion: string,
  userQuery: string,
): Promise<string> {
  const ai = getClient();
  const model = 'gemini-2.5-flash';
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

  return response.text || '抱歉，我无法解释这个概念。';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatAction;

    switch (body.type) {
      case 'generateQuestion': {
        const text = await generateInterviewQuestion(body.topic);
        return NextResponse.json({ ok: true, data: text });
      }
      case 'evaluateAnswer': {
        const result = await evaluateCandidateAnswer(body.topic, body.question, body.answer);
        return NextResponse.json({ ok: true, data: result });
      }
      case 'explainConcept': {
        const text = await explainConcept(body.topic, body.contextQuestion, body.userQuery);
        return NextResponse.json({ ok: true, data: text });
      }
      default:
        return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: process.env.NODE_ENV === 'development' ? String(error?.message || error) : 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}

