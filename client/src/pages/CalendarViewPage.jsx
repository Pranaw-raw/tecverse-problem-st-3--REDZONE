import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CalendarTimeline } from '../components/CalendarTimeline';
import {
  Calendar as CalendarIcon,
  Layers,
  MapPin,
  Sparkles,
  RefreshCw,
  Search,
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
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Master Interactive Timeline</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Live Institutional Schedule & Slot Allocator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time visual map of all labs, seminar halls, and equipment booking schedules.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Labs', 'Seminar Halls', 'Equipment', 'Sports'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                const nextList = resources.filter((r) => cat === 'All' || r.category === cat);
                if (nextList.length > 0 && !nextList.some((r) => r.id === selectedResourceId)) {
                  setSelectedResourceId(nextList[0].id);
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Selector Carousel / Row */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Select Campus Resource to Inspect:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredResources.map((res) => {
            const isSelected = activeResource?.id === res.id;
            return (
              <button
                key={res.id}
                onClick={() => setSelectedResourceId(res.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/40 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getCategoryBadgeStyle(
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
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
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
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeResource.image_url}
                alt={activeResource.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <h3 className="text-sm font-bold text-white">{activeResource.name}</h3>
                <p className="text-xs text-slate-400">{activeResource.location} • Capacity: {activeResource.capacity}</p>
              </div>
            </div>

            <button
              onClick={() => onQuickBook(activeResource)}
              className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white rounded-xl shadow-md transition"
            >
              Book This Facility
            </button>
          </div>

          <CalendarTimeline
            resource={activeResource}
            onSelectSlot={onSelectSlot}
            onQuickBook={onQuickBook}
          />
        </div>
      ) : (
        <div className="p-8 text-center glass-panel rounded-2xl text-slate-400 text-xs">
          Loading resource schedule...
        </div>
      )}
    </div>
  );
};
