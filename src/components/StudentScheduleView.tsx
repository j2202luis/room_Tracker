import React, { useState, useEffect } from 'react';
import { getSchedules, saveSchedules, getClassrooms, getSubjects, getUsers } from '../db';
import { Schedule, Classroom, Subject } from '../types';
import { useAuth } from '../AuthContext';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  BookOpen, 
  Eye, 
  FileText, 
  FileDown, 
  Activity, 
  CheckCircle, 
  X, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Edit, 
  Building,
  Users,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const StudentScheduleView: React.FC = () => {
  const { currentUser } = useAuth();
  const isWritable = currentUser?.role === 'admin' || currentUser?.role === 'instructor';

  // State management to allow real-time updates without page restarts
  const [masterSchedules, setMasterSchedules] = useState<Schedule[]>(getSchedules());
  const [classrooms, setClassrooms] = useState<Classroom[]>(getClassrooms());
  const [subjects, setSubjects] = useState<Subject[]>(getSubjects());
  const instructors = getUsers().filter(u => u.role === 'instructor' && u.isApproved);

  // Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'rooms'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('All');
  const [buildingFilter, setBuildingFilter] = useState('All');

  // Days options
  const days = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Current system weekday
  const [currentDayName, setCurrentDayName] = useState('Monday');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Manage room schedule editing inline modal
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [deleteConfirmSchedId, setDeleteConfirmSchedId] = useState<string | null>(null);

  // Inline room schedule editing form states
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState('Monday');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [newInstructorId, setNewInstructorId] = useState(currentUser?.id || '');
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);

  // Tracking expanded room schedule details inside student classroom listings
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  useEffect(() => {
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date();
    const dayName = weekday[d.getDay()];
    setCurrentDayName(dayName);

    // Keep dynamic second-timer for real-time status trackers
    const timer = setInterval(() => {
      const live = new Date();
      setCurrentTimeStr(live.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter schedules dynamically
  const getFilteredSchedules = () => {
    let filtered = [...masterSchedules];

    // Today tab filters
    if (activeTab === 'today') {
      filtered = filtered.filter(s => s.dayOfWeek.toLowerCase() === currentDayName.toLowerCase());
    } else if (dayFilter !== 'All') {
      filtered = filtered.filter(s => s.dayOfWeek.toLowerCase() === dayFilter.toLowerCase());
    }

    // Search query query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const sub = subjects.find(sub => sub.id === s.subjectId);
        const rm = classrooms.find(room => room.id === s.classroomId);
        const inst = instructors.find(i => i.id === s.instructorId) || getUsers().find(u => u.id === s.instructorId);

        return (
          sub?.name.toLowerCase().includes(q) ||
          sub?.code.toLowerCase().includes(q) ||
          rm?.name.toLowerCase().includes(q) ||
          rm?.building.toLowerCase().includes(q) ||
          inst?.fullName.toLowerCase().includes(q)
        );
      });
    }

    return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const filteredSchedules = getFilteredSchedules();

  // Get unique building lists to enable filtering dropdown
  const uniqueBuildings = Array.from(new Set(classrooms.map(c => c.building)));

  // Classroom registries query filtering
  const filteredClassrooms = classrooms.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.building.toLowerCase().includes(q);
    const matchesBuilding = buildingFilter === 'All' || c.building === buildingFilter;
    return matchesSearch && matchesBuilding;
  });

  // Calculate live room vacancies state
  const getLiveRoomStatus = (roomId: string) => {
    const roomSchedules = masterSchedules.filter(
      s => s.classroomId === roomId && s.dayOfWeek.toLowerCase() === currentDayName.toLowerCase()
    );

    if (roomSchedules.length === 0) {
      return { status: 'vacant', isOccupied: false, text: 'Vacant All Day today' };
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (const sched of roomSchedules) {
      const [startH, startM] = sched.startTime.split(':').map(Number);
      const [endH, endM] = sched.endTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (currentMins >= startMins && currentMins <= endMins) {
        const sub = subjects.find(s => s.id === sched.subjectId);
        return { 
          status: 'occupied', 
          isOccupied: true, 
          text: `Occupied Now: ${sub?.code || 'Class'} (${sched.startTime} - ${sched.endTime})` 
        };
      }
    }

    // Otherwise, check for any upcoming routine classes today
    const upcoming = roomSchedules
      .map(s => {
        const [h, m] = s.startTime.split(':').map(Number);
        return { s, mins: h * 60 + m };
      })
      .filter(x => x.mins > currentMins)
      .sort((a, b) => a.mins - b.mins);

    if (upcoming.length > 0) {
      const nextClass = upcoming[0].s;
      const sub = subjects.find(s => s.id === nextClass.subjectId);
      return { 
        status: 'upcoming', 
        isOccupied: false, 
        text: `Vacant (Next: ${sub?.code || 'Class'} at ${nextClass.startTime})` 
      };
    }

    return { status: 'vacant', isOccupied: false, text: 'Vacant (All classes finished today)' };
  };

  // Convert "HH:MM" to minutes for overlap checkers
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Check schedule overlaps for room assignments
  const checkConflict = (schedId: string | null, roomId: string, day: string, start: string, end: string): boolean => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);

    const matchSchedules = masterSchedules.filter(s => s.id !== schedId && s.classroomId === roomId && s.dayOfWeek === day);
    
    for (const other of matchSchedules) {
      const otherStart = timeToMinutes(other.startTime);
      const otherEnd = timeToMinutes(other.endTime);

      // Overlap: start < otherEnd && end > otherStart
      if (startMins < otherEnd && endMins > otherStart) {
        return true;
      }
    }
    return false;
  };

  // Inline direct schedule assignment saver
  const handleSaveRoomSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editingRoomId) return;
    if (!newSubjectId) {
      setEditFormError('Please select an academic subject assigned to this classroom.');
      return;
    }

    const startMins = timeToMinutes(newStartTime);
    const endMins = timeToMinutes(newEndTime);

    if (startMins >= endMins) {
      setEditFormError('The start time must be configured physically before the end time.');
      return;
    }

    // Check collision overlap
    const hasConflict = checkConflict(null, editingRoomId, newDayOfWeek, newStartTime, newEndTime);
    if (hasConflict) {
      const selectR = classrooms.find(r => r.id === editingRoomId);
      setEditFormError(`Booking Overlap: ${selectR?.name || 'This classroom'} is already reserved on ${newDayOfWeek}s at this requested slot.`);
      return;
    }

    // Default instructor role assignment mapping
    const finalInstructor = currentUser?.role === 'admin' ? newInstructorId : (currentUser?.id || '');

    const newSched: Schedule = {
      id: `sched-${Date.now()}`,
      subjectId: newSubjectId,
      classroomId: editingRoomId,
      instructorId: finalInstructor,
      dayOfWeek: newDayOfWeek,
      startTime: newStartTime,
      endTime: newEndTime
    };

    const updatedSchedules = [...masterSchedules, newSched];
    setMasterSchedules(updatedSchedules);
    saveSchedules(updatedSchedules);

    // Dynamic success reset
    setNewSubjectId('');
    setSuccessAnimation('Schedule booked successfully!');
    setTimeout(() => setSuccessAnimation(null), 3000);
  };

  // Quick Inline delete handler
  const handleDeleteRoomSchedule = (schedId: string) => {
    if (deleteConfirmSchedId === schedId) {
      const updatedSchedules = masterSchedules.filter(s => s.id !== schedId);
      setMasterSchedules(updatedSchedules);
      saveSchedules(updatedSchedules);
      setSuccessAnimation('Schedule routine deleted.');
      setDeleteConfirmSchedId(null);
      setTimeout(() => setSuccessAnimation(null), 3500);
    } else {
      setDeleteConfirmSchedId(schedId);
      // Auto-reset confirmation status after 4 seconds of inactivity
      setTimeout(() => {
        setDeleteConfirmSchedId(curr => curr === schedId ? null : curr);
      }, 4000);
    }
  };

  // landscape PDF compilation exporter
  const generatePDFExport = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const docWidth = doc.internal.pageSize.getWidth();

    // 1. Draw elegant top border and aesthetic header block
    doc.setFillColor(15, 23, 42); // Navy-black elegant bar
    doc.rect(0, 0, docWidth, 38, 'F');

    // Header Typography
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SURIGAO STATE COLLEGE OF TECHNOLOGY', 14, 14);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(190, 200, 210);
    doc.text('INSTITUTIONAL SYLLABUS BOOKING, CLASSROOOM SCHEDULING & RESOURCE ALLOTMENT SYSTEM', 14, 21);
    doc.text('Generated PDF Routine Docket — Restricted Official Distribution Only', 14, 26);

    // Live metadata block
    doc.setFillColor(28, 33, 41);
    doc.rect(docWidth - 110, 8, 96, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('OFFICIAL REPORT SUMMARY', docWidth - 106, 13);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    
    const viewNameObj = activeTab === 'all' 
      ? `FILTERED WEEKLY (Day: ${dayFilter})` 
      : activeTab === 'today' 
      ? `TODAY'S CLASSES (${currentDayName.toUpperCase()})` 
      : 'CLASSROOM STATUS BOARD';

    const subCount = activeTab === 'rooms' ? filteredClassrooms.length : filteredSchedules.length;
    const countLabel = activeTab === 'rooms' ? 'Active Rooms' : 'Class Routines';

    doc.text(`Active Frame: ${viewNameObj}`, docWidth - 106, 18);
    doc.text(`Total Records: ${subCount} ${countLabel}`, docWidth - 106, 22);
    doc.text(`Export Timestamp: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date().toLocaleTimeString()}`, docWidth - 106, 26);

    // Adjusting content pointer
    let currentY = 48;

    if (activeTab === 'rooms') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('SSCT PHYSICAL CLASSROOMS & SEATING OCCUPANCY MATRIX', 14, currentY);
      currentY += 6;

      const bodyData = filteredClassrooms.map((room, idx) => {
        const liveStatus = getLiveRoomStatus(room.id);
        const weeklyClasses = masterSchedules.filter(s => s.classroomId === room.id);
        return [
          (idx + 1).toString(),
          room.name,
          room.building,
          `${room.capacity} Students`,
          liveStatus.text,
          `${weeklyClasses.length} Booked Class${weeklyClasses.length !== 1 ? 'es' : ''} on Schedule`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Classroom Name', 'Building Location', 'Max Seating Capacity', 'Live Occupancy Status Now', 'Total Weekly Allocations']],
        body: bodyData,
        headStyles: { fillColor: [40, 50, 71] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'striped',
        margin: { left: 14, right: 14 }
      });

    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('ACADEMIC LECTURE & LAB CLASS ROUTINE PORTAL', 14, currentY);
      currentY += 6;

      const bodyData = filteredSchedules.map((s, idx) => {
        const sub = subjects.find(sub => sub.id === s.subjectId);
        const rm = classrooms.find(r => r.id === s.classroomId);
        const inst = instructors.find(i => i.id === s.instructorId) || getUsers().find(u => u.id === s.instructorId);

        return [
          (idx + 1).toString(),
          sub?.code || 'IT-SUB',
          sub?.name || 'Curriculum Course Selection',
          s.dayOfWeek,
          `${s.startTime} - ${s.endTime}`,
          `${rm?.name || 'N/A'} (${rm?.building || 'Main campus'})`,
          inst?.fullName || 'SSCT Faculty'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Course Code', 'Subject Full Title', 'Routine Day', 'Allocated Hours Slot', 'Assigned Room & building', 'Assigned Instructor']],
        body: bodyData,
        headStyles: { fillColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'striped',
        margin: { left: 14, right: 14 }
      });
    }

    // Footnote page numbers
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Official Academic routine ledger distributed through client portals. Page ${i} of ${totalPages}`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text('Surigao State College of Technology Office of the Registrar © 2026', docWidth - 110, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`SSCT_Lecture_Schedule_Docket_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="student-schedule-container">
      
      {/* Dynamic Header Deck */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-syne flex items-center gap-3 tracking-tight">
            Academic Schedule Board
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse hidden sm:inline" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 uppercase tracking-wider font-semibold">
            SSCT listing repositories, live classroom availability, and active scheduler engine dockets.
          </p>
        </div>

        {/* Dynamic header control action blocks */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active UTC status indicator */}
          <div className="px-4 py-2.5 bg-neutral-900 border border-white/[0.06] rounded-xl text-[10px] font-mono tracking-widest text-[#9ca3af] flex items-center gap-2 shadowing-sky">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>Live Today: <strong className="font-extrabold text-white uppercase">{currentDayName}</strong></span>
          </div>

          {/* Printable elegant PDF Document down-loader button */}
          <button
            type="button"
            onClick={generatePDFExport}
            className="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/10 text-[10px] font-extrabold uppercase tracking-widest px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-[0_4px_14px_rgba(6,182,212,0.3)] active:scale-95 duration-100"
            title="Download formatted routine schedules matching current selected filters to PDF"
          >
            <FileDown className="w-4 h-4 text-white" />
            <span>Export View to PDF</span>
          </button>
        </div>
      </div>

      {/* Primary Subtab Selector Switch */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-white/[0.03] pb-3">
        <button
          onClick={() => { setActiveTab('all'); setSearchQuery(''); setDayFilter('All'); }}
          className={`cursor-pointer px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${
            activeTab === 'all' 
              ? 'bg-white text-black border-transparent shadow-lg' 
              : 'text-zinc-400 hover:text-white bg-white/[0.03] border-white/[0.08]'
          }`}
        >
          My Weekly Schedule
        </button>

        <button
          onClick={() => { setActiveTab('today'); setSearchQuery(''); }}
          className={`cursor-pointer px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2 border ${
            activeTab === 'today' 
              ? 'bg-white text-black border-transparent shadow-lg' 
              : 'text-zinc-400 hover:text-white bg-white/[0.03] border-white/[0.08]'
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
          </span>
          Today's Routine Classes
        </button>

        <button
          onClick={() => { setActiveTab('rooms'); setSearchQuery(''); }}
          className={`cursor-pointer px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${
            activeTab === 'rooms' 
              ? 'bg-white text-black border-transparent shadow-lg' 
              : 'text-zinc-400 hover:text-white bg-white/[0.03] border-white/[0.08]'
          }`}
        >
          Room Availabilities & registries
        </button>
      </div>

      {/* Filter and query rows */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-5 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
            <Search className="w-4 h-4 text-zinc-500" />
          </span>
          <input
            type="text"
            placeholder={activeTab === 'rooms' ? "Filter classrooms by name or building location..." : "Filter routine list by course code, title, classroom room number or instructor..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050505] border border-white/[0.1] text-xs text-white rounded-xl pl-11 pr-4 py-3 focus:outline-hidden focus:border-white/40 transition-colors placeholder:text-zinc-600 font-sans"
          />
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">Routine Day:</span>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="bg-[#050505] border border-white/[0.1] text-xs text-white rounded-xl px-4 py-3 outline-hidden cursor-pointer"
            >
              {days.map(d => (
                <option key={d} value={d} className="bg-[#050505] text-white">{d}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">Building / Wing:</span>
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="bg-[#050505] border border-white/[0.1] text-xs text-white rounded-xl px-4 py-[#11px] outline-hidden cursor-pointer font-medium"
            >
              <option value="All" className="bg-[#050505] text-white">All Buildings</option>
              {uniqueBuildings.map(b => (
                <option key={b} value={b} className="bg-[#050505] text-white">{b}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Real-time Toast Messages inside Workspace */}
      <AnimatePresence>
        {successAnimation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-cyan-400.shrink-0" />
            <span>{successAnimation}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary views grid panel */}
      {activeTab !== 'rooms' ? (
        filteredSchedules.length === 0 ? (
          <div className="p-16 text-center bg-white/[0.01] border border-dashed border-white/[0.08] rounded-2xl text-zinc-500 text-xs uppercase tracking-widest font-semibold leading-relaxed">
            {activeTab === 'today' 
              ? `There are no scheduled lecture routines compiled for Today (${currentDayName}). Enjoy your self-study!` 
              : "No booked routine schedules match your active filter criteria."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchedules.map(sched => {
              const subject = subjects.find(s => s.id === sched.subjectId);
              const room = classrooms.find(r => r.id === sched.classroomId);
              const inst = instructors.find(i => i.id === sched.instructorId) || 
                           getUsers().find(u => u.id === sched.instructorId);

              return (
                <div
                  key={sched.id}
                  className="bg-white/[0.01] border border-white/[0.05] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="text-[10px] font-bold font-mono text-white bg-white/[0.05] border border-white/[0.1] px-2.5 py-1 rounded-lg uppercase tracking-wider">
                        {subject?.code || 'IT-SUB'}
                      </span>
                      
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-350 bg-[#050505] px-2.5 py-1 rounded-lg border border-white/[0.03]">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{sched.startTime} - {sched.endTime}</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-extrabold text-white leading-snug group-hover:text-zinc-300 transition-colors mt-2">
                      {subject?.name || 'Class Curriculum Core Course'}
                    </h4>

                    {/* Weekday indicator */}
                    <div className="mt-3.5 py-1 px-2.5 bg-[#050505] rounded-lg max-w-max text-[9px] text-zinc-400 font-mono font-bold flex items-center gap-1.5 uppercase tracking-widest border border-white/[0.05]">
                      <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span>{sched.dayOfWeek} Routine</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/[0.05] text-xs text-zinc-400 space-y-2.5 font-sans">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-550 shrink-0 mt-0.5" />
                        <span>Room: <strong className="text-white font-medium">{room?.name || 'Generic Room'}</strong> ({room?.building || 'Main campus'})</span>
                      </p>
                      
                      <p className="flex items-start gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-zinc-550 shrink-0 mt-0.5" />
                        <span>Instructor: <strong className="text-white font-medium">{inst?.fullName || 'Teaching Faculty'}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                    <span className="text-zinc-650 font-mono">ID: {sched.id}</span>
                    
                    {/* If editable, allow them to manage schedules right in the card */}
                    {isWritable ? (
                      <button
                        onClick={() => {
                          setEditingRoomId(sched.classroomId);
                          // Autofill form
                          setNewDayOfWeek(sched.dayOfWeek);
                          setNewStartTime(sched.startTime);
                          setNewEndTime(sched.endTime);
                          setNewSubjectId(sched.subjectId);
                          if (currentUser?.role === 'admin') {
                            setNewInstructorId(sched.instructorId);
                          }
                        }}
                        className="cursor-pointer font-bold text-cyan-400 hover:text-white transition uppercase tracking-widest text-[9px] flex items-center gap-1 bg-cyan-950/20 px-2 py-1 rounded border border-cyan-500/20"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Room Alloc
                      </button>
                    ) : (
                      <span className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] flex items-center gap-1.5 font-sans mb-0.5">
                        <Eye className="w-3.5 h-3.5 text-zinc-600" />
                        Secured View
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Classroom registries lists. Integrated with Live Room Availability + collapsible Weekly routine list + Schedule custom assignments */
        filteredClassrooms.length === 0 ? (
          <div className="p-16 text-center bg-white/[0.01] border border-dashed border-white/[0.08] rounded-2xl text-zinc-500 text-xs uppercase tracking-widest font-semibold leading-relaxed">
            No registered classrooms match your criteria or location query.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClassrooms.map(room => {
                const liveAvail = getLiveRoomStatus(room.id);
                const roomSchedules = masterSchedules
                  .filter(s => s.classroomId === room.id)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={room.id}
                    className="bg-white/[0.01] border border-white/[0.05] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group shadow-lg relative"
                    id={`classroom-card-${room.id}`}
                  >
                    <div>
                      {/* Live availability indicator bar on top */}
                      <div className="flex items-center justify-between gap-2.5 mb-4">
                        <span className="px-2.5 py-1 bg-white/[0.05] border border-white/[0.1] text-zinc-300 text-[8.5px] font-black rounded-lg uppercase tracking-widest">
                          {room.building}
                        </span>

                        <div className={`px-2.5 py-1 rounded-lg border text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          liveAvail.isOccupied 
                            ? 'bg-rose-950/40 border-rose-500/30 text-rose-300 animate-pulse' 
                            : liveAvail.status === 'upcoming'
                            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                            : 'bg-emerald-905/40 border-emerald-500/30 text-emerald-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${liveAvail.isOccupied ? 'bg-rose-450' : liveAvail.status === 'upcoming' ? 'bg-amber-450' : 'bg-emerald-450'}`} />
                          <span>{liveAvail.isOccupied ? 'Occupied' : 'Vacant Now'}</span>
                        </div>
                      </div>

                      <h4 className="text-base font-extrabold text-white mt-2 tracking-tight flex items-center gap-2">
                        <Building className="w-4 h-4 text-zinc-550 shrink-0" />
                        {room.name}
                      </h4>

                      <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2 italic leading-relaxed">
                        Live Status: {liveAvail.text}
                      </p>

                      <div className="mt-4 pt-3.5 border-t border-white/[0.03] space-y-1.5 text-xs text-zinc-500">
                        <div className="flex items-center justify-between">
                          <span>Capacity Limit:</span>
                          <strong className="text-white font-semibold flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-zinc-400" />
                            {room.capacity} students
                          </strong>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>Booked Lectures:</span>
                          <strong className="text-white font-semibold font-mono">
                            {roomSchedules.length} periods slotted
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Nested actions */}
                    <div className="mt-6 pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setExpandedRoomId(expandedRoomId === room.id ? null : room.id);
                        }}
                        className="cursor-pointer py-2 px-3 border border-white/10 hover:border-white/30 text-[9px] font-black text-zinc-300 uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1 bg-[#050505] active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{expandedRoomId === room.id ? 'Hide Timetable' : 'View Timetable'}</span>
                      </button>

                      {isWritable ? (
                        <button
                          onClick={() => {
                            setEditingRoomId(room.id);
                            setEditFormError(null);
                            // Set defaults for the forms
                            setNewSubjectId('');
                            setNewDayOfWeek('Monday');
                            setNewStartTime('08:00');
                            setNewEndTime('09:30');
                          }}
                          className="cursor-pointer py-1.5 px-3 bg-white hover:bg-zinc-200 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign Subject</span>
                        </button>
                      ) : (
                        <span className="text-[8px] font-mono tracking-widest uppercase text-zinc-650 text-right self-center py-1">
                          Room ID: {room.id}
                        </span>
                      )}
                    </div>

                    {/* Expandable full weekly schedule panel for students */}
                    <AnimatePresence>
                      {expandedRoomId === room.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-white/[0.08] overflow-hidden"
                        >
                          <p className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2">Weekly Rutinary Allotments:</p>
                          {roomSchedules.length === 0 ? (
                            <p className="text-[10px] text-zinc-550 italic py-2">No schedules are booked on this classroom yet.</p>
                          ) : (
                            <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
                              {roomSchedules.map(s => {
                                const sub = subjects.find(course => course.id === s.subjectId);
                                const instProf = instructors.find(i => i.id === s.instructorId) || getUsers().find(u => u.id === s.instructorId);

                                return (
                                  <div key={s.id} className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl flex items-center justify-between gap-2.5">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black text-white truncate">[{sub?.code || 'N/A'}] {sub?.name}</p>
                                      <span className="text-[8.5px] text-zinc-400 font-mono">{s.dayOfWeek}s | {s.startTime} - {s.endTime}</span>
                                    </div>
                                    <span className="shrink-0 text-[8px] bg-white/[0.04] px-1.5 py-0.5 rounded text-zinc-500 font-semibold truncate max-w-[80px]">
                                      {instProf?.fullName?.split(' ')[1] || 'Staff'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* 🔐 EXCLUSIVE AND INTERACTIVE SIDE MODAL: ASIGN & EDIT ROOM SCHEDULE SLOT */}
      <AnimatePresence>
        {editingRoomId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-150 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="w-full max-w-[640px] bg-[#0c0c0d] border border-white/[0.1] rounded-3xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header block with Room specifics */}
              <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white font-syne uppercase tracking-wider">
                    Schedules Allocation Manager
                  </h3>
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5 uppercase tracking-widest font-extrabold">
                    Classroom: {classrooms.find(rm => rm.id === editingRoomId)?.name} ({classrooms.find(rm => rm.id === editingRoomId)?.building})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingRoomId(null);
                    setEditFormError(null);
                  }}
                  className="cursor-pointer p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-zinc-450 hover:text-white transition-all active:scale-95 duration-100"
                  aria-label="Close scheduler panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Core Layout */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin">
                
                {/* ⚠️ Dynamic Notification messages */}
                {editFormError && (
                  <div className="p-4 bg-red-955/20 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-shake">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{editFormError}</span>
                  </div>
                )}

                {/* Direct Schedule Assigned Editor Form */}
                <form onSubmit={handleSaveRoomSchedule} className="space-y-4 bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase font-black tracking-widest text-[#9ca3af]">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Assign academic Subject routine details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Assigned Syllabus course</label>
                      <select
                        required
                        value={newSubjectId}
                        onChange={(e) => setNewSubjectId(e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.1] focus:border-white text-xs text-white rounded-xl px-4 py-3 cursor-pointer outline-hidden transition"
                      >
                        <option value="">Select Course Slot</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id} className="bg-black text-white">[{s.code}] {s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Routine Day</label>
                      <select
                        required
                        value={newDayOfWeek}
                        onChange={(e) => setNewDayOfWeek(e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.1] focus:border-white text-xs text-white rounded-xl px-4 py-3 cursor-pointer outline-hidden transition"
                      >
                        {daysList.map(d => (
                          <option key={d} value={d} className="bg-black text-white">{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Start Time (24h clock)</label>
                      <input
                        type="time"
                        required
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.1] focus:border-white text-xs font-mono text-white rounded-xl px-4 py-3 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">End Time (24h clock)</label>
                      <input
                        type="time"
                        required
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.1] focus:border-white text-xs font-mono text-white rounded-xl px-4 py-3 transition"
                      />
                    </div>

                    {currentUser?.role === 'admin' ? (
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Academic Instructor</label>
                        <select
                          required
                          value={newInstructorId}
                          onChange={(e) => setNewInstructorId(e.target.value)}
                          className="w-full bg-[#050505] border border-white/[0.1] focus:border-white text-xs text-white rounded-xl px-4 py-3 cursor-pointer outline-hidden transition"
                        >
                          <option value="">Choose Instructor</option>
                          {instructors.map(inst => (
                            <option key={inst.id} value={inst.id} className="bg-black text-white">{inst.fullName}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <div className="bg-[#050505] px-4 py-3 rounded-xl border border-white/[0.05] text-[10.5px] text-zinc-400">
                          Assigned Faculty: <strong className="text-white">{currentUser?.fullName}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="cursor-pointer bg-white hover:bg-zinc-200 text-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-widest font-black transition flex items-center gap-1.5 active:scale-95 duration-100 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Assigned routine Class
                    </button>
                  </div>
                </form>

                {/* Room schedule occupancy timeline display */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-[#9ca3af]">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Current Active Room Timetable Bookings ({masterSchedules.filter(s => s.classroomId === editingRoomId).length})</span>
                  </div>

                  {masterSchedules.filter(s => s.classroomId === editingRoomId).length === 0 ? (
                    <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/[0.08] rounded-xl text-zinc-500 text-xs">
                      This classroom has no assigned routine schedule periods.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-thin">
                      {masterSchedules
                        .filter(s => s.classroomId === editingRoomId)
                        .sort((a,b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime))
                        .map(s => {
                          const subClassObj = subjects.find(c => c.id === s.subjectId);
                          const assignedFac = instructors.find(i => i.id === s.instructorId) || getUsers().find(u => u.id === s.instructorId);

                          return (
                            <div key={s.id} className="bg-white/[0.01] border border-white/[0.05] hover:border-white/15 p-3.5 rounded-2xl flex items-center justify-between gap-4 transition duration-200">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black font-mono text-cyan-400 tracking-wider">
                                    {subClassObj?.code || 'IT-311'}
                                  </span>
                                  <span className="text-zinc-[#71717a] text-xs">|</span>
                                  <span className="text-xs font-bold text-white uppercase">{s.dayOfWeek}s</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 font-sans mt-1.5 truncate max-w-[320px]">
                                  Course: {subClassObj?.name || 'Class slot'}
                                </p>
                                <p className="text-[9px] text-zinc-550 font-mono mt-0.5">
                                  Hours: {s.startTime} - {s.endTime} | Prof: {assignedFac?.fullName || 'N/A'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteRoomSchedule(s.id)}
                                className={`cursor-pointer px-3 py-2 transition-all duration-200 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                  deleteConfirmSchedId === s.id
                                    ? 'bg-rose-650 hover:bg-rose-550 text-white border border-rose-500 shadow-[0_4px_12px_rgba(239,68,68,0.3)] animate-pulse'
                                    : 'bg-rose-955/10 hover:bg-rose-600 hover:text-white border border-rose-500/10 text-rose-450'
                                }`}
                                title={deleteConfirmSchedId === s.id ? "Click again to confirm delete" : "Remove routine slot"}
                              >
                                {deleteConfirmSchedId === s.id ? (
                                  <span>Sure?</span>
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[8.5px] uppercase font-black tracking-widest">Delete</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>

              </div>

              {/* Close row */}
              <div className="p-6 bg-[#09090a] border-t border-white/[0.06] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoomId(null);
                    setEditFormError(null);
                  }}
                  className="cursor-pointer px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-[10px] text-zinc-450 uppercase tracking-widest font-black transition"
                >
                  Done Managing Room
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
