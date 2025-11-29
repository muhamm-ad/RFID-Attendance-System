// components/PaymentManagement.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { CreditCard, Plus, DollarSign, Calendar, Search, ChevronDown, X, User } from "lucide-react";

type Payment = {
  id: number;
  student_id: number;
  trimester: 1 | 2 | 3;
  payment_id: number;
  amount: number;
  payment_method: "cash" | "card" | "bank_transfer";
  payment_date: string;
};

type Student = {
  id: number;
  nom: string;
  prenom: string;
  rfid_uuid: string;
  photo_path?: string;
};

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formStudentSearchTerm, setFormStudentSearchTerm] = useState("");
  const [isFormDropdownOpen, setIsFormDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formDropdownRef = useRef<HTMLDivElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    trimester: "1" as "1" | "2" | "3",
    amount: "",
    payment_method: "cash" as "cash" | "card" | "bank_transfer",
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadPayments(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (formDropdownRef.current && !formDropdownRef.current.contains(event.target as Node)) {
        setIsFormDropdownOpen(false);
      }
    }

    if (isDropdownOpen || isFormDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen, isFormDropdownOpen]);

  async function loadStudents() {
    try {
      const res = await fetch("/api/persons?type=student");
      const data = await res.json();
      if (res.ok) {
        setStudents(data);
      }
    } catch (e) {
      console.error("Failed to load students", e);
    }
  }

  async function loadPayments(studentId: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments?student_id=${studentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load payments");
      setPayments(data);
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id),
          trimester: parseInt(formData.trimester),
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Payment failed");
      
      setShowForm(false);
      setFormData({
        student_id: "",
        trimester: "1",
        amount: "",
        payment_method: "cash",
      });
      setFormStudentSearchTerm("");
      setIsFormDropdownOpen(false);
      if (selectedStudentId) {
        await loadPayments(selectedStudentId);
      }
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    }
  }

  const methodColors = {
    cash: "bg-green-100 text-green-800",
    card: "bg-blue-100 text-blue-800",
    bank_transfer: "bg-purple-100 text-purple-800",
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Filter students based on search term
  const filteredStudents = students.filter((student) => {
    if (!studentSearchTerm) return true;
    const search = studentSearchTerm.toLowerCase();
    return (
      student.nom.toLowerCase().includes(search) ||
      student.prenom.toLowerCase().includes(search) ||
      student.id.toString().includes(search)
    );
  });

  async function handleStudentSelect(studentId: number) {
    const student = students.find((s) => s.id === studentId);
    if (student) {
      setStudentSearchTerm(`${student.prenom} ${student.nom}`);
    }
    setSelectedStudentId(studentId);
    setIsDropdownOpen(false);
    // Automatically load payments for the selected student
    if (studentId) {
      await loadPayments(studentId);
    }
  }

  function handleInputChange(value: string) {
    setStudentSearchTerm(value);
    setIsDropdownOpen(true);
    if (value === "") {
      setSelectedStudentId(null);
    }
  }

  function handleInputFocus() {
    setIsDropdownOpen(true);
    // Load students if not already loaded
    if (students.length === 0) {
      loadStudents();
    }
  }

  function clearSelection() {
    setSelectedStudentId(null);
    setStudentSearchTerm("");
    setIsDropdownOpen(false);
  }

  // Filter students for form dropdown
  const filteredFormStudents = students.filter((student) => {
    if (!formStudentSearchTerm) return true;
    const search = formStudentSearchTerm.toLowerCase();
    return (
      student.nom.toLowerCase().includes(search) ||
      student.prenom.toLowerCase().includes(search) ||
      student.id.toString().includes(search)
    );
  });

  function handleFormStudentSelect(studentId: number) {
    setFormData({ ...formData, student_id: studentId.toString() });
    const student = students.find((s) => s.id === studentId);
    if (student) {
      setFormStudentSearchTerm(`${student.prenom} ${student.nom}`);
    }
    setIsFormDropdownOpen(false);
  }

  function handleFormInputChange(value: string) {
    setFormStudentSearchTerm(value);
    setIsFormDropdownOpen(true);
    if (value === "") {
      setFormData({ ...formData, student_id: "" });
    }
  }

  function handleFormInputFocus() {
    setIsFormDropdownOpen(true);
    // Load students if not already loaded
    if (students.length === 0) {
      loadStudents();
    }
  }

  function clearFormSelection() {
    setFormData({ ...formData, student_id: "" });
    setFormStudentSearchTerm("");
    setIsFormDropdownOpen(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard size={28} />
            Payment Management
          </h2>
          <p className="text-gray-600 mt-1">Record and view student payments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </div>

      {/* Student Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Student
        </label>
        <div className="w-full md:w-1/3 relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
            <input
              ref={inputRef}
              type="text"
              value={studentSearchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Search by name or ID..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {selectedStudentId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
              <ChevronDown 
                size={18} 
                className={`text-gray-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`}
              />
            </div>
          </div>
          
          {/* Dropdown List */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredStudents.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No students found
                </div>
              ) : (
                <ul className="py-1">
                  {filteredStudents.map((student) => (
                    <li
                      key={student.id}
                      onClick={() => handleStudentSelect(student.id)}
                      className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 ${
                        selectedStudentId === student.id ? "bg-indigo-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {student.prenom} {student.nom}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          ID: {student.id}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Record New Payment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student *
                </label>
                <div className="relative" ref={formDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
                    <input
                      ref={formInputRef}
                      type="text"
                      value={formStudentSearchTerm}
                      onChange={(e) => handleFormInputChange(e.target.value)}
                      onFocus={handleFormInputFocus}
                      placeholder="Search by name or ID..."
                      required={!formData.student_id}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      {formData.student_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFormSelection();
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={18} />
                        </button>
                      )}
                      <ChevronDown 
                        size={18} 
                        className={`text-gray-400 transition-transform ${isFormDropdownOpen ? 'transform rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                  
                  {/* Dropdown List */}
                  {isFormDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredFormStudents.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No students found
                        </div>
                      ) : (
                        <ul className="py-1">
                          {filteredFormStudents.map((student) => (
                            <li
                              key={student.id}
                              onClick={() => handleFormStudentSelect(student.id)}
                              className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 ${
                                formData.student_id === student.id.toString() ? "bg-indigo-100" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                  {student.prenom} {student.nom}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  ID: {student.id}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trimester *
                </label>
                <select
                  value={formData.trimester}
                  onChange={(e) => setFormData({ ...formData, trimester: e.target.value as any })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">Trimester 1</option>
                  <option value="2">Trimester 2</option>
                  <option value="3">Trimester 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00 XOF"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments List */}
      {selectedStudentId ? (
        <div>
          {selectedStudent && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedStudent.photo_path && selectedStudent.photo_path.trim() !== "" ? (
                  <img
                    src={selectedStudent.photo_path}
                    alt={`${selectedStudent.prenom} ${selectedStudent.nom}`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
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
                  className={`w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center photo-icon-container ${
                    selectedStudent.photo_path && selectedStudent.photo_path.trim() !== "" ? "hidden" : ""
                  }`}
                >
                  <User size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Payments for: {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <p>ID: <span className="font-mono font-medium">{selectedStudent.id}</span></p>
                    <p>RFID: <span className="font-mono font-medium">{selectedStudent.rfid_uuid}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payments recorded for this student
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trimester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          T{payment.trimester}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {payment.amount.toLocaleString()} XOF
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                            methodColors[payment.payment_method]
                          }`}
                        >
                          {payment.payment_method.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <CreditCard size={48} className="mx-auto mb-4 text-gray-400" />
          <p>Select a student to view their payment history</p>
        </div>
      )}
    </div>
  );
}

