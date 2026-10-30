import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabDef<K extends string> {
  key: K;
  label: ReactNode;
}

interface TabListProps<K extends string> {
  tabs: TabDef<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Prefix for tab/panel ids; panels must use id `${idPrefix}-panel-${key}`. */
  idPrefix: string;
  label: string;
  className?: string;
  tabClassName?: (selected: boolean) => string;
}

export const tabId = (prefix: string, key: string) => `${prefix}-tab-${key}`;
export const panelId = (prefix: string, key: string) => `${prefix}-panel-${key}`;

/** WAI-ARIA tablist with roving tabindex and Arrow/Home/End keyboard navigation. */
export function TabList<K extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  label,
  className,
  tabClassName,
}: TabListProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={className}>
      {tabs.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            id={tabId(idPrefix, tab.key)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.key)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={tabClassName?.(selected)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  idPrefix: string;
  tabKey: string;
  children: ReactNode;
  className?: string;
  /** Keeps an inactive panel mounted (preserving its state) but hidden from everyone. */
  hidden?: boolean;
}

export const TabPanel = ({ idPrefix, tabKey, children, className = 'focus:outline-none', hidden }: TabPanelProps) => (
  <div
    role="tabpanel"
    id={panelId(idPrefix, tabKey)}
    aria-labelledby={tabId(idPrefix, tabKey)}
    tabIndex={0}
    hidden={hidden}
    className={className}
  >
    {children}
  </div>
);
