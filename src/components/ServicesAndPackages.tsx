import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Edit2,
  Trash2,
  Copy,
  Archive,
  Check,
  X,
  Sparkles,
  Package,
  Tag,
  DollarSign,
  TrendingUp,
  Star,
  CheckCircle2,
  Eye,
  Camera,
  Image as ImageIcon,
  ArrowUpDown,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { StudioService, ServiceCategory, StudioPackage, ServiceVariant, StudioPackageItem } from '../types';
import { dbStudioServices, dbServiceCategories, dbStudioPackages } from '../services/dbService';

interface ServicesAndPackagesProps {
  services: StudioService[];
  categories: ServiceCategory[];
  packages: StudioPackage[];
  studioProfile?: any;
}

export default function ServicesAndPackages({
  services,
  categories,
  packages,
  studioProfile,
}: ServicesAndPackagesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'packages' | 'categories'>('services');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name' | 'order'>('order');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<StudioService | null>(null);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<StudioPackage | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // --- SERVICE FORM STATE ---
  const [serviceForm, setServiceForm] = useState({
    name: '',
    categoryId: '',
    categoryName: '',
    shortDescription: '',
    fullDescription: '',
    thumbnailImage: '',
    photosInput: '',
    basePrice: 0,
    discount: 0,
    gst: 18,
    unit: 'Per Day',
    minQuantity: 1,
    maxQuantity: 10,
    isAvailable: true,
    isFeatured: false,
    popularBadge: false,
    serviceColor: '#2563eb',
    icon: 'Camera',
    displayOrder: 1,
    status: 'active' as 'active' | 'archived',
    variants: [] as ServiceVariant[],
  });

  // Variant input sub-state
  const [variantForm, setVariantForm] = useState<ServiceVariant>({
    id: '',
    variantName: '',
    price: 0,
    features: [],
    duration: 'Full Day',
    numberOfPhotographers: 1,
    numberOfCameras: 1,
  });
  const [newFeatureInput, setNewFeatureInput] = useState('');

  // --- PACKAGE FORM STATE ---
  const [packageForm, setPackageForm] = useState({
    packageName: '',
    packagePrice: 0,
    discount: 0,
    coverPhoto: '',
    description: '',
    includedServices: [] as StudioPackageItem[],
  });

  // --- CATEGORY FORM STATE ---
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    displayOrder: 1,
  });

  // Derived Metrics
  const activeServices = services.filter((s) => s.status === 'active');
  const totalPackagesCount = packages.length;
  
  // Find most expensive / profitable service as highlight
  const mostProfitable = [...services].sort((a, b) => b.basePrice - a.basePrice)[0];
  const featuredServicesCount = services.filter((s) => s.isFeatured).length;

  // Filtered Services List
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || s.categoryId === selectedCategory || s.categoryName === selectedCategory;
    const matchesArchived = showArchived ? s.status === 'archived' : s.status === 'active';

    return matchesSearch && matchesCategory && matchesArchived;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.basePrice - b.basePrice;
    if (sortBy === 'price_desc') return b.basePrice - a.basePrice;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  // HANDLERS FOR SERVICE MODAL
  const openNewServiceModal = () => {
    const defaultCat = categories[0]?.name || 'Wedding Photography';
    const defaultCatId = categories[0]?.id || 'cat_wedding_photo';
    setEditingService(null);
    setServiceForm({
      name: '',
      categoryId: defaultCatId,
      categoryName: defaultCat,
      shortDescription: '',
      fullDescription: '',
      thumbnailImage: '',
      photosInput: '',
      basePrice: 10000,
      discount: 0,
      gst: 18,
      unit: 'Per Day',
      minQuantity: 1,
      maxQuantity: 10,
      isAvailable: true,
      isFeatured: false,
      popularBadge: false,
      serviceColor: '#2563eb',
      icon: 'Camera',
      displayOrder: services.length + 1,
      status: 'active',
      variants: [],
    });
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (s: StudioService) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      shortDescription: s.shortDescription,
      fullDescription: s.fullDescription || '',
      thumbnailImage: s.thumbnailImage || '',
      photosInput: (s.photos || []).join('\n'),
      basePrice: s.basePrice,
      discount: s.discount || 0,
      gst: s.gst || 18,
      unit: s.unit || 'Per Day',
      minQuantity: s.minQuantity || 1,
      maxQuantity: s.maxQuantity || 10,
      isAvailable: s.isAvailable ?? true,
      isFeatured: s.isFeatured ?? false,
      popularBadge: s.popularBadge ?? false,
      serviceColor: s.serviceColor || '#2563eb',
      icon: s.icon || 'Camera',
      displayOrder: s.displayOrder || 1,
      status: s.status || 'active',
      variants: s.variants || [],
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      alert('Please enter a valid service name.');
      return;
    }

    const photos = serviceForm.photosInput
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload = {
      name: serviceForm.name,
      categoryId: serviceForm.categoryId,
      categoryName: serviceForm.categoryName,
      shortDescription: serviceForm.shortDescription,
      fullDescription: serviceForm.fullDescription,
      thumbnailImage: serviceForm.thumbnailImage,
      photos,
      basePrice: Number(serviceForm.basePrice),
      discount: Number(serviceForm.discount),
      gst: Number(serviceForm.gst),
      unit: serviceForm.unit,
      minQuantity: Number(serviceForm.minQuantity),
      maxQuantity: Number(serviceForm.maxQuantity),
      isAvailable: serviceForm.isAvailable,
      isFeatured: serviceForm.isFeatured,
      popularBadge: serviceForm.popularBadge,
      serviceColor: serviceForm.serviceColor,
      icon: serviceForm.icon,
      displayOrder: Number(serviceForm.displayOrder),
      status: serviceForm.status,
      variants: serviceForm.variants,
    };

    try {
      if (editingService) {
        await dbStudioServices.update(editingService.id, payload);
      } else {
        await dbStudioServices.add(payload);
      }
      setIsServiceModalOpen(false);
    } catch (err: any) {
      alert('Error saving service: ' + err.message);
    }
  };

  const handleToggleArchive = async (s: StudioService) => {
    try {
      const nextStatus = s.status === 'archived' ? 'active' : 'archived';
      await dbStudioServices.update(s.id, { status: nextStatus });
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleToggleAvailability = async (s: StudioService) => {
    try {
      await dbStudioServices.update(s.id, { isAvailable: !s.isAvailable });
    } catch (err: any) {
      alert('Failed to update availability: ' + err.message);
    }
  };

  const handleDuplicateService = async (s: StudioService) => {
    try {
      await dbStudioServices.duplicate(s);
    } catch (err: any) {
      alert('Error duplicating service: ' + err.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Are you sure you want to delete this service permanently?')) {
      try {
        await dbStudioServices.delete(id);
      } catch (err: any) {
        alert('Error deleting service: ' + err.message);
      }
    }
  };

  // VARIANT HANDLERS
  const handleAddVariant = () => {
    if (!variantForm.variantName.trim()) {
      alert('Please enter variant name (e.g. Basic, Standard, Luxury).');
      return;
    }
    const newVariant: ServiceVariant = {
      ...variantForm,
      id: Date.now().toString(),
    };
    setServiceForm((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
    setVariantForm({
      id: '',
      variantName: '',
      price: serviceForm.basePrice,
      features: [],
      duration: '1 Day',
      numberOfPhotographers: 1,
      numberOfCameras: 1,
    });
  };

  const handleRemoveVariant = (id: string) => {
    setServiceForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
  };

  const handleAddFeatureToVariant = () => {
    if (!newFeatureInput.trim()) return;
    setVariantForm((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureInput.trim()],
    }));
    setNewFeatureInput('');
  };

  // HANDLERS FOR PACKAGE MODAL
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
        unitPrice: s.basePrice,
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
    } catch (err: any) {
      alert('Error saving package: ' + err.message);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        await dbStudioPackages.delete(id);
      } catch (err: any) {
        alert('Error deleting package: ' + err.message);
      }
    }
  };

  // CATEGORY HANDLERS
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      displayOrder: categories.length + 1,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      if (editingCategory) {
        await dbServiceCategories.update(editingCategory.id, {
          name: categoryForm.name,
          description: categoryForm.description,
          displayOrder: Number(categoryForm.displayOrder),
        });
      } else {
        await dbServiceCategories.add({
          name: categoryForm.name,
          description: categoryForm.description,
          displayOrder: Number(categoryForm.displayOrder),
        });
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      alert('Error saving category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this service category?')) {
      try {
        await dbServiceCategories.delete(id);
      } catch (err: any) {
        alert('Error deleting category: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/20">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Studio Service & Pricing Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight font-display">
            Custom Studio Services & Packages
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
            Manage your studio's custom service catalog, prices, GST, packages, and variants. All prices are completely isolated and specific to your studio.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeSubTab === 'services' && (
            <button
              onClick={openNewServiceModal}
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition duration-150"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Add Custom Service
            </button>
          )}

          {activeSubTab === 'packages' && (
            <button
              onClick={openNewPackageModal}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition duration-150"
            >
              <Package className="h-4 w-4 stroke-[2.5]" />
              Create Package
            </button>
          )}

          {activeSubTab === 'categories' && (
            <button
              onClick={openNewCategoryModal}
              className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-purple-500/25 transition duration-150"
            >
              <Tag className="h-4 w-4 stroke-[2.5]" />
              New Category
            </button>
          )}
        </div>
      </div>

      {/* Dashboard KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Services</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{services.length}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{activeServices.length} Active</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Studio Packages</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalPackagesCount}</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Bundled Offers</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Featured Services</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{featuredServicesCount}</h3>
            <p className="text-[11px] font-semibold text-amber-600 mt-0.5">Top Banner Badge</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Star className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Top Tier Service</p>
            <h3 className="text-lg font-black text-slate-900 mt-1 truncate max-w-[120px]">
              {mostProfitable ? `₹${mostProfitable.basePrice.toLocaleString('en-IN')}` : '₹0'}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 truncate max-w-[120px]">
              {mostProfitable?.name || 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition ${
            activeSubTab === 'services'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          Studio Services ({services.length})
        </button>

        <button
          onClick={() => setActiveSubTab('packages')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition ${
            activeSubTab === 'packages'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="h-4 w-4" />
          Packages ({packages.length})
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition ${
            activeSubTab === 'categories'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag className="h-4 w-4" />
          Categories ({categories.length})
        </button>
      </div>

      {/* SUB-TAB 1: STUDIO SERVICES */}
      {activeSubTab === 'services' && (
        <div className="space-y-4">
          {/* Filters & Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="order">Default Order</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid View"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Show Archived Toggle */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  showArchived
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {showArchived ? 'Viewing Archived' : 'Show Archived'}
              </button>
            </div>
          </div>

          {/* Service Cards Display */}
          {filteredServices.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
              <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No services found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {showArchived
                  ? 'No archived services match your search filters.'
                  : 'Get started by creating custom studio services or selecting a different category filter.'}
              </p>
              <button
                onClick={openNewServiceModal}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow"
              >
                <Plus className="h-3.5 w-3.5" /> Add First Service
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`bg-white rounded-2xl border ${
                    service.status === 'archived' ? 'border-amber-200 opacity-75' : 'border-slate-100'
                  } shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4 relative`}
                >
                  {/* Service Badge & Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                        {service.categoryName || 'General'}
                      </span>
                      <div className="flex items-center gap-1">
                        {service.isFeatured && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            ★ Featured
                          </span>
                        )}
                        {service.popularBadge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight flex items-center justify-between">
                        <span>{service.name}</span>
                        {!service.isAvailable && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            Unavailable
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.shortDescription}</p>
                    </div>

                    {/* Price & Unit Details */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 font-medium">Base Price:</span>
                        <div className="text-right">
                          <span className="text-lg font-black text-blue-600">
                            ₹{service.basePrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold"> / {service.unit}</span>
                        </div>
                      </div>
                      {service.discount > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-600 font-bold">
                          <span>Special Discount:</span>
                          <span>- ₹{service.discount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Applicable GST:</span>
                        <span>{service.gst}% GST</span>
                      </div>
                    </div>

                    {/* Variants preview if present */}
                    {service.variants && service.variants.length > 0 && (
                      <div className="text-[11px] space-y-1 pt-1">
                        <span className="font-extrabold text-slate-400 uppercase tracking-wider block">
                          Variants ({service.variants.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {service.variants.map((v) => (
                            <span
                              key={v.id}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]"
                            >
                              {v.variantName}: ₹{v.price.toLocaleString('en-IN')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleAvailability(service)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        service.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {service.isAvailable ? 'Available' : 'Disabled'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicateService(service)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Duplicate Service"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleArchive(service)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                        title={service.status === 'archived' ? 'Restore Service' : 'Archive Service'}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => openEditServiceModal(service)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit Service"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete Service"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                      <th className="p-4">Service Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Base Price</th>
                      <th className="p-4">Unit</th>
                      <th className="p-4">GST</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredServices.map((service) => (
                      <tr key={service.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-extrabold text-slate-900">
                          <div>{service.name}</div>
                          <div className="text-[11px] font-normal text-slate-400 line-clamp-1">
                            {service.shortDescription}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-600">{service.categoryName}</td>
                        <td className="p-4 font-black text-blue-600">₹{service.basePrice.toLocaleString('en-IN')}</td>
                        <td className="p-4 font-medium text-slate-500">{service.unit}</td>
                        <td className="p-4 font-bold text-slate-600">{service.gst}%</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              service.isAvailable
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {service.isAvailable ? 'Available' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDuplicateService(service)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openEditServiceModal(service)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* SUB-TAB 2: STUDIO PACKAGES */}
      {activeSubTab === 'packages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Custom Studio Packages</h2>
            <button
              onClick={openNewPackageModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
            >
              <Plus className="h-3.5 w-3.5" /> Create New Package
            </button>
          </div>

          {packages.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
              <Package className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No packages created yet</h3>
              <p className="text-xs text-slate-400">Bundle multiple services together into promotional packages.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        Package Deal
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditPackageModal(pkg)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{pkg.packageName}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>
                    </div>

                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Bundle Price:</span>
                        <div className="text-xl font-black text-emerald-400">
                          ₹{pkg.packagePrice.toLocaleString('en-IN')}
                        </div>
                      </div>
                      {pkg.discount > 0 && (
                        <div className="text-right text-xs font-bold text-amber-300">
                          Save ₹{pkg.discount.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    {/* Included Services List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        Included Services ({pkg.includedServices.length}):
                      </span>
                      <ul className="space-y-1.5">
                        {pkg.includedServices.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100"
                          >
                            <span className="font-bold">{item.serviceName}</span>
                            <span className="text-slate-400 text-[11px]">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: SERVICE CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Custom Service Categories</h2>
            <button
              onClick={openNewCategoryModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                      Order #{cat.displayOrder || 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            name: cat.name,
                            description: cat.description || '',
                            displayOrder: cat.displayOrder || 1,
                          });
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-2">{cat.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{cat.description || 'Custom studio category'}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-bold">
                  {services.filter((s) => s.categoryId === cat.id || s.categoryName === cat.name).length} Services listed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT SERVICE */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editingService ? 'Edit Studio Service' : 'Add New Custom Service'}
                </h3>
                <p className="text-xs text-slate-500">Configure service pricing, GST, description, and variants.</p>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Name *</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g. Wedding Photography, Mug Printing"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={serviceForm.categoryId}
                    onChange={(e) => {
                      const selectedCatObj = categories.find((c) => c.id === e.target.value);
                      setServiceForm({
                        ...serviceForm,
                        categoryId: e.target.value,
                        categoryName: selectedCatObj ? selectedCatObj.name : e.target.value,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Unit */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={serviceForm.basePrice}
                    onChange={(e) => setServiceForm({ ...serviceForm, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceForm.discount}
                    onChange={(e) => setServiceForm({ ...serviceForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Rate</label>
                  <select
                    value={serviceForm.gst}
                    onChange={(e) => setServiceForm({ ...serviceForm, gst: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="0">0% GST</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pricing Unit</label>
                  <select
                    value={serviceForm.unit}
                    onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="Per Day">Per Day</option>
                    <option value="Per Hour">Per Hour</option>
                    <option value="Per Event">Per Event</option>
                    <option value="Per Piece">Per Piece</option>
                    <option value="Session">Session</option>
                    <option value="Units">Units</option>
                    <option value="Projects">Projects</option>
                  </select>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
                  <input
                    type="text"
                    value={serviceForm.shortDescription}
                    onChange={(e) => setServiceForm({ ...serviceForm, shortDescription: e.target.value })}
                    placeholder="Brief 1-line description for quotes & invoices"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Detailed Description</label>
                  <textarea
                    rows={3}
                    value={serviceForm.fullDescription}
                    onChange={(e) => setServiceForm({ ...serviceForm, fullDescription: e.target.value })}
                    placeholder="Detailed deliverables, equipment involved, cameras, delivery timelines..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.isAvailable}
                    onChange={(e) => setServiceForm({ ...serviceForm, isAvailable: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Currently Available</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.isFeatured}
                    onChange={(e) => setServiceForm({ ...serviceForm, isFeatured: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Featured Service</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.popularBadge}
                    onChange={(e) => setServiceForm({ ...serviceForm, popularBadge: e.target.checked })}
                    className="rounded text-rose-500 focus:ring-rose-500 h-4 w-4"
                  />
                  <span>Popular Service Badge</span>
                </label>
              </div>

              {/* VARIANTS MANAGEMENT SECTION */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Service Variants (Basic, Standard, Premium, Luxury)
                </h4>

                {serviceForm.variants.length > 0 && (
                  <div className="space-y-2">
                    {serviceForm.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900">{v.variantName}</span> -{' '}
                          <span className="font-black text-blue-600">₹{v.price.toLocaleString('en-IN')}</span>
                          {v.features.length > 0 && (
                            <span className="text-slate-400 text-[11px] block">{v.features.join(', ')}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(v.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-slate-100 p-3.5 rounded-2xl space-y-3 text-xs">
                  <span className="font-bold text-slate-700 block">Add New Variant:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Variant Name (e.g. Luxury)"
                      value={variantForm.variantName}
                      onChange={(e) => setVariantForm({ ...variantForm, variantName: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={variantForm.price}
                      onChange={(e) => setVariantForm({ ...variantForm, price: Number(e.target.value) })}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition"
                    >
                      + Add Variant
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs shadow-md shadow-blue-500/20"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT PACKAGE */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editingPackage ? 'Edit Studio Package' : 'Create New Studio Package'}
                </h3>
                <p className="text-xs text-slate-500">Combine multiple custom services into a discounted bundle.</p>
              </div>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silver Wedding Package, Gold Package"
                  value={packageForm.packageName}
                  onChange={(e) => setPackageForm({ ...packageForm, packageName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Package Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={packageForm.packagePrice}
                    onChange={(e) => setPackageForm({ ...packageForm, packagePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Package Discount Savings (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={packageForm.discount}
                    onChange={(e) => setPackageForm({ ...packageForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Package Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of what this package covers..."
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Select Included Services */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Select Included Services</label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {services.map((svc) => {
                    const isIncluded = packageForm.includedServices.some((i) => i.serviceId === svc.id);
                    return (
                      <div
                        key={svc.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                          isIncluded ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                        onClick={() => {
                          if (isIncluded) {
                            setPackageForm({
                              ...packageForm,
                              includedServices: packageForm.includedServices.filter((i) => i.serviceId !== svc.id),
                            });
                          } else {
                            setPackageForm({
                              ...packageForm,
                              includedServices: [
                                ...packageForm.includedServices,
                                { serviceId: svc.id, serviceName: svc.name, quantity: 1, unitPrice: svc.basePrice },
                              ],
                            });
                          }
                        }}
                      >
                        <span className="font-extrabold text-slate-900">{svc.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">₹{svc.basePrice.toLocaleString('en-IN')}</span>
                          {isIncluded && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs shadow-md shadow-emerald-500/20"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Services, Album Design"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Order Index</label>
                <input
                  type="number"
                  value={categoryForm.displayOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
