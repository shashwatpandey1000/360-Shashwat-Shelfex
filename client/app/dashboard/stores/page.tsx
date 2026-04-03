'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Store } from 'lucide-react';
import { toast } from 'sonner';
import { CustomInput } from '@/components/common/input';
import MapView from './components/MapView';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import fakeData from '@/fake.json';

interface LocalStore {
  id: number;
  shopId: string;
  companyShopId: string;
  routeId: string;
  storeName: string;
  cityName: string;
  retailerName: string | null;
  latitude: number;
  longitude: number;
  status: string;
  unitId: number;
  [key: string]: any;
}

export default function StoresPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<LocalStore[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const isMapView = searchParams.get('view') === 'map';

  useEffect(() => {
    // Simulate loading from fake.json
    setIsLoading(true);
    const timer = setTimeout(() => {
      setData(fakeData.shops as LocalStore[]);
      setTotalCount(Number(fakeData.totalCount));
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (s) =>
        s.storeName?.toLowerCase().includes(q) ||
        s.companyShopId?.toLowerCase().includes(q) ||
        s.routeId?.toLowerCase().includes(q) ||
        s.cityName?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const paginatedData = filteredData.slice((currentPage - 1) * perPage, currentPage * perPage);

  const toggleView = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isMapView) {
      params.delete('view');
    } else {
      params.set('view', 'map');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    console.log(`Sorting by ${field} in ${direction} order`);
  };

  const tableConfig: TableConfig<LocalStore> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Store Name',
        field: 'storeName',
        isSortable: true,
        onSort: handleSort,
        visibleFrom: 'always',
      },
      {
        heading: 'ID',
        field: 'id',
        isSortable: true,
        onSort: handleSort,
        visibleFrom: 'always',
        render: (row) => (
          <span
            onClick={() => {
              navigator.clipboard.writeText(row.id.toString());
              toast.success(`Copied to clipboard - ID ${row.id}`);
            }}
            className="cursor-pointer bg-[#c4ffdf] px-2.5 py-1 text-xs text-black hover:bg-[#b3e1c8]"
          >
            {row.id}
          </span>
        ),
      },
      {
        heading: 'Route ID',
        field: 'routeId',
        isSortable: true,
        onSort: handleSort,
        visibleFrom: 'always',
      },
      {
        heading: 'Unit ID',
        field: 'unitId',
        isSortable: false,
        onSort: handleSort,
        visibleFrom: 'always',
      },
      {
        heading: 'Company Shop ID',
        field: 'companyShopId',
        isSortable: true,
        onSort: handleSort,
        visibleFrom: 'xl',
      },
      {
        heading: 'City Name',
        field: 'cityName',
        isSortable: true,
        onSort: handleSort,
        visibleFrom: 'always',
      },
      {
        heading: 'Retailer Name',
        field: 'retailerName',
        isSortable: true,
        onSort: handleSort,
        visibleFrom: 'xl',
      },
    ],
    isSelectable: true,
    onSelect: (selectedRows) => {
      console.log('Selected Rows:', selectedRows);
    },
    rowActions: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-6 w-6 rounded-none bg-white p-0 hover:bg-gray-200">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none">
          <DropdownMenuItem className="rounded-none" onClick={() => console.log('View Store', row)}>
            View Store
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-none" onClick={() => console.log('Edit Store', row)}>
            Edit Store
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <section className="flex-1 overflow-scroll">
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">Stores</h1>
          <div className="flex w-max items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600">
            <Store size={14} />
            <span className="font-mono font-light">{totalCount} Stores</span>
          </div>
          <Button
            tooltip={isMapView ? 'Switch to List View' : 'Switch to Map View'}
            variant="ghost"
            onClick={toggleView}
            className="h-max rounded-none bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-200 hover:underline"
          >
            {isMapView ? 'List View' : 'Map View'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-none text-xs hover:underline">
                Add Store
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Add Store</DialogTitle>
              </DialogHeader>

              <div className="py-4">{/* filter fields placeholder */}</div>

              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-none">
                  Cancel
                </Button>
                <Button className="rounded-none">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-none text-xs hover:underline">
                Add Stores in Bulk
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Add Store in Bulk</DialogTitle>
              </DialogHeader>

              <div className="py-4">{/* filter fields placeholder */}</div>

              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-none">
                  Cancel
                </Button>
                <Button className="rounded-none">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex h-full w-full flex-col px-8 py-4">
        <div className="mb-2 flex w-full items-center justify-between gap-2 py-2">
          <div className="flex w-full gap-2">
            <CustomInput.Text
              id="search-stores"
              placeholder="Search stores..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              autoComplete="off"
              className="w-3/4"
            />
          </div>
          <div className="flex w-max justify-end gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-[13px] text-gray-700 hover:border-black hover:bg-gray-200"
                >
                  Filters
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Filters</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                  <p className="text-sm text-gray-500">Filter options coming soon.</p>
                </div>
                <DialogFooter className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" className="rounded-none">
                    Cancel
                  </Button>
                  <Button className="rounded-none">Submit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
                    onClick={() => {
                      setPerPage(n);
                      setCurrentPage(1);
                    }}
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
        {isMapView ? (
          <MapView data={filteredData as any} isLoading={isLoading} />
        ) : (
          <DataTable data={paginatedData} config={tableConfig} isLoading={isLoading} />
        )}
      </div>
    </section>
  );
}
