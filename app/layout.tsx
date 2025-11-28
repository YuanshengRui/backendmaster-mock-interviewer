import React from 'react';

export const metadata = {
  title: 'BackendMaster 后端模拟面试',
  description: 'A high-level mock interview simulator for Senior Backend Engineers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{__html: `
          body {
            font-family: 'Inter', "Microsoft YaHei", sans-serif;
            background-color: #0f172a;
            color: #e2e8f0;
          }
          code, pre {
            font-family: 'Fira Code', monospace;
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #1e293b; 
          }
          ::-webkit-scrollbar-thumb {
            background: #475569; 
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #64748b; 
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
