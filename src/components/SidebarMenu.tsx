import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Sparkles,
  Calendar,
  Bell,
  Layers,
  Plus,
  Package,
  Camera,
  Printer,
  HelpCircle,
  MessageSquare,
  FileText,
  Briefcase,
  Users,
  UserCheck,
  Receipt,
  DollarSign,
  BarChart3,
  TrendingUp,
  Settings,
  Sliders,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Send,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  CreditCard,
  Download,
  Share2,
  Lock,
  Database,
  Building2,
  User,
  List,
  FolderTree,
  Tag,
  BookOpen,
  ShoppingCart,
  Box
} from 'lucide-react';
import { ServiceCategory } from '../types';
import defaultAppLogo from '../assets/logo.jpg';

export interface SidebarMenuProps {
  activeTab?: string;
  activeSection?: string;
  activeSubSection?: string;
  onSelectMenu?: (mainTab: string, subSection?: string) => void;
  onSelectSection?: (mainTab: string, subSection?: string) => void;
  studioProfile?: any;
  categories?: ServiceCategory[];
  inquiriesCount?: number;
  ordersCount?: number;
  invoicesCount?: number;
  onSignOut?: () => void;
  userEmail?: string;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function SidebarMenu({
  activeTab,
  activeSection,
  activeSubSection = '',
  onSelectMenu,
  onSelectSection,
  studioProfile,
  categories = [],
  inquiriesCount = 0,
  ordersCount = 0,
  invoicesCount = 0,
  onSignOut,
  userEmail,
  mobileMenuOpen = false,
  setMobileMenuOpen
}: SidebarMenuProps) {
  const currentTab = activeTab || activeSection || 'dashboard';
  const handleSelect = onSelectMenu || onSelectSection || (() => {});

  // Sidebar collapsed state (mini vs full ERP sidebar)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Accordion state for expandable submenus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    dashboard: true,
    service_groups: false,
    services: false,
    enquiry: false,
    orders: false,
    invoice: false,
    reports: false,
    settings: false,
  });

  // Keep active parent menu expanded when tab changes
  useEffect(() => {
    if (activeTab) {
      setExpandedMenus((prev) => ({
        ...prev,
        [activeTab]: true
      }));
    }
  }, [activeTab]);

  const toggleAccordion = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Structured menu modules adhering strictly to sequence requested
  const menuStructure = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      subItems: []
    },
    {
      id: 'service_groups',
      label: 'Service Group',
      icon: FolderTree,
      badge: categories.length ? `${categories.length}` : null,
      subItems: []
    },
    {
      id: 'services',
      label: 'Services',
      icon: Package,
      badge: null,
      subItems: []
    },
    {
      id: 'enquiry',
      label: 'Enquiry',
      icon: HelpCircle,
      badge: inquiriesCount > 0 ? `${inquiriesCount}` : null,
      subItems: []
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: Briefcase,
      badge: ordersCount > 0 ? `${ordersCount}` : null,
      subItems: []
    },
    {
      id: 'invoice',
      label: 'Invoice',
      icon: FileText,
      badge: invoicesCount > 0 ? `${invoicesCount}` : null,
      subItems: []
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: null,
      subItems: []
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: UserCheck,
      badge: null,
      subItems: []
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: Users,
      badge: null,
      subItems: []
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Box,
      badge: null,
      subItems: []
    },
    {
      id: 'store',
      label: 'Product Store',
      icon: ShoppingCart,
      badge: null,
      subItems: []
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
      subItems: []
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      badge: null,
      subItems: []
    }
  ];

  const handleParentMenuClick = (mainTab: string, subSection?: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [mainTab]: true
    }));
    handleSelect(mainTab, subSection || '');
    if (setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Main ERP Sidebar Container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#0B1120] border-r border-slate-800/80
          flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out md:static
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          shadow-2xl md:shadow-none
        `}
      >
        {/* Upper Branding Header */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#0F172A]/90 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#3B82F6] p-0.5 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 overflow-hidden">
                <img
                  src={studioProfile?.studioLogo || defaultAppLogo}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-[10px] object-cover bg-black"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultAppLogo;
                  }}
                />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-white text-sm tracking-tight truncate leading-tight">
                    {studioProfile?.businessName || studioProfile?.studioName || 'LensMaster ERP'}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Studio & Press
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop toggle collapse / Mobile close */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* ERP Navigation Menu - Scrollable Area */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1.5 custom-scrollbar max-h-[calc(100vh-140px)]">
            {menuStructure.map((moduleItem) => {
              const Icon = moduleItem.icon;
              const isParentActive = currentTab === moduleItem.id;
              const isExpanded = expandedMenus[moduleItem.id];

              return (
                <div key={moduleItem.id} className="select-none">
                  {/* Main Parent Module Item */}
                  <div
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                      }
                      handleParentMenuClick(moduleItem.id, moduleItem.subItems[0]?.id);
                    }}
                    className={`
                      group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer
                      transition-all duration-150 text-xs font-bold
                      ${
                        isParentActive
                          ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/25'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isParentActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate tracking-wide">{moduleItem.label}</span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-2 shrink-0">
                        {moduleItem.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                              isParentActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-800 text-blue-400 border border-slate-700'
                            }`}
                          >
                            {moduleItem.badge}
                          </span>
                        )}
                        {moduleItem.subItems.length > 0 && (
                          <button
                            onClick={(e) => toggleAccordion(moduleItem.id, e)}
                            className="p-0.5 rounded hover:bg-white/10 transition"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submenu Accordion */}
                  {!isCollapsed && moduleItem.subItems.length > 0 && (
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pl-6 pr-1 py-1.5 space-y-1 my-0.5 border-l-2 border-slate-800/80 ml-4">
                            {moduleItem.subItems.map((sub) => {
                              const SubIcon = sub.icon;
                              const isSubActive =
                                isParentActive &&
                                (activeSubSection === sub.id ||
                                  (!activeSubSection && sub.id === moduleItem.subItems[0].id));

                              return (
                                <button
                                  key={sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(moduleItem.id, sub.id);
                                    if (window.innerWidth < 768) {
                                      setMobileMenuOpen?.(false);
                                    }
                                  }}
                                  className={`
                                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold
                                    transition-all duration-150 group/sub text-left
                                    ${
                                      isSubActive
                                        ? 'bg-blue-500/15 text-blue-400 font-extrabold border-l-2 border-blue-500'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <SubIcon
                                      className={`h-3.5 w-3.5 shrink-0 ${
                                        isSubActive
                                          ? 'text-blue-400'
                                          : 'text-slate-500 group-hover/sub:text-slate-300'
                                      }`}
                                    />
                                    <span className="truncate">{sub.label}</span>
                                  </div>

                                  {isSubActive && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile & Sign Out */}
        <div className="border-t border-slate-800/80 p-3.5 bg-[#0F172A]/70 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {(studioProfile?.ownerName || userEmail || 'O').charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {studioProfile?.ownerName || 'Studio Owner'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {studioProfile?.email || userEmail}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onSignOut}
              className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
