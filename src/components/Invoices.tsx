import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  X, 
  Trash2, 
  FileText, 
  Download, 
  Printer, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  PlusCircle,
  Eye
} from 'lucide-react';
import { Customer, Booking, Invoice, InvoiceItem, PaymentStatus, PaymentMethod } from '../types';
import { dbInvoices } from '../services/dbService';
import { useToast } from './Toast';
import { downloadElementAsPDF, printElement } from '../utils/printPdfUtils';

interface InvoicesProps {
  invoices: Invoice[];
  bookings: Booking[];
  customers: Customer[];
  preselectedBooking: Booking | null;
  clearPreselectedBooking: () => void;
  studioProfile?: any;
  studioSettings?: any;
}

export default function Invoices({
  invoices,
  bookings,
  customers,
  preselectedBooking,
  clearPreselectedBooking,
  studioProfile,
  studioSettings,
}: InvoicesProps) {
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(preselectedBooking !== null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Form State
  const [bookingId, setBookingId] = useState(preselectedBooking?.id || '');
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(18); // Default 18% GST
  const [paidAmount, setPaidAmount] = useState<number>(preselectedBooking?.advancePaid || 0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('partially_paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Line items state
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    {
      description: preselectedBooking ? `${preselectedBooking.subType} Service` : '',
      rate: preselectedBooking ? preselectedBooking.totalAmount : 0,
      qty: 1,
      total: preselectedBooking ? preselectedBooking.totalAmount : 0,
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const previewStudioData = useMemo(() => {
    if (!selectedInvoiceForPrint) return null;
    const bName = studioSettings?.businessName || studioProfile?.businessName || studioSettings?.studioName || studioProfile?.studioName || 'Studio';
    const logo = studioSettings?.studioLogo || studioProfile?.studioLogo || '';
    const owner = studioSettings?.ownerName || studioProfile?.ownerName || 'Owner';
    const mobile = studioSettings?.mobileNumber || studioProfile?.mobileNumber || '';
    const bEmail = studioSettings?.email || studioProfile?.email || '';
    const bAddress = studioSettings?.address || studioProfile?.address || '';
    const gst = studioSettings?.gstNumber || studioProfile?.gstNumber || '';
    const panVal = studioSettings?.pan || '';
    const upi = studioSettings?.upiId || '';
    const qr = studioSettings?.qrCode || '';
    const rawTerms = studioSettings?.terms || '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.';
    const termsArray = rawTerms.split('\n').filter(t => t.trim());
    const authSig = studioSettings?.authorizedSignatory || owner;
    const sigImg = studioSettings?.signatureImage || '';
    const outstanding = selectedInvoiceForPrint.grandTotal - selectedInvoiceForPrint.paidAmount;
    const isSettled = outstanding <= 0 || selectedInvoiceForPrint.paymentStatus === 'paid';
    const invoiceFooter = studioSettings?.invoiceFooter || 'Thank you for your business!';
    
    const qrSrc = qr || (upi ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upi}&pn=${bName}&am=${outstanding}&cu=INR`)}` : '');

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
      qrSrc,
      termsArray,
      authSig,
      sigImg,
      outstanding,
      isSettled,
      invoiceFooter,
    };
  }, [selectedInvoiceForPrint, studioProfile, studioSettings]);

  // DOM Ref for Print element
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Automatically load booking details on select
  const handleBookingChange = (bId: string) => {
    setBookingId(bId);
    const selectedBooking = bookings.find(b => b.id === bId);
    if (selectedBooking) {
      setItems([
        {
          description: `${selectedBooking.subType} Service`,
          rate: selectedBooking.totalAmount,
          qty: 1,
          total: selectedBooking.totalAmount,
        }
      ]);
      setPaidAmount(selectedBooking.advancePaid);
      setPaymentStatus(selectedBooking.balanceDue === 0 ? 'paid' : 'partially_paid');
    }
  };

  // Add line item
  const handleAddItemRow = () => {
    setItems([...items, { description: '', rate: 0, qty: 1, total: 0 }]);
  };

  // Remove line item
  const handleRemoveItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Update item field
  const handleItemFieldChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: any) => {
    const updated = [...items];
    if (field === 'qty') {
      const qty = Math.max(1, parseInt(value) || 0);
      updated[index].qty = qty;
      updated[index].total = updated[index].rate * qty;
    } else if (field === 'rate') {
      const rate = Math.max(0, parseFloat(value) || 0);
      updated[index].rate = rate;
      updated[index].total = rate * updated[index].qty;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // Subtotal, Tax, Grand Total calculation
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = Math.min(subtotal, discount);
    const netSubtotal = subtotal - discountAmount;
    const taxAmount = (netSubtotal * taxPercent) / 100;
    const grandTotal = netSubtotal + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
    };
  }, [items, discount, taxPercent]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setBookingId(preselectedBooking?.id || '');
    setDiscount(0);
    setTaxPercent(18);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setItems(
      preselectedBooking 
        ? [{ description: `${preselectedBooking.subType} Service`, rate: preselectedBooking.totalAmount, qty: 1, total: preselectedBooking.totalAmount }]
        : [{ description: '', rate: 0, qty: 1, total: 0 }]
    );
    setPaidAmount(preselectedBooking?.advancePaid || 0);
    setPaymentStatus(preselectedBooking ? (preselectedBooking.balanceDue === 0 ? 'paid' : 'partially_paid') : 'unpaid');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Submit Invoice Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions

    if (!bookingId) {
      setErrorMsg('Please link a scheduled booking/job.');
      return;
    }

    // Verify item descriptions
    const emptyDesc = items.some(item => !item.description.trim());
    if (emptyDesc) {
      setErrorMsg('Please specify descriptions for all invoiced rows.');
      return;
    }

    const selectedBooking = bookings.find(b => b.id === bookingId);
    if (!selectedBooking) {
      setErrorMsg('Invalid Booking selected.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Map items to include a unique ID
    const invoicedItems: InvoiceItem[] = items.map((item, idx) => ({
      ...item,
      id: `item-${idx + 1}-${Date.now()}`,
    }));

    try {
      // Create Invoice Number (Format: Prefix-YYYYMM-XXXX)
      const dateParts = invoiceDate.split('-');
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const prefix = studioSettings?.invoicePrefix || 'SS-';
      const invoiceNumber = `${prefix}${dateParts[0]}${dateParts[1]}-${randomDigits}`;

      await dbInvoices.add({
        bookingId,
        customerId: selectedBooking.customerId,
        customerName: selectedBooking.customerName,
        invoiceNumber,
        items: invoicedItems,
        subtotal: calculations.subtotal,
        discount: calculations.discountAmount,
        tax: calculations.taxAmount,
        grandTotal: calculations.grandTotal,
        paidAmount,
        paymentStatus,
        paymentMethod: paymentStatus !== 'unpaid' ? paymentMethod : undefined,
        invoiceDate,
      });

      // Also trigger booking status update to completed or delivered if invoice paid
      if (paymentStatus === 'paid') {
        await dbInbookingsUpdatePaid(selectedBooking.id, calculations.grandTotal);
      }

      showSuccess(`Invoice ${invoiceNumber} created successfully!`);

      // Reset Form fields on success
      setBookingId('');
      setDiscount(0);
      setTaxPercent(18);
      setPaidAmount(0);
      setPaymentStatus('partially_paid');
      setPaymentMethod('upi');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setItems([{ description: '', rate: 0, qty: 1, total: 0 }]);
      setIsModalOpen(false);
      clearPreselectedBooking();
    } catch (error: any) {
      console.error('Invoicing error:', error);
      const msg = error?.message || 'Failed to draft invoice. Please try again.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dbInbookingsUpdatePaid = async (bId: string, amount: number) => {
    try {
      const bRef = bookings.find(b => b.id === bId);
      if (bRef) {
        // Enforce advancePaid to fully paid and balance due to 0
        const updatedBooking = {
          advancePaid: amount,
          balanceDue: 0,
          status: 'completed' as const,
        };
        // Handled through bookings service
        const { dbBookings } = await import('../services/dbService');
        await dbBookings.update(bId, updatedBooking);
      }
    } catch (e) {
      console.error('Update booking paid status failed', e);
    }
  };

  // Delete Invoice
  const handleDelete = async (id: string) => {
    if (isDeleting) return; // Prevent duplicate deletions
    const targetInvoice = invoices.find(inv => inv.id === id);
    const label = targetInvoice ? `invoice "${targetInvoice.invoiceNumber}"` : 'this invoice draft';

    if (confirm(`Are you sure you want to permanently delete ${label}?`)) {
      setIsDeleting(id);
      try {
        await dbInvoices.delete(id);
        showSuccess(`Deleted ${label} successfully.`);
      } catch (error: any) {
        console.error('Delete invoice error:', error);
        showError(error?.message || 'Failed to delete invoice.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Searching filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const query = searchQuery.toLowerCase();
      return (
        inv.customerName.toLowerCase().includes(query) ||
        inv.invoiceNumber.toLowerCase().includes(query)
      );
    });
  }, [invoices, searchQuery]);

  // Print Invoice function
  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoiceForPrint(invoice);
    setTimeout(() => {
      const success = printElement('printableInvoice', `Invoice-${invoice.invoiceNumber}`);
      if (success) {
        showSuccess(`Printing Invoice ${invoice.invoiceNumber}`);
      } else {
        showError('Unable to open print dialog.');
      }
    }, 100);
  };

  // Export PDF template function
  const handleDownloadPDF = async (invoice: Invoice) => {
    if (isExportingPdf) return;
    setSelectedInvoiceForPrint(invoice);
    setIsExportingPdf(true);
    try {
      await new Promise((res) => setTimeout(res, 100));
      const success = await downloadElementAsPDF({
        elementId: 'printableInvoice',
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      });
      if (success) {
        showSuccess(`Downloaded Invoice-${invoice.invoiceNumber}.pdf`);
      } else {
        showError('Failed to generate PDF document.');
      }
    } catch (err: any) {
      showError(`PDF Generation error: ${err?.message || err}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6" id="invoices-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-sans" id="invoices-title">
            Invoicing & Billing
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Create itemized GST-enabled invoices, print billing sheets, and download print-ready PDFs.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-150"
          id="btn-add-invoice"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex rounded-xl border border-gray-100 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.015)] items-center transition-all focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500/40">
        <Search className="h-5 w-5 text-slate-400 mr-2.5 ml-1" />
        <input
          type="text"
          placeholder="Search invoices by receipt ID, bill number, or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder-slate-400 font-medium"
          id="search-invoices-input"
        />
      </div>

      {/* Invoices Logs Table */}
      {filteredInvoices.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-gray-900 font-sans">No Invoices</h3>
          <p className="mt-1 text-sm text-slate-500 font-medium max-w-sm mx-auto">
            Draft your first invoice by linking a scheduled booking shoot.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/75">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Invoice Number</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Client</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Total Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Paid Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                    <td className="whitespace-nowrap px-6 py-4.5 font-extrabold text-sm text-slate-900 font-sans">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-sm font-bold text-slate-800">
                      {invoice.customerName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-xs text-slate-400 font-semibold">
                      {invoice.invoiceDate}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 font-extrabold text-sm text-slate-900 font-sans">
                      ₹{invoice.grandTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                        invoice.paymentStatus === 'paid' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : invoice.paymentStatus === 'partially_paid'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-rose-50 text-rose-750 border-rose-100'
                      }`}>
                        {invoice.paymentStatus === 'paid' ? 'Paid' : invoice.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-right text-sm">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview / Print receipt */}
                        <button
                          onClick={() => setSelectedInvoiceForPrint(invoice)}
                          title="Preview Invoice Print-sheet"
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition active:scale-95"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        {/* Print Invoice */}
                        <button
                          onClick={() => handlePrintInvoice(invoice)}
                          title="Print Invoice"
                          className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95"
                        >
                          <Printer className="h-4.5 w-4.5" />
                        </button>
                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          title="Download PDF"
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition active:scale-95"
                        >
                          <Download className="h-4.5 w-4.5" />
                        </button>
                        {/* Delete Invoice */}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          disabled={isDeleting !== null}
                          title="Delete Bill"
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition disabled:opacity-40 active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invisible HTML Nodes for Print PDF Generations */}
      <div className="hidden">
        {invoices.map((invoice) => {
          // Extract variables for the specific logged-in studio
          const bName = studioSettings?.businessName || studioProfile?.businessName || studioSettings?.studioName || studioProfile?.studioName || 'Studio';
          const logo = studioSettings?.studioLogo || studioProfile?.studioLogo || '';
          const owner = studioSettings?.ownerName || studioProfile?.ownerName || 'Owner';
          const mobile = studioSettings?.mobileNumber || studioProfile?.mobileNumber || '';
          const bEmail = studioSettings?.email || studioProfile?.email || '';
          const bAddress = studioSettings?.address || studioProfile?.address || '';
          const gst = studioSettings?.gstNumber || studioProfile?.gstNumber || '';
          const panVal = studioSettings?.pan || '';
          const upi = studioSettings?.upiId || '';
          const qr = studioSettings?.qrCode || '';
          const rawTerms = studioSettings?.terms || '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.';
          const termsArray = rawTerms.split('\n').filter((t: string) => t.trim());
          const authSig = studioSettings?.authorizedSignatory || owner;
          const sigImg = studioSettings?.signatureImage || '';
          const outstanding = invoice.grandTotal - invoice.paidAmount;
          const isSettled = outstanding <= 0 || invoice.paymentStatus === 'paid';
          const invoiceFooter = studioSettings?.invoiceFooter || 'Thank you for your business!';
          
          // Generate QR code URL if custom QR not uploaded
          const qrSrc = qr || (upi ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upi}&pn=${bName}&am=${outstanding}&cu=INR`)}` : '');

          return (
            <div 
              key={invoice.id} 
              id={`invoice-print-area-${invoice.id}`} 
              className="p-8 bg-white font-sans text-gray-900 invoice-container"
              style={{ width: '190mm', minHeight: 'auto', boxSizing: 'border-box' }}
            >
              {/* Store Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                <div className="flex gap-4 items-start">
                  {logo ? (
                    <img src={logo} alt="Studio Logo" className="h-16 w-16 rounded-xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-gray-100">
                      {bName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">{bName}</h1>
                    {owner && <p className="text-3xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Proprietor: {owner}</p>}
                    {bAddress && <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">{bAddress}</p>}
                    {(mobile || bEmail) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {mobile && <span>Call: {mobile}</span>}
                        {mobile && bEmail && <span className="mx-1.5">|</span>}
                        {bEmail && <span>Email: {bEmail}</span>}
                      </p>
                    )}
                    {(gst || panVal) && (
                      <p className="text-3xs font-bold text-gray-600 tracking-wider uppercase mt-1">
                        {gst && <span className="bg-gray-100 px-1.5 py-0.5 rounded mr-2">GSTIN: {gst}</span>}
                        {panVal && <span className="bg-gray-100 px-1.5 py-0.5 rounded">PAN: {panVal}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-700 tracking-wider">TAX INVOICE</h2>
                    {/* Colored payment badge */}
                    {invoice.paymentStatus === 'paid' && (
                      <span className="px-2 py-0.5 text-4xs font-extrabold uppercase tracking-widest rounded bg-emerald-100 text-emerald-800 border border-emerald-200">PAID</span>
                    )}
                    {invoice.paymentStatus === 'partially_paid' && (
                      <span className="px-2 py-0.5 text-4xs font-extrabold uppercase tracking-widest rounded bg-amber-100 text-amber-800 border border-amber-200">PARTIALLY PAID</span>
                    )}
                    {invoice.paymentStatus === 'unpaid' && (
                      <span className="px-2 py-0.5 text-4xs font-extrabold uppercase tracking-widest rounded bg-rose-100 text-rose-800 border border-rose-200">UNPAID</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Bill No: <span className="font-semibold text-gray-800">{invoice.invoiceNumber}</span></p>
                    <p>Date: <span className="font-semibold text-gray-800">{invoice.invoiceDate}</span></p>
                  </div>
                </div>
              </div>

              {/* Client billing address details */}
              <div className="my-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 text-3xs">Billed To:</h4>
                  <p className="text-sm font-bold text-gray-800 mt-1">{invoice.customerName}</p>
                  {customers.find(c => c.id === invoice.customerId)?.phone && (
                    <p className="text-gray-500 mt-0.5">Phone: {customers.find(c => c.id === invoice.customerId)?.phone}</p>
                  )}
                  {customers.find(c => c.id === invoice.customerId)?.email && (
                    <p className="text-gray-500">Email: {customers.find(c => c.id === invoice.customerId)?.email}</p>
                  )}
                  {customers.find(c => c.id === invoice.customerId)?.address && (
                    <p className="text-gray-500 mt-1 max-w-xs">{customers.find(c => c.id === invoice.customerId)?.address}</p>
                  )}
                </div>
                <div className="text-right">
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 text-3xs">Linked Job Details:</h4>
                  <p className="text-gray-600 mt-1">Job ID: <span className="font-medium text-gray-800">{invoice.bookingId.slice(0, 8)}...</span></p>
                  <p className="text-gray-600">Payment Status: <span className="font-semibold capitalize text-blue-600">{invoice.paymentStatus.replace('_', ' ')}</span></p>
                </div>
              </div>

              {/* Invoiced items list table */}
              <table className="min-w-full divide-y divide-gray-200 text-left border border-gray-100 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr className="text-3xs font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2">S.No</th>
                    <th className="px-4 py-2">Description of Service/Goods</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {invoice.items.map((item, index) => (
                    <tr key={item.id} className="text-xs text-gray-700">
                      <td className="px-4 py-2 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{item.description}</td>
                      <td className="px-4 py-2 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-center">{item.qty}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">₹{item.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations summaries & Bank details */}
              <div className="mt-6 flex justify-between items-start">
                <div className="text-3xs text-gray-500 max-w-xs">
                  {studioSettings?.bankDetails && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="font-bold text-gray-700 uppercase tracking-wider mb-1">Bank Account Details:</p>
                      <p className="whitespace-pre-line leading-relaxed">{studioSettings.bankDetails}</p>
                    </div>
                  )}
                </div>

                <div className="w-80 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span>₹{invoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Discount:</span>
                      <span>-₹{invoice.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {invoice.tax > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>CGST/SGST (18%):</span>
                      <span>₹{invoice.tax.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-sm text-gray-900">
                    <span>Grand Total:</span>
                    <span>₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Collected Paid Amount:</span>
                    <span>₹{invoice.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`flex justify-between border-t border-gray-100 pt-1 font-bold text-xs ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    <span>Outstanding Balance:</span>
                    <span>₹{Math.max(0, outstanding).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Payment QR / Settled Section */}
              <div className="mt-6">
                {isSettled ? (
                  /* PAYMENT SETTLED Box */
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                    <div className="rounded-full bg-emerald-100 p-1 text-emerald-700 shrink-0">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">✔ PAYMENT SETTLED</h4>
                      <p className="text-3xs text-emerald-700 mt-0.5 font-semibold">
                        Thank you! This transaction has been paid in full and settled.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* QR Payment Section */
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {qrSrc ? (
                        <img src={qrSrc} alt="Payment QR" className="h-16 w-16 object-contain bg-white p-1 rounded border border-gray-200" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-16 w-16 flex items-center justify-center bg-gray-200 rounded text-gray-400">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Scan to Pay</p>
                        {upi && <p className="text-3xs text-gray-500 mt-0.5">UPI ID: <span className="font-mono font-bold text-gray-700">{upi}</span></p>}
                        <p className="text-3xs text-gray-400 mt-0.5">Use any UPI app (PhonePe, GPay, Paytm) to settle the bill.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Payable Due Amount</p>
                      <p className="text-lg font-extrabold text-rose-600">₹{outstanding.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature & Declaration */}
              <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-end">
                <div className="text-3xs text-gray-400 max-w-sm">
                  <p className="font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions:</p>
                  <ul className="list-decimal pl-3.5 space-y-0.5 mt-1">
                    {termsArray.map((t: string, idx: number) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-8 text-center">
                  <div className="w-36 pt-6">
                    <div className="h-10 flex items-end justify-center mb-1 border-b border-gray-200"></div>
                    <p className="text-3xs text-gray-500 uppercase tracking-wider font-semibold">Customer Signature</p>
                  </div>
                  <div className="w-48">
                    <div className="h-10 flex items-end justify-center mb-1">
                      {sigImg ? (
                        <img src={sigImg} alt="Signature" className="max-h-10 max-w-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <p className="text-xs italic font-medium text-gray-300">{authSig}</p>
                      )}
                    </div>
                    <div className="border-t border-gray-200 pt-1">
                      <p className="text-3xs text-gray-500 uppercase tracking-wider font-bold">Authorized Signatory</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 leading-tight">{authSig}</p>
                      <p className="text-4xs text-gray-400 uppercase tracking-wide font-semibold mt-0.5">For {bName}</p>
                    </div>
                  </div>
                </div>
              </div>
              {invoiceFooter && (
                <div className="mt-6 border-t border-dashed border-gray-200 pt-3 text-center">
                  <p className="text-4xs text-gray-400 font-medium tracking-wider italic uppercase">{invoiceFooter}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invoice Detail modal preview and trigger download */}
      <AnimatePresence>
        {selectedInvoiceForPrint && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedInvoiceForPrint(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl overflow-y-auto max-h-[90vh] rounded-2xl border border-gray-100 bg-white p-6 shadow-xl cursor-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  Invoice Preview: {selectedInvoiceForPrint.invoiceNumber}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePrintInvoice(selectedInvoiceForPrint)}
                    className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                    id="modal-print-invoice-btn"
                  >
                    <Printer className="mr-1 h-4 w-4" /> Print Invoice
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(selectedInvoiceForPrint)}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <Download className="mr-1 h-4 w-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceForPrint(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* PDF Preview container mock layout inside modal */}
              {previewStudioData && (
                <div className="mt-4 p-6 bg-gray-50 border border-gray-100 rounded-xl max-h-[60vh] overflow-y-auto">
                  <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-gray-900 font-sans">
                    {/* Store Header */}
                    <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                      <div className="flex gap-4 items-start">
                        {previewStudioData.logo ? (
                          <img src={previewStudioData.logo} alt="Studio Logo" className="h-12 w-12 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-gray-100 shrink-0">
                            {previewStudioData.bName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h1 className="text-base font-bold tracking-tight text-gray-900 uppercase leading-none">{previewStudioData.bName}</h1>
                          {previewStudioData.owner && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Proprietor: {previewStudioData.owner}</p>}
                          {previewStudioData.bAddress && <p className="text-[11px] text-gray-500 mt-1 max-w-xs leading-tight">{previewStudioData.bAddress}</p>}
                          {(previewStudioData.mobile || previewStudioData.bEmail) && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {previewStudioData.mobile && <span>Call: {previewStudioData.mobile}</span>}
                              {previewStudioData.mobile && previewStudioData.bEmail && <span className="mx-1">|</span>}
                              {previewStudioData.bEmail && <span>{previewStudioData.bEmail}</span>}
                            </p>
                          )}
                          {(previewStudioData.gst || previewStudioData.panVal) && (
                            <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-1">
                              {previewStudioData.gst && <span className="bg-gray-100 px-1 py-0.5 rounded mr-1.5">GSTIN: {previewStudioData.gst}</span>}
                              {previewStudioData.panVal && <span className="bg-gray-100 px-1 py-0.5 rounded">PAN: {previewStudioData.panVal}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base font-bold text-gray-600 tracking-wider">TAX INVOICE</h2>
                          {/* Colored payment badge */}
                          {selectedInvoiceForPrint.paymentStatus === 'paid' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded bg-emerald-100 text-emerald-800 border border-emerald-200">PAID</span>
                          )}
                          {selectedInvoiceForPrint.paymentStatus === 'partially_paid' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded bg-amber-100 text-amber-800 border border-amber-200">PARTIALLY PAID</span>
                          )}
                          {selectedInvoiceForPrint.paymentStatus === 'unpaid' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded bg-rose-100 text-rose-800 border border-rose-200">UNPAID</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 space-y-0.5 leading-none">
                          <p>Bill No: <span className="font-semibold text-gray-800">{selectedInvoiceForPrint.invoiceNumber}</span></p>
                          <p>Date: <span className="font-semibold text-gray-800">{selectedInvoiceForPrint.invoiceDate}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Client billing address details */}
                    <div className="my-4 grid grid-cols-2 gap-4 text-[11px]">
                      <div>
                        <h4 className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">Billed To:</h4>
                        <p className="text-xs font-bold text-gray-800 mt-0.5">{selectedInvoiceForPrint.customerName}</p>
                        {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.phone && (
                          <p className="text-gray-500 mt-0.5">Phone: {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.phone}</p>
                        )}
                        {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.address && (
                          <p className="text-gray-500 mt-0.5 max-w-xs">{customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.address}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <h4 className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">Linked Job Details:</h4>
                        <p className="text-gray-600 mt-0.5">Job ID: <span className="font-medium text-gray-800">{selectedInvoiceForPrint.bookingId.slice(0, 8)}...</span></p>
                        <p className="text-gray-600">Payment Status: <span className="font-semibold capitalize text-blue-600">{selectedInvoiceForPrint.paymentStatus.replace('_', ' ')}</span></p>
                      </div>
                    </div>

                    {/* Invoiced items list table */}
                    <table className="min-w-full divide-y divide-gray-200 text-left border border-gray-100 rounded-lg overflow-hidden text-[11px]">
                      <thead className="bg-gray-50">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          <th className="px-3 py-1.5">S.No</th>
                          <th className="px-3 py-1.5">Description of Service/Goods</th>
                          <th className="px-3 py-1.5 text-right">Rate</th>
                          <th className="px-3 py-1.5 text-center">Qty</th>
                          <th className="px-3 py-1.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedInvoiceForPrint.items.map((item, index) => (
                          <tr key={item.id} className="text-gray-700">
                            <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                            <td className="px-3 py-2 font-medium">{item.description}</td>
                            <td className="px-3 py-2 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-center">{item.qty}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900">₹{item.total.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Calculations summaries & Bank details */}
                    <div className="mt-4 flex justify-between items-start text-[11px]">
                      <div className="text-[10px] text-gray-500 max-w-xs">
                        {studioSettings?.bankDetails && (
                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            <p className="font-bold text-gray-700 uppercase tracking-wider mb-0.5">Bank Account Details:</p>
                            <p className="whitespace-pre-line leading-relaxed">{studioSettings.bankDetails}</p>
                          </div>
                        )}
                      </div>

                      <div className="w-64 space-y-1.5">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal:</span>
                          <span>₹{selectedInvoiceForPrint.subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {selectedInvoiceForPrint.discount > 0 && (
                          <div className="flex justify-between text-gray-500">
                            <span>Discount:</span>
                            <span>-₹{selectedInvoiceForPrint.discount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {selectedInvoiceForPrint.tax > 0 && (
                          <div className="flex justify-between text-gray-500">
                            <span>CGST/SGST (18%):</span>
                            <span>₹{selectedInvoiceForPrint.tax.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900 text-xs">
                          <span>Grand Total:</span>
                          <span>₹{selectedInvoiceForPrint.grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 font-bold">
                          <span>Collected Paid Amount:</span>
                          <span>₹{selectedInvoiceForPrint.paidAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={`flex justify-between border-t border-gray-100 pt-0.5 font-bold ${previewStudioData.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          <span>Outstanding Balance:</span>
                          <span>₹{Math.max(0, previewStudioData.outstanding).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment QR / Settled Section */}
                    <div className="mt-4">
                      {previewStudioData.isSettled ? (
                        /* PAYMENT SETTLED Box */
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-2.5">
                          <div className="rounded-full bg-emerald-100 p-0.5 text-emerald-700 shrink-0">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">✔ PAYMENT SETTLED</h4>
                            <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">
                              Thank you! This transaction has been paid in full and settled.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* QR Payment Section */
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {previewStudioData.qrSrc ? (
                              <img src={previewStudioData.qrSrc} alt="Payment QR" className="h-12 w-12 object-contain bg-white p-0.5 rounded border border-gray-200" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-12 w-12 flex items-center justify-center bg-gray-200 rounded text-gray-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                                </svg>
                              </div>
                            )}
                            <div>
                              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Scan to Pay</p>
                              {previewStudioData.upi && <p className="text-[10px] text-gray-500 mt-0.5">UPI ID: <span className="font-mono font-bold text-gray-700">{previewStudioData.upi}</span></p>}
                              <p className="text-[10px] text-gray-400 mt-0.5">Use any UPI app to pay.</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payable Due Amount</p>
                            <p className="text-base font-extrabold text-rose-600">₹{previewStudioData.outstanding.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Signature & Declaration */}
                    <div className="mt-6 border-t border-gray-100 pt-3 flex justify-between items-end text-[10px]">
                      <div className="text-gray-400 max-w-sm">
                        <p className="font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions:</p>
                        <ul className="list-decimal pl-3.5 space-y-0.5 mt-0.5">
                          {previewStudioData.termsArray.map((t: string, idx: number) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-4 text-center">
                        <div className="w-28 pt-4">
                          <div className="h-8 flex items-end justify-center mb-0.5 border-b border-gray-200"></div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Customer Signature</p>
                        </div>
                        <div className="w-40">
                          <div className="h-8 flex items-end justify-center mb-0.5">
                            {previewStudioData.sigImg ? (
                              <img src={previewStudioData.sigImg} alt="Signature" className="max-h-8 max-w-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <p className="text-[10px] italic font-medium text-gray-300">{previewStudioData.authSig}</p>
                            )}
                          </div>
                          <div className="border-t border-gray-200 pt-0.5">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Authorized Signatory</p>
                            <p className="text-[10px] font-bold text-gray-800 mt-0.5 leading-tight">{previewStudioData.authSig}</p>
                            <p className="text-[8px] text-gray-400 uppercase tracking-wide font-semibold mt-0.5">For {previewStudioData.bName}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {previewStudioData.invoiceFooter && (
                      <div className="mt-4 border-t border-dashed border-gray-150 pt-2 text-center">
                        <p className="text-[9px] text-gray-400 font-medium tracking-wide italic">{previewStudioData.invoiceFooter}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Creation Wizard Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl overflow-y-auto max-h-[90vh] rounded-[24px] border border-gray-100 bg-white p-7 shadow-2xl relative"
              id="invoice-creation-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">
                  Draft New Invoice Receipt
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    clearPreselectedBooking();
                  }}
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {errorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-600">
                    {errorMsg}
                  </div>
                )}

                {/* Booking Selection & Invoice Date Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Link Active Booking Job *</label>
                    <select
                      required
                      value={bookingId}
                      onChange={(e) => handleBookingChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                      id="select-booking-dropdown"
                    >
                      <option value="">-- Choose Job Log to Bill --</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.customerName} - {b.subType} (Total: ₹{b.totalAmount.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoice Date</label>
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Itemized Grid Lines */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Itemized Bill Rows</label>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                    >
                      <PlusCircle className="mr-1 h-4 w-4" /> Add Row
                    </button>
                  </div>

                  <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-150 shadow-xs">
                        {/* Description */}
                        <div className="flex-1">
                          <input
                            type="text"
                            required
                            placeholder="Description of goods/service"
                            value={item.description}
                            onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:border-[#2563EB] focus:ring-3 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                          />
                        </div>
                        {/* Rate */}
                        <div className="w-24">
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="Rate (₹)"
                            value={item.rate || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:border-[#2563EB] focus:ring-3 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                          />
                        </div>
                        {/* Qty */}
                        <div className="w-16">
                          <input
                            type="number"
                            required
                            min={1}
                            placeholder="Qty"
                            value={item.qty || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'qty', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:border-[#2563EB] focus:ring-3 focus:ring-blue-500/10 focus:outline-none text-center transition-all duration-150"
                          />
                        </div>
                        {/* Row Total (read-only) */}
                        <div className="w-24 text-right text-xs font-extrabold text-slate-900 pr-2 font-mono">
                          ₹{item.total.toLocaleString('en-IN')}
                        </div>
                        {/* Delete Row button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={items.length === 1}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional parameters (Discount, Tax Percent) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Discount Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm text-rose-600 font-extrabold focus:border-red-500 focus:ring-4 focus:ring-red-500/5 focus:outline-none transition-all duration-150"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">GST Tax Rate (%)</label>
                    <select
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    >
                      <option value="0">No GST (0%)</option>
                      <option value="5">GST @ 5%</option>
                      <option value="12">GST @ 12%</option>
                      <option value="18">GST @ 18%</option>
                      <option value="28">GST @ 28%</option>
                    </select>
                  </div>
                </div>

                {/* Calculations preview box */}
                <div className="bg-[#2563EB]/5 p-4.5 rounded-2xl border border-blue-100/70 space-y-2 text-sm text-slate-600 shadow-2xs">
                  <div className="flex justify-between font-medium">
                    <span>Invoiced Subtotal:</span>
                    <span className="font-extrabold text-slate-900">₹{calculations.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {calculations.discountAmount > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Applied Discount:</span>
                      <span className="font-extrabold text-rose-600">-₹{calculations.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {calculations.taxAmount > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Calculated CGST/SGST ({taxPercent}%):</span>
                      <span className="font-extrabold text-slate-900">₹{calculations.taxAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-blue-200/50 pt-2.5 text-base font-extrabold text-slate-950 font-sans">
                    <span>Grand Invoiced Total:</span>
                    <span className="text-lg">₹{calculations.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Payment parameters */}
                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                  {/* Paid amount */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        max={calculations.grandTotal}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm text-emerald-600 font-extrabold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 focus:outline-none transition-all duration-150"
                      />
                    </div>
                  </div>

                  {/* Payment status */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="paid">Fully Paid</option>
                    </select>
                  </div>

                  {/* Payment method */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment Method</label>
                    <select
                      disabled={paymentStatus === 'unpaid'}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none disabled:opacity-50 transition-all duration-150"
                    >
                      <option value="upi">UPI (GPay/PhonePe)</option>
                      <option value="cash">Cash Handover</option>
                      <option value="card">Debit/Credit Card</option>
                      <option value="bank_transfer">Direct IMPS/Bank</option>
                    </select>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      clearPreselectedBooking();
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:shadow-md hover:shadow-blue-500/10 active:scale-95 disabled:opacity-50 transition-all duration-150"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Invoice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print CSS Stylesheet */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        html, body {
          margin: 0;
          padding: 0;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printableInvoice,
          #printableInvoice * {
            visibility: visible;
          }
          #printableInvoice {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 190mm !important;
            overflow: hidden;
            page-break-after: avoid;
            break-after: avoid-page;
            page-break-inside: avoid;
            break-inside: avoid;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure background colors, text, logos and QR codes print correctly */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Printable Invoice Container */}
      {selectedInvoiceForPrint && previewStudioData && (
        <div className="hidden print:block fixed left-[-9999px] top-0 print:static print:left-0">
          <div 
            id="printableInvoice" 
            className="bg-white text-gray-900 font-sans p-8"
            style={{ width: '190mm', minHeight: 'auto', boxSizing: 'border-box' }}
          >
          {/* Store Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div className="flex gap-4 items-start">
              {previewStudioData.logo ? (
                <img src={previewStudioData.logo} alt="Studio Logo" className="h-16 w-16 rounded-xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-gray-100">
                  {previewStudioData.bName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">{previewStudioData.bName}</h1>
                {previewStudioData.owner && <p className="text-3xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Proprietor: {previewStudioData.owner}</p>}
                {previewStudioData.bAddress && <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">{previewStudioData.bAddress}</p>}
                {(previewStudioData.mobile || previewStudioData.bEmail) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {previewStudioData.mobile && <span>Call: {previewStudioData.mobile}</span>}
                    {previewStudioData.mobile && previewStudioData.bEmail && <span className="mx-1.5">|</span>}
                    {previewStudioData.bEmail && <span>Email: {previewStudioData.bEmail}</span>}
                  </p>
                )}
                {(previewStudioData.gst || previewStudioData.panVal) && (
                  <p className="text-3xs font-bold text-gray-600 tracking-wider uppercase mt-1">
                    {previewStudioData.gst && <span className="bg-gray-100 px-1.5 py-0.5 rounded mr-2">GSTIN: {previewStudioData.gst}</span>}
                    {previewStudioData.panVal && <span className="bg-gray-100 px-1.5 py-0.5 rounded">PAN: {previewStudioData.panVal}</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col items-end space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-700 tracking-wider">TAX INVOICE</h2>
                {selectedInvoiceForPrint.paymentStatus === 'paid' && (
                  <span className="px-2 py-0.5 text-4xs font-extrabold uppercase tracking-widest rounded bg-emerald-100 text-emerald-800 border border-emerald-200">PAID</span>
                )}
                {selectedInvoiceForPrint.paymentStatus === 'partially_paid' && (
                  <span className="px-2 py-0.5 text-4xs font-extrabold uppercase tracking-widest rounded bg-amber-100 text-amber-800 border border-amber-200">PARTIALLY PAID</span>
                )}
                {selectedInvoiceForPrint.paymentStatus === 'unpaid' && (
                  <span className="px-2 py-0.5 text-4xs font-extrabold uppercase tracking-widest rounded bg-rose-100 text-rose-800 border border-rose-200">UNPAID</span>
                )}
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Bill No: <span className="font-semibold text-gray-800">{selectedInvoiceForPrint.invoiceNumber}</span></p>
                <p>Date: <span className="font-semibold text-gray-800">{selectedInvoiceForPrint.invoiceDate}</span></p>
              </div>
            </div>
          </div>

          {/* Client billing address details */}
          <div className="my-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-bold uppercase tracking-wider text-gray-400 text-3xs">Billed To:</h4>
              <p className="text-sm font-bold text-gray-800 mt-1">{selectedInvoiceForPrint.customerName}</p>
              {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.phone && (
                <p className="text-gray-500 mt-0.5">Phone: {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.phone}</p>
              )}
              {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.email && (
                <p className="text-gray-500">Email: {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.email}</p>
              )}
              {customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.address && (
                <p className="text-gray-500 mt-1 max-w-xs">{customers.find(c => c.id === selectedInvoiceForPrint.customerId)?.address}</p>
              )}
            </div>
            <div className="text-right">
              <h4 className="font-bold uppercase tracking-wider text-gray-400 text-3xs">Linked Job Details:</h4>
              <p className="text-gray-600 mt-1">Job ID: <span className="font-medium text-gray-800">{selectedInvoiceForPrint.bookingId.slice(0, 8)}...</span></p>
              <p className="text-gray-600">Payment Status: <span className="font-semibold capitalize text-blue-600">{selectedInvoiceForPrint.paymentStatus.replace('_', ' ')}</span></p>
            </div>
          </div>

          {/* Invoiced items list table */}
          <table className="min-w-full divide-y divide-gray-200 text-left border border-gray-100 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr className="text-3xs font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">S.No</th>
                <th className="px-4 py-2">Description of Service/Goods</th>
                <th className="px-4 py-2 text-right">Rate</th>
                <th className="px-4 py-2 text-center">Qty</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {selectedInvoiceForPrint.items.map((item, index) => (
                <tr key={item.id} className="text-xs text-gray-700">
                  <td className="px-4 py-2 text-gray-400">{index + 1}</td>
                  <td className="px-4 py-2 font-medium">{item.description}</td>
                  <td className="px-4 py-2 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-center">{item.qty}</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">₹{item.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calculations summaries & Bank details */}
          <div className="mt-6 flex justify-between items-start">
            <div className="text-3xs text-gray-500 max-w-xs">
              {studioSettings?.bankDetails && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-700 uppercase tracking-wider mb-1">Bank Account Details:</p>
                  <p className="whitespace-pre-line leading-relaxed">{studioSettings.bankDetails}</p>
                </div>
              )}
            </div>

            <div className="w-80 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal:</span>
                <span>₹{selectedInvoiceForPrint.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {selectedInvoiceForPrint.discount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Discount:</span>
                  <span>-₹{selectedInvoiceForPrint.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {selectedInvoiceForPrint.tax > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>CGST/SGST (18%):</span>
                  <span>₹{selectedInvoiceForPrint.tax.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-sm text-gray-900">
                <span>Grand Total:</span>
                <span>₹{selectedInvoiceForPrint.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Collected Paid Amount:</span>
                <span>₹{selectedInvoiceForPrint.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className={`flex justify-between border-t border-gray-100 pt-1 font-bold text-xs ${previewStudioData.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                <span>Outstanding Balance:</span>
                <span>₹{Math.max(0, previewStudioData.outstanding).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Payment QR / Settled Section */}
          <div className="mt-6">
            {previewStudioData.isSettled ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                <div className="rounded-full bg-emerald-100 p-1 text-emerald-700 shrink-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">✔ PAYMENT SETTLED</h4>
                  <p className="text-3xs text-emerald-700 mt-0.5 font-semibold">
                    Thank you! This transaction has been paid in full and settled.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {previewStudioData.qrSrc ? (
                    <img src={previewStudioData.qrSrc} alt="Payment QR" className="h-16 w-16 object-contain bg-white p-1 rounded border border-gray-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-gray-200 rounded text-gray-400">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Scan to Pay</p>
                    {previewStudioData.upi && <p className="text-3xs text-gray-500 mt-0.5">UPI ID: <span className="font-mono font-bold text-gray-700">{previewStudioData.upi}</span></p>}
                    <p className="text-3xs text-gray-400 mt-0.5">Use any UPI app to pay.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Payable Due Amount</p>
                  <p className="text-lg font-extrabold text-rose-600">₹{previewStudioData.outstanding.toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Signature & Declaration */}
          <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-end">
            <div className="text-3xs text-gray-400 max-w-sm">
              <p className="font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions:</p>
              <ul className="list-decimal pl-3.5 space-y-0.5 mt-1">
                {previewStudioData.termsArray.map((t: string, idx: number) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-8 text-center">
              <div className="w-36 pt-6">
                <div className="h-10 flex items-end justify-center mb-1 border-b border-gray-200"></div>
                <p className="text-3xs text-gray-500 uppercase tracking-wider font-semibold">Customer Signature</p>
              </div>
              <div className="w-48">
                <div className="h-10 flex items-end justify-center mb-1">
                  {previewStudioData.sigImg ? (
                    <img src={previewStudioData.sigImg} alt="Signature" className="max-h-10 max-w-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <p className="text-xs italic font-medium text-gray-300">{previewStudioData.authSig}</p>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-1">
                  <p className="text-3xs text-gray-500 uppercase tracking-wider font-bold">Authorized Signatory</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5 leading-tight">{previewStudioData.authSig}</p>
                  <p className="text-4xs text-gray-400 uppercase tracking-wide font-semibold mt-0.5">For {previewStudioData.bName}</p>
                </div>
              </div>
            </div>
          </div>
          {previewStudioData.invoiceFooter && (
            <div className="mt-6 border-t border-dashed border-gray-200 pt-3 text-center">
              <p className="text-4xs text-gray-400 font-medium tracking-wider italic uppercase">{previewStudioData.invoiceFooter}</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
