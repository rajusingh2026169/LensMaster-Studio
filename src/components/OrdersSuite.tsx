import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  Camera,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  UserCheck
} from 'lucide-react';
import { Booking, WorkOrder, Customer, Team, Employee, BookingStatus } from '../types';

interface OrdersSuiteProps {
  bookings: Booking[];
  orders: WorkOrder[];
  customers: Customer[];
  teams: Team[];
  employees: Employee[];
  activeSubSection?: string;
  onNewBooking?: () => void;
  onOpenWorkOrder?: (order: WorkOrder) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

const ORDER_STATUS_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'editing', label: 'Editing' },
  { id: 'printing', label: 'Printing' },
  { id: 'ready', label: 'Ready' },
  { id: 'delivered', label: 'Delivered' }
];

export default function OrdersSuite({
  bookings = [],
  orders = [],
  customers = [],
  teams = [],
  employees = [],
  activeSubSection = 'order_list',
  onNewBooking,
  onOpenWorkOrder,
  onStatusChange
}: OrdersSuiteProps) {
  const [activeTab, setActiveTab] = useState<string>(activeSubSection || 'order_list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize when sidebar sub-item is clicked
  React.useEffect(() => {
    if (activeSubSection) {
      setActiveTab(activeSubSection);
    }
  }, [activeSubSection]);

  // Combined order list filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const titleStr = b.subType || b.requirements?.eventType || '';
      const matchSearch = 
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        titleStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.bookingDate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      if (statusFilter === 'all') return true;

      // Map BookingStatus to our 5 Order Statuses (Pending, Editing, Printing, Ready, Delivered)
      const mapped = 
        b.status === 'designing' ? 'editing' :
        b.status === 'completed' ? 'ready' :
        b.status || 'pending';

      return mapped === statusFilter;
    });
  }, [bookings, searchTerm, statusFilter]);

  // Sub-navigation tabs matching sequence
  const subNav = [
    { id: 'order_list', label: 'Order List', icon: Briefcase },
    { id: 'work_order', label: 'Work Order', icon: FileText },
    { id: 'team_assignment', label: 'Team Assignment', icon: Users },
    { id: 'event_schedule', label: 'Event Schedule', icon: Calendar },
    { id: 'delivery_status', label: 'Delivery Status', icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders & Production Management</h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage photography shoots, album design workflows, flex/banner printing, and client deliveries.
          </p>
        </div>

        <button
          onClick={onNewBooking}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Order / Booking
        </button>
      </div>

      {/* Sub-navigation pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {subNav.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'}
              `}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. ORDER LIST VIEW */}
      {activeTab === 'order_list' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {ORDER_STATUS_TABS.map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition
                    ${statusFilter === st.id 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                  `}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, client..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-800">No matching orders found</h3>
                <p className="text-xs text-slate-500 mt-1">Try changing the status filter or search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3.5">Order / Event</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => {
                      const statusLabel =
                        b.status === 'designing' ? 'Editing' :
                        b.status === 'printing' ? 'Printing' :
                        b.status === 'completed' ? 'Ready' :
                        b.status === 'delivered' ? 'Delivered' :
                        'Pending';

                      const statusBadgeColor =
                        statusLabel === 'Delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        statusLabel === 'Ready' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        statusLabel === 'Printing' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                        statusLabel === 'Editing' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-800 border-slate-300';

                      const venueStr = b.requirements?.venue || '';
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 font-bold text-slate-900">
                            {b.subType || b.requirements?.eventType || 'Photography Shoot'}
                            {venueStr && <p className="text-[10px] text-slate-500 font-normal mt-0.5">{venueStr}</p>}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700">
                            {b.customerName}
                            <p className="text-[10px] text-slate-400">{b.customerPhone}</p>
                          </td>
                          <td className="p-3.5 text-slate-600 font-medium">{b.bookingDate}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              b.jobType === 'printing_press' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {b.jobType === 'printing_press' ? 'Printing Press' : 'Studio Shoot'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-black text-slate-900">
                            ₹{(b.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${statusBadgeColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. WORK ORDER VIEW */}
      {activeTab === 'work_order' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Production Work Orders ({orders.length})</h3>
            <p className="text-xs text-slate-500">Detailed production instructions and assigned crew orders</p>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-black text-slate-700">No active work orders</h3>
              <p className="text-xs text-slate-500">Work orders generated from quotations or bookings will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map(wo => (
                <div key={wo.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-600 text-xs">{wo.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                      {wo.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{wo.eventType}</h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{wo.customerName} • {wo.customerPhone}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span>Date: {wo.eventDate}</span>
                    <button
                      onClick={() => onOpenWorkOrder && onOpenWorkOrder(wo)}
                      className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. TEAM ASSIGNMENT VIEW */}
      {activeTab === 'team_assignment' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Team & Staff Assignments ({teams.length} Teams)</h3>
            <p className="text-xs text-slate-500">Crew rosters for photography, cinematography, drone, and print production</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teams.map(team => (
              <div key={team.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm">{team.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    team.availability === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {team.availability}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold">
                  Leader: <span className="text-slate-800">{team.leaderName || 'Unassigned'}</span>
                </p>
                <div className="text-[11px] text-slate-500 font-medium">
                  {(team.memberIds || []).length} team members assigned
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. EVENT SCHEDULE VIEW */}
      {activeTab === 'event_schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Upcoming Event Schedule</h3>
            <p className="text-xs text-slate-500">Chronological calendar of photography shoots and print job deliveries</p>
          </div>

          <div className="space-y-3">
            {bookings
              .slice()
              .sort((a, b) => (a.bookingDate || '').localeCompare(b.bookingDate || ''))
              .map(b => (
                <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex flex-col items-center justify-center shrink-0">
                      <span>{b.bookingDate?.split('-')[2] || '—'}</span>
                      <span className="text-[9px] uppercase">{b.bookingDate?.split('-')[1] ? `M${b.bookingDate.split('-')[1]}` : '—'}</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{b.subType || b.requirements?.eventType || 'Booking'}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{b.customerName} • {b.requirements?.venue || 'Studio'}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                    {b.status || 'Pending'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. DELIVERY STATUS VIEW */}
      {activeTab === 'delivery_status' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Order Delivery Status Tracker</h3>
            <p className="text-xs text-slate-500">Track album printing, photo editing, and physical print delivery progress</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map(b => {
              const isDelivered = b.status === 'delivered' || b.status === 'completed';
              return (
                <div key={b.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{b.subType || b.requirements?.eventType || 'Order'}</h4>
                    <p className="text-xs text-slate-500">{b.customerName} • ₹{b.totalAmount}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {isDelivered ? 'Delivered' : 'In Production'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
