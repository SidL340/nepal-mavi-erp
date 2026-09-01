'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  X,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  Megaphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

export default function AcademicCalendar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const currentTodayBs = todayBS(); // e.g. "2083-05-15"
  const [selectedMonthBs, setSelectedMonthBs] = useState<string>(currentTodayBs.slice(0, 7)); // "2083-05"
  const [selectedDateBs, setSelectedDateBs] = useState<string>(currentTodayBs); // "2083-05-15"

  // Event Modal States (Admin Only)
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    titleNepali: '',
    description: '',
    eventDateBs: currentTodayBs,
    endDateBs: '',
    eventType: 'ACADEMIC',
    targetAudience: 'ALL',
    isHoliday: false,
  });

  // Fetch Events for selected month
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['academic-events', selectedMonthBs],
    queryFn: async () => {
      const res = await api.get(`/events?monthBs=${selectedMonthBs}`);
      return res.data?.data || [];
    },
  });

  const events: any[] = eventsData || [];

  // Create or Update Event Mutation
  const saveEventMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingEvent) {
        const res = await api.put(`/events/${editingEvent.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/events', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Event saved successfully!');
      setIsAddEventModalOpen(false);
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save event.');
    },
  });

  // Delete Event Mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/events/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Event deleted.');
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
    },
  });

  // Map of events by date string (YYYY-MM-DD)
  const eventsByDateMap: Record<string, any[]> = {};
  events.forEach((ev) => {
    if (!eventsByDateMap[ev.eventDateBs]) {
      eventsByDateMap[ev.eventDateBs] = [];
    }
    eventsByDateMap[ev.eventDateBs].push(ev);
  });

  // Selected Date Events
  const selectedDateEvents = eventsByDateMap[selectedDateBs] || [];

  // Helper for event type badges
  const getEventBadge = (type: string, isHoliday: boolean) => {
    if (isHoliday) {
      return { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Holiday (विदा)' };
    }
    switch (type) {
      case 'EXAM':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Exam (परीक्षा)' };
      case 'SPORTS':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Sports (खेलकुद)' };
      case 'MEETING':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Meeting (बैठक)' };
      case 'CULTURAL':
        return { bg: 'bg-pink-100 text-pink-800 border-pink-200', label: 'Cultural (सांस्कृतिक)' };
      default:
        return { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Academic (शैक्षिक)' };
    }
  };

  // Generate days 1 to 32 for the month grid
  const daysInMonth = Array.from({ length: 32 }, (_, i) => {
    const dayNum = String(i + 1).padStart(2, '0');
    const dateStr = `${selectedMonthBs}-${dayNum}`;
    return {
      dayNum: i + 1,
      dateStr,
      hasEvents: Boolean(eventsByDateMap[dateStr]?.length),
      events: eventsByDateMap[dateStr] || [],
      isToday: dateStr === currentTodayBs,
      isSelected: dateStr === selectedDateBs,
    };
  });

  // Month navigation helper
  const handleMonthChange = (delta: number) => {
    const [year, month] = selectedMonthBs.split('-').map(Number);
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    const newMonthBs = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setSelectedMonthBs(newMonthBs);
    setSelectedDateBs(`${newMonthBs}-01`);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-[#1e3a5f]" />
          <div>
            <h3 className="font-extrabold text-sm text-[#1e3a5f]">Academic Calendar & Events (पात्रो तथा कार्यक्रम)</h3>
            <p className="text-[11px] text-gray-500 font-nepali">स्कूल पात्रो, विदा, परीक्षा र दैनिक कार्यक्रमहरू</p>
          </div>
        </div>

        {/* Admin Add Event Button */}
        {isAdmin && (
          <button
            onClick={() => {
              setEditingEvent(null);
              setEventForm({
                title: '',
                titleNepali: '',
                description: '',
                eventDateBs: selectedDateBs || currentTodayBs,
                endDateBs: '',
                eventType: 'ACADEMIC',
                targetAudience: 'ALL',
                isHoliday: false,
              });
              setIsAddEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-3 py-1.5 text-xs font-extrabold shadow-2xs transition"
          >
            <Plus size={14} />
            <span>+ Add Event / Holiday (कार्यक्रम थप्नुहोस्)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Calendar Grid */}
        <div className="lg:col-span-7 space-y-3 border-r border-gray-100 pr-0 lg:pr-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1 rounded hover:bg-slate-200 text-gray-700"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-black font-mono text-[#1e3a5f] text-sm">
              BS {selectedMonthBs}
            </span>

            <button
              onClick={() => handleMonthChange(1)}
              className="p-1 rounded hover:bg-slate-200 text-gray-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center font-bold text-[10px] text-gray-500 font-nepali border-b border-gray-100 pb-1">
            <span className="text-rose-600">आइत (Sun)</span>
            <span>सोम (Mon)</span>
            <span>मङ्गल (Tue)</span>
            <span>बुध (Wed)</span>
            <span>बिही (Thu)</span>
            <span>शुक्र (Fri)</span>
            <span className="text-rose-600">शनि (Sat)</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((d) => {
              const hasHoliday = d.events.some((ev) => ev.isHoliday);
              return (
                <div
                  key={d.dayNum}
                  onClick={() => setSelectedDateBs(d.dateStr)}
                  className={`min-h-[44px] p-1 rounded-xl border cursor-pointer flex flex-col items-center justify-between text-xs transition relative ${
                    d.isSelected
                      ? 'border-[#1e3a5f] bg-blue-50/80 font-black shadow-2xs'
                      : d.isToday
                      ? 'border-amber-400 bg-amber-50 font-bold'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className={`text-[11px] ${d.isToday ? 'text-amber-900 font-bold' : hasHoliday ? 'text-rose-600 font-bold' : 'text-gray-800'}`}>
                    {d.dayNum}
                  </span>

                  {/* Event indicator dots */}
                  {d.hasEvents && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {d.events.slice(0, 3).map((ev, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full ${
                            ev.isHoliday ? 'bg-rose-600' : ev.eventType === 'EXAM' ? 'bg-purple-600' : 'bg-blue-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Events Scheduled for Selected Date */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-[#1e3a5f] flex items-center gap-1">
              <Clock size={14} />
              <span>Events on Date: <b className="font-mono text-sm">{selectedDateBs}</b></span>
            </span>
            {selectedDateBs === currentTodayBs && (
              <span className="bg-amber-400 text-[#1e3a5f] font-extrabold px-2 py-0.5 rounded text-[10px]">TODAY</span>
            )}
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {isLoading ? (
              <p className="py-6 text-center text-xs text-gray-400">Loading events...</p>
            ) : selectedDateEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 rounded-xl border border-dashed border-gray-200">
                <CalendarIcon size={24} className="mx-auto text-gray-300 mb-1" />
                <p>No events or holidays scheduled for {selectedDateBs}.</p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEventForm((prev) => ({ ...prev, eventDateBs: selectedDateBs }));
                      setIsAddEventModalOpen(true);
                    }}
                    className="mt-2 text-blue-600 font-bold underline"
                  >
                    + Click to add event for this date
                  </button>
                )}
              </div>
            ) : (
              selectedDateEvents.map((ev) => {
                const badge = getEventBadge(ev.eventType, ev.isHoliday);
                return (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-xl border space-y-1 bg-white hover:shadow-2xs transition ${
                      ev.isHoliday ? 'border-rose-200 bg-rose-50/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <h4 className="font-extrabold text-xs text-gray-900 mt-1">{ev.title}</h4>
                        {ev.titleNepali && <p className="text-[11px] text-gray-600 font-nepali">{ev.titleNepali}</p>}
                      </div>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingEvent(ev);
                              setEventForm({
                                title: ev.title,
                                titleNepali: ev.titleNepali || '',
                                description: ev.description || '',
                                eventDateBs: ev.eventDateBs,
                                endDateBs: ev.endDateBs || '',
                                eventType: ev.eventType,
                                targetAudience: ev.targetAudience,
                                isHoliday: Boolean(ev.isHoliday),
                              });
                              setIsAddEventModalOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete event "${ev.title}"?`)) {
                                deleteEventMutation.mutate(ev.id);
                              }
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {ev.description && <p className="text-[11px] text-gray-500 pt-1">{ev.description}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── ADMIN ADD/EDIT EVENT MODAL ────────────────────────────────────── */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                {editingEvent ? 'Edit Event / Holiday' : 'Add New Event / Holiday (पात्रो कार्यक्रम थप्नुहोस्)'}
              </h3>
              <button onClick={() => setIsAddEventModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEventMutation.mutate(eventForm);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Event Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Term Exam Start, Sports Day, Teej Holiday"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (नेपाली)</label>
                <input
                  type="text"
                  placeholder="प्रथम त्रैमासिक परीक्षा सञ्चालन"
                  value={eventForm.titleNepali}
                  onChange={(e) => setEventForm({ ...eventForm, titleNepali: e.target.value })}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date BS (मिति) *</label>
                  <input
                    type="text"
                    required
                    value={eventForm.eventDateBs}
                    onChange={(e) => setEventForm({ ...eventForm, eventDateBs: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Event Type *</label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                    className="erp-input font-bold"
                  >
                    <option value="ACADEMIC">Academic (शैक्षिक)</option>
                    <option value="EXAM">Examination (परीक्षा)</option>
                    <option value="HOLIDAY">Holiday (सार्वजनिक विदा)</option>
                    <option value="SPORTS">Sports / ECA (खेलकुद)</option>
                    <option value="MEETING">Meeting (बैठक)</option>
                    <option value="CULTURAL">Cultural (सांस्कृतिक)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={eventForm.isHoliday}
                  onChange={(e) => setEventForm({ ...eventForm, isHoliday: e.target.checked })}
                  className="rounded text-rose-600"
                />
                <span className="font-bold text-rose-700">Mark as Official School Holiday (सार्वजनिक विदा)</span>
              </label>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Details</label>
                <textarea
                  rows={2}
                  placeholder="Enter details..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveEventMutation.isPending}
                  className="px-5 py-2 bg-[#1e3a5f] text-white font-bold rounded-xl shadow-xs"
                >
                  {saveEventMutation.isPending ? 'Saving...' : 'Save Event (कार्यक्रम थप्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
