import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { cleanUndefined } from '../services/dbService';
import { useToast } from './Toast';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Percent, 
  FileText, 
  CreditCard, 
  QrCode as QrIcon, 
  Check, 
  Upload, 
  ShieldCheck, 
  AlertCircle,
  Palette,
  Database,
  Download,
  UploadCloud,
  Printer,
  UserCheck,
  Info
} from 'lucide-react';

interface BusinessSettingsProps {
  studioId: string;
  studioProfile: any;
  studioSettings: any;
}

// Helper to compress and downscale images via Canvas
const compressImage = (file: File, maxDimension: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        const isPng = file.type === 'image/png';
        const format = isPng ? 'image/png' : 'image/jpeg';
        
        try {
          const compressedDataUrl = canvas.toDataURL(format, isPng ? undefined : quality);
          resolve(compressedDataUrl);
        } catch (e) {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function BusinessSettings({ studioId, studioProfile, studioSettings }: BusinessSettingsProps) {
  const { showSuccess, showError } = useToast();
  // Local state for all 20 sections of fields
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [pan, setPan] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [currency, setCurrency] = useState('INR');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [upiId, setUpiId] = useState('');
  const [terms, setTerms] = useState('');
  const [authorizedSignatory, setAuthorizedSignatory] = useState('');
  const [themeColor, setThemeColor] = useState('#3b82f6');
  
  // Images
  const [studioLogo, setStudioLogo] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [signatureImage, setSignatureImage] = useState('');

  // Print Preferences
  const [showLogo, setShowLogo] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');

  // UI States
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileImportRef = useRef<HTMLInputElement>(null);

  // Preset themes
  const colorPresets = [
    { name: 'LensMaster Blue', hex: '#3b82f6' },
    { name: 'Classic Indigo', hex: '#6366f1' },
    { name: 'Emerald Green', hex: '#10b981' },
    { name: 'Warm Amber', hex: '#f59e0b' },
    { name: 'Vibrant Rose', hex: '#f43f5e' },
    { name: 'Sleek Slate', hex: '#64748b' }
  ];

  // Load existing values dynamically
  useEffect(() => {
    const currentName = studioProfile?.businessName || studioProfile?.studioName || '';
    if (studioProfile) {
      setBusinessName(currentName);
      setOwnerName(studioProfile.ownerName || '');
      setMobileNumber(studioProfile.mobileNumber || '');
      setEmail(studioProfile.email || '');
      setAddress(studioProfile.address || '');
      setGstNumber(studioProfile.gstNumber || '');
      setStudioLogo(studioProfile.studioLogo || '');
    }
    if (studioSettings) {
      setPan(studioSettings.pan || '');
      setInvoicePrefix(studioSettings.invoicePrefix || 'INV-');
      setInvoiceFooter(studioSettings.invoiceFooter || (currentName ? `Thank you for choosing ${currentName}!` : 'Thank you for your business!'));
      setBankDetails(studioSettings.bankDetails || '');
      setUpiId(studioSettings.upiId || '');
      setTerms(studioSettings.terms || '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.');
      setAuthorizedSignatory(studioSettings.authorizedSignatory || studioProfile?.ownerName || '');
      setQrCode(studioSettings.qrCode || '');
      setSignatureImage(studioSettings.signatureImage || '');
      setTaxRate(String(studioSettings.taxRate ?? 18));
      setCurrency(studioSettings.currency || 'INR');
      setThemeColor(studioSettings.themeColor || '#3b82f6');
      
      if (studioSettings.printPreferences) {
        setShowLogo(studioSettings.printPreferences.showLogo !== false);
        setShowSignature(studioSettings.printPreferences.showSignature !== false);
        setPaperSize(studioSettings.printPreferences.paperSize || 'A4');
      }

      if (studioSettings.businessName && !businessName) {
        setBusinessName(studioSettings.businessName);
      }
      if (studioSettings.studioLogo && !studioLogo) {
        setStudioLogo(studioSettings.studioLogo);
      }
    }
  }, [studioProfile, studioSettings]);

  // Image Upload handler with compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('Image size must be less than 10MB.');
      setMessage({ type: 'error', text: 'Image size must be less than 10MB.' });
      return;
    }

    try {
      const compressedBase64 = await compressImage(file, 400, 0.75);
      setter(compressedBase64);
      showSuccess('Image loaded and optimized successfully!');
      setMessage({ type: 'success', text: 'Image loaded and optimized successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error compressing image:', err);
      showError('Failed to process image. Try a different file.');
      setMessage({ type: 'error', text: 'Failed to process image. Try a different file.' });
    }
  };

  // Full-featured data export (Section 17)
  const handleExportData = async () => {
    if (!studioId) return;
    try {
      const exportData: any = {
        exportVersion: "1.0",
        exportedAt: new Date().toISOString(),
        studioId: studioId,
        profile: studioProfile || {},
        settings: studioSettings || {},
        customers: [],
        bookings: [],
        invoices: [],
        expenses: [],
        inventory: []
      };

      // Fetch customers
      const custSnap = await getDocs(collection(db, 'studios', studioId, 'customers'));
      custSnap.forEach(d => exportData.customers.push(d.data()));

      // Fetch bookings
      const bookSnap = await getDocs(collection(db, 'studios', studioId, 'bookings'));
      bookSnap.forEach(d => exportData.bookings.push(d.data()));

      // Fetch invoices
      const invSnap = await getDocs(collection(db, 'studios', studioId, 'invoices'));
      invSnap.forEach(d => exportData.invoices.push(d.data()));

      // Fetch expenses
      const expSnap = await getDocs(collection(db, 'studios', studioId, 'expenses'));
      expSnap.forEach(d => exportData.expenses.push(d.data()));

      // Fetch inventory
      const stockSnap = await getDocs(collection(db, 'studios', studioId, 'inventory'));
      stockSnap.forEach(d => exportData.inventory.push(d.data()));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${businessName.replace(/\s+/g, '_').toLowerCase()}_lensmaster_backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: 'All business data exported and downloaded successfully!' });
      showSuccess('All business data exported and downloaded successfully!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Export failed:', err);
      showError('Data export failed: ' + err.message);
      setMessage({ type: 'error', text: 'Data export failed: ' + err.message });
    }
  };

  // Full-featured data import restore (Section 18)
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studioId) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (!data.exportVersion) {
            setMessage({ type: 'error', text: 'Invalid file format. Please upload a genuine LensMaster backup JSON.' });
            return;
          }

          setSaving(true);
          setMessage({ type: 'success', text: 'Importing and restoring your backup logs. Please wait...' });

          // Restore Profile & Settings subdocument
          const settingsDocRef = doc(db, 'studios', studioId, 'settings', 'settings');
          await setDoc(settingsDocRef, cleanUndefined({
            profile: data.profile || {},
            settings: data.settings || {},
            createdAt: data.createdAt || new Date().toISOString()
          }));

          // Restore Customers
          if (Array.isArray(data.customers)) {
            for (const item of data.customers) {
              if (item.id) await setDoc(doc(db, 'studios', studioId, 'customers', item.id), cleanUndefined(item));
            }
          }

          // Restore Bookings
          if (Array.isArray(data.bookings)) {
            for (const item of data.bookings) {
              if (item.id) await setDoc(doc(db, 'studios', studioId, 'bookings', item.id), cleanUndefined(item));
            }
          }

          // Restore Invoices
          if (Array.isArray(data.invoices)) {
            for (const item of data.invoices) {
              if (item.id) await setDoc(doc(db, 'studios', studioId, 'invoices', item.id), cleanUndefined(item));
            }
          }

          // Restore Expenses
          if (Array.isArray(data.expenses)) {
            for (const item of data.expenses) {
              if (item.id) await setDoc(doc(db, 'studios', studioId, 'expenses', item.id), cleanUndefined(item));
            }
          }

          // Restore Inventory
          if (Array.isArray(data.inventory)) {
            for (const item of data.inventory) {
              if (item.id) await setDoc(doc(db, 'studios', studioId, 'inventory', item.id), cleanUndefined(item));
            }
          }

          setMessage({ type: 'success', text: 'Backup database logs restored successfully!' });
          showSuccess('Backup database logs restored successfully!');
          setSaving(false);
          setTimeout(() => {
            setMessage(null);
          }, 2000);
        } catch (parseErr: any) {
          console.error('Parse backup file error:', parseErr);
          showError('JSON Parsing/Import failed: ' + parseErr.message);
          setMessage({ type: 'error', text: 'JSON Parsing/Import failed: ' + parseErr.message });
          setSaving(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error('Import process failed:', err);
      showError('Import failed: ' + err.message);
      setMessage({ type: 'error', text: 'Import failed: ' + err.message });
    }
  };

  // Reset to default settings (Section 16)
  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to reset all business settings to standard defaults? Images, QR codes, and custom terms will be cleared.")) return;
    setSaving(true);
    try {
      const settingsDocRef = doc(db, 'studios', studioId, 'settings', 'settings');
      const currentName = studioProfile?.businessName || studioProfile?.studioName || 'Studio';
      const defaultProfile = {
        studioName: currentName,
        businessName: currentName,
        ownerName: auth.currentUser?.displayName || 'Owner',
        mobileNumber: '',
        email: auth.currentUser?.email || '',
        address: '',
        gstNumber: '',
        studioLogo: auth.currentUser?.photoURL || ''
      };
      const defaultSettings = {
        taxRate: 18,
        currency: 'INR',
        pan: '',
        invoicePrefix: 'INV-',
        invoiceFooter: `Thank you for choosing ${currentName}!`,
        bankDetails: '',
        upiId: '',
        terms: '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.',
        authorizedSignatory: auth.currentUser?.displayName || 'Owner',
        qrCode: '',
        signatureImage: '',
        themeColor: '#3b82f6',
        printPreferences: {
          showLogo: true,
          showSignature: true,
          paperSize: 'A4'
        }
      };
      await setDoc(settingsDocRef, cleanUndefined({
        profile: defaultProfile,
        settings: defaultSettings,
        createdAt: new Date().toISOString()
      }));
      showSuccess('Settings reset to LensMaster defaults successfully!');
      setMessage({ type: 'success', text: 'Settings reset to LensMaster defaults successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      showError('Failed to reset settings: ' + err.message);
      setMessage({ type: 'error', text: 'Failed to reset settings: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save Settings to studios/{studioId}/settings/settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioId) return;

    setSaving(true);
    setMessage(null);

    try {
      // Save directly to the subdocument config
      const settingsDocRef = doc(db, 'studios', studioId, 'settings', 'settings');
      
      const updatedProfile = {
        studioName: businessName.trim(),
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        gstNumber: gstNumber.trim(),
        studioLogo: studioLogo,
      };

      const updatedSettings = {
        ...(studioSettings || {}),
        businessName: businessName.trim(),
        studioLogo: studioLogo,
        ownerName: ownerName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        gstNumber: gstNumber.trim(),
        pan: pan.trim(),
        taxRate: parseFloat(taxRate) || 18,
        currency: currency.trim() || 'INR',
        invoicePrefix: invoicePrefix.trim(),
        invoiceFooter: invoiceFooter.trim(),
        bankDetails: bankDetails.trim(),
        upiId: upiId.trim(),
        terms: terms.trim(),
        authorizedSignatory: authorizedSignatory.trim(),
        qrCode: qrCode,
        signatureImage: signatureImage,
        themeColor: themeColor,
        printPreferences: {
          showLogo: showLogo,
          showSignature: showSignature,
          paperSize: paperSize
        }
      };

      await setDoc(settingsDocRef, cleanUndefined({
        profile: updatedProfile,
        settings: updatedSettings,
        createdAt: new Date().toISOString()
      }));

      showSuccess('Settings saved successfully!');
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      showError(err.message || 'Failed to save settings.');
      setMessage({ type: 'error', text: err.message || 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12" id="business-settings-tab">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans" id="settings-title">
          {businessName || studioProfile?.businessName || 'Studio'} Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Configure multi-tenant billing logs, branding images, invoicing rules, data safety logs, and local diagnostics.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* GROUP 1: Brand & Profile (Sections 1, 2, 3, 12) */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Building2 className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-slate-900 font-sans">1. Studio Profile & Contacts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Studio / Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. Vikas Studio"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Proprietor / Owner Name *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">2. Mobile Number *</label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Business Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. hello@lensmaster.com"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">3. Business Address *</label>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150 resize-none"
                placeholder="e.g. Main Street, Suite 4B, City, State - Zip"
              />
            </div>

            {/* 12. Logo Upload */}
            <div className="md:col-span-2 border-t border-slate-100 pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6 p-5 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="h-20 w-20 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {studioLogo ? (
                    <img src={studioLogo} alt="Logo Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1 text-center md:text-left flex-1">
                  <h4 className="text-sm font-extrabold text-slate-800 font-sans">12. Brand Logo Upload</h4>
                  <p className="text-xs text-slate-450 font-medium">Upload your studio logo. Optimized and scaled automatically for A4 invoices.</p>
                </div>
                <label className="cursor-pointer bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl shadow-xs transition inline-flex items-center gap-2 shrink-0 active:scale-95">
                  <Upload className="h-4 w-4 text-slate-500" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setStudioLogo)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 2: Tax & Legal (Sections 4, 13, 14) */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <UserCheck className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-slate-900 font-sans">2. Tax Verification & Legal Signatory</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">4. GSTIN / GST Number (Optional)</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. 09AAAAA1111A1Z1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">PAN Card Number (Optional)</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. ABCDE1234F"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">14. Authorized Signatory Name</label>
              <input
                type="text"
                value={authorizedSignatory}
                onChange={(e) => setAuthorizedSignatory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. Authorized Director / Manager Name"
              />
            </div>

            {/* 13. Signature Upload */}
            <div className="md:col-span-2 border-t border-slate-100 pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6 p-5 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="h-16 w-32 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {signatureImage ? (
                    <img src={signatureImage} alt="Signature Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic font-bold">No Signature</span>
                  )}
                </div>
                <div className="space-y-1 text-center md:text-left flex-1">
                  <h4 className="text-sm font-extrabold text-slate-800 font-sans">13. Digital Signature Image Upload</h4>
                  <p className="text-xs text-slate-450 font-medium">Upload a transparent or clean white signature image to print on A4 invoices.</p>
                </div>
                <label className="cursor-pointer bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl shadow-xs transition inline-flex items-center gap-2 shrink-0 active:scale-95">
                  <Upload className="h-4 w-4 text-slate-500" />
                  Upload Signature
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setSignatureImage)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 3: Invoicing & Printing (Sections 5, 6, 7, 8, 19) */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <FileText className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-slate-900 font-sans">3. Invoicing Rules & Preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">5. Default Tax rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. 18"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Currency Symbol/Code</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none bg-white transition-all duration-150"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">6. Invoice Number Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. INV-"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">7. Invoice Footer Greeting</label>
              <input
                type="text"
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. Thank you for your business!"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">8. Terms & Conditions (One rule per line)</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150 resize-none"
                placeholder="Enter Terms and Conditions guidelines..."
              />
            </div>

            {/* 19. Print Preferences */}
            <div className="md:col-span-2 border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 font-sans">
                <Printer className="h-4.5 w-4.5 text-slate-500" />
                19. PDF Print & Output Preferences
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-4 border border-slate-150 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-slate-50/80 transition-colors duration-150">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.checked || e.target.checked)}
                    className="h-4.5 w-4.5 rounded text-[#2563EB] focus:ring-[#2563EB] border-slate-300 transition"
                  />
                  <span className="text-xs font-bold text-slate-600">Show Logo on Invoice</span>
                </label>

                <label className="flex items-center gap-3 p-4 border border-slate-150 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-slate-50/80 transition-colors duration-150">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.checked || e.target.checked)}
                    className="h-4.5 w-4.5 rounded text-[#2563EB] focus:ring-[#2563EB] border-slate-300 transition"
                  />
                  <span className="text-xs font-bold text-slate-600">Show Digital Signature</span>
                </label>

                <div className="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-500 pl-1">Paper Size:</span>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as 'A4' | 'Letter')}
                    className="flex-1 bg-white border border-slate-250 rounded-lg text-xs py-2 px-2.5 outline-none font-bold text-slate-800 focus:border-[#2563EB]"
                  >
                    <option value="A4">A4 standard</option>
                    <option value="Letter">Letter size</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 4: Payments & UPI (Sections 9, 10, 11) */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <CreditCard className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-slate-900 font-sans">4. Banking, UPI & Payment QR</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">10. UPI ID for QR Scan & Pay</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150"
                placeholder="e.g. lensmaster@upi"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">9. Bank Account Details (Displayed on Invoices)</label>
              <textarea
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-150 resize-none"
                placeholder="e.g. Account Name: Vikas Studio&#10;Account No: 1234567890&#10;Bank: State Bank of India&#10;IFSC: SBIN0001234"
              />
            </div>

            {/* 11. QR Upload */}
            <div className="md:col-span-2 border-t border-slate-100 pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6 p-5 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="h-20 w-20 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code Preview" className="h-full w-full object-contain p-1" />
                  ) : (
                    <QrIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1 text-center md:text-left flex-1">
                  <h4 className="text-sm font-extrabold text-slate-800 font-sans">11. Custom Payment QR Code Upload</h4>
                  <p className="text-xs text-slate-450 font-medium">Upload a static GPay/UPI QR code to replace the auto-generated dynamic payment code.</p>
                </div>
                <label className="cursor-pointer bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl shadow-xs transition inline-flex items-center gap-2 shrink-0 active:scale-95">
                  <Upload className="h-4 w-4 text-slate-500" />
                  Upload QR Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setQrCode)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 5: Backups & Security (Sections 15, 16, 17, 18, 20) */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Database className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-slate-900 font-sans">5. Administration, Safety Backups & Diagnostics</h2>
          </div>

          <div className="space-y-6">
            {/* 15. Theme Color Selection */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Palette className="h-4.5 w-4.5 text-[#2563EB]" />
                15. Studio Theme Accent Color (Future Use)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setThemeColor(preset.hex)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-100 shadow-3xs hover:scale-105 active:scale-95 transition-all duration-150"
                    style={{ backgroundColor: preset.hex + '0c', color: preset.hex }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.hex }} />
                    {preset.name}
                    {themeColor === preset.hex && <Check className="h-3.5 w-3.5 shrink-0 ml-1.5" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1.5 max-w-xs">
                <span className="text-xs text-slate-400 shrink-0 font-bold uppercase tracking-wide">Custom Hex:</span>
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* 16, 17, 18. Backups, Import & Export Panel */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-sm font-extrabold text-slate-800 font-sans">16. Safety Cloud Backups & Offline Imports</h4>
              <p className="text-xs text-slate-450 font-medium">Download backups of your entire studio CRM, bookings list, invoice registry, expense logs, and settings parameters, or restore from a previously exported backup.</p>
              
              <div className="flex flex-wrap gap-3">
                {/* 17. Export Button */}
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-4.5 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs shadow-3xs transition inline-flex items-center gap-2 active:scale-95 duration-150"
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  17. Export Studio (JSON)
                </button>

                {/* 18. Import Button */}
                <label className="px-4.5 py-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs shadow-3xs cursor-pointer transition inline-flex items-center gap-2 active:scale-95 duration-150">
                  <UploadCloud className="h-4 w-4 text-indigo-600" />
                  18. Import Backup (JSON)
                  <input
                    type="file"
                    accept=".json"
                    ref={fileImportRef}
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>

                {/* 16. Reset Defaults */}
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-4.5 py-3 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50 font-bold text-xs transition inline-flex items-center gap-2 active:scale-95 duration-150"
                >
                  <Database className="h-4 w-4 text-rose-500" />
                  Reset to Studio Defaults
                </button>
              </div>
            </div>

            {/* 20. Account Information Diagnostics */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 font-sans">
                <Info className="h-4.5 w-4.5 text-[#2563EB]" />
                20. Account Information & Node Diagnostics
              </h4>
              <div className="bg-slate-50/70 rounded-2xl p-4.5 border border-slate-100 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-mono text-slate-500">
                  <div>
                    <span className="font-bold text-slate-700">Account Owner Email:</span>{' '}
                    <span className="font-semibold text-slate-900">{auth.currentUser?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">User UID:</span>{' '}
                    <span className="text-slate-800 break-all">{auth.currentUser?.uid || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Studio Tenant ID:</span>{' '}
                    <span className="text-slate-800 break-all">{studioId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">System Role:</span>{' '}
                    <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold font-sans text-[10px]">
                      STUDIO OWNER (ADMIN)
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Active Node Host:</span>{' '}
                    <span className="text-slate-600 font-bold">Google Cloud Run (0.0.0.0:3000)</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Active Tenant Context:</span>{' '}
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-[#2563EB] font-bold text-[10px] font-sans">
                      MULTI-STUDIO SEGREGATED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic feedback alerting */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border border-rose-100'
            }`}
          >
            {message.type === 'success' ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span>{message.text}</span>
          </motion.div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-8 py-4 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all duration-150"
          >
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
