export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatTimeRange = (startIso, endIso) => {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();

  const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (sameDay) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${startStr} – ${endStr}`;
  }
  return `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
};

export const getCategoryBadgeStyle = (category) => {
  switch (category) {
    case 'Labs':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'Seminar Halls':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'Equipment':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'Sports':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
};

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'available':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'maintenance':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'inactive':
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    case 'upcoming':
      return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    case 'checked-in':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'cancelled':
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    case 'no-show':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
};

export const getCountdown = (startIso) => {
  if (!startIso) return null;
  const diff = new Date(startIso).getTime() - Date.now();
  if (diff <= 0) return 'In Progress / Passed';

  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins} mins`;
};
