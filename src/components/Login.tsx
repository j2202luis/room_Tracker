import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  KeyRound, 
  ArrowRight, 
  Clock, 
  User, 
  Mail, 
  BookOpen,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onNavigateToRequest: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToRequest }) => {
  const { login, registerUser, forceLogoutMessage, setForceLogoutMessage } = useAuth();
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'instructor' | 'student'>('student');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setForceLogoutMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Institutional Email is required.');
      return;
    }

    if (!trimmedEmail.toLowerCase().endsWith('@ssct.edu.ph')) {
      setErrorMessage('Access denied.'); // Only @ssct.edu.ph emails allowed
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(trimmedEmail, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid credentials or unauthorized access.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setErrorMessage('All registration fields are required.');
      return;
    }

    if (!trimmedEmail.toLowerCase().endsWith('@ssct.edu.ph')) {
      setErrorMessage('Access denied. Sign up requires a valid @ssct.edu.ph email.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = registerUser(trimmedName, trimmedEmail, role, password);
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setSuccessMessage(res.message);
        // Autofill registered email for signing in
        setFullName('');
        setActiveTab('signin');
      }
    }, 800);
  };

  const autofillCredentials = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setActiveTab('signin');
    setErrorMessage(null);
    setSuccessMessage('Credentials loaded. Click Sign In below!');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#050505] relative overflow-y-auto px-4 py-16 scrollbar-none">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      {/* Real-time Clock Banner (Top Panel) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 bg-white/[0.02] border border-white/[0.08] backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 text-xs font-mono tracking-widest text-[#9ca3af] shadow-lg relative z-20 hover:border-white/20 transition-all duration-300"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="font-syne font-black text-white">{formattedDate}</span>
        <span className="text-[#52525b]">|</span>
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-white font-extrabold">{formattedTime} UTC</span>
      </motion.div>

      {/* Main Glass Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[500px] bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 sm:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative z-10"
        id="login-glass-card"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-6">
          <div className="w-14 h-14 bg-white flex items-center justify-center rounded-2xl mb-5 shadow-[0_0_20px_rgba(255,255,255,0.15)] select-none">
            <div className="w-7 h-7 border-4 border-black rotate-45 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-black" />
            </div>
          </div>
          
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-syne" id="app-title-login">
            SSCT Classroom Tracker
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9ca3af] font-bold mt-1 max-w-[320px] leading-relaxed select-none">
            Digital Syllabus Booking & Resource Allotment Portal
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-black/60 p-1.5 rounded-xl border border-white/10 mb-6 relative z-10">
          <button
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage(null);
            }}
            className={`cursor-pointer py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-center transition-all ${
              activeTab === 'signin' 
                ? 'bg-white text-black shadow-md' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Sign In Account
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setErrorMessage(null);
            }}
            className={`cursor-pointer py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-center transition-all ${
              activeTab === 'signup' 
                ? 'bg-white text-black shadow-md' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Register / Sign Up
          </button>
        </div>

        {/* Dynamic Status Dialog Boxes */}
        <AnimatePresence mode="wait">
          {(errorMessage || forceLogoutMessage || successMessage) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`mb-5 p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                successMessage 
                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300' 
                  : forceLogoutMessage && !errorMessage 
                  ? 'bg-blue-950/40 border-blue-500/30 text-blue-300' 
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              {successMessage ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span id="login-error-text" className="font-semibold">
                {errorMessage || forceLogoutMessage || successMessage}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms Body */}
        <AnimatePresence mode="wait">
          {activeTab === 'signin' ? (
            /* SIGN IN FORM VIEW */
            <motion.form 
              key="signin"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSignIn} 
              className="space-y-5"
            >
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-[#9ca3af] mb-2 ml-1 font-bold">
                  Institutional Email (@ssct.edu.ph)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 text-xs font-black">@</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@ssct.edu.ph"
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white rounded-xl px-5 py-3.5 pl-10 text-xs text-white placeholder:text-zinc-600 transition-colors"
                    id="login-email-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-[#9ca3af] mb-2 ml-1 font-bold">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white rounded-xl px-5 py-3.5 pl-10 text-xs text-white placeholder:text-zinc-600 transition-colors"
                    id="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 rounded-xl transition duration-150 mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                id="login-submit-button"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            /* DIRECT SIGN UP FORM VIEW */
            <motion.form 
              key="signup"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleSignUp} 
              className="space-y-4"
            >
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-[#9ca3af] mb-1.5 ml-1 font-bold">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Prof. Juan Dela Cruz"
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white rounded-xl px-5 py-3.5 pl-10 text-xs text-white placeholder:text-zinc-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-[#9ca3af] mb-1.5 ml-1 font-bold">
                  Institutional Role
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <BookOpen className="w-3.5 h-3.5" />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'instructor' | 'student')}
                    className="w-full bg-[#0d0d0d] border border-white/[0.08] focus:border-white rounded-xl px-5 py-3.5 pl-10 text-xs text-white transition-colors cursor-pointer"
                  >
                    <option value="student" className="bg-[#050505]">Student (View routines only)</option>
                    <option value="instructor" className="bg-[#050505]">Instructor (Manage schedules & availability)</option>
                    <option value="admin" className="bg-[#050505]">Administrator (Full control access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-[#9ca3af] mb-1.5 ml-1 font-bold">
                  SSCT Academic Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="required-name@ssct.edu.ph"
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white rounded-xl px-5 py-3.5 pl-10 text-xs text-white placeholder:text-zinc-600 transition-colors font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-[#9ca3af] mb-1.5 ml-1 font-bold">
                  Create Password (8+ chars, uppercase, digit, special)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Secure password..."
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white rounded-xl px-5 py-3.5 pl-10 text-xs text-white placeholder:text-zinc-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 rounded-xl transition duration-150 mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Complete Registration
                    <Sparkles className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Action bottom links */}
        <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
          <button
            type="button"
            onClick={onNavigateToRequest}
            className="text-[10px] uppercase tracking-widest text-[#9ca3af] hover:text-white transition-colors cursor-pointer font-bold"
            id="request-access-link"
          >
            Legacy Access Requests Option
          </button>
        </div>
      </motion.div>

      {/* QUICK FILL DEMO CREDENTIALS COMPONENT */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: 0.4 }}
        className="mt-8 max-w-[500px] w-full bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.12] transition-colors rounded-2xl p-6 relative z-10 text-center"
      >
        <div className="flex items-center gap-2 justify-center mb-3 text-[10px] uppercase tracking-widest font-black text-white">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interactive Setup Credentials Dashboard</span>
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed mb-4 uppercase tracking-wider">
          Click on any predefined role below to instantly load credentials and log into the classroom booking portal.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Admin Account #2 - Instant access! */}
          <button
            type="button"
            onClick={() => autofillCredentials('admin2@ssct.edu.ph', 'Admin@123')}
            className="cursor-pointer bg-[#0c0c0d] border border-red-500/10 hover:border-red-500/30 text-left p-3 rounded-xl hover:bg-white/[0.03] transition group"
          >
            <div className="text-[9px] font-black uppercase text-red-400 tracking-wider flex items-center justify-between">
              <span>System Admin (A2)</span>
              <span className="bg-red-500/10 text-[7px] text-red-300 font-bold px-1 py-0.5 rounded uppercase">No Change Pwd</span>
            </div>
            <p className="text-[9px] text-[#9ca3af] font-mono mt-1 break-all truncate">admin2@ssct.edu.ph</p>
            <p className="text-[8px] text-zinc-600 font-mono mt-0.5">Password: Admin@123</p>
          </button>

          {/* Instructor Standard Account */}
          <button
            type="button"
            onClick={() => autofillCredentials('instructor@ssct.edu.ph', 'Instructor@123')}
            className="cursor-pointer bg-[#0c0c0d] border border-blue-500/10 hover:border-blue-500/30 text-left p-3 rounded-xl hover:bg-white/[0.03] transition group"
          >
            <div className="text-[9px] font-black uppercase text-blue-400 tracking-wider flex items-center justify-between">
              <span>SSCT Instructor</span>
              <span className="bg-blue-500/10 text-[7px] text-blue-300 font-bold px-1 py-0.5 rounded uppercase">Seed</span>
            </div>
            <p className="text-[9px] text-[#9ca3af] font-mono mt-1 break-all truncate">instructor@ssct.edu.ph</p>
            <p className="text-[8px] text-zinc-600 font-mono mt-0.5">Password: Instructor@123</p>
          </button>

          {/* Student Standard Account */}
          <button
            type="button"
            onClick={() => autofillCredentials('student@ssct.edu.ph', 'Student@123')}
            className="cursor-pointer bg-[#0c0c0d] border border-zinc-500/10 hover:border-zinc-500/30 text-left p-3 rounded-xl hover:bg-white/[0.03] transition group"
          >
            <div className="text-[9px] font-black uppercase text-zinc-300 tracking-wider flex items-center justify-between">
              <span>View-Only Student</span>
              <span className="bg-zinc-500/10 text-[7px] text-zinc-400 font-bold px-1 py-0.5 rounded uppercase">Seed</span>
            </div>
            <p className="text-[9px] text-[#9ca3af] font-mono mt-1 break-all truncate font-medium">student@ssct.edu.ph</p>
            <p className="text-[8px] text-zinc-600 font-mono mt-0.5">Password: Student@123</p>
          </button>

          {/* Default Admin Account #1 */}
          <button
            type="button"
            onClick={() => autofillCredentials('admin@ssct.edu.ph', 'Admin@123')}
            className="cursor-pointer bg-[#0c0c0d] border border-red-500/10 hover:border-red-500/30 text-left p-3 rounded-xl hover:bg-white/[0.03] transition group"
          >
            <div className="text-[9px] font-black uppercase text-red-500 tracking-wider flex items-center justify-between">
              <span>Admin Primary (A1)</span>
              <span className="bg-red-500/10 text-[7px] text-red-400 font-bold px-1 py-0.5 rounded uppercase">Change Pwd</span>
            </div>
            <p className="text-[9px] text-[#9ca3af] font-mono mt-1 break-all truncate">admin@ssct.edu.ph</p>
            <p className="text-[8px] text-zinc-600 font-mono mt-0.5">Password: Admin@123</p>
          </button>
        </div>
      </motion.div>

      {/* Footer message */}
      <div className="mt-12 text-center text-[10px] text-gray-650 tracking-wider uppercase select-none font-bold">
        Surigao State College of Technology © 2026 — Restricted Repository
      </div>
    </div>
  );
};
