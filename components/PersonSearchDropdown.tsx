// components/PersonSearchDropdown.tsx
"use client";

import React, { useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { filterPersons } from "@/lib/ui-utils";
import PersonAvatar from "./PersonAvatar";
import { PersonWithPayments } from "@/lib/db";

interface PersonSearchDropdownProps {
  persons: PersonWithPayments[];
  selectedPersonId: number | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onPersonSelect: (personId: number) => void;
  onClear: () => void;
  placeholder?: string;
  label?: React.ReactNode;
  onFocus?: () => void;
}

export default function PersonSearchDropdown({
  persons,
  selectedPersonId,
  searchTerm,
  onSearchChange,
  onPersonSelect,
  onClear,
  placeholder = "Search by name, ID or UUID...",
  label,
  onFocus,
}: PersonSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const filteredPersons = filterPersons(
    persons as Array<PersonWithPayments & { nom: string; prenom: string; id: number; rfid_uuid: string }>,
    searchTerm
  );

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    setIsOpen(true);
    if (value === "") {
      onClear();
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    onFocus?.();
  };

  const handlePersonSelect = (personId: number) => {
    onPersonSelect(personId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10"
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {selectedPersonId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${
              isOpen ? "transform rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredPersons.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No persons found
            </div>
          ) : (
            <ul className="py-1">
              {filteredPersons.slice(0, 20).map((person) => (
                <li
                  key={person.id}
                  onClick={() => handlePersonSelect(person.id)}
                  className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 ${
                    selectedPersonId === person.id ? "bg-indigo-100" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PersonAvatar
                        photoPath={person.photo_path}
                        name={`${person.prenom} ${person.nom}`}
                        size="sm"
                      />
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
  );
}

