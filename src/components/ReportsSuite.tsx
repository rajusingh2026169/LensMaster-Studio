import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  Users,
  UserCheck,
  Download,
  Printer,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  PieChart,
  ShieldCheck,
  Box
} from 'lucide-react';
import { Booking, Invoice, Expense, Customer, Employee, WorkOrder, InventoryItem } from '../types';

interface ReportsSuiteProps {
  bookings: Booking[];
  invoices: Invoice[];
  expenses: Expense[];
  customers: Customer[];
  employees: Employee[];
  orders?: WorkOrder[];
  inventory?: InventoryItem[];
  activeSubSection?: string;
  studioName?: string;
}

export default function ReportsSuite({
  bookings = [],
  invoices = [],
  expenses = [],
  customers = [],
  employees = [],
  orders = [],
  inventory = [],
  activeSubSection = 'daily',
  studioName = 'Studio'
}: ReportsSuiteProps) {
  const [activeReport, setActiveReport] = useState<string>(activeSubSection || 'daily');
  const [dateFilter, setDateFilter] = useState<'today' | 'this_month' | 'last_month' | 'year' | 'all'>('this_month');

  // Update active report if parent prop changes
  React.useEffect(() => {
    if (activeSubSection) {
      setActiveReport(activeSubSection);
    }
  }, [activeSubSection]);

  // Real data calculations
  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [invoices]);

  const totalReceived = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  }, [invoices]);

  const totalDue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + ((inv.grandTotal || 0) - (inv.paidAmount || 0)), 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [expenses]);

  const netProfit = totalRevenue - totalExpenses;

  // Today calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = useMemo(() => {
    return bookings.filter(b => b.bookingDate?.startsWith(todayStr) || b.createdAt?.startsWith(todayStr));
  }, [bookings, todayStr]);

  const todayInvoices = useMemo(() => {
    return invoices.filter(i => i.invoiceDate?.startsWith(todayStr) || i.createdAt?.startsWith(todayStr));
  }, [invoices, todayStr]);

  const todayRevenue = todayInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const todayReceived = todayInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const todayExpenses = expenses.filter(e => e.date?.startsWith(todayStr) || e.createdAt?.startsWith(todayStr))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // GST Calculation
  const totalGstCollected = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.tax || (inv.grandTotal * 0.18 / 1.18) || 0), 0);
  }, [invoices]);

  const reportTabs = [
    { id: 'daily', label: 'Daily Report', icon: Clock },
    { id: 'monthly', label: 'Monthly Report', icon: Calendar },
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'expense', label: 'Expense Report', icon: DollarSign },
    { id: 'profit_loss', label: 'Profit & Loss', icon: BarChart3 },
    { id: 'gst', label: 'GST Report', icon: FileText },
    { id: 'customer', label: 'Customer Report', icon: Users },
    { id: 'employee', label: 'Employee Report', icon: UserCheck },
    { id: 'inventory', label: 'Inventory Report', icon: Box }
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.invoiceDate,
      inv.customerName,
      inv.grandTotal,
      inv.paidAmount,
      inv.grandTotal - inv.paidAmount,
      inv.paymentStatus
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Invoice Number,Date,Customer,Total,Paid,Due,Status", ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${studioName}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Financial & Studio Reports</h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time analytics across photography bookings, printing press orders, invoicing, GST, and payroll.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-slate-200">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all
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

      {/* Top Summary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mt-2">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>₹{totalReceived.toLocaleString('en-IN')} Received</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses & Overheads</p>
          <p className="text-2xl font-black text-rose-600 mt-1">₹{totalExpenses.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold mt-2">
            <span>{expenses.length} expense entries recorded</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit / Margin</p>
          <p className={`text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{netProfit.toLocaleString('en-IN')}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-2">
            {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% profit margin` : 'No revenue yet'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Receivables</p>
          <p className="text-2xl font-black text-amber-600 mt-1">₹{totalDue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 font-semibold mt-2">
            Outstanding customer balances
          </p>
        </div>
      </div>

      {/* 1. DAILY REPORT */}
      {activeReport === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Daily Summary Report ({todayStr})</h3>
              <p className="text-xs text-slate-500">Live operational stats and cashflow for today</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full border border-emerald-200">
              Live Today
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase">Today's Invoiced Revenue</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{todayRevenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1">₹{todayReceived.toLocaleString('en-IN')} collected today</p>
            </div>
            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100">
              <p className="text-xs font-bold text-rose-700 uppercase">Today's Expenses</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{todayExpenses.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1">Operational & press costs today</p>
            </div>
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 uppercase">Today's Net Cashflow</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{(todayReceived - todayExpenses).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1">Received cash minus cash out</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-3">Today's Bookings & Orders ({todayBookings.length})</h4>
            {todayBookings.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No bookings scheduled or created today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Event / Service</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-bold text-slate-900">{b.title || b.eventType || 'Booking'}</td>
                        <td className="p-3 font-semibold text-slate-700">{b.customerName}</td>
                        <td className="p-3 text-slate-500">{b.date}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                            {b.jobType || 'Photography'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">₹{(b.totalAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MONTHLY REPORT */}
      {activeReport === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Monthly Revenue & Performance Summary</h3>
            <p className="text-xs text-slate-500">Total monthly invoices, collections, and net earnings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Monthly Revenue</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">{invoices.length} invoices generated</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Collections</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {totalRevenue > 0 ? `${((totalReceived / totalRevenue) * 100).toFixed(0)}% collection efficiency` : 'N/A'}
              </p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Average Ticket Size</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                ₹{invoices.length ? Math.round(totalRevenue / invoices.length).toLocaleString('en-IN') : 0}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Per booking / invoice average</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-3">Invoice Register</h4>
            {invoices.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No invoices found in record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Due</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => {
                      const due = (inv.grandTotal || 0) - (inv.paidAmount || 0);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-3 font-extrabold text-blue-600">{inv.invoiceNumber}</td>
                          <td className="p-3 text-slate-500">{inv.invoiceDate}</td>
                          <td className="p-3 font-semibold text-slate-800">{inv.customerName}</td>
                          <td className="p-3 text-right font-black text-slate-900">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{due > 0 ? `₹${due.toLocaleString('en-IN')}` : '₹0'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              due <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {due <= 0 ? 'Paid' : 'Pending'}
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

      {/* 3. SALES REPORT */}
      {activeReport === 'sales' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Sales & Department Revenue Breakdown</h3>
            <p className="text-xs text-slate-500">Photography Studio vs. Printing Press revenue comparison</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 uppercase">Photography & Videography Sales</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded">Studio</span>
              </div>
              <p className="text-3xl font-black text-slate-900 mt-2">
                ₹{bookings.filter(b => b.jobType !== 'printing_press').reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {bookings.filter(b => b.jobType !== 'printing_press').length} total studio jobs
              </p>
            </div>

            <div className="p-5 bg-purple-50/50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 uppercase">Printing Press & Production Sales</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded">Press</span>
              </div>
              <p className="text-3xl font-black text-slate-900 mt-2">
                ₹{bookings.filter(b => b.jobType === 'printing_press').reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {bookings.filter(b => b.jobType === 'printing_press').length} total press jobs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXPENSE REPORT */}
      {activeReport === 'expense' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Expense & Overheads Report</h3>
            <p className="text-xs text-slate-500">Categorized studio equipment, printing ink/paper, rent, and vendor costs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Recorded Expenses</p>
              <p className="text-2xl font-black text-rose-600 mt-1">₹{totalExpenses.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Expense Transactions</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{expenses.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Average Expense Ticket</p>
              <p className="text-2xl font-black text-slate-700 mt-1">
                ₹{expenses.length ? Math.round(totalExpenses / expenses.length).toLocaleString('en-IN') : 0}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-3">All Expense Records ({expenses.length})</h4>
            {expenses.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <DollarSign className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No expenses recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Title / Reason</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{exp.description || 'Expense'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                            {exp.category || 'General'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{exp.date}</td>
                        <td className="p-3 text-slate-600 font-semibold uppercase">{(exp as any).paymentMethod || 'Cash'}</td>
                        <td className="p-3 text-right font-black text-rose-600">₹{(exp.amount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PROFIT & LOSS REPORT */}
      {activeReport === 'profit_loss' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Profit & Loss Statement (P&L)</h3>
            <p className="text-xs text-slate-500">Comprehensive summary of business revenues, operational expenses, and net profit</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-4 max-w-2xl">
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-700">Gross Operating Revenue (Invoiced)</span>
              <span className="text-base font-black text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm font-bold text-rose-600">Total Operational Expenses</span>
              <span className="text-base font-black text-rose-600">- ₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300">
              <span className="text-base font-black text-slate-900">Net Profit / Margin</span>
              <span className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{netProfit.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-2">
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${totalRevenue > 0 ? Math.max(0, Math.min(100, (netProfit / totalRevenue) * 100)) : 50}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-1 text-right">
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% Net Margin` : '0% Margin'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. GST REPORT */}
      {activeReport === 'gst' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">GST Compliance & Tax Summary</h3>
            <p className="text-xs text-slate-500">18% GST collection summary for photography & printing services</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Estimated Taxable Amount</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ₹{Math.round(totalRevenue / 1.18).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Net base price before tax</p>
            </div>

            <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs font-bold text-blue-700 uppercase">Total GST Output (18%)</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                ₹{Math.round(totalGstCollected).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">CGST 9% + SGST 9% combined</p>
            </div>

            <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase">Total Invoice Value (incl. GST)</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Gross sales to clients</p>
            </div>
          </div>
        </div>
      )}

      {/* 7. CUSTOMER REPORT */}
      {activeReport === 'customer' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Customer & CRM Analysis Report</h3>
            <p className="text-xs text-slate-500">Client retention, repeat bookings, and top customer contributions</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Registered Clients</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{customers.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Jobs / Bookings</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{bookings.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Avg Jobs Per Client</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {customers.length ? (bookings.length / customers.length).toFixed(1) : '0'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-3">Client Roster ({customers.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 font-semibold text-slate-700">{c.phone}</td>
                      <td className="p-3 text-slate-500">{c.email || '—'}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[200px]">{c.address || '—'}</td>
                      <td className="p-3 text-slate-500">{c.createdAt ? c.createdAt.slice(0, 10) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. EMPLOYEE REPORT */}
      {activeReport === 'employee' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Employee & Crew Productivity Report</h3>
            <p className="text-xs text-slate-500">Photographers, editors, and printing press operators roster and salary report</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Employees</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{employees.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Monthly Payroll Cost</p>
              <p className="text-2xl font-black text-rose-600 mt-1">
                ₹{employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Active Staff</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {employees.filter(e => e.status === 'available' || e.employeeStatus === 'Active').length}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-3">Employee Register ({employees.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">EMP ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Salary</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-600">{emp.employeeCustomId || emp.id.slice(0, 8)}</td>
                      <td className="p-3 font-extrabold text-slate-900">{emp.name}</td>
                      <td className="p-3 uppercase font-semibold text-slate-700">{emp.role}</td>
                      <td className="p-3 text-slate-500">{emp.phone}</td>
                      <td className="p-3 text-right font-black text-slate-900">₹{(emp.salary || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                          {emp.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. INVENTORY REPORT */}
      {activeReport === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Inventory & Stock Valuation Report</h3>
            <p className="text-xs text-slate-500">Printing media, photo paper, framing raw materials, and studio consumables</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Items in Stock</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{inventory.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Stock Valuation</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                ₹{inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Low Stock Alerts</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {inventory.filter(item => (item.quantity || 0) <= (item.minThreshold || 5)).length}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-3">Inventory Stock Ledger ({inventory.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 text-center">In Stock</th>
                    <th className="p-3 text-center">Min Threshold</th>
                    <th className="p-3 text-right">Unit Rate</th>
                    <th className="p-3 text-right">Total Value</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                        No inventory stock items recorded yet.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => {
                      const totalVal = (item.quantity || 0) * (item.rate || 0);
                      const isLow = (item.quantity || 0) <= (item.minThreshold || 5);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{item.itemName}</td>
                          <td className="p-3 text-center font-bold text-slate-900">{item.quantity} {item.unit || 'units'}</td>
                          <td className="p-3 text-center text-slate-500">{item.minThreshold || 5} {item.unit || 'units'}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-black text-slate-900">₹{totalVal.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
