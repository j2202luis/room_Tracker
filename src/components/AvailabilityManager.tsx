import React, { useState } from 'react';
import { getAvailability, saveAvailability, getUsers } from '../db';
import { InstructorAvailability } from '../types';
import { Plus, Trash2, Hexagon, Clock, CheckCircle, FileDown } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AvailabilityManager: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isInstructor = currentUser?.role === 'instructor';
  const isStudent = currentUser?.role === 'student';
  const isWritable = isAdmin || isInstructor;
  const canSelectInstructor = isAdmin || isStudent;

  const [availList, setAvailList] = useState<InstructorAvailability[]>(getAvailability());
  
  // States
  const [targetInstructorId, setTargetInstructorId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');

  // List of instructors to choose from
  const instructors = getUsers().filter(u => u.role === 'instructor' && u.isApproved);

  // Filter list by selected instructor
  const filterInstructorId = canSelectInstructor ? targetInstructorId : (currentUser?.id || '');
  const activeAvail = availList.filter(a => a.instructorId === filterInstructorId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterInstructorId) return;

    const newAvail: InstructorAvailability = {
      id: `avail-${Date.now()}`,
      instructorId: filterInstructorId,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: true
    };

    const updated = [...availList, newAvail];
    setAvailList(updated);
    saveAvailability(updated);

    // Reset fields
    setStartTime('08:00');
    setEndTime('12:00');
  };

  const handleDelete = (id: string) => {
    const updated = availList.filter(a => a.id !== id);
    setAvailList(updated);
    saveAvailability(updated);
  };

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // landscape PDF compilation exporter
  const generateAvailabilityPDF = () => {
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
    doc.text('FACULTY CONSULTATION & AVAILABILITY TRACKING', 14, 21);
    doc.text('Generated PDF Availability Docket — Restricted Official Distribution Only', 14, 26);

    // Live metadata block
    doc.setFillColor(28, 33, 41);
    doc.rect(docWidth - 110, 8, 96, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('OFFICIAL REPORT SUMMARY', docWidth - 106, 13);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    
    // figure out instructor name
    const instr = targetInstructorId ? instructors.find(i => i.id === targetInstructorId) : null;
    const instructorNameText = targetInstructorId ? (instr?.fullName || 'Selected Instructor') : (isAdmin ? 'All Instructors' : 'My Schedule');

    doc.text(`Active Frame: ${instructorNameText}`, docWidth - 106, 18);
    doc.text(`Total Records: ${activeAvail.length} Slots`, docWidth - 106, 22);
    doc.text(`Export Timestamp: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date().toLocaleTimeString()}`, docWidth - 106, 26);

    let currentY = 48;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('INSTRUCTOR WEEKLY AVAILABILITY LOG', 14, currentY);
    currentY += 6;

    const bodyData = activeAvail.map((slot, idx) => {
      const inst = instructors.find(i => i.id === slot.instructorId);
      
      return [
        (idx + 1).toString(),
        inst?.fullName || (currentUser?.role === 'instructor' && currentUser.id === slot.instructorId ? currentUser.fullName : 'Faculty Member'),
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Instructor Name', 'Day of Week', 'From Time', 'To Time']],
      body: bodyData,
      headStyles: { fillColor: [40, 50, 71] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'striped',
      margin: { left: 14, right: 14 }
    });

    doc.save(`ssct_instructor_availability_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="availability-panel">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white uppercase tracking-wider font-syne">
            Instructor Availability
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
            {isWritable 
              ? 'Catalog routine hours that instructors are available on campus for scheduling or consultation.' 
              : 'View assigned active availability blocks for SSCT faculty staff.'}
          </p>
        </div>
        
        {/* Printable elegant PDF Document down-loader button */}
        <button
          type="button"
          onClick={generateAvailabilityPDF}
          className="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/10 text-[10px] font-extrabold uppercase tracking-widest px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-[0_4px_14px_rgba(6,182,212,0.3)] active:scale-95 duration-100"
          title="Download instructor availability slots to PDF"
        >
          <FileDown className="w-4 h-4 text-white" />
          <span>Export Availability to PDF</span>
        </button>
      </div>

      {/* Admin or Student Select Instructor Row */}
      {canSelectInstructor && (
        <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <label className="text-[10px] font-extrabold text-[#9ca3af] uppercase tracking-widest shrink-0">
            {isStudent ? 'Choose Faculty Member for Consultation:' : 'Select Instructor Profile:'}
          </label>
          <select
            value={targetInstructorId}
            onChange={(e) => setTargetInstructorId(e.target.value)}
            className="bg-[#050505] border border-white/10 text-xs text-white rounded-xl px-4 py-2.5 shrink-0 sm:w-64 outline-hidden cursor-pointer selection:bg-neutral-800"
          >
            <option value="" className="bg-black text-white">Choose Instructors...</option>
            {instructors.map(inst => (
              <option key={inst.id} value={inst.id} className="bg-black text-white">{inst.fullName} ({inst.email})</option>
            ))}
          </select>
        </div>
      )}

      {/* Add New Slot if permissions allow */}
      {isWritable && (
        <AnimatePresence>
          {(!isAdmin || targetInstructorId) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl"
            >
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-white font-syne mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span>Declare Available Office/Lecture Hours</span>
              </h3>

              <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-5 items-end">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Weekday</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 focus:border-white text-xs text-white rounded-xl px-4 py-3 font-sans cursor-pointer transition"
                  >
                    {daysList.map(d => (
                      <option key={d} value={d} className="bg-black text-white">{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">From Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 focus:border-white text-xs text-white rounded-xl px-4 py-3 font-mono cursor-pointer transition"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">To Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 focus:border-white text-xs text-white rounded-xl px-4 py-3 font-mono cursor-pointer transition"
                  />
                </div>

                <button
                  type="submit"
                  className="cursor-pointer h-[46px] bg-white hover:bg-zinc-200 text-black text-[10px] font-extrabold uppercase tracking-widest rounded-xl px-6 transition duration-150 flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Save Available Slot
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Available Slots Display */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-white" />
          <h3 className="font-extrabold text-[10px] text-white uppercase tracking-widest">
            {isWritable ? (isAdmin ? 'Active Hours Catalog' : 'My Weekly Availability Slots') : 'Faculty Scheduled Consultation Blocks'}
          </h3>
        </div>

        {(!canSelectInstructor || targetInstructorId) ? (
          activeAvail.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
              No availability hours declared for this instructor profile.
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeAvail.map(slot => (
                <div 
                  key={slot.id}
                  className="bg-white/[0.01] border border-white/[0.06] hover:border-white/20 rounded-2xl p-6 flex items-center justify-between transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{slot.dayOfWeek}</span>
                      <p className="text-xs text-white font-mono font-bold mt-0.5">{slot.startTime} - {slot.endTime}</p>
                    </div>
                  </div>

                  {isWritable && (
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="cursor-pointer text-zinc-500 hover:text-white transition duration-200 p-1.5 hover:bg-white/5 rounded-md"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
            Please choose an instructor profile above to manage or view availability slots.
          </div>
        )}
      </div>
    </div>
  );
};
