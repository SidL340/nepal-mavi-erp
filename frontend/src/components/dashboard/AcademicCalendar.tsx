'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, getBSMonthDetails } from '@/lib/nepali-date';
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
  DownloadCloud,
  Sun,
  Flame,
  Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

export default function AcademicCalendar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const currentTodayBs = todayBS(); // e.g. "2083-05-20"
  const [selectedMonthBs, setSelectedMonthBs] = useState<string>(currentTodayBs.slice(0, 7)); // "2083-05"
  const [selectedDateBs, setSelectedDateBs] = useState<string>(currentTodayBs); // "2083-05-20"
  
  // Weekly Holiday Config (Saturday is standard; Sunday toggleable)
  const [isSundayHoliday, setIsSundayHoliday] = useState<boolean>(false);

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

  // Parse Year and Month
  const [yearNum, monthNum] = useMemo(() => {
    const parts = selectedMonthBs.split('-').map(Number);
    return [parts[0] || 2083, parts[1] || 5];
  }, [selectedMonthBs]);

  // Compute Nepali Month Details (Start Day of Week & Total Days in Month)
  const monthDetails = useMemo(() => {
    return getBSMonthDetails(yearNum, monthNum);
  }, [yearNum, monthNum]);

  // Fetch Events for selected month
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['academic-events', selectedMonthBs],
    queryFn: async () => {
      const res = await api.get(`/events?monthBs=${selectedMonthBs}`);
      return res.data?.data || [];
    },
  });

  const events: any[] = eventsData || [];

  // Load National Calendar Events Mutation
  const loadNationalEventsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/events/load-calendar-events', { yearBs: String(yearNum) });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'राष्ट्रिय चाडपर्व तथा विदाहरू सफलतापूर्वक लोड गरियो!');
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-class'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to load national calendar events.');
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['attendance-class'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save event.');
    },
  });

  // Delete Event Mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/events/${id}/delete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Event deleted.');
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-class'] });
    },
  });

  // Map of events by date string (YYYY-MM-DD)
  const eventsByDateMap: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach((ev) => {
      if (!map[ev.eventDateBs]) {
        map[ev.eventDateBs] = [];
      }
      map[ev.eventDateBs].push(ev);
    });
    return map;
  }, [events]);

  // Selected Date Events
  const selectedDateEvents = eventsByDateMap[selectedDateBs] || [];

  // Helper for event type badges
  const getEventBadge = (type: string, isHoliday: boolean) => {
    if (isHoliday) {
      return { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Holiday (सार्वजनिक विदा)' };
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

  // Month navigation helper
  const handleMonthChange = (delta: number) => {
    let newMonth = monthNum + delta;
    let newYear = yearNum;
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

  // Check if a specific day is weekend holiday
  const isWeekendHoliday = (dayOfWeek: number) => {
    // 6 = Saturday (always), 0 = Sunday (if enabled)
    if (dayOfWeek === 6) return true;
    if (dayOfWeek === 0 && isSundayHoliday) return true;
    return false;
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} className="text-[#1e3a5f]" />
          <div>
            <h3 className="font-black text-sm text-[#1e3a5f]">
              Academic Calendar & Holidays (शैक्षिक क्यालेन्डर तथा विदा तालिका)
            </h3>
            <p className="text-[11px] text-gray-500 font-nepali">
              राष्ट्रिय चाडपर्व, विद्यालय विदा, परीक्षा र दैनिक शैक्षिक कार्यक्रमहरू
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sunday Holiday Toggle */}
          <button
            onClick={() => setIsSundayHoliday(!isSundayHoliday)}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition ${
              isSundayHoliday
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                : 'bg-slate-50 text-gray-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle Sunday as School Holiday"
          >
            {isSundayHoliday ? '✓ Sunday Holiday (आइतबार विदा: सक्रिय)' : '+ Sunday Holiday (आइतबार विदा)'}
          </button>

          {/* Admin Load Events Button */}
          {isAdmin && (
            <button
              onClick={() => loadNationalEventsMutation.mutate()}
              disabled={loadNationalEventsMutation.isPending}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold transition shadow-2xs"
            >
              <DownloadCloud size={14} />
              <span>{loadNationalEventsMutation.isPending ? 'Loading...' : '📥 Load National Holidays & Events'}</span>
            </button>
          )}

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
              <span>+ Add Event / Holiday</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Calendar Grid */}
        <div className="lg:col-span-7 space-y-3 border-r border-gray-100 pr-0 lg:pr-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1 rounded hover:bg-slate-200 text-gray-700"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <span className="font-black text-[#1e3a5f] text-sm block">
                {monthDetails.monthLabelNepali} {yearNum} ({monthDetails.monthLabelEnglish})
              </span>
              <span className="text-[10px] font-mono text-gray-500">BS {selectedMonthBs}</span>
            </div>

            <button
              onClick={() => handleMonthChange(1)}
              className="p-1 rounded hover:bg-slate-200 text-gray-700"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center font-bold text-[11px] border-b border-gray-200 pb-1.5">
            <span className={isSundayHoliday ? 'text-rose-600 font-extrabold' : 'text-gray-700'}>आइत (Sun)</span>
            <span className="text-gray-700">सोम (Mon)</span>
            <span className="text-gray-700">मङ्गल (Tue)</span>
            <span className="text-gray-700">बुध (Wed)</span>
            <span className="text-gray-700">बिही (Thu)</span>
            <span className="text-gray-700">शुक्र (Fri)</span>
            <span className="text-rose-600 font-extrabold">शनि (Sat)</span>
          </div>

          {/* Days Grid with starting day offset */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty Offset Cells */}
            {Array.from({ length: monthDetails.startDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[46px] rounded-xl bg-slate-50/50 border border-transparent" />
            ))}

            {/* Real Month Days */}
            {Array.from({ length: monthDetails.totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayStr = String(dayNum).padStart(2, '0');
              const dateStr = `${selectedMonthBs}-${dayStr}`;
              const dayOfWeek = (monthDetails.startDayOfWeek + idx) % 7;
              const isWeekend = isWeekendHoliday(dayOfWeek);
              const dayEvents = eventsByDateMap[dateStr] || [];
              const hasHoliday = isWeekend || dayEvents.some((ev) => ev.isHoliday);
              const isToday = dateStr === currentTodayBs;
              const isSelected = dateStr === selectedDateBs;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateBs(dateStr)}
                  className={`min-h-[48px] p-1 rounded-xl border cursor-pointer flex flex-col items-center justify-between text-xs transition relative ${
                    isSelected
                      ? 'border-[#1e3a5f] bg-blue-50/80 font-black shadow-xs ring-2 ring-blue-500/20'
                      : isToday
                      ? 'border-amber-400 bg-amber-50 font-bold'
                      : hasHoliday
                      ? 'border-rose-100 bg-rose-50/30 hover:border-rose-300'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span
                      className={`text-[11px] ${
                        isToday
                          ? 'text-amber-900 font-black'
                          : hasHoliday
                          ? 'text-rose-600 font-extrabold'
                          : 'text-gray-800'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayOfWeek === 6 && (
                      <span className="text-[8px] font-bold text-rose-500 uppercase">वि</span>
                    )}
                  </div>

                  {/* Event Badges / Dots */}
                  {dayEvents.length > 0 && (
                    <div className="w-full flex flex-col gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 1).map((ev, i) => (
                        <span
                          key={i}
                          className={`text-[8.5px] px-1 py-0.2 rounded truncate block text-center font-bold ${
                            ev.isHoliday
                              ? 'bg-rose-100 text-rose-800'
                              : ev.eventType === 'EXAM'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                          title={ev.title}
                        >
                          {ev.titleNepali || ev.title}
                        </span>
                      ))}
                      {dayEvents.length > 1 && (
                        <span className="text-[8px] text-gray-500 text-center font-bold">
                          +{dayEvents.length - 1} more
                        </span>
                      )}
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

          {/* Quick Action: Declare Holiday Button for Selected Date */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setEventForm({
                    title: 'School Holiday',
                    titleNepali: 'विद्यालय सार्वजनिक विदा',
                    description: `Declared school holiday on ${selectedDateBs}`,
                    eventDateBs: selectedDateBs,
                    endDateBs: '',
                    eventType: 'HOLIDAY',
                    targetAudience: 'ALL',
                    isHoliday: true,
                  });
                  setIsAddEventModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-3 py-2 text-xs font-extrabold shadow-2xs transition"
              >
                <Flag size={14} />
                <span>⚡ Declare Holiday (यस दिन विदा घोषणा गर्नुहोस्)</span>
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {isLoading ? (
              <p className="py-6 text-center text-xs text-gray-400">Loading events...</p>
            ) : selectedDateEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 space-y-2">
                <CalendarIcon size={24} className="mx-auto text-gray-300" />
                <p>No special events or holidays scheduled for {selectedDateBs}.</p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEventForm((prev) => ({ ...prev, eventDateBs: selectedDateBs }));
                      setIsAddEventModalOpen(true);
                    }}
                    className="text-blue-600 font-bold underline text-xs"
                  >
                    + Click to add event / note for this date
                  </button>
                )}
              </div>
            ) : (
              selectedDateEvents.map((ev) => {
                const badge = getEventBadge(ev.eventType, ev.isHoliday);
                return (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-xl border space-y-1.5 bg-white hover:shadow-2xs transition ${
                      ev.isHoliday ? 'border-rose-200 bg-rose-50/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${badge.bg}`}>
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
                            title="Edit Event"
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
                            title="Delete Event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-[11px] text-gray-600 pt-1 border-t border-gray-100">{ev.description}</p>
                    )}
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
                {editingEvent ? 'Edit Event / Holiday (सम्पादन गर्नुहोस्)' : 'Add New Event / Holiday (कार्यक्रम तथा विदा थप्नुहोस्)'}
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
                  placeholder="e.g. First Term Exam, Teej Holiday, Sports Meet"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (नेपाली)</label>
                <input
                  type="text"
                  placeholder="उदा. प्रथम त्रैमासिक परीक्षा, तीज विदा, खेलकुद"
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

              <label className="flex items-center gap-2 cursor-pointer pt-1 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <input
                  type="checkbox"
                  checked={eventForm.isHoliday}
                  onChange={(e) => setEventForm({ ...eventForm, isHoliday: e.target.checked })}
                  className="rounded text-rose-600 h-4 w-4"
                />
                <div>
                  <span className="font-extrabold text-rose-800 block">Mark as School Holiday (विद्यालय विदा)</span>
                  <span className="text-[10px] text-rose-600 block">
                    यस दिनलाई हाजिरी पोर्टलमा स्वतः सार्वजनिक विदा (HOLIDAY) को रूपमा दर्ता गरिनेछ।
                  </span>
                </div>
              </label>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Details (विवरण)</label>
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
                  className="px-5 py-2 bg-[#1e3a5f] text-white font-bold rounded-xl shadow-xs hover:bg-[#2a5280]"
                >
                  {saveEventMutation.isPending ? 'Saving...' : 'Save Event (सुरक्षित गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
