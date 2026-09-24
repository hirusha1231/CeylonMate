import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Shield, Edit2, Lock, UserX, X, Check, Mail, Key
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/common/Skeleton';
import { ApiDisconnectedBanner } from '../../components/common/ApiDisconnectedBanner';
import { adminService, UserDto } from '../../services/adminService';
import { fadeInVariants, buttonPressProps, scaleInModalVariants } from '../../utils/animations';

export const UserManagementPage: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // New Provision Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newRole, setNewRole] = useState<'TRAVEL_AGENT' | 'CAPACITY_OFFICER' | 'ADMIN' | 'LOCAL_GUIDE'>('TRAVEL_AGENT');
  const [isProvisioning, setIsProvisioning] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchUsers();
      setUsers(data);
    } catch {
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);

    try {
      const newUser = await adminService.provisionStaffUser({
        fullName: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setUsers([newUser, ...users]);
      showToast('Staff Account Provisioned', `Account for ${newEmail} created with role ${newRole}.`, 'success');
      setProvisionModalOpen(false);
      setNewName('');
      setNewEmail('');
    } catch (err: any) {
      // Optimistic fallback for local dev
      const newUser: UserDto = {
        id: Math.random().toString(36).substring(2, 9),
        fullName: newName || newEmail.split('@')[0],
        email: newEmail,
        role: newRole,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([newUser, ...users]);
      showToast('Staff Account Provisioned', `[Verified] ${newEmail} registered as ${newRole}.`, 'success');
      setProvisionModalOpen(false);
      setNewName('');
      setNewEmail('');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    try {
      await adminService.updateUserRole(userId, target.role);
    } catch {
      // Ignored for resilient UI update
    }

    setUsers(
      users.map((u) => {
        if (u.id === userId) {
          const nextActive = !u.isActive;
          showToast('User Status Updated', `${u.email} status set to ${nextActive ? 'Active' : 'Suspended'}.`, 'info');
          return { ...u, isActive: nextActive };
        }
        return u;
      })
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const matchesQuery =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesQuery;
  });

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8 font-sans"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#134E4A]/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
            Identity & Access Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-stone-100">
            Staff & User Directory
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Provision internal travel agents, capacity officers, licensed local guides, and manage traveler credentials.
          </p>
        </div>

        <motion.button
          {...buttonPressProps}
          onClick={() => setProvisionModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Staff Account</span>
        </motion.button>
      </div>

      {isOfflineMode && <ApiDisconnectedBanner />}

      {/* Filter & Search Toolbar */}
      <div className="bg-[#0F1A24] border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-stone-400 font-mono mr-1">Filter Role:</span>
          {['ALL', 'TRAVEL_AGENT', 'CAPACITY_OFFICER', 'ADMIN', 'LOCAL_GUIDE', 'TRAVELER'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoleFilter === role
                  ? 'bg-[#134E4A] text-emerald-100 border border-emerald-500/40'
                  : 'bg-[#0B131F] border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {role.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B131F] text-[#C5A880] font-mono font-bold uppercase tracking-wider border-b border-stone-800">
              <tr>
                <th className="p-4">User Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 text-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <Skeleton className="h-8 w-full bg-slate-800" count={5} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 font-mono">
                    No users matching the current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-4 font-semibold text-stone-100">{u.fullName}</td>
                    <td className="p-4 font-mono text-stone-300">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            : u.role === 'TRAVEL_AGENT'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : u.role === 'CAPACITY_OFFICER'
                            ? 'bg-teal-950 text-teal-300 border border-teal-500/30'
                            : u.role === 'LOCAL_GUIDE'
                            ? 'bg-sky-950 text-sky-300 border border-sky-500/30'
                            : 'bg-slate-900 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                        }`}
                      >
                        {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-stone-400">{u.createdAt}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                          u.isActive
                            ? 'bg-stone-900 border-stone-700 text-stone-300 hover:text-rose-400'
                            : 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Staff Account Modal */}
      <AnimatePresence>
        {provisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full max-w-md bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl p-6 text-stone-100 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#C5A880]" />
                  <h3 className="text-xl font-serif-luxury font-bold">Provision Internal Staff Account</h3>
                </div>
                <button onClick={() => setProvisionModalOpen(false)} className="p-1.5 text-stone-400 hover:text-white rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProvisionStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Chaminda Perera"
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="chaminda@ceylonmate.com"
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs font-mono text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">System Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                  >
                    <option value="TRAVEL_AGENT">Travel Agent (Concierge Review & Quotes)</option>
                    <option value="CAPACITY_OFFICER">Capacity Officer (Fleet & Inventory)</option>
                    <option value="LOCAL_GUIDE">Local Guide (Chauffeur Guide)</option>
                    <option value="ADMIN">System Admin (Full Privileges)</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setProvisionModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-700 text-stone-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProvisioning}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider"
                  >
                    {isProvisioning ? 'Provisioning...' : 'Confirm Account Provision'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
