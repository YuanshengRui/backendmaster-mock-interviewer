import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'BackendMaster Mock Interviewer',
  description: '高级后端面试模拟器 - Next.js 版本',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-900 text-slate-200 min-h-screen">{children}</body>
    </html>
  );
}

