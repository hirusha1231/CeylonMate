import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Shield, UserX, X, AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/common/Skeleton';
import { adminService, UserDto } from '../../services/adminService';
import { apiError } from '../../services/api';
import { fadeInVariants, buttonPressProps, scaleInModalVariants } from '../../utils/animations';

export const UserManagementPage: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);

  // New Provision Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password@123');
  const [newPhone, setNewPhone] = useState('+94770000000');
  const [newRole, setNewRole] = useState<'TRAVEL_AGENT' | 'CAPACITY_OFFICER' | 'ADMIN' | 'LOCAL_GUIDE'>('TRAVEL_AGENT');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const [statusModalUser, setStatusModalUser] = useState<UserDto | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminService.fetchUsers();
      setUsers(data);
    } catch (err: any) {
      const errorMsg = apiError(err);
      setLoadError(errorMsg);
      setUsers([]); // Strictly NO fallback mock data!
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    setProvisionError(null);

    try {
      await adminService.provisionStaffUser({
        fullName: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        phoneNumber: newPhone,
      });
      showToast('Staff Account Provisioned', `Account for ${newEmail} created with role ${newRole}.`, 'success');
      setProvisionModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('Password@123');
      setNewPhone('+94770000000');
      setProvisionError(null);
      await loadUsers();
    } catch (err: any) {
      const msg = apiError(err);
      setProvisionError(msg);
      showToast('Provisioning Failed', msg, 'error');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleOpenStatusModal = (user: UserDto) => {
    setStatusModalUser(user);
  };

  const confirmStatusToggle = async () => {
    if (!statusModalUser) return;
    const target = statusModalUser;
    const isUserActive = target.isActive ?? (target.status === 'ACTIVE');
    const newIsActive = !isUserActive;
    const newStatusStr = newIsActive ? 'ACTIVE' : 'INACTIVE';
    setIsTogglingStatus(true);

    try {
      await adminService.toggleUserStatus(target.id, newIsActive);
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === target.id
            ? { ...u, isActive: newIsActive, status: newStatusStr }
            : u
        )
      );
      showToast(
        'User Status Updated',
        `User successfully ${newIsActive ? 'activated' : 'suspended'}.`,
        newIsActive ? 'success' : 'info'
      );
      setStatusModalUser(null);
    } catch {
      showToast('Update Failed', `Could not update account status for ${target.email}.`, 'error');
    } finally {
      setIsTogglingStatus(false);
    }
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
          onClick={() => {
            setProvisionError(null);
            setProvisionModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Staff Account</span>
        </motion.button>
      </div>

      {/* Prominent Database Connection Failure Banner */}
      {loadError && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 font-mono text-xs sm:text-sm flex items-start gap-3 shadow-lg">
          <span className="text-xl shrink-0">🚨</span>
          <div>
            <p className="font-bold text-rose-100">
              Failed to load users from database: {loadError}. Check if ASP.NET Core backend is running.
            </p>
          </div>
        </div>
      )}

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
                    {loadError ? 'Database connection error. No users loaded.' : 'No users matching the current filter parameters.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUserActive = u.isActive ?? (u.status === 'ACTIVE');
                  return (
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
                        {isUserActive ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-stone-400">{u.createdAt}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenStatusModal(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all inline-flex items-center gap-1.5 ${
                            isUserActive
                              ? 'border-rose-500/50 text-rose-400 hover:bg-rose-950/30'
                              : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/30'
                          }`}
                        >
                          {isUserActive ? <UserX className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                          <span>{isUserActive ? 'Suspend' : 'Activate'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Status Confirmation Modal */}
      <AnimatePresence>
        {statusModalUser && (() => {
          const isModalUserActive = statusModalUser.isActive ?? (statusModalUser.status === 'ACTIVE');
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                variants={scaleInModalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative w-full max-w-md bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl p-6 text-stone-100 space-y-5"
              >
                <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${isModalUserActive ? 'bg-rose-950/80 border border-rose-500/40 text-rose-400' : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'}`}>
                      {isModalUserActive ? <UserX className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <h3 className="text-xl font-serif-luxury font-bold">
                      {isModalUserActive ? 'Confirm Account Suspension' : 'Confirm Account Activation'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setStatusModalUser(null)}
                    className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-stone-300">
                  <p>
                    Are you sure you want to {isModalUserActive ? <strong className="text-rose-400">suspend</strong> : <strong className="text-emerald-400">activate</strong>} this user?
                  </p>

                  <div className="bg-[#0B131F] border border-stone-800 rounded-xl p-3.5 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Name:</span>
                      <span className="font-semibold text-stone-200">{statusModalUser.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Email:</span>
                      <span className="text-stone-300">{statusModalUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Role:</span>
                      <span className="text-amber-300 font-bold">{statusModalUser.role.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Current Status:</span>
                      <span className={isModalUserActive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {isModalUserActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>

                  {isModalUserActive ? (
                    <div className="p-3 bg-rose-950/60 border border-rose-500/30 rounded-xl text-rose-200 leading-relaxed font-sans">
                      ⚠️ <strong>Warning:</strong> Suspending this account will immediately revoke authentication access. The user will be blocked from logging into CeylonMate.
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-200 leading-relaxed font-sans">
                      ℹ️ <strong>Note:</strong> Activating this account will restore full access for this user to sign in and interact with CeylonMate services.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setStatusModalUser(null)}
                    disabled={isTogglingStatus}
                    className="px-4 py-2 rounded-xl border border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    {...buttonPressProps}
                    onClick={confirmStatusToggle}
                    disabled={isTogglingStatus}
                    className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                      isModalUserActive
                        ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white'
                    }`}
                  >
                    {isTogglingStatus ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : isModalUserActive ? (
                      'Suspend User'
                    ) : (
                      'Activate User'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

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
                {provisionError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{provisionError}</span>
                  </div>
                )}

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
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+94770000000"
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100 font-mono"
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
