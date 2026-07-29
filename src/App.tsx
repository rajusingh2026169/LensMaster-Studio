import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, sendEmailVerification, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, setDoc, collection, writeBatch } from 'firebase/firestore';
import { 
  Camera, 
  Printer, 
  Users, 
  UserCheck,
  Calendar, 
  FileText, 
  DollarSign, 
  Warehouse, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  Lock,
  Loader2,
  Settings,
  ShieldCheck,
  HelpCircle,
  Send,
  Briefcase,
  AlertCircle,
  Layers
} from 'lucide-react';

import { auth, signInWithGoogle, db, isConfigValid } from './firebase';
import { Customer, Booking, Invoice, Expense, InventoryItem, Employee, Team, CalendarItem, Inquiry, Quotation, WorkOrder, PaymentRecord, StudioService, ServiceCategory, StudioPackage } from './types';
import { 
  dbCustomers, 
  dbBookings, 
  dbInvoices, 
  dbExpenses, 
  dbInventory,
  dbEmployees,
  dbTeams,
  dbCalendar,
  dbInquiries,
  dbQuotations,
  dbOrders,
  dbPayments,
  dbServiceCategories,
  dbStudioServices,
  dbStudioPackages,
  tenantContext,
  cleanUndefined,
  dbSystemSettings
} from './services/dbService';
import defaultAppLogo from './assets/logo.jpg';

// Component imports
import Dashboard from './components/Dashboard';
import Inquiries from './components/Inquiries';
import Quotations from './components/Quotations';
import WorkOrders from './components/WorkOrders';
import Customers from './components/Customers';
import Bookings from './components/Bookings';
import Invoices from './components/Invoices';
import Expenses from './components/Expenses';
import AuthScreen from './components/AuthScreen';
import BusinessSettings from './components/BusinessSettings';
import AdminDashboard from './components/AdminDashboard';
import TeamsAndEmployees from './components/TeamsAndEmployees';
import EmployeeManagement from './components/EmployeeManagement';
import CalendarView from './components/CalendarView';
import ServicesAndPackages from './components/ServicesAndPackages';

