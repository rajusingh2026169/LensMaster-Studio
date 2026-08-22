import React, { useState, useMemo, useRef } from 'react';
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
  UserCheck,
  Download,
  Share2,
  MessageCircle,
  Copy,
  Check,
  X,
  CreditCard,
  QrCode,
  DollarSign
} from 'lucide-react';
import { Booking, WorkOrder, Customer, Team, Employee, Invoice } from '../types';
import { downloadElementAsPDF, printElement } from '../utils/printPdfUtils';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'motion/react';

interface OrdersSuiteProps {
  bookings: Booking[];
  orders: WorkOrder[];
  customers: Customer[];
  teams: Team[];
  employees: Employee[];
  invoices?: Invoice[];
  studioProfile?: any;
  studioSettings?: any;
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
  invoices = [],
  studioProfile,
  studioSettings,
  activeSubSection = 'order_list',
  onNewBooking,
  onOpenWorkOrder,
  onStatusChange
}: OrdersSuiteProps) {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<string>(activeSubSection || 'order_list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        b.bookingDate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customerPhone && b.customerPhone.includes(searchTerm));
      
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

  // Studio metadata for invoices
  const studioData = useMemo(() => {
    const bName = studioSettings?.businessName || studioProfile?.businessName || studioSettings?.studioName || studioProfile?.studioName || 'Dazz Photography Studio';
    const logo = studioSettings?.studioLogo || studioProfile?.studioLogo || '';
    const owner = studioSettings?.ownerName || studioProfile?.ownerName || 'Studio Manager';
    const mobile = studioSettings?.mobileNumber || studioProfile?.mobileNumber || '9876543210';
    const bEmail = studioSettings?.email || studioProfile?.email || 'contact@dazzphotography.com';
    const bAddress = studioSettings?.address || studioProfile?.address || 'Khaga, Fatehpur, Uttar Pradesh - 212655';
    const gst = studioSettings?.gstNumber || studioProfile?.gstNumber || '09AAAAA0000A1Z5';
    const panVal = studioSettings?.pan || '';
    const upi = studioSettings?.upiId || 'dazzphotography@upi';
    const rawTerms = studioSettings?.terms || '1. All disputes are subject to local jurisdiction.\n2. 50% advance required for booking confirmation.\n3. Goods & prints once approved cannot be returned.\n4. Balance due payable before final delivery of photo albums/media.';
    const termsArray = rawTerms.split('\n').filter((t: string) => t.trim());
    const authSig = studioSettings?.authorizedSignatory || owner;
    const invoiceFooter = studioSettings?.invoiceFooter || 'Thank you for choosing us to capture your special moments!';

    return {
      bName,
      logo,
      owner,
      mobile,
      bEmail,
      bAddress,
      gst,
      panVal,
      upi,
      termsArray,
      authSig,
      invoiceFooter
    };
  }, [studioProfile, studioSettings]);

  // Handle Print Action for an Order / Booking
  const handlePrintOrderInvoice = (booking: Booking) => {
    setSelectedBookingForInvoice(booking);
    // Allow DOM to update if modal is opening or use hidden printable element
    setTimeout(() => {
      const elementId = `order-printable-invoice-${booking.id}`;
      const printed = printElement(elementId, `Invoice_${booking.customerName}_${booking.id.slice(0, 6)}`);
      if (printed) {
        showSuccess(`Printing invoice for ${booking.customerName}`);
      } else {
        // If hidden element not found, open modal for direct printing
        setIsInvoiceModalOpen(true);
      }
    }, 150);
  };

  // Handle Download PDF Action for an Order / Booking
  const handleDownloadOrderPDF = async (booking: Booking) => {
    setSelectedBookingForInvoice(booking);
    setIsDownloadingPdf(true);
    try {
      const elementId = `order-printable-invoice-${booking.id}`;
      const safeName = booking.customerName.replace(/[^a-zA-Z0-9]/g, '_');
      const invoiceNo = `INV-${booking.id.slice(0, 6).toUpperCase()}`;
      
      const success = await downloadElementAsPDF({
        elementId,
        filename: `Invoice_${safeName}_${invoiceNo}.pdf`,
        orientation: 'portrait'
      });

      if (success) {
        showSuccess(`Downloaded Invoice for ${booking.customerName}`);
      } else {
        showError('Could not generate PDF. Please try the Print option.');
      }
    } catch (err: any) {
      showError(`PDF Download failed: ${err?.message || err}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle Share WhatsApp Action
  const handleShareWhatsApp = (booking: Booking) => {
    const total = booking.totalAmount || 0;
    const advance = booking.advancePaid || 0;
    const balance = Math.max(0, total - advance);
    const invoiceNo = `INV-${booking.id.slice(0, 6).toUpperCase()}`;
    const cleanPhone = (booking.customerPhone || '').replace(/[^0-9]/g, '');

    const message = 
`📸 *${studioData.bName.toUpperCase()}*
🧾 *TAX INVOICE & ORDER SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Client Name:* ${booking.customerName}
📄 *Invoice No:* ${invoiceNo}
📅 *Event/Job Date:* ${booking.bookingDate || 'N/A'}
🎯 *Service:* ${booking.subType || booking.requirements?.eventType || 'Photography Shoot'}
📍 *Location:* ${booking.requirements?.venue || 'Studio'}

💰 *Total Amount:* ₹${total.toLocaleString('en-IN')}
✅ *Advance Paid:* ₹${advance.toLocaleString('en-IN')}
⚠️ *Balance Due:* ₹${balance.toLocaleString('en-IN')}
📊 *Status:* ${(booking.status || 'Pending').toUpperCase()}

💳 *UPI Payment:* ${studioData.upi}
📞 *Helpline:* ${studioData.mobile}
━━━━━━━━━━━━━━━━━━━━━━━━
✨ _Thank you for your business! Have a wonderful day._`;

    const encodedText = encodeURIComponent(message);
    const waUrl = cleanPhone.length >= 10 
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
    showSuccess(`Opening WhatsApp to share invoice with ${booking.customerName}`);
  };

  // Handle Copy Invoice Details
  const handleCopyInvoiceDetails = (booking: Booking) => {
    const total = booking.totalAmount || 0;
    const advance = booking.advancePaid || 0;
    const balance = Math.max(0, total - advance);
    const invoiceNo = `INV-${booking.id.slice(0, 6).toUpperCase()}`;

    const text = 
`Invoice No: ${invoiceNo}
Customer: ${booking.customerName} (${booking.customerPhone || 'N/A'})
Service: ${booking.subType || booking.requirements?.eventType || 'Photography'}
Date: ${booking.bookingDate || 'N/A'}
Total Amount: ₹${total.toLocaleString('en-IN')}
Advance Paid: ₹${advance.toLocaleString('en-IN')}
Balance Due: ₹${balance.toLocaleString('en-IN')}
UPI ID: ${studioData.upi}
Studio: ${studioData.bName}`;

    navigator.clipboard.writeText(text);
    setCopiedId(booking.id);
    showSuccess('Invoice summary copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Sub-navigation tabs matching sequence
  const subNav = [
    { id: 'order_list', label: 'Order List', icon: Briefcase },
    { id: 'work_order', label: 'Work Order', icon: FileText },
    { id: 'team_assignment', label: 'Team Assignment', icon: Users },
    { id: 'event_schedule', label: 'Event Schedule', icon: Calendar },
    { id: 'delivery_status', label: 'Delivery Status', icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders & Production Management</h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage photography shoots, print orders, itemized invoices, downloads, and client WhatsApp sharing.
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {ORDER_STATUS_TABS.map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition
                    ${statusFilter === st.id 
                      ? 'bg-slate-900 text-white shadow-xs' 
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
                placeholder="Search orders, client, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                      <th className="p-3.5">ORDER / EVENT</th>
                      <th className="p-3.5">CUSTOMER</th>
                      <th className="p-3.5">DATE</th>
                      <th className="p-3.5">DEPARTMENT</th>
                      <th className="p-3.5 text-right">AMOUNT</th>
                      <th className="p-3.5">STATUS</th>
                      <th className="p-3.5 text-center">INVOICE & ACTIONS</th>
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
                      const advance = b.advancePaid || 0;
                      const balance = Math.max(0, (b.totalAmount || 0) - advance);

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
                            {balance > 0 ? (
                              <p className="text-[10px] font-medium text-rose-500">Due: ₹{balance.toLocaleString('en-IN')}</p>
                            ) : (
                              <p className="text-[10px] font-semibold text-emerald-600">Paid in Full</p>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${statusBadgeColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 🖨️ Print Invoice Button */}
                              <button
                                onClick={() => handlePrintOrderInvoice(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition text-xs font-bold active:scale-95 shadow-2xs"
                                title="Print Invoice (बिल प्रिंट करें)"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Print</span>
                              </button>

                              {/* 📥 Download PDF Button */}
                              <button
                                onClick={() => handleDownloadOrderPDF(b)}
                                disabled={isDownloadingPdf}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition text-xs font-bold active:scale-95 shadow-2xs disabled:opacity-50"
                                title="Download PDF Invoice (पीडीएफ डाउनलोड करें)"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Download</span>
                              </button>

                              {/* 📲 WhatsApp Share Button */}
                              <button
                                onClick={() => handleShareWhatsApp(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 transition text-xs font-bold active:scale-95 shadow-2xs"
                                title="Share on WhatsApp (व्हाट्सएप शेयर)"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Share</span>
                              </button>

                              {/* 👁️ View Full Invoice Details Modal */}
                              <button
                                onClick={() => {
                                  setSelectedBookingForInvoice(b);
                                  setIsInvoiceModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white border border-slate-200 transition active:scale-95"
                                title="View Full Invoice Bill (पूरा इनवॉइस देखें)"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Production Work Orders ({orders.length})</h3>
              <p className="text-xs text-slate-500">Detailed production instructions, job tracking and invoice actions</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-black text-slate-700">No active work orders</h3>
              <p className="text-xs text-slate-500">Work orders generated from quotations or bookings will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map(wo => {
                const linkedBooking = bookings.find(b => b.id === wo.bookingId);
                return (
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
                      <div className="flex items-center gap-1.5">
                        {linkedBooking && (
                          <>
                            <button
                              onClick={() => handlePrintOrderInvoice(linkedBooking)}
                              className="p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                              title="Print Invoice"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp(linkedBooking)}
                              className="p-1.5 rounded bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition"
                              title="Share on WhatsApp"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onOpenWorkOrder && onOpenWorkOrder(wo)}
                          className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 ml-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. TEAM ASSIGNMENT VIEW */}
      {activeTab === 'team_assignment' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Upcoming Event Schedule</h3>
            <p className="text-xs text-slate-500">Chronological calendar of photography shoots and print job deliveries</p>
          </div>

          <div className="space-y-3">
            {bookings
              .slice()
              .sort((a, b) => (a.bookingDate || '').localeCompare(b.bookingDate || ''))
              .map(b => (
                <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition gap-3">
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

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handlePrintOrderInvoice(b)}
                      className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(b)}
                      className="px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-600 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                      {b.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. DELIVERY STATUS VIEW */}
      {activeTab === 'delivery_status' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Order Delivery Status Tracker</h3>
            <p className="text-xs text-slate-500">Track album printing, photo editing, and physical print delivery progress</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map(b => {
              const isDelivered = b.status === 'delivered' || b.status === 'completed';
              return (
                <div key={b.id} className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{b.subType || b.requirements?.eventType || 'Order'}</h4>
                    <p className="text-xs text-slate-500">{b.customerName} • ₹{(b.totalAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintOrderInvoice(b)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                      title="Print Invoice"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownloadOrderPDF(b)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(b)}
                      className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition"
                      title="WhatsApp Share"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isDelivered ? 'Delivered' : 'In Production'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden printable elements for all bookings to enable instant PDF download / print */}
      <div className="hidden">
        {bookings.map(b => {
          const total = b.totalAmount || 0;
          const advance = b.advancePaid || 0;
          const balance = Math.max(0, total - advance);
          const invoiceNo = `INV-${b.id.slice(0, 6).toUpperCase()}`;
          const isSettled = balance <= 0;
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${studioData.upi}&pn=${encodeURIComponent(studioData.bName)}&am=${balance}&cu=INR`)}`;

          return (
            <div
              key={b.id}
              id={`order-printable-invoice-${b.id}`}
              className="p-8 bg-white font-sans text-gray-900 invoice-container"
              style={{ width: '190mm', minHeight: 'auto', boxSizing: 'border-box' }}
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-5">
                <div className="flex gap-4 items-start">
                  {studioData.logo ? (
                    <img src={studioData.logo} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl border border-gray-100">
                      {studioData.bName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">{studioData.bName}</h1>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Proprietor: {studioData.owner}</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">{studioData.bAddress}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Call: {studioData.mobile} | Email: {studioData.bEmail}
                    </p>
                    {studioData.gst && (
                      <p className="text-[10px] font-bold text-gray-600 tracking-wider uppercase mt-1">
                        GSTIN: {studioData.gst}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 tracking-wider">TAX INVOICE</h2>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded border ${
                      isSettled ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {isSettled ? 'PAID' : 'PARTIALLY PAID'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Bill No: <span className="font-semibold text-gray-800">{invoiceNo}</span></p>
                    <p>Date: <span className="font-semibold text-gray-800">{b.bookingDate || new Date().toISOString().split('T')[0]}</span></p>
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="my-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">BILLED TO (ग्राहक विवरण):</h4>
                  <p className="text-sm font-bold text-gray-900 mt-1">{b.customerName}</p>
                  <p className="text-gray-600 mt-0.5">Phone: {b.customerPhone || 'N/A'}</p>
                  {b.requirements?.venue && (
                    <p className="text-gray-600 mt-0.5">Event Venue: {b.requirements.venue}</p>
                  )}
                </div>
                <div className="text-right">
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">ORDER / SHOOT DETAILS:</h4>
                  <p className="text-gray-600 mt-1">Department: <span className="font-semibold text-blue-600 uppercase">{b.jobType === 'printing_press' ? 'Printing Press' : 'Studio Photography'}</span></p>
                  <p className="text-gray-600">Event Date: <span className="font-semibold text-gray-900">{b.bookingDate || 'N/A'}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="min-w-full divide-y divide-gray-200 text-left border border-gray-100 rounded-lg overflow-hidden text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Description of Service & Deliverables</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-3 py-3 text-gray-400">1</td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-gray-900">{b.subType || b.requirements?.eventType || 'Photography Service'}</p>
                      <p className="text-[10px] text-gray-500">{b.description || 'High Resolution Photography, Editing & Album Production'}</p>
                    </td>
                    <td className="px-3 py-3 text-right">₹{total.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 text-center">1</td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Summary Calculations */}
              <div className="mt-6 flex justify-between items-start text-xs">
                <div className="w-60">
                  {!isSettled ? (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3">
                      <img src={qrSrc} alt="UPI QR" className="h-14 w-14 object-contain bg-white p-0.5 rounded border border-gray-200" referrerPolicy="no-referrer" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-700 uppercase">Scan to Pay Due</p>
                        <p className="text-[10px] font-mono text-gray-600">{studioData.upi}</p>
                        <p className="text-[10px] font-bold text-rose-600 mt-0.5">₹{balance.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase">✔ Bill Settled in Full</p>
                      <p className="text-[10px] text-emerald-700">Thank you for your business!</p>
                    </div>
                  )}
                </div>

                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900 text-sm">
                    <span>Grand Total:</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Advance Received:</span>
                    <span>₹{advance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`flex justify-between border-t border-gray-100 pt-1 font-extrabold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    <span>Balance Due:</span>
                    <span>₹{balance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Signatures */}
              <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-end text-[10px]">
                <div className="text-gray-400 max-w-sm">
                  <p className="font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions:</p>
                  <ul className="list-decimal pl-3.5 space-y-0.5 mt-0.5">
                    {studioData.termsArray.map((t: string, idx: number) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-800">{studioData.authSig}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Authorized Signatory</p>
                  <p className="text-[8px] text-gray-400 uppercase">For {studioData.bName}</p>
                </div>
              </div>

              {studioData.invoiceFooter && (
                <div className="mt-6 border-t border-dashed border-gray-200 pt-3 text-center">
                  <p className="text-[9px] text-gray-400 font-medium tracking-wide italic">{studioData.invoiceFooter}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Invoice Modal (Full Screen / Centered) */}
      <AnimatePresence>
        {isInvoiceModalOpen && selectedBookingForInvoice && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsInvoiceModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl cursor-default space-y-4"
            >
              {/* Modal Top Header & Actions Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Invoice: INV-{selectedBookingForInvoice.id.slice(0, 6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Client: <span className="font-bold text-slate-800">{selectedBookingForInvoice.customerName}</span> ({selectedBookingForInvoice.customerPhone})
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* 🖨️ Print */}
                  <button
                    onClick={() => handlePrintOrderInvoice(selectedBookingForInvoice)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
                  >
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </button>

                  {/* 📥 Download PDF */}
                  <button
                    onClick={() => handleDownloadOrderPDF(selectedBookingForInvoice)}
                    disabled={isDownloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>

                  {/* 📲 WhatsApp Share */}
                  <button
                    onClick={() => handleShareWhatsApp(selectedBookingForInvoice)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
                  >
                    <Share2 className="h-4 w-4" />
                    Share WhatsApp
                  </button>

                  {/* 📋 Copy */}
                  <button
                    onClick={() => handleCopyInvoiceDetails(selectedBookingForInvoice)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    title="Copy Details"
                  >
                    {copiedId === selectedBookingForInvoice.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>

                  {/* ❌ Close */}
                  <button
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Rendered Invoice Card Preview */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl max-h-[60vh] overflow-y-auto">
                <div className="bg-white p-6 rounded-lg shadow-xs border border-slate-200 text-gray-900 font-sans space-y-6">
                  {/* Studio Header */}
                  <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                    <div className="flex gap-3 items-start">
                      {studioData.logo ? (
                        <img src={studioData.logo} alt="Logo" className="h-12 w-12 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                          {studioData.bName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-bold uppercase tracking-tight text-gray-900">{studioData.bName}</h4>
                        <p className="text-[11px] text-gray-500">{studioData.bAddress}</p>
                        <p className="text-[11px] text-gray-500">Phone: {studioData.mobile}</p>
                        {studioData.gst && <p className="text-[10px] font-bold text-gray-600 uppercase mt-0.5">GSTIN: {studioData.gst}</p>}
                      </div>
                    </div>

                    <div className="text-right">
                      <h3 className="text-base font-black text-gray-800">TAX INVOICE</h3>
                      <p className="text-xs text-gray-500 mt-0.5">INV-{selectedBookingForInvoice.id.slice(0, 6).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{selectedBookingForInvoice.bookingDate || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-gray-400 text-[10px] uppercase">Billed To:</p>
                      <p className="font-bold text-gray-900 mt-0.5">{selectedBookingForInvoice.customerName}</p>
                      <p className="text-gray-600">{selectedBookingForInvoice.customerPhone || 'N/A'}</p>
                      {selectedBookingForInvoice.requirements?.venue && (
                        <p className="text-gray-500 mt-0.5">Venue: {selectedBookingForInvoice.requirements.venue}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-400 text-[10px] uppercase">Service:</p>
                      <p className="font-bold text-blue-600 mt-0.5">{selectedBookingForInvoice.subType || selectedBookingForInvoice.requirements?.eventType || 'Photography'}</p>
                      <p className="text-gray-500">{selectedBookingForInvoice.jobType === 'printing_press' ? 'Printing Press Job' : 'Studio Shoot'}</p>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left text-xs border border-gray-100 rounded">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                      <tr>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-2">
                          <p className="font-bold text-gray-900">{selectedBookingForInvoice.subType || 'Photography Service'}</p>
                          <p className="text-[10px] text-gray-500">{selectedBookingForInvoice.description || 'Deliverables & coverage'}</p>
                        </td>
                        <td className="p-2 text-right">₹{(selectedBookingForInvoice.totalAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="p-2 text-center">1</td>
                        <td className="p-2 text-right font-bold text-gray-900">₹{(selectedBookingForInvoice.totalAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">UPI ID For Payment:</p>
                      <p className="font-mono font-bold text-blue-600">{studioData.upi}</p>
                    </div>
                    <div className="w-48 space-y-1 text-right">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-bold">₹{(selectedBookingForInvoice.totalAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Advance Paid:</span>
                        <span>₹{(selectedBookingForInvoice.advancePaid || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold border-t border-gray-100 pt-1">
                        <span>Balance Due:</span>
                        <span>₹{Math.max(0, (selectedBookingForInvoice.totalAmount || 0) - (selectedBookingForInvoice.advancePaid || 0)).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

