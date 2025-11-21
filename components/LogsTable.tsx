// components/LogsTable.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { AttendanceLog } from "@/lib/types";
import { ArrowUpDown, Clock, RefreshCw, LogIn, LogOut, UserCircle2, Search, ChevronDown, X } from "lucide-react";

export default function LogsTable() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    action: "",
    limit: 100,
  });
  const [personQuery, setPersonQuery] = useState("");
  const [persons, setPersons] = useState<Array<{ id: number; nom: string; prenom: string; rfid_uuid: string }>>([]);
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const [personSearchTerm, setPersonSearchTerm] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const personDropdownRef = useRef<HTMLDivElement>(null);
  const personInputRef = useRef<HTMLInputElement>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "timestamp",
    direction: "desc",
  });

  type SortKey = "timestamp" | "person_name" | "person_id" | "person_type" | "action" | "status" | "rfid_uuid";

  useEffect(() => {
    loadPersons();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters.startDate, filters.endDate, filters.status, filters.action, filters.limit, selectedPersonId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    }

    if (isPersonDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isPersonDropdownOpen]);

  async function loadPersons() {
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      if (res.ok) {
        setPersons(data.map((p: any) => ({
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          rfid_uuid: p.rfid_uuid,
        })));
      }
    } catch (e) {
      console.error("Failed to load persons", e);
    }
  }

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status) params.append("status", filters.status);
      if (filters.action) params.append("action", filters.action);
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
  }

  const statusColors = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  const actionIcons = {
    in: <LogIn size={16} className="text-blue-600" />,
    out: <LogOut size={16} className="text-purple-600" />,
  };

  const sortedLogs = useMemo(() => {
    const sorted = [...logs];
    sorted.sort((a, b) => {
      const getComparableValue = (log: AttendanceLog, key: SortKey) => {
        switch (key) {
          case "timestamp":
            return new Date(log.timestamp).getTime();
          case "person_id":
            return log.person_id;
          case "person_name":
            return log.person_name.toLowerCase();
          case "person_type":
            return log.person_type.toLowerCase();
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

      const aValue = getComparableValue(a, sortConfig.key);
      const bValue = getComparableValue(b, sortConfig.key);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      return sortConfig.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    return sorted;
  }, [logs, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortableHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
    >
      {label}
      <ArrowUpDown size={14} className={sortConfig.key === key ? "text-indigo-600" : "text-gray-400"} />
    </button>
  );

  // Filter persons based on search term
  const filteredPersons = persons.filter((person) => {
    if (!personSearchTerm) return true;
    const search = personSearchTerm.toLowerCase();
    return (
      person.nom.toLowerCase().includes(search) ||
      person.prenom.toLowerCase().includes(search) ||
      person.id.toString().includes(search) ||
      person.rfid_uuid.toLowerCase().includes(search)
    );
  });

  async function handlePersonSelect(personId: number) {
    const person = persons.find((p) => p.id === personId);
    if (person) {
      setPersonSearchTerm(`${person.prenom} ${person.nom}`);
    }
    setSelectedPersonId(personId);
    setIsPersonDropdownOpen(false);
    // Automatically load logs for the selected person
    await loadLogs();
  }

  function handlePersonInputChange(value: string) {
    setPersonSearchTerm(value);
    setIsPersonDropdownOpen(true);
    if (value === "") {
      setSelectedPersonId(null);
    }
  }

  function handlePersonInputFocus() {
    setIsPersonDropdownOpen(true);
    // Load persons if not already loaded
    if (persons.length === 0) {
      loadPersons();
    }
  }

  async function clearPersonSelection() {
    setSelectedPersonId(null);
    setPersonSearchTerm("");
    setIsPersonDropdownOpen(false);
    // Reload all logs when clearing selection
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
          <p className="text-gray-600 mt-1">View all access attempts and attendance records</p>
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
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <UserCircle2 size={16} />
              Recherche personne
            </label>
            <div className="relative" ref={personDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
                <input
                  ref={personInputRef}
                  type="text"
                  value={personSearchTerm}
                  onChange={(e) => handlePersonInputChange(e.target.value)}
                  onFocus={handlePersonInputFocus}
                  placeholder="Search by name, ID or UUID..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {selectedPersonId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPersonSelection();
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <ChevronDown 
                    size={18} 
                    className={`text-gray-400 transition-transform ${isPersonDropdownOpen ? 'transform rotate-180' : ''}`}
                  />
                </div>
              </div>
              
              {/* Dropdown List */}
              {isPersonDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredPersons.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No persons found
                    </div>
                  ) : (
                    <ul className="py-1">
                      {filteredPersons.map((person) => (
                        <li
                          key={person.id}
                          onClick={() => handlePersonSelect(person.id)}
                          className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 ${
                            selectedPersonId === person.id ? "bg-indigo-100" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {person.prenom} {person.nom}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              ID: {person.id}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-1">
                            {person.rfid_uuid}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actions</option>
              <option value="in">Entry (In)</option>
              <option value="out">Exit (Out)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                {renderSortableHeader("Timestamp", "timestamp")}
              </th>
              <th className="px-4 py-3">
                {renderSortableHeader("Person", "person_name")}
              </th>
              <th className="px-4 py-3">
                {renderSortableHeader("Person ID", "person_id")}
              </th>
              <th className="px-4 py-3">
                {renderSortableHeader("Type", "person_type")}
              </th>
              <th className="px-4 py-3">
                {renderSortableHeader("Action", "action")}
              </th>
              <th className="px-4 py-3">
                {renderSortableHeader("Status", "status")}
              </th>
              <th className="px-4 py-3">
                {renderSortableHeader("RFID UUID", "rfid_uuid")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              sortedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{log.person_name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {log.person_id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                      {log.person_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {actionIcons[log.action]}
                      <span className="text-sm text-gray-700 capitalize">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[log.status]
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {log.rfid_uuid}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
            Limit
          </label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
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


