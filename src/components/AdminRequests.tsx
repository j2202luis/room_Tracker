import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, UserCheck, UserX, Trash2, Clock, CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminRequests: React.FC = () => {
  const { 
    getAllRequests, 
    getApprovedUsers, 
    approveRequest, 
    rejectRequest, 
    revokeAccess 
  } = useAuth();

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [lastApprovedPwd, setLastApprovedPwd] = useState<{ name: string; email: string; pwd: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Local re-render triggers
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  const requests = getAllRequests();
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const approvedUsers = getApprovedUsers();

  const handleApprove = (id: string, name: string, email: string) => {
    const res = approveRequest(id);
    if (res.success && res.tempPassword) {
      setLastApprovedPwd({ name, email, pwd: res.tempPassword });
    }
    forceUpdate();
  };

  const handleReject = (id: string) => {
    rejectRequest(id);
    forceUpdate();
  };

  const handleRevoke = (id: string) => {
    if (confirm('Are you absolutely sure you want to revoke this user\'s system access? Their session will be invalidated instantly.')) {
      revokeAccess(id);
      forceUpdate();
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredApproved = approvedUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in" id="admin-panel-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white uppercase tracking-wider font-syne">
            System Access Approvals
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
            Authorize accounts, review credentials, and monitor academic role profiles for SSCT.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-mono text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Pending Approvals: {pendingRequests.length}</span>
          </div>
        </div>
      </div>

      {/* Temporary Password Notification Center */}
      <AnimatePresence>
        {lastApprovedPwd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setLastApprovedPwd(null)} 
                className="text-zinc-400 hover:text-white text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-colors"
              >
                Dismiss x
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/10 shrink-0 select-none">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="space-y-3 w-full">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Account Approved Successfully!</h4>
                <p className="text-xs text-zinc-350 leading-relaxed max-w-2xl">
                  A profile has been initialized for <strong className="text-white">{lastApprovedPwd.name}</strong> (<span className="text-white font-semibold font-mono">{lastApprovedPwd.email}</span>). 
                  Copy the temporary credentials below to send them over private SSCT channels.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 max-w-md">
                  <div className="bg-[#050505] border border-white/15 px-4 py-3 rounded-xl font-mono text-xs text-white flex-1 flex items-center justify-between select-all">
                    <span>Temp Pwd: {lastApprovedPwd.pwd}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(lastApprovedPwd.pwd)}
                    className="cursor-pointer bg-white hover:bg-zinc-200 text-black font-extrabold text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {copiedText === lastApprovedPwd.pwd ? (
                      <>Copied!</>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Access Requests */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
          <h3 className="font-extrabold text-[10px] text-white uppercase tracking-widest flex items-center gap-2">
            <span>Pending Registration Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-white text-black px-2 py-0.5 rounded-md text-[9px] font-black">
                {pendingRequests.length}
              </span>
            )}
          </h3>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
            No pending access requests found. All requests reviewed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-zinc-400 text-[9px] uppercase tracking-widest font-bold">
                  <th className="p-5 pl-6">Requester details</th>
                  <th className="p-5">Target Role</th>
                  <th className="p-5 max-w-xs">Justification</th>
                  <th className="p-5">Requested Date</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pendingRequests.map(req => (
                  <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 pl-6">
                      <div className="font-black text-white text-xs uppercase tracking-wide">{req.fullName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1">{req.email}</div>
                    </td>
                    <td className="p-5">
                      <span className="px-2.5 py-0.5 text-[8px] font-black bg-white/5 border border-white/10 rounded-full uppercase tracking-widest text-white">
                        {req.role}
                      </span>
                    </td>
                    <td className="p-5 max-w-xs text-xs text-zinc-300 leading-relaxed italic pr-6 py-5">
                      "{req.reason}"
                    </td>
                    <td className="p-5 text-xs text-zinc-400 font-mono">
                      {new Date(req.requestedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(req.id, req.fullName, req.email)}
                          className="cursor-pointer flex items-center gap-1.5 bg-white hover:bg-zinc-200 text-black border border-white/10 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="cursor-pointer flex items-center gap-1.5 bg-[#050505] hover:bg-white hover:text-black border border-white/15 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-zinc-350 transition"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approved Active Team Users & Revocation manager */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <h3 className="font-extrabold text-[10px] text-white uppercase tracking-widest flex items-center gap-2">
            <span>Approved Registered Access</span>
            <span className="bg-white/5 text-zinc-400 border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-bold">
              {approvedUsers.length} total
            </span>
          </h3>
          
          <div className="relative max-w-xs">
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 focus:border-white focus:outline-hidden text-xs text-white rounded-xl px-4 py-2.5 font-sans transition"
            />
          </div>
        </div>

        {filteredApproved.length === 0 ? (
          <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
            {searchTerm ? 'No approved users match search query.' : 'No approved active users found in record.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-zinc-400 text-[9px] uppercase tracking-widest font-bold">
                  <th className="p-5 pl-6">Profile Holder</th>
                  <th className="p-5">Assigned Role</th>
                  <th className="p-5">Auth Status</th>
                  <th className="p-5">Approval Info</th>
                  <th className="p-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredApproved.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 pl-6">
                      <div className="font-black text-white text-xs uppercase tracking-wide">{u.fullName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1">{u.email}</div>
                    </td>
                    <td className="p-5">
                      <span className="px-2.5 py-0.5 text-[8px] font-black bg-white/5 border border-white/10 rounded-full uppercase tracking-widest text-white">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-5">
                      {u.mustChangePassword ? (
                        <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded text-[9px] font-bold uppercase tracking-widest">
                          Temp Password
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-white rounded text-[9px] font-bold uppercase tracking-widest">
                          Verified
                        </span>
                      )}
                    </td>
                    <td className="p-5 text-xs text-zinc-400 font-mono">
                      <div>Date: {u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : 'N/A'}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Approved via Admin</div>
                    </td>
                    <td className="p-5 text-center">
                      <button
                        onClick={() => handleRevoke(u.id)}
                        className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white hover:text-black border border-white/10 px-3.5 py-2.5 rounded-xl transition duration-200"
                        title="Revoke access immediately"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Blocked / Rejected Records audit */}
      <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl overflow-hidden shadow-md">
        <div className="p-5 border-b border-white/[0.05] bg-white/[0.005] flex items-center justify-between">
          <h3 className="font-semibold text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-350" />
            <span>Blacklisted / Rejected requests (Denied Re-Registration)</span>
          </h3>
        </div>
        {rejectedRequests.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 uppercase tracking-widest text-[9px]">No rejected accounts recorded.</div>
        ) : (
          <div className="p-5 space-y-3">
            {rejectedRequests.map(r => (
              <div key={r.id} className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-zinc-300">{r.fullName}</span> 
                  <span className="text-zinc-500 ml-1.5 font-mono">({r.email})</span>
                  <p className="text-[11px] text-zinc-500 italic mt-1 font-medium">Reason: "{r.reason}"</p>
                </div>
                <div className="text-[8px] text-zinc-400 font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full select-none">
                  Rejected Access
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
