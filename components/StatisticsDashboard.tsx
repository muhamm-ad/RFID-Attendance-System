// components/StatisticsDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  BarChart3,
} from "lucide-react";

type Stats = {
  range: {
    start: string;
    end: string;
    days: number;
  };
  general: {
    total_persons: number;
    total_students: number;
    total_teachers: number;
    total_staff: number;
    total_visitors: number;
  };
  attendance_summary: {
    total: number;
    success: number;
    failed: number;
    entries: number;
    exits: number;
  };
  attendance_by_type: Array<{
    type: string;
    count: number;
    success: number;
    failed: number;
  }>;
  payments: {
    current_trimester: number;
    total_students: number;
    students_paid: number;
    students_unpaid: number;
    payment_rate: string;
  };
  top_attendance: Array<{
    id: number;
    nom: string;
    prenom: string;
    type: string;
    attendance_count: number;
  }>;
  recent_activity: Array<{
    id: number;
    action: string;
    status: string;
    attendance_date: string;
    nom: string;
    prenom: string;
    type: string;
  }>;
  attendance_trend: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
    entries: number;
    exits: number;
  }>;
};

export default function StatisticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
      });
      const res = await fetch(`/api/stats?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load statistics");
      setStats(data);
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-12 text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const successRate =
    stats.attendance_summary.total > 0
      ? (
          (stats.attendance_summary.success / stats.attendance_summary.total) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 size={28} />
              Statistics Dashboard
            </h2>
            <p className="text-gray-600 mt-1">Comprehensive system statistics and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => {
                const value = e.target.value;
                setStartDate(value);
                if (value > endDate) {
                  setEndDate(value);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-500">à</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                const value = e.target.value;
                setEndDate(value);
                if (value < startDate) {
                  setStartDate(value);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={loadStats}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* General Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Persons</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.general.total_persons}
              </p>
            </div>
            <Users className="text-indigo-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Students</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stats.general.total_students}
              </p>
            </div>
            <Users className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Teachers</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {stats.general.total_teachers}
              </p>
            </div>
            <Users className="text-purple-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staff</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.general.total_staff}
              </p>
            </div>
            <Users className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visitors</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {stats.general.total_visitors}
              </p>
            </div>
            <Users className="text-orange-600" size={32} />
          </div>
        </div>
      </div>

      {/* Today's Attendance */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Calendar size={24} />
          Attendance from{" "}
          {new Date(`${stats.range.start}T00:00:00`).toLocaleDateString()} to{" "}
          {new Date(`${stats.range.end}T00:00:00`).toLocaleDateString()}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Scans</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats.attendance_summary.total}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.attendance_summary.success}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={20} className="text-red-600" />
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {stats.attendance_summary.failed}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Entries</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats.attendance_summary.entries}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Exits</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {stats.attendance_summary.exits}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Success Rate</span>
            <span className="text-sm font-bold text-indigo-600">{successRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Attendance by Type */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Attendance by Type</h3>
        <div className="space-y-4">
          {stats.attendance_by_type.map((item) => (
            <div key={item.type} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800 capitalize">{item.type}</span>
                <span className="text-sm text-gray-600">{item.count} total</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {item.success} successful
                </span>
                <span className="text-red-600 font-medium">{item.failed} failed</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Trend */}
      {stats.attendance_trend.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={24} />
              Attendance Trend ({stats.range.days} Days)
            </h3>
            <span className="text-sm text-gray-500">
              {new Date(`${stats.range.start}T00:00:00`).toLocaleDateString()} -{" "}
              {new Date(`${stats.range.end}T00:00:00`).toLocaleDateString()}
            </span>
          </div>
          <TrendChart data={stats.attendance_trend} />
        </div>
      )}

      {/* Payment Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <DollarSign size={24} />
          Payment Statistics - Trimester {stats.payments.current_trimester}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {stats.payments.total_students}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.payments.students_paid}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Unpaid</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {stats.payments.students_unpaid}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Payment Rate</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats.payments.payment_rate}
            </p>
          </div>
        </div>
      </div>

      {/* Top Attendance */}
      {stats.top_attendance.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={24} />
            Top 10 Attendance This Month
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.top_attendance.map((person, index) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                      {person.prenom} {person.nom}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                        {person.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {person.attendance_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats.recent_activity.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h3>
          <div className="space-y-3">
            {stats.recent_activity.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      activity.status === "success"
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    {activity.status === "success" ? (
                      <CheckCircle
                        size={16}
                        className={activity.status === "success" ? "text-green-600" : "text-red-600"}
                      />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {activity.prenom} {activity.nom}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {activity.type} • {activity.action}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(activity.attendance_date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type TrendPoint = Stats["attendance_trend"][number];

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No trend data available.</p>;
  }

  const chartWidth = 600;
  const chartHeight = 260;
  const padding = 32;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;
  const lineConfig: Array<{ key: keyof TrendPoint; color: string; label: string }> = [
    { key: "total", color: "#4f46e5", label: "Total scans" },
    { key: "entries", color: "#2563eb", label: "Entrées" },
    { key: "exits", color: "#9333ea", label: "Sorties" },
  ];
  const maxValue =
    Math.max(
      ...lineConfig.flatMap((config) =>
        data.map((point) => Number(point[config.key]) || 0)
      )
    ) || 1;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  const buildPath = (key: keyof TrendPoint) => {
    return data
      .map((point, index) => {
        const value = Number(point[key]) || 0;
        const x = padding + index * stepX;
        const y = chartHeight - padding - (value / maxValue) * innerHeight;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  const formatLabel = (isoDate: string) => {
    const dateObj = new Date(`${isoDate}T00:00:00`);
    return dateObj.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full">
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64">
          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, index) => {
            const y = padding + (innerHeight / 3) * index;
            return (
              <line
                key={`grid-${index}`}
                x1={padding}
                x2={chartWidth - padding}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Lines */}
          {lineConfig.map((config) => (
            <path
              key={config.key as string}
              d={buildPath(config.key)}
              fill="none"
              stroke={config.color}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}

          {/* Data points */}
          {lineConfig.map((config) =>
            data.map((point, index) => {
              const value = Number(point[config.key]) || 0;
              const x = padding + index * stepX;
              const y = chartHeight - padding - (value / maxValue) * innerHeight;
              return (
                <circle
                  key={`${config.key}-${point.date}`}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="#fff"
                  stroke={config.color}
                  strokeWidth={2}
                />
              );
            })
          )}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        {data.map((point) => (
          <span key={point.date}>{formatLabel(point.date)}</span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {lineConfig.map((config) => (
          <div key={config.key as string} className="flex items-center gap-2 text-gray-600">
            <span
              className="inline-block h-2 w-6 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </div>
        ))}
      </div>
    </div>
  );
}

