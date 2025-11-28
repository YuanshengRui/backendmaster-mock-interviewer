"use client";

import React, { useState } from 'react';
import { InterviewTopic, HistorySession } from '../types';

interface TopicSelectorProps {
  selectedTopic: InterviewTopic;
  onSelectTopic: (topic: InterviewTopic) => void;
  history: HistorySession[];
  onLoadHistory: (session: HistorySession) => void;
  disabled: boolean;
}

const topics = Object.values(InterviewTopic);

const TopicSelector: React.FC<TopicSelectorProps> = ({ 
  selectedTopic, 
  onSelectTopic, 
  history,
  onLoadHistory,
  disabled 
}) => {
  const [activeTab, setActiveTab] = useState<'topics' | 'history'>('topics');

  return (
    <div className="w-full md:w-72 bg-slate-800 border-r border-slate-700 flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          BackendMaster
        </h2>
        
        <div className="flex p-1 bg-slate-700/50 rounded-lg">
          <button 
            onClick={() => setActiveTab('topics')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'topics' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            面试题库
          </button>
          <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            历史记录
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'topics' ? (
          topics.map((topic) => (
            <button
              key={topic}
              onClick={() => onSelectTopic(topic)}
              disabled={disabled}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                selectedTopic === topic
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {topic}
            </button>
          ))
        ) : (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                暂无历史记录
              </div>
            ) : (
              history.slice().reverse().map((session) => (
                <button
                  key={session.id}
                  onClick={() => onLoadHistory(session)}
                  disabled={disabled}
                  className="w-full text-left px-3 py-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/70 border border-slate-700/50 hover:border-slate-600 transition-all group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                      {session.topic.split(' ')[0]} 
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(session.startTime).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {session.preview}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
           {disabled ? '面试进行中...' : 'AI 面试官已就绪'}
        </div>
      </div>
    </div>
  );
};

export default TopicSelector;
