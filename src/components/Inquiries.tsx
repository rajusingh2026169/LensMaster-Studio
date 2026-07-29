import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Edit2, 
  Trash2, 
  X,
  Filter,
  User,
  Send,
  HelpCircle
} from 'lucide-react';
import { Inquiry, InquiryStatus, InquirySource } from '../types';
import { dbInquiries } from '../services/dbService';

interface InquiriesProps {
  inquiries: Inquiry[];
  onCreateQuotationFromInquiry: (inquiry: Inquiry) => void;
}

const INQUIRY_STATUSES: { key: InquiryStatus; label: string; color: string; badgeBg: string }[] = [
  { key: 'new_inquiry', label: 'New Inquiry', color: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'follow_up', label: 'Follow-up', color: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'quotation_sent', label: 'Quotation Sent', color: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'negotiation', label: 'Negotiation', color: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'confirmed', label: 'Confirmed', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'cancelled', label: 'Cancelled', color: 'text-rose-600', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const SOURCES: { key: InquirySource; label: string }[] = [
  { key: 'walk_in', label: 'Walk-in' },
  { key: 'phone', label: 'Phone Call' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'website', label: 'Website' },
  { key: 'reference', label: 'Reference' },
];

export default function Inquiries({ inquiries, onCreateQuotationFromInquiry }: InquiriesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [followUpModalInquiry, setFollowUpModalInquiry] = useState<Inquiry | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    whatsappNumber: '',
    email: '',
    address: '',
    eventType: 'Wedding Photography',
    eventDate: new Date().toISOString().split('T')[0],
    venue: '',
    source: 'walk_in' as InquirySource,
    budget: '',
    notes: '',
    status: 'new_inquiry' as InquiryStatus,
    followUpDate: '',
    followUpNotes: '',
  });

  const [followUpNotesInput, setFollowUpNotesInput] = useState('');
  const [followUpDateInput, setFollowUpDateInput] = useState('');

  const openAddModal = () => {
    setEditingInquiry(null);
    setFormData({
      customerName: '',
      mobileNumber: '',
      whatsappNumber: '',
      email: '',
      address: '',
      eventType: 'Wedding Photography',
      eventDate: new Date().toISOString().split('T')[0],
      venue: '',
      source: 'walk_in',
      budget: '',
      notes: '',
      status: 'new_inquiry',
      followUpDate: '',
      followUpNotes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (inq: Inquiry) => {
    setEditingInquiry(inq);
    setFormData({
      customerName: inq.customerName || '',
      mobileNumber: inq.mobileNumber || '',
      whatsappNumber: inq.whatsappNumber || '',
      email: inq.email || '',
      address: inq.address || '',
      eventType: inq.eventType || 'Wedding Photography',
      eventDate: inq.eventDate || new Date().toISOString().split('T')[0],
      venue: inq.venue || '',
      source: inq.source || 'walk_in',
      budget: inq.budget ? String(inq.budget) : '',
      notes: inq.notes || '',
      status: inq.status || 'new_inquiry',
      followUpDate: inq.followUpDate || '',
      followUpNotes: inq.followUpNotes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.mobileNumber) {
      alert('Customer Name and Mobile Number are required.');
      return;
    }

    try {
      const payload = {
        customerName: formData.customerName,
        mobileNumber: formData.mobileNumber,
        whatsappNumber: formData.whatsappNumber || formData.mobileNumber,
        email: formData.email,
        address: formData.address,
        eventType: formData.eventType,
        eventDate: formData.eventDate,
        venue: formData.venue,
        source: formData.source,
        budget: formData.budget ? Number(formData.budget) : 0,
        notes: formData.notes,
        status: formData.status,
        inquiryDate: new Date().toISOString().split('T')[0],
        followUpDate: formData.followUpDate,
        followUpNotes: formData.followUpNotes,
      };

      if (editingInquiry) {
        await dbInquiries.update(editingInquiry.id, payload);
      } else {
        await dbInquiries.add(payload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save inquiry:', err);
      alert('Failed to save inquiry: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inquiry?')) {
      try {
        await dbInquiries.delete(id);
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpModalInquiry) return;
    try {
      await dbInquiries.update(followUpModalInquiry.id, {
        followUpDate: followUpDateInput,
        followUpNotes: followUpNotesInput,
        status: 'follow_up',
      });
      setFollowUpModalInquiry(null);
    } catch (err: any) {
      alert('Failed to update follow up: ' + err.message);
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch =
      inq.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.mobileNumber.includes(searchTerm) ||
      inq.inquiryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.eventType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || inq.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalCount = inquiries.length;
  const newCount = inquiries.filter((i) => i.status === 'new_inquiry').length;
  const followUpCount = inquiries.filter((i) => i.status === 'follow_up').length;
  const confirmedCount = inquiries.filter((i) => i.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Inquiry Management
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Track customer inquiries, record follow-ups, and convert leads to quotes.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-150"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          New Inquiry
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inquiries</p>
            <p className="text-xl font-black text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Inquiries</p>
            <p className="text-xl font-black text-slate-900">{newCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Follow-Up</p>
            <p className="text-xl font-black text-slate-900">{followUpCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirmed</p>
            <p className="text-xl font-black text-slate-900">{confirmedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, INQ #, event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Statuses
          </button>
          {INQUIRY_STATUSES.map((st) => (
            <button
              key={st.key}
              onClick={() => setSelectedStatus(st.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedStatus === st.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries Cards Grid / Table */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No inquiries found</h3>
          <p className="text-xs text-slate-400">Try adjusting your filters or click 'New Inquiry' to add one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inq) => {
            const statusConfig = INQUIRY_STATUSES.find((s) => s.key === inq.status) || INQUIRY_STATUSES[0];
            return (
              <div
                key={inq.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-3">
                  {/* Top row ID & status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                      {inq.inquiryNumber}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusConfig.badgeBg}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Customer info */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      {inq.customerName}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {inq.mobileNumber}
                    </p>
                  </div>

                  {/* Event details */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{inq.eventType}</span>
                      {inq.budget ? (
                        <span className="font-bold text-emerald-600">
                          ₹{inq.budget.toLocaleString('en-IN')}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Event Date: {inq.eventDate || 'TBD'}</span>
                    </div>
                    {inq.venue && (
                      <div className="flex items-center gap-2 text-slate-500 truncate">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{inq.venue}</span>
                      </div>
                    )}
                  </div>

                  {/* Follow-up Note preview */}
                  {inq.followUpNotes && (
                    <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 text-[11px] text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-amber-800">
                        <Clock className="h-3 w-3" />
                        Follow-up ({inq.followUpDate || 'No date set'}):
                      </div>
                      <p className="line-clamp-2">{inq.followUpNotes}</p>
                    </div>
                  )}
                </div>

                {/* Bottom Action buttons */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <a
                      href={`https://wa.me/${inq.whatsappNumber || inq.mobileNumber}?text=Hi%20${encodeURIComponent(
                        inq.customerName
                      )},%20thank%20you%20for%20contacting%20us%20regarding%20your%20${encodeURIComponent(
                        inq.eventType
                      )}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                      title="Send WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>
                    <a
                      href={`tel:${inq.mobileNumber}`}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      title="Call"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setFollowUpModalInquiry(inq);
                        setFollowUpDateInput(inq.followUpDate || new Date().toISOString().split('T')[0]);
                        setFollowUpNotesInput(inq.followUpNotes || '');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs transition"
                      title="Follow up"
                    >
                      Follow-up
                    </button>

                    <button
                      onClick={() => onCreateQuotationFromInquiry(inq)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Quote
                    </button>

                    <button
                      onClick={() => openEditModal(inq)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(inq.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Inquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {editingInquiry ? 'Edit Inquiry' : 'Create New Inquiry'}
                </h2>
                <p className="text-xs text-slate-400">Capture event details and customer contact information</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="Same as mobile if blank"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rahul@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Type *</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Wedding Photography">Wedding Photography</option>
                    <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                    <option value="Engagement Shoot">Engagement Shoot</option>
                    <option value="Birthday Party">Birthday Party</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Product Shoot">Product Shoot</option>
                    <option value="Album & Printing">Album & Printing Services</option>
                    <option value="Other">Other Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Grand Palace Hall, City"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as InquirySource })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {SOURCES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g. 75000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as InquiryStatus })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {INQUIRY_STATUSES.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full residential / office address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Notes / Requirements</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Requested drone cameras, 2 photographers, premium album..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Reminder Notes</label>
                  <input
                    type="text"
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                    placeholder="Call back regarding package discount"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition"
                >
                  {editingInquiry ? 'Save Changes' : 'Create Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Quick Action Modal */}
      {followUpModalInquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Log Follow-up ({followUpModalInquiry.customerName})
              </h3>
              <button
                onClick={() => setFollowUpModalInquiry(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDateInput}
                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Notes / Outcome</label>
                <textarea
                  rows={3}
                  value={followUpNotesInput}
                  onChange={(e) => setFollowUpNotesInput(e.target.value)}
                  placeholder="Spoke with client, requested customized package with 2 photo albums."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFollowUpModalInquiry(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFollowUp}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow"
              >
                Save Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
