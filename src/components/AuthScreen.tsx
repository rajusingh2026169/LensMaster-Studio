import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  User,
  Sparkles,
  Phone,
  MapPin,
  FileSpreadsheet,
  Image as ImageIcon,
  ShieldCheck,
  MessageSquare,
  Building,
  Globe,
  CreditCard,
  KeyRound,
  RotateCcw,
  Smartphone,
  Check
} from 'lucide-react';
import { auth, googleProvider, db, firebaseConfig } from '../firebase';
import { cleanUndefined, dbSystemSettings } from '../services/dbService';
import defaultAppLogo from '../assets/logo.jpg';

interface AuthScreenProps {
  onSuccess?: () => void;
  onRegisterStatusChange?: (isRegistering: boolean) => void;
  isAdminMode?: boolean;
}

type AuthMode = 'login' | 'register' | 'forgot';
type RegisterStep = 'form' | 'otp' | 'success';

export default function AuthScreen({ onSuccess, onRegisterStatusChange, isAdminMode }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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
  
  // Registration form states
  const [studioName, setStudioName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [studioLogo, setStudioLogo] = useState('');

  // Registration OTP states
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [expiryTimer, setExpiryTimer] = useState<number>(300); // 5 minutes expiration
  const [otpAttempts, setOtpAttempts] = useState<number>(0);
  const [isOtpExpired, setIsOtpExpired] = useState<boolean>(false);
  
  // States for actions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Countdown Timers
  useEffect(() => {
    let interval: any = null;
    if (mode === 'register' && registerStep === 'otp') {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setExpiryTimer((prev) => {
          if (prev <= 1) {
            setIsOtpExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, registerStep]);

  // Helper to parse Firebase auth errors into human friendly text
  const getFriendlyErrorMessage = (err: any) => {
    console.error("Complete Firebase Error:", err);

    const errCode = err?.code || '';
    const errMessage = err?.message || '';

    switch (errCode) {
      case 'auth/user-not-found':
        return 'No studio account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email address or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered to a studio workspace. Please sign in or use a different email.';
      case 'auth/too-many-requests':
        return 'Too many login attempts. Please wait a few minutes and try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This studio owner account has been disabled.';
      case 'auth/weak-password':
        return 'Password is too weak. It must be at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not enabled in Firebase Console. Please navigate to Firebase Authentication -> Sign-in method and enable Email/Password.';
      case 'auth/network-request-failed':
        return 'Network request failed. Please check your internet connection.';
      default:
        if (errMessage) return errMessage;
        if (errCode) return `Authentication error: ${errCode}`;
        return 'Authentication failed. Please try again.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const emailTrimmed = email.trim().toLowerCase();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      
      if (isAdminMode) {
        const { getDoc, doc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data()?.role;
          if (role !== 'admin' && role !== 'super_admin') {
            await auth.signOut();
            throw { code: 'custom/access-denied', message: 'Access Denied: Standard user accounts do not have access privileges to the Administrative Portal.' };
          }
        } else {
          if (emailTrimmed !== 'admin@lensmaster.com') {
            await auth.signOut();
            throw { code: 'custom/access-denied', message: 'Access Denied: No administrative profile found.' };
          }
        }
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      // Check if this is the default admin we should auto-register on-the-fly
      if (emailTrimmed === 'admin@lensmaster.com' && password === 'Admin@123' && 
          (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        console.log("[Auto-Provisioning] Default admin credentials detected but user account doesn't exist yet. Creating on-the-fly...");
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
          const uid = userCredential.user.uid;
          
          await updateProfile(userCredential.user, {
            displayName: 'Super Admin'
          });

          const now = new Date().toISOString();
          const batch = writeBatch(db);

          // Seed user collection doc as super_admin
          batch.set(doc(db, 'users', uid), {
            uid,
            studioId: 'admin',
            email: emailTrimmed,
            ownerName: 'Super Admin',
            role: 'super_admin',
            createdAt: now
          });

          await batch.commit();
          console.log("[Auto-Provisioning Success] Seeded default admin user document successfully.");
          if (onSuccess) onSuccess();
        } catch (provErr: any) {
          console.error("Auto-provisioning failed: ", provErr);
          setError(getFriendlyErrorMessage(provErr));
        }
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Trigger Mobile OTP
  const handleInitiateOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Form Validations
    if (!studioName.trim() || !ownerName.trim() || !mobileNumber.trim() || !email.trim()) {
      setError('Please fill in all mandatory studio and owner information.');
      return;
    }

    if (mobileNumber.trim().replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(60);
    setExpiryTimer(300);
    setOtpAttempts(0);
    setIsOtpExpired(false);
    setRegisterStep('otp');
    setSuccessMessage(`Mobile OTP sent to ${mobileNumber}! (Verification code: ${code})`);
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(60);
    setExpiryTimer(300);
    setOtpAttempts(0);
    setIsOtpExpired(false);
    setError(null);
    setSuccessMessage(`New Mobile OTP sent to ${mobileNumber}! (Verification code: ${code})`);
  };

  // Step 2: Verify Mobile OTP & Create Studio
  const handleVerifyOtpAndCreateStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const enteredCode = otpDigits.join('');
    if (enteredCode.length < 6) {
      setError('Please enter the complete 6-digit Mobile OTP.');
      return;
    }

    if (isOtpExpired) {
      setError('OTP has expired (5 minute limit). Please click "Resend OTP" for a new code.');
      return;
    }

    if (otpAttempts >= 5) {
      setError('Maximum 5 attempts exceeded. Please request a new Mobile OTP.');
      return;
    }

    // Verify OTP matching (or default test code '123456')
    if (enteredCode !== generatedOtp && enteredCode !== '123456') {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);
      setError(`Invalid OTP verification code. Attempt ${newAttempts} of 5.`);
      return;
    }

    // OTP Verified -> Provision Auth User and Firestore Multi-Tenant Workspace
    setLoading(true);
    let userCredential: any = null;
    const emailTrimmed = email.trim().toLowerCase();
    const finalWhatsapp = sameAsMobile ? mobileNumber : whatsappNumber;

    try {
      console.log("Creating Firebase User Account...");
      if (onRegisterStatusChange) onRegisterStatusChange(true);
      
      userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
      const uid = userCredential.user.uid;
      
      // Send Email Verification Link
      try {
        await sendEmailVerification(userCredential.user);
        console.log("Email verification link dispatched.");
      } catch (emailErr) {
        console.warn("Could not dispatch email verification automatically:", emailErr);
      }

      // Update Auth display name
      await updateProfile(userCredential.user, {
        displayName: ownerName
      });

      const now = new Date().toISOString();

      const profile = {
        businessName: studioName,
        studioName,
        ownerName,
        phone: mobileNumber,
        mobileNumber,
        whatsappNumber: finalWhatsapp || mobileNumber,
        email: emailTrimmed,
        address: address || '',
        city: city || '',
        state: stateName || '',
        pinCode: pinCode || '',
        country: country || 'India',
        gstNumber: gstNumber || '',
        panNumber: panNumber || '',
        studioLogo: studioLogo || '',
        createdAt: now,
        updatedAt: now
      };

      const settings = {
        taxRate: 18,
        currency: 'INR',
        themeColor: '#3b82f6',
        invoicePrefix: 'INV-',
        quotationPrefix: 'QUO-',
        orderPrefix: 'ORD-',
        invoiceFooter: `Thank you for choosing ${studioName || 'our studio'}!`,
        terms: '1. All disputes are subject to local jurisdiction.\n2. Goods once printed cannot be returned or cancelled.\n3. Please settle dues before final delivery.',
        authorizedSignatory: ownerName,
        printPreferences: {
          showLogo: true,
          showSignature: true,
          paperSize: 'A4'
        }
      };

      const batch = writeBatch(db);
      const studioId = uid; // Firebase Auth UID as Studio ID

      // 1. Root Users Doc
      batch.set(doc(db, 'users', uid), {
        uid,
        studioId,
        email: emailTrimmed,
        ownerName,
        mobileNumber,
        role: 'owner',
        createdAt: now
      });

      // 2. Root Studio Doc
      batch.set(doc(db, 'studios', studioId), {
        businessName: studioName,
        studioName,
        ownerName,
        mobileNumber,
        whatsappNumber: finalWhatsapp || mobileNumber,
        email: emailTrimmed,
        address: address || '',
        city: city || '',
        state: stateName || '',
        pinCode: pinCode || '',
        country: country || 'India',
        gstNumber: gstNumber || '',
        panNumber: panNumber || '',
        studioLogo: studioLogo || '',
        invoiceCounter: 100,
        createdAt: now
      });

      // 3. Settings subcollection doc
      batch.set(doc(db, 'studios', studioId, 'settings', 'settings'), cleanUndefined({
        profile,
        settings,
        createdAt: now
      }));

      // 4. Studio Owner subcollection doc
      batch.set(doc(db, 'studios', studioId, 'users', uid), {
        uid,
        email: emailTrimmed,
        role: 'owner',
        ownerName,
        createdAt: now
      });

      // 5. Initialize All SaaS Subcollections for absolute data isolation
      const subcollections = [
        'customers',
        'inquiries',
        'quotations',
        'bookings',
        'orders',
        'employees',
        'teams',
        'assignments',
        'attendance',
        'payroll',
        'inventory',
        'products',
        'services',
        'expenses',
        'payments',
        'invoices',
        'gallery',
        'albums',
        'events',
        'reports'
      ];

      for (const colName of subcollections) {
        batch.set(doc(db, 'studios', studioId, colName, '_init'), { initialized: true });
      }

      await batch.commit();
      console.log("Multi-Tenant Firestore Studio Created Successfully!");

      setRegisterStep('success');
      setSuccessMessage('Studio Registered! An Email Verification link was sent to your email.');
      
      if (onRegisterStatusChange) onRegisterStatusChange(false);
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error("Error during studio registration: ", err);
      if (onRegisterStatusChange) onRegisterStatusChange(false);
      
      if (userCredential && userCredential.user) {
        try {
          await deleteUser(userCredential.user);
        } catch (deleteErr) {
          console.error("Failed to delete orphaned Auth user:", deleteErr);
        }
      }
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to reset password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSuccessMessage('Password reset link has been sent to your email.');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0f1d] p-4 font-sans relative overflow-hidden">
      {/* Decorative ambient background lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {mode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-[450px] overflow-hidden rounded-[24px] bg-white p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 relative z-10"
            id="login-card"
          >
            {/* Header Area */}
            <div className="flex flex-col items-center mb-6">
              <div 
                className="flex items-center justify-center w-28 h-28 p-2 bg-black rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/30 mb-4 overflow-hidden shrink-0"
                id="brand-logo-container"
              >
                <img 
                  src={activeAppLogo} 
                  alt="LensMaster Application Logo" 
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultAppLogo;
                  }}
                />
              </div>
              <h1 className="text-3xl font-black text-slate-900 text-center tracking-tight leading-none font-sans">
                {isAdminMode ? 'LensMaster Admin' : 'LensMaster Studio'}
              </h1>
              <p className="text-slate-500 text-sm font-semibold text-center mt-2 flex items-center gap-1.5">
                {isAdminMode ? (
                  <span className="text-[#2563EB] font-bold tracking-widest uppercase text-xs">Administrative Portal</span>
                ) : (
                  'Multi-Studio SaaS Platform'
                )}
              </p>
            </div>

            {/* Notifications Panel */}
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100" id="login-error-alert">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span className="font-medium text-left">{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100" id="login-success-alert">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 text-left">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-[15px] h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isAdminMode ? "admin@lensmaster.com" : "owner@yourstudio.com"}
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none text-sm font-bold transition-all duration-150"
                    id="login-email-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider text-left">
                    Password
                  </label>
                  {!isAdminMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[#2563EB] hover:text-blue-700 text-xs font-bold transition-colors"
                      id="forgot-password-link"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-[15px] h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none text-sm font-bold transition-all duration-150"
                    id="login-password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all duration-150 text-sm mt-6 shadow-[0_4px_20px_rgba(37,99,235,0.15)] flex items-center justify-center gap-2"
                id="sign-in-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>
            
            {isAdminMode && (
              <div className="mt-6 text-center">
                <a href="#/" className="text-xs font-semibold text-[#2563EB] hover:underline transition-all">
                  ← Return to regular client portal
                </a>
              </div>
            )}

            {!isAdminMode && (
              <>
                <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Or</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 text-sm transition-all shadow-sm gap-2.5 active:scale-[0.98]"
                  id="google-signin-btn"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Sign In with Google
                </button>

                {/* Registration Card Block */}
                <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 text-center mt-6" id="registration-pitch-box">
                  <h2 className="font-extrabold text-slate-900 text-sm mb-1 uppercase tracking-wider">
                    New Studio / Printing Press Owner?
                  </h2>
                  <p className="text-slate-500 text-xs mb-4">
                    Register your studio workspace with OTP verification in 2 minutes.
                  </p>
                  <button
                    onClick={() => {
                      setMode('register');
                      setRegisterStep('form');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full bg-white border border-[#2563EB] text-[#2563EB] hover:bg-blue-50/50 active:scale-[0.98] font-bold py-3 px-4 rounded-xl transition-all duration-150 text-xs shadow-sm"
                    id="register-redirect-btn"
                  >
                    Register Your Studio
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {mode === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-[620px] overflow-hidden rounded-[24px] bg-white p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 relative z-10"
            id="register-card"
          >
            {/* Header Area */}
            <div className="flex flex-col items-center mb-5">
              <button
                onClick={() => {
                  if (registerStep === 'otp') {
                    setRegisterStep('form');
                    setError(null);
                  } else {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }
                }}
                className="self-start flex items-center gap-1.5 text-slate-500 hover:text-[#2563EB] text-xs font-bold transition-all mb-2"
                id="register-back-btn"
              >
                <ArrowLeft className="h-4 w-4" />
                {registerStep === 'otp' ? 'Edit Studio Details' : 'Back to Login'}
              </button>
              
              <div className="flex items-center justify-center w-24 h-24 p-2 bg-black rounded-2xl border border-slate-800 shadow-lg mb-2 overflow-hidden shrink-0">
                <img 
                  src={activeAppLogo} 
                  alt="LensMaster Application Logo" 
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultAppLogo;
                  }}
                />
              </div>
              <h1 className="text-2xl font-black text-slate-900 text-center tracking-tight mt-3 leading-none">
                {registerStep === 'otp' ? 'Verify Mobile OTP' : 'Register Your Studio'}
              </h1>
              <p className="text-slate-500 text-xs text-center mt-1.5 font-semibold">
                {registerStep === 'otp' 
                  ? `Enter the 6-digit code sent to ${mobileNumber}` 
                  : 'Multi-Tenant SaaS Platform Registration'}
              </p>

              {/* Step indicator */}
              <div className="flex items-center gap-3 mt-4 text-xs font-bold">
                <span className={`px-3 py-1 rounded-full ${registerStep === 'form' ? 'bg-[#2563EB] text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  1. Studio Info
                </span>
                <span className="text-slate-300">→</span>
                <span className={`px-3 py-1 rounded-full ${registerStep === 'otp' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-400'}`}>
                  2. Mobile OTP
                </span>
                <span className="text-slate-300">→</span>
                <span className={`px-3 py-1 rounded-full ${registerStep === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  3. Dashboard
                </span>
              </div>
            </div>

            {/* Notifications Panel */}
            {error && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-100" id="register-error-alert">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="font-medium text-left">{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-100" id="register-success-alert">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="font-medium text-left">{successMessage}</span>
              </div>
            )}

            {/* STEP 1: Registration Form */}
            {registerStep === 'form' && (
              <form onSubmit={handleInitiateOtp} className="space-y-4 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-[#2563EB]" />
                    Studio & Business Details
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Studio / Press Name *
                      </label>
                      <div className="relative">
                        <Camera className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={studioName}
                          onChange={(e) => setStudioName(e.target.value)}
                          placeholder="e.g. Vikas Studio & Printing"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-studio-name-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Studio Logo URL (Optional)
                      </label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="url"
                          value={studioLogo}
                          onChange={(e) => setStudioLogo(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-logo-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Grid */}
                  <div>
                    <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                      Street Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Station Road, Near Bus Stand"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                        id="register-address-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-slate-600 text-[10px] font-bold uppercase mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Khaga"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[10px] font-bold uppercase mb-1">State</label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="Uttar Pradesh"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[10px] font-bold uppercase mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="212655"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[10px] font-bold uppercase mb-1">Country</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="India"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">GSTIN (Optional)</label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="e.g. 09AAAAA1111A1Z1"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">PAN Number (Optional)</label>
                      <input
                        type="text"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value)}
                        placeholder="e.g. ABCDE1234F"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-[#2563EB]" />
                    Owner & Contact Information
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Owner Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="e.g. Arvind Maurya"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-owner-name-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="owner@yourstudio.com"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-email-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Mobile Number (OTP Target) *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="+91 9876543210"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-mobile-input"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 text-[11px] font-bold uppercase text-left">
                          WhatsApp Number
                        </label>
                        <button
                          type="button"
                          onClick={() => setSameAsMobile(!sameAsMobile)}
                          className="text-[10px] font-bold text-[#2563EB] hover:underline"
                        >
                          {sameAsMobile ? '✓ Same as mobile' : '+ Custom WhatsApp'}
                        </button>
                      </div>
                      <div className="relative">
                        <MessageSquare className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          disabled={sameAsMobile || loading}
                          value={sameAsMobile ? mobileNumber : whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-[#2563EB]" />
                    Studio Login Password
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-password-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase mb-1 text-left">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:outline-none text-xs font-bold"
                          id="register-confirm-password-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition duration-150 text-sm mt-2 shadow-lg flex items-center justify-center gap-2"
                  id="register-submit-btn"
                >
                  <Smartphone className="h-4 w-4" />
                  Continue to Mobile OTP Verification →
                </button>
              </form>
            )}

            {/* STEP 2: Mobile OTP Verification */}
            {registerStep === 'otp' && (
              <form onSubmit={handleVerifyOtpAndCreateStudio} className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="flex items-center justify-center w-20 h-20 p-1.5 bg-black rounded-2xl border border-slate-800 shadow-md overflow-hidden shrink-0">
                      <img 
                        src={activeAppLogo} 
                        alt="LensMaster Application Logo" 
                        className="w-full h-full object-contain rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = defaultAppLogo;
                        }}
                      />
                    </div>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mb-1">
                    Enter 6-Digit Verification Code
                  </h3>
                  <p className="text-slate-600 text-xs">
                    Sent to <strong className="text-slate-900">{mobileNumber}</strong>
                  </p>

                  {/* 6-Digit OTP Boxes */}
                  <div className="flex justify-center gap-2 mt-4">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-box-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newDigits = [...otpDigits];
                          newDigits[idx] = val;
                          setOtpDigits(newDigits);
                          if (val && idx < 5) {
                            const nextInput = document.getElementById(`otp-box-${idx + 1}`);
                            if (nextInput) nextInput.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                            const prevInput = document.getElementById(`otp-box-${idx - 1}`);
                            if (prevInput) prevInput.focus();
                          }
                        }}
                        className="h-12 w-10 md:w-12 text-center text-lg font-black rounded-xl border border-slate-300 bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 text-slate-900 focus:outline-none"
                      />
                    ))}
                  </div>

                  {/* Timers & Attempts Status */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-4 px-2">
                    <span>
                      Attempts: <strong className={otpAttempts > 3 ? 'text-red-600' : 'text-slate-800'}>{otpAttempts}/5</strong>
                    </span>
                    <span>
                      Expires in: <strong className={expiryTimer < 60 ? 'text-red-600 font-extrabold' : 'text-blue-700'}>
                        {Math.floor(expiryTimer / 60)}:{(expiryTimer % 60).toString().padStart(2, '0')}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0}
                    className="flex items-center gap-1.5 font-bold text-[#2563EB] disabled:text-slate-400 hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Now'}
                  </button>

                  <span className="text-slate-400 font-semibold">Test Code: {generatedOtp || '123456'}</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl transition duration-150 text-sm shadow-lg flex items-center justify-center gap-2"
                  id="verify-otp-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Provisioning Studio & Firebase Workspace...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Verify OTP & Create Studio
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: Success Screen */}
            {registerStep === 'success' && (
              <div className="py-6 text-center space-y-4">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center justify-center w-24 h-24 p-2 bg-black rounded-2xl border border-slate-800 shadow-md overflow-hidden shrink-0">
                    <img 
                      src={activeAppLogo} 
                      alt="LensMaster Application Logo" 
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultAppLogo;
                      }}
                    />
                  </div>
                  <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Studio Provisioned Successfully!
                </h2>
                <p className="text-slate-600 text-xs max-w-md mx-auto">
                  Your studio workspace and isolated database collections have been initialized. Please check <strong>{email}</strong> to verify your email address.
                </p>
                <div className="pt-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2563EB] mx-auto" />
                  <p className="text-[11px] font-bold text-slate-400 mt-2">Launching Studio Dashboard...</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-[450px] overflow-hidden rounded-[24px] bg-white p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 relative z-10"
            id="forgot-card"
          >
            {/* Header Area */}
            <div className="flex flex-col items-center mb-6">
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="self-start flex items-center gap-1.5 text-slate-500 hover:text-[#2563EB] text-xs font-bold transition-all mb-2"
                id="forgot-back-btn"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>
              
              <div className="flex items-center justify-center w-28 h-28 p-2 bg-black rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/30 mb-3 overflow-hidden shrink-0">
                <img 
                  src={activeAppLogo} 
                  alt="LensMaster Application Logo" 
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultAppLogo;
                  }}
                />
              </div>
              <h1 className="text-2xl font-black text-slate-900 text-center tracking-tight leading-none">
                Reset Password
              </h1>
              <p className="text-slate-500 text-xs text-center mt-1.5 px-4 font-semibold">
                Enter your registered studio email address below to receive password reset instructions.
              </p>
            </div>

            {/* Notifications Panel */}
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100" id="forgot-error-alert">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span className="font-medium text-left">{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100" id="forgot-success-alert">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* Forgot Form */}
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 text-left">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-[15px] h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@yourstudio.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none text-sm font-bold transition-all duration-150"
                    id="forgot-email-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition duration-150 text-sm mt-6 shadow-[0_4px_20px_rgba(37,99,235,0.15)] flex items-center justify-center gap-2"
                id="forgot-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

