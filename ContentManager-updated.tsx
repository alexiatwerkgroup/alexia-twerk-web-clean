// src/components/admin/ContentManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  required_level: string;
  created_at: string;
  video_url: string;
}

interface ContentManagerProps {
  isOpen: boolean;
}

export const ContentManager = ({ isOpen }: ContentManagerProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 0,
    required_level: 'free',
    video_url: '',
    portal_id: '',
  });

  // Fetch videos
  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(filterLevel && { level: filterLevel }),
      });

      const response = await fetch(`/api/admin/content?${params}`);
      const result = await response.json();

      setVideos(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page, search, filterLevel]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingId
        ? `/api/admin/content/${editingId}`
        : '/api/admin/content';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save video');

      fetchVideos();
      setShowModal(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        duration: 0,
        required_level: 'free',
        video_url: '',
        portal_id: '',
      });
    } catch (error) {
      console.error('Error saving video:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/admin/content/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete video');

      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  // Handle edit
  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setFormData({
      title: video.title,
      description: video.description,
      duration: video.duration,
      required_level: video.required_level,
      video_url: video.video_url,
      portal_id: '',
    });
    setShowModal(true);
  };

  const levels = ['free', 'basic', 'medium', 'full'];
  const totalPages = Math.ceil(total / 10);

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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Content Manager</h2>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  title: '',
                  description: '',
                  duration: 0,
                  required_level: 'free',
                  video_url: '',
                  portal_id: '',
                });
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-[#FF006E] hover:bg-[#E60060] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={18} />
              Add Video
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search videos..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#FF006E] outline-none transition"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#FF006E] outline-none transition"
            >
              <option value="">All Levels</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Videos Table */}
          <div className="overflow-x-auto border border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Views
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Level
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Uploaded
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
                ) : videos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      No videos found
                    </td>
                  </tr>
                ) : (
                  videos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-800 transition">
                      <td className="px-6 py-4 text-white">{video.title}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {Math.floor(video.duration / 60)}m {video.duration % 60}s
                      </td>
                      <td className="px-6 py-4 text-gray-400">{video.views}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            video.required_level === 'free'
                              ? 'bg-gray-700 text-gray-200'
                              : video.required_level === 'basic'
                              ? 'bg-blue-900 text-blue-200'
                              : video.required_level === 'medium'
                              ? 'bg-purple-900 text-purple-200'
                              : 'bg-pink-900 text-pink-200'
                          }`}
                        >
                          {video.required_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(video.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(video)}
                          className="p-2 hover:bg-gray-700 rounded transition text-blue-400"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-2 hover:bg-gray-700 rounded transition text-red-400"
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
              Showing {videos.length > 0 ? (page - 1) * 10 + 1 : 0} to{' '}
              {Math.min(page * 10, total)} of {total} videos
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

          {/* Modal */}
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border border-gray-700"
                >
                  <h3 className="text-xl font-bold text-white mb-6">
                    {editingId ? 'Edit Video' : 'Add New Video'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({ ...formData, duration: parseInt(e.target.value) })
                        }
                        required
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Required Level
                      </label>
                      <select
                        value={formData.required_level}
                        onChange={(e) =>
                          setFormData({ ...formData, required_level: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      >
                        {levels.map((level) => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Video URL
                      </label>
                      <input
                        type="url"
                        value={formData.video_url}
                        onChange={(e) =>
                          setFormData({ ...formData, video_url: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-[#FF006E] outline-none transition"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#FF006E] hover:bg-[#E60060] text-white py-2 rounded font-medium disabled:opacity-50 transition"
                      >
                        {editingId ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
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
