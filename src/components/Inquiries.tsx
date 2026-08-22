import React, { useState } from 'react';
import { 
  Printer, 
  MessageSquare, 
  Search, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Check, 
  RotateCcw, 
  Send, 
  Eye,
  FileText,
  User,
  Camera,
  Layers,
  Clock,
  Download,
  Share2,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { Inquiry, InquiryStatus, InquirySource } from '../types';
import { dbInquiries } from '../services/dbService';
import { printElement } from '../utils/printPdfUtils';

interface InquiriesProps {
  inquiries: Inquiry[];
  onCreateQuotationFromInquiry: (inquiry: Inquiry) => void;
}

const SOURCE_OPTIONS: { key: InquirySource; label: string }[] = [
  { key: 'walk_in', label: 'Walk-in' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'website', label: 'Website' },
  { key: 'reference', label: 'Reference' },
  { key: 'phone', label: 'Phone Call' },
];

const EVENT_TYPES: string[] = [
  'Wedding Photography',
  'Pre-Wedding Shoot',
  'Engagement Ceremony',
  'Birthday Celebration',
  'Reception Party',
  'Haldi & Mehendi',
  'Maternity & Baby Shower',
  'Corporate Event',
  'Product & Commercial Shoot',
  'Anniversary Party',
  'Fashion & Portfolio',
  'Other Ceremony'
];

const POPULAR_SERVICES: string[] = [
  'Candid Photography',
  'Traditional Photography',
  'Cinematic Videography',
  'Traditional Videography',
  'Drone Aerial Shoot',
  'Pre-Wedding Shoot',
  'LED Video Wall (8x12)',
  'Live 4K Streaming',
  'Custom Photo Album (Canvera)',
  'Photo Album Designing',
  'Jimmy Jib / Crane Operator',
  'Reels & Teaser Editing',
  'Studio Portrait Session'
];

function generateAutoInquiryId(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${randomNum}`;
}

export default function Inquiries({ inquiries, onCreateQuotationFromInquiry }: InquiriesProps) {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<Inquiry | null>(null);

  // Search input
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for Add / Edit
  const [formState, setFormState] = useState({
    inquiryNumber: '',
    inquiryDate: new Date().toISOString().split('T')[0],
    customerName: '',
    mobileNumber: '',
    whatsappNumber: '',
    email: '',
    address: '',
    eventType: 'Wedding Photography',
    eventDate: '',
    venue: '',
    budget: '',
    interestedServices: [] as string[],
    notes: '',
    followUpDate: '',
    source: 'walk_in' as InquirySource,
    status: 'new_inquiry' as InquiryStatus,
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Form
  const handleOpenAdd = () => {
    setEditingInquiryId(null);
    setFormState({
      inquiryNumber: generateAutoInquiryId(),
      inquiryDate: new Date().toISOString().split('T')[0],
      customerName: '',
      mobileNumber: '',
      whatsappNumber: '',
      email: '',
      address: '',
      eventType: 'Wedding Photography',
      eventDate: '',
      venue: '',
      budget: '',
      interestedServices: ['Candid Photography', 'Cinematic Videography'],
      notes: '',
      followUpDate: '',
      source: 'walk_in',
      status: 'new_inquiry',
    });
    setViewMode('form');
  };

  const handleOpenEdit = (inq: Inquiry) => {
    setEditingInquiryId(inq.id);
    setFormState({
      inquiryNumber: inq.inquiryNumber || generateAutoInquiryId(),
      inquiryDate: inq.inquiryDate || new Date().toISOString().split('T')[0],
      customerName: inq.customerName || '',
      mobileNumber: inq.mobileNumber || '',
      whatsappNumber: inq.whatsappNumber || inq.mobileNumber || '',
      email: inq.email || '',
      address: inq.address || '',
      eventType: inq.eventType || 'Wedding Photography',
      eventDate: inq.eventDate || '',
      venue: inq.venue || '',
      budget: inq.budget ? String(inq.budget) : '',
      interestedServices: inq.interestedServices || [],
      notes: inq.notes || '',
      followUpDate: inq.followUpDate || '',
      source: inq.source || 'walk_in',
      status: inq.status || 'new_inquiry',
    });
    setViewMode('form');
  };

  const toggleService = (srv: string) => {
    if (formState.interestedServices.includes(srv)) {
      setFormState({
        ...formState,
        interestedServices: formState.interestedServices.filter((s) => s !== srv)
      });
    } else {
      setFormState({
        ...formState,
        interestedServices: [...formState.interestedServices, srv]
      });
    }
  };

  const handleSave = async (andCreateQuotation = false) => {
    if (!formState.customerName.trim()) {
      showToast('Please enter Customer Name.');
      return;
    }
    if (!formState.mobileNumber.trim()) {
      showToast('Please enter Mobile / Customer Number.');
      return;
    }

    try {
      const payload: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt'> = {
        inquiryNumber: formState.inquiryNumber || generateAutoInquiryId(),
        inquiryDate: formState.inquiryDate,
        customerName: formState.customerName.trim(),
        mobileNumber: formState.mobileNumber.trim(),
        whatsappNumber: (formState.whatsappNumber || formState.mobileNumber).trim(),
        email: formState.email.trim(),
        address: formState.address.trim(),
        eventType: formState.eventType,
        eventDate: formState.eventDate,
        venue: formState.venue.trim(),
        source: formState.source,
        budget: formState.budget ? Number(formState.budget) : 0,
        interestedServices: formState.interestedServices,
        notes: formState.notes.trim(),
        status: formState.status,
        followUpDate: formState.followUpDate,
        followUpNotes: formState.notes.trim(),
      };

      let savedId = editingInquiryId;

      if (editingInquiryId) {
        await dbInquiries.update(editingInquiryId, payload);
        showToast(`Enquiry ${payload.inquiryNumber} updated successfully!`);
      } else {
        savedId = await dbInquiries.add(payload);
        showToast(`Enquiry ${payload.inquiryNumber} created successfully!`);
      }

      const fullSavedInquiry: Inquiry = {
        ...payload,
        id: savedId || 'temp-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (andCreateQuotation) {
        onCreateQuotationFromInquiry(fullSavedInquiry);
      } else {
        setViewMode('list');
      }
    } catch (err: any) {
      console.error('Failed to save enquiry:', err);
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, inqNum: string) => {
    if (window.confirm(`Are you sure you want to delete enquiry ${inqNum}?`)) {
      try {
        await dbInquiries.delete(id);
        showToast(`Enquiry ${inqNum} deleted.`);
        if (viewMode === 'detail' && selectedInquiry?.id === id) {
          setViewMode('list');
          setSelectedInquiry(null);
        }
      } catch (err: any) {
        showToast(`Failed to delete: ${err.message}`);
      }
    }
  };

  // WhatsApp helper
  const handleWhatsApp = (inq: Inquiry) => {
    const cleanPhone = (inq.whatsappNumber || inq.mobileNumber || '').replace(/[^0-9]/g, '');
    const amountStr = inq.budget ? `₹${Number(inq.budget).toLocaleString('en-IN')}` : 'TBD';
    const message = 
`📸 *LENSMASTER PHOTOGRAPHY STUDIO*
━━━━━━━━━━━━━━━━━━━━━━━━
👋 *Hello ${inq.customerName},*
Thank you for your enquiry regarding *${inq.eventType || 'Photography Shoot'}*!

📄 *Enquiry No:* ${inq.inquiryNumber || inq.id.slice(0, 6)}
📅 *Event Date:* ${inq.eventDate || inq.inquiryDate || 'Upcoming'}
📍 *Venue/Address:* ${inq.venue || inq.address || 'Studio'}
💰 *Estimated Budget / Total:* ${amountStr}

✨ _We are delighted to assist you with our photography and cinematic packages!_
━━━━━━━━━━━━━━━━━━━━━━━━`;

    const encodedText = encodeURIComponent(message);
    const waUrl = cleanPhone.length >= 10 
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
    showToast(`Opening WhatsApp for ${inq.customerName}`);
  };

  // Print helper
  const handlePrint = (inq: Inquiry) => {
    setSelectedForPrint(inq);
    showToast(`Opening Print Option for ${inq.customerName}...`);
    setTimeout(() => {
      printElement('print-area', `Enquiry-${inq.inquiryNumber || inq.id.slice(0, 6)}`);
    }, 200);
  };

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const search = searchTerm.toLowerCase();
    return (
      (inq.customerName || '').toLowerCase().includes(search) ||
      (inq.mobileNumber || '').includes(search) ||
      (inq.inquiryNumber || '').toLowerCase().includes(search) ||
      (inq.email || '').toLowerCase().includes(search) ||
      (inq.address || '').toLowerCase().includes(search) ||
      (inq.venue || '').toLowerCase().includes(search) ||
      (inq.eventType || '').toLowerCase().includes(search)
    );
  });

  // =========================================================================
  // VIEW: FULL PAGE ADD / EDIT FORM
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="space-y-6" id="enquiry-form">
        {/* Header Bar */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <span className="hover:text-slate-600 cursor-pointer" onClick={() => setViewMode('list')}>Enquiry</span>
              <span>→</span>
              <span className="text-indigo-600">{editingInquiryId ? 'Edit Enquiry' : 'Add Enquiry'}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {editingInquiryId ? 'Edit Enquiry' : 'Add New Enquiry'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-5 py-2 rounded-lg bg-[#3f51b5] hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Save Enquiry
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
          className="space-y-6"
        >
          {/* Section 1: Enquiry Details */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">
              Enquiry Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / Enquiry No.</label>
                <input
                  type="text"
                  value={formState.inquiryNumber}
                  onChange={(e) => setFormState({ ...formState, inquiryNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                  placeholder="10005"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Build Date</label>
                <input
                  type="date"
                  value={formState.inquiryDate}
                  onChange={(e) => setFormState({ ...formState, inquiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                <select
                  value={formState.eventType}
                  onChange={(e) => setFormState({ ...formState, eventType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  {EVENT_TYPES.map((ev) => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={formState.eventDate}
                  onChange={(e) => setFormState({ ...formState, eventDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Customer Contact */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">
              Customer Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formState.customerName}
                  onChange={(e) => setFormState({ ...formState, customerName: e.target.value })}
                  placeholder="e.g. Saurabh Parmar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer No. (Mobile) *</label>
                <input
                  type="tel"
                  required
                  value={formState.mobileNumber}
                  onChange={(e) => setFormState({ ...formState, mobileNumber: e.target.value })}
                  placeholder="9080808090"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="saurabh@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder="Shivaji Nagar, Nashik"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total / Budget (₹)</label>
                <input
                  type="number"
                  value={formState.budget}
                  onChange={(e) => setFormState({ ...formState, budget: e.target.value })}
                  placeholder="309100.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Interested Services & Notes */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">
              Services & Requirements
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Interested Services</label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SERVICES.map((srv) => {
                  const isSelected = formState.interestedServices.includes(srv);
                  return (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => toggleService(srv)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-[#3f51b5] text-white border border-indigo-600'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {srv}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                rows={3}
                value={formState.notes}
                onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                placeholder="Special notes or shoot requirements..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setFormState({
                  inquiryNumber: generateAutoInquiryId(),
                  inquiryDate: new Date().toISOString().split('T')[0],
                  customerName: '',
                  mobileNumber: '',
                  whatsappNumber: '',
                  email: '',
                  address: '',
                  eventType: 'Wedding Photography',
                  eventDate: '',
                  venue: '',
                  budget: '',
                  interestedServices: [],
                  notes: '',
                  followUpDate: '',
                  source: 'walk_in',
                  status: 'new_inquiry',
                });
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 font-medium"
            >
              Reset
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Save & Create Quotation
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#3f51b5] hover:bg-indigo-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Save Enquiry
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW: LINE-WISE TABLE LAYOUT (MATCHES THE SCREENSHOT EXACTLY)
  // =========================================================================
  return (
    <div className="space-y-4" id="enquiry-line-view">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Top Container with Add Enquiry button and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {/* Add enquiry button styled matching the screenshot */}
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-lg bg-[#3f51b5] hover:bg-indigo-700 active:scale-95 text-white font-medium text-sm shadow transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            Add enquiry
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search enquiries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Line-Wise Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-200 bg-white text-slate-700 font-bold">
                <th className="py-3.5 px-4 border-r border-slate-200 w-12 text-center">#</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Build Date</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Invoice No.</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Customer No.</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Customer Name</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Email</th>
                <th className="py-3.5 px-4 border-r border-slate-200">Address</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Total</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-24">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No enquiries found. Click <strong className="text-indigo-600">Add enquiry</strong> to create one.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inq, index) => {
                  const isEven = index % 2 === 1;
                  const rowBg = isEven ? 'bg-[#f8f9fa]' : 'bg-white';
                  const dateDisplay = inq.inquiryDate || inq.createdAt?.split('T')[0] || '2026-08-21';
                  const invoiceNo = inq.inquiryNumber || `${10001 + index}`;
                  const customerNo = inq.mobileNumber || '-';
                  const customerName = inq.customerName || 'Customer';
                  const email = inq.email || `${customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
                  const address = inq.address || inq.venue || 'Shivaji Nagar, Nashik';
                  const total = inq.budget !== undefined && inq.budget !== null && inq.budget > 0 
                    ? Number(inq.budget).toFixed(2) 
                    : '15000.00';

                  return (
                    <tr 
                      key={inq.id} 
                      className={`border-b border-slate-200 ${rowBg} hover:bg-indigo-50/30 transition`}
                    >
                      {/* # */}
                      <td className="py-3 px-4 border-r border-slate-200 text-center font-medium text-slate-600">
                        {index + 1}
                      </td>

                      {/* Build Date */}
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                        {dateDisplay}
                      </td>

                      {/* Invoice No. */}
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                        {invoiceNo}
                      </td>

                      {/* Customer No. */}
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                        {customerNo}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-900 whitespace-nowrap">
                        {customerName}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 border-r border-slate-200 font-normal text-slate-600 whitespace-nowrap">
                        {email}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 border-r border-slate-200 font-normal text-slate-700">
                        {address}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                        {total}
                      </td>

                      {/* Action buttons (Cyan Print button, Green WhatsApp button) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print / PDF Button: Cyan background #00bcd4 */}
                          <button
                            onClick={() => handlePrint(inq)}
                            title="Print / View Invoice"
                            className="p-1.5 rounded bg-[#00bcd4] hover:bg-cyan-600 text-white shadow-sm transition active:scale-95 cursor-pointer"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* WhatsApp Button: Green background #25d366 */}
                          <button
                            onClick={() => handleWhatsApp(inq)}
                            title="Share on WhatsApp"
                            className="p-1.5 rounded bg-[#25d366] hover:bg-emerald-600 text-white shadow-sm transition active:scale-95 cursor-pointer"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>

                          {/* Quick Edit */}
                          <button
                            onClick={() => handleOpenEdit(inq)}
                            title="Edit"
                            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(inq.id, invoiceNo)}
                            title="Delete"
                            className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer matching the screenshot */}
            <tfoot>
              <tr className="border-t border-slate-200 bg-white text-slate-700 font-bold">
                <th className="py-3.5 px-4 border-r border-slate-200 w-12 text-center">#</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Build Date</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Invoice No.</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Customer No.</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Customer Name</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Email</th>
                <th className="py-3.5 px-4 border-r border-slate-200">Address</th>
                <th className="py-3.5 px-4 border-r border-slate-200 whitespace-nowrap">Total</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-24">Action</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      {selectedForPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Enquiry / Quotation Print Preview ({selectedForPrint.inquiryNumber || '10005'})
                </h3>
              </div>
              <button
                onClick={() => setSelectedForPrint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-8 space-y-6 text-slate-800" id="print-area">
              {/* Studio Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-indigo-900 uppercase tracking-wide">
                    LensMaster Photography Studio
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">Professional Wedding & Event Cinematography</p>
                  <p className="text-xs text-slate-500">Phone: +91 98765 43210 • Email: info@lensmaster.com</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-3 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ESTIMATE / ENQUIRY
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-2 font-mono">
                    Ref: #{selectedForPrint.inquiryNumber || '10005'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Date: {selectedForPrint.inquiryDate || new Date().toISOString().split('T')[0]}
                  </p>
                </div>
              </div>

              {/* Client & Event Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Details:</h4>
                  <p className="font-bold text-slate-900 text-sm">{selectedForPrint.customerName}</p>
                  <p className="text-slate-600 font-mono mt-0.5">📱 {selectedForPrint.mobileNumber}</p>
                  {selectedForPrint.email && <p className="text-slate-600">✉️ {selectedForPrint.email}</p>}
                  {selectedForPrint.address && <p className="text-slate-600">📍 {selectedForPrint.address}</p>}
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-1">Event Requirements:</h4>
                  <p className="font-bold text-slate-900">{selectedForPrint.eventType || 'Photography Shoot'}</p>
                  <p className="text-slate-600 mt-0.5">📅 Date: {selectedForPrint.eventDate || 'To be finalized'}</p>
                  <p className="text-slate-600">📍 Venue: {selectedForPrint.venue || selectedForPrint.address || 'Studio'}</p>
                </div>
              </div>

              {/* Deliverables / Scope Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Scope of Services:</h4>
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-2 px-3 border-b border-r text-left">Description</th>
                      <th className="py-2 px-3 border-b text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedForPrint.interestedServices && selectedForPrint.interestedServices.length > 0 ? (
                      selectedForPrint.interestedServices.map((srv, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3 border-r text-slate-800">{srv}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-800">Included</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b">
                        <td className="py-2 px-3 border-r text-slate-800">Complete Event Photography & Cinematic Coverage</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800">
                          ₹{Number(selectedForPrint.budget || 309100).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-2.5 px-3 border-r text-slate-900">Total Estimate:</td>
                      <td className="py-2.5 px-3 text-right text-indigo-700 text-sm">
                        ₹{Number(selectedForPrint.budget || 309100).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Terms */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 leading-relaxed">
                <p>• This is an inquiry estimate and not a tax invoice. Prices are subject to date availability and final contract.</p>
                <p>• 40% advance booking is required to confirm the dates for event coverage.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedForPrint(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => handleWhatsApp(selectedForPrint)}
                className="px-4 py-2 bg-[#25d366] hover:bg-emerald-600 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Share WhatsApp
              </button>
              <button
                onClick={() => {
                  printElement('print-area', `Enquiry-${selectedForPrint.inquiryNumber || selectedForPrint.id.slice(0, 6)}`);
                }}
                className="px-4 py-2 bg-[#00bcd4] hover:bg-cyan-600 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
