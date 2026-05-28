import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './components/Login';
import { RequestAccess } from './components/RequestAccess';
import { ChangePassword } from './components/ChangePassword';
import { AdminRequests } from './components/AdminRequests';
import { ClassroomsManager } from './components/ClassroomsManager';
import { SubjectsManager } from './components/SubjectsManager';
import { SchedulesManager } from './components/SchedulesManager';
import { AvailabilityManager } from './components/AvailabilityManager';
import { StudentScheduleView } from './components/StudentScheduleView';
import { DjangoConsole } from './components/DjangoConsole';

// Database triggers
import * as db from './db';

// Icons
import {
  LogOut,
  User,
  Shield,
  LayoutDashboard,
  School,
  Calendar,
  BookOpen,
  Clock,
  Menu,
  X,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Wrapper component to access useAuth hooks safely
const MainAppContent: React.FC = () => {
  const { 
    currentUser, 
    pendingRequestsCount, 
    logout, 
    getAllRequests,
    getApprovedUsers
  } = useAuth();

  // Navigation state (SPA routing mock)
  const [currentView, setCurrentView] = useState<'login' | 'request'>('login');
  const [activeMenu, setActiveMenu] = useState<string>(currentUser?.role === 'student' ? 'schedules_board' : 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
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

  // If not logged in, route to Login or RequestAccess
  if (!currentUser) {
    if (currentView === 'request') {
      return <RequestAccess onNavigateToLogin={() => setCurrentView('login')} />;
    }
    return <Login onNavigateToRequest={() => setCurrentView('request')} />;
  }

  // Force first-login password change (PrivateSystemMiddleware constraint)
  if (currentUser.mustChangePassword) {
    return <ChangePassword />;
  }

  // Quick stats calculations for Role-based Dashboards
  const classroomsCount = db.getClassrooms().length;
  const schedulesCount = db.getSchedules().length;
  const subjectsCount = db.getSubjects().length;
  const pendingRequests = getAllRequests().filter(r => r.status === 'pending');
  const totalApprovedUsers = getApprovedUsers().length;

  // Render main layout
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* 🚀 TOP NAVIGATION HEADER */}
      <header className="bg-[#050505]/85 border-b border-white/[0.08] sticky top-0 z-50 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 px-2 hover:bg-[#1f2937] rounded-lg md:hidden transition cursor-pointer text-gray-300 hover:text-white"
            aria-label="Toggle Navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Elegant Emblem Crest */}
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-white/20">
            <School className="w-4.5 h-4.5 text-black" />
          </div>

          <span className="text-xs uppercase tracking-[0.2em] font-black text-white font-syne hidden sm:inline">
            SSCT Class Tracker
          </span>
        </div>

        {/* Real-time Clock Header Widget */}
        <div className="hidden md:flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-1.5 text-[10px] font-mono tracking-wider text-gray-300">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
          </span>
          <span className="text-zinc-400 font-sans font-semibold">{formattedDate}</span>
          <span className="text-zinc-700">|</span>
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-extrabold text-white">{formattedTime} UTC</span>
        </div>

        {/* 🔐 TOP RIGHT PROFILE BANNER */}
        <div className="flex items-center gap-3" id="user-info-banner">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-bold text-white truncate max-w-[150px]">{currentUser.fullName}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded-md uppercase tracking-wider border ${
                currentUser.role === 'admin' 
                  ? 'bg-red-950/40 border-red-500/20 text-red-300' 
                  : currentUser.role === 'instructor'
                  ? 'bg-blue-950/40 border-blue-500/20 text-blue-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}>
                {currentUser.role}
              </span>
            </div>
          </div>

          {/* Simple avatar fallback */}
          <div className="w-8 h-8 rounded-full bg-white text-black border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
            {currentUser.fullName.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}
          </div>

          <div className="border-l border-zinc-805 h-6 mx-1" />

           {/* Sign Out Trigger with browser back redirect block */}
           <button
             onClick={() => {
               if (confirmSignOut) {
                 logout();
                 setCurrentView('login');
                 setConfirmSignOut(false);
               } else {
                 setConfirmSignOut(true);
                 // Auto reset confirm status after 4 seconds of inactivity
                 setTimeout(() => setConfirmSignOut(false), 4000);
               }
             }}
             className={`cursor-pointer font-bold text-[10px] uppercase tracking-widest transition flex items-center gap-1.5 p-1 px-2.5 border rounded-lg ${
               confirmSignOut 
                 ? 'bg-rose-950/40 border-rose-500/30 text-rose-300 animate-pulse'
                 : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.03] border-transparent'
             }`}
             title={confirmSignOut ? "Click again to confirm signing out" : "Sign out of your account"}
           >
             <LogOut className="w-4 h-4 shrink-0" />
             <span className="hidden sm:inline">
               {confirmSignOut ? 'Click to Confirm Sign Out' : 'Sign Out'}
             </span>
           </button>
        </div>
      </header>

      {/* 📐 CORE CONTENT LAYOUT */}
      <div className="flex-1 flex max-w-[1800px] w-full mx-auto relative">

        {/* 📚 PERSISTENT SIDEBAR NAVIGATION */}
        <nav className={`w-64 bg-[#050505]/45 border-r border-white/[0.08] shrink-0 flex flex-col justify-between p-4 md:sticky md:top-16 md:h-[calc(100vh-64px)] overflow-y-auto transform transition-transform duration-250 z-40
          ${sidebarOpen ? 'translate-x-0 fixed inset-y-0 left-0 bg-[#050505] z-50 shadow-2xl w-72' : '-translate-x-full md:translate-x-0 hidden md:flex'}`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between md:hidden">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Menu routines</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Micro-profile on mobile sidebar view */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-2 md:hidden">
              <div className="font-bold text-xs text-white truncate">{currentUser.fullName}</div>
              <div className="text-[10px] text-zinc-400 font-medium font-mono truncate">{currentUser.email}</div>
              <div className="text-[9px] uppercase tracking-widest font-extrabold text-[#9ca3af]">{currentUser.role}</div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-3 mb-2">Primary Routines</p>
              
              {/* ADMIN SIDEBAR LINKS */}
              {currentUser.role === 'admin' && (
                <>
                  <button
                    onClick={() => { setActiveMenu('dashboard'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'dashboard' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span>System Dashboard</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('classrooms'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'classrooms' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <School className="w-4 h-4 shrink-0" />
                      <span>Classrooms List</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('schedules'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'schedules' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Booked Schedules</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('subjects'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'subjects' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span>Subjects Syllabus</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('availability'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'availability' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Staff Availability</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('pending'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'pending' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Access Requests</span>
                    </div>
                    {pendingRequestsCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full" id="sidebar-requests-badge">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {/* INSTRUCTOR SIDEBAR LINKS */}
              {currentUser.role === 'instructor' && (
                <>
                  <button
                    onClick={() => { setActiveMenu('dashboard'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'dashboard' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span>Dashboard</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('classrooms'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'classrooms' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <School className="w-4 h-4 shrink-0" />
                      <span>Classrooms</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('schedules'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'schedules' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Manage Schedules</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('subjects'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'subjects' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span>Syllabus Subjects</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('availability'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'availability' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>My Availability</span>
                    </div>
                  </button>
                </>
              )}

              {/* STUDENT SIDEBAR LINKS */}
              {currentUser.role === 'student' && (
                <>
                  <button
                    onClick={() => { setActiveMenu('schedules_board'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'schedules_board' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>My Schedule routines</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveMenu('availability'); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      activeMenu === 'availability' ? 'bg-cyan-600 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Faculty Consultation Hours</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.05)] pt-4 text-center text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
            SSCT Class Tracker
            <div className="text-[8px] text-gray-600 font-mono mt-0.5">V1.5 (PROD SECURE)</div>
          </div>
        </nav>

        {/* Backdrop for mobile navigation */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
          />
        )}

        {/* 💻 MAIN BODY HOUSING MODULES */}
        <main className="flex-1 px-4 sm:px-8 py-8 overflow-y-auto max-w-full">
          <AnimatePresence mode="wait">
            {/* Dashboard Routing */}
            {activeMenu === 'dashboard' && currentUser.role !== 'student' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-8"
              >
                {/* Greeting banner */}
                <div className="p-8 bg-white/[0.02] border border-white/[0.08] rounded-3xl">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-syne tracking-tight">
                    Salamat, Welcome Back!
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed uppercase tracking-wider font-semibold">
                    Restricted SSCT Classroom Scheduler dashboard interface.
                  </p>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white/[0.02] border border-white/[0.05] hover:border-white/10 rounded-2xl p-6 transition-all duration-300">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Classrooms</p>
                    <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{classroomsCount}</h3>
                    <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold font-sans">Total physical rooms</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.05] hover:border-white/10 rounded-2xl p-6 transition-all duration-300">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Booked Schedules</p>
                    <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{schedulesCount}</h3>
                    <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold font-sans">Active slots configured</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.05] hover:border-white/10 rounded-2xl p-6 transition-all duration-300">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Syllabus Subjects</p>
                    <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{subjectsCount}</h3>
                    <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold font-sans">Total academic subjects</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.05] hover:border-white/10 rounded-2xl p-6 transition-all duration-300">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Academic Team</p>
                    <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{totalApprovedUsers}</h3>
                    <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold font-sans">Personnel members</p>
                  </div>
                </div>

                {/* Context-aware Quick Panels */}
                {currentUser.role === 'admin' ? (
                  /* Admin fast-review request board */
                  <div className="p-6 bg-[#161b22]/40 border border-[rgba(255,255,255,0.05)] rounded-2xl space-y-4">
                    <h4 className="font-semibold text-white tracking-wide text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>Outstanding Access Requests Waiting Approval</span>
                    </h4>
                    {pendingRequests.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        No outstanding access requests waiting review. System fully processed!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.slice(0, 3).map(req => (
                          <div key={req.id} className="bg-[#0f141c]/40 p-4 border border-[rgba(255,255,255,0.04)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-gray-100">{req.fullName}</p>
                              <span className="text-gray-400 font-mono text-[10.5px]">{req.email}</span>
                              <span className="ml-2 px-1.5 py-0.5 bg-cyan-950 text-cyan-400 rounded text-[9px] uppercase font-bold tracking-wider">{req.role}</span>
                              <p className="text-gray-400 mt-1.5 leading-relaxed text-[11px] max-w-lg italic">"{req.reason}"</p>
                            </div>
                            <button
                              onClick={() => { setActiveMenu('pending'); }}
                              className="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition self-end sm:self-center font-semibold"
                            >
                              Manage Request Panel
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Instructor Routine Class schedule for Today */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-5 bg-[#161b22]/40 border border-[rgba(255,255,255,0.05)] rounded-2xl space-y-3">
                      <h4 className="font-semibold text-sm text-white tracking-wide">Quick Classroom Overview</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        To declare, register, or remove classroom records, click the Classroom button in the sidebar or below.
                      </p>
                      <button
                        onClick={() => setActiveMenu('classrooms')}
                        className="cursor-pointer text-xs font-semibold text-cyan-400 hover:text-white transition mt-2 flex items-center gap-1"
                      >
                        Launch Classroom Manager →
                      </button>
                    </div>

                    <div className="p-5 bg-[#161b22]/40 border border-[rgba(255,255,255,0.05)] rounded-2xl space-y-3">
                      <h4 className="font-semibold text-sm text-white tracking-wide">Weekly Active Scheduling</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Check booked schedules, create routines, and analyze overlap warnings for computer labs and drafting rooms.
                      </p>
                      <button
                        onClick={() => setActiveMenu('schedules')}
                        className="cursor-pointer text-xs font-semibold text-cyan-400 hover:text-white transition mt-2 flex items-center gap-1"
                      >
                        Launch Schedule Planner →
                      </button>
                    </div>
                  </div>
                )}

                {/* Django Relational database diagnostics component for transparent system validation */}
                <DjangoConsole />
              </motion.div>
            )}

            {/* Render subcomponents Based on Sidebar States */}
            {activeMenu === 'classrooms' && <ClassroomsManager />}
            {activeMenu === 'schedules' && <SchedulesManager />}
            {activeMenu === 'subjects' && <SubjectsManager />}
            {activeMenu === 'availability' && <AvailabilityManager />}
            {activeMenu === 'pending' && currentUser.role === 'admin' && <AdminRequests />}

            {/* Student View (All Tabs combined inside the customized panel) */}
            {activeMenu === 'schedules_board' && (
              <StudentScheduleView />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  // Navigation defaults to schedules board for students instantly on load if approved
  const [initTick, setInitTick] = useState<string>('dashboard');

  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
