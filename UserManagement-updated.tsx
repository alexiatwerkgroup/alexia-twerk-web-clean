// src/components/admin/UserManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface User {
  id: string;
  email: string;
  displayName: string;
  subscriptionLevel: string;
  tokensBalance: number;
  createdAt: string;
  lastActive: string;
}

interface UserManagementProps {
  isOpen: boolean;
}

export const UserManagement = ({ isOpen }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSubscription, setFilterSubscription] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    subscriptionLevel: '',
    tokensBalance: 0,
  });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(filterSubscription && { subscription: filterSubscription }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const result = await response.json();

      setUsers(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, filterSubscription]);

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      displayName: user.displayName,
      subscriptionLevel: user.subscriptionLevel,
      tokensBalance: user.tokensBalance,
    });
    setShowEditModal(true);
  };

  // Handle update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) throw new Error('Failed to update user');

      fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPassword) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${resetUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (!response.ok) throw new Error('Failed to reset password');

      fetchUsers();
      setShowResetModal(false);
      setResetUserId(null);
      setResetPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const subscriptionLevels = ['free', 'basic', 'medium', 'full'];
  const totalPages = Math.ceil(total / 20);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'free':
        return 'bg-gray-700 text-gray-200';
      case 'basic':
        return 'bg-blue-900 text-blue-200';
      case 'medium':
        return 'bg-purple-900 text-purple-200';
      case 'full':
        return 'bg-pink-900 text-pink-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>

            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#FF006E] outline-none transition"
                />
              </div>
              <select
                value={filterSubscription}
                onChange={(e) => {
                  setFilterSubscription(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#FF006E] outline-none transition"
              >
                <option value="">All Subscriptions</option>
                {subscriptionLevels.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Subscription
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Tokens Balance
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Last Active
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{user.displayName}</p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(
                            user.subscriptionLevel
                          )}`}
                        >
                          {user.subscriptionLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {user.tokensBalance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(user.lastActive).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 hover:bg-gray-700 rounded transition text-blue-400"
                          title="Edit user"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setResetUserId(user.id);
                            setShowResetModal(true);
                          }}
                          className="p-2 hover:bg-gray-700 rounded transition text-yellow-400"
                          title="Reset password"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-gray-700 rounded transition text-red-400"
                          title="Delete user"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <p className="text-gray-400">
              Showing {users.length > 0 ? (page - 1) * 20 + 1 : 0} to{' '}
              {Math.min(page * 20, total)} of {total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50 transition"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 1 || p === 1 || p === totalPages)
                .map((p, i, arr) => (
                  <div key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded ${
                        page === p
                          ? 'bg-[#FF006E] text-white'
                          : 'hover:bg-gray-700 text-gray-300'
                      } transition`}
                    >
                      {p}
                    </button>
                  </div>
                ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Edit User Modal */}
          <AnimatePresence>
            {showEditModal && editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border border-gray-700"
                >
                  <h3 className="text-xl font-bold text-white mb-6">Edit User</h3>

                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.displayName}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            displayName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subscription Level
                      </label>
                      <select
                        value={editFormData.subscriptionLevel}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            subscriptionLevel: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      >
                        {subscriptionLevels.map((level) => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tokens Balance
                      </label>
                      <input
                        type="number"
                        value={editFormData.tokensBalance}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            tokensBalance: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#FF006E] hover:bg-[#E60060] text-white py-2 rounded font-medium disabled:opacity-50 transition"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Reset Password Modal */}
          <AnimatePresence>
            {showResetModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border border-gray-700"
                >
                  <h3 className="text-xl font-bold text-white mb-6">Reset Password</h3>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={loading || !resetPassword}
                        className="flex-1 bg-[#FF006E] hover:bg-[#E60060] text-white py-2 rounded font-medium disabled:opacity-50 transition"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetModal(false);
                          setResetPassword('');
                        }}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
