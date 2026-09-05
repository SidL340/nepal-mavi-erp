'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const res = await api.get('/inventory/categories');
      return res.data?.data || [];
    },
  });

  // Fetch Items
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['inventory-items', selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (search) params.append('search', search);
      const res = await api.get(`/inventory?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/inventory', formData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Equipment added to Jinsi inventory!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add item');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addItemMutation.mutate(data);
  };

  const categories = categoriesData || [];
  const items = itemsData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Inventory & Jinsi Portal (जिन्सी तथा सामग्री व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            फर्निचर, कम्प्युटर/आईटी, विज्ञान प्रयोगशालाका उपकरण, खेलकुद तथा कार्यालय सामग्री अभिलेख
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Add Jinsi Item (सामग्री थप्नुहोस्)</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search equipment by name, lab room, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden"
          >
            <option value="">All Categories (सबै वर्ग)</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="px-4 py-3.5 font-bold uppercase">Item / Hardware Name</th>
                <th className="px-4 py-3.5 font-bold uppercase">Category</th>
                <th className="px-4 py-3.5 font-bold uppercase text-center">Quantity</th>
                <th className="px-4 py-3.5 font-bold uppercase">Condition (अवस्था)</th>
                <th className="px-4 py-3.5 font-bold uppercase">Location / Room</th>
                <th className="px-4 py-3.5 font-bold uppercase">Source / Fund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading inventory items...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <Package size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-sm font-semibold text-gray-600">No hardware or equipment registered</p>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">{item.name}</p>
                      {item.nameNepali && <p className="text-[10px] text-gray-500 font-nepali">{item.nameNepali}</p>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-700">{item.category?.name}</td>
                    <td className="px-4 py-3.5 text-center font-mono font-extrabold text-[#1e3a5f]">
                      {item.quantity} {item.unit || 'pcs'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          item.condition === 'GOOD'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.condition === 'FAIR'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{item.location || 'Main Store'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{item.source || 'School Fund'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD JINSI ITEM MODAL ─────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f]">Register Jinsi Item (जिन्सी सामग्री दर्ता)</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Item Name (English) *</label>
                <input required name="name" type="text" placeholder="e.g. Dell Desktop Core i5" className="erp-input font-bold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Item Name (नेपाली)</label>
                <input name="nameNepali" type="text" placeholder="उदा. कम्प्युटर, बेन्च" className="erp-input font-nepali" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select required name="categoryId" className="erp-input">
                    <option value="">Select Category</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Quantity *</label>
                  <input required name="quantity" type="number" defaultValue="1" min="1" className="erp-input font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Condition *</label>
                  <select name="condition" className="erp-input font-bold">
                    <option value="GOOD">GOOD (राम्रो)</option>
                    <option value="FAIR">FAIR (चालु)</option>
                    <option value="POOR">POOR (मर्मत योग्य)</option>
                    <option value="DAMAGED">DAMAGED (बिग्रिएको)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Location / Room</label>
                  <input name="location" type="text" placeholder="Computer Lab / Room 10" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source of Fund</label>
                  <input name="source" type="text" placeholder="Govt Grant, Donation" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Purchase Date (BS)</label>
                  <input name="purchaseDateBs" type="text" defaultValue={todayBS()} className="erp-input font-mono" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280]"
                >
                  {addItemMutation.isPending ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
