import { useState, type FormEvent } from 'react';
import type { BudgetItem } from '../../types';
import { createId } from '../../utils/id';

const PRIORITIES: { value: BudgetItem['priority']; label: string }[] = [
  { value: 'Essential', label: 'Essential (core experience / access)' },
  { value: 'High', label: 'High (recommended production)' },
  { value: 'Recommended', label: 'Recommended' },
  { value: 'Base', label: 'Base logistics' },
];

const inputClass =
  'w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500';

interface AddBudgetItemFormProps {
  onAdd: (item: BudgetItem) => void;
  onCancel: () => void;
}

export const AddBudgetItemForm = ({ onAdd, onCancel }: AddBudgetItemFormProps) => {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('1200');
  const [priority, setPriority] = useState<BudgetItem['priority']>('High');
  const [notes, setNotes] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    onAdd({
      id: createId('b'),
      category: category.trim(),
      amount: Math.max(0, Number.parseInt(amount, 10) || 0),
      priority,
      notes: notes.trim() || 'Custom budget item',
      status: 'Estimated',
    });
  };

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-teal-500/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Add expense item</h3>
        <button type="button" onClick={onCancel} className="text-xs text-slate-300 hover:text-white cursor-pointer">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <label htmlFor="budget-new-category" className="text-slate-300">
            Category name
          </label>
          <input
            id="budget-new-category"
            required
            maxLength={120}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. ASL Interpreters & CART"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="budget-new-amount" className="text-slate-300">
            Estimated cost ($)
          </label>
          <input
            id="budget-new-amount"
            type="number"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} font-mono tabular-nums`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="budget-new-priority" className="text-slate-300">
            Priority
          </label>
          <select
            id="budget-new-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as BudgetItem['priority'])}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <label htmlFor="budget-new-notes" className="text-slate-300">
          Notes
        </label>
        <input
          id="budget-new-notes"
          maxLength={300}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. provider, contract terms"
          className={inputClass}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg cursor-pointer"
        >
          Save line item
        </button>
      </div>
    </form>
  );
};
