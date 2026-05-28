import React, { useState } from 'react';
import { getClassrooms, saveClassrooms } from '../db';
import { Classroom } from '../types';
import { Plus, Trash2, Edit2, Hexagon, Save, Search, School } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const ClassroomsManager: React.FC = () => {
  const { currentUser } = useAuth();
  const isWritable = currentUser?.role === 'admin' || currentUser?.role === 'instructor';

  const [classrooms, setClassrooms] = useState<Classroom[]>(getClassrooms());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState<number>(30);
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setBuilding('');
    setCapacity(30);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !building.trim()) return;

    let updatedList: Classroom[];

    if (editingId) {
      updatedList = classrooms.map(c => 
        c.id === editingId 
          ? { ...c, name: name.trim(), building: building.trim(), capacity: Number(capacity) }
          : c
      );
    } else {
      const newRoom: Classroom = {
        id: `room-${Date.now()}`,
        name: name.trim(),
        building: building.trim(),
        capacity: Number(capacity)
      };
      updatedList = [...classrooms, newRoom];
    }

    setClassrooms(updatedList);
    saveClassrooms(updatedList);
    resetForm();
  };

  const handleEdit = (room: Classroom) => {
    setEditingId(room.id);
    setName(room.name);
    setBuilding(room.building);
    setCapacity(room.capacity);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmRoomId === id) {
      const updatedList = classrooms.filter(c => c.id !== id);
      setClassrooms(updatedList);
      saveClassrooms(updatedList);
      setDeleteConfirmRoomId(null);
    } else {
      setDeleteConfirmRoomId(id);
      setTimeout(() => {
        setDeleteConfirmRoomId(curr => curr === id ? null : curr);
      }, 4000);
    }
  };

  const filtered = classrooms.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in" id="classrooms-panel">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white uppercase tracking-wider font-syne">
            Classroom Registries
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
            {isWritable 
              ? 'Register new teaching spaces, manage seating capacities, and assign buildings.' 
              : 'View all active classrooms, academic buildings, and seating capacities.'}
          </p>
        </div>
        
        {isWritable && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="cursor-pointer bg-white hover:bg-zinc-200 text-black text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Classroom
          </button>
        )}
      </div>

      {/* Adding / Editing Modal / Block */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl relative"
          >
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-white font-syne mb-6 flex items-center gap-2">
              <School className="w-4 h-4 text-white" />
              {editingId ? 'Modify Classroom Specifications' : 'Register New Classroom Space'}
            </h3>
            
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Classroom Name/Room Number</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Computer Lab 301"
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Building Location</label>
                <input
                  type="text"
                  required
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g., COE Building"
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Seating Capacity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-3 font-sans font-mono transition"
                />
              </div>

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

      {/* Classroom Listing */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        {/* Search bar row */}
        <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-white" />
            <h3 className="font-extrabold text-[10px] text-white uppercase tracking-widest">
              Available Classrooms
            </h3>
          </div>
          <div className="relative max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search classrooms/buildings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl pl-10 pr-4 py-2.5 font-sans transition"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
            {searchTerm ? 'No registered classrooms match your search query.' : 'No registered classrooms found.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
            {filtered.map(room => (
              <motion.div
                key={room.id}
                layout
                className="bg-white/[0.01] border border-white/[0.06] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-white text-[8px] font-black rounded-full uppercase tracking-widest">
                      {room.building}
                    </span>
                    
                    {isWritable && (
                      <div className={`flex items-center gap-1.5 transition-all duration-200 ${
                        deleteConfirmRoomId === room.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {deleteConfirmRoomId === room.id ? (
                          <button
                            onClick={() => handleDelete(room.id)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white border border-rose-550 rounded-lg text-[8px] font-black uppercase tracking-widest transition flex items-center gap-1 animate-pulse shadow-md"
                            title="Click again to confirm delete"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Confirm?</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(room)}
                              className="p-1 px-1.5 bg-[#050505] hover:bg-white hover:text-black border border-white/10 rounded-md text-zinc-400 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(room.id)}
                              className="p-1 px-1.5 bg-[#050505] hover:bg-rose-600 hover:text-white border border-white/10 rounded-md text-rose-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-zinc-350 transition-colors uppercase tracking-wider">
                    {room.name}
                  </h4>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                  <span>Capacity</span>
                  <span className="text-white font-black">{room.capacity} students</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
