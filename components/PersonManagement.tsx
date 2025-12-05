// components/PersonManagement.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { PersonWithPayments } from "@/lib/db";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Scan,
} from "lucide-react";
import DataTable, { Column } from "./DataTable";
import PersonSearchDropdown from "./PersonSearchDropdown";
import PersonAvatar from "./PersonAvatar";
import {
  typeColors,
  BadgeGray,
  BadgeBlue,
  formatLevel,
  inputClasses,
  selectClasses,
  buttonPrimaryClasses,
  buttonSecondaryClasses,
} from "@/lib/ui-utils";
// import { useClickOutside } from "@/hooks/useClickOutside";
// import Image from "next/image";

export default function PersonManagement() {
  const [persons, setPersons] = useState<PersonWithPayments[]>([]);
  const [allPersons, setAllPersons] = useState<PersonWithPayments[]>([]); // Store all persons for dropdown
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [filters, setFilters] = useState({
    level: "",
    class: "",
    limit: 25,
  });
  const [uniqueLevels, setUniqueLevels] = useState<string[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithPayments | null>(
    null
  );
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    rfid_uuid: "",
    type: "student" as "student" | "teacher" | "staff" | "visitor",
    nom: "",
    prenom: "",
    photo_path: "",
    level: "" as
      | ""
      | "License_1"
      | "License_2"
      | "License_3"
      | "Master_1"
      | "Master_2",
    class: "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string | null>(null);

  const loadPersons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        typeFilter === "all"
          ? "/api/persons"
          : `/api/persons?type=${typeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load persons");
      
      // Extract unique levels and classes
      const levels = new Set<string>();
      const classes = new Set<string>();
      data.forEach((p: PersonWithPayments) => {
        if (p.level) levels.add(p.level);
        if (p.class) classes.add(p.class);
      });
      setUniqueLevels(Array.from(levels).sort());
      setUniqueClasses(Array.from(classes).sort());
      
      // Apply filters
      let filtered = data;
      if (filters.level) {
        filtered = filtered.filter((p: PersonWithPayments) => p.level === filters.level);
      }
      if (filters.class) {
        filtered = filtered.filter((p: PersonWithPayments) => p.class === filters.class);
      }
      
      setPersons(filtered);
      setAllPersons(data); // Store all persons for dropdown
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, filters.level, filters.class]);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

  // Auto-search when typing (debounced) or when filters change
  useEffect(() => {
    if (searchTerm.length >= 2 && !selectedPersonId) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (searchTerm.length === 0 && !selectedPersonId) {
      loadPersons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedPersonId, filters.level, filters.class]);

  async function handleSearch() {
    if (searchTerm.length < 2 && !selectedPersonId) {
      loadPersons();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let data: PersonWithPayments[] = [];
      if (selectedPersonId) {
        // If a person is selected, filter locally from all persons
        if (allPersons.length > 0) {
          data = allPersons.filter(
            (p: PersonWithPayments) => p.id === selectedPersonId
          );
        } else {
          // If allPersons is not loaded, load it first
          const url =
            typeFilter === "all"
              ? "/api/persons"
              : `/api/persons?type=${typeFilter}`;
          const res = await fetch(url);
          const fetchedData = await res.json();
          if (!res.ok) throw new Error(fetchedData?.error || "Failed to load persons");
          setAllPersons(fetchedData);
          data = fetchedData.filter(
            (p: PersonWithPayments) => p.id === selectedPersonId
          );
        }
      } else {
        const url =
          typeFilter === "all"
            ? `/api/search?q=${encodeURIComponent(searchTerm)}`
            : `/api/search?q=${encodeURIComponent(
                searchTerm
              )}&type=${typeFilter}`;
        const res = await fetch(url);
        const fetchedData = await res.json();
        if (!res.ok) throw new Error(fetchedData?.error || "Search failed");
        data = fetchedData;
      }
      
      // Apply level and class filters
      if (filters.level) {
        data = data.filter((p: PersonWithPayments) => p.level === filters.level);
      }
      if (filters.class) {
        data = data.filter((p: PersonWithPayments) => p.class === filters.class);
      }
      
      setPersons(data);
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePersonSelect(personId: number) {
    const person = allPersons.find((p) => p.id === personId);
    if (person) {
      setSearchTerm(`${person.prenom} ${person.nom}`);
    }
    setSelectedPersonId(personId);

    // Automatically search/filter for the selected person immediately
    setLoading(true);
    setError(null);
    try {
      if (allPersons.length > 0) {
        const filtered = allPersons.filter(
          (p: PersonWithPayments) => p.id === personId
        );
        setPersons(filtered);
      } else {
        // If allPersons is not loaded, load it first
        const url =
          typeFilter === "all"
            ? "/api/persons"
            : `/api/persons?type=${typeFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load persons");
        setAllPersons(data);
        const filtered = data.filter(
          (p: PersonWithPayments) => p.id === personId
        );
        setPersons(filtered);
      }
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchInputChange(value: string) {
    setSearchTerm(value);
    if (value === "") {
      setSelectedPersonId(null);
      loadPersons();
    }
  }

  function clearSearchSelection() {
    setSelectedPersonId(null);
    setSearchTerm("");
    loadPersons();
  }

  function resetForm() {
    setFormData({
      rfid_uuid: "",
      type: "student",
      nom: "",
      prenom: "",
      photo_path: "",
      level: "",
      class: "",
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setEditingPerson(null);
    setShowForm(false);
    setIsScanning(false);
    setScanStatus("idle");
    setLastScanTimestamp(null);
  }

  // Check if UUID already exists
  const checkDuplicateUUID = useCallback((uuid: string): boolean => {
    if (!uuid) return false;
    return allPersons.some(
      (p) => p.rfid_uuid.toLowerCase() === uuid.toLowerCase() && 
             (!editingPerson || p.id !== editingPerson.id)
    );
  }, [allPersons, editingPerson]);

  // Start scanning - poll for new scans
  const startScanning = useCallback(() => {
    setIsScanning(true);
    setScanStatus("scanning");
    setLastScanTimestamp(new Date().toISOString());
  }, []);

  // Stop scanning
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setScanStatus("idle");
  }, []);

  // Poll for latest scan
  useEffect(() => {
    if (!isScanning || !showForm) return;

    const pollInterval = setInterval(async () => {
      try {
        const url = lastScanTimestamp
          ? `/api/scan?since=${encodeURIComponent(lastScanTimestamp)}`
          : "/api/scan";
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.success && data.rfid_uuid) {
          // Check for duplicate UUID
          if (checkDuplicateUUID(data.rfid_uuid)) {
            setScanStatus("error");
            setError(`UUID ${data.rfid_uuid} already exists. Please use a different badge.`);
            setTimeout(() => {
              setScanStatus("idle");
              setError(null);
            }, 3000);
            setIsScanning(false);
            return;
          }

          // Update form with scanned UUID
          setFormData((prev) => ({ ...prev, rfid_uuid: data.rfid_uuid }));
          setScanStatus("success");
          setLastScanTimestamp(data.timestamp);
          setIsScanning(false);

          // Reset success status after 2 seconds
          setTimeout(() => {
            setScanStatus("idle");
          }, 2000);
        }
      } catch (e: any) {
        console.error("Error polling for scan:", e);
        setScanStatus("error");
        setTimeout(() => {
          setScanStatus("idle");
        }, 2000);
      }
    }, 500); // Poll every 500ms

    return () => clearInterval(pollInterval);
  }, [isScanning, lastScanTimestamp, checkDuplicateUUID, showForm]);

  // Stop scanning when form is closed
  useEffect(() => {
    if (!showForm && isScanning) {
      setIsScanning(false);
      setScanStatus("idle");
    }
  }, [showForm, isScanning]);

  async function handlePhotoUpload(file: File): Promise<string> {
    const uploadFormData = new FormData();
    uploadFormData.append("photo", file);

    const res = await fetch("/api/upload-photo", {
      method: "POST",
      body: uploadFormData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Photo upload failed");

    return data.photo_path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUploadingPhoto(true);

    try {
      let photoPath = formData.photo_path;

      // Upload photo if a new file is selected
      if (selectedPhoto) {
        photoPath = await handlePhotoUpload(selectedPhoto);
      }

      const url = editingPerson
        ? `/api/persons/${editingPerson.id}`
        : "/api/persons";
      const method = editingPerson ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          photo_path: photoPath || formData.photo_path || null,
          level: formData.type === "student" ? formData.level || null : null,
          class: formData.class || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Operation failed");

      resetForm();
      await loadPersons();
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Are you sure you want to delete this person?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/persons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      await loadPersons();
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    }
  }, [loadPersons]);

  function startEdit(person: PersonWithPayments) {
    setEditingPerson(person);
    setFormData({
      rfid_uuid: person.rfid_uuid,
      type: person.type,
      nom: person.nom,
      prenom: person.prenom,
      photo_path: person.photo_path || "",
      level: (person.level || "") as
        | ""
        | "License_1"
        | "License_2"
        | "License_3"
        | "Master_1"
        | "Master_2",
      class: person.class || "",
    });
    setSelectedPhoto(null);
    setPhotoPreview(person.photo_path || null);
    setShowForm(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  const getSortValue = (person: PersonWithPayments, key: string): any => {
    switch (key) {
      case "id":
        return person.id;
      case "nom":
        return `${person.prenom} ${person.nom}`.toLowerCase();
      case "type":
        return person.type;
      case "level":
        return person.level || "";
      case "class":
        return person.class?.toLowerCase() || "";
      case "rfid_uuid":
        return person.rfid_uuid.toLowerCase();
      case "updated_at":
        return new Date(person.updated_at).getTime();
      default:
        return "";
    }
  };


  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={28} />
            Person Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage students, teachers, staff, and visitors
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className={buttonPrimaryClasses}
        >
          <Plus size={20} />
          Add Person
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1 min-w-0">
            <PersonSearchDropdown
              persons={allPersons}
              selectedPersonId={selectedPersonId}
              searchTerm={searchTerm}
              onSearchChange={handleSearchInputChange}
              onPersonSelect={handlePersonSelect}
              onClear={clearSearchSelection}
              placeholder="Search by UUID, ID or Name..."
              onFocus={() => {
                if (allPersons.length === 0) {
                  loadPersons();
                }
              }}
            />
          </div>
          <div className="w-48 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={selectClasses}
            >
              <option value="all">All Types</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="staff">Staff</option>
              <option value="visitor">Visitors</option>
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
                  {formatLevel(level)}
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
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {editingPerson ? "Edit Person" : "Add New Person"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RFID UUID *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.rfid_uuid}
                    onChange={(e) => {
                      setFormData({ ...formData, rfid_uuid: e.target.value });
                      setScanStatus("idle");
                    }}
                    required
                    className={`${inputClasses} flex-1`}
                    placeholder={isScanning ? "Scanning... Please scan the badge" : "Enter UUID or scan badge"}
                    disabled={isScanning}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isScanning) {
                        stopScanning();
                      } else {
                        startScanning();
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      isScanning
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : scanStatus === "success"
                        ? "bg-green-500 text-white"
                        : scanStatus === "error"
                        ? "bg-red-500 text-white"
                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                    }`}
                    title={isScanning ? "Stop scanning" : "Start scanning badge"}
                  >
                    <Scan size={18} className={isScanning ? "animate-pulse" : ""} />
                    {isScanning ? "Stop" : "Scan"}
                  </button>
                </div>
                {isScanning && (
                  <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    Listening for badge scan...
                  </p>
                )}
                {scanStatus === "success" && !isScanning && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Badge scanned successfully!
                  </p>
                )}
                {scanStatus === "error" && !isScanning && (
                  <p className="text-xs text-red-600 mt-1">
                    ✗ Scan failed or duplicate UUID detected
                  </p>
                )}
                {formData.rfid_uuid && checkDuplicateUUID(formData.rfid_uuid) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ This UUID already exists in the system
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as
                      | "student"
                      | "teacher"
                      | "staff"
                      | "visitor";
                    setFormData({
                      ...formData,
                      type: newType,
                      level: newType === "student" ? formData.level : "",
                    });
                  }}
                  required
                  className={selectClasses}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="staff">Staff</option>
                  <option value="visitor">Visitor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name (Nom) *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name (Prenom) *
                </label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) =>
                    setFormData({ ...formData, prenom: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {formData.type === "student" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value as any })
                    }
                    className={selectClasses}
                  >
                    <option value="">Select Level</option>
                    <option value="License_1">License 1</option>
                    <option value="License_2">License 2</option>
                    <option value="License_3">License 3</option>
                    <option value="Master_1">Master 1</option>
                    <option value="Master_2">Master 2</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) =>
                    setFormData({ ...formData, class: e.target.value })
                  }
                  placeholder="e.g., L1-A, M1-B, Mathématiques"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo
                </label>
                {photoPreview && (
                  <div className="mb-2">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className={inputClasses}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés: JPEG, PNG, WebP (max 5MB) - Optionnel
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className={`${buttonPrimaryClasses} flex-1 disabled:opacity-50`}
                >
                  {uploadingPhoto
                    ? "Uploading..."
                    : editingPerson
                    ? "Update"
                    : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={uploadingPhoto}
                  className={`${buttonSecondaryClasses} flex-1`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={persons}
        columns={useMemo<Column<PersonWithPayments>[]>(
          () => [
            {
              key: "id",
              label: "ID",
              sortKey: "id",
              render: (person) => (
                <span className="text-sm text-gray-600 font-mono">
                  {person.id}
                </span>
              ),
            },
            {
              key: "name",
              label: "Name",
              sortKey: "nom",
              cellClassName: "text-left",
              render: (person) => (
                <div className="flex items-center gap-3">
                  <PersonAvatar
                    photoPath={person.photo_path}
                    name={`${person.prenom} ${person.nom}`}
                    size="md"
                  />
                  <div className="font-medium text-gray-900">
                    {person.prenom} {person.nom}
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              label: "Type",
              sortKey: "type",
              render: (person) => (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    typeColors[person.type]
                  }`}
                >
                  {person.type}
                </span>
              ),
            },
            {
              key: "level",
              label: "Level",
              sortKey: "level",
              render: (person) => (
                <span className="text-sm text-gray-600">
                  {person.type === "student" && person.level ? (
                    <BadgeBlue>{formatLevel(person.level)}</BadgeBlue>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </span>
              ),
            },
            {
              key: "class",
              label: "Class",
              sortKey: "class",
              render: (person) => (
                <span className="text-sm text-gray-600">
                  {person.class ? (
                    <BadgeGray>{person.class}</BadgeGray>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </span>
              ),
            },
            {
              key: "rfid_uuid",
              label: "RFID UUID",
              sortKey: "rfid_uuid",
              render: (person) => (
                <span className="text-sm text-gray-600 font-mono">
                  {person.rfid_uuid}
                </span>
              ),
            },
            {
              key: "payment_status",
              label: "Payment Status",
              sortable: false,
              render: (person) => (
                <div>
                  {person.type === "student" ? (
                    <div className="flex gap-2 text-xs">
                      <span
                        className={
                          person.trimester1_paid
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        T1: {person.trimester1_paid ? "✓" : "✗"}
                      </span>
                      <span
                        className={
                          person.trimester2_paid
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        T2: {person.trimester2_paid ? "✓" : "✗"}
                      </span>
                      <span
                        className={
                          person.trimester3_paid
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        T3: {person.trimester3_paid ? "✓" : "✗"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
              ),
            },
            {
              key: "updated_at",
              label: "Last Modified",
              sortKey: "updated_at",
              render: (person) => (
                <span className="text-sm text-gray-600">
                  {new Date(person.updated_at).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              headerClassName: "text-right",
              cellClassName: "text-right",
              render: (person) => (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => startEdit(person)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(person.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ),
            },
          ],
          [handleDelete]
        )}
        loading={loading}
        emptyMessage="No persons found"
        limit={filters.limit}
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
