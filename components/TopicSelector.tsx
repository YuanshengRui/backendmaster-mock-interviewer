import React from 'react';
import { InterviewTopic } from '../types';

interface TopicSelectorProps {
  selectedTopic: InterviewTopic;
  onSelectTopic: (topic: InterviewTopic) => void;
  disabled: boolean;
}

const topics = Object.values(InterviewTopic);

const TopicSelector: React.FC<TopicSelectorProps> = ({ selectedTopic, onSelectTopic, disabled }) => {
  return (
    <div className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          面试主题
        </h2>
        <p className="text-xs text-slate-400 mt-1">选择一个领域开始</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {topics.map((topic) => (
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
        ))}
      </div>
      
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           AI 面试官已就绪
        </div>
      </div>
    </div>
  );
};

export default TopicSelector;