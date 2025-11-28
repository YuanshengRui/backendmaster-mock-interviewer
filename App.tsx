import React, { useState, useEffect, useRef } from 'react';
import TopicSelector from './components/TopicSelector';
import MessageBubble from './components/MessageBubble';
import { generateInterviewQuestion, evaluateCandidateAnswer, explainConcept } from './services/geminiService';
import { InterviewTopic, Message, MessageType, Sender } from './types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate IDs if uuid package fails or for simplicity (though v4 is standard)
const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopic>(InterviewTopic.JAVA_CORE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false); // True if waiting for user answer to the interview question
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: Message = {
        id: generateId(),
        sender: Sender.AI,
        type: MessageType.TEXT,
        content: `**欢迎来到高级后端面试模拟器。**\n\n我将担任您的技术面试官。请从侧边栏选择一个主题，然后开始面试。\n\n**提示：** 在我对您的回答进行评估后，如果您对某些知识点不清楚，可以直接在输入框中提问，我会为您解答。`,
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
    }
  }, []);

  const handleStartTopic = async (topic: InterviewTopic) => {
    // Reset state for new topic
    setIsLoading(true);
    setMessages(prev => [
      ...prev, 
      {
        id: generateId(),
        sender: Sender.USER,
        type: MessageType.TEXT,
        content: `我们开始关于 **${topic}** 的面试。`,
        timestamp: Date.now()
      }
    ]);
    
    // Generate Question
    const question = await generateInterviewQuestion(topic);
    
    setCurrentQuestion(question);
    setIsAnswering(true);
    
    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        sender: Sender.AI,
        type: MessageType.TEXT,
        content: question,
        timestamp: Date.now()
      }
    ]);
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentQuestion) return;

    const userText = inputValue;
    setInputValue('');

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        sender: Sender.USER,
        type: MessageType.TEXT,
        content: userText,
        timestamp: Date.now()
      }
    ]);

    setIsLoading(true);

    if (isAnswering) {
      // User is answering the interview question
      setIsAnswering(false); // Switch to review/follow-up mode

      // Evaluate
      const evaluation = await evaluateCandidateAnswer(selectedTopic, currentQuestion, userText);

      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          sender: Sender.AI,
          type: MessageType.EVALUATION,
          content: "这是我对你回答的评估：",
          evaluation: evaluation,
          timestamp: Date.now()
        }
      ]);
    } else {
      // User is asking a follow-up question (knowledge explanation)
      const explanation = await explainConcept(selectedTopic, currentQuestion, userText);

      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          sender: Sender.AI,
          type: MessageType.TEXT,
          content: explanation,
          timestamp: Date.now()
        }
      ]);
    }

    setIsLoading(false);
  };

  const handleNextQuestion = () => {
    handleStartTopic(selectedTopic);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block h-full">
        <TopicSelector 
          selectedTopic={selectedTopic} 
          onSelectTopic={(t) => {
            setSelectedTopic(t);
            handleStartTopic(t);
          }}
          disabled={isLoading && isAnswering} // Prevent switching while answering strictly
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Header - Mobile Only for Topics */}
        <div className="md:hidden p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <h1 className="font-bold text-slate-100">BackendMaster</h1>
            <select 
                className="bg-slate-700 text-xs text-white p-2 rounded"
                value={selectedTopic}
                onChange={(e) => {
                    const t = e.target.value as InterviewTopic;
                    setSelectedTopic(t);
                    handleStartTopic(t);
                }}
            >
                {Object.values(InterviewTopic).map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-slate-400">
                    {isAnswering ? '正在生成面试场景...' : isAnswering === false && messages.length > 0 && messages[messages.length-1].sender === Sender.USER ? 'AI 正在思考解答...' : '正在分析你的回答...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            
            {/* Show "Next Question" button only when not currently answering (i.e., during review/explanation phase) */}
            {!isAnswering && messages.length > 1 && !isLoading && (
               <div className="flex justify-center">
                  <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 text-sm font-medium rounded-full border border-slate-700 transition-all flex items-center gap-2"
                  >
                      <span>结束本题讨论，进入下一题</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
               </div>
            )}

            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || (!isAnswering && !currentQuestion)}
                placeholder={
                    isAnswering 
                    ? "在此输入你的详细回答... (Shift+Enter 换行)" 
                    : "对刚才的分析有疑问？在此提问，获取知识点解答..."
                }
                className={`w-full bg-slate-800 text-slate-200 border rounded-xl px-4 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none min-h-[60px] max-h-[200px] ${
                   !isAnswering ? 'border-blue-900/50 bg-slate-800/50' : 'border-slate-700'
                }`}
                rows={isAnswering ? 3 : 2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;