import { useState, type FormEvent } from 'react';
import { type VendorItem } from '../types';
import { createId } from '../utils/id';

interface VendorChecklistProps {
  vendors: VendorItem[];
  onUpdateVendors: (vendors: VendorItem[]) => void;
}

export const VendorChecklist = ({ vendors, onUpdateVendors }: VendorChecklistProps) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddingVendor, setIsAddingVendor] = useState<boolean>(false);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

  // New Vendor Form State
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Catering & Bar');
  const [contact, setContact] = useState<string>('');
  const [emailPhone, setEmailPhone] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('2500');
  const [deadline, setDeadline] = useState<string>('4 Months Out');
  const [notes, setNotes] = useState<string>('');

  const categories = [
    'all',
    'Venue',
    'Catering & Bar',
    'Photography & Video',
    'Entertainment & DJ',
    'Florist & Decor',
    'Accessibility & AV',
    'Planning & Officiant',
  ];

  const statuses: VendorItem['status'][] = ['To Research', 'Contacted', 'Proposal Received', 'Booked', 'Paid'];

  const totalCommitted = vendors
    .filter((v) => v.status === 'Booked' || v.status === 'Paid')
    .reduce((acc, v) => acc + v.estimatedCost, 0);

  const totalEstimated = vendors.reduce((acc, v) => acc + v.estimatedCost, 0);

  const filteredVendors = vendors.filter((v) => {
    const matchCat = filterCategory === 'all' || v.category === filterCategory;
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchCat && matchStatus;
  });

  const handleUpdateStatus = (id: string, newStatus: VendorItem['status']) => {
    const next = vendors.map((v) => (v.id === id ? { ...v, status: newStatus } : v));
    onUpdateVendors(next);
  };

  const handleAddVendor = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newV: VendorItem = {
      id: createId('v'),
      category,
      name: name.trim(),
      contact: contact.trim() || 'Lead Representative',
      emailPhone: emailPhone.trim() || 'contact@vendor.com',
      status: 'To Research',
      estimatedCost: parseInt(estimatedCost) || 0,
      keyQuestions: [
        'What is your cancellation and rescheduling policy?',
        'What equipment or setup requirements do you need on site?',
        'Do you provide certificates of liability insurance?',
      ],
      deadline: deadline.trim() || '6 Months Out',
      notes: notes.trim() || 'Initial vendor inquiry',
    };

    onUpdateVendors([...vendors, newV]);
    setName('');
    setContact('');
    setEmailPhone('');
    setNotes('');
    setIsAddingVendor(false);
  };

  const handleDeleteVendor = (id: string) => {
    onUpdateVendors(vendors.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Procurement Pipeline</span>
            <span aria-hidden="true">·</span>
            <span>Contract Tracking</span>
            <span aria-hidden="true">·</span>
            <span>Industry Evaluation Questions</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Vendor Checklist & Procurement Manager</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Manage negotiations, review crucial evaluation questions to ask each vendor before signing, track deposit
            statuses, and keep all partner contacts in one centralized directory.
          </p>
        </div>

        <button
          onClick={() => setIsAddingVendor(true)}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          + Add New Vendor
        </button>
      </div>

      {/* 4-Item KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Total Partners Tracked</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">{vendors.length} Vendors</div>
          <div className="text-[11px] text-slate-400">
            Across {new Set(vendors.map((v) => v.category)).size} categories
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Contracts Booked / Paid</div>
          <div className="text-2xl font-bold text-teal-400 font-mono tabular-nums">
            {vendors.filter((v) => v.status === 'Booked' || v.status === 'Paid').length} Confirmed
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {Math.round(
              (vendors.filter((v) => v.status === 'Booked' || v.status === 'Paid').length / (vendors.length || 1)) * 100
            )}
            % pipeline completion
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Committed Contract Value</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            ${totalCommitted.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Deposits & signed obligations</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Forecasted Vendor Budget</div>
          <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
            ${totalEstimated.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Total estimated requirements</div>
        </div>
      </div>

      {/* Add Vendor Form Modal */}
      {isAddingVendor && (
        <form
          onSubmit={handleAddVendor}
          className="bg-slate-900 border border-teal-500/50 rounded-xl p-6 space-y-4 shadow-xl animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Add Vendor to Procurement Pipeline</h3>
            <button
              type="button"
              onClick={() => setIsAddingVendor(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="vendor-vendor-company-name" className="text-slate-300">
                Vendor / Company Name
              </label>
              <input
                id="vendor-vendor-company-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Sound & Lighting"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="vendor-category" className="text-slate-300">
                Category
              </label>
              <select
                id="vendor-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {categories
                  .filter((c) => c !== 'all')
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="vendor-estimated-cost" className="text-slate-300">
                Estimated Cost ($)
              </label>
              <input
                id="vendor-estimated-cost"
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="vendor-lead-contact-person" className="text-slate-300">
                Lead Contact Person
              </label>
              <input
                id="vendor-lead-contact-person"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. Marcus Vance"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="vendor-email-phone" className="text-slate-300">
                Email & Phone
              </label>
              <input
                id="vendor-email-phone"
                type="text"
                value={emailPhone}
                onChange={(e) => setEmailPhone(e.target.value)}
                placeholder="e.g. hello@vendor.com · (555) 234-5678"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="vendor-decision-deadline" className="text-slate-300">
                Decision Deadline
              </label>
              <input
                id="vendor-decision-deadline"
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g. 5 Months Out"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label htmlFor="vendor-notes-special-requirements" className="text-slate-300">
              Notes & Special Requirements
            </label>
            <input
              id="vendor-notes-special-requirements"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Requires 220V power drop, loading dock access at 10 AM"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg cursor-pointer"
            >
              Save Vendor
            </button>
          </div>
        </form>
      )}

      {/* Filter Segmented Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Category Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs overflow-x-auto max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 font-medium capitalize rounded transition-colors whitespace-nowrap cursor-pointer ${
                filterCategory === cat ? 'bg-slate-800 text-teal-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          {['all', ...statuses].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === st ? 'bg-slate-800 text-teal-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Cards List */}
      <div className="space-y-4">
        {filteredVendors.map((vendor) => {
          const isExpanded = expandedVendorId === vendor.id;
          return (
            <div
              key={vendor.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-teal-400 font-semibold">{vendor.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Deadline: {vendor.deadline}</span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">{vendor.name}</h3>
                  <div className="text-xs text-slate-300">
                    Contact: <span className="text-white">{vendor.contact}</span> ({vendor.emailPhone})
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Quote / Contract</div>
                    <div className="text-base font-bold text-white font-mono tabular-nums">
                      ${vendor.estimatedCost.toLocaleString()}
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    aria-label={`Booking status for ${vendor.name}`}
                    value={vendor.status}
                    onChange={(e) => handleUpdateStatus(vendor.id, e.target.value as VendorItem['status'])}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${
                      vendor.status === 'Booked' || vendor.status === 'Paid'
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : vendor.status === 'Proposal Received'
                          ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                          : vendor.status === 'Contacted'
                            ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                            : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    {statuses.map((st) => (
                      <option key={st} value={st} className="bg-slate-900 text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              {vendor.notes && (
                <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                  <span className="font-semibold text-slate-300">Notes: </span>
                  {vendor.notes}
                </div>
              )}

              {/* Expandable Key Questions to Ask Section */}
              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                <button
                  onClick={() => setExpandedVendorId(isExpanded ? null : vendor.id)}
                  aria-expanded={isExpanded}
                  className="text-xs font-medium text-teal-400 hover:text-teal-300 cursor-pointer flex items-center gap-1"
                >
                  {isExpanded
                    ? 'Hide Key Questions to Ask'
                    : `View Key Questions to Ask (${vendor.keyQuestions.length})`}
                </button>

                <button
                  onClick={() => handleDeleteVendor(vendor.id)}
                  aria-label={`Remove ${vendor.name}`}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Remove Partner
                </button>
              </div>

              {isExpanded && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs animate-in fade-in">
                  <div className="font-semibold text-slate-200">Crucial Questions to Ask {vendor.name}:</div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {vendor.keyQuestions.map((q, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
