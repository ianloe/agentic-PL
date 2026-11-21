import 'katex/dist/katex.min.css';
import { BookOpen, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import userManualMarkdown from '../../USER_MANUAL.md?raw';

export function UserManualPanel() {
  const handleDownload = () => {
    const blob = new Blob([userManualMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'USER_MANUAL.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-900" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600">
            Complete guide to every section and P&amp;L formula
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download USER_MANUAL.md
        </button>
      </div>

      <article className="ai-markdown rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800 sm:p-8">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {userManualMarkdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
