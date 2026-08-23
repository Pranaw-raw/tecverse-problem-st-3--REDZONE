import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Users,
  Layers,
  Calendar,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';
import {
  formatTimeRange,
  formatDateTime,
  getStatusBadgeStyle,
  getCategoryBadgeStyle,
} from '../utils/formatters';

export const AdminDashboardPage = () => {
  const { user, isAdmin, switchRole } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useNotification();

  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'bookings'
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resource Form Modal State
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Labs',
    location: '',
    capacity: 20,
    description: '',
    imageUrl: '',
    amenities: '',
    rules: '',
    status: 'available',
  });

  // Admin Override Modal
  const [overrideBooking, setOverrideBooking] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'resources') {
        const res = await api.getResources();
        setResources(res.resources || []);
      } else {
        const res = await api.getAllBookings();
        setBookings(res.bookings || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [activeTab, isAdmin]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket || !isAdmin) return;

    const handleUpdate = () => {
      fetchAdminData();
    };

    socket.on('booking_created', handleUpdate);
    socket.on('booking_cancelled', handleUpdate);
    socket.on('resource_updated', handleUpdate);
    socket.on('resource_status_changed', handleUpdate);

    return () => {
      socket.off('booking_created', handleUpdate);
      socket.off('booking_cancelled', handleUpdate);
      socket.off('resource_updated', handleUpdate);
      socket.off('resource_status_changed', handleUpdate);
    };
  }, [socket, isAdmin, activeTab]);

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      category: 'Labs',
      location: '',
      capacity: 20,
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=800&q=80',
      amenities: 'High-Speed WiFi, HD Display, Air Conditioning',
      rules: 'Authorized personnel only, Clean workspace after use',
      status: 'available',
    });
    setIsResourceModalOpen(true);
  };

  const handleOpenEditModal = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      category: resource.category,
      location: resource.location,
      capacity: resource.capacity,
      description: resource.description || '',
      imageUrl: resource.image_url || '',
      amenities: Array.isArray(resource.amenities)
        ? resource.amenities.join(', ')
        : resource.amenities || '',
      rules: Array.isArray(resource.rules) ? resource.rules.join(', ') : resource.rules || '',
      status: resource.status,
    });
    setIsResourceModalOpen(true);
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amenities: formData.amenities.split(',').map((s) => s.trim()).filter(Boolean),
        rules: formData.rules.split(',').map((s) => s.trim()).filter(Boolean),
      };

      if (editingResource) {
        await api.updateResource(editingResource.id, payload);
        addToast({
          title: 'Resource Updated',
          message: `Updated "${formData.name}" successfully.`,
          type: 'confirmation',
        });
      } else {
        await api.createResource(payload);
        addToast({
          title: 'Resource Created',
          message: `Added new resource "${formData.name}" to campus catalogue.`,
          type: 'confirmation',
        });
      }

      setIsResourceModalOpen(false);
      fetchAdminData();
    } catch (err) {
      console.error('Error saving resource:', err);
      addToast({
        title: 'Error Saving Resource',
        message: err.message,
        type: 'alert',
      });
    }
  };

  const handleToggleStatus = async (resource) => {
    const nextStatus = resource.status === 'available' ? 'maintenance' : 'available';
    try {
      await api.toggleResourceStatus(resource.id, nextStatus);
      addToast({
        title: 'Status Updated',
        message: `Set "${resource.name}" to ${nextStatus}.`,
        type: 'info',
      });
      fetchAdminData();
    } catch (err) {
      console.error('Status toggle failed:', err);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${resource.name}"? All active bookings will be cancelled.`)) {
      return;
    }

    try {
      await api.deleteResource(resource.id);
      addToast({
        title: 'Resource Deleted',
        message: `Deleted "${resource.name}".`,
        type: 'info',
      });
      fetchAdminData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAdminOverrideBooking = async (e) => {
    e.preventDefault();
    if (!overrideBooking) return;

    try {
      await api.cancelBooking(overrideBooking.id, overrideReason || 'Admin administrative override');
      addToast({
        title: 'Booking Overridden',
        message: `Cancelled booking for "${overrideBooking.resource_name}". Slot reopened.`,
        type: 'info',
      });
      setOverrideBooking(null);
      setOverrideReason('');
      fetchAdminData();
    } catch (err) {
      console.error('Override failed:', err);
    }
  };

  // If user is not admin, show instant switch button
  if (!isAdmin) {
    return (
      <div className="text-center py-20 p-8 glass-panel rounded-3xl border border-slate-800 max-w-lg mx-auto animate-fade-in">
        <ShieldAlert className="w-16 h-16 mx-auto text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400 mt-2">
          You are currently logged in as a <strong>{user?.role}</strong> ({user?.name}). The Admin
          Control Panel is restricted to administrators and resource managers.
        </p>
        <button
          onClick={() => switchRole('admin')}
          className="mt-6 px-6 py-3 text-xs font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl shadow-lg shadow-rose-950/40 transition"
        >
          ⚡ Switch to Admin Role (1-Click)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>FR5 & FR6 Admin Control Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Campus Infrastructure Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage catalogue resources, oversee all campus reservations, and resolve scheduling conflicts.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'resources'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Resource Pool ({resources.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'bookings'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>All Campus Bookings ({bookings.length})</span>
            </button>
          </div>

          {activeTab === 'resources' && (
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: RESOURCE CATALOGUE MANAGER */}
      {activeTab === 'resources' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Resource Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={res.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'}
                          alt={res.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{res.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {res.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${getCategoryBadgeStyle(
                          res.category
                        )}`}
                      >
                        {res.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{res.location}</td>
                    <td className="p-4 font-mono font-medium">{res.capacity} pax</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${getStatusBadgeStyle(
                          res.status
                        )}`}
                      >
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(res)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title={res.status === 'available' ? 'Mark Maintenance' : 'Set Available'}
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(res)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Edit Resource"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(res)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL BOOKINGS MANAGER */}
      {activeTab === 'bookings' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Reservation / Facility</th>
                  <th className="p-4">Booked By</th>
                  <th className="p-4">Time Window</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{b.title || b.resource_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.resource_name} • {b.location}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{b.user_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{b.user_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300">{formatTimeRange(b.start_time, b.end_time)}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${getStatusBadgeStyle(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {b.status === 'upcoming' && (
                        <button
                          onClick={() => {
                            setOverrideBooking(b);
                            setOverrideReason('Administrative schedule conflict resolution');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg transition"
                        >
                          Override / Cancel
                        </button>
                      )}
                      {b.status === 'checked-in' && (
                        <span className="text-[11px] text-amber-400 font-medium">In Session</span>
                      )}
                      {b.status === 'completed' && (
                        <span className="text-[11px] text-emerald-400 font-medium">Completed</span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="text-[11px] text-slate-500 italic">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESOURCE ADD / EDIT MODAL */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-base font-bold text-white">
                {editingResource ? 'Edit Resource' : 'Add New Campus Resource'}
              </h3>
              <button
                onClick={() => setIsResourceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resource Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Quantum Computing Lab"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Labs">Labs</option>
                    <option value="Seminar Halls">Seminar Halls</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Sports">Sports</option>
                    <option value="Classrooms">Classrooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacity (Pax) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Building *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Science Block, Room 304"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  placeholder="4K Projector, Surround Audio, Fast WiFi"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResourceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN OVERRIDE MODAL */}
      {overrideBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Override / Cancel Reservation</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              You are cancelling <strong>{overrideBooking.user_name}</strong>'s booking for{' '}
              <strong>"{overrideBooking.resource_name}"</strong>. The user will be notified and the
              slot will become available immediately.
            </p>
            <form onSubmit={handleAdminOverrideBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows="2"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Scheduled maintenance, emergency campus event..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideBooking(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow"
                >
                  Confirm Force Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
