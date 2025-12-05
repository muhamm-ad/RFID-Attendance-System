// components/LogsTable.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { AttendanceLog, PersonWithPayments } from "@/lib/db";
import {
  Clock,
  RefreshCw,
  LogIn,
  LogOut,
  UserCircle2,
} from "lucide-react";
import DataTable, { Column } from "./DataTable";
import PersonSearchDropdown from "./PersonSearchDropdown";
import PersonAvatar from "./PersonAvatar";
import { statusColors, BadgeGray, formatLevel, inputClasses, selectClasses } from "@/lib/ui-utils";

export default function LogsTable() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    action: "",
    level: "",
    class: "",
    type: "",
    limit: 25,
  });
  const [persons, setPersons] = useState<PersonWithPayments[]>([]);
  const [uniqueLevels, setUniqueLevels] = useState<string[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [personSearchTerm, setPersonSearchTerm] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  useEffect(() => {
    loadPersons();
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status) params.append("status", filters.status);
      if (filters.action) params.append("action", filters.action);
      if (filters.level) params.append("level", filters.level);
      if (filters.class) params.append("class", filters.class);
      if (selectedPersonId) {
        params.append("personId", selectedPersonId.toString());
      }
      params.append("limit", filters.limit.toString());

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load logs");
      setLogs(data as AttendanceLog[]);
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.status,
    filters.action,
    filters.level,
    filters.class,
    filters.type,
    filters.limit,
    selectedPersonId,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function loadPersons() {
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      if (res.ok) {
        setPersons(data);

        // Extract unique levels and classes
        const levels = new Set<string>();
        const classes = new Set<string>();
        data.forEach((p: PersonWithPayments) => {
          if (p.level) levels.add(p.level);
          if (p.class) classes.add(p.class);
        });
        setUniqueLevels(Array.from(levels).sort());
        setUniqueClasses(Array.from(classes).sort());
      }
    } catch (e) {
      console.error("Failed to load persons", e);
    }
  }

  const actionIcons = useMemo(
    () => ({
      in: <LogIn size={16} className="text-blue-600" />,
      out: <LogOut size={16} className="text-purple-600" />,
    }),
    []
  );

  const getSortValue = (log: AttendanceLog, key: string): any => {
    switch (key) {
      case "timestamp":
        return new Date(log.timestamp).getTime();
      case "person_id":
        return log.person_id;
      case "person_name":
        return log.person_name.toLowerCase();
      case "person_type":
        return log.person_type.toLowerCase();
      case "level":
        return log.level?.toLowerCase() || "";
      case "class":
        return log.class?.toLowerCase() || "";
      case "action":
        return log.action;
      case "status":
        return log.status;
      case "rfid_uuid":
        return log.rfid_uuid.toLowerCase();
      default:
        return "";
    }
  };

  async function handlePersonSelect(personId: number) {
    const person = persons.find((p) => p.id === personId);
    if (person) {
      setPersonSearchTerm(`${person.prenom} ${person.nom}`);
    }
    setSelectedPersonId(personId);
    await loadLogs();
  }

  async function clearPersonSelection() {
    setSelectedPersonId(null);
    setPersonSearchTerm("");
    await loadLogs();
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock size={28} />
            Attendance Logs
          </h2>
          <p className="text-gray-600 mt-1">
            View all access attempts and attendance records
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex gap-3 items-end overflow-x-auto pb-2">
          <div className="flex-1 min-w-[300px] flex-shrink-0">
            <PersonSearchDropdown
              persons={persons}
              selectedPersonId={selectedPersonId}
              searchTerm={personSearchTerm}
              onSearchChange={setPersonSearchTerm}
              onPersonSelect={handlePersonSelect}
              onClear={clearPersonSelection}
              placeholder="Search by name, ID or UUID..."
              label={
                <span className="flex items-center gap-2">
                  <UserCircle2 size={16} />
                  Recherche personne
                </span>
              }
              onFocus={() => {
                if (persons.length === 0) {
                  loadPersons();
                }
              }}
            />
          </div>
          <div className="w-40 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className={inputClasses}
            />
          </div>
          <div className="w-40 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className={inputClasses}
            />
          </div>
          <div className="w-32 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className={selectClasses}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="w-32 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
              className={selectClasses}
            >
              <option value="">All Actions</option>
              <option value="in">Entry (In)</option>
              <option value="out">Exit (Out)</option>
            </select>
          </div>
          <div className="w-40 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={filters.level}
              onChange={(e) =>
                setFilters({ ...filters, level: e.target.value })
              }
              className={selectClasses}
            >
              <option value="">All Levels</option>
              {uniqueLevels.map((level) => (
                <option key={level} value={level}>
                  {level.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class
            </label>
            <select
              value={filters.class}
              onChange={(e) =>
                setFilters({ ...filters, class: e.target.value })
              }
              className={selectClasses}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((classItem) => (
                <option key={classItem} value={classItem}>
                  {classItem}
                </option>
              ))}
            </select>
          </div>
          <div className="w-48 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters({ ...filters, type: e.target.value })
              }
              className={selectClasses}
            >
              <option value="">All Types</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="staff">Staff</option>
              <option value="visitor">Visitors</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <DataTable
        data={logs}
        columns={useMemo<Column<AttendanceLog>[]>(
          () => [
            {
              key: "timestamp",
              label: "Timestamp",
              sortKey: "timestamp",
              render: (log) => (
                <span className="text-sm text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              ),
            },
            {
              key: "person",
              label: "Person",
              sortKey: "person_name",
              render: (log) => (
                <div className="flex items-center gap-3">
                  <PersonAvatar
                    photoPath={log.photo_path}
                    name={log.person_name}
                    size="md"
                  />
                  <div className="font-medium text-gray-900">
                    {log.person_name}
                  </div>
                </div>
              ),
            },
            {
              key: "person_id",
              label: "Person ID",
              sortKey: "person_id",
              render: (log) => (
                <span className="text-sm text-gray-600 font-mono">
                  {log.person_id}
                </span>
              ),
            },
            {
              key: "person_type",
              label: "Type",
              sortKey: "person_type",
              render: (log) => <BadgeGray>{log.person_type}</BadgeGray>,
            },
            {
              key: "level",
              label: "Level",
              sortKey: "level",
              render: (log) => <BadgeGray>{formatLevel(log.level)}</BadgeGray>,
            },
            {
              key: "class",
              label: "Class",
              sortKey: "class",
              render: (log) => <BadgeGray>{log.class || "-"}</BadgeGray>,
            },
            {
              key: "action",
              label: "Action",
              sortKey: "action",
              render: (log) => (
                <div className="flex items-center gap-2">
                  {actionIcons[log.action]}
                  <span className="text-sm text-gray-700 capitalize">
                    {log.action}
                  </span>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              sortKey: "status",
              render: (log) => (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusColors[log.status]
                  }`}
                >
                  {log.status}
                </span>
              ),
            },
            {
              key: "rfid_uuid",
              label: "RFID UUID",
              sortKey: "rfid_uuid",
              render: (log) => (
                <span className="text-sm text-gray-600 font-mono">
                  {log.rfid_uuid}
                </span>
              ),
            },
          ],
          [actionIcons]
        )}
        loading={loading}
        emptyMessage="No records found"
        limit={filters.limit}
        defaultSortKey="timestamp"
        defaultSortDirection="desc"
        getSortValue={getSortValue}
      />

      <div className="flex justify-end mt-4">
        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
            Limit
          </label>
          <select
            value={filters.limit}
            onChange={(e) =>
              setFilters({ ...filters, limit: parseInt(e.target.value) })
            }
            className={selectClasses}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </div>
      </div>
    </div>
  );
}
