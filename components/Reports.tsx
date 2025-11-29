// components/Reports.tsx
"use client";

import { useState } from "react";
import { FileText, Download, Calendar, TrendingUp, DollarSign, Users, User } from "lucide-react";

type ReportData = {
  start_date: string;
  end_date: string;
  generated_at: string;
  type: string;
  [key: string]: any;
};

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [formData, setFormData] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    type: "attendance",
  });

  async function generateReport() {
    if (!formData.start_date || !formData.end_date) {
      setError("Please select both start and end dates");
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const res = await fetch(
        `/api/reports?start_date=${formData.start_date}&end_date=${formData.end_date}&type=${formData.type}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate report");
      setReportData(data);
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!reportData) return;
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${formData.type}-${formData.start_date}-${formData.end_date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText size={28} />
          Reports Generator
        </h2>
        <p className="text-gray-600 mt-1">Generate detailed reports by period</p>
      </div>

      {/* Report Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="attendance">Attendance Report</option>
              <option value="payments">Payments Report</option>
              <option value="summary">Summary Report</option>
            </select>
          </div>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} Report
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Period: {new Date(formData.start_date).toLocaleDateString()} -{" "}
                {new Date(formData.end_date).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Generated: {new Date(reportData.generated_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={18} />
              Download JSON
            </button>
          </div>

          {/* Attendance Report */}
          {reportData.type === "attendance" && (
            <div className="space-y-6">
              {reportData.daily_summary && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Daily Summary
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Total Scans
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Successful
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Failed
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entries
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Exits
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.daily_summary.map((day: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(day.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{day.total_scans}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-green-600 font-medium">
                              {day.successful}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-red-600 font-medium">
                              {day.failed}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{day.entries}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{day.exits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportData.person_summary && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users size={20} />
                    Person Summary
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Total Scans
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Successful
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entries
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            First Scan
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Last Scan
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.person_summary.map((person: any) => (
                          <tr key={person.id} className="hover:bg-gray-50">
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
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                                {person.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{person.total_scans}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-green-600 font-medium">
                              {person.successful_scans}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{person.entries}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {person.first_scan ? new Date(person.first_scan).toLocaleString() : "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {person.last_scan ? new Date(person.last_scan).toLocaleString() : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payments Report */}
          {reportData.type === "payments" && (
            <div className="space-y-6">
              {reportData.summary && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign size={20} />
                    Payment Summary
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Trimester
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Students Paid
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Total Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Payment Method
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.summary.map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                T{item.trimester}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.students_paid}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">
                              {item.total_amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap capitalize">
                              {item.payment_method.replace("_", " ")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.payment_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportData.details && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Student
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Trimester
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Method
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.details.map((payment: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {payment.photo_path && payment.photo_path.trim() !== "" ? (
                                  <img
                                    src={payment.photo_path}
                                    alt={`${payment.prenom} ${payment.nom}`}
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
                                    payment.photo_path && payment.photo_path.trim() !== "" ? "hidden" : ""
                                  }`}
                                >
                                  <User size={20} className="text-gray-500" />
                                </div>
                                <div className="font-medium text-gray-900">
                                  {payment.prenom} {payment.nom}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                T{payment.trimester}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">
                              {payment.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap capitalize">
                              {payment.payment_method.replace("_", " ")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Report */}
          {reportData.type === "summary" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Attendance Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Scans</span>
                    <span className="font-bold">{reportData.attendance?.total_scans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Successful</span>
                    <span className="font-bold text-green-600">
                      {reportData.attendance?.successful}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed</span>
                    <span className="font-bold text-red-600">{reportData.attendance?.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unique Persons</span>
                    <span className="font-bold">{reportData.attendance?.unique_persons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-bold text-indigo-600">
                      {reportData.attendance?.success_rate}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Payments Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Payments</span>
                    <span className="font-bold">{reportData.payments?.total_payments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-green-600">
                      {reportData.payments?.total_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

