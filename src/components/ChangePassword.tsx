import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, Lock, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ChangePassword: React.FC = () => {
  const { changePassword, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasChanged, setHasChanged] = useState(false);

  // Requirement validations:
  // - Minimum 8 characters
  // - At least 1 uppercase, 1 number, 1 special character
  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const matchesConfirm = password !== '' && password === confirmPassword;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      setErrorMsg('Password does not fulfill security guidelines.');
      return;
    }

    if (!matchesConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = changePassword(password);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      setSuccess(true);
      setHasChanged(true);
    }
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
        transition={{ duration: 0.35 }}
        className="w-full max-w-[480px] bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 sm:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative z-10"
        id="changepwd-glass-card"
      >
        <div className="text-center pb-6">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_20px_rgba(255,255,255,0.2)] mx-auto">
            <div className="w-8 h-8 border-4 border-black rotate-45 flex items-center justify-center">
              <Lock className="w-4 h-4 text-black -rotate-45" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-syne" id="changepwd-title">
            First-time Sign In
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-bold mt-2">
            Password Change Required
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-3 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 ml-1 font-bold">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure password"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-4 text-sm focus:outline-hidden focus:border-white/40 transition-colors placeholder:text-zinc-650 text-white font-sans font-mono"
              id="changepwd-new-input"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 ml-1 font-bold">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Verify password"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-4 text-sm focus:outline-hidden focus:border-white/40 transition-colors placeholder:text-zinc-650 text-white font-sans font-mono"
              id="changepwd-confirm-input"
            />
          </div>

          {/* Validation Checklist UI */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 text-xs space-y-2.5">
            <p className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] mb-1">Security Criteria</p>
            
            <div className="flex items-center gap-2">
              {isMinLength ? (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              )}
              <span className={isMinLength ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>At least 8 characters long</span>
            </div>

            <div className="flex items-center gap-2">
              {hasUppercase ? (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              )}
              <span className={hasUppercase ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>Contains an uppercase letter (A-Z)</span>
            </div>

            <div className="flex items-center gap-2">
              {hasNumber ? (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              )}
              <span className={hasNumber ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>Contains a number (0-9)</span>
            </div>

            <div className="flex items-center gap-2">
              {hasSpecial ? (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              )}
              <span className={hasSpecial ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>Contains a special character (!@#$ etc.)</span>
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.05] pt-2 mt-2">
              {matchesConfirm ? (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              )}
              <span className={matchesConfirm ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>Passwords match exactly</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer bg-white text-black font-extrabold py-4 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] mt-4 shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            id="password-submit-btn"
          >
            Apply & Save Password
          </button>
        </form>

        <div className="mt-6 border-t border-white/[0.05] pt-4 text-center">
          <button
            onClick={() => logout('Password update cancelled.')}
            className="text-[11px] uppercase tracking-widest text-[#9ca3af] hover:text-white transition-colors cursor-pointer font-bold"
          >
            Cancel and Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};
