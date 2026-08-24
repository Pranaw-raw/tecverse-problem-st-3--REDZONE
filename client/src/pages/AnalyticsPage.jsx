import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  Download,
  Activity,
  Layers,
  Clock,
  AlertOctagon,
  CheckCircle,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { formatDateTime } from '../utils/formatters';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const AnalyticsPage = () => {
  const { user, isAdmin, switchRole } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await api.exportBookings();
      const bookings = res.bookings || [];

      if (bookings.length === 0) {
        alert('No booking data to export.');
        return;
      }

      const headers = Object.keys(bookings[0]);
      const csvRows = [
        headers.join(','),
        ...bookings.map((row) =>
          headers
            .map((fieldName) =>
              JSON.stringify(row[fieldName] || '', (key, value) => (value === null ? '' : value))
            )
            .join(',')
        ),
      ];

      const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `reservehub_campus_utilization_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-20 p-8 glass-panel rounded-3xl border border-slate-800 max-w-lg mx-auto animate-fade-in">
        <ShieldCheck className="w-16 h-16 mx-auto text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-300 mt-2">
          The Analytics Dashboard is reserved for administrative reporting and facility allocation insights.
        </p>
        <button
          onClick={() => switchRole('admin')}
          className="mt-6 px-6 py-3 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/40 transition active:scale-95"
        >
          Switch to Admin (Dr. Elena Vance)
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-48 glass-panel rounded-3xl animate-pulse bg-slate-900/60"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 glass-panel rounded-3xl animate-pulse bg-slate-900/60"></div>
          <div className="h-72 glass-panel rounded-3xl animate-pulse bg-slate-900/60"></div>
        </div>
      </div>
    );
  }

  // Chart 1: Hourly Peak Load
  const hourlyLabels = Object.keys(data.hourlyDistribution || {});
  const hourlyValues = Object.values(data.hourlyDistribution || {});

  const peakHoursChartData = {
    labels: hourlyLabels,
    datasets: [
      {
        label: 'Bookings per Hour',
        data: hourlyValues,
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderColor: '#6366f1',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  // Chart 2: Category Distribution
  const categoryLabels = (data.categoryStats || []).map((c) => c.category);
  const categoryCounts = (data.categoryStats || []).map((c) => c.booking_count);

  const categoryChartData = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Bookings by Category',
        data: categoryCounts,
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(244, 63, 94, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Chart 3: Most & Least Booked Ranking
  const rankingLabels = (data.ranking || []).map((r) =>
    r.name.length > 22 ? r.name.slice(0, 20) + '...' : r.name
  );
  const rankingValues = (data.ranking || []).map((r) => r.total_bookings);

  const rankingChartData = {
    labels: rankingLabels,
    datasets: [
      {
        label: 'Completed & Upcoming Bookings',
        data: rankingValues,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderColor: '#10b981',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'Plus Jakarta Sans' },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header & Export Action */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Executive Analytics & Utilization</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-white font-heading">
            Campus Utilization & Insights
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time telemetry and resource usage trends across all university faculties.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Exporting...' : 'Export Bookings CSV'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-5 rounded-3xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Bookings</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {data.metrics.totalBookings}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{data.metrics.confirmedBookings} confirmed / active</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg. Utilization Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {data.metrics.averageUtilization}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Active vs scheduled capacity
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">No-Show Rate</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-heading">
            {data.metrics.noShowRate}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {data.metrics.noShowBookings} unattended reservations
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Operational Facilities</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {data.metrics.activeResources} / {data.metrics.totalResources}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1.5">
            Active labs, halls & equipment
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Heatmap Chart */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Peak Booking Hours Distribution (08:00 – 20:00)
              </h3>
              <p className="text-xs text-slate-400">Campus traffic and facility load across the day</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <Bar data={peakHoursChartData} options={chartOptions} />
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Facility Demand by Category
              </h3>
              <p className="text-xs text-slate-400">Distribution of reservations across facility domains</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 11, family: 'Plus Jakarta Sans' } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Facility Utilization Ranking & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Booked Ranking */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800">
          <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Facility Popularity Ranking
          </h3>
          <p className="text-xs text-slate-400 mb-4">Ranked by total historical booking volume</p>
          <div className="h-64 w-full">
            <Bar
              data={rankingChartData}
              options={{
                ...chartOptions,
                indexAxis: 'y',
              }}
            />
          </div>
        </div>

        {/* Real-time System Audit Activity Log */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 flex flex-col">
          <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Live Audit & Booking Activity Log
          </h3>
          <p className="text-xs text-slate-400 mb-4">Real-time log of reservations, check-ins, and changes</p>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 pr-1">
            {(data.recentActivity || []).map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                      {act.action}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {act.user_name || 'Campus Member'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{act.details}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {formatDateTime(act.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
