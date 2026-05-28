import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, Mail, User, BookOpen, PenTool, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface RequestAccessProps {
  onNavigateToLogin: () => void;
}

export const RequestAccess: React.FC<RequestAccessProps> = ({ onNavigateToLogin }) => {
  const { requestAccess } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'instructor' | 'student'>('student');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedReason = reason.trim();

    if (!trimmedName || !trimmedEmail || !trimmedReason) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (!trimmedEmail.toLowerCase().endsWith('@ssct.edu.ph')) {
      setErrorMsg('Access denied. Only @ssct.edu.ph emails are allowed.');
      return;
    }

    setIsSubmitting(true);
    
    // Slight simulation delay
    setTimeout(() => {
      const res = requestAccess(trimmedName, trimmedEmail, role, trimmedReason);
      
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(res.message);
        // Clean fields
        setFullName('');
        setEmail('');
        setReason('');
      }
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#050505] relative overflow-hidden px-4 py-12 select-none">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-900/10 blur-[120px] pointer-events-none" />

      {/* Large Background Typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
        <h1 className="text-[200px] sm:text-[300px] md:text-[400px] font-black tracking-tighter">SSCT</h1>
      </div>

      {/* Left Vertical Rail */}
      <div className="absolute left-6 lg:left-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-12 opacity-30 select-none">
        <div className="w-[1px] h-32 bg-white" />
        <p className="vertical-rl rotate-180 text-[10px] uppercase tracking-[0.5em] whitespace-nowrap">Restricted Access System</p>
        <div className="w-[1px] h-32 bg-white" />
      </div>

      {/* Right Vertical Rail */}
      <div className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-12 opacity-30 select-none">
        <div className="w-[1px] h-32 bg-white" />
        <p className="vertical-rl text-[10px] uppercase tracking-[0.5em] whitespace-nowrap">Authorized Personnel Only</p>
        <div className="w-[1px] h-32 bg-white" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 sm:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative z-10"
        id="request-glass-card"
      >
        {/* Back navigation button */}
        <button
          onClick={onNavigateToLogin}
          className="inline-flex items-center gap-2 text-[10px] text-zinc-400 hover:text-white mb-6 uppercase tracking-widest font-extrabold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </button>

        {successMsg ? (
          /* Successful State UI */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl mx-auto shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <div className="w-8 h-8 border-4 border-black rotate-45 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-black -rotate-45" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-syne">Request Submitted</h2>
            <p className="text-sm text-zinc-350 max-w-sm mx-auto leading-relaxed">
              {successMsg}
            </p>
            <div className="pt-6">
              <button
                onClick={onNavigateToLogin}
                className="cursor-pointer bg-white text-black font-extrabold px-8 py-3.5 rounded-xl hover:bg-zinc-200 transition-all text-xs uppercase tracking-widest"
              >
                Sign In Dashboard
              </button>
            </div>
          </motion.div>
        ) : (
          /* Submission Form */
          <>
            <div className="text-center pb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-syne" id="request-page-title">
                Request Credentials
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-bold mt-2">
                Authorized SSCT Personnel & Student Accounts Only
              </p>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl flex items-start gap-3 text-xs font-semibold"
              >
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 ml-1 font-bold">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <User className="w-4 h-4 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Prof. Juan Dela Cruz"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-4 pl-11 text-sm focus:outline-hidden focus:border-white/40 transition-colors duration-200 placeholder:text-zinc-650 text-white font-sans"
                    id="request-name-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 ml-1 font-bold">
                  Institutional Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <Mail className="w-4 h-4 text-zinc-500" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@ssct.edu.ph"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-4 pl-11 text-sm focus:outline-hidden focus:border-white/40 transition-colors duration-200 placeholder:text-zinc-650 text-white font-sans"
                    id="request-email-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 ml-1 font-bold">
                  Institutional Role
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <BookOpen className="w-4 h-4 text-zinc-500" />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'instructor' | 'student')}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-4 pl-11 text-sm focus:outline-hidden focus:border-white/40 transition-colors duration-200 text-white font-sans appearance-none select-none cursor-pointer"
                    id="request-role-select"
                  >
                    <option value="student" className="bg-[#050505]">Student (View-Only Schedule)</option>
                    <option value="instructor" className="bg-[#050505]">Instructor (Manage schedules)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 ml-1 font-bold">
                  Reason / Justification
                </label>
                <div className="relative">
                  <span className="absolute top-4 left-4 text-zinc-500">
                    <PenTool className="w-4 h-4 text-zinc-500" />
                  </span>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you require access to the Classroom Tracker repository..."
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-4 pl-11 text-sm focus:outline-hidden focus:border-white/40 transition-colors duration-200 placeholder:text-zinc-650 text-white font-sans resize-none"
                    id="request-reason-textarea"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer bg-white text-black font-extrabold py-4 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] mt-4 shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                id="request-submit-button"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  'Submit Access Request'
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>

      <div className="mt-8 text-center text-[10px] text-gray-600 tracking-wider">
        SSCT © 2026 — For authorized use only
      </div>
    </div>
  );
};
