import React from 'react';
import { CalendarTimeline } from './CalendarTimeline';
import {
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
  ShieldAlert,
  Wrench,
  BookOpen,
} from 'lucide-react';
import { getCategoryBadgeStyle, getStatusBadgeStyle } from '../utils/formatters';

export const ResourceDetailsModal = ({ resource, onClose, onSelectSlot, onQuickBook }) => {
  if (!resource) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-slide-up">
        {/* Header Hero Image */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 shrink-0">
          <img
            src={resource.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'}
            alt={resource.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Info */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-lg border backdrop-blur-md ${getCategoryBadgeStyle(
                  resource.category
                )}`}
              >
                {resource.category}
              </span>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-lg border backdrop-blur-md capitalize flex items-center gap-1.5 ${getStatusBadgeStyle(
                  resource.status
                )}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {resource.status}
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 backdrop-blur-md flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> Max Capacity: {resource.capacity}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading">
              {resource.name}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{resource.location}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Facility Description & Overview
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">{resource.description}</p>
          </div>

          {/* Amenities & Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amenities */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Hardware & Equipment Amenities
              </h4>
              <ul className="space-y-2">
                {resource.amenities && resource.amenities.length > 0 ? (
                  resource.amenities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">Standard institutional facilities included.</li>
                )}
              </ul>
            </div>

            {/* Rules */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Operating Rules & Guidelines
              </h4>
              <ul className="space-y-2">
                {resource.rules && resource.rules.length > 0 ? (
                  resource.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">Standard campus lab guidelines apply.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Interactive Timeline Embed */}
          <div className="pt-2">
            <CalendarTimeline
              resource={resource}
              onSelectSlot={(slotData) => {
                onClose();
                onSelectSlot(slotData);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
