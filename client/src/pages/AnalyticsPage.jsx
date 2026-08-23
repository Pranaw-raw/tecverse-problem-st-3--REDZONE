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
  ShieldAlert,
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
  const { isAdmin, switchRole } = useAuth();
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
            .map((fieldName) => JSON.stringify(row[fieldName] || '', (key, value) => (value === null ? '' : value)))
            .join(',')
        ),
      ];

      const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reservehub_campus_utilization_${new Date().toISOString().split('T')[0]}.csv`);
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
        <ShieldAlert className="w-16 h-16 mx-auto text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400 mt-2">
          Analytics dashboard is reserved for administrative reporting and facility allocation insights.
        </p>
        <button
          onClick={() => switchRole('admin')}
          className="mt-6 px-6 py-3 text-xs font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl shadow-lg transition"
        >
          ⚡ Switch to Admin Role (1-Click)
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
        label: 'Active Bookings per Hour',
        data: hourlyValues,
        backgroundColor: 'rgba(99, 102, 241, 0.65)',
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
          'rgba(168, 85, 247, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(244, 63, 94, 0.7)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Chart 3: Most & Least Booked Ranking
  const rankingLabels = (data.ranking || []).map((r) => r.name.length > 20 ? r.name.slice(0, 18) + '...' : r.name);
  const rankingValues = (data.ranking || []).map((r) => r.total_bookings);

  const rankingChartData = {
    labels: rankingLabels,
    datasets: [
      {
        label: 'Total Completed & Upcoming Reservations',
        data: rankingValues,
        backgroundColor: 'rgba(16, 185, 129, 0.65)',
        borderColor: '#10b981',
        borderWidth: 1.5,
        borderRadius: 6,
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
          font: { size: 11, family: 'Inter' },
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
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>FR10 Executive Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Institutional Utilization & Insights Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data-driven metrics to optimize resource allocation, reduce no-shows, and identify peak hours.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Generating CSV...' : 'Export Bookings CSV'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Reservations</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {data.metrics.totalBookings}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>{data.metrics.confirmedBookings} confirmed / active</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg. Utilization Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {data.metrics.averageUtilization}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active vs scheduled facility capacity
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">No-Show Rate</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-heading">
            {data.metrics.noShowRate}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data.metrics.noShowBookings} unattended slots
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Resource Pool</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {data.metrics.activeResources} / {data.metrics.totalResources}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Operational labs, halls & equipment
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Heatmap Chart */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Peak Usage Hours Distribution (8 AM - 8 PM)
              </h3>
              <p className="text-xs text-slate-400">Identifies congestion and high-demand windows</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <Bar data={peakHoursChartData} options={chartOptions} />
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
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
                    labels: { color: '#94a3b8', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Resource Utilization Ranking & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Booked Ranking */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Most vs Least Booked Resources
          </h3>
          <p className="text-xs text-slate-400 mb-4">Ranking by historical reservation volume</p>
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
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Security & Audit Activity Trail
          </h3>
          <p className="text-xs text-slate-400 mb-4">Timestamped record of all booking and admin actions</p>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 pr-1">
            {(data.recentActivity || []).map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                      {act.action}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {act.user_name || 'System'}
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
