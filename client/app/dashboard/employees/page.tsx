'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CustomInput } from '@/components/common/input';
import { employeesApi } from '@/lib/api/employees.api';
import StatusBadge from '@/components/common/StatusBadge';
import AddEmployeeDialog from './components/AddEmployeeDialog';

interface EmployeeRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  roleTemplate: string;
  scopeType: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  org_manager: 'Org Manager',
  zone_manager: 'Zone Manager',
  store_manager: 'Store Manager',
  surveyor: 'Surveyor',
};

export default function EmployeesPage() {
  const router = useRouter();

  const [data, setData] = useState<EmployeeRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await employeesApi.list({
        page: currentPage,
        perPage,
        search: search || undefined,
        roleTemplate: (roleFilter as any) || undefined,
        status: (statusFilter as any) || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setData(res.data.data);
      setTotalCount(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDeactivate = async (emp: EmployeeRow) => {
    try {
      await employeesApi.deactivate(emp.id);
      toast.success(`${emp.name || emp.email} deactivated`);
      fetchEmployees();
    } catch {
      toast.error('Failed to deactivate employee');
    }
  };

  const tableConfig: TableConfig<EmployeeRow> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Name',
        field: 'name',
        isSortable: true,
        visibleFrom: 'always',
        render: (row) => <span>{row.name || '—'}</span>,
      },
      {
        heading: 'Email',
        field: 'email',
        isSortable: true,
        visibleFrom: 'always',
      },
      {
        heading: 'Role',
        field: 'roleTemplate',
        isSortable: true,
        visibleFrom: 'always',
        render: (row) => (
          <span className="bg-gray-100 px-2 py-0.5 text-xs">
            {ROLE_LABELS[row.roleTemplate] || row.roleTemplate}
          </span>
        ),
      },
      {
        heading: 'Scope',
        field: 'scopeType',
        isSortable: false,
        visibleFrom: 'xl',
        render: (row) => (
          <span className="text-xs text-gray-500">{row.scopeType}</span>
        ),
      },
      {
        heading: 'Status',
        field: 'status',
        isSortable: true,
        visibleFrom: 'always',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        heading: 'Last Login',
        field: 'lastLoginAt',
        isSortable: false,
        visibleFrom: 'xl',
        render: (row) => (
          <span className="text-xs text-gray-500">
            {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : 'Never'}
          </span>
        ),
      },
    ],
    isSelectable: false,
    rowActions: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-6 w-6 rounded-none bg-white p-0 hover:bg-gray-200">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none">
          <DropdownMenuItem
            className="rounded-none"
            onClick={() => router.push(`/dashboard/employees/${row.id}`)}
          >
            View Employee
          </DropdownMenuItem>
          {row.status !== 'inactive' && (
            <DropdownMenuItem
              className="rounded-none text-red-600"
              onClick={() => handleDeactivate(row)}
            >
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <section className="flex-1 overflow-scroll">
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">Employees</h1>
          <div className="flex w-max items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600">
            <Users size={14} />
            <span className="font-mono font-light">{totalCount} Employees</span>
          </div>
        </div>
        <AddEmployeeDialog
          onCreated={fetchEmployees}
          trigger={
            <Button size="sm" className="rounded-none text-xs hover:underline">
              Invite Employee
            </Button>
          }
        />
      </div>
      <div className="flex h-full w-full flex-col px-8 py-4">
        <div className="mb-2 flex w-full items-center justify-between gap-2 py-2">
          <div className="flex w-full gap-2">
            <CustomInput.Text
              id="search-employees"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              className="w-3/4"
            />
          </div>
          <div className="flex w-max justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-[13px] text-gray-700 hover:border-black hover:bg-gray-200"
                >
                  {roleFilter ? `Role: ${ROLE_LABELS[roleFilter]}` : 'All Roles'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full min-w-40 rounded-none">
                <DropdownMenuItem className="rounded-none" onClick={() => { setRoleFilter(''); setCurrentPage(1); }}>
                  All
                </DropdownMenuItem>
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <DropdownMenuItem
                    key={val}
                    className="rounded-none"
                    onClick={() => { setRoleFilter(val); setCurrentPage(1); }}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-[13px] text-gray-700 hover:border-black hover:bg-gray-200"
                >
                  {statusFilter ? `Status: ${statusFilter.replace('_', ' ')}` : 'All Status'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full min-w-36 rounded-none">
                <DropdownMenuItem className="rounded-none" onClick={() => { setStatusFilter(''); setCurrentPage(1); }}>
                  All
                </DropdownMenuItem>
                {['active', 'pending_first_login', 'inactive'].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="rounded-none"
                    onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  >
                    {s.replace(/_/g, ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="group flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-[13px] text-gray-700 hover:border-black hover:bg-gray-200"
                >
                  Per Page: {perPage}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full min-w-30 rounded-none">
                {[10, 25, 50, 100].map((n) => (
                  <DropdownMenuItem
                    key={n}
                    className="rounded-none"
                    onClick={() => { setPerPage(n); setCurrentPage(1); }}
                  >
                    {n}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex">
              <Button
                tooltip="Previous Page"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-sm hover:border-black hover:bg-gray-200"
              >
                &lt;
              </Button>
              <span className="flex h-full items-center justify-center rounded-none border-y px-4 py-2 text-sm">
                {currentPage}/{totalPages}
              </span>
              <Button
                tooltip="Next Page"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-sm hover:border-black hover:bg-gray-200"
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
        <DataTable data={data} config={tableConfig} isLoading={isLoading} />
      </div>
    </section>
  );
}
