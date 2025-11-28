import { EvaluationResult, InterviewTopic } from "../types";
import { GoogleGenAI } from "@google/genai";

// 这里直接在前端使用 Gemini，API Key 通过 Vite 注入的 process.env.API_KEY 提供
//（vite.config.ts 里已经有：define: { 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY) }）

const apiKey = (process.env.API_KEY as string | undefined) || (process.env.GEMINI_API_KEY as string | undefined);

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
    if (!apiKey) {
        console.error("未检测到 GEMINI_API_KEY / API_KEY，请在 .env 文件中配置 GEMINI_API_KEY。");
        return null;
    }
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
};

// 构造出题 prompt（与 app/api/question/route.ts 语义一致）
const buildQuestionPrompt = (topic: InterviewTopic): string => {
    let specificInstruction = "";

    if (topic === InterviewTopic.CODING_ABILITY) {
        specificInstruction = `
      Generate a coding problem similar to LeetCode Medium/Hard or a practical utility implementation
      (e.g., implement a RateLimiter, LRU Cache, or a ThreadPool).
      Require the candidate to write actual code.
      Focus on correctness, edge cases, and time/space complexity.
    `;
    } else if (topic === InterviewTopic.DESIGN_PATTERNS) {
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

    return `
    Act as a strict Senior Technical Lead or Architect at a top-tier tech company.
    I am a candidate interviewing for a Senior Backend Engineer position.

    Generate a challenging, scenario-based interview question focusing on: ${topic}.

    ${specificInstruction}

    Keep the question concise but detailed enough to set the context.
    Do not provide the answer yet.
    OUTPUT MUST BE IN CHINESE (Simplified Chinese).
  `;
};

// 1) 生成面试题
export const generateInterviewQuestion = async (topic: InterviewTopic): Promise<string> => {
    try {
        const client = getClient();
        if (!client) {
            return "抱歉，未正确配置 Gemini API Key，无法生成面试题。请检查环境变量 GEMINI_API_KEY。";
        }

        const model = "gemini-2.5-flash";
        const prompt = buildQuestionPrompt(topic);

        const result = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.9 },
        });

        // @google/genai v1.x 返回的是 { response: { text() } }，你原来在 route.ts 用的是 response.text，所以这里兜底两种形式
        const responseAny: any = result as any;
        const text =
            typeof responseAny.response?.text === "function"
                ? responseAny.response.text()
                : responseAny.text ?? "";

        if (!text || !`${text}`.trim()) {
            console.error("Gemini 返回内容为空", result);
            return "抱歉，生成面试题时出现了异常响应，请稍后重试。";
        }

        return `${text}`.trim();
    } catch (error) {
        console.error("Error generating question via Gemini:", error);
        return "抱歉，生成面试题时出现错误，请重试。";
    }
};

// 2) 评估候选人回答
export const evaluateCandidateAnswer = async (
    topic: InterviewTopic,
    question: string,
    answer: string
): Promise<EvaluationResult> => {
    try {
        const client = getClient();
        if (!client) {
            return {
                score: 0,
                analysis: "未配置 Gemini API Key，无法进行答案评估。",
                missingPoints: ["系统配置错误"],
                idealAnswer: "请先配置 GEMINI_API_KEY 后重试。",
            };
        }

        const model = "gemini-2.5-flash";

        const prompt = `
      你是一名严谨的技术面试官，请根据下面的信息对候选人的回答进行打分与详细点评。

      【面试主题】${topic}
      【面试题目】${question}
      【候选人回答】${answer}

      请以 JSON 格式输出评估结果，字段包括：
      - score: number (0~100 的综合得分)
      - analysis: string (整体评价与优劣势分析，使用简体中文)
      - missingPoints: string[] (候选人遗漏或欠缺的关键点列表)
      - idealAnswer: string (参考答案要点，使用简体中文)
    `;

        const result = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.3 },
        });

        const responseAny: any = result as any;
        const raw =
            typeof responseAny.response?.text === "function"
                ? responseAny.response.text()
                : responseAny.text ?? "";

        if (!raw || !`${raw}`.trim()) {
            throw new Error("Empty evaluation response");
        }

        const cleaned = `${raw}`
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        return JSON.parse(cleaned) as EvaluationResult;
    } catch (error) {
        console.error("Error evaluating answer via Gemini:", error);
        return {
            score: 0,
            analysis: "AI 评估过程中出现错误，当前结果仅代表系统兜底提示。",
            missingPoints: ["系统错误"],
            idealAnswer: "暂不可用",
        };
    }
};

// 3) 概念/追问讲解
export const explainConcept = async (
    topic: InterviewTopic,
    contextQuestion: string,
    userQuery: string
): Promise<string> => {
    try {
        const client = getClient();
        if (!client) {
            return "抱歉，未配置 Gemini API Key，无法提供概念讲解。";
        }

        const model = "gemini-2.5-flash";

        const prompt = `
      你是一名资深后端技术导师，正在辅导一位准备高级后端面试的候选人。

      面试主题：${topic}
      当前面试题：${contextQuestion}
      候选人的追问/困惑：${userQuery}

      请用简体中文进行深入浅出的讲解，要求：
      - 结合真实生产场景举例
      - 尽可能给出实践建议与常见坑
      - 控制在 3~6 个自然段内
    `;

        const result = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.7 },
        });

        const responseAny: any = result as any;
        const text =
            typeof responseAny.response?.text === "function"
                ? responseAny.response.text()
                : responseAny.text ?? "";

        if (!text || !`${text}`.trim()) {
            return "抱歉，暂时无法为你详细解释该问题，请稍后再试。";
        }

        return `${text}`.trim();
    } catch (error) {
        console.error("Error explaining concept via Gemini:", error);
        return "抱歉，解释服务暂时不可用，请稍后再试。";
    }
};
