// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AccessReadinessAudit } from './AccessReadinessAudit';
import { Modal } from './ui/Modal';
import { TabList, TabPanel } from './ui/Tabs';

// jsdom lacks matchMedia and scrollIntoView, which the app uses for reduced-motion checks.
window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never;
Element.prototype.scrollIntoView ??= () => {};

describe('Modal', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Settings" description="Change things">
          <button>First</button>
          <button>Last</button>
        </Modal>
      </>
    );
  }

  it('is a labelled modal dialog that moves focus in, traps Tab, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Change things');
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('TabList', () => {
  function Harness() {
    const [active, setActive] = useState<'a' | 'b' | 'c'>('a');
    return (
      <>
        <TabList
          tabs={[
            { key: 'a', label: 'Alpha' },
            { key: 'b', label: 'Beta' },
            { key: 'c', label: 'Gamma' },
          ]}
          active={active}
          onChange={setActive}
          idPrefix="t"
          label="Demo"
        />
        <TabPanel idPrefix="t" tabKey={active}>
          Panel {active}
        </TabPanel>
      </>
    );
  }

  it('implements the ARIA tabs pattern with arrow-key navigation', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    expect(alpha).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel', { name: 'Alpha' })).toHaveTextContent('Panel a');

    alpha.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Beta' })).toHaveTextContent('Panel b');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus();
  });
});

describe('AccessReadinessAudit', () => {
  it('lists failing checks first and links fixes to the right tool', async () => {
    const onOpenFloorplan = vi.fn();
    render(
      <AccessReadinessAudit
        report={{
          score: 50,
          counts: { pass: 1, warn: 0, fail: 1 },
          checks: [
            { id: 'team', label: 'Interpreter team size', status: 'pass', detail: 'ok' },
            { id: 'sightlines', label: 'Seating sightlines', status: 'fail', detail: '40% clear', fix: 'Rearrange' },
          ],
        }}
        onOpenFloorplan={onOpenFloorplan}
        onOpenBudget={() => {}}
      />
    );
    const items = within(screen.getByRole('list', { name: 'Audit checks' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Seating sightlines');
    await userEvent.click(screen.getByRole('button', { name: 'Open floorplan' }));
    expect(onOpenFloorplan).toHaveBeenCalled();
  });
});

describe('App shell', () => {
  it('offers a skip link, a single h1 and keyboard-reachable workspace tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: /Accessibility Suite/ }));
    expect(await screen.findByRole('heading', { name: 'Access Readiness Audit' })).toBeInTheDocument();
  });

  it('recomputes the readiness score when the active plan changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /40th Birthday Bash/ }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Birthday/));
    expect(screen.getByRole('button', { name: /40th Birthday Bash/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /Accessibility Suite \(\d+\/100\)/ })).toBeInTheDocument();
  });
});
