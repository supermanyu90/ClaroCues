import { useEffect, useState } from 'react';

const CONFIRMATION_MS = 2000;

interface CopyButtonProps {
  text: string;
  label: string;
  onError: (message: string) => void;
}

/** Copies text to the clipboard and briefly confirms, announcing the result to screen readers. */
export const CopyButton = ({ text, label, onError }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      onError('Could not copy to the clipboard.');
    }
  };

  return (
    <button
      onClick={() => void copy()}
      className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
    >
      <span aria-live="polite">{copied ? '✓ Copied' : label}</span>
    </button>
  );
};
