import React, { useState } from 'react';
import { getSchedules, saveSchedules, getClassrooms, getSubjects, getUsers } from '../db';
import { Schedule } from '../types';
import { Plus, Trash2, Edit2, Hexagon, Save, Calendar, Clock, AlertTriangle, FileDown } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SchedulesManager: React.FC = () => {
  const { currentUser } = useAuth();
  const isWritable = currentUser?.role === 'admin' || currentUser?.role === 'instructor';
  
  const [schedules, setSchedules] = useState<Schedule[]>(getSchedules());
  
  // Data options
  const classrooms = getClassrooms();
  const subjects = getSubjects();
  const instructors = getUsers().filter(u => u.role === 'instructor' && u.isApproved);

  // Filter schedules by instructor if instructor role
  const displaySchedules = currentUser?.role === 'instructor' 
    ? schedules.filter(s => s.instructorId === currentUser.id) 
    : schedules;

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const docWidth = doc.internal.pageSize.getWidth();

    // Elegant Top Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, docWidth, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SURIGAO STATE COLLEGE OF TECHNOLOGY', 14, 13);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(190, 200, 210);
    doc.text('CLASSROOM TRACKER & ROUTINE INVENTORY - INSTRUCTOR CONTROL PORTAL', 14, 19);
    doc.text(`Official Academic Routine Sheet — Generated under authorized session`, 14, 24);

    // Summary block in PDF
    doc.setFillColor(28, 33, 41);
    doc.rect(docWidth - 110, 7, 96, 21, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('DOCKET SUMMARY', docWidth - 106, 12);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Active Account: ${currentUser?.fullName}`, docWidth - 106, 16);
    doc.text(`Active Schedules: ${displaySchedules.length} periods slotted`, docWidth - 106, 20);

    let currentY = 46;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('ACADEMIC LECTURE & BOOKING TIMETABLE DOCKET', 14, currentY);
    currentY += 6;

    const bodyData = displaySchedules.map((s, idx) => {
      const sub = subjects.find(sub => sub.id === s.subjectId);
      const rm = classrooms.find(r => r.id === s.classroomId);
      const inst = instructors.find(i => i.id === s.instructorId) || getUsers().find(u => u.id === s.instructorId);

      return [
        (idx + 1).toString(),
        sub?.code || 'IT-SUB',
        sub?.name || 'Academic Course Title',
        s.dayOfWeek,
        `${s.startTime} - ${s.endTime}`,
        `${rm?.name || 'N/A'} (${rm?.building || 'Main campus'})`,
        inst?.fullName || 'SSCT Faculty'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Syllabus Code', 'Subject Title', 'Routine Day', 'Allocated Hours Slot', 'Classroom Space & Location', 'Teaching Professor']],
      body: bodyData,
      headStyles: { fillColor: [40, 50, 71] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'striped',
      margin: { left: 14, right: 14 }
    });

    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Official Academic routing schedule. Generated through Secure portal system. Page ${i} of ${totalPages}`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text('Surigao State College of Technology © 2026', docWidth - 85, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`SSCT_Faculty_Schedules_Report_${Date.now()}.pdf`);
  };

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [instructorId, setInstructorId] = useState(currentUser?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [deleteConfirmSchedId, setDeleteConfirmSchedId] = useState<string | null>(null);

  const resetForm = () => {
    setSubjectId('');
    setClassroomId('');
    setInstructorId(currentUser?.id || '');
    setDayOfWeek('Monday');
    setStartTime('08:00');
    setEndTime('09:30');
    setConflictError(null);
    setIsAdding(false);
    setEditingId(null);
  };

  // Check Schedule overlaps
  const checkOverlap = (
    schedId: string | null,
    cId: string,
    day: string,
    start: string,
    end: string
  ): boolean => {
    const startMins = convertTimeToMinutes(start);
    const endMins = convertTimeToMinutes(end);

    // Filter out the active schedule we are currently editing
    const otherSchedules = schedules.filter(s => s.id !== schedId);

    // Check if classroom is occupied at that day & time slot
    for (const other of otherSchedules) {
      if (other.classroomId === cId && other.dayOfWeek === day) {
        const oStart = convertTimeToMinutes(other.startTime);
        const oEnd = convertTimeToMinutes(other.endTime);

        // Overlap condition: start < other.end && end > other.start
        if (startMins < oEnd && endMins > oStart) {
          return true;
        }
      }
    }
    return false;
  };

  const convertTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!subjectId || !classroomId || (currentUser?.role === 'admin' && !instructorId)) {
      setConflictError('Please complete all form selection fields.');
      return;
    }

    const startMins = convertTimeToMinutes(startTime);
    const endMins = convertTimeToMinutes(endTime);

    if (startMins >= endMins) {
      setConflictError('Start time must be strictly before end time.');
      return;
    }

    // Check overlaps
    const finalInstId = currentUser?.role === 'admin' ? instructorId : (currentUser?.id || '');
    const hasConflict = checkOverlap(editingId, classroomId, dayOfWeek, startTime, endTime);

    if (hasConflict) {
      const selectedRoom = classrooms.find(r => r.id === classroomId);
      setConflictError(`Schedule Conflict: Classroom "${selectedRoom?.name || 'Selected Room'}" is already scheduled on ${dayOfWeek}s at this time slot.`);
      return;
    }

    let updatedList: Schedule[];

    if (editingId) {
      updatedList = schedules.map(s => 
        s.id === editingId 
          ? { ...s, subjectId, classroomId, instructorId: finalInstId, dayOfWeek, startTime, endTime }
          : s
      );
    } else {
      const newSchedule: Schedule = {
        id: `sched-${Date.now()}`,
        subjectId,
        classroomId,
        instructorId: finalInstId,
        dayOfWeek,
        startTime,
        endTime
      };
      updatedList = [...schedules, newSchedule];
    }

    setSchedules(updatedList);
    saveSchedules(updatedList);
    resetForm();
  };

  const handleEdit = (sched: Schedule) => {
    setEditingId(sched.id);
    setSubjectId(sched.subjectId);
    setClassroomId(sched.classroomId);
    setInstructorId(sched.instructorId);
    setDayOfWeek(sched.dayOfWeek);
    setStartTime(sched.startTime);
    setEndTime(sched.endTime);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmSchedId === id) {
      const updatedList = schedules.filter(s => s.id !== id);
      setSchedules(updatedList);
      saveSchedules(updatedList);
      setDeleteConfirmSchedId(null);
    } else {
      setDeleteConfirmSchedId(id);
      setTimeout(() => {
        setDeleteConfirmSchedId(curr => curr === id ? null : curr);
      }, 4000);
    }
  };

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-8 animate-fade-in" id="schedules-panel">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white uppercase tracking-wider font-syne">
            Class Schedules
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
            {isWritable 
              ? 'Arrange days, times, and teaching spaces. Built-in system flags physical room booking conflicts.' 
              : 'View class routines, specific subject classroom allotments, and times.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportPDF}
            className="cursor-pointer bg-neutral-900 hover:bg-neutral-800 border border-white/[0.08] text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            title="Export routine dockets to landscape printable PDF"
          >
            <FileDown className="w-4 h-4 text-cyan-400" />
            Export to PDF
          </button>

          {isWritable && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="cursor-pointer bg-white hover:bg-zinc-200 text-black text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Book Class Schedule
            </button>
          )}
        </div>
      </div>

      {/* Overlapping conflict warning & adding forms */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl relative"
          >
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-white font-syne mb-6 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white" />
              {editingId ? 'Modify Booked Schedule Block' : 'Book a New Schedule Block'}
            </h3>

            {conflictError && (
              <div className="mb-4 p-4 bg-red-955/20 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{conflictError}</span>
              </div>
            )}
            
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-end">
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Syllabus Subject</label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans cursor-pointer transition"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-black text-white">[{sub.code}] {sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Classroom Space</label>
                <select
                  required
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans cursor-pointer transition"
                >
                  <option value="">Select Classroom</option>
                  {classrooms.map(room => (
                    <option key={room.id} value={room.id} className="bg-black text-white">{room.name} ({room.building})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Routine Day</label>
                <select
                  required
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans cursor-pointer transition"
                >
                  {daysList.map(day => (
                    <option key={day} value={day} className="bg-black text-white">{day}</option>
                  ))}
                </select>
              </div>

              {currentUser?.role === 'admin' ? (
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Assign Instructor</label>
                  <select
                    required
                    value={instructorId}
                    onChange={(e) => setInstructorId(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans cursor-pointer transition"
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.id} className="bg-black text-white">{inst.fullName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col justify-end">
                  <div className="bg-white/[0.02] px-4 py-2.5 rounded-xl border border-white/10 text-xs text-zinc-400 truncate">
                    Instructor: <strong className="text-white">{currentUser?.fullName}</strong>
                  </div>
                </div>
              )}

              <div className="sm:col-span-1">
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Start Time (24h)</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-mono cursor-pointer transition"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">End Time (24h)</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-mono cursor-pointer transition"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="cursor-pointer bg-transparent border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-extrabold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-extrabold transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Schedule Slot
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid displays grouped by Day */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-white" />
          <h3 className="font-extrabold text-[10px] text-white uppercase tracking-widest">
            Routine Schedules Table
          </h3>
        </div>

        {displaySchedules.length === 0 ? (
          <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
            No class schedules are booked in the tracker yet.
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {daysList.map(day => {
              const daySchedules = displaySchedules.filter(s => s.dayOfWeek === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              if (daySchedules.length === 0) return null;

              return (
                <div key={day} className="space-y-4">
                  <h4 className="border-l border-white pl-3 text-[10px] font-black text-zinc-300 uppercase tracking-widest font-syne">
                    {day}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {daySchedules.map(sched => {
                       const subject = subjects.find(s => s.id === sched.subjectId);
                       const room = classrooms.find(r => r.id === sched.classroomId);
                       const inst = instructors.find(i => i.id === sched.instructorId) || 
                                    getUsers().find(u => u.id === sched.instructorId);

                       return (
                        <motion.div
                          key={sched.id}
                          layout
                          className="bg-white/[0.01] border border-white/[0.06] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group relative"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <span className="text-[8px] font-black font-mono text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {subject?.code || 'IT-SUB'}
                              </span>
                              
                              <div className="flex items-center gap-1 text-[8px] font-black font-mono text-zinc-400 bg-white/5 px-2.5 py-0.5 border border-white/5 rounded-full">
                                <Clock className="w-3 h-3 text-white" />
                                <span>{sched.startTime} - {sched.endTime}</span>
                              </div>
                            </div>

                            <h5 className="text-sm font-bold text-white leading-tight uppercase tracking-wide">
                              {subject?.name || 'Unknown Subject'}
                            </h5>

                            <p className="text-[10px] text-zinc-400 mt-3 font-mono flex items-center gap-1.5 uppercase tracking-wider font-medium">
                              <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0 animate-pulse" />
                              <span>{room?.name || 'Classroom Space'} ({room?.building || 'Main Block'})</span>
                            </p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold max-w-[140px] truncate">
                              Prof: {inst?.fullName || 'Academic Faculty'}
                            </span>

                            {isWritable && (
                              <div className={`flex items-center gap-1.5 transition-all duration-200 ${
                                deleteConfirmSchedId === sched.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}>
                                {deleteConfirmSchedId === sched.id ? (
                                  <button
                                    onClick={() => handleDelete(sched.id)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white border border-rose-550 rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-[0_4px_12px_rgba(239,68,68,0.3)] flex items-center gap-1 animate-pulse"
                                    title="Click again to confirm delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Confirm?</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEdit(sched)}
                                      className="p-1 px-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition"
                                      title="Edit schedule"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(sched.id)}
                                      className="p-1 px-1.5 text-rose-450 hover:text-rose-400 hover:bg-rose-955/10 rounded-md transition"
                                      title="Delete schedule"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
