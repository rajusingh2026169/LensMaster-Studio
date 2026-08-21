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

  // Structured menu modules adhering strictly to reference design sequence
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
      icon: Layers,
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
      id: 'reports',
      label: 'Report',
      icon: BarChart3,
      badge: null,
      subItems: [
        { id: 'profit_service', label: 'Profit Per Service (overall profit)', icon: TrendingUp },
        { id: 'sales', label: 'Sale Report - (day/week/month/year)', icon: DollarSign },
        { id: 'profit_loss', label: 'Profit Report - (day/week/month/year)', icon: BarChart3 },
        { id: 'daily', label: 'Paid Report', icon: Clock },
        { id: 'customer', label: 'Pending Report', icon: FileText },
      ]
    },
    {
      id: 'settings',
      label: 'Setting',
      icon: Settings,
      badge: null,
      subItems: []
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      badge: null,
      subItems: []
    }
  ];

  const handleParentMenuClick = (mainTab: string, subSection?: string) => {
    if (mainTab === 'logout') {
      if (onSignOut) onSignOut();
      return;
    }
    setExpandedMenus((prev) => ({
      ...prev,
      [mainTab]: !prev[mainTab]
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
          fixed inset-y-0 left-0 z-50 bg-[#120d31] border-r border-[#1e164d]
          flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out md:static
          ${isCollapsed ? 'w-16' : 'w-60'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          shadow-2xl md:shadow-none font-sans
        `}
      >
        {/* Upper Menu Area */}
        <div className="flex flex-col overflow-hidden">
          {/* MENU Label Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e164d] bg-[#100c2a] shrink-0">
            <span className="text-[11px] font-bold tracking-widest text-[#8c94b2] uppercase">
              MENU
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex text-[#8c94b2] hover:text-white p-1 rounded hover:bg-white/10 transition"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-1 custom-scrollbar max-h-[calc(100vh-100px)]">
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
                      group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer
                      transition-all duration-150 text-xs font-medium
                      ${
                        isParentActive
                          ? 'bg-[#241a54] text-white shadow-xs font-semibold'
                          : 'text-[#8c94b2] hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isParentActive ? 'text-white' : 'text-[#8c94b2] group-hover:text-white'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate tracking-wide">{moduleItem.label}</span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1 shrink-0">
                        {moduleItem.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isParentActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#1e164d] text-blue-300'
                            }`}
                          >
                            {moduleItem.badge}
                          </span>
                        )}
                        {moduleItem.subItems.length > 0 && (
                          <ChevronRight
                            className={`h-3 w-3 text-[#8c94b2] transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-white' : ''
                            }`}
                          />
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
                          transition={{ duration: 0.15, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pl-5 pr-1 py-1 space-y-0.5 my-0.5 border-l border-[#241a54] ml-3">
                            {moduleItem.subItems.map((sub) => {
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
                                    w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-normal
                                    transition-all duration-150 group/sub text-left
                                    ${
                                      isSubActive
                                        ? 'bg-[#241a54] text-white font-semibold'
                                        : 'text-[#8c94b2] hover:bg-white/5 hover:text-white'
                                    }
                                  `}
                                >
                                  <span className="truncate">{sub.label}</span>
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

        {/* Footer info in sidebar */}
        {!isCollapsed && (
          <div className="p-3 border-t border-[#1e164d] text-center text-[10px] text-[#8c94b2]/60">
            Dazz Photography System
          </div>
        )}
      </aside>
    </>
  );
}
