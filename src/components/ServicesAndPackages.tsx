import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Layers,
  Package,
  Search,
  Check,
  X,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { StudioService, ServiceCategory, StudioPackage, StudioPackageItem } from '../types';
import { dbStudioServices, dbServiceCategories, dbStudioPackages } from '../services/dbService';

interface ServicesAndPackagesProps {
  services: StudioService[];
  categories: ServiceCategory[];
  packages: StudioPackage[];
  studioProfile?: any;
  initialSubTab?: 'services' | 'packages' | 'categories';
  activeSubSection?: string;
}

export default function ServicesAndPackages({
  services,
  categories,
  packages,
  studioProfile,
  initialSubTab = 'services',
  activeSubSection,
}: ServicesAndPackagesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'packages' | 'categories'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  React.useEffect(() => {
    if (!activeSubSection) return;
    if (activeSubSection === 'add_group' || activeSubSection === 'all_groups' || activeSubSection === 'examples_group') {
      setActiveSubTab('categories');
    } else if (activeSubSection === 'add_service') {
      setActiveSubTab('services');
      openNewServiceForm();
    } else if (activeSubSection === 'package_pricing') {
      setActiveSubTab('packages');
    }
  }, [activeSubSection]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // Service Form State
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<StudioService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    serialNo: '',
    name: '',
    categoryId: '',
    categoryName: '',
    investCost: '',
    sellingCost: '',
    taxRate: '18',
    shortDescription: '',
    displayOrder: 1,
    status: 'active' as 'active' | 'archived',
  });

  // Category Form / Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    status: 'Active' as 'Active' | 'Inactive',
    description: '',
    displayOrder: 1,
  });

  // Package Form / Modal State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<StudioPackage | null>(null);
  const [packageForm, setPackageForm] = useState({
    packageName: '',
    packagePrice: 50000,
    discount: 5000,
    coverPhoto: '',
    description: '',
    includedServices: [] as StudioPackageItem[],
  });

  // -------------------------------------------------------------
  // SERVICE HANDLERS
  // -------------------------------------------------------------
  const generateNextSerial = () => {
    const nextNum = services.length + 1;
    return String(nextNum).padStart(6, '0');
  };

  const openNewServiceForm = () => {
    setEditingService(null);
    const defaultCat = categories[0]?.name || '';
    const defaultCatId = categories[0]?.id || '';
    setServiceForm({
      serialNo: generateNextSerial(),
      name: '',
      categoryId: defaultCatId,
      categoryName: defaultCat,
      investCost: '',
      sellingCost: '',
      taxRate: '18',
      shortDescription: '',
      displayOrder: services.length + 1,
      status: 'active',
    });
    setIsServiceFormOpen(true);
  };

  const openEditServiceForm = (s: StudioService, index: number) => {
    setEditingService(s);
    setServiceForm({
      serialNo: s.serialNo || String(index + 1).padStart(6, '0'),
      name: s.name || '',
      categoryId: s.categoryId || '',
      categoryName: s.categoryName || '',
      investCost: s.investCost !== undefined ? String(s.investCost) : '',
      sellingCost: s.sellingCost !== undefined ? String(s.sellingCost) : String(s.basePrice || ''),
      taxRate: s.taxRate !== undefined ? String(s.taxRate) : String(s.gst || 18),
      shortDescription: s.shortDescription || '',
      displayOrder: s.displayOrder || index + 1,
      status: s.status || 'active',
    });
    setIsServiceFormOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      alert('Please enter a service name.');
      return;
    }

    const matchedCategory = categories.find((c) => c.id === serviceForm.categoryId);
    const categoryName = matchedCategory ? matchedCategory.name : serviceForm.categoryName || 'General';

    const invest = parseFloat(serviceForm.investCost) || 0;
    const selling = parseFloat(serviceForm.sellingCost) || 0;
    const tax = parseFloat(serviceForm.taxRate) || 0;

    const payload = {
      serialNo: serviceForm.serialNo || generateNextSerial(),
      name: serviceForm.name.trim(),
      categoryId: serviceForm.categoryId,
      categoryName: categoryName,
      serviceGroupId: serviceForm.categoryId,
      serviceGroupName: categoryName,
      investCost: invest,
      sellingCost: selling,
      basePrice: selling,
      taxRate: tax,
      gst: tax,
      discount: 0,
      unit: 'Per Day',
      minQuantity: 1,
      isAvailable: true,
      isFeatured: false,
      popularBadge: false,
      shortDescription: serviceForm.shortDescription || `${serviceForm.name} by LensMaster Studio`,
      displayOrder: Number(serviceForm.displayOrder) || services.length + 1,
      status: serviceForm.status,
    };

    try {
      if (editingService) {
        await dbStudioServices.update(editingService.id, payload);
      } else {
        await dbStudioServices.add(payload);
      }
      setIsServiceFormOpen(false);
      setEditingService(null);
    } catch (err: any) {
      alert('Error saving service: ' + err.message);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await dbStudioServices.delete(id);
      } catch (err: any) {
        alert('Error deleting service: ' + err.message);
      }
    }
  };

  // -------------------------------------------------------------
  // CATEGORY / SERVICE GROUP HANDLERS
  // -------------------------------------------------------------
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      status: 'Active',
      description: '',
      displayOrder: categories.length + 1,
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ServiceCategory, index: number) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name || '',
      status: cat.status || 'Active',
      description: cat.description || '',
      displayOrder: cat.displayOrder || index + 1,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Please enter a service group name.');
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      status: categoryForm.status,
      description: categoryForm.description.trim(),
      displayOrder: Number(categoryForm.displayOrder) || categories.length + 1,
    };

    try {
      if (editingCategory) {
        await dbServiceCategories.update(editingCategory.id, payload);
      } else {
        await dbServiceCategories.add(payload);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      alert('Error saving service group: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete service group "${name}"?`)) {
      try {
        await dbServiceCategories.delete(id);
      } catch (err: any) {
        alert('Error deleting category: ' + err.message);
      }
    }
  };

  // -------------------------------------------------------------
  // PACKAGE HANDLERS
  // -------------------------------------------------------------
  const openNewPackageModal = () => {
    setEditingPackage(null);
    setPackageForm({
      packageName: '',
      packagePrice: 50000,
      discount: 5000,
      coverPhoto: '',
      description: '',
      includedServices: services.slice(0, 2).map((s) => ({
        serviceId: s.id,
        serviceName: s.name,
        quantity: 1,
        unitPrice: s.sellingCost || s.basePrice || 0,
      })),
    });
    setIsPackageModalOpen(true);
  };

  const openEditPackageModal = (p: StudioPackage) => {
    setEditingPackage(p);
    setPackageForm({
      packageName: p.packageName,
      packagePrice: p.packagePrice,
      discount: p.discount || 0,
      coverPhoto: p.coverPhoto || '',
      description: p.description || '',
      includedServices: p.includedServices || [],
    });
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.packageName.trim()) {
      alert('Please enter a package name.');
      return;
    }

    const payload = {
      packageName: packageForm.packageName,
      packagePrice: Number(packageForm.packagePrice),
      discount: Number(packageForm.discount),
      coverPhoto: packageForm.coverPhoto,
      description: packageForm.description,
      includedServices: packageForm.includedServices,
    };

    try {
      if (editingPackage) {
        await dbStudioPackages.update(editingPackage.id, payload);
      } else {
        await dbStudioPackages.add(payload);
      }
      setIsPackageModalOpen(false);
      setEditingPackage(null);
    } catch (err: any) {
      alert('Error saving package: ' + err.message);
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete package "${name}"?`)) {
      try {
        await dbStudioPackages.delete(id);
      } catch (err: any) {
        alert('Error deleting package: ' + err.message);
      }
    }
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.categoryName && s.categoryName.toLowerCase().includes(q)) ||
      (s.serialNo && s.serialNo.toLowerCase().includes(q))
    );
  });

  // Filtered Categories
  const filteredCategories = categories.filter((c) => {
    const q = categorySearchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveSubTab('services');
            setIsServiceFormOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
            activeSubTab === 'services'
              ? 'bg-[#3f51b5] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Services</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeSubTab === 'services' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {services.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('categories');
            setIsServiceFormOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
            activeSubTab === 'categories'
              ? 'bg-[#3f51b5] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Service Group</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeSubTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('packages');
            setIsServiceFormOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
            activeSubTab === 'packages'
              ? 'bg-[#3f51b5] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Packages & Bundles</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeSubTab === 'packages' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {packages.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. SERVICE GROUP TAB (IMAGE 1)                            */}
      {/* ========================================================= */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          {/* Top Bar with Add Service Group button & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={openNewCategoryModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#3f51b5] hover:bg-[#324097] text-white font-medium text-sm rounded shadow-sm transition active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Service Group</span>
            </button>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Service Group..."
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
              />
            </div>
          </div>

          {/* Service Group Table (Image 1 Layout) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-slate-800 text-sm font-semibold border-b border-slate-200">
                    <th className="py-3 px-4 w-24 border-r border-slate-200">SR No</th>
                    <th className="py-3 px-4 border-r border-slate-200">Name</th>
                    <th className="py-3 px-4 w-40 border-r border-slate-200">Status</th>
                    <th className="py-3 px-4 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No service groups found. Click &quot;Add Service Group&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <tr
                        key={cat.id}
                        className={`transition hover:bg-blue-50/40 ${
                          idx % 2 === 1 ? 'bg-[#f8f9fa]' : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-4 font-normal text-slate-600 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-normal text-slate-800 border-r border-slate-200">
                          {cat.name}
                        </td>
                        <td className="py-3 px-4 font-normal text-slate-700 border-r border-slate-200">
                          {cat.status || 'Active'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            {/* Red Trash Button */}
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              title="Delete Group"
                              className="p-1.5 bg-[#f44336] hover:bg-[#d32f2f] text-white rounded transition shadow-xs active:scale-95"
                            >
                              <Trash2 className="h-4 w-4 stroke-[2]" />
                            </button>
                            {/* Cyan Edit Button */}
                            <button
                              onClick={() => openEditCategoryModal(cat, idx)}
                              title="Edit Group"
                              className="p-1.5 bg-[#00bcd4] hover:bg-[#0097a7] text-white rounded transition shadow-xs active:scale-95"
                            >
                              <Edit2 className="h-4 w-4 stroke-[2]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-white text-slate-800 text-sm font-semibold border-t border-slate-200">
                    <th className="py-3 px-4 border-r border-slate-200">SR No</th>
                    <th className="py-3 px-4 border-r border-slate-200">Name</th>
                    <th className="py-3 px-4 border-r border-slate-200">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SERVICES TAB (IMAGE 2 & IMAGE 3)                       */}
      {/* ========================================================= */}
      {activeSubTab === 'services' && (
        <div className="space-y-4">
          {/* If Form is open -> Render IMAGE 3 (Add Service / Edit Service) */}
          {isServiceFormOpen ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Form Title */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingService ? 'Edit Service' : 'Service'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsServiceFormOpen(false)}
                  className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Services</span>
                </button>
              </div>

              {/* Form Body - 2 Columns Layout Matching Image 3 */}
              <form onSubmit={handleSaveService} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Service Serial No
                      </label>
                      <input
                        type="text"
                        value={serviceForm.serialNo}
                        onChange={(e) => setServiceForm({ ...serviceForm, serialNo: e.target.value })}
                        placeholder="000009"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Service Group
                      </label>
                      <select
                        value={serviceForm.categoryId}
                        onChange={(e) => {
                          const selected = categories.find((c) => c.id === e.target.value);
                          setServiceForm({
                            ...serviceForm,
                            categoryId: e.target.value,
                            categoryName: selected ? selected.name : '',
                          });
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                      >
                        <option value="">--Select Service Group--</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Service Selling Cost
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={serviceForm.sellingCost}
                        onChange={(e) => setServiceForm({ ...serviceForm, sellingCost: e.target.value })}
                        placeholder="Service Selling Cost"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Service Name
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        placeholder="Service Name"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Service Invest Cost
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={serviceForm.investCost}
                        onChange={(e) => setServiceForm({ ...serviceForm, investCost: e.target.value })}
                        placeholder="Service Invest Cost"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tax
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={serviceForm.taxRate}
                        onChange={(e) => setServiceForm({ ...serviceForm, taxRate: e.target.value })}
                        placeholder="Tax Rate"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#3f51b5] hover:bg-[#324097] text-white font-medium text-sm rounded shadow-sm transition active:scale-[0.99]"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsServiceFormOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Otherwise -> Render IMAGE 2 (Services Table List) */
            <>
              {/* Top Bar with Add Service button & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={openNewServiceForm}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#3f51b5] hover:bg-[#324097] text-white font-medium text-sm rounded shadow-sm transition active:scale-[0.99]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Service</span>
                </button>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                  />
                </div>
              </div>

              {/* Services Table (Image 2 Layout) */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-slate-800 text-sm font-semibold border-b border-slate-200">
                        <th className="py-3 px-4 w-24 border-r border-slate-200">SR No</th>
                        <th className="py-3 px-4 border-r border-slate-200">Service Name</th>
                        <th className="py-3 px-4 w-36 border-r border-slate-200">Invest Cost</th>
                        <th className="py-3 px-4 w-36 border-r border-slate-200">Selling Cost</th>
                        <th className="py-3 px-4 w-28 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                      {filteredServices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No services found. Click &quot;Add Service&quot; to create one.
                          </td>
                        </tr>
                      ) : (
                        filteredServices.map((srv, idx) => {
                          const invest = srv.investCost !== undefined ? srv.investCost : Math.round((srv.basePrice || 0) * 0.8);
                          const selling = srv.sellingCost !== undefined ? srv.sellingCost : (srv.basePrice || 0);

                          return (
                            <tr
                              key={srv.id}
                              className={`transition hover:bg-blue-50/40 ${
                                idx % 2 === 1 ? 'bg-[#f8f9fa]' : 'bg-white'
                              }`}
                            >
                              <td className="py-3 px-4 font-normal text-slate-600 border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-normal text-slate-800 border-r border-slate-200">
                                {srv.name}
                              </td>
                              <td className="py-3 px-4 font-normal text-slate-700 border-r border-slate-200">
                                {invest}
                              </td>
                              <td className="py-3 px-4 font-normal text-slate-700 border-r border-slate-200">
                                {selling}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex items-center justify-center gap-2">
                                  {/* Red Trash Button */}
                                  <button
                                    onClick={() => handleDeleteService(srv.id, srv.name)}
                                    title="Delete Service"
                                    className="p-1.5 bg-[#f44336] hover:bg-[#d32f2f] text-white rounded transition shadow-xs active:scale-95"
                                  >
                                    <Trash2 className="h-4 w-4 stroke-[2]" />
                                  </button>
                                  {/* Cyan Edit Button */}
                                  <button
                                    onClick={() => openEditServiceForm(srv, idx)}
                                    title="Edit Service"
                                    className="p-1.5 bg-[#00bcd4] hover:bg-[#0097a7] text-white rounded transition shadow-xs active:scale-95"
                                  >
                                    <Edit2 className="h-4 w-4 stroke-[2]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white text-slate-800 text-sm font-semibold border-t border-slate-200">
                        <th className="py-3 px-4 border-r border-slate-200">SR No</th>
                        <th className="py-3 px-4 border-r border-slate-200">Service Name</th>
                        <th className="py-3 px-4 border-r border-slate-200">Invest Cost</th>
                        <th className="py-3 px-4 border-r border-slate-200">Selling Cost</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PACKAGES & BUNDLES TAB                                 */}
      {/* ========================================================= */}
      {activeSubTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={openNewPackageModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#3f51b5] hover:bg-[#324097] text-white font-medium text-sm rounded shadow-sm transition active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Studio Package</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
                No packages created yet. Click &quot;Create Studio Package&quot; to build bundled photography & videography packages.
              </div>
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{pkg.packageName}</h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditPackageModal(pkg)}
                          className="p-1.5 bg-[#00bcd4] text-white rounded hover:bg-[#0097a7] transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id, pkg.packageName)}
                          className="p-1.5 bg-[#f44336] text-white rounded hover:bg-[#d32f2f] transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{pkg.description}</p>
                    )}

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                      <span className="font-semibold text-slate-700">Included Services:</span>
                      {pkg.includedServices && pkg.includedServices.length > 0 ? (
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                          {pkg.includedServices.map((inc, i) => (
                            <li key={i}>{inc.serviceName}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">Custom bundled items</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">Package Price</p>
                      <p className="text-lg font-black text-slate-900">
                        ₹{pkg.packagePrice.toLocaleString('en-IN')}
                      </p>
                    </div>
                    {pkg.discount ? (
                      <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                        Save ₹{pkg.discount.toLocaleString('en-IN')}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SERVICE GROUP                           */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingCategory ? 'Edit Service Group' : 'Add Service Group'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Service Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Video, Photograph, Printing Press"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={categoryForm.status}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      status: e.target.value as 'Active' | 'Inactive',
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief note about this group..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3f51b5] hover:bg-[#324097] text-white font-medium text-sm rounded shadow-sm transition active:scale-[0.99]"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PACKAGE                                 */}
      {/* ========================================================= */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingPackage ? 'Edit Studio Package' : 'New Studio Package'}
              </h3>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={packageForm.packageName}
                  onChange={(e) => setPackageForm({ ...packageForm, packageName: e.target.value })}
                  placeholder="e.g. Grand Royal Wedding Combo"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Package Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={packageForm.packagePrice}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, packagePrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Discount / Savings (₹)
                  </label>
                  <input
                    type="number"
                    value={packageForm.discount}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, discount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  placeholder="What is included in this package..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3f51b5] focus:border-[#3f51b5]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3f51b5] hover:bg-[#324097] text-white font-medium text-sm rounded shadow-sm transition active:scale-[0.99]"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
