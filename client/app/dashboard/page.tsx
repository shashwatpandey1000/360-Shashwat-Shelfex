"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  CalendarDays,
  ChartPie,
  ClipboardList,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
      </div>
    );
  }

  return (
    <div className="flex h-max w-full flex-col p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-[22px] font-medium text-[#141414]">Dashboard</h2>
        <p className="mt-1 text-[14px] text-gray-500">
          Welcome back{user?.email ? `, ${user.email}` : ""}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Tours"
          value="12"
          change="+3 this week"
          icon={<MapPin size={18} />}
        />
        <StatCard
          label="Surveys"
          value="48"
          change="+8 this month"
          icon={<ClipboardList size={18} />}
        />
        <StatCard
          label="Employees"
          value="156"
          change="+12 new"
          icon={<Users size={18} />}
        />
        <StatCard
          label="Completion Rate"
          value="94%"
          change="+2.1%"
          icon={<TrendingUp size={18} />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Schedule */}
        <div className="border border-gray-200 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-gray-500" />
            <h3 className="text-[15px] font-semibold text-[#131313]">
              Upcoming Schedule
            </h3>
          </div>
          <div className="space-y-3">
            {[
              {
                title: "Mumbai Central Store Audit",
                time: "Today, 2:00 PM",
                status: "In Progress",
              },
              {
                title: "Andheri West Planogram Check",
                time: "Tomorrow, 10:00 AM",
                status: "Scheduled",
              },
              {
                title: "Bandra Store Review",
                time: "Apr 5, 9:00 AM",
                status: "Scheduled",
              },
              {
                title: "Pune Region Survey",
                time: "Apr 6, 11:00 AM",
                status: "Pending",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0"
              >
                <div>
                  <p className="text-[14px] font-medium text-[#131313]">
                    {item.title}
                  </p>
                  <p className="text-[12px] text-gray-500">{item.time}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="border border-gray-200 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ChartPie size={16} className="text-gray-500" />
            <h3 className="text-[15px] font-semibold text-[#131313]">
              Recent Reports
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Weekly Store Compliance", date: "Mar 31" },
              { name: "SKU Availability Report", date: "Mar 28" },
              { name: "Employee Performance", date: "Mar 25" },
              { name: "Regional Analytics", date: "Mar 22" },
            ].map((report, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0"
              >
                <p className="text-[14px] text-[#131313]">{report.name}</p>
                <p className="text-[12px] text-gray-400">{report.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <p className="text-[28px] font-semibold text-[#131313]">{value}</p>
      <p className="mt-1 text-[12px] text-gray-500">{change}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "In Progress": "bg-blue-50 text-blue-700",
    Scheduled: "bg-gray-100 text-gray-700",
    Pending: "bg-amber-50 text-amber-700",
    Completed: "bg-green-50 text-green-700",
  };

  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

