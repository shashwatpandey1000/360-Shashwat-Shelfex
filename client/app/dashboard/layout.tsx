"use client";

import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Store,
  Users,
} from "lucide-react";
import React, { createContext, useContext, useMemo, useState } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/common/user-avatar";
import { useAuth } from "@/contexts/auth-context";

// All possible sidebar items — filtered by access map at render time
const ALL_SIDEBAR_ITEMS = [
  {
    module: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    group: "Main",
  },
  {
    module: "stores",
    label: "Stores",
    href: "/dashboard/stores",
    icon: <Store size={18} />,
    group: "Main",
  },
  {
    module: "surveys",
    label: "Surveys",
    href: "/dashboard/surveys",
    icon: <ClipboardList size={18} />,
    group: "Main",
  },
  {
    module: "employees",
    label: "Employees",
    href: "/dashboard/employees",
    icon: <Users size={18} />,
    group: "Management",
  },
  {
    module: "schedule",
    label: "Schedule",
    href: "/dashboard/schedule",
    icon: <CalendarDays size={18} />,
    group: "Management",
  },
  {
    module: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings size={18} />,
    group: "Management",
  },
];

const SidebarContext = createContext<{
  collapsed: boolean;
  toggle: () => void;
  closeSidebar: () => void;
}>({
  collapsed: false,
  toggle: () => {},
  closeSidebar: () => {},
});

const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((prev) => !prev);
  const closeSidebar = () => setCollapsed(true);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, closeSidebar }}>
      <main className="fixed top-0 left-0 flex h-screen w-screen flex-col overflow-hidden">
        <Header />
        <section className="flex h-[calc(100vh-55px)] overflow-hidden">
          <Sidebar />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </section>
      </main>
    </SidebarContext.Provider>
  );
}

const Header = () => {
  const { collapsed, toggle } = useSidebar();

  return (
    <header className="flex h-[55px] w-full items-center border-b bg-white">
      <div
        className={`h-full border-r transition-all duration-300 ${
          collapsed ? "w-[75px]" : "w-[265px]"
        }`}
      >
        <div className="flex h-full items-center">
          <Button
            variant="ghost"
            onClick={toggle}
            className={`h-full w-[calc(75px-1px)] rounded-none p-0 shadow-none ${collapsed ? "" : "border-r"}`}
          >
            {collapsed ? (
              <PanelRightClose size={24} />
            ) : (
              <PanelRightOpen size={24} />
            )}
          </Button>
          {!collapsed && (
            <span className="ml-3 text-[15px] font-semibold text-[#131313]">
              
            </span>
          )}
        </div>
      </div>

      <div className="flex h-full flex-1 items-center justify-end">
        <UserAvatar />
      </div>
    </header>
  );
};

const Sidebar = () => {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const { hasModule } = useAuth();

  // Filter sidebar items by access map modules
  const visibleItems = useMemo(() => {
    return ALL_SIDEBAR_ITEMS.filter((item) => hasModule(item.module));
  }, [hasModule]);

  // Group visible items
  const groups = useMemo(() => {
    const grouped: Record<string, typeof visibleItems> = {};
    for (const item of visibleItems) {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    }
    return Object.entries(grouped);
  }, [visibleItems]);

  return (
    <aside
      className={`flex h-[calc(100vh-55px)] flex-col overflow-y-auto border-r bg-[#fafafa] p-3 transition-all duration-300 ${
        collapsed ? "w-[75px]" : "w-[265px]"
      }`}
    >
      <div className="flex flex-1 flex-col space-y-1">
        {groups.map(([groupLabel, items], groupIndex) => (
          <React.Fragment key={groupLabel}>
            <GroupName
              collapsed={collapsed}
              label={groupLabel}
              className={groupIndex > 0 ? "mt-4" : ""}
            />
            {items.map((item) => (
              <SideBarItem
                key={item.href}
                label={item.label}
                icon={item.icon}
                href={item.href}
                isSelected={pathname === item.href}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <SidebarSeparator />
      <div className="h-[110px]"></div>
    </aside>
  );
};

const SidebarSeparator = () => (
  <div className="my-2 h-px w-full bg-gray-200" />
);

const GroupName = ({
  collapsed,
  label,
  className,
}: {
  collapsed: boolean;
  label: string;
  className?: string;
}) => {
  if (collapsed) return <div className="my-1.5 border-t first:border-none"></div>;
  return (
    <div
      className={`mb-1.5 px-2 font-mono text-[11px] font-light uppercase text-gray-500 ${className}`}
    >
      {label}
    </div>
  );
};

const SideBarItem = ({
  isSelected,
  label,
  icon,
  href,
}: {
  isSelected: boolean;
  label: string;
  icon: React.ReactNode;
  href: string;
}) => {
  const { collapsed, closeSidebar } = useSidebar();

  const content = (
    <Link
      href={href}
      onClick={closeSidebar}
      className={`group flex h-9 items-center ${
        collapsed ? "justify-center" : "justify-start"
      } ${isSelected ? "bg-[#1b1b1b]" : "hover:bg-gray-200/70"}`}
    >
      <div
        className={`flex aspect-square h-full items-center justify-center p-1.5 ${
          isSelected ? "text-white" : "text-gray-500"
        }`}
      >
        {icon}
      </div>
      {!collapsed && (
        <div
          className={`ml-2 text-[14px] group-hover:underline ${
            isSelected ? "font-medium text-white" : "text-gray-800"
          }`}
        >
          {label}
        </div>
      )}
    </Link>
  );

  if (!collapsed) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
