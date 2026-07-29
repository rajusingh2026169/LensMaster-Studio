import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users2, 
  ShieldCheck, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  UserX, 
  Trash2, 
  Sparkles, 
  KeyRound, 
  Activity,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Mail,
  Phone,
  MapPin,
  RotateCcw,
  FileText,
  Layers,
  Settings,
  ShieldAlert,
  Save,
  X,
  UserPlus,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbAdmin } from '../services/dbService';
import { sendPasswordResetEmail, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firebaseConfig } from '../firebase';
import { initializeApp, getApps } from 'firebase/app';

interface AdminDashboardProps {
  currentAdminRole: 'admin' | 'super_admin';
  onSignOut: () => void;
}

export default function AdminDashboard({ currentAdminRole, onSignOut }: AdminDashboardProps) {
  const [studios, setStudios] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'studios' | 'users' | 'tools' | 'logs'>('studios');
  
  // Search and filter states
  const [studioSearch, setStudioSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [logFilter, setLogFilter] = useState<string>('all');

  // Status alerts
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Modals / Form states
  const [showAddStudio, setShowAddStudio] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingStudio, setEditingStudio] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  // Delete Options Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{
    show: boolean;
    type: 'studio' | 'user';
    id: string;
    name: string;
    deleteMode: 'firestore' | 'auth' | 'both';
  } | null>(null);

  // New Studio form state
  const [newStudio, setNewStudio] = useState({
    id: '',
    businessName: '',
    ownerName: '',
    email: '',
    mobileNumber: '',
    address: '',
    plan: 'Free Trial',
    status: 'active' as 'active' | 'suspended'
  });

  // New User form state
  const [newUser, setNewUser] = useState({
    uid: '',
    email: '',
    password: '',
    ownerName: '',
    role: 'owner',
    studioId: '',
    createAuth: true
  });

  // Emergency Repair States
  const [relinkForm, setRelinkForm] = useState({
    uid: '',
    email: '',
    studioId: '',
    role: 'owner',
    ownerName: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const isSuper = currentAdminRole === 'super_admin';

  const loadAllData = async () => {
    setLoading(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      console.log("Loading Admin Panel Data...");
      const sList = await dbAdmin.getAllStudios();
      const uList = await dbAdmin.getAllUsers();
      const lList = await dbAdmin.getAdminLogs();
      
      setStudios(sList);
      setUsers(uList);
      setLogs(lList);
      console.log("Admin Panel Loaded Successfully!");
    } catch (err: any) {
      console.error("Admin Panel Data Load Failed:", err);
      setFormError(`Failed to load admin documents: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleStatus = async (studioId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      setSubmitting(true);
      await dbAdmin.updateStudioStatus(studioId, newStatus);
      setFormSuccess(`Studio ${studioId} set to ${newStatus}`);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to change status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    const targetStudioId = newStudio.id.trim() || 'std_' + Math.random().toString(36).substring(2, 11);

    try {
      await dbAdmin.createStudioManually(
        targetStudioId,
        newStudio.businessName,
        newStudio.ownerName,
        newStudio.email.trim().toLowerCase(),
        newStudio.mobileNumber,
        newStudio.address,
        newStudio.plan,
        newStudio.status
      );

      setFormSuccess(`Studio '${newStudio.businessName}' successfully created with ID: ${targetStudioId}`);
      setShowAddStudio(false);
      setNewStudio({
        id: '',
        businessName: '',
        ownerName: '',
        email: '',
        mobileNumber: '',
        address: '',
        plan: 'Free Trial',
        status: 'active'
      });
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to manually create studio: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      await dbAdmin.updateStudioDetails(editingStudio.id, {
        businessName: editingStudio.businessName,
        ownerName: editingStudio.ownerName,
        email: editingStudio.email,
        mobileNumber: editingStudio.mobileNumber,
        address: editingStudio.address,
        plan: editingStudio.plan,
        status: editingStudio.status,
        isPremium: editingStudio.plan.toLowerCase().includes('premium') || editingStudio.plan.toLowerCase().includes('enterprise')
      });

      setFormSuccess(`Studio '${editingStudio.businessName}' details updated successfully.`);
      setEditingStudio(null);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to update studio: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      let finalUid = newUser.uid.trim();

      if (newUser.createAuth) {
        if (!newUser.password || newUser.password.length < 6) {
          throw new Error("A strong password (at least 6 characters) is required to register an Auth user.");
        }
        // Initialize secondary app safely to prevent active admin logout
        const secApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
        const secondaryAuth = getAuth(secApp);
        
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, newUser.email.trim().toLowerCase(), newUser.password);
        finalUid = userCred.user.uid;
      }

      if (!finalUid) {
        throw new Error("Either provide an existing Authentication UID or choose 'Create Firebase Auth Account' to generate one.");
      }

      await dbAdmin.createUserManually(
        finalUid,
        newUser.email.trim().toLowerCase(),
        newUser.ownerName,
        newUser.role,
        newUser.studioId
      );

      setFormSuccess(`User account for '${newUser.ownerName}' created successfully. UID: ${finalUid}`);
      setShowAddUser(false);
      setNewUser({
        uid: '',
        email: '',
        password: '',
        ownerName: '',
        role: 'owner',
        studioId: '',
        createAuth: true
      });
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to create user: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      await dbAdmin.updateUserDetails(editingUser.id, {
        ownerName: editingUser.ownerName,
        email: editingUser.email.trim().toLowerCase(),
        role: editingUser.role,
        studioId: editingUser.studioId
      });

      setFormSuccess(`User details for '${editingUser.ownerName}' updated successfully.`);
      setEditingUser(null);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to update user: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      if (!relinkForm.uid || !relinkForm.email) {
        throw new Error("UID and Email address are required to repair link.");
      }
      await dbAdmin.createUserManually(
        relinkForm.uid.trim(),
        relinkForm.email.trim().toLowerCase(),
        relinkForm.ownerName || 'Studio Owner',
        relinkForm.role,
        relinkForm.studioId
      );
      setFormSuccess(`Successfully repair-linked user profile with Firestore for UID: ${relinkForm.uid}`);
      setRelinkForm({
        uid: '',
        email: '',
        studioId: '',
        role: 'owner',
        ownerName: ''
      });
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to repair link: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrigger = (type: 'studio' | 'user', id: string, name: string) => {
    if (!isSuper) {
      setFormError("Only Super Admin has permissions to delete system records.");
      return;
    }
    setDeleteDialog({
      show: true,
      type,
      id,
      name,
      deleteMode: 'firestore'
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteDialog) return;
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      if (deleteDialog.type === 'studio') {
        if (deleteDialog.deleteMode === 'firestore' || deleteDialog.deleteMode === 'both') {
          await dbAdmin.deleteStudio(deleteDialog.id);
          setFormSuccess(`Studio records deleted from Firestore for ID: ${deleteDialog.id}`);
        }
        if (deleteDialog.deleteMode === 'auth' || deleteDialog.deleteMode === 'both') {
          // Instruct how to delete or note that client SDK requires admin credentials/Console for arbitrary user deletion
          await dbAdmin.logAction('STUDIO_AUTH_CLEANUP_REQUESTED', `Authentication cleanup flagged for studio ${deleteDialog.id}`);
          setFormSuccess(prev => (prev ? prev + " | " : "") + `Auth record deletion requested. Please use Firebase console deep-link for full completion.`);
        }
      } else {
        if (deleteDialog.deleteMode === 'firestore' || deleteDialog.deleteMode === 'both') {
          await dbAdmin.deleteUser(deleteDialog.id);
          setFormSuccess(`User document deleted from Firestore for UID: ${deleteDialog.id}`);
        }
        if (deleteDialog.deleteMode === 'auth' || deleteDialog.deleteMode === 'both') {
          await dbAdmin.logAction('USER_AUTH_CLEANUP_REQUESTED', `Authentication deletion flagged for user UID: ${deleteDialog.id}`);
          setFormSuccess(prev => (prev ? prev + " | " : "") + `Auth cleanup flagged. Please use the Authentication panel deep link if necessary.`);
        }
      }

      setDeleteDialog(null);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to execute delete: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setFormError(null);
    setFormSuccess(null);
    if (!email) return;
    try {
      setSubmitting(true);
      await sendPasswordResetEmail(auth, email);
      setFormSuccess(`Official password reset link successfully dispatched to ${email}!`);
      await dbAdmin.logAction('PASSWORD_RESET_DISPATCHED', `Reset email triggered for user ${email}`);
    } catch (err: any) {
      setFormError(`Failed to trigger reset: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepairSubcollections = async (studioId: string) => {
    try {
      setSubmitting(true);
      await dbAdmin.repairMissingSubcollections(studioId);
      setFormSuccess(`Subcollections (customers, bookings, expenses, inventory) initialized successfully for Studio: ${studioId}`);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to repair subcollections: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncRecords = async () => {
    try {
      setSubmitting(true);
      const res = await dbAdmin.syncUserAndStudioRecords();
      setFormSuccess(`Sync Completed successfully! Verified and synchronized ${res.syncedCount} subcollection members.`);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to run record sync: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCleanOrphans = async () => {
    if (!confirm("Are you sure you want to clean up orphaned user records?")) return;
    try {
      setSubmitting(true);
      const res = await dbAdmin.deleteOrphanDocuments();
      setFormSuccess(`Orphans cleaned! Removed ${res.deletedUsers} orphaned user documents.`);
      await loadAllData();
    } catch (err: any) {
      setFormError(`Failed to clean orphans: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredStudios = studios.filter(s => {
    const term = studioSearch.toLowerCase();
    return (
      (s.businessName || '').toLowerCase().includes(term) ||
      (s.ownerName || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term)
    );
  });

  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(term) ||
      (u.ownerName || '').toLowerCase().includes(term) ||
      u.uid.toLowerCase().includes(term) ||
      (u.studioId || '').toLowerCase().includes(term)
    );
  });

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'errors') return log.actionType?.toLowerCase().includes('error') || log.message?.toLowerCase().includes('fail');
    if (logFilter === 'auth') return log.actionType?.toLowerCase().includes('auth') || log.actionType?.toLowerCase().includes('user');
    if (logFilter === 'studio') return log.actionType?.toLowerCase().includes('studio');
    return true;
  });

  const activeStudiosCount = studios.filter(s => s.status !== 'suspended').length;
  const suspendedStudiosCount = studios.filter(s => s.status === 'suspended').length;
  
  const totalSubRevenue = studios.reduce((acc, curr) => {
    const isPremium = curr.isPremium || curr.plan?.toLowerCase().includes('premium') || curr.plan?.toLowerCase().includes('enterprise');
    return acc + (isPremium ? 12000 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans selection:bg-orange-500/30 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0c1222] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20 text-white">
            <ShieldCheck className="h-6 w-6 stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              LensMaster Studio
            </h1>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <Activity className="h-3 w-3 animate-pulse" />
              {isSuper ? 'Super Admin Control Center' : 'Admin Operations Control'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition border border-slate-700/50 disabled:opacity-50"
            title="Refresh DB Snapshot"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="h-8 w-px bg-slate-800" />

          <button
            onClick={onSignOut}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white px-4 py-2 text-xs font-bold text-rose-400 transition"
          >
            Exit Workspace
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Loading Indicator or Alerts */}
        {formError && (
          <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 shadow-sm" id="admin-error-alert">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <span className="font-bold">Error Occurred:</span> {formError}
            </div>
          </div>
        )}
        
        {formSuccess && (
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 shadow-sm" id="admin-success-alert">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <span className="font-bold">Operation Completed:</span> {formSuccess}
            </div>
          </div>
        )}

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0c1222] border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-blue-500/10 text-blue-400 p-3.5 rounded-xl border border-blue-500/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Studios</p>
              <p className="text-2xl font-black text-white mt-1">{studios.length}</p>
            </div>
          </div>

          <div className="bg-[#0c1222] border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-emerald-500/10 text-emerald-400 p-3.5 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Studios</p>
              <p className="text-2xl font-black text-white mt-1">{activeStudiosCount}</p>
            </div>
          </div>

          <div className="bg-[#0c1222] border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-rose-500/10 text-rose-400 p-3.5 rounded-xl border border-rose-500/20">
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Suspended Studios</p>
              <p className="text-2xl font-black text-white mt-1">{suspendedStudiosCount}</p>
            </div>
          </div>

          <div className="bg-[#0c1222] border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-orange-500/10 text-orange-400 p-3.5 rounded-xl border border-orange-500/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estimated Revenue</p>
              <p className="text-2xl font-black text-white mt-1">₹{totalSubRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('studios')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
              activeTab === 'studios' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Studio Management ({filteredStudios.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
              activeTab === 'users' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            User Accounts ({filteredUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
              activeTab === 'tools' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Emergency & Recovery
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
              activeTab === 'logs' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Action Audit Logs ({filteredLogs.length})
          </button>
        </div>

        {/* Workspace Display Area */}
        <div className="bg-[#0c1222] border border-slate-800/80 rounded-[24px] shadow-2xl p-4 sm:p-6 min-h-[450px]">
          {loading ? (
            <div className="flex h-[350px] items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Synchronizing live records from cloud database...</p>
              </div>
            </div>
          ) : (
            <>
              {/* STUDIO MANAGEMENT TAB */}
              {activeTab === 'studios' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:max-w-md">
                      <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter studios by name, email or ID..."
                        value={studioSearch}
                        onChange={(e) => setStudioSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#070b13] px-4 py-3 pl-11 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-700 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowAddStudio(true)}
                      className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 active:scale-95 transition text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/15"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Studio Manually
                    </button>
                  </div>

                  {/* Studio Records Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#070b13]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[#0c1222] border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="p-4 px-6">Studio Info</th>
                          <th className="p-4">Owner Contact</th>
                          <th className="p-4">Subscription Plan</th>
                          <th className="p-4">Workspace Status</th>
                          <th className="p-4 text-right px-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {filteredStudios.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-500">
                              No studio directories found matching filters.
                            </td>
                          </tr>
                        ) : (
                          filteredStudios.map((s) => {
                            const isSuspended = s.status === 'suspended';
                            const isPrem = s.isPremium || s.plan?.toLowerCase().includes('premium') || s.plan?.toLowerCase().includes('enterprise');
                            return (
                              <tr key={s.id} className="hover:bg-slate-800/20 group">
                                <td className="p-4 px-6">
                                  <p className="font-extrabold text-white group-hover:text-orange-400 transition">{s.businessName || 'No Name Studio'}</p>
                                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {s.id}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-semibold text-slate-300">{s.ownerName || 'N/A'}</p>
                                  <p className="text-xs text-slate-500">{s.email || ''}</p>
                                  {s.mobileNumber && <p className="text-xs text-slate-500 font-mono">{s.mobileNumber}</p>}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    isPrem ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700/20'
                                  }`}>
                                    {isPrem ? '⭐ Premium' : 'Free Trial'}
                                  </span>
                                  <p className="text-[11px] text-slate-500 mt-1 font-mono">{s.plan || 'Free Plan'}</p>
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    isSuspended ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {isSuspended ? 'Suspended' : 'Active'}
                                  </span>
                                </td>
                                <td className="p-4 text-right px-6 space-x-2">
                                  {/* Quick Repair */}
                                  <button
                                    onClick={() => handleRepairSubcollections(s.id)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition"
                                    title="Repair missing subcollections"
                                  >
                                    Repair Workspace
                                  </button>

                                  {/* Toggle Status */}
                                  <button
                                    onClick={() => handleToggleStatus(s.id, s.status)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                      isSuspended ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-white'
                                    }`}
                                  >
                                    {isSuspended ? 'Activate' : 'Suspend'}
                                  </button>

                                  {/* Edit Details */}
                                  <button
                                    onClick={() => setEditingStudio(s)}
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                    title="Edit Studio Profile"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>

                                  {/* Delete Dialog trigger */}
                                  <button
                                    onClick={() => handleDeleteTrigger('studio', s.id, s.businessName || s.id)}
                                    disabled={!isSuper}
                                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition disabled:opacity-30 disabled:hover:bg-rose-500/10 disabled:hover:text-rose-400"
                                    title="Delete Studio Record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* USER MANAGEMENT TAB */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:max-w-md">
                      <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search users by email, name or UID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#070b13] px-4 py-3 pl-11 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-700 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowAddUser(true)}
                      className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 active:scale-95 transition text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/15"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add User Manually
                    </button>
                  </div>

                  {/* Users Records Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#070b13]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[#0c1222] border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="p-4 px-6">User / Profile</th>
                          <th className="p-4">Authentication UID</th>
                          <th className="p-4">Studio Association</th>
                          <th className="p-4">Access Role</th>
                          <th className="p-4 text-right px-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-500">
                              No user profiles registered.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSystemAdmin = u.role === 'admin' || u.role === 'super_admin';
                            return (
                              <tr key={u.uid || u.id} className="hover:bg-slate-800/20 group">
                                <td className="p-4 px-6">
                                  <p className="font-extrabold text-white group-hover:text-orange-400 transition">{u.ownerName || 'User Account'}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                                </td>
                                <td className="p-4 font-mono text-xs text-slate-400">
                                  {u.uid || u.id}
                                </td>
                                <td className="p-4 font-mono text-xs text-slate-400">
                                  {u.studioId ? (
                                    <span className="text-slate-300 hover:underline">{u.studioId}</span>
                                  ) : (
                                    <span className="text-amber-500 font-bold">⚠️ Unlinked</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    isSystemAdmin ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400 border border-slate-800'
                                  }`}>
                                    {u.role || 'owner'}
                                  </span>
                                </td>
                                <td className="p-4 text-right px-6 space-x-2">
                                  {/* Reset Password */}
                                  <button
                                    onClick={() => handleResetPassword(u.email)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    title="Dispatches official password reset email"
                                  >
                                    Reset Password
                                  </button>

                                  {/* Edit Details */}
                                  <button
                                    onClick={() => setEditingUser({ id: u.id || u.uid, ...u })}
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                    title="Edit User Profile details"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>

                                  {/* Delete trigger */}
                                  <button
                                    onClick={() => handleDeleteTrigger('user', u.id || u.uid, u.ownerName || u.email)}
                                    disabled={!isSuper}
                                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition disabled:opacity-30 disabled:hover:bg-rose-500/10 disabled:hover:text-rose-400"
                                    title="Delete User Records"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EMERGENCY & RECOVERY ACTIONS TAB */}
              {activeTab === 'tools' && (
                <div className="space-y-6">
                  <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex gap-3.5 items-start">
                    <ShieldAlert className="h-6 w-6 text-amber-500 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-extrabold text-amber-400 text-sm">Emergency System Recovery & Diagnostics</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        These tools bypass normal client operations to directly examine, audit, rebuild, and link backend documents. Use these actions to repair customer registration failures, fix broken user profile mappings, or align structural schemas. Only execute during active troubleshooting.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Action Cards Panel */}
                    <div className="lg:col-span-2 space-y-4">
                      <p className="font-extrabold text-white text-base">Quick Maintenance Audits</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Sync records */}
                        <div className="border border-slate-800 bg-[#070b13] p-5 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                          <div className="space-y-1.5">
                            <p className="font-bold text-white text-sm">Sync User & Studio Records</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Crawls through all existing users and ensures that their respective tenant-subcollection documents inside studios/{'{id}'}/users have valid relational sync.
                            </p>
                          </div>
                          <button
                            onClick={handleSyncRecords}
                            disabled={submitting}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 text-xs rounded-lg border border-slate-700"
                          >
                            Synchronize Relational Records
                          </button>
                        </div>

                        {/* Clean Orphans */}
                        <div className="border border-slate-800 bg-[#070b13] p-5 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                          <div className="space-y-1.5">
                            <p className="font-bold text-white text-sm">Prune Orphan Documents</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Scans the Firestore database for user profile records that reference deleted or missing studio profiles and cleans them up to restore indices.
                            </p>
                          </div>
                          <button
                            onClick={handleCleanOrphans}
                            disabled={submitting}
                            className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold py-2 px-3 text-xs rounded-lg transition"
                          >
                            Delete Orphan Profiles
                          </button>
                        </div>

                        {/* Create Demo Studio */}
                        <div className="border border-slate-800 bg-[#070b13] p-5 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-700 transition sm:col-span-2">
                          <div className="space-y-1.5">
                            <p className="font-bold text-white text-sm">Provision Workspace Diagnostics Link</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Need to verify Firebase integration directly? Generating a diagnostics demo studio automatically sets up correct subcollection constraints so you can test if security rules and reads function perfectly under real workloads.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  setSubmitting(true);
                                  const dId = await dbAdmin.createDemoStudio("Diagnostics Lens Studio", "Diagnostics Operator", "diagnostics@lensmaster.com");
                                  setFormSuccess(`Diagnostics Demo workspace populated successfully under ID: ${dId}`);
                                  await loadAllData();
                                } catch (e: any) {
                                  setFormError(`Failed: ${e.message}`);
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                              disabled={submitting}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 text-xs rounded-lg shadow-md transition"
                            >
                              Seed Diagnostics Demo Workspace
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Re-link UID manual mapper */}
                    <div className="border border-slate-800 bg-[#070b13] p-5 rounded-2xl space-y-4">
                      <div className="space-y-1">
                        <p className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-orange-500" />
                          Repair Auth UID Mapping
                        </p>
                        <p className="text-3xs text-slate-400">
                          If a customer registration process fails midway, use this form to link an existing Authentication UID to a newly created or reconstructed Studio Firestore document.
                        </p>
                      </div>

                      <form onSubmit={handleRelinkUser} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-slate-400 text-3xs font-bold mb-1">Firebase Authentication UID</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. AIzaSy..."
                            value={relinkForm.uid}
                            onChange={(e) => setRelinkForm({...relinkForm, uid: e.target.value})}
                            className="w-full rounded-lg border border-slate-800 bg-[#0c1222] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-3xs font-bold mb-1">User Email</label>
                          <input
                            type="email"
                            required
                            placeholder="owner@email.com"
                            value={relinkForm.email}
                            onChange={(e) => setRelinkForm({...relinkForm, email: e.target.value})}
                            className="w-full rounded-lg border border-slate-800 bg-[#0c1222] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-3xs font-bold mb-1">Full Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={relinkForm.ownerName}
                            onChange={(e) => setRelinkForm({...relinkForm, ownerName: e.target.value})}
                            className="w-full rounded-lg border border-slate-800 bg-[#0c1222] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 text-3xs font-bold mb-1">Role</label>
                            <select
                              value={relinkForm.role}
                              onChange={(e) => setRelinkForm({...relinkForm, role: e.target.value})}
                              className="w-full rounded-lg border border-slate-800 bg-[#0c1222] px-3 py-2 text-xs text-white"
                            >
                              <option value="owner">owner</option>
                              <option value="staff">staff</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 text-3xs font-bold mb-1">Studio ID</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. std_..."
                              value={relinkForm.studioId}
                              onChange={(e) => setRelinkForm({...relinkForm, studioId: e.target.value})}
                              className="w-full rounded-lg border border-slate-800 bg-[#0c1222] px-3.5 py-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-[#f97316] hover:bg-orange-600 transition font-bold py-2 text-xs rounded-xl flex items-center justify-center gap-1 mt-4"
                        >
                          Repair Connection Mapping
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION AUDIT LOGS TAB */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-orange-500 animate-pulse" />
                      Visualizing active platform operations & Firestore updates
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        className="rounded-xl border border-slate-800 bg-[#070b13] px-3.5 py-2 text-xs text-slate-200"
                      >
                        <option value="all">All Logs</option>
                        <option value="errors">Error Logs Only</option>
                        <option value="auth">Auth & User Events</option>
                        <option value="studio">Studio Directory Updates</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl bg-[#070b13] max-h-[500px] overflow-y-auto font-mono text-xs">
                    {filteredLogs.length === 0 ? (
                      <p className="p-12 text-center text-slate-500">No matching operations log found in the registry.</p>
                    ) : (
                      <div className="divide-y divide-slate-800/40">
                        {filteredLogs.map((log) => {
                          const isErr = log.actionType?.toLowerCase().includes('error') || log.message?.toLowerCase().includes('fail');
                          return (
                            <div key={log.id} className="p-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-800/10 gap-2">
                              <div className="space-y-1">
                                <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                                  isErr ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                }`}>
                                  {log.actionType}
                                </span>
                                <p className="text-slate-300 font-medium text-xs pt-1">{log.message}</p>
                              </div>
                              <div className="text-right text-[10px] text-slate-500 font-mono">
                                <p>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</p>
                                <p className="text-slate-600 font-bold">{log.adminEmail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* =========================================================================
                                     MODALS & FORMS OVERLAYS 
         ========================================================================= */}
      
      <AnimatePresence>
        {/* ADD MANUALLY STUDIO MODAL */}
        {showAddStudio && (
          <div className="fixed inset-0 bg-[#04060b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c1222] border border-slate-800 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  Add New Studio Profile
                </div>
                <button onClick={() => setShowAddStudio(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStudio} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Custom Studio ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. std_vikas"
                      value={newStudio.id}
                      onChange={(e) => setNewStudio({...newStudio, id: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Business Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikas Studio"
                      value={newStudio.businessName}
                      onChange={(e) => setNewStudio({...newStudio, businessName: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Owner Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={newStudio.ownerName}
                      onChange={(e) => setNewStudio({...newStudio, ownerName: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Owner Email</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@example.com"
                      value={newStudio.email}
                      onChange={(e) => setNewStudio({...newStudio, email: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+91 9999988888"
                      value={newStudio.mobileNumber}
                      onChange={(e) => setNewStudio({...newStudio, mobileNumber: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Assigned Plan</label>
                    <select
                      value={newStudio.plan}
                      onChange={(e) => setNewStudio({...newStudio, plan: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-2.5 py-2 text-xs text-white"
                    >
                      <option value="Free Trial">Free Trial (30 Days)</option>
                      <option value="Basic Monthly">Basic Monthly</option>
                      <option value="Premium Annual">Premium Annual</option>
                      <option value="Enterprise Tier">Enterprise Tier</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-3xs font-bold mb-1">Studio Address</label>
                  <textarea
                    placeholder="Physical studio address location details..."
                    value={newStudio.address}
                    onChange={(e) => setNewStudio({...newStudio, address: e.target.value})}
                    className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white h-16 resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStudio(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Create Studio Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* EDIT STUDIO DETAILS MODAL */}
        {editingStudio && (
          <div className="fixed inset-0 bg-[#04060b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c1222] border border-slate-800 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  Edit Studio Workspace Settings
                </div>
                <button onClick={() => setEditingStudio(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStudio} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Business Name</label>
                    <input
                      type="text"
                      required
                      value={editingStudio.businessName || ''}
                      onChange={(e) => setEditingStudio({...editingStudio, businessName: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Owner Name</label>
                    <input
                      type="text"
                      required
                      value={editingStudio.ownerName || ''}
                      onChange={(e) => setEditingStudio({...editingStudio, ownerName: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Owner Email</label>
                    <input
                      type="email"
                      required
                      value={editingStudio.email || ''}
                      onChange={(e) => setEditingStudio({...editingStudio, email: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={editingStudio.mobileNumber || ''}
                      onChange={(e) => setEditingStudio({...editingStudio, mobileNumber: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Assigned Plan</label>
                    <select
                      value={editingStudio.plan || 'Free Trial'}
                      onChange={(e) => setEditingStudio({...editingStudio, plan: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-2 py-2 text-xs text-white"
                    >
                      <option value="Free Trial">Free Trial</option>
                      <option value="Basic Monthly">Basic Monthly</option>
                      <option value="Premium Monthly">Premium Monthly</option>
                      <option value="Premium Annual">Premium Annual</option>
                      <option value="Enterprise Tier">Enterprise Tier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Workspace Status</label>
                    <select
                      value={editingStudio.status || 'active'}
                      onChange={(e) => setEditingStudio({...editingStudio, status: e.target.value as 'active' | 'suspended'})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-2 py-2 text-xs text-white"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-3xs font-bold mb-1">Address</label>
                  <textarea
                    value={editingStudio.address || ''}
                    onChange={(e) => setEditingStudio({...editingStudio, address: e.target.value})}
                    className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white h-16 resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudio(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Workspace Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ADD USER MANUAL MODAL */}
        {showAddUser && (
          <div className="fixed inset-0 bg-[#04060b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c1222] border border-slate-800 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                  <Users2 className="h-5 w-5 text-orange-500" />
                  Add User Account Manually
                </div>
                <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <input
                    type="checkbox"
                    id="createAuth"
                    checked={newUser.createAuth}
                    onChange={(e) => setNewUser({...newUser, createAuth: e.target.checked})}
                    className="h-4 w-4 text-orange-500 border-slate-800 bg-[#070b13] rounded"
                  />
                  <label htmlFor="createAuth" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                    Create Firebase Authentication account dynamically
                  </label>
                </div>

                {!newUser.createAuth && (
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Existing Authentication UID</label>
                    <input
                      type="text"
                      required={!newUser.createAuth}
                      placeholder="e.g. h8rK3v9..."
                      value={newUser.uid}
                      onChange={(e) => setNewUser({...newUser, uid: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Vikas Kumar"
                      value={newUser.ownerName}
                      onChange={(e) => setNewUser({...newUser, ownerName: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="vikas@studio.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {newUser.createAuth && (
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Set Password</label>
                    <input
                      type="password"
                      required={newUser.createAuth}
                      placeholder="Minimum 6 characters"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Assigned Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-2 py-2 text-xs text-white"
                    >
                      <option value="owner">owner (Primary Contact)</option>
                      <option value="staff">staff (Studio Associate)</option>
                      <option value="super_admin">super_admin (Portal Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Studio ID Link</label>
                    <input
                      type="text"
                      required={newUser.role !== 'super_admin'}
                      placeholder="e.g. std_vikas"
                      value={newUser.studioId}
                      onChange={(e) => setNewUser({...newUser, studioId: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Create User Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* EDIT USER PROFILE MODAL */}
        {editingUser && (
          <div className="fixed inset-0 bg-[#04060b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c1222] border border-slate-800 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                  <Users2 className="h-5 w-5 text-orange-500" />
                  Edit User Profile Details
                </div>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-3.5">
                <div>
                  <label className="block text-slate-300 text-3xs font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.ownerName || ''}
                    onChange={(e) => setEditingUser({...editingUser, ownerName: e.target.value})}
                    className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-3xs font-bold mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">System Role</label>
                    <select
                      value={editingUser.role || 'owner'}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-2 py-2 text-xs text-white"
                    >
                      <option value="owner">owner</option>
                      <option value="staff">staff</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-3xs font-bold mb-1">Studio ID</label>
                    <input
                      type="text"
                      required={editingUser.role !== 'super_admin'}
                      value={editingUser.studioId || ''}
                      onChange={(e) => setEditingUser({...editingUser, studioId: e.target.value})}
                      className="w-full rounded-lg border border-slate-800 bg-[#070b13] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save User Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* SYSTEM RECOVERY DELETE OPTION DIALOG */}
        {deleteDialog?.show && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-[#0c1222] border border-slate-800 rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-500 font-extrabold text-lg">
                <ShieldAlert className="h-6 w-6 stroke-[2.25]" />
                Dangerous System Operation
              </div>

              <div className="space-y-2 bg-[#070b13] p-4 rounded-2xl border border-slate-800 text-xs leading-relaxed text-slate-300">
                <p>You are about to delete records for: <span className="font-extrabold text-white">{deleteDialog.name}</span></p>
                <p className="text-3xs text-slate-500 font-mono">ID / UID: {deleteDialog.id}</p>
                <p className="font-semibold text-rose-400 mt-2">Specify granular deletion options below:</p>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-start gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="radio"
                    name="delete-options"
                    checked={deleteDialog.deleteMode === 'firestore'}
                    onChange={() => setDeleteDialog({...deleteDialog, deleteMode: 'firestore'})}
                    className="h-4.5 w-4.5 text-rose-600 border-slate-800 bg-[#070b13] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Delete Firestore Documents Only</p>
                    <p className="text-[11px] text-slate-400 leading-normal">Purges the user/studio Firestore documents safely. Authentication remains intact.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="radio"
                    name="delete-options"
                    checked={deleteDialog.deleteMode === 'auth'}
                    onChange={() => setDeleteDialog({...deleteDialog, deleteMode: 'auth'})}
                    className="h-4.5 w-4.5 text-rose-600 border-slate-800 bg-[#070b13] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Delete Authentication User Only</p>
                    <p className="text-[11px] text-slate-400 leading-normal">Flags Authentication records for cleanup deep-linking. Firestore documents are preserved.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="radio"
                    name="delete-options"
                    checked={deleteDialog.deleteMode === 'both'}
                    onChange={() => setDeleteDialog({...deleteDialog, deleteMode: 'both'})}
                    className="h-4.5 w-4.5 text-rose-600 border-slate-800 bg-[#070b13] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Delete Firestore AND Auth records together</p>
                    <p className="text-[11px] text-slate-400 leading-normal">Strict Zero-Trust purge. Cleans database schema and provides Auth cleanup indicators simultaneously.</p>
                  </div>
                </label>
              </div>

              {deleteDialog.deleteMode !== 'firestore' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed font-mono">
                  💡 Due to Client-SDK security limitations, full authentication deletion requires deep link execution:
                  <a 
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/users`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block font-bold underline text-orange-400 hover:text-orange-300 mt-1"
                  >
                    → Open Firebase Authentication Console
                  </a>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setDeleteDialog(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-600/15"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Confirm Permanent Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
