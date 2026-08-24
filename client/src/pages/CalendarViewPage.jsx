import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CalendarTimeline } from '../components/CalendarTimeline';
import {
  Calendar as CalendarIcon,
  Layers,
  MapPin,
  Sparkles,
  Search,
  ArrowRight,
  Users,
} from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/formatters';

export const CalendarViewPage = ({ onSelectSlot, onQuickBook }) => {
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      try {
        const res = await api.getResources();
        setResources(res.resources || []);
        if (res.resources && res.resources.length > 0) {
          setSelectedResourceId(res.resources[0].id);
        }
      } catch (err) {
        console.error('Error fetching resources for calendar:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  const filteredResources = resources.filter(
    (r) => categoryFilter === 'All' || r.category === categoryFilter
  );

  const activeResource = resources.find((r) => r.id === selectedResourceId) || filteredResources[0];

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive Availability Map</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-white font-heading">
            Facility Schedule & Live Timeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Select any campus facility to view real-time reservation slots and instantly book available time windows.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Sports', 'Seminar Halls', 'Labs', 'Equipment'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                const nextList = resources.filter((r) => cat === 'All' || r.category === cat);
                if (nextList.length > 0 && !nextList.some((r) => r.id === selectedResourceId)) {
                  setSelectedResourceId(nextList[0].id);
                }
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Facility Selector Strip */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Select Facility to Inspect Timeline:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredResources.map((res) => {
            const isSelected = activeResource?.id === res.id;
            return (
              <button
                key={res.id}
                onClick={() => setSelectedResourceId(res.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 scale-[1.02]'
                    : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-lg border glass-badge ${getCategoryBadgeStyle(
                      res.category
                    )}`}
                  >
                    {res.category}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      res.status === 'available' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white truncate">{res.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{res.location}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Calendar Timeline for Selected Resource */}
      {activeResource ? (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <img
                src={activeResource.image_url}
                alt={activeResource.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-sm shrink-0"
              />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{activeResource.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {activeResource.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Capacity: {activeResource.capacity}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onQuickBook(activeResource)}
              className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <span>Book Facility</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <CalendarTimeline
            resource={activeResource}
            onSelectSlot={onSelectSlot}
            onQuickBook={onQuickBook}
          />
        </div>
      ) : (
        <div className="p-8 text-center glass-panel rounded-3xl text-slate-400 text-xs">
          Loading facility schedule...
        </div>
      )}
    </div>
  );
};
