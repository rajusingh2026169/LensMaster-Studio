import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Edit2, 
  Trash2, 
  X, 
  Printer, 
  Download, 
  Send, 
  Share2, 
  Check, 
  Calendar, 
  Phone, 
  MapPin, 
  User, 
  QrCode, 
  Sparkles,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { Quotation, QuotationItem, QuotationStatus, Customer, Inquiry, StudioService, StudioPackage } from '../types';
import { dbQuotations, convertQuotationToBooking } from '../services/dbService';
import { useToast } from './Toast';
import { downloadElementAsPDF, printElement } from '../utils/printPdfUtils';

interface QuotationsProps {
  quotations: Quotation[];
  customers: Customer[];
  inquiries: Inquiry[];
  studioServices?: StudioService[];
  studioPackages?: StudioPackage[];
  studioProfile?: any;
  preselectedInquiry?: Inquiry | null;
  onBookingConverted?: () => void;
}

const STATUS_CONFIG: Record<QuotationStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700' },
  sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700' },
  viewed: { label: 'Viewed', bg: 'bg-purple-50', text: 'text-purple-700' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700' },
  expired: { label: 'Expired', bg: 'bg-amber-50', text: 'text-amber-700' },
  converted_to_booking: { label: 'Converted to Booking', bg: 'bg-indigo-50', text: 'text-indigo-700' },
};

