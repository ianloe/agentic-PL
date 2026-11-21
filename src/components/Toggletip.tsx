import { HelpCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

interface ToggletipProps {
  label: string;
  text: string;
}

export function Toggletip({ label, text }: ToggletipProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`More about ${label}`}
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={tipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-64 -translate-x-1/2 rounded-md border border-slate-200 bg-slate-900 px-2.5 py-2 text-xs leading-relaxed font-normal text-white shadow-lg"
        >
          {text}
        </div>
      )}
    </span>
  );
}
