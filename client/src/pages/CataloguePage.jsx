import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { ResourceCard } from '../components/ResourceCard';
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const CataloguePage = ({ onSelectResource, onQuickBook }) => {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minCapacity, setMinCapacity] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const { socket } = useSocket();

  const fetchFilters = async () => {
    try {
      const meta = await api.getResourceMeta();
      setCategories(['All', ...(meta.categories || [])]);
      setLocations(['All', ...(meta.locations || [])]);
    } catch (e) {
      console.error('Error fetching meta filters:', e);
    }
  };

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedLocation !== 'All') params.location = selectedLocation;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (minCapacity) params.minCapacity = minCapacity;

      const res = await api.getResources(params);
      setResources(res.resources || []);
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, selectedLocation, statusFilter, minCapacity]);

  // Real-time update on resource creation/update/deletion
  useEffect(() => {
    if (!socket) return;
    const handleResourceUpdate = () => {
      fetchResources();
    };
    socket.on('resource_updated', handleResourceUpdate);
    socket.on('resource_status_changed', handleResourceUpdate);
    socket.on('booking_created', handleResourceUpdate);
    socket.on('booking_cancelled', handleResourceUpdate);

    return () => {
      socket.off('resource_updated', handleResourceUpdate);
      socket.off('resource_status_changed', handleResourceUpdate);
      socket.off('booking_created', handleResourceUpdate);
      socket.off('booking_cancelled', handleResourceUpdate);
    };
  }, [socket]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResources();
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Institutional Resource Management</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
            Reserve Shared Campus Labs, Halls & Equipment with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Zero Conflicts
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Browse real-time availability across high-performance GPU labs, seminar halls, 3D printers,
            and research facilities with instant atomic verification and QR check-in.
          </p>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources by name, hardware specs, location, or amenities..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-900/40 transition flex items-center justify-center gap-2 shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Search Catalogue</span>
            </button>
          </form>
        </div>
      </div>

      {/* Category Pill Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['All', 'Labs', 'Seminar Halls', 'Equipment', 'Sports'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 border ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/50 scale-105'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {cat === 'All' ? '🌟 All Resources' : cat}
          </button>
        ))}
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Refine:</span>
          </div>

          {/* Location Select */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Locations / Buildings</option>
            {locations.filter((l) => l !== 'All').map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available Now</option>
            <option value="maintenance">Under Maintenance</option>
          </select>

          {/* Min Capacity */}
          <select
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Any Capacity</option>
            <option value="5">Min 5 Persons</option>
            <option value="20">Min 20 Persons</option>
            <option value="50">Min 50 Persons</option>
            <option value="100">Min 100+ Persons</option>
          </select>

          {(selectedCategory !== 'All' || selectedLocation !== 'All' || statusFilter !== 'All' || search || minCapacity) && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedLocation('All');
                setStatusFilter('All');
                setMinCapacity('');
                setSearch('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Switcher & Result Count */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs font-medium">
            Showing <strong className="text-white">{resources.length}</strong> facilities
          </span>
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Catalogue Resource Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card rounded-2xl h-80 animate-pulse bg-slate-900/60 p-5">
              <div className="h-40 bg-slate-800/80 rounded-xl mb-4"></div>
              <div className="h-4 bg-slate-800/80 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-800/80 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 p-8 glass-panel rounded-3xl border border-slate-800">
          <Layers className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-white">No Matching Resources Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or category filter to discover institutional facilities.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedLocation('All');
              setStatusFilter('All');
              setSearch('');
              setMinCapacity('');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onSelectResource={onSelectResource}
              onQuickBook={onQuickBook}
            />
          ))}
        </div>
      )}
    </div>
  );
};
