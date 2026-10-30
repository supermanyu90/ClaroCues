// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_TABLES, SAMPLE_WEDDING } from '../data/initialBlueprint';
import { appendCaption } from '../live/captions';
import { chatContext } from '../services/apiClient';
import type { BudgetItem, SightlineTable } from '../types';
import { createId } from '../utils/id';
import { BudgetPlanner } from './BudgetPlanner';
import { FloorplanArchitect } from './FloorplanArchitect';

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
})) as never;

function FloorplanHarness({ onChange }: { onChange: (tables: SightlineTable[]) => void }) {
  const [tables, setTables] = useState(INITIAL_TABLES);
  return (
    <FloorplanArchitect
      tables={tables}
      onChangeTables={(next) => {
        setTables(next);
        onChange(next);
      }}
    />
  );
}

describe('FloorplanArchitect', () => {
  it('moves a table with the arrow keys and announces the new sightline', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FloorplanHarness onChange={onChange} />);
    const first = INITIAL_TABLES[0];
    const marker = screen.getByRole('button', { name: (name) => name.startsWith(`${first.name},`) });

    marker.focus();
    await user.keyboard('{ArrowRight}');
    const moved = onChange.mock.lastCall?.[0].find((t: SightlineTable) => t.id === first.id);
    expect(moved.x).toBe(first.x + 10);

    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    const movedAgain = onChange.mock.lastCall?.[0].find((t: SightlineTable) => t.id === first.id);
    expect(movedAgain.y).toBe(Math.min(460, first.y + 40));
    expect(screen.getByText(/moved to \d+, \d+: (clear|partial|obstructed) sightline/)).toBeInTheDocument();
  });

  it('adds a seating preset and selects it in the inspector', async () => {
    const user = userEvent.setup();
    render(<FloorplanHarness onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Add Wheelchair Pod/ }));
    expect(screen.getByRole('heading', { level: 3, name: /Wheelchair Access Pod/ })).toBeInTheDocument();
  });
});

describe('BudgetPlanner', () => {
  function BudgetHarness() {
    const [items, setItems] = useState<BudgetItem[]>(SAMPLE_WEDDING.budgetAllocation);
    const [total, setTotal] = useState(SAMPLE_WEDDING.totalBudget);
    return (
      <BudgetPlanner
        budgetItems={items}
        totalBudget={total}
        eventType="wedding"
        onUpdateItems={setItems}
        onUpdateTotalBudget={setTotal}
      />
    );
  }

  it('adds a line item through the labelled form', async () => {
    const user = userEvent.setup();
    render(<BudgetHarness />);
    await user.click(screen.getByRole('button', { name: '+ Add expense' }));
    await user.type(screen.getByLabelText('Category name'), 'Hearing loop rental');
    await user.clear(screen.getByLabelText('Estimated cost ($)'));
    await user.type(screen.getByLabelText('Estimated cost ($)'), '450');
    await user.click(screen.getByRole('button', { name: 'Save line item' }));

    const row = screen.getByRole('rowheader', { name: /Hearing loop rental/ }).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('$450')).toBeInTheDocument();
  });

  it('warns when accessibility is under-funded after the total budget grows', async () => {
    const user = userEvent.setup();
    render(<BudgetHarness />);
    const total = screen.getByLabelText('Total event budget ($)');
    await user.clear(total);
    await user.type(total, '500000');
    expect(screen.getByText(/Accessibility is under-funded/)).toBeInTheDocument();
  });

  it('filters the ledger by priority', async () => {
    const user = userEvent.setup();
    render(<BudgetHarness />);
    await user.click(screen.getByRole('button', { name: 'Base', pressed: false }));
    const priorities = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.children[1]?.textContent);
    expect(priorities.every((p) => p === 'Base')).toBe(true);
  });
});

describe('small helpers', () => {
  it('extends a caption while the same speaker talks and starts a new one at turn boundaries', () => {
    let captions = appendCaption([], 'assistant', 'Two ', false, 1);
    captions = appendCaption(captions, 'assistant', 'interpreters.', false, 2);
    expect(captions).toEqual([{ id: 1, speaker: 'assistant', text: 'Two interpreters.' }]);
    captions = appendCaption(captions, 'assistant', ' Next turn', true, 3);
    expect(captions.map((c) => c.text)).toEqual(['Two interpreters.', 'Next turn']);
  });

  it('sends only non-sensitive plan fields as chat context', () => {
    const context = chatContext(SAMPLE_WEDDING);
    expect(Object.keys(context).sort()).toEqual(
      ['dhhPercentage', 'eventType', 'guestCount', 'theme', 'title', 'totalBudget', 'venueName'].sort()
    );
  });

  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('x')));
    expect(ids.size).toBe(1000);
  });
});
