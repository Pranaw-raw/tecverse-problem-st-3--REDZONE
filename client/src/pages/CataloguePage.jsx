import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { ResourceCard } from '../components/ResourceCard';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  Layers,
  Cpu,
  Tv,
  Wrench,
  Dumbbell,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';

export const CataloguePage = ({ onSelectResource, onQuickBook }) => {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sportsSubFilter, setSportsSubFilter] = useState('All'); // 'All' | 'Indoor' | 'Outdoor'
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minCapacity, setMinCapacity] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const { socket } = useSocket();

  const categoryIcons = {
    All: Sparkles,
    Labs: Cpu,
    'Seminar Halls': Tv,
    Sports: Dumbbell,
    Equipment: Wrench,
  };

  const fetchFilters = async () => {
    try {
      const meta = await api.getResourceMeta();
      // Ensure specific clean category order
      const catList = ['All', 'Labs', 'Seminar Halls', 'Sports', 'Equipment'];
      setCategories(catList);
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
      let list = res.resources || [];

      // If sports category and sub-filter is applied
      if (selectedCategory === 'Sports' && sportsSubFilter !== 'All') {
        if (sportsSubFilter === 'Indoor') {
          list = list.filter(
            (r) =>
              r.name.toLowerCase().includes('indoor') ||
              r.name.toLowerCase().includes('table tennis') ||
              r.name.toLowerCase().includes('badminton') ||
              r.name.toLowerCase().includes('chess') ||
              r.name.toLowerCase().includes('carrom') ||
              r.name.toLowerCase().includes('kabaddi')
          );
        } else if (sportsSubFilter === 'Outdoor') {
          list = list.filter(
            (r) =>
              r.name.toLowerCase().includes('outdoor') ||
              r.name.toLowerCase().includes('basketball') ||
              r.name.toLowerCase().includes('cricket') ||
              r.name.toLowerCase().includes('volleyball')
          );
        }
      }

      setResources(list);
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
  }, [selectedCategory, sportsSubFilter, selectedLocation, statusFilter, minCapacity]);

  // Real-time update on resource updates
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

  const isFiltered =
    selectedCategory !== 'All' ||
    sportsSubFilter !== 'All' ||
    selectedLocation !== 'All' ||
    statusFilter !== 'All' ||
    search !== '' ||
    minCapacity !== '';

  const clearAllFilters = () => {
    setSelectedCategory('All');
    setSportsSubFilter('All');
    setSelectedLocation('All');
    setStatusFilter('All');
    setMinCapacity('');
    setSearch('');
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Clean Modern Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-indigo-500/20 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-900/90 p-6 sm:p-10 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Campus Resource & Facility Booking</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
            Reserve Sports Arenas, Labs & Halls with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Zero Conflicts
            </span>
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Book slots across indoor & outdoor sports, computing clusters, 400-seat auditorium,
            interactive seminar halls, physics/chemistry/engineering labs, and equipment depots.
          </p>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2.5 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search badminton, cricket, chemistry lab, auditorium, 3D printing..."
                className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    fetchResources();
                  }}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-900/40 transition-all duration-200 flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>Search Facilities</span>
            </button>
          </form>

          {/* Quick Highlights */}
          <div className="mt-5 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Indoor & Outdoor Sports</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Auditoriums & Seminar Halls</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>6 Engineering & Science Labs</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Equipment & Books Depot</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Category Pill Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'Sports', 'Seminar Halls', 'Labs', 'Equipment'].map((cat) => {
            const Icon = categoryIcons[cat] || Layers;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSportsSubFilter('All');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-2xl whitespace-nowrap transition-all duration-200 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 scale-105'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                <span>{cat === 'All' ? 'All Facilities' : cat}</span>
              </button>
            );
          })}
        </div>

        {/* Dedicated Sports Sub-Filters (Indoor vs Outdoor) */}
        {selectedCategory === 'Sports' && (
          <div className="flex items-center gap-2 pt-1 pl-1 animate-fade-in">
            <span className="text-xs font-medium text-slate-400 mr-1">Sports Type:</span>
            {[
              { id: 'All', label: 'All Sports (8)' },
              { id: 'Indoor', label: '🏓 Indoor (TT, Badminton, Chess, Carrom, Kabaddi)' },
              { id: 'Outdoor', label: '🏀 Outdoor (Basketball, Cricket, Volleyball)' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSportsSubFilter(sub.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
                  sportsSubFilter === sub.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Refine & Filter Control Toolbar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mr-1">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Filter By:</span>
          </div>

          {/* Location Select */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="All">All Locations & Buildings</option>
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
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available Now</option>
            <option value="maintenance">Under Maintenance</option>
          </select>

          {/* Min Capacity */}
          <select
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="">Any Capacity</option>
            <option value="10">Min 10 Persons</option>
            <option value="30">Min 30 Persons</option>
            <option value="60">Min 60 Persons (Seminar Halls)</option>
            <option value="400">Min 400 Persons (Auditorium)</option>
          </select>

          {isFiltered && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1 hover:bg-indigo-500/10 rounded-lg transition"
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
            <div key={n} className="glass-card rounded-3xl h-80 animate-pulse bg-slate-900/60 p-5">
              <div className="h-44 bg-slate-800/80 rounded-2xl mb-4"></div>
              <div className="h-4 bg-slate-800/80 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-800/80 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 p-8 glass-panel rounded-3xl border border-slate-800">
          <Layers className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-white">No Matching Facilities Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try selecting another category or clearing filters to view available campus slots.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition"
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