export default function Quotations({
  quotations,
  customers,
  inquiries,
  studioServices = [],
  studioPackages = [],
  studioProfile,
  preselectedInquiry,
  onBookingConverted,
}: QuotationsProps) {
  const { showSuccess, showError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePrint = (q: Quotation) => {
    const success = printElement('quotation-preview-doc', `Quotation-${q.quotationNumber}`);
    if (success) {
      showSuccess(`Printing Quotation #${q.quotationNumber}`);
    } else {
      showError('Unable to open print dialog');
    }
  };

  const handleDownloadPDF = async (q: Quotation) => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const ok = await downloadElementAsPDF({
        elementId: 'quotation-preview-doc',
        filename: `Quotation-${q.quotationNumber}.pdf`,
        onSuccess: () => {
          showSuccess(`Quotation-${q.quotationNumber}.pdf downloaded!`);
        },
        onError: (err) => {
          showError(`Download failed: ${err.message}`);
        }
      });
      if (!ok) showError('Failed to generate PDF');
    } catch (err: any) {
      showError(`PDF error: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };
  
  // Conversion state
  const [convertModalQuotation, setConvertModalQuotation] = useState<Quotation | null>(null);
  const [advanceAmountInput, setAdvanceAmountInput] = useState<number>(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('upi');
  const [isConverting, setIsConverting] = useState(false);

  // Builder Form State
  const [formHeader, setFormHeader] = useState({
    inquiryId: '',
    customerName: '',
    customerPhone: '',
    whatsappNumber: '',
    customerEmail: '',
    customerAddress: '',
    eventType: 'Wedding Photography',
    eventDate: new Date().toISOString().split('T')[0],
    eventVenue: '',
    validUntilDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    termsAndConditions:
      '1. 50% advance required upon booking confirmation.\n2. Raw photo & video files delivered within 7 working days.\n3. Complete balance dues payable prior to album printing & final video dispatch.',
    status: 'sent' as QuotationStatus,
    watermarkText: 'LENSMASTER STUDIO',
    digitalSignatureUrl: studioProfile?.ownerName || 'Authorized Studio Manager',
  });

  const [formItems, setFormItems] = useState<QuotationItem[]>([
    {
      id: '1',
      serviceName: 'Wedding Photography',
      description: 'Full day candid & traditional photography',
      quantity: 1,
      unit: 'Days',
      unitPrice: 45000,
      discount: 0,
      gstPercent: 18,
      total: 53100,
    },
  ]);

  // Open builder prefilled from an Inquiry if provided or blank
  React.useEffect(() => {
    if (preselectedInquiry) {
      setFormHeader({
        inquiryId: preselectedInquiry.id,
        customerName: preselectedInquiry.customerName,
        customerPhone: preselectedInquiry.mobileNumber,
        whatsappNumber: preselectedInquiry.whatsappNumber || preselectedInquiry.mobileNumber,
        customerEmail: preselectedInquiry.email || '',
        customerAddress: preselectedInquiry.address || '',
        eventType: preselectedInquiry.eventType || 'Wedding Photography',
        eventDate: preselectedInquiry.eventDate || new Date().toISOString().split('T')[0],
        eventVenue: preselectedInquiry.venue || '',
        validUntilDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        termsAndConditions:
          '1. 50% advance required upon booking confirmation.\n2. Raw photo & video files delivered within 7 working days.\n3. Dues payable prior to album dispatch.',
        status: 'sent',
        watermarkText: studioProfile?.businessName || 'LENSMASTER STUDIO',
        digitalSignatureUrl: studioProfile?.ownerName || 'Authorized Signatory',
      });
      setIsBuilderOpen(true);
    }
  }, [preselectedInquiry, studioProfile]);

  const openNewBuilder = () => {
    setEditingQuotation(null);
    setFormHeader({
      inquiryId: '',
      customerName: '',
      customerPhone: '',
      whatsappNumber: '',
      customerEmail: '',
      customerAddress: '',
      eventType: 'Wedding Photography',
      eventDate: new Date().toISOString().split('T')[0],
      eventVenue: '',
      validUntilDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      termsAndConditions:
        '1. 50% advance required upon booking confirmation.\n2. Raw photo & video files delivered within 7 working days.\n3. Balance dues payable prior to album printing & final video dispatch.',
      status: 'sent',
      watermarkText: studioProfile?.businessName || 'LENSMASTER STUDIO',
      digitalSignatureUrl: studioProfile?.ownerName || 'Authorized Signatory',
    });
    setFormItems([
      {
        id: '1',
        serviceName: 'Wedding Photography',
        description: 'Full day candid & traditional photography',
        quantity: 1,
        unit: 'Days',
        unitPrice: 45000,
        discount: 0,
        gstPercent: 18,
        total: 53100,
      },
    ]);
    setIsBuilderOpen(true);
  };

  const openEditBuilder = (quo: Quotation) => {
    setEditingQuotation(quo);
    setFormHeader({
      inquiryId: quo.inquiryId || '',
      customerName: quo.customerName || '',
      customerPhone: quo.customerPhone || '',
      whatsappNumber: quo.whatsappNumber || quo.customerPhone || '',
      customerEmail: quo.customerEmail || '',
      customerAddress: quo.customerAddress || '',
      eventType: quo.eventType || 'Wedding Photography',
      eventDate: quo.eventDate || new Date().toISOString().split('T')[0],
      eventVenue: quo.eventVenue || '',
      validUntilDate: quo.validUntilDate || new Date().toISOString().split('T')[0],
      termsAndConditions: quo.termsAndConditions || '',
      status: quo.status || 'sent',
      watermarkText: quo.watermarkText || studioProfile?.businessName || 'LENSMASTER STUDIO',
      digitalSignatureUrl: quo.digitalSignatureUrl || studioProfile?.ownerName || 'Authorized Signatory',
    });
    setFormItems(quo.items || []);
    setIsBuilderOpen(true);
  };

  // Item management & recalculation
  const calculateItemTotal = (item: QuotationItem) => {
    const rawSubtotal = Math.max(0, item.quantity * item.unitPrice - item.discount);
    const gstAmt = (rawSubtotal * (item.gstPercent || 0)) / 100;
    return rawSubtotal + gstAmt;
  };

  const updateItemField = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...formItems];
    const curr = { ...updated[index], [field]: value };
    curr.total = calculateItemTotal(curr);
    updated[index] = curr;
    setFormItems(updated);
  };

  const addItemRow = (preset?: { name: string; desc?: string; price: number; unit?: string }) => {
    const newItem: QuotationItem = preset
      ? {
          id: String(Date.now() + Math.random()),
          serviceName: preset.name,
          description: preset.desc || '',
          quantity: 1,
          unit: preset.unit || 'Units',
          unitPrice: preset.price,
          discount: 0,
          gstPercent: 18,
          total: preset.price * 1.18,
        }
      : {
          id: String(Date.now() + Math.random()),
          serviceName: '',
          description: '',
          quantity: 1,
          unit: 'Units',
          unitPrice: 0,
          discount: 0,
          gstPercent: 18,
          total: 0,
        };
    setFormItems([...formItems, newItem]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Totals calculations
  const subTotal = formItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const totalDiscount = formItems.reduce((acc, i) => acc + Number(i.discount || 0), 0);
  const totalGst = formItems.reduce((acc, i) => {
    const net = Math.max(0, i.quantity * i.unitPrice - i.discount);
    return acc + (net * (i.gstPercent || 0)) / 100;
  }, 0);
  const grandTotal = subTotal - totalDiscount + totalGst;

  // Save Quotation
  const handleSaveQuotation = async () => {
    if (!formHeader.customerName || !formHeader.customerPhone) {
      alert('Customer Name and Phone Number are required.');
      return;
    }
    if (formItems.length === 0) {
      alert('Please add at least one service item to the quotation.');
      return;
    }

    try {
      const payload = {
        inquiryId: formHeader.inquiryId,
        customerName: formHeader.customerName,
        customerPhone: formHeader.customerPhone,
        whatsappNumber: formHeader.whatsappNumber || formHeader.customerPhone,
        customerEmail: formHeader.customerEmail,
        customerAddress: formHeader.customerAddress,
        eventType: formHeader.eventType,
        eventDate: formHeader.eventDate,
        eventVenue: formHeader.eventVenue,
        items: formItems,
        subTotal,
        totalDiscount,
        totalGst,
        grandTotal,
        termsAndConditions: formHeader.termsAndConditions,
        validUntilDate: formHeader.validUntilDate,
        status: formHeader.status,
        watermarkText: formHeader.watermarkText,
        digitalSignatureUrl: formHeader.digitalSignatureUrl,
      };

      if (editingQuotation) {
        await dbQuotations.update(editingQuotation.id, payload);
      } else {
        await dbQuotations.add(payload);
      }

      setIsBuilderOpen(false);
    } catch (err: any) {
      alert('Failed to save quotation: ' + err.message);
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      try {
        await dbQuotations.delete(id);
      } catch (err: any) {
        alert('Failed to delete quotation: ' + err.message);
      }
    }
  };

  // ONE-CLICK CONVERT TO BOOKING
  const handleConvertQuotation = async () => {
    if (!convertModalQuotation) return;
    setIsConverting(true);
    try {
      const result = await convertQuotationToBooking(
        convertModalQuotation,
        advanceAmountInput,
        paymentMethodInput
      );
      setIsConverting(false);
      setConvertModalQuotation(null);
      alert(
        `SUCCESS! Quotation ${convertModalQuotation.quotationNumber} successfully converted to Booking & Work Order!\nInvoice created with ID: ${result.invoiceId}`
      );
      if (onBookingConverted) onBookingConverted();
    } catch (err: any) {
      setIsConverting(false);
      alert('Error converting quotation: ' + err.message);
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerPhone.includes(searchTerm) ||
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.eventType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Photography Quotations
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Build custom quotations, print/download PDFs, and convert approved quotes to bookings in 1-click.
          </p>
        </div>
        <button
          onClick={openNewBuilder}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-150"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Create Quotation
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotes, clients, QUO #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Quotes
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                statusFilter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations List */}
      {filteredQuotations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No quotations found</h3>
          <p className="text-xs text-slate-400">Build your first quote by clicking 'Create Quotation'.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuotations.map((q) => {
            const st = STATUS_CONFIG[q.status] || STATUS_CONFIG.sent;
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                      {q.quotationNumber}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      {q.customerName}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{q.customerPhone}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{q.eventType}</span>
                      <span className="text-blue-600 font-black">₹{q.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Event Date: {q.eventDate || 'TBD'}</p>
                    <p className="text-[11px] text-slate-400">{q.items.length} Service item(s)</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPreviewQuotation(q)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      View / PDF
                    </button>

                    <a
                      href={`https://wa.me/${q.whatsappNumber || q.customerPhone}?text=Hello%20${encodeURIComponent(
                        q.customerName
                      )},%20here%20is%20your%20quotation%20${q.quotationNumber}%20for%20₹${q.grandTotal.toLocaleString(
                        'en-IN'
                      )}%20from%20${encodeURIComponent(
                        studioProfile?.businessName || 'LensMaster Studio'
                      )}.%20Validity:%20${q.validUntilDate}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                      title="Share WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>

                    <button
                      onClick={() => openEditBuilder(q)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteQuotation(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* ONE-CLICK CONVERT BUTTON */}
                  {q.status !== 'converted_to_booking' ? (
                    <button
                      onClick={() => {
                        setConvertModalQuotation(q);
                        setAdvanceAmountInput(Math.round(q.grandTotal * 0.3));
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Convert to Booking (1-Click)
                    </button>
                  ) : (
                    <div className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs text-center border border-indigo-100 flex items-center justify-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Converted to Booking
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto my-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {editingQuotation ? 'Edit Quotation' : 'Photography Quotation Builder'}
                </h2>
                <p className="text-xs text-slate-400">Add unlimited service line items with live GST calculations</p>
              </div>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Header Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formHeader.customerName}
                  onChange={(e) => setFormHeader({ ...formHeader, customerName: e.target.value })}
                  placeholder="Client full name"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formHeader.customerPhone}
                  onChange={(e) => setFormHeader({ ...formHeader, customerPhone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formHeader.customerEmail}
                  onChange={(e) => setFormHeader({ ...formHeader, customerEmail: e.target.value })}
                  placeholder="client@gmail.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Type *</label>
                <input
                  type="text"
                  value={formHeader.eventType}
                  onChange={(e) => setFormHeader({ ...formHeader, eventType: e.target.value })}
                  placeholder="Wedding / Pre-Wedding / Birthday"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={formHeader.eventDate}
                  onChange={(e) => setFormHeader({ ...formHeader, eventDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until Date</label>
                <input
                  type="date"
                  value={formHeader.validUntilDate}
                  onChange={(e) => setFormHeader({ ...formHeader, validUntilDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Studio Services & Packages Presets */}
            <div className="space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Quick Add Your Studio's Custom Services & Packages
              </span>
              
              {studioServices.length === 0 && studioPackages.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-medium">
                  No custom services created yet. Create services in the "Services & Packages" tab to add them here dynamically.
                </div>
              ) : (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-36 overflow-y-auto">
                  {/* Studio Services */}
                  {studioServices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider w-full mb-0.5">
                        Studio Services:
                      </span>
                      {studioServices.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            const newItem: QuotationItem = {
                              id: String(Date.now() + Math.random()),
                              serviceName: s.name,
                              description: s.shortDescription || s.fullDescription || '',
                              quantity: 1,
                              unit: s.unit || 'Units',
                              unitPrice: s.basePrice,
                              discount: s.discount || 0,
                              gstPercent: s.gst || 18,
                              total: Math.max(0, s.basePrice - (s.discount || 0)) * (1 + (s.gst || 18) / 100),
                            };
                            setFormItems([...formItems, newItem]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition"
                        >
                          + {s.name} (₹{s.basePrice.toLocaleString('en-IN')})
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Studio Packages */}
                  {studioPackages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider w-full mb-0.5">
                        Studio Bundled Packages:
                      </span>
                      {studioPackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            const newItem: QuotationItem = {
                              id: String(Date.now() + Math.random()),
                              serviceName: pkg.packageName,
                              description: pkg.description || `Bundle including ${pkg.includedServices.map((i) => i.serviceName).join(', ')}`,
                              quantity: 1,
                              unit: 'Package',
                              unitPrice: pkg.packagePrice,
                              discount: pkg.discount || 0,
                              gstPercent: 18,
                              total: Math.max(0, pkg.packagePrice - (pkg.discount || 0)) * 1.18,
                            };
                            setFormItems([...formItems, newItem]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition"
                        >
                          📦 + {pkg.packageName} (₹{pkg.packagePrice.toLocaleString('en-IN')})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Quotation Line Items</h3>
                <button
                  type="button"
                  onClick={() => addItemRow()}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Custom Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold text-[10px]">
                      <th className="p-2.5 rounded-l-xl">Service</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5">Unit Price (₹)</th>
                      <th className="p-2.5">Discount (₹)</th>
                      <th className="p-2.5">GST %</th>
                      <th className="p-2.5">Total (₹)</th>
                      <th className="p-2.5 rounded-r-xl"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2 min-w-[180px]">
                          <input
                            type="text"
                            value={item.serviceName}
                            onChange={(e) => updateItemField(idx, 'serviceName', e.target.value)}
                            placeholder="Service Name"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="w-full px-2 py-1 mt-1 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-500"
                          />
                        </td>
                        <td className="p-2 w-16">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold"
                          />
                        </td>
                        <td className="p-2 w-24">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItemField(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItemField(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-bold"
                          />
                        </td>
                        <td className="p-2 w-24">
                          <input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) => updateItemField(idx, 'discount', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right"
                          />
                        </td>
                        <td className="p-2 w-20">
                          <select
                            value={item.gstPercent}
                            onChange={(e) => updateItemField(idx, 'gstPercent', Number(e.target.value))}
                            className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-center"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                          </select>
                        </td>
                        <td className="p-2 font-black text-right text-slate-900 w-28">
                          ₹{item.total.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center w-10">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Box */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6 bg-slate-900 text-white p-6 rounded-2xl">
              <div className="space-y-2 flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400">Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={formHeader.termsAndConditions}
                  onChange={(e) => setFormHeader({ ...formHeader, termsAndConditions: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="w-full sm:w-64 space-y-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Sub Total:</span>
                  <span className="font-bold text-white">₹{subTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount:</span>
                  <span className="font-bold text-emerald-400">- ₹{totalDiscount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST Amount:</span>
                  <span className="font-bold text-white">₹{totalGst.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-black text-blue-400">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuotation}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20"
              >
                Save Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview PDF & Print Modal */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto my-auto print:max-h-none print:shadow-none print:p-0">
            {/* Top Toolbar (Hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Quotation #{previewQuotation.quotationNumber}
                </h3>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold">
                  {previewQuotation.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(previewQuotation)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(previewQuotation)}
                  disabled={isExportingPdf}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  {isExportingPdf ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="quotation-preview-doc" className="printable-area bg-white p-6 sm:p-10 border border-slate-200 rounded-2xl space-y-8 relative overflow-hidden print:border-none print:p-0">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-[-30deg]">
                <span className="text-6xl sm:text-8xl font-black text-slate-900 tracking-widest uppercase">
                  {previewQuotation.watermarkText || 'LENSMASTER'}
                </span>
              </div>

              {/* Studio & Quote Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                    {studioProfile?.businessName || studioProfile?.studioName || 'LensMaster Studio'}
                  </h1>
                  <p className="text-xs font-semibold text-slate-500">{studioProfile?.address || 'Photo City'}</p>
                  <p className="text-xs text-slate-500">Phone: {studioProfile?.mobileNumber || '+91 9876543210'}</p>
                  {studioProfile?.gstNumber && (
                    <p className="text-xs text-slate-500 font-mono">GSTIN: {studioProfile.gstNumber}</p>
                  )}
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-md">
                    PHOTOGRAPHY QUOTATION
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 mt-2">
                    {previewQuotation.quotationNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    Date: {previewQuotation.createdAt.split('T')[0]}
                  </p>
                  <p className="text-xs text-slate-500">
                    Valid Until: {previewQuotation.validUntilDate}
                  </p>
                </div>
              </div>

              {/* Customer & Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">PREPARED FOR</p>
                  <p className="font-extrabold text-slate-900 text-sm">{previewQuotation.customerName}</p>
                  <p>Mobile: {previewQuotation.customerPhone}</p>
                  {previewQuotation.customerEmail && <p>Email: {previewQuotation.customerEmail}</p>}
                  {previewQuotation.customerAddress && <p>Address: {previewQuotation.customerAddress}</p>}
                </div>

                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">EVENT DETAILS</p>
                  <p className="font-extrabold text-slate-900 text-sm">{previewQuotation.eventType}</p>
                  <p>Date: {previewQuotation.eventDate}</p>
                  {previewQuotation.eventVenue && <p>Venue: {previewQuotation.eventVenue}</p>}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 rounded-l-lg">Service Item</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">GST %</th>
                      <th className="p-3 text-right rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewQuotation.items.map((i) => (
                      <tr key={i.id}>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{i.serviceName}</p>
                          {i.description && <p className="text-slate-400 text-[11px]">{i.description}</p>}
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {i.quantity} {i.unit}
                        </td>
                        <td className="p-3 text-right font-mono">₹{i.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono">{i.gstPercent}%</td>
                        <td className="p-3 text-right font-bold text-slate-900 font-mono">
                          ₹{i.total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Breakdown */}
              <div className="flex flex-col sm:flex-row items-end justify-between gap-6 border-t border-slate-200 pt-4">
                {/* QR Code placeholder */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-14 w-14 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center">
                    <QrCode className="h-10 w-10 text-slate-800" />
                  </div>
                  <div className="text-[11px]">
                    <p className="font-bold text-slate-800">Scan to Verify & Pay</p>
                    <p className="text-slate-400">UPI / Banking Gateway</p>
                  </div>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-600 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{previewQuotation.subTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {previewQuotation.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">- ₹{previewQuotation.totalDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span className="font-mono">₹{previewQuotation.totalGst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-blue-600">
                      ₹{previewQuotation.grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms & Digital Signature */}
              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-slate-700">Terms & Conditions:</p>
                  <p className="text-[11px] text-slate-500 whitespace-pre-line leading-relaxed">
                    {previewQuotation.termsAndConditions}
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-2 flex flex-col justify-end">
                  <p className="font-serif italic text-base text-slate-800 font-bold">
                    {previewQuotation.digitalSignatureUrl || studioProfile?.ownerName || 'Authorized Signatory'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Digital Signature / Authorized Manager
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Booking 1-Click Modal */}
      {convertModalQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Convert to Booking
              </h3>
              <button
                onClick={() => setConvertModalQuotation(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Converting quotation <strong>{convertModalQuotation.quotationNumber}</strong> for{' '}
              <strong>{convertModalQuotation.customerName}</strong> (₹
              {convertModalQuotation.grandTotal.toLocaleString('en-IN')}).
            </p>

            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <div className="font-bold">Automated 1-Click Creation:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Customer Profile record</li>
                <li>Confirmed Booking entry</li>
                <li>Production Work Order</li>
                <li>Calendar Event Schedule</li>
                <li>Official Invoice Draft</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Advance Payment Received (₹)
                </label>
                <input
                  type="number"
                  value={advanceAmountInput}
                  onChange={(e) => setAdvanceAmountInput(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cash">Cash</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setConvertModalQuotation(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={isConverting}
                onClick={handleConvertQuotation}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isConverting ? 'Converting...' : 'Confirm & Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
