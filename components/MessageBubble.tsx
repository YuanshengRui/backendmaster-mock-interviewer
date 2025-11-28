import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, MessageType, Sender } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  let colorClass = 'bg-red-500/20 text-red-300 border-red-500/50';
  if (score >= 85) colorClass = 'bg-green-500/20 text-green-300 border-green-500/50';
  else if (score >= 60) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';

  return (
    <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${colorClass} font-bold text-xl`}>
      {score}
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isAI = message.sender === Sender.AI;

  if (message.type === MessageType.EVALUATION && message.evaluation) {
    const { score, analysis, missingPoints, idealAnswer } = message.evaluation;
    return (
      <div className="w-full max-w-4xl mx-auto my-6 animate-fade-in">
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              面试分析
            </h3>
            <ScoreBadge score={score} />
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-2">点评</h4>
              <p className="text-slate-300 leading-relaxed">{analysis}</p>
            </div>

            {missingPoints.length > 0 && (
              <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4">
                <h4 className="text-sm uppercase tracking-wider text-red-400 font-bold mb-2">遗漏的关键点</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {missingPoints.map((point, idx) => (
                    <li key={idx} className="text-sm">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm uppercase tracking-wider text-blue-400 font-bold mb-2">参考的高级回答</h4>
              <div className="prose prose-invert max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 text-sm">
                <ReactMarkdown>{idealAnswer}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isAI ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAI ? 'bg-blue-600' : 'bg-slate-600'}`}>
          {isAI ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M12 8v8"/><path d="M20 10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2"/><path d="M4 10a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2"/><rect x="8" y="14" width="8" height="6" rx="2"/></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
          <div className={`px-5 py-4 rounded-2xl shadow-sm ${
            isAI 
              ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none' 
              : 'bg-blue-600 text-white rounded-tr-none'
          }`}>
             <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
             </div>
          </div>
          <span className="text-xs text-slate-500 mt-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;