export default function App() {
  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // Tenant SaaS States
  const [studioId, setStudioId] = useState<string | null>(null);
  const studioIdRef = useRef<string | null>(null);
  const isStudioLoadedRef = useRef<boolean>(false);
  const [studioProfile, setStudioProfile] = useState<any>(null);
  const [studioSettings, setStudioSettings] = useState<any>(null);
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin' | null>(null);

  // Routing and admin state
  const [isAdminPath, setIsAdminPath] = useState(window.location.hash === '#/admin');

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminPath(window.location.hash === '#/admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firestore DB States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [studioServices, setStudioServices] = useState<StudioService[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [studioPackages, setStudioPackages] = useState<StudioPackage[]>([]);

  // Inter-component pre-selection states (shortcuts)
  const [preselectedCustomer, setPreselectedCustomer] = useState<Customer | null>(null);
  const [preselectedBooking, setPreselectedBooking] = useState<Booking | null>(null);
  const [preselectedInquiryForQuotation, setPreselectedInquiryForQuotation] = useState<Inquiry | null>(null);

  // Application branding logo state
  const [customAppLogo, setCustomAppLogo] = useState<string | null>(null);

  useEffect(() => {
    const unsub = dbSystemSettings.subscribeBranding((branding) => {
      if (branding && branding.applicationLogo) {
        setCustomAppLogo(branding.applicationLogo);
      } else {
        setCustomAppLogo(null);
      }
    });
    return () => unsub();
  }, []);

  const activeAppLogo = customAppLogo || defaultAppLogo;

  // Auth Observer
  useEffect(() => {
    if (!isConfigValid || !auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        console.log(`[AUTH_SUCCESS] User is authenticated successfully. Email: ${firebaseUser.email}, UID: ${firebaseUser.uid}`);
      } else {
        console.log("[AUTH_STATE] No user is authenticated.");
        setWorkspaceError(null);
        setStudioId(null);
        setAdminRole(null);
      }
    });
    return unsubscribe;
  }, []);

  // Real-time tenant profile loading & Admin redirection logic
  useEffect(() => {
    if (!isConfigValid || !user || !db || isRegistering) {
      setStudioId(null);
      studioIdRef.current = null;
      isStudioLoadedRef.current = false;
      setStudioProfile(null);
      setStudioSettings(null);
      setAdminRole(null);
      tenantContext.setStudioId(null);
      return;
    }

    let unsubUser: (() => void) | null = null;
    let unsubStudio: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;
    let active = true;

    // 15-second timeout to allow initial connection handshake
    const initializationTimeout = setTimeout(() => {
      if (active && !isStudioLoadedRef.current) {
        console.error("[Errors] Workspace initialization timed out after 15 seconds.");
        setWorkspaceError("Workspace Initialization Failed: No studio record or user document was found. Timeout (15 seconds). Please check your internet or Firebase connection and try again.");
      }
    }, 15000);

    const loadWorkspaceFlow = async () => {
      try {
        console.log("Loading user profile...");
        const userDocRef = doc(db, 'users', user.uid);
        
        unsubUser = onSnapshot(userDocRef, async (userSnap) => {
          if (!active) return;

          if (userSnap.exists()) {
            const uData = userSnap.data();
            console.log("[User Loaded] Loaded user document:", uData);
            
            // Check for Admin or Super Admin role
            let uRole = uData.role;
            const userEmailLower = (user.email || '').toLowerCase();
            const isDefaultAdmin = userEmailLower === 'admin@lensmaster.com';

            if (isDefaultAdmin && uRole !== 'super_admin') {
              console.log("[AUTH_SUCCESS] Upgrading existing user document to super_admin for default admin email");
              try {
                await setDoc(userDocRef, {
                  role: 'super_admin',
                  studioId: 'admin'
                }, { merge: true });
                uRole = 'super_admin';
              } catch (upgErr) {
                console.error("Failed to upgrade admin user role:", upgErr);
              }
            }

            if (uRole === 'admin' || uRole === 'super_admin') {
              console.log(`[AUTH_SUCCESS] Authenticated Admin detected. Email: ${user.email}, Role: ${uRole}`);
              setAdminRole(uRole);
              setStudioId('admin');
              studioIdRef.current = 'admin';
              isStudioLoadedRef.current = true;
              clearTimeout(initializationTimeout);
              return;
            }

            const sId = uData.studioId;
            if (!sId) {
              console.error("[Errors] No studio ID was associated with this user profile.");
              setWorkspaceError("Workspace Initialization Failed: No studio associated with user document.");
              clearTimeout(initializationTimeout);
              return;
            }

            setStudioId(sId);
            studioIdRef.current = sId;
            tenantContext.setStudioId(sId);

            // Mark studio as loaded immediately so workspace opens without timeout
            const currentName = uData.ownerName ? `${uData.ownerName} Studio` : 'Studio';
            setStudioProfile((prev: any) => prev || {
              businessName: currentName,
              studioName: currentName,
              ownerName: uData.ownerName || 'Owner',
              mobileNumber: '',
              email: user.email || '',
              address: '',
              gstNumber: '',
              studioLogo: user.photoURL || '',
              _source: 'fallback'
            });
            isStudioLoadedRef.current = true;
            clearTimeout(initializationTimeout);

            // Subscribe to studios/{studioId} for live updates
            const studioDocRef = doc(db, 'studios', sId);
            if (unsubStudio) unsubStudio();
            unsubStudio = onSnapshot(studioDocRef, (studioSnap) => {
              if (!active) return;
              if (studioSnap.exists()) {
                const sData = studioSnap.data();
                console.log("[Studio Loaded] Loaded studio document:", sData);

                // Check if the studio is suspended
                if (sData.status === 'suspended') {
                  console.error("[Errors] Studio workspace is suspended.");
                  setWorkspaceError("Workspace Initialization Failed: This studio workspace has been suspended by the administrator. Please contact support.");
                  clearTimeout(initializationTimeout);
                  return;
                }

                // Treat profile and settings as nested or fetch from settings subcollection
                setStudioProfile((prev: any) => {
                  if (prev && prev._source === 'sub') return prev;
                  // If main document has a businessName but no direct profile subdocument, construct a fallback profile
                  const currentName = sData.businessName || sData.studioName || 'Studio';
                  return {
                    businessName: currentName,
                    studioName: currentName,
                    ownerName: sData.ownerName || 'Owner',
                    mobileNumber: sData.mobileNumber || '',
                    email: sData.email || '',
                    address: sData.address || '',
                    gstNumber: sData.gstNumber || '',
                    studioLogo: sData.studioLogo || '',
                    _source: 'main'
                  };
                });
              } else {
                console.log("[Studio Missing] Studio document not found in Firestore. Attempting automatic studio document recreation...");
                const recreateStudioFlow = async () => {
                  try {
                    const batch = writeBatch(db);
                    const nowStr = new Date().toISOString();
                    
                    const currentName = user.displayName ? `${user.displayName} Studio` : 'Studio';
                    // Create studios/{sId}
                    batch.set(doc(db, 'studios', sId), cleanUndefined({
                      businessName: currentName,
                      studioName: currentName,
                      ownerName: user.displayName || uData.ownerName || 'Owner',
                      mobileNumber: '',
                      email: user.email || uData.email || '',
                      address: '',
                      gstNumber: '',
                      invoiceCounter: 100,
                      createdAt: nowStr
                    }));

                    // Create settings subcollection doc
                    const defaultProfile = {
                      studioName: currentName,
                      businessName: currentName,
                      ownerName: user.displayName || uData.ownerName || 'Owner',
                      mobileNumber: '',
                      email: user.email || uData.email || '',
                      address: '',
                      gstNumber: '',
                      studioLogo: user.photoURL || '',
                      createdAt: nowStr,
                      updatedAt: nowStr
                    };

                    const defaultSettings = {
                      taxRate: 18,
                      currency: 'INR',
                      invoicePrefix: 'INV-',
                      invoiceFooter: 'Thank you for your business!',
                      terms: '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.',
                      authorizedSignatory: user.displayName || uData.ownerName || 'Owner',
                      printPreferences: {
                        showLogo: true,
                        showSignature: true,
                        paperSize: 'A4'
                      }
                    };

                    batch.set(doc(db, 'studios', sId, 'settings', 'settings'), cleanUndefined({
                      profile: defaultProfile,
                      settings: defaultSettings,
                      createdAt: nowStr
                    }));

                    // Create user subcollection doc
                    batch.set(doc(db, 'studios', sId, 'users', user.uid), cleanUndefined({
                      uid: user.uid,
                      email: user.email || '',
                      role: 'owner',
                      ownerName: user.displayName || uData.ownerName || 'Owner',
                      createdAt: nowStr
                    }));

                    // Create subcollections init docs
                    batch.set(doc(db, 'studios', sId, 'customers', '_init'), { initialized: true });
                    batch.set(doc(db, 'studios', sId, 'bookings', '_init'), { initialized: true });
                    batch.set(doc(db, 'studios', sId, 'expenses', '_init'), { initialized: true });
                    batch.set(doc(db, 'studios', sId, 'inventory', '_init'), { initialized: true });

                    await batch.commit();
                    console.log("[AUTO_PROVISION_SUCCESS] Automatically recreated missing studio document for:", sId);
                    isStudioLoadedRef.current = true;
                    clearTimeout(initializationTimeout);
                  } catch (provErr: any) {
                    console.error("[Errors] Failed to recreate missing studio document:", provErr);
                    setWorkspaceError(`Workspace Initialization Failed: Studio not found and automatic creation failed: ${provErr.message}`);
                    clearTimeout(initializationTimeout);
                  }
                };

                recreateStudioFlow();
              }
            }, (err) => {
              console.error("[Errors] Error loading studio snapshot:", err);
              // Non-fatal error log for studio snapshot, fallback profile already in place
            });

            // Subscribe to settings subcollection
            const settingsDocRef = doc(db, 'studios', sId, 'settings', 'settings');
            if (unsubSettings) unsubSettings();
            unsubSettings = onSnapshot(settingsDocRef, (settingsSnap) => {
              if (!active) return;
              if (settingsSnap.exists()) {
                const settingsData = settingsSnap.data();
                const profileObj = { ...(settingsData.profile || {}) };
                const settingsObj = { ...(settingsData.settings || {}) };

                // Migration layer: Ensure businessName and studioName are set & synchronized
                const migrationBizName = profileObj.businessName || profileObj.studioName || settingsObj.businessName || settingsObj.studioName || 'Studio';
                
                if (!profileObj.businessName) profileObj.businessName = migrationBizName;
                if (!profileObj.studioName) profileObj.studioName = migrationBizName;
                if (!settingsObj.businessName) settingsObj.businessName = migrationBizName;
                if (!settingsObj.studioName) settingsObj.studioName = migrationBizName;

                setStudioProfile({ ...profileObj, _source: 'sub' });
                setStudioSettings({ ...settingsObj, _source: 'sub' });

                // Auto-persist migration back to firestore if it was missing in the db
                if (!settingsData.profile?.businessName || !settingsData.settings?.businessName) {
                  console.log("[Migration] Automatically migrating settings subcollection to include businessName:", migrationBizName);
                  setDoc(settingsDocRef, cleanUndefined({
                    profile: profileObj,
                    settings: settingsObj
                  }), { merge: true }).catch(err => console.error("Auto-migration write failed:", err));
                }
              }
            }, (err) => {
              console.error("[Errors] Error loading settings snapshot:", err);
              setWorkspaceError(`Workspace Initialization Failed: Error loading studio settings. Details: ${err.message}`);
              clearTimeout(initializationTimeout);
            });

          } else {
            // Document does not exist - check if we can recreate it (Rule 7)
            console.log("No user document found. [Errors] User profile missing. Attempting automatic profile recreation to prevent lockout...");
            try {
              const generatedStudioId = user.uid; // Using UID as studioId for simplicity and consistency
              const batch = writeBatch(db);
              const nowStr = new Date().toISOString();

              const userEmailLower = (user.email || '').toLowerCase();
              const isDefaultAdmin = userEmailLower === 'admin@lensmaster.com';
              const targetRole = isDefaultAdmin ? 'super_admin' : 'owner';

              if (isDefaultAdmin) {
                console.log("[AUTH_SUCCESS] Seeding Super Admin role for:", userEmailLower);
                // Create Super Admin profile
                batch.set(doc(db, 'users', user.uid), cleanUndefined({
                  uid: user.uid,
                  studioId: 'admin',
                  email: user.email || '',
                  ownerName: 'Super Admin',
                  role: 'super_admin',
                  createdAt: nowStr
                }));
              } else {
                // Recreate users/{uid}
                batch.set(doc(db, 'users', user.uid), cleanUndefined({
                  uid: user.uid,
                  studioId: generatedStudioId,
                  email: user.email || '',
                  ownerName: user.displayName || 'Owner',
                  role: targetRole,
                  createdAt: nowStr
                }));

                const currentName = user.displayName ? `${user.displayName} Studio` : 'Studio';
                // Recreate studios/{studioId}
                batch.set(doc(db, 'studios', generatedStudioId), cleanUndefined({
                  businessName: currentName,
                  studioName: currentName,
                  ownerName: user.displayName || 'Owner',
                  mobileNumber: '',
                  email: user.email || '',
                  address: '',
                  gstNumber: '',
                  invoiceCounter: 100,
                  createdAt: nowStr
                }));

                // Recreate settings subcollection doc
                const defaultProfile = {
                  studioName: currentName,
                  businessName: currentName,
                  ownerName: user.displayName || 'Owner',
                  mobileNumber: '',
                  email: user.email || '',
                  address: '',
                  gstNumber: '',
                  studioLogo: user.photoURL || '',
                  createdAt: nowStr,
                  updatedAt: nowStr
                };

                const defaultSettings = {
                  taxRate: 18,
                  currency: 'INR',
                  invoicePrefix: 'INV-',
                  invoiceFooter: 'Thank you for your business!',
                  terms: '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.',
                  authorizedSignatory: user.displayName || 'Owner',
                  printPreferences: {
                    showLogo: true,
                    showSignature: true,
                    paperSize: 'A4'
                  }
                };

                batch.set(doc(db, 'studios', generatedStudioId, 'settings', 'settings'), cleanUndefined({
                  profile: defaultProfile,
                  settings: defaultSettings,
                  createdAt: nowStr
                }));

                // Recreate user subcollection doc
                batch.set(doc(db, 'studios', generatedStudioId, 'users', user.uid), cleanUndefined({
                  uid: user.uid,
                  email: user.email || '',
                  role: 'owner',
                  ownerName: user.displayName || 'Owner',
                  createdAt: nowStr
                }));

                // Recreate subcollections init docs
                batch.set(doc(db, 'studios', generatedStudioId, 'customers', '_init'), { initialized: true });
                batch.set(doc(db, 'studios', generatedStudioId, 'bookings', '_init'), { initialized: true });
                batch.set(doc(db, 'studios', generatedStudioId, 'expenses', '_init'), { initialized: true });
                batch.set(doc(db, 'studios', generatedStudioId, 'inventory', '_init'), { initialized: true });
              }

              await batch.commit();
              console.log("Firestore Success");
              console.log("[AUTO_PROVISION_SUCCESS] Recreated missing user profile & studio documents for user:", user.uid);

              if (isDefaultAdmin) {
                setAdminRole('super_admin');
                setStudioId('admin');
                studioIdRef.current = 'admin';
              } else {
                const currentName = user.displayName ? `${user.displayName} Studio` : 'Studio';
                setStudioId(generatedStudioId);
                studioIdRef.current = generatedStudioId;
                tenantContext.setStudioId(generatedStudioId);
                setStudioProfile({
                  businessName: currentName,
                  studioName: currentName,
                  ownerName: user.displayName || 'Owner',
                  mobileNumber: '',
                  email: user.email || '',
                  address: '',
                  gstNumber: '',
                  studioLogo: user.photoURL || '',
                  _source: 'main'
                });
              }
              isStudioLoadedRef.current = true;
              clearTimeout(initializationTimeout);
            } catch (provErr: any) {
              console.error("[Errors] Failed to recreate missing profile:", provErr);
              setWorkspaceError(`Workspace Initialization Failed: User profile missing. Failed to recreate missing documents: ${provErr.message}`);
              clearTimeout(initializationTimeout);
            }
          }
        }, (snapErr) => {
          console.error("[Errors] Snapshot error fetching user:", snapErr);
          setWorkspaceError(`Workspace Initialization Failed: Firestore permissions or connection error. Please contact support. Details: ${snapErr.message}`);
          clearTimeout(initializationTimeout);
        });
      } catch (flowErr: any) {
        console.error("[Errors] Workspace flow error:", flowErr);
        setWorkspaceError(`Workspace Initialization Failed: ${flowErr.message}`);
        clearTimeout(initializationTimeout);
      }
    };

    loadWorkspaceFlow();

    return () => {
      active = false;
      clearTimeout(initializationTimeout);
      if (unsubUser) unsubUser();
      if (unsubStudio) unsubStudio();
      if (unsubSettings) unsubSettings();
    };
  }, [user, isRegistering]);

  // Update Browser Title
  useEffect(() => {
    document.title = studioProfile?.businessName || studioProfile?.studioName || 'Studio';
  }, [studioProfile]);

  // Firestore Subscriptions (triggered ONLY after studioId is loaded)
  useEffect(() => {
    if (!isConfigValid || !user || !studioId || studioId === 'admin' || !db) {
      // Reset state if logged out or studio context is not fully initialized
      setCustomers([]);
      setBookings([]);
      setInvoices([]);
      setExpenses([]);
      setInventory([]);
      return;
    }

    let active = true;
    let unsubCustomers: (() => void) | null = null;
    let unsubBookings: (() => void) | null = null;
    let unsubInvoices: (() => void) | null = null;
    let unsubExpenses: (() => void) | null = null;
    let unsubInventory: (() => void) | null = null;
    let unsubEmployees: (() => void) | null = null;
    let unsubTeams: (() => void) | null = null;
    let unsubCalendar: (() => void) | null = null;
    let unsubInquiries: (() => void) | null = null;
    let unsubQuotations: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubPayments: (() => void) | null = null;
    let unsubCategories: (() => void) | null = null;
    let unsubServices: (() => void) | null = null;
    let unsubPackages: (() => void) | null = null;

    const maxSubRetries = 5;
    const retries = {
      customers: 0,
      bookings: 0,
      invoices: 0,
      expenses: 0,
      inventory: 0,
      employees: 0,
      teams: 0,
    };

    const subCustomers = () => {
      if (!active) return;
      unsubCustomers = dbCustomers.subscribe(
        (data) => {
          if (active) setCustomers(data);
        },
        (err) => {
          console.error("Customers subscription error:", err);
          if (active && retries.customers < maxSubRetries) {
            retries.customers++;
            const delay = Math.min(1000 * Math.pow(2, retries.customers), 10000);
            console.log(`Retrying Customers subscription (attempt ${retries.customers}) in ${delay}ms...`);
            setTimeout(() => {
              if (active) {
                if (unsubCustomers) unsubCustomers();
                subCustomers();
              }
            }, delay);
          }
        }
      );
    };

    const subBookings = () => {
      if (!active) return;
      unsubBookings = dbBookings.subscribe(
        (data) => {
          if (active) setBookings(data);
        },
        (err) => {
          console.error("Bookings subscription error:", err);
          if (active && retries.bookings < maxSubRetries) {
            retries.bookings++;
            const delay = Math.min(1000 * Math.pow(2, retries.bookings), 10000);
            console.log(`Retrying Bookings subscription (attempt ${retries.bookings}) in ${delay}ms...`);
            setTimeout(() => {
              if (active) {
                if (unsubBookings) unsubBookings();
                subBookings();
              }
            }, delay);
          }
        }
      );
    };

    const subInvoices = () => {
      if (!active) return;
      unsubInvoices = dbInvoices.subscribe(
        (data) => {
          if (active) setInvoices(data);
        },
        (err) => {
          console.error("Invoices subscription error:", err);
          if (active && retries.invoices < maxSubRetries) {
            retries.invoices++;
            const delay = Math.min(1000 * Math.pow(2, retries.invoices), 10000);
            console.log(`Retrying Invoices subscription (attempt ${retries.invoices}) in ${delay}ms...`);
            setTimeout(() => {
              if (active) {
                if (unsubInvoices) unsubInvoices();
                subInvoices();
              }
            }, delay);
          }
        }
      );
    };

    const subExpenses = () => {
      if (!active) return;
      unsubExpenses = dbExpenses.subscribe(
        (data) => {
          if (active) setExpenses(data);
        },
        (err) => {
          console.error("Expenses subscription error:", err);
          if (active && retries.expenses < maxSubRetries) {
            retries.expenses++;
            const delay = Math.min(1000 * Math.pow(2, retries.expenses), 10000);
            console.log(`Retrying Expenses subscription (attempt ${retries.expenses}) in ${delay}ms...`);
            setTimeout(() => {
              if (active) {
                if (unsubExpenses) unsubExpenses();
                subExpenses();
              }
            }, delay);
          }
        }
      );
    };

    const subInventory = () => {
      if (!active) return;
      unsubInventory = dbInventory.subscribe(
        (data) => {
          if (active) setInventory(data);
        },
        (err) => {
          console.error("Inventory subscription error:", err);
          if (active && retries.inventory < maxSubRetries) {
            retries.inventory++;
            const delay = Math.min(1000 * Math.pow(2, retries.inventory), 10000);
            console.log(`Retrying Inventory subscription (attempt ${retries.inventory}) in ${delay}ms...`);
            setTimeout(() => {
              if (active) {
                if (unsubInventory) unsubInventory();
                subInventory();
              }
            }, delay);
          }
        }
      );
    };

    const subEmployees = () => {
      if (!active) return;
      unsubEmployees = dbEmployees.subscribe(
        (data) => {
          if (active) setEmployees(data);
        },
        (err) => {
          console.error("Employees subscription error:", err);
        }
      );
    };

    const subTeams = () => {
      if (!active) return;
      unsubTeams = dbTeams.subscribe(
        (data) => {
          if (active) setTeams(data);
        },
        (err) => {
          console.error("Teams subscription error:", err);
        }
      );
    };

    const subCalendar = () => {
      if (!active) return;
      unsubCalendar = dbCalendar.subscribe(
        (data) => {
          if (active) setCalendarItems(data);
        },
        (err) => {
          console.error("Calendar subscription error:", err);
        }
      );
    };

    const subInquiries = () => {
      if (!active) return;
      unsubInquiries = dbInquiries.subscribe(
        (data) => {
          if (active) setInquiries(data);
        },
        (err) => {
          console.error("Inquiries subscription error:", err);
        }
      );
    };

    const subQuotations = () => {
      if (!active) return;
      unsubQuotations = dbQuotations.subscribe(
        (data) => {
          if (active) setQuotations(data);
        },
        (err) => {
          console.error("Quotations subscription error:", err);
        }
      );
    };

    const subOrders = () => {
      if (!active) return;
      unsubOrders = dbOrders.subscribe(
        (data) => {
          if (active) setOrders(data);
        },
        (err) => {
          console.error("Orders subscription error:", err);
        }
      );
    };

    const subPayments = () => {
      if (!active) return;
      unsubPayments = dbPayments.subscribe(
        (data) => {
          if (active) setPayments(data);
        },
        (err) => {
          console.error("Payments subscription error:", err);
        }
      );
    };

    const subCategories = () => {
      if (!active) return;
      unsubCategories = dbServiceCategories.subscribe(
        (data) => {
          if (active) setServiceCategories(data);
        },
        (err) => {
          console.error("Categories subscription error:", err);
        }
      );
    };

    const subServices = () => {
      if (!active) return;
      unsubServices = dbStudioServices.subscribe(
        (data) => {
          if (active) setStudioServices(data);
        },
        (err) => {
          console.error("Services subscription error:", err);
        }
      );
    };

    const subPackages = () => {
      if (!active) return;
      unsubPackages = dbStudioPackages.subscribe(
        (data) => {
          if (active) setStudioPackages(data);
        },
        (err) => {
          console.error("Packages subscription error:", err);
        }
      );
    };

    // Initialize all subscriptions
    subCustomers();
    subBookings();
    subInvoices();
    subExpenses();
    subInventory();
    subEmployees();
    subTeams();
    subCalendar();
    subInquiries();
    subQuotations();
    subOrders();
    subPayments();
    subCategories();
    subServices();
    subPackages();

    // Cleanup subscriptions on unmount
    return () => {
      active = false;
      if (unsubCustomers) unsubCustomers();
      if (unsubBookings) unsubBookings();
      if (unsubInvoices) unsubInvoices();
      if (unsubExpenses) unsubExpenses();
      if (unsubInventory) unsubInventory();
      if (unsubEmployees) unsubEmployees();
      if (unsubTeams) unsubTeams();
      if (unsubCalendar) unsubCalendar();
      if (unsubInquiries) unsubInquiries();
      if (unsubQuotations) unsubQuotations();
      if (unsubOrders) unsubOrders();
      if (unsubPayments) unsubPayments();
      if (unsubCategories) unsubCategories();
      if (unsubServices) unsubServices();
      if (unsubPackages) unsubPackages();
    };
  }, [user, studioId]);

  // Shortcut triggers
  const handleBookForCustomer = (customer: Customer) => {
    setPreselectedCustomer(customer);
    setActiveTab('bookings');
  };

  const handleGenerateInvoice = (booking: Booking) => {
    setPreselectedBooking(booking);
    setActiveTab('invoices');
  };

  const handleSignOut = () => {
    setWorkspaceError(null);
    setStudioId(null);
    signOut(auth).catch(err => console.error("Error signing out:", err));
  };

  if (!isConfigValid) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0f1d] p-6 text-center relative overflow-hidden">
        {/* Decorative ambient background lights */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full bg-white p-8 rounded-[28px] shadow-2xl border border-slate-100 space-y-5 relative z-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Settings className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Firebase Configuration Missing
          </h2>
          <p className="text-sm text-[#64748b] leading-relaxed">
            The Firebase project configuration is missing, incomplete, or contains placeholder/invalid credentials.
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-left text-slate-600 font-mono space-y-1">
            <p className="font-semibold text-rose-600 mb-1">Required setup:</p>
            <p>1. Open <code className="px-1 py-0.5 rounded bg-white border border-slate-200 font-bold">firebase-applet-config.json</code></p>
            <p>2. Verify apiKey starts with "AIzaSy"</p>
            <p>3. Verify appId starts with "1:"</p>
            <p>4. Verify projectId, authDomain, storageBucket are set</p>
          </div>
          <p className="text-xs text-slate-400">
            Please run the setup or fill in your valid credentials to enable Authentication and Database services safely.
          </p>
        </div>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0f1d] p-6 text-center relative overflow-hidden">
        {/* Decorative ambient background lights */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full bg-white p-8 rounded-[28px] shadow-2xl border border-slate-100 space-y-5 relative z-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Settings className="h-7 w-7 animate-bounce" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight text-rose-600">
            Workspace Initialization Failed
          </h2>
          <p className="text-sm text-[#64748b] leading-relaxed">
            {workspaceError}
          </p>
          <div className="pt-2">
            <button
              onClick={handleSignOut}
              className="w-full inline-flex justify-center items-center px-5 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              Sign Out & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || (user && !studioId && !isRegistering)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0f1d] font-sans">
        <div className="text-center space-y-4 flex flex-col items-center">
          <div className="flex items-center justify-center w-28 h-28 p-2 bg-black rounded-2xl border border-slate-800 shadow-2xl overflow-hidden shrink-0">
            <img 
              src={activeAppLogo} 
              alt="LensMaster Application Logo" 
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultAppLogo;
              }}
            />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB] mx-auto mt-2" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Initializing secure workspace...</p>
        </div>
      </div>
    );
  }

  // Not logged in OR in process of registration -> Render login/register screen
  if (!user || isRegistering) {
    return <AuthScreen onRegisterStatusChange={setIsRegistering} isAdminMode={isAdminPath} />;
  }

  // Access Denied if regular user tries to access /admin
  if (isAdminPath && studioId && studioId !== 'admin') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0f1d] p-4 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-[460px] rounded-[28px] bg-white p-8 md:p-10 shadow-2xl relative z-10 text-center space-y-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto">
            <ShieldCheck className="h-10 w-10 stroke-[2.25]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
              Access Denied
            </h1>
            <p className="text-slate-500 text-sm">
              Your account does not have administrative privileges required to access the Administrative Portal.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-1.5">
            <div className="text-xs font-semibold text-slate-400">LOGGED IN AS</div>
            <div className="text-sm font-bold text-slate-800 truncate">{user?.email}</div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                window.location.hash = '#/';
              }}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl transition text-sm"
            >
              Return to Studio Workspace
            </button>
            <button
              onClick={handleSignOut}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-bold py-3 px-4 rounded-xl transition text-sm"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Portal Redirect
  if (studioId === 'admin') {
    return (
      <AdminDashboard 
        currentAdminRole={adminRole || 'super_admin'} 
        onSignOut={handleSignOut} 
      />
    );
  }

  // Logged in -> Render Main Workspace Sidebar frame
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'services', label: 'Services & Packages', icon: Layers },
    { id: 'employee_management', label: 'Employee Management', icon: UserCheck },
    { id: 'inquiries', label: 'Inquiries & Leads', icon: HelpCircle },
    { id: 'quotations', label: 'Quotation Builder', icon: Send },
    { id: 'work_orders', label: 'Work Orders', icon: Briefcase },
    { id: 'customers', label: 'CRM Clients', icon: Users },
    { id: 'bookings', label: 'Bookings & Jobs', icon: Calendar },
    { id: 'calendar', label: 'Event Calendar', icon: Calendar },
    { id: 'invoices', label: 'Invoices & Bills', icon: FileText },
    { id: 'expenses', label: 'Expenses Register', icon: DollarSign },
    { id: 'settings', label: 'Business Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 p-4 px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          {studioProfile?.studioLogo ? (
            <img 
              src={studioProfile.studioLogo} 
              alt="Logo" 
              referrerPolicy="no-referrer"
              className="h-6 w-6 rounded-lg object-cover" 
            />
          ) : (
            <Camera className="h-6 w-6 text-[#2563EB]" />
          )}
          <span className="font-extrabold text-gray-900 tracking-tight text-base font-display">
            {studioProfile?.businessName || studioProfile?.studioName || 'Studio'}
          </span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-500 hover:text-gray-800 p-1 bg-gray-50 rounded-lg"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Main Navigation Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0F172A] border-r border-slate-800/60 p-6 flex flex-col justify-between shrink-0 transform transition-transform duration-300 md:translate-x-0 md:static
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Upper brand */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            {studioProfile?.studioLogo ? (
              <img 
                src={studioProfile.studioLogo} 
                alt="Logo" 
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-xl object-cover border border-slate-700/50 shadow-md" 
              />
            ) : (
              <div className="rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#3B82F6] p-2.5 text-white shadow-md shadow-blue-500/20">
                <Camera className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-white tracking-tight text-sm font-display leading-tight truncate max-w-[140px]">
                {studioProfile?.businessName || studioProfile?.studioName || 'LensMaster'}
              </h2>
              <span className="inline-block px-1.5 py-0.5 bg-blue-500/10 text-[#3B82F6] text-[9px] font-bold uppercase tracking-wider rounded mt-0.5">
                Studio Suite
              </span>
            </div>
          </div>

          {/* Links list */}
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 group
                    ${isActive 
                      ? 'bg-[#2563EB] text-white font-semibold shadow-lg shadow-blue-600/25' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}
                  `}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="border-t border-slate-800/80 pt-5 space-y-4">
          <div className="flex items-center gap-3">
            {studioProfile?.studioLogo ? (
              <img 
                src={studioProfile.studioLogo} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover border border-slate-700" 
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-xs">
                {(studioProfile?.ownerName || user.email || 'O').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {studioProfile?.ownerName || 'Studio Owner'}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {studioProfile?.email || user.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800/40 border border-slate-800 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-150"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                customers={customers}
                bookings={bookings}
                invoices={invoices}
                expenses={expenses}
                inventory={inventory}
                inquiries={inquiries}
                quotations={quotations}
                teams={teams}
                employees={employees}
                setActiveTab={setActiveTab}
                studioName={studioProfile?.businessName || studioProfile?.studioName || 'Studio'}
                onQuickBooking={() => {
                  setPreselectedCustomer(null);
                  setActiveTab('bookings');
                }}
                onQuickCustomer={() => {
                  setActiveTab('customers');
                }}
              />
            )}

            {activeTab === 'services' && (
              <ServicesAndPackages
                services={studioServices}
                categories={serviceCategories}
                packages={studioPackages}
                studioProfile={studioProfile}
              />
            )}

            {activeTab === 'employee_management' && (
              <EmployeeManagement
                employees={employees}
                bookings={bookings}
                workOrders={orders}
                userRole={adminRole || 'owner'}
              />
            )}

            {activeTab === 'inquiries' && (
              <Inquiries
                inquiries={inquiries}
                onCreateQuotationFromInquiry={(inq) => {
                  setPreselectedInquiryForQuotation(inq);
                  setActiveTab('quotations');
                }}
              />
            )}

            {activeTab === 'quotations' && (
              <Quotations
                quotations={quotations}
                customers={customers}
                inquiries={inquiries}
                studioServices={studioServices}
                studioPackages={studioPackages}
                studioProfile={studioProfile}
                preselectedInquiry={preselectedInquiryForQuotation}
                onBookingConverted={() => setActiveTab('bookings')}
              />
            )}

            {activeTab === 'work_orders' && (
              <WorkOrders
                orders={orders}
              />
            )}

            {activeTab === 'customers' && (
              <Customers
                customers={customers}
                onBookForCustomer={handleBookForCustomer}
              />
            )}

            {activeTab === 'bookings' && (
              <Bookings
                bookings={bookings}
                customers={customers}
                employees={employees}
                teams={teams}
                preselectedCustomer={preselectedCustomer}
                clearPreselectedCustomer={() => setPreselectedCustomer(null)}
                onGenerateInvoice={handleGenerateInvoice}
              />
            )}

            {activeTab === 'teams' && (
              <TeamsAndEmployees
                employees={employees}
                teams={teams}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                bookings={bookings}
                teams={teams}
                employees={employees}
                calendarItems={calendarItems}
              />
            )}

            {activeTab === 'invoices' && (
              <Invoices
                invoices={invoices}
                bookings={bookings}
                customers={customers}
                preselectedBooking={preselectedBooking}
                clearPreselectedBooking={() => setPreselectedBooking(null)}
                studioProfile={studioProfile}
                studioSettings={studioSettings}
              />
            )}

            {activeTab === 'expenses' && (
              <Expenses
                expenses={expenses}
                inventory={inventory}
              />
            )}

            {activeTab === 'settings' && (
              <BusinessSettings
                studioId={studioId || ''}
                studioProfile={studioProfile}
                studioSettings={studioSettings}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
