import React, { useState, useEffect, useRef } from 'react';
import TopicSelector from './components/TopicSelector';
import MessageBubble from './components/MessageBubble';
import { generateInterviewQuestion, evaluateCandidateAnswer, explainConcept } from './services/geminiService';
import { InterviewTopic, Message, MessageType, Sender, HistorySession } from './types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Web Speech API Type Definition
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const App: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopic>(InterviewTopic.JAVA_CORE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false); 
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isManuallyStopped = useRef(false); // Track if user clicked stop

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load History from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('interview_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const w = window as unknown as IWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        let newContent = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newContent += event.results[i][0].transcript;
          }
        }
        
        if (newContent) {
          setInputValue(prev => prev + newContent);
        }
      };

      recognition.onend = () => {
        // Fix: Auto-restart if not manually stopped to prevent cutting off after a few seconds of silence
        if (isManuallyStopped.current) {
            setIsListening(false);
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.warn("Auto-restart voice failed:", e);
                setIsListening(false);
            }
        }
      };

      recognition.onerror = (event: any) => {
        // Ignore 'no-speech' errors as they are common in continuous mode
        if (event.error !== 'no-speech') {
            console.error("Speech error", event.error);
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("您的浏览器不支持语音输入功能。建议使用 Chrome 或 Edge。");
      return;
    }

    if (isListening) {
      isManuallyStopped.current = true;
      recognitionRef.current.stop();
    } else {
      isManuallyStopped.current = false;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: Message = {
        id: generateId(),
        sender: Sender.AI,
        type: MessageType.TEXT,
        content: `**欢迎来到 BackendMaster 高级后端面试模拟器。**\n\n我将担任您的技术面试官。已为您新增 **设计模式** 和 **编程实战** 模块。\n\n功能升级：\n1. 支持语音输入（自动续录，不间断）。\n2. 面试历史自动保存。\n3. 可随时追问知识点。\n\n请从侧边栏选择一个主题开始。`,
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
    }
  }, []);

  // Save history helper - FIXED: added explicitSessionId to avoid stale closure
  const saveCurrentSessionToHistory = (
    msgs: Message[], 
    topic: InterviewTopic, 
    q: string | null,
    explicitSessionId?: string
  ) => {
    if (msgs.length <= 1) return; // Don't save empty/welcome sessions
    
    // CRITICAL FIX: Prioritize explicit ID passed from caller, fallback to state (which might be stale inside async functions)
    const sessionId = explicitSessionId || currentSessionId;
    if (!sessionId) return; // Should not happen if logic is correct

    setHistory(prev => {
      // Find existing session to preserve its preview title if possible
      const existingSession = prev.find(h => h.id === sessionId);
      
      let finalPreview = "未记录的问题";

      if (q) {
        finalPreview = q.length > 60 ? q.substring(0, 60) + "..." : q;
      } else if (existingSession && existingSession.preview && existingSession.preview !== "未记录的问题") {
        finalPreview = existingSession.preview;
      } else {
        const aiMsg = msgs.find(m => m.sender === Sender.AI && m.type === MessageType.TEXT && m.id !== msgs[0].id);
        if (aiMsg) {
             finalPreview = aiMsg.content.length > 60 ? aiMsg.content.substring(0, 60) + "..." : aiMsg.content;
        }
      }

      const newSession: HistorySession = {
        id: sessionId,
        topic: topic,
        startTime: existingSession ? existingSession.startTime : Date.now(),
        messages: msgs,
        preview: finalPreview
      };

      const filtered = prev.filter(h => h.id !== sessionId);
      const updated = [...filtered, newSession];
      
      localStorage.setItem('interview_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleStartTopic = async (topic: InterviewTopic) => {
    setIsLoading(true);
    // Generate new ID immediately
    const newSessionId = generateId();
    setCurrentSessionId(newSessionId);
    
    const startMsg: Message = {
        id: generateId(),
        sender: Sender.USER,
        type: MessageType.TEXT,
        content: `我准备好开始 **${topic}** 的面试了。`,
        timestamp: Date.now()
      };
    
    const initialMessages = [startMsg];
    setMessages(initialMessages); 

    // Generate Question
    const question = await generateInterviewQuestion(topic);
    
    setCurrentQuestion(question);
    setIsAnswering(true);
    
    const questionMsg: Message = {
      id: generateId(),
      sender: Sender.AI,
      type: MessageType.TEXT,
      content: question,
      timestamp: Date.now()
    };
    
    const newMessages = [...initialMessages, questionMsg];
    setMessages(newMessages);
    
    // Save with EXPLICIT new ID to prevent overwriting the previous session (due to stale currentSessionId)
    saveCurrentSessionToHistory(newMessages, topic, question, newSessionId);
    
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentQuestion) return;

    const userText = inputValue;
    setInputValue('');
    
    // Stop listening temporarily to process, but user can restart. 
    // Or we could leave it on. Let's stop it to prevent accidental input during loading.
    if (isListening && recognitionRef.current) {
        isManuallyStopped.current = true;
        recognitionRef.current.stop();
        setIsListening(false);
    }

    // Add user message
    const updatedMessages = [
      ...messages,
      {
        id: generateId(),
        sender: Sender.USER,
        type: MessageType.TEXT,
        content: userText,
        timestamp: Date.now()
      }
    ];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Save user message immediately with current ID
    if (currentSessionId) {
        saveCurrentSessionToHistory(updatedMessages, selectedTopic, null, currentSessionId);
    }

    if (isAnswering) {
      // User is answering the interview question
      setIsAnswering(false); // Switch to review/follow-up mode

      // Evaluate
      const evaluation = await evaluateCandidateAnswer(selectedTopic, currentQuestion, userText);
      
      const evalMsg: Message = {
        id: generateId(),
        sender: Sender.AI,
        type: MessageType.EVALUATION,
        content: "这是我对你回答的评估：",
        evaluation: evaluation,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedMessages, evalMsg];
      setMessages(finalMessages);
      if (currentSessionId) {
        saveCurrentSessionToHistory(finalMessages, selectedTopic, null, currentSessionId);
      }

    } else {
      // User is asking a follow-up question
      const explanation = await explainConcept(selectedTopic, currentQuestion, userText);

      const explainMsg: Message = {
        id: generateId(),
        sender: Sender.AI,
        type: MessageType.TEXT,
        content: explanation,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedMessages, explainMsg];
      setMessages(finalMessages);
      if (currentSessionId) {
        saveCurrentSessionToHistory(finalMessages, selectedTopic, null, currentSessionId);
      }
    }

    setIsLoading(false);
  };

  const handleNextQuestion = () => {
    handleStartTopic(selectedTopic);
  };

  const handleLoadHistory = (session: HistorySession) => {
    setSelectedTopic(session.topic);
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    
    // Restore logic
    const lastMsg = session.messages[session.messages.length - 1];
    
    // Try to find the main question context
    // Heuristic: The first AI message that isn't the generic welcome
    const questionMsg = session.messages.find(m => m.sender === Sender.AI && m.type === MessageType.TEXT && m.content.length > 20 && m.id !== session.messages[0]?.id);
    
    if (questionMsg) {
        setCurrentQuestion(questionMsg.content);
    }

    if (lastMsg.type === MessageType.EVALUATION) {
        setIsAnswering(false); 
    } else if (lastMsg.sender === Sender.USER) {
        setIsAnswering(false); 
    } else if (lastMsg.sender === Sender.AI && lastMsg.type === MessageType.TEXT) {
         // If the last message is exactly the question, we are answering.
         // Otherwise it might be an explanation
         if (questionMsg && lastMsg.id === questionMsg.id) {
             setIsAnswering(true);
         } else {
             setIsAnswering(false);
         }
    }
    
    // If we loaded a fresh start (just Q), make sure isAnswering is true
    if (session.messages.length <= 2 && session.messages.some(m => m.sender === Sender.AI)) {
        setIsAnswering(true);
    }
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
          history={history}
          onLoadHistory={handleLoadHistory}
          disabled={isLoading && isAnswering} 
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Header - Mobile Only for Topics (Simplified for now, focuses on desktop layout mainly) */}
        <div className="md:hidden p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <h1 className="font-bold text-slate-100">BackendMaster</h1>
            {/* Mobile history toggle not implemented for brevity, just topic switch */}
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
                    {isAnswering ? '正在生成面试题...' : 'AI 正在分析/思考...'}
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
                    ? "在此输入你的详细回答 (支持语音输入)..." 
                    : "对刚才的分析有疑问？在此提问..."
                }
                className={`w-full bg-slate-800 text-slate-200 border rounded-xl px-4 py-4 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none min-h-[60px] max-h-[200px] ${
                   !isAnswering ? 'border-blue-900/50 bg-slate-800/50' : 'border-slate-700'
                }`}
                rows={isAnswering ? 3 : 2}
              />
              
              <div className="absolute right-3 bottom-3 flex gap-2">
                <button
                    onClick={toggleVoiceInput}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    title={isListening ? "停止录音" : "开始录音"}
                >
                    {isListening ? (
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    )}
                </button>
                <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;