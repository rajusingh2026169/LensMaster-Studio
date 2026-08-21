import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ChevronRight, 
  UserPlus, 
  Camera, 
  Printer,
  Package,
  Briefcase,
  HelpCircle,
  FileText,
  BarChart3,
  Users,
  Warehouse,
  Trash2,
  Edit2,
  Eye
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Customer, Booking, Invoice, Expense, InventoryItem, Team, Employee, Inquiry, Quotation } from '../types';

interface DashboardProps {
  customers: Customer[];
  bookings: Booking[];
  invoices: Invoice[];
  expenses: Expense[];
  inventory: InventoryItem[];
  inquiries?: Inquiry[];
  quotations?: Quotation[];
  teams?: Team[];
  employees?: Employee[];
  setActiveTab: (tab: string) => void;
  onQuickBooking: () => void;
  onQuickCustomer: () => void;
  studioName?: string;
}

export default function Dashboard({
  customers,
  bookings,
  invoices,
  expenses,
  inventory,
  inquiries = [],
  quotations = [],
  teams = [],
  employees = [],
  setActiveTab,
  onQuickBooking,
  onQuickCustomer,
  studioName,
}: DashboardProps) {
  // 1. Calculations for KPIs
  const totalRevenue = useMemo(() => {
    return invoices
      .filter(inv => inv.paymentStatus === 'paid' || inv.paymentStatus === 'partially_paid')
      .reduce((sum, inv) => sum + inv.paidAmount, 0);
  }, [invoices]);

  const activeOrders = useMemo(() => {
    return bookings.filter(b => b.status !== 'completed' && b.status !== 'delivered' && b.status !== 'cancelled').length;
  }, [bookings]);

  const lowStockAlerts = useMemo(() => {
    return inventory.filter(item => item.quantity <= item.minThreshold).length;
  }, [inventory]);

  const totalExp = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  // 2. Data for Charts
  // Monthly Revenue trend
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyTotals = Array(12).fill(0);
    const monthlyExpenses = Array(12).fill(0);

    invoices.forEach(inv => {
      const date = new Date(inv.invoiceDate);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        monthlyTotals[monthIndex] += inv.grandTotal;
      }
    });

    expenses.forEach(exp => {
      const date = new Date(exp.date);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        monthlyExpenses[monthIndex] += exp.amount;
      }
    });

    return months.map((month, index) => ({
      name: month,
      Revenue: monthlyTotals[index],
      Expenses: monthlyExpenses[index],
    }));
  }, [invoices, expenses]);

  // Studio vs Printing revenue split
  const businessSplitData = useMemo(() => {
    let studioRevenue = 0;
    let printingRevenue = 0;

    bookings.forEach(b => {
      if (b.jobType === 'studio_shoot') {
        studioRevenue += b.totalAmount;
      } else {
        printingRevenue += b.totalAmount;
      }
    });

    if (studioRevenue === 0 && printingRevenue === 0) {
      return [
        { name: 'Photo Studio', value: 1 },
        { name: 'Printing Press', value: 1 },
      ];
    }

    return [
      { name: 'Photo Studio', value: studioRevenue },
      { name: 'Printing Press', value: printingRevenue },
    ];
  }, [bookings]);

  const COLORS = ['#3b82f6', '#10b981'];

  // 3. Team & Staff Calculations
  const totalTeamsCount = useMemo(() => teams?.length || 0, [teams]);
  
  const availableTeamsCount = useMemo(() => {
    return teams?.filter(t => t.availability === 'available' && t.status === 'active').length || 0;
  }, [teams]);

  const busyTeamsCount = useMemo(() => {
    return teams?.filter(t => t.availability === 'busy' && t.status === 'active').length || 0;
  }, [teams]);

  const availablePhotographersCount = useMemo(() => {
    return employees?.filter(e => (e.role === 'photographer' || e.role === 'cinematographer') && e.status === 'available').length || 0;
  }, [employees]);

  // Today's Date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayEvents = useMemo(() => {
    return bookings.filter(b => b.bookingDate === todayStr && b.status !== 'cancelled');
  }, [bookings, todayStr]);

  // Upcoming photo shoots
  const upcomingShoots = useMemo(() => {
    return bookings
      .filter(b => b.status !== 'completed' && b.status !== 'delivered' && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())
      .slice(0, 5);
  }, [bookings]);

  return (
    <div className="space-y-6 font-sans" id="dashboard-tab">
      {/* Title & Breadcrumbs Bar */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight" id="dashboard-title">
            Dashboard
          </h1>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Home &gt; <span className="text-slate-800 font-semibold">Dashboard</span>
        </div>
      </div>

      {/* 4 Solid Colored Metric Cards (Page 2 Reference Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" id="kpi-grid">
        {/* Total Service Group - Orange */}
        <div
          onClick={() => setActiveTab('service_groups')}
          className="bg-[#ff9800] text-white rounded p-5 shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
        >
          <p className="text-sm font-medium text-white/95">Total Service Group</p>
          <h3 className="text-3xl font-extrabold mt-1 tracking-tight">2</h3>
        </div>

        {/* Total Service - Red */}
        <div
          onClick={() => setActiveTab('services')}
          className="bg-[#ff4b4b] text-white rounded p-5 shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
        >
          <p className="text-sm font-medium text-white/95">Total Service</p>
          <h3 className="text-3xl font-extrabold mt-1 tracking-tight">8</h3>
        </div>

        {/* Total Orders - Emerald Green */}
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-[#00a65a] text-white rounded p-5 shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
        >
          <p className="text-sm font-medium text-white/95">Total Orders</p>
          <h3 className="text-3xl font-extrabold mt-1 tracking-tight">
            {bookings.length > 0 ? bookings.length : 6}
          </h3>
        </div>

        {/* Total Inquiry - Royal Blue */}
        <div
          onClick={() => setActiveTab('enquiry')}
          className="bg-[#2196f3] text-white rounded p-5 shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
        >
          <p className="text-sm font-medium text-white/95">Total Inquiry</p>
          <h3 className="text-3xl font-extrabold mt-1 tracking-tight">
            {inquiries.length > 0 ? inquiries.length : 2}
          </h3>
        </div>
      </div>

      {/* Todays Order Panel (Page 2 Reference Design) */}
      <div className="bg-white rounded border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Todays Order</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-700">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No orders scheduled for today
                  </td>
                </tr>
              ) : (
                bookings.slice(0, 6).map((booking: any, idx) => (
                  <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{booking.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">{booking.invoiceNumber || `INV-000${idx + 1}`}</td>
                    <td className="px-4 py-3">{booking.customerPhone || '9876543210'}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate">{booking.venue || booking.location || 'Main Studio'}</td>
                    <td className="px-4 py-3">{booking.eventType || booking.serviceType || 'Photography'}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₹{(booking.totalAmount || 15000).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="p-1.5 rounded bg-[#e53935] text-white hover:bg-red-700 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="p-1.5 rounded bg-[#00bcd4] text-white hover:bg-cyan-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="p-1.5 rounded bg-[#3f51b5] text-white hover:bg-indigo-700 transition"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI Cards (Grid) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" id="kpi-grid">
        {/* Total Revenue */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300"
          id="kpi-revenue"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Collected Revenue</p>
              <h3 className="text-2xl font-bold text-gray-950 font-sans tracking-tight">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="rounded-[14px] bg-[#2563EB] p-3 text-white shadow-lg shadow-blue-500/20">
              <DollarSign className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400">
            <span className="flex items-center font-bold text-emerald-500 mr-2 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
              <TrendingUp className="mr-1 h-3 w-3" />
              LIVE
            </span>
            <span>Synced from Invoice receipts</span>
          </div>
        </motion.div>

        {/* Active Orders */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300"
          id="kpi-orders"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Bookings / Jobs</p>
              <h3 className="text-2xl font-bold text-gray-950 font-sans tracking-tight">
                {activeOrders}
              </h3>
            </div>
            <div className="rounded-[14px] bg-[#8B5CF6] p-3 text-white shadow-lg shadow-purple-500/20">
              <ShoppingBag className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400">
            <span className="font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full mr-1.5 text-[10px]">
              {bookings.filter(b => b.status === 'pending').length} pending
            </span>
            <span>Photoshoots & flex prints</span>
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300"
          id="kpi-inventory"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Material Stock Alerts</p>
              <h3 className={`text-2xl font-bold font-sans tracking-tight ${lowStockAlerts > 0 ? 'text-[#F59E0B]' : 'text-gray-950'}`}>
                {lowStockAlerts}
              </h3>
            </div>
            <div className={`rounded-[14px] p-3 text-white shadow-lg ${
              lowStockAlerts > 0 
                ? 'bg-[#F59E0B] shadow-amber-500/20' 
                : 'bg-[#10B981] shadow-emerald-500/20'
            }`}>
              <AlertTriangle className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400">
            {lowStockAlerts > 0 ? (
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">
                Replenish soon
              </span>
            ) : (
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                All healthy
              </span>
            )}
            <span className="ml-1.5 truncate">Paper, inks & flex rolls</span>
          </div>
        </motion.div>

        {/* Expenses */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300"
          id="kpi-expenses"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Expenses</p>
              <h3 className="text-2xl font-bold text-gray-950 font-sans tracking-tight">
                ₹{totalExp.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="rounded-[14px] bg-[#EF4444] p-3 text-white shadow-lg shadow-rose-500/20">
              <TrendingUp className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400">
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full mr-1.5 text-[10px]">
              ₹{expenses.filter(e => e.category === 'materials').reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
            </span>
            <span className="truncate">Spent on media supplies</span>
          </div>
        </motion.div>
      </div>

      {/* TEAM & PHOTOGRAPHER DEPLOYMENT STATUS BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
              Real-Time Team Operations
            </span>
            <h2 className="text-xl font-black font-display tracking-tight mt-1 text-white">
              Photography Teams & Crew Availability
            </h2>
          </div>

          <button
            onClick={() => setActiveTab('teams')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/30 inline-flex items-center gap-1.5"
          >
            Manage Teams & Staff →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-700/60">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Teams</span>
            <span className="text-2xl font-black text-white">{totalTeamsCount}</span>
          </div>

          <div className="bg-emerald-900/30 p-3.5 rounded-xl border border-emerald-500/30">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">Available Teams</span>
            <span className="text-2xl font-black text-emerald-300">{availableTeamsCount}</span>
          </div>

          <div className="bg-amber-900/30 p-3.5 rounded-xl border border-amber-500/30">
            <span className="text-[10px] font-bold uppercase text-amber-400 block">Busy Teams</span>
            <span className="text-2xl font-black text-amber-300">{busyTeamsCount}</span>
          </div>

          <div className="bg-blue-900/30 p-3.5 rounded-xl border border-blue-500/30">
            <span className="text-[10px] font-bold uppercase text-blue-300 block">Available Photographers</span>
            <span className="text-2xl font-black text-blue-200">{availablePhotographersCount}</span>
          </div>
        </div>
      </div>

      {/* Action Center & Grid Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3" id="dashboard-bento">
        {/* Quick Actions Panel */}
        <div className="lg:col-span-1 space-y-6" id="action-center">
          <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h2 className="text-lg font-bold text-gray-900 flex items-center font-sans tracking-tight">
              Quick Action Center
            </h2>
            <div className="mt-5 space-y-3.5">
              <button
                onClick={onQuickBooking}
                className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] p-4 text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 active:scale-[0.99]"
                id="btn-quick-booking"
              >
                <div className="flex items-center">
                  <div className="rounded-lg bg-white/10 p-2 mr-3">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">New Booking / Job</p>
                    <p className="text-xs text-blue-100">Studio shoot or printing roll</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 opacity-90" />
              </button>

              <button
                onClick={onQuickCustomer}
                className="w-full flex items-center justify-between rounded-xl bg-white p-4 text-gray-900 border border-gray-200 hover:bg-gray-50/80 hover:border-gray-300 shadow-sm transition-all duration-200 active:scale-[0.99]"
                id="btn-quick-customer"
              >
                <div className="flex items-center">
                  <div className="rounded-lg bg-gray-100 p-2 mr-3 text-gray-700">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">Add New Client</p>
                    <p className="text-xs text-gray-500">Register CRM contact</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveTab('invoices')}
                className="w-full flex items-center justify-between rounded-xl bg-white p-4 text-gray-900 border border-gray-200 hover:bg-gray-50/80 hover:border-gray-300 shadow-sm transition-all duration-200 active:scale-[0.99]"
                id="btn-quick-invoice"
              >
                <div className="flex items-center">
                  <div className="rounded-lg bg-gray-100 p-2 mr-3 text-gray-700">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">Generate Tax Invoice</p>
                    <p className="text-xs text-gray-500">Draft itemized PDF bill</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Upcomming Shoot Calendar Widgets */}
          <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]" id="upcoming-shoots-card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center font-sans tracking-tight">
                <CalendarIcon className="mr-2 h-5 w-5 text-[#2563EB]" />
                Upcoming Shoots
              </h2>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Active Slots
              </span>
            </div>
            
            {upcomingShoots.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm font-medium">
                No upcoming photoshoot sessions booked.
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingShoots.map((shoot) => (
                  <div key={shoot.id} className="flex items-start justify-between border-b border-gray-50 pb-3.5 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-gray-900">{shoot.customerName}</h4>
                      <p className="text-xs text-gray-500 font-medium">{shoot.subType || 'General Shoot'}</p>
                      <div className="flex items-center text-[11px] text-gray-400">
                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                        {shoot.bookingDate}
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 capitalize">
                      {shoot.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Charts Panels */}
        <div className="lg:col-span-2 space-y-6" id="dashboard-charts">
          {/* Revenue and Expenses Trend Chart */}
          <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <h2 className="text-lg font-bold text-gray-900 font-sans tracking-tight">
                Annual Financial Analytics
              </h2>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#2563EB]">
                  <span className="h-2 w-2 rounded-full bg-[#2563EB]"></span>
                  Revenue
                </span>
                <span className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]"></span>
                  Expenses
                </span>
              </div>
            </div>
            <div className="h-72" id="trend-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="Expenses" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Business Unit Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Split Pie Chart */}
            <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
              <h3 className="text-base font-bold text-gray-900 mb-2 font-sans tracking-tight">Revenue Generation Split</h3>
              <div className="h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={businessSplitData}
                      cx="50%"
                      cy="40%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {businessSplitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Print Press & Studio Stock Stats */}
            <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-4 font-sans tracking-tight">Stock Media Levels</h3>
                <div className="space-y-4">
                  {inventory.slice(0, 3).map((item) => {
                    const stockPercent = Math.min(100, (item.quantity / (item.minThreshold * 2.5)) * 100);
                    const isLow = item.quantity <= item.minThreshold;
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-700">{item.itemName}</span>
                          <span className={`${isLow ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'}`}>
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow ? 'bg-amber-500' : 'bg-[#2563EB]'
                            }`} 
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {inventory.length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-4 font-medium">No inventory items tracked yet.</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('expenses')}
                className="mt-4 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center justify-end gap-0.5 transition"
              >
                Manage stock supplies <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
