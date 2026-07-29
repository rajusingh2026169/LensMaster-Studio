import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  UserCheck, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Filter, 
  Camera, 
  MapPin, 
  X 
} from 'lucide-react';
import { Booking, Employee, Team, CalendarItem } from '../types';
import { dbCalendar } from '../services/dbService';
import { useToast } from './Toast';

interface CalendarViewProps {
  bookings: Booking[];
  employees: Employee[];
  teams: Team[];
  calendarItems?: CalendarItem[];
}

export default function CalendarView({ bookings, employees, teams, calendarItems = [] }: CalendarViewProps) {
  const { showSuccess, showError } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterType, setFilterType] = useState<'all' | 'events' | 'leave' | 'team'>('all');

  // Modal State for adding custom leave or schedule note
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState<'event' | 'employee_leave' | 'team_booking'>('employee_leave');
  const [itemStatus, setItemStatus] = useState<'available' | 'busy' | 'leave'>('leave');
  const [itemEntityId, setItemEntityId] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format YYYY-MM-DD
  const formatDateStr = (d: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  // Get items for a date
  const getItemsForDate = (dateStr: string) => {
    const dateBookings = bookings.filter(b => b.bookingDate === dateStr);
    const dateCustomItems = calendarItems.filter(c => c.date === dateStr);
    return { dateBookings, dateCustomItems };
  };

  // Submit custom calendar item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) {
      showError('Please enter a title.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dbCalendar.add({
        title: itemTitle.trim(),
        date: selectedDateStr,
        type: itemType,
        status: itemStatus,
        entityId: itemEntityId || undefined,
        details: itemDetails.trim() || undefined,
      });
      showSuccess('Added schedule entry');
      setIsModalOpen(false);
      setItemTitle('');
      setItemDetails('');
    } catch (err: any) {
      showError('Failed to add entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete calendar item
  const handleDeleteItem = async (id: string) => {
    try {
      await dbCalendar.delete(id);
      showSuccess('Entry removed.');
    } catch (err) {
      showError('Failed to delete item.');
    }
  };

  const selectedDateItems = getItemsForDate(selectedDateStr);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Calendar & Team Schedule
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Track shoot dates, team deployments & photographer leave schedules.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-purple-500/20"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Add Schedule / Leave
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 font-display">
              {monthNames[month]} {year}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDateStr(new Date().toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center font-bold text-[11px] uppercase tracking-wider text-slate-400 py-2 border-b border-slate-100">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for month start offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-xl" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = formatDateStr(dayNum);
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              const { dateBookings, dateCustomItems } = getItemsForDate(dateStr);
              const totalItems = dateBookings.length + dateCustomItems.length;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-20 p-2 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                      : isToday
                      ? 'border-blue-300 bg-blue-50/30'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${
                      isToday
                        ? 'bg-blue-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]'
                        : isSelected
                        ? 'text-purple-900'
                        : 'text-slate-700'
                    }`}>
                      {dayNum}
                    </span>

                    {totalItems > 0 && (
                      <span className="text-[10px] font-extrabold bg-slate-900 text-white px-1.5 py-0.2 rounded-full">
                        {totalItems}
                      </span>
                    )}
                  </div>

                  {/* Badges preview */}
                  <div className="space-y-1">
                    {dateBookings.slice(0, 1).map((b) => (
                      <div
                        key={b.id}
                        className="text-[9px] font-bold truncate px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md"
                      >
                        📷 {b.customerName}
                      </div>
                    ))}
                    {dateCustomItems.slice(0, 1).map((c) => (
                      <div
                        key={c.id}
                        className={`text-[9px] font-bold truncate px-1.5 py-0.5 rounded-md ${
                          c.type === 'employee_leave'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {c.title}
                      </div>
                    ))}
                    {totalItems > 2 && (
                      <span className="text-[8px] text-slate-400 font-bold block">+ {totalItems - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details Sidebar (1 col) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Schedule Overview
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-0.5 font-display">
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </h3>
          </div>

          {/* Items List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {selectedDateItems.dateBookings.length === 0 && selectedDateItems.dateCustomItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No bookings or leaves scheduled for this date.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 text-xs font-bold text-purple-600 hover:underline"
                >
                  + Add Leave / Custom Event
                </button>
              </div>
            ) : (
              <>
                {/* Bookings on this date */}
                {selectedDateItems.dateBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                        Shoot Event
                      </span>
                      <span className="text-xs font-bold text-slate-900">₹{b.totalAmount}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{b.subType}</h4>
                    <p className="text-xs text-slate-600 font-medium">Customer: <strong>{b.customerName}</strong> ({b.customerPhone})</p>

                    {b.requirements?.venue && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {b.requirements.venue}
                      </p>
                    )}

                    {b.assignment?.teamName && (
                      <div className="mt-2 text-[11px] text-purple-700 font-semibold bg-purple-50 p-2 rounded-xl">
                        Assigned Team: <strong>{b.assignment.teamName}</strong>
                      </div>
                    )}
                  </div>
                ))}

                {/* Custom calendar entries / Leaves */}
                {selectedDateItems.dateCustomItems.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border space-y-2 relative group ${
                      c.type === 'employee_leave'
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-purple-50/50 border-purple-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        c.type === 'employee_leave'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {c.type === 'employee_leave' ? 'Staff Leave' : 'Schedule Note'}
                      </span>

                      <button
                        onClick={() => handleDeleteItem(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete entry"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                    {c.details && <p className="text-xs text-slate-600">{c.details}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ADD SCHEDULE / LEAVE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 font-display">
                Add Entry for {selectedDateStr}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entry Type</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="employee_leave">Employee Leave / Absence</option>
                  <option value="team_booking">Team Assignment Schedule</option>
                  <option value="event">General Studio Calendar Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Leave (Personal Work) or Studio Closed"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              {itemType === 'employee_leave' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee</label>
                  <select
                    value={itemEntityId}
                    onChange={(e) => setItemEntityId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional instructions..."
                  value={itemDetails}
                  onChange={(e) => setItemDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
