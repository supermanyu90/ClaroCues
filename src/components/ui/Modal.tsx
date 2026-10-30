import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Optional line under the title, also used as the dialog's accessible description. */
  description?: ReactNode;
  /** Buttons rendered next to the close button in the header. */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Accessible dialog: role="dialog" + aria-modal, labelled by its title, closes on Escape,
 * keeps Tab focus inside, and returns focus to the element that opened it.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  actions,
  className = 'max-w-2xl',
  children,
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Always calls the latest onClose without re-running the focus-trap effect when it changes.
  const requestClose = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (
      panel?.querySelector<HTMLElement>('[autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel
    )?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Click-outside-to-close for pointer users; keyboard users close with Escape or the ✕ button. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-slate-950/85 backdrop-blur-sm cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative bg-slate-900 border border-slate-800 rounded-2xl w-full shadow-2xl max-h-[92vh] flex flex-col focus:outline-none ${className}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4 shrink-0">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-white tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-xs text-slate-400">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm rounded"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
