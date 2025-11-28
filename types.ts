export enum Sender {
  AI = 'AI',
  USER = 'USER'
}

export enum MessageType {
  TEXT = 'TEXT',
  EVALUATION = 'EVALUATION'
}

export interface EvaluationResult {
  score: number;
  analysis: string;
  missingPoints: string[];
  idealAnswer: string;
}

export interface Message {
  id: string;
  sender: Sender;
  type: MessageType;
  content: string; // For text messages
  evaluation?: EvaluationResult; // For evaluation messages
  timestamp: number;
}

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
  DESIGN_PATTERNS = '设计模式与重构',
  CODING_ABILITY = 'Code 编程能力实战'
}

export interface TopicConfig {
  id: InterviewTopic;
  label: string;
  icon: string;
}

export interface HistorySession {
  id: string;
  topic: InterviewTopic;
  startTime: number;
  messages: Message[];
  preview: string; // A short preview of the question
}