import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Trash2, 
  Edit, 
  Camera, 
  Plus, 
  X,
  Printer,
  Download 
} from 'lucide-react';
import { Customer } from '../types';
import { dbCustomers } from '../services/dbService';
import { printElement, downloadElementAsPDF } from '../utils/printPdfUtils';
import { useToast } from './Toast';

interface CustomersProps {
  customers: Customer[];
  onBookForCustomer: (customer: Customer) => void;
}

export default function Customers({ customers, onBookForCustomer }: CustomersProps) {
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activePrintCustomer, setActivePrintCustomer] = useState<Customer | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePrintCustomer = (customer: Customer) => {
    setActivePrintCustomer(customer);
    setTimeout(() => {
      const success = printElement('printableCustomerDetails', `Customer-${customer.name.replace(/\s+/g, '_')}`);
      if (success) {
        showSuccess(`Printing Client Profile for "${customer.name}"`);
      } else {
        showError('Unable to open print dialog.');
      }
    }, 100);
  };

  const handleDownloadCustomerPDF = async (customer: Customer) => {
    if (isExportingPdf) return;
    setActivePrintCustomer(customer);
    setIsExportingPdf(true);
    try {
      await new Promise(res => setTimeout(res, 100));
      const success = await downloadElementAsPDF({
        elementId: 'printableCustomerDetails',
        filename: `Customer-${customer.name.replace(/\s+/g, '_')}.pdf`,
      });
      if (success) {
        showSuccess(`Downloaded Client Statement PDF for "${customer.name}"`);
      }
    } catch (err: any) {
      showError('Failed to generate PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Search filter
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const query = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email && c.email.toLowerCase().includes(query))
      );
    });
  }, [customers, searchQuery]);

  // Handle open modal for create
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submits
    
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Name and Phone fields are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingCustomer) {
        // Update
        await dbCustomers.update(editingCustomer.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || '',
          address: address.trim() || '',
        });
        showSuccess(`Successfully updated profile of client "${name.trim()}"`);
      } else {
        // Create
        await dbCustomers.add({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || '',
          address: address.trim() || '',
        });
        showSuccess(`Successfully registered new client "${name.trim()}"`);
      }
      
      // On success, reset form and close dialog
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Firebase customer save error:', error);
      const msg = error?.message || 'Failed to save client. Please try again.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete customer
  const handleDelete = async (id: string) => {
    if (isDeleting) return; // Prevent duplicate deleting
    const targetCustomer = customers.find(c => c.id === id);
    const displayName = targetCustomer ? targetCustomer.name : 'this customer';

    if (confirm(`Are you sure you want to delete ${displayName}? This action is irreversible.`)) {
      setIsDeleting(id);
      try {
        await dbCustomers.delete(id);
        showSuccess(`Deleted client "${displayName}" successfully.`);
      } catch (error: any) {
        console.error('Delete customer error:', error);
        showError(error?.message || 'Failed to delete client.');
      } finally {
        setIsDeleting(null);
      }
    }
  };


  return (
    <div className="space-y-6" id="customers-tab">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-sans" id="crm-title">
            CRM Directory
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Manage your client profiles, trigger instant shoots, and view account history.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-150"
          id="btn-add-client"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex rounded-xl border border-gray-100/80 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.015)] items-center transition-all focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500/40">
        <Search className="h-5 w-5 text-slate-400 mr-2.5 ml-1" />
        <input
          type="text"
          placeholder="Search clients by name, mobile, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-gray-950 focus:outline-none placeholder-slate-400 font-medium"
          id="search-clients-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-50 mr-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Customers List Table / Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
          <UserPlus className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-gray-900 font-sans">No Customers Found</h3>
          <p className="mt-1 text-sm text-slate-500 font-medium max-w-sm mx-auto">
            {searchQuery ? 'Adjust your search queries or filters.' : 'Get started by creating your first client profile.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center rounded-xl bg-blue-50 border border-blue-100/50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all active:scale-95"
            >
              Add Client Profile
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/75">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Client Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Billing Address</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Registered</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                    <td className="whitespace-nowrap px-6 py-4.5">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500/10 to-blue-500/5 text-[#2563EB] border border-blue-100 flex items-center justify-center font-extrabold text-sm shadow-inner shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3.5">
                          <p className="font-bold text-sm text-gray-950 font-sans">{customer.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-500 space-y-1">
                      <div className="flex items-center font-semibold text-slate-700">
                        <Phone className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center text-xs text-slate-400 font-medium">
                          <Mail className="mr-2 h-3.5 w-3.5 text-slate-400" />
                          {customer.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-500 max-w-xs truncate font-medium">
                      {customer.address ? (
                        <div className="flex items-start">
                          <MapPin className="mr-2 h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic font-normal">Not set</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-xs text-slate-400 font-semibold">
                      <div className="flex items-center">
                        <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-right text-sm">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Print Customer Details */}
                        <button
                          onClick={() => handlePrintCustomer(customer)}
                          title="Print Customer Profile"
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition active:scale-90"
                        >
                          <Printer className="h-4.5 w-4.5" />
                        </button>
                        {/* Download Customer PDF */}
                        <button
                          onClick={() => handleDownloadCustomerPDF(customer)}
                          title="Download Customer PDF"
                          disabled={isExportingPdf}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-50 active:scale-90"
                        >
                          <Download className="h-4.5 w-4.5" />
                        </button>
                        {/* Book photoshoot / printing press job shortcut */}
                        <button
                          onClick={() => onBookForCustomer(customer)}
                          title="Schedule/Book Job"
                          className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-xl transition active:scale-90"
                        >
                          <Camera className="h-4.5 w-4.5" />
                        </button>
                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          title="Edit Profile"
                          className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition active:scale-90"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(customer.id)}
                          disabled={isDeleting !== null}
                          title="Delete Client"
                          className="p-2 text-[#EF4444] hover:bg-red-50 rounded-xl transition disabled:opacity-40 active:scale-90"
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

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-[24px] border border-gray-100 bg-white p-7 shadow-2xl relative"
              id="customer-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">
                  {editingCustomer ? 'Edit Client Profile' : 'Add New Client Profile'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {errorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-600 animate-shake">
                    {errorMsg}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing Address (Optional)</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Khaga, Fatehpur, Uttar Pradesh"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none resize-none transition-all duration-150"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:shadow-md hover:shadow-blue-500/10 active:scale-95 disabled:opacity-50 transition-all duration-150"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Customer Profile Template */}
      {activePrintCustomer && (
        <div className="hidden print:block fixed left-[-9999px] top-0 print:static print:left-0">
          <div id="printableCustomerDetails" className="bg-white p-8 max-w-[210mm] mx-auto text-slate-800 font-sans space-y-6">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">CLIENT PROFILE & STATEMENT</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">Ref ID: #{activePrintCustomer.id.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xl font-black text-slate-900">{activePrintCustomer.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">PHONE NUMBER</p>
                  <p className="text-slate-900 font-bold mt-0.5">{activePrintCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">EMAIL ADDRESS</p>
                  <p className="text-slate-900 font-bold mt-0.5">{activePrintCustomer.email || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 font-bold uppercase text-[10px]">BILLING ADDRESS</p>
                  <p className="text-slate-900 font-bold mt-0.5">{activePrintCustomer.address || 'No address provided'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">MEMBER SINCE</p>
                  <p className="text-slate-900 font-bold mt-0.5">{new Date(activePrintCustomer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="pt-12 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <div className="border-b border-slate-400 w-40 h-8"></div>
                <p className="font-bold text-slate-600 mt-1 uppercase text-[10px]">CLIENT ACKNOWLEDGEMENT</p>
              </div>
              <div className="text-right">
                <div className="border-b border-slate-400 w-40 h-8 ml-auto"></div>
                <p className="font-bold text-slate-600 mt-1 uppercase text-[10px]">AUTHORIZED SIGNATURE</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
