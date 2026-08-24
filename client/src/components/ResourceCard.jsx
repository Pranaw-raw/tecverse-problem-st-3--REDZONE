import React from 'react';
import { MapPin, Users, Calendar, ArrowRight, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';
import { getCategoryBadgeStyle, getStatusBadgeStyle } from '../utils/formatters';

export const ResourceCard = ({ resource, onSelectResource, onQuickBook }) => {
  const isMaintenance = resource.status === 'maintenance';
  const isBookable = resource.status === 'available';

  return (
    <div className="glass-card rounded-3xl overflow-hidden flex flex-col group relative transition-all duration-300">
      {/* Image Banner */}
      <div className="relative h-52 w-full overflow-hidden bg-slate-900">
        <img
          src={resource.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'}
          alt={resource.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1424] via-slate-950/30 to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-xl border glass-badge shadow-sm ${getCategoryBadgeStyle(resource.category)}`}>
            {resource.category}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 text-xs font-semibold rounded-xl border glass-badge capitalize flex items-center gap-1.5 shadow-sm ${getStatusBadgeStyle(resource.status)}`}>
            {isMaintenance ? (
              <Wrench className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${isBookable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            )}
            {resource.status}
          </span>
        </div>

        {/* Capacity overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200 shadow">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Capacity: {resource.capacity}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
            {resource.name}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{resource.location}</span>
          </div>

          <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
            {resource.description || 'Modern institutional facility equipped for academic, research, and campus activities.'}
          </p>

          {/* Amenities tags */}
          {resource.amenities && resource.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {resource.amenities.slice(0, 3).map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-[11px] bg-slate-900/80 text-slate-300 rounded-lg border border-slate-800 truncate max-w-[190px]"
                >
                  {item}
                </span>
              ))}
              {resource.amenities.length > 3 && (
                <span className="px-2 py-1 text-[11px] bg-slate-900/50 text-indigo-300 rounded-lg border border-slate-800">
                  +{resource.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2.5">
          <button
            onClick={() => onSelectResource(resource)}
            className="flex-1 px-3 py-2.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => onQuickBook(resource)}
            disabled={!isBookable}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 ${
              isBookable
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-900/30'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <span>{isMaintenance ? 'Under Maint.' : 'Book Slot'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
