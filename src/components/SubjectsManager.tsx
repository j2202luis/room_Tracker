import React, { useState } from 'react';
import { getSubjects, saveSubjects, getUsers, getEnrollments } from '../db';
import { Subject, Enrollment } from '../types';
import { Plus, Trash2, Edit2, Hexagon, Save, Search, FileText, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const SubjectsManager: React.FC = () => {
  const { currentUser } = useAuth();
  const isWritable = currentUser?.role === 'admin' || currentUser?.role === 'instructor';
  
  const [subjects, setSubjects] = useState<Subject[]>(getSubjects());
  const [enrollments, setEnrollments] = useState<Enrollment[]>(getEnrollments());
  const [allUsers] = useState(getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [instructorId, setInstructorId] = useState(currentUser?.id || '');

  // Get available instructors to assign (Admin view)
  const instructers = getUsers().filter(u => u.role === 'instructor' && u.isApproved);

  const resetForm = () => {
    setCode('');
    setName('');
    setInstructorId(currentUser?.id || '');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    let updatedList: Subject[];

    if (editingId) {
      updatedList = subjects.map(s => 
        s.id === editingId 
          ? { ...s, code: code.toUpperCase().trim(), name: name.trim(), instructorId }
          : s
      );
    } else {
      const newSubject: Subject = {
        id: `sub-${Date.now()}`,
        code: code.toUpperCase().trim(),
        name: name.trim(),
        instructorId: currentUser?.role === 'admin' ? instructorId : (currentUser?.id || '')
      };
      updatedList = [...subjects, newSubject];
    }

    setSubjects(updatedList);
    saveSubjects(updatedList);
    resetForm();
  };

  const handleEdit = (sub: Subject) => {
    setEditingId(sub.id);
    setCode(sub.code);
    setName(sub.name);
    setInstructorId(sub.instructorId);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this subject? This will delete linked class schedules.')) {
      const updatedList = subjects.filter(s => s.id !== id);
      setSubjects(updatedList);
      saveSubjects(updatedList);
    }
  };

  const filtered = subjects.filter(s => 
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in" id="subjects-panel">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white uppercase tracking-wider font-syne">
            Subject Curriculums
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
            {isWritable 
              ? 'Catalog dynamic subjects, link course syllabus IDs, and assign managing Instructors.' 
              : 'Explore courses offered, active syllabus subject IDs, and assigned teachers.'}
          </p>
        </div>
        
        {isWritable && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="cursor-pointer bg-white hover:bg-zinc-200 text-black text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        )}
      </div>

      {/* Adding / Editing Modal / Block */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl relative"
          >
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-white font-syne mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white" />
              {editingId ? 'Modify Syllabus Subject Details' : 'Register New Curriculum Subject'}
            </h3>
            
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Subject Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., IT-311"
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans uppercase font-mono transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Subject Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Web Development Technologies"
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans transition"
                />
              </div>

              {currentUser?.role === 'admin' ? (
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Assign Instructor</label>
                  <select
                    value={instructorId}
                    onChange={(e) => setInstructorId(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans cursor-pointer transition"
                  >
                    <option value="" className="bg-black text-white">Select Instructor</option>
                    {instructers.map(inst => (
                      <option key={inst.id} value={inst.id} className="bg-black text-white">{inst.fullName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col justify-end h-full">
                  <div className="bg-white/[0.02] px-4 py-2.5 rounded-xl border border-white/10 text-xs text-zinc-400 text-ellipsis overflow-hidden whitespace-nowrap">
                    Managing: <strong className="text-white">{currentUser?.fullName}</strong>
                  </div>
                </div>
              )}

              <div className="md:col-span-3 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.05] mt-2">
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
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subjects View Card Grid */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-white" />
            <h3 className="font-extrabold text-[10px] text-white uppercase tracking-widest">
              Syllabus Curriculums
            </h3>
          </div>
          <div className="relative max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search code or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl pl-10 pr-4 py-2.5 font-sans transition"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
            {searchTerm ? 'No curriculum subjects match search query.' : 'No subjects indexed in the system.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
            {filtered.map(sub => {
              const assignedInst = instructers.find(i => i.id === sub.instructorId) || 
                                   getUsers().find(u => u.id === sub.instructorId);
                                   
              const enrolledStudents = enrollments
                .filter(e => e.subjectId === sub.id)
                .map(e => allUsers.find(u => u.id === e.studentId))
                .filter(Boolean);

              return (
                <motion.div
                  key={sub.id}
                  layout
                  className="bg-white/[0.01] border border-white/[0.06] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-white text-[8px] font-mono font-black rounded-full uppercase tracking-widest">
                        {sub.code}
                      </span>
                      
                      {isWritable && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200">
                          <button
                            onClick={() => handleEdit(sub)}
                            className="p-1.5 bg-[#050505] hover:bg-white hover:text-black border border-white/10 rounded-md text-zinc-400 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 bg-[#050505] hover:bg-white hover:text-black border border-white/10 rounded-md text-zinc-400 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug group-hover:text-zinc-350 transition-colors uppercase tracking-wider">
                      {sub.name}
                    </h4>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="pt-4 border-t border-white/[0.04] text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                      <p className="text-[8px] font-bold text-zinc-500 mb-1">Assigned Instructor</p>
                      <p className="text-white font-black truncate">{assignedInst?.fullName || 'Academic Faculty'}</p>
                    </div>
                    
                    <div className="pt-3 border-t border-white/[0.04] text-[10px] text-zinc-400">
                      <div className="flex items-center gap-1.5 mb-2 font-bold uppercase tracking-widest text-[8px] text-zinc-500">
                        <Users className="w-3 h-3" />
                        <span>Enrolled Students ({enrolledStudents.length})</span>
                      </div>
                      
                      {enrolledStudents.length > 0 ? (
                        <div className="space-y-1">
                          {enrolledStudents.map((st, i) => (
                            <div key={i} className="bg-white/5 px-2 py-1.5 rounded-lg text-white font-medium text-[9px] truncate">
                              {st?.fullName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-zinc-600 italic">No students enrolled yet</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
