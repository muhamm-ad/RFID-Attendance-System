"use client";

import { useState } from "react";
import { Camera, Users, Clock, FileText, CreditCard, BarChart3 } from "lucide-react";
import PersonManagement from "@/components/PersonManagement";
import LogsTable from "@/components/LogsTable";
import PaymentManagement from "@/components/PaymentManagement";
import StatisticsDashboard from "@/components/StatisticsDashboard";
import Reports from "@/components/Reports";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("logs");

  const tabs = [
    { id: "logs", label: "Attendance", icon: Clock },
    { id: "persons", label: "Persons", icon: Users },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "stats", label: "Statistics", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen theme-page p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-3">
            <Camera className="text-indigo-600" size={40} />
            RFID Access Control System
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Automated entry and exit management with payment tracking
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="flex border-b w-full justify-center flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 md:px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon size={20} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === "persons" && <PersonManagement />}
          {activeTab === "payments" && <PaymentManagement />}
          {activeTab === "logs" && <LogsTable />}
          {activeTab === "stats" && <StatisticsDashboard />}
          {activeTab === "reports" && <Reports />}
        </div>
      </div>
    </div>
  );
}
