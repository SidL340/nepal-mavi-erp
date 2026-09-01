'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  TrendingUp,
  Plus,
  Filter,
  Search,
  Building,
  Landmark,
  FileSpreadsheet,
  X,
  Calendar,
  Wallet,
  DollarSign,
  QrCode,
  CreditCard,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IncomePage() {
  const queryClient = useQueryClient();
  const [sourceLevel, setSourceLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [paymentMedium, setPaymentMedium] = useState('CASH');

  // Inline Income Head Modal State
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadNameNepali, setNewHeadNameNepali] = useState('');

  const createIncomeHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/heads', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('New Income Topic created!');
      queryClient.invalidateQueries({ queryKey: ['income-heads'] });
      setIsAddHeadModalOpen(false);
      setNewHeadName('');
      setNewHeadNameNepali('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create income topic.');
    },
  });

  // Fetch Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Fetch categories & heads
  const { data: categoriesData } = useQuery({
    queryKey: ['income-categories'],
    queryFn: async () => {
      const res = await api.get('/income/categories');
      return res.data?.data || [];
    },
  });

  const { data: headsData } = useQuery({
    queryKey: ['income-heads'],
    queryFn: async () => {
      const res = await api.get('/income/heads');
      return res.data?.data || [];
    },
  });

  // Fetch Income Entries
  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['income-entries', sourceLevel, activeYear?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceLevel) params.append('sourceLevel', sourceLevel);
      if (activeYear?.id) params.append('academicYearId', activeYear.id.toString());
      const res = await api.get(`/income/entries?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Student Fee Collections Total for Self Income aggregation
  const { data: feeCollectionsData } = useQuery({
    queryKey: ['fee-collections-sum'],
    queryFn: async () => {
      const res = await api.get('/income/fee-collections?limit=1');
      return res.data;
    },
  });

  // Add Income Mutation
  const addIncomeMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/income/entries', {
        ...formData,
        paymentMedium,
        academicYearId: activeYear?.id || 1,
        receivedDateAd: new Date().toISOString().slice(0, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Income entry recorded successfully!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['school-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save income');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addIncomeMutation.mutate(data);
  };

  const entries = entriesData?.data || [];
  const directIncomeTotal = entriesData?.totalAmount || 0;
  const studentFeesTotal = feeCollectionsData?.totalAmount || 0;
  const grandTotalIncome = directIncomeTotal + studentFeesTotal;

  const govGrants = entries
    .filter((e: any) => e.head?.category?.type === 'GOVERNMENT_BUDGET' || ['Central', 'Provincial', 'Local'].includes(e.sourceLevel))
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const ownSourceEntries = entries
    .filter((e: any) => e.head?.category?.type === 'OWN_SOURCE' || e.sourceLevel === 'District' || e.sourceLevel === 'Other')
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const totalSelfIncome = ownSourceEntries + studentFeesTotal;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Income & Government Budget (आम्दानी तथा बजेट)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            केन्द्र, प्रदेश, स्थानीय पालिका तथा विद्यालयको आफ्नै स्रोत (पोखरी, जग्गा, कोठा भाडा, विद्यार्थी शुल्क) आम्दानी
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Record Income (आम्दानी प्रविष्टि)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total School Income (Year {activeYear?.year || '2081-82'})</span>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">रू {grandTotalIncome.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">Government Grants + Student Fees + Own Source</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Government Grants (सरकारी अनुदान बजेट)</span>
          <p className="text-2xl font-black text-[#1e3a5f] mt-2 font-mono">
            रू {govGrants.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Salary, ICT, Building, Scholarship</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">School Self Income (विद्यालय आफ्नै स्रोत / शुल्क)</span>
          <p className="text-2xl font-black text-amber-600 mt-2 font-mono">
            रू {totalSelfIncome.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Student Fees (Rs. {studentFeesTotal.toLocaleString()}) + Rent/Lease (Rs. {ownSourceEntries.toLocaleString()})
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
            <Filter size={14} />
            Filter Level:
          </span>
          {['', 'Central', 'Provincial', 'Local', 'District', 'Other'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSourceLevel(lvl)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                sourceLevel === lvl
                  ? 'bg-[#1e3a5f] text-white shadow-2xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-slate-100'
              }`}
            >
              {lvl === '' ? 'All Levels' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Income Entries Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1e3a5f] text-white font-bold">
            <tr>
              <th className="p-3.5">Date (BS)</th>
              <th className="p-3.5">Source Level</th>
              <th className="p-3.5">Income Head & Category</th>
              <th className="p-3.5">Source Org / Deposited Account</th>
              <th className="p-3.5">Payment Mode</th>
              <th className="p-3.5 text-right">Amount (रू)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading income entries...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No income entries found for selected filter.</td></tr>
            ) : (
              entries.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-gray-900">{item.receivedDateBs}</td>
                  <td className="p-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-gray-800">
                      {item.sourceLevel || 'Central'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-gray-900">{item.head?.name}</p>
                    <p className="text-[10px] text-gray-400">{item.head?.category?.name}</p>
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-gray-800">{item.sourceOrg || '—'}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Account: {item.depositedInAccount || 'Main Bank Account'}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                      {item.paymentMedium || 'CASH'}
                    </span>
                    {item.paymentRef && <span className="text-[10px] text-gray-400 block font-mono">Ref: {item.paymentRef}</span>}
                  </td>
                  <td className="p-3.5 text-right font-mono font-extrabold text-emerald-700">
                    Rs. {item.amount?.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Income Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f]">Record Income Entry (आम्दानी प्रविष्टि)</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source Level *</label>
                  <select name="sourceLevel" className="erp-input font-bold" required>
                    <option value="Central">Central Govt (सङ्घीय सरकार)</option>
                    <option value="Provincial">Provincial Govt (प्रदेश सरकार)</option>
                    <option value="Local">Local Govt (स्थानीय पालिका)</option>
                    <option value="District">District / EDC (जिल्ला)</option>
                    <option value="Other">School Own Source (आफ्नै स्रोत)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Income Head / Topic *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddHeadModalOpen(true)}
                      className="text-[10px] font-extrabold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Topic (नयाँ शीर्षक)</span>
                    </button>
                  </div>
                  <select name="headId" className="erp-input font-bold" required>
                    <option value="">-- Select Income Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>{h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Source Organization Name</label>
                <input type="text" name="sourceOrg" placeholder="e.g. Ministry of Education / Local Municipality" className="erp-input" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (रू) *</label>
                  <input type="number" required name="amount" placeholder="0.00" className="erp-input font-mono font-bold text-emerald-800" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Received Date (BS) *</label>
                  <input type="text" required name="receivedDateBs" defaultValue={todayBS()} className="erp-input font-mono" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Medium (भुक्तानी माध्यम)</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'CASH', label: 'Cash' },
                    { id: 'BANK_TRANSFER', label: 'Bank' },
                    { id: 'QR_CODE', label: 'QR' },
                    { id: 'CHEQUE', label: 'Cheque' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMedium(pm.id)}
                      className={`p-1.5 rounded-lg border text-[11px] font-bold ${
                        paymentMedium === pm.id ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-slate-50 text-gray-700'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Deposited Bank Account</label>
                  <input type="text" name="depositedInAccount" placeholder="Rastriya Banijya Bank" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Received By / Voucher No</label>
                  <input type="text" name="receivedBy" placeholder="Accountant / Voucher No" className="erp-input" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks</label>
                <textarea rows={2} name="remarks" placeholder="Enter remarks..." className="erp-input" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={addIncomeMutation.isPending} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs">
                  {addIncomeMutation.isPending ? 'Saving...' : 'Save Income Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Add Income Topic Modal */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">Add New Income Topic (नयाँ आम्दानी शीर्षक)</h3>
              <button onClick={() => setIsAddHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createIncomeHeadMutation.mutate({
                  categoryId: categoriesData?.[0]?.id || 1,
                  name: newHeadName,
                  nameNepali: newHeadNameNepali,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Income Topic Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pond Lease, Land Lease, Room Rent"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Title (नेपाली शीर्षक)</label>
                <input
                  type="text"
                  placeholder="पोखरी, जग्गा, कोठा भाडा"
                  value={newHeadNameNepali}
                  onChange={(e) => setNewHeadNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddHeadModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createIncomeHeadMutation.isPending} className="px-5 py-2 bg-[#1e3a5f] text-white font-bold rounded-xl shadow-xs">
                  {createIncomeHeadMutation.isPending ? 'Saving...' : 'Save Income Topic (सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
