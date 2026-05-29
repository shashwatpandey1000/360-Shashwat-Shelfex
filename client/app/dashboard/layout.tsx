'use client';

import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserAvatar } from '@/components/common/user-avatar';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { useAuth } from '@/hooks/useAuth';

// All possible sidebar items — filtered by access map at render time
const ALL_SIDEBAR_ITEMS = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    group: 'Main',
  },
  {
    module: 'stores',
    label: 'Stores',
    href: '/dashboard/stores',
    icon: <Store size={18} />,
    group: 'Main',
  },
  {
    module: 'surveys',
    label: 'Surveys',
    href: '/dashboard/surveys',
    icon: <ClipboardList size={18} />,
    group: 'Main',
  },
  {
    module: 'employees',
    label: 'Employees',
    href: '/dashboard/employees',
    icon: <Users size={18} />,
    group: 'Management',
  },
  {
    module: 'schedule',
    label: 'Schedule',
    href: '/dashboard/schedule',
    icon: <CalendarDays size={18} />,
    group: 'Management',
  },
  {
    module: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings size={18} />,
    group: 'Management',
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  stores: 'Stores',
  surveys: 'Surveys',
  schedule: 'Schedule',
  settings: 'Settings',
  zones: 'Zones',
  tour: 'Tour',
};

const DashboardBreadcrumb = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    const label = SEGMENT_LABELS[seg] ?? seg.slice(0, 8) + '…';
    return { href, label, isLast };
  });

  return (
    <Breadcrumb className="ml-4">
      <BreadcrumbList className="text-xs">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    <header className="bg-surface text-brand flex h-[55px] w-full items-center border-b">
      <div
        className={`h-full border-r transition-all duration-300 ${
          collapsed ? 'w-[65px]' : 'w-[265px]'
        }`}
      >
        <div className="flex h-full items-center">
          <Button
            variant="ghost"
            onClick={toggle}
            className={`h-full w-[calc(65px-1px)] rounded-none p-0 shadow-none ${collapsed ? '' : 'border-r'}`}
          >
            {collapsed ? <PanelRightClose size={24} /> : <PanelRightOpen size={24} />}
          </Button>
          {!collapsed && <span className="text-brand ml-3 text-[15px] font-semibold"></span>}
        </div>
      </div>

      <div className="flex h-full flex-1 items-center justify-between">
        <DashboardBreadcrumb />
        <div className="flex h-full items-stretch">
          <ThemeToggle />
          <UserAvatar />
        </div>
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
      className={`bg-surface-muted flex h-[calc(100vh-55px)] flex-col overflow-y-auto border-r p-3 transition-all duration-300 ${
        collapsed ? 'w-[65px]' : 'w-[265px]'
      }`}
    >
      <div className="flex flex-1 flex-col space-y-1">
        {groups.map(([groupLabel, items], groupIndex) => (
          <React.Fragment key={groupLabel}>
            <GroupName
              collapsed={collapsed}
              label={groupLabel}
              className={groupIndex > 0 ? 'mt-4' : ''}
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
    </aside>
  );
};

const SidebarSeparator = () => <div className="my-2 h-px w-full bg-gray-200 dark:bg-gray-800" />;

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
      className={`mb-1.5 px-2 font-mono text-[11px] font-light text-gray-500 uppercase ${className}`}
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
      className={`group flex h-9 items-center rounded-md ${
        collapsed ? 'justify-center' : 'justify-start'
      } ${isSelected ? 'bg-brand-purple' : 'hover:bg-gray-200/70 dark:hover:bg-gray-800/60'}`}
    >
      <div
        className={`flex aspect-square h-full items-center justify-center rounded-md p-1.5 ${
          isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {icon}
      </div>
      {!collapsed && (
        <div
          className={`ml-2 text-[14px] group-hover:underline ${
            isSelected ? 'font-medium text-white' : 'text-gray-800 dark:text-gray-200'
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
