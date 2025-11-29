// components/PersonManagement.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Person, PersonWithPayments } from "@/lib/types";
import { Users, Plus, Edit2, Trash2, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, User, ChevronDown } from "lucide-react";

type SortField = "id" | "nom" | "type" | "rfid_uuid" | "updated_at";
type SortDirection = "asc" | "desc" | null;

export default function PersonManagement() {
  const [persons, setPersons] = useState<PersonWithPayments[]>([]);
  const [allPersons, setAllPersons] = useState<PersonWithPayments[]>([]); // Store all persons for dropdown
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithPayments | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    rfid_uuid: "",
    type: "student" as "student" | "teacher" | "staff" | "visitor",
    nom: "",
    prenom: "",
    photo_path: "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadPersons();
  }, [typeFilter]);

  // Auto-search when typing (debounced)
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
  }, [searchTerm, selectedPersonId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    }

    if (isSearchDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isSearchDropdownOpen]);

  async function loadPersons() {
    setLoading(true);
    setError(null);
    try {
      const url = typeFilter === "all" 
        ? "/api/persons" 
        : `/api/persons?type=${typeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load persons");
      setPersons(data);
      setAllPersons(data); // Store all persons for dropdown
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (searchTerm.length < 2 && !selectedPersonId) {
      loadPersons();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (selectedPersonId) {
        // If a person is selected, filter locally from all persons
        if (allPersons.length > 0) {
          const filtered = allPersons.filter((p: PersonWithPayments) => p.id === selectedPersonId);
          setPersons(filtered);
        } else {
          // If allPersons is not loaded, load it first
          const url = typeFilter === "all" 
            ? "/api/persons" 
            : `/api/persons?type=${typeFilter}`;
          const res = await fetch(url);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Failed to load persons");
          setAllPersons(data);
          const filtered = data.filter((p: PersonWithPayments) => p.id === selectedPersonId);
          setPersons(filtered);
        }
      } else {
        const url = typeFilter === "all"
          ? `/api/search?q=${encodeURIComponent(searchTerm)}`
          : `/api/search?q=${encodeURIComponent(searchTerm)}&type=${typeFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Search failed");
        setPersons(data);
      }
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Filter persons for search dropdown - use allPersons for dropdown, not filtered persons
  const filteredSearchPersons = allPersons.filter((person) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      person.nom.toLowerCase().includes(search) ||
      person.prenom.toLowerCase().includes(search) ||
      person.id.toString().includes(search) ||
      person.rfid_uuid.toLowerCase().includes(search)
    );
  });

  async function handlePersonSelect(personId: number) {
    const person = allPersons.find((p) => p.id === personId);
    if (person) {
      setSearchTerm(`${person.prenom} ${person.nom}`);
    }
    setSelectedPersonId(personId);
    setIsSearchDropdownOpen(false);
    
    // Automatically search/filter for the selected person immediately
    setLoading(true);
    setError(null);
    try {
      if (allPersons.length > 0) {
        const filtered = allPersons.filter((p: PersonWithPayments) => p.id === personId);
        setPersons(filtered);
      } else {
        // If allPersons is not loaded, load it first
        const url = typeFilter === "all" 
          ? "/api/persons" 
          : `/api/persons?type=${typeFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load persons");
        setAllPersons(data);
        const filtered = data.filter((p: PersonWithPayments) => p.id === personId);
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
    setIsSearchDropdownOpen(true);
    if (value === "") {
      setSelectedPersonId(null);
      loadPersons();
    }
  }

  function handleSearchInputFocus() {
    setIsSearchDropdownOpen(true);
    // Load all persons if not already loaded for dropdown
    if (allPersons.length === 0) {
      loadPersons();
    }
  }

  function clearSearchSelection() {
    setSelectedPersonId(null);
    setSearchTerm("");
    setIsSearchDropdownOpen(false);
    loadPersons();
  }

  function resetForm() {
    setFormData({
      rfid_uuid: "",
      type: "student",
      nom: "",
      prenom: "",
      photo_path: "",
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setEditingPerson(null);
    setShowForm(false);
  }

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
      
      // If no photo is provided and it's a new person, show error
      if (!photoPath && !editingPerson) {
        throw new Error("Please select a photo");
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
          photo_path: photoPath || formData.photo_path,
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

  async function handleDelete(id: number) {
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
  }

  function startEdit(person: PersonWithPayments) {
    setEditingPerson(person);
    setFormData({
      rfid_uuid: person.rfid_uuid,
      type: person.type,
      nom: person.nom,
      prenom: person.prenom,
      photo_path: person.photo_path,
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

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function getSortedPersons() {
    if (!sortField || !sortDirection) {
      return persons;
    }

    return [...persons].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "nom":
          aValue = `${a.prenom} ${a.nom}`.toLowerCase();
          bValue = `${b.prenom} ${b.nom}`.toLowerCase();
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "rfid_uuid":
          aValue = a.rfid_uuid.toLowerCase();
          bValue = b.rfid_uuid.toLowerCase();
          break;
        case "updated_at":
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const sortedPersons = getSortedPersons();

  function getSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown size={16} className="text-gray-400" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp size={16} className="text-indigo-600" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown size={16} className="text-indigo-600" />;
    }
    return <ArrowUpDown size={16} className="text-gray-400" />;
  }

  const typeColors = {
    student: "bg-blue-100 text-blue-800",
    teacher: "bg-purple-100 text-purple-800",
    staff: "bg-green-100 text-green-800",
    visitor: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={28} />
            Person Management
          </h2>
          <p className="text-gray-600 mt-1">Manage students, teachers, staff, and visitors</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Add Person
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative" ref={searchDropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onFocus={handleSearchInputFocus}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by UUID, ID or Name..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {selectedPersonId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSearchSelection();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
              <ChevronDown 
                size={18} 
                className={`text-gray-400 transition-transform ${isSearchDropdownOpen ? 'transform rotate-180' : ''}`}
              />
            </div>
          </div>
          
          {/* Dropdown List */}
          {isSearchDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredSearchPersons.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No persons found
                </div>
              ) : (
                <ul className="py-1">
                  {filteredSearchPersons.slice(0, 20).map((person) => (
                    <li
                      key={person.id}
                      onClick={() => handlePersonSelect(person.id)}
                      className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 ${
                        selectedPersonId === person.id ? "bg-indigo-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {person.photo_path && person.photo_path.trim() !== "" ? (
                            <img
                              src={person.photo_path}
                              alt={`${person.prenom} ${person.nom}`}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User size={16} className="text-gray-500" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {person.prenom} {person.nom}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500 font-mono">
                            ID: {person.id}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {person.rfid_uuid}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="staff">Staff</option>
          <option value="visitor">Visitors</option>
        </select>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RFID UUID *
                </label>
                <input
                  type="text"
                  value={formData.rfid_uuid}
                  onChange={(e) => setFormData({ ...formData, rfid_uuid: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo {!editingPerson ? "*" : ""}
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
                  required={!editingPerson}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés: JPEG, PNG, WebP (max 5MB)
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {uploadingPhoto ? "Uploading..." : editingPerson ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={uploadingPhoto}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center gap-2">
                  ID
                  {getSortIcon("id")}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("nom")}
              >
                <div className="flex items-center gap-2">
                  Name
                  {getSortIcon("nom")}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center gap-2">
                  Type
                  {getSortIcon("type")}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("rfid_uuid")}
              >
                <div className="flex items-center gap-2">
                  RFID UUID
                  {getSortIcon("rfid_uuid")}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Status
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("updated_at")}
              >
                <div className="flex items-center gap-2">
                  Last Modified
                  {getSortIcon("updated_at")}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
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
            ) : sortedPersons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No persons found
                </td>
              </tr>
            ) : (
              sortedPersons.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {person.id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {person.photo_path && person.photo_path.trim() !== "" ? (
                        <img
                          src={person.photo_path}
                          alt={`${person.prenom} ${person.nom}`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            // If image fails to load, hide image and show icon
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const iconContainer = target.parentElement?.querySelector(".photo-icon-container") as HTMLElement;
                            if (iconContainer) {
                              iconContainer.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center photo-icon-container ${
                          person.photo_path && person.photo_path.trim() !== "" ? "hidden" : ""
                        }`}
                      >
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div className="font-medium text-gray-900">
                        {person.prenom} {person.nom}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        typeColors[person.type]
                      }`}
                    >
                      {person.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {person.rfid_uuid}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {new Date(person.updated_at).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

