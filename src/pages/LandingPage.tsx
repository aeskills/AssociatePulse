import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import useAppStore from '../store/useAppStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const trainers = useAppStore((s) => s.trainers);
  const addToast = useAppStore((s) => s.addToast);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Please enter both User ID and Password.');
      return;
    }

    setIsSubmitting(true);

    // 1. Admin Login Check
    if (cleanUser === 'admin' && (cleanPass === '123456' || cleanPass === 'admin')) {
      setTimeout(() => {
        login('admin');
        addToast('Welcome Admin! Logged in successfully.', 'success');
        setIsSubmitting(false);
        navigate('/admin');
      }, 400);
      return;
    }

    // 2. Field Trainer Login Check: Name / ID / Employee ID
    const matchedTrainer = trainers.find(
      (t) =>
        t.name.toLowerCase().includes(cleanUser) ||
        t.id.toLowerCase() === cleanUser ||
        t.id.toLowerCase() === `t-${cleanUser}` ||
        t.employeeId.toLowerCase() === cleanUser
    );

    if (matchedTrainer && cleanPass === '123456') {
      setTimeout(() => {
        login('trainer', matchedTrainer.id);
        addToast(`Welcome back, ${matchedTrainer.name}! Logged in successfully.`, 'success');
        setIsSubmitting(false);
        navigate(`/dashboard/state/${matchedTrainer.stateId}/trainer/${matchedTrainer.id}/attendance`);
      }, 400);
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        setErrorMsg('Invalid User ID or Password. Please check your credentials.');
      }, 300);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-rose-50/70 via-white to-slate-50 flex flex-col justify-between p-4 sm:p-8 md:p-10 text-slate-900 select-none">
      {/* Background image & subtle light overlays */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/landing_bg.png")',
            opacity: 0.12,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-rose-50/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-white/80" />
      </div>

      {/* Top Header: Brand logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex items-center gap-3 z-10 self-start"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 flex items-center justify-center font-black text-white text-sm sm:text-base shadow-lg shadow-red-500/25">
          AP
        </div>
        <div className="text-left">
          <span className="text-sm sm:text-base font-black tracking-wider block uppercase font-display text-slate-900">
            AssociatePulse
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-red-600 uppercase tracking-widest block mt-0.5">
            Field Operations ERP
          </span>
        </div>
      </motion.div>

      {/* Main Grid: Left hero copy + Right Login Card */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 z-10 my-4 max-w-7xl w-full mx-auto">
        
        {/* Left Column: Hero branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-7 space-y-5 text-left"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-slate-900">
            Empowering the Next Generation of <span className="text-red-600">Creators</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-lg">
            Sign in with your trainer or admin account to access assigned schools, geotagged attendance verification, drive media logs, and daily feedback reports.
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-red-600 shrink-0" />
              <span>Geotagged Location Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-red-600 shrink-0" />
              <span>All State Project Associates</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Sign In Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="lg:col-span-5 w-full max-w-md mx-auto"
        >
          <div className="relative group">
            {/* Ambient background glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-400 rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />

            <div className="relative bg-white/95 border border-rose-200/90 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-rose-950/5 text-left space-y-5">
              
              {/* Form Title */}
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Sign In to Portal
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Enter your Trainer or Admin credentials to continue.
                </p>
              </div>

              {/* Error alert banner */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* User ID Field */}
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">
                    User ID / Trainer Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter User ID (e.g. Manish, admin)"
                      className="w-full h-11 pl-10 pr-4 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-11 pl-10 pr-10 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-red-600 via-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
