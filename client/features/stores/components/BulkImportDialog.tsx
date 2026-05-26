'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { CustomButton } from '@/components/common/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { BulkImportResponse } from '../api';
import { useBulkImportStoresMutation } from '../mutations';

interface BulkImportDialogProps {
  onImported?: () => void;
  trigger: React.ReactNode;
}

// What we expect from each CSV row after parsing
interface ParsedRow {
  rowNum: number;
  storeName: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactPhone: string;
  contactEmail: string;
  zoneName: string;
  managerName: string;
  managerEmail: string;
  error?: string;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

const REQUIRED_HEADERS = ['store_name', 'city', 'manager_name', 'manager_email'];
const TEMPLATE_HEADERS = [
  'store_name',
  'city',
  'state',
  'postal_code',
  'country',
  'contact_phone',
  'contact_email',
  'zone_name',
  'manager_name',
  'manager_email',
];
const TEMPLATE_EXAMPLE =
  'Central Market,Mumbai,Maharashtra,400001,India,+91-9876543210,central@acme.com,West Zone,Rahul Sharma,rahul@acme.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const get = (key: string) => (raw[key] ?? '').trim();
  const storeName = get('store_name');
  const city = get('city');
  const managerName = get('manager_name');
  const managerEmail = get('manager_email').toLowerCase();

  let error: string | undefined;
  if (!storeName) error = 'store_name is required';
  else if (storeName.length < 2) error = 'store_name must be at least 2 characters';
  else if (storeName.length > 100) error = 'store_name must not exceed 100 characters';
  else if (!city) error = 'city is required';
  else if (!managerName) error = 'manager_name is required';
  else if (!managerEmail) error = 'manager_email is required';
  else if (!EMAIL_RE.test(managerEmail)) error = 'manager_email is invalid';
  else {
    const contactEmail = get('contact_email');
    if (contactEmail && !EMAIL_RE.test(contactEmail)) error = 'contact_email is invalid';
  }

  return {
    rowNum,
    storeName,
    city,
    state: get('state'),
    postalCode: get('postal_code'),
    country: get('country'),
    contactPhone: get('contact_phone'),
    contactEmail: get('contact_email'),
    zoneName: get('zone_name'),
    managerName,
    managerEmail,
    error,
  };
}

function normaliseHeaders(headers: string[]): string[] {
  return headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_'));
}

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stores_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BulkImportDialog({ onImported, trigger }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<BulkImportResponse | null>(null);
  const [showFailedDetails, setShowFailedDetails] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const bulkImportMutation = useBulkImportStoresMutation();

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);

  function reset() {
    setStep('upload');
    setRows([]);
    setFileName('');
    setResult(null);
    setShowFailedDetails(false);
    setIsDragging(false);
    fileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function processFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      toast.error('Please upload a CSV file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25 MB limit.');
      return;
    }

    fileRef.current = file;
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_'),
      transform: (v) => v.trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          toast.error('Could not parse CSV. Make sure the file is valid.');
          return;
        }

        // Check required headers are present
        const headers = Object.keys(results.data[0] ?? {});
        const normalised = normaliseHeaders(headers);
        const missing = REQUIRED_HEADERS.filter((h) => !normalised.includes(h));
        if (missing.length > 0) {
          toast.error(`CSV is missing required columns: ${missing.join(', ')}`);
          return;
        }

        if (results.data.length === 0) {
          toast.error('The CSV file contains no data rows.');
          return;
        }


        const parsed = results.data.map((raw, i) => validateRow(raw, i + 2));
        setRows(parsed);
        setStep('preview');
      },
      error: () => {
        toast.error('Failed to read the file. Please try again.');
      },
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleImport() {
    if (!fileRef.current || validRows.length === 0) return;
    setStep('importing');
    bulkImportMutation.mutate(fileRef.current, {
      onSuccess: (res) => {
        setResult(res.data);
        setStep('done');
        if (res.data.created > 0) {
          onImported?.();
        }
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Import failed. Please try again.');
        setStep('preview');
      },
    });
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    setOpen(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add Stores in Bulk</DialogTitle>
        </DialogHeader>

        {/* ── STEP: upload ─────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <div className="space-y-4 py-2">
              {/* Instructions */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload a CSV file to create multiple stores at once. Each row creates one store
                and sends a manager invite email.
              </p>

              {/* Template download */}
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs text-gray-500 underline hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Download size={12} />
                Download CSV template
              </button>

              {/* Required columns legend */}
              <div className="bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-medium text-gray-700 dark:text-gray-300">Required columns</p>
                <p>
                  <code className="font-mono">store_name</code>,{' '}
                  <code className="font-mono">city</code>,{' '}
                  <code className="font-mono">manager_name</code>,{' '}
                  <code className="font-mono">manager_email</code>
                </p>
                <p className="font-medium text-gray-700 dark:text-gray-300 pt-1">Optional columns</p>
                <p>
                  <code className="font-mono">state</code>,{' '}
                  <code className="font-mono">postal_code</code>,{' '}
                  <code className="font-mono">country</code>,{' '}
                  <code className="font-mono">contact_phone</code>,{' '}
                  <code className="font-mono">contact_email</code>,{' '}
                  <code className="font-mono">zone_name</code>
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-8 transition-colors ${
                  isDragging
                    ? 'border-gray-600 bg-gray-100 dark:border-gray-400 dark:bg-neutral-800'
                    : 'border-gray-300 hover:border-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:bg-neutral-900'
                }`}
              >
                <Upload size={20} className="text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Click to upload</span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">CSV, max 25 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            <DialogFooter>
              <CustomButton variant="secondary" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </CustomButton>
            </DialogFooter>
          </>
        )}

        {/* ── STEP: preview ────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <>
            <div className="space-y-3 py-2">
              {/* Summary bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{fileName}</span>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle size={12} />
                    {validRows.length} ready
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                      <AlertCircle size={12} />
                      {invalidRows.length} will be skipped
                    </span>
                  )}
                </div>
              </div>

              {/* Preview table */}
              <div className="max-h-[280px] overflow-y-auto border border-gray-200 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 w-8">#</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Store</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">City</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Manager Email</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((row) => (
                      <tr
                        key={row.rowNum}
                        className={row.error ? 'bg-red-50 dark:bg-red-950/20' : ''}
                        title={row.error}
                      >
                        <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500">{row.rowNum}</td>
                        <td className="px-2 py-1.5 text-gray-800 dark:text-gray-200 max-w-[120px] truncate">
                          {row.storeName || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">
                          {row.city || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 max-w-[140px] truncate">
                          {row.managerEmail || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.error ? (
                            <span className="flex items-center gap-1 text-red-500 dark:text-red-400" title={row.error}>
                              <AlertCircle size={11} />
                              Error
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle size={11} />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error details */}
              {invalidRows.length > 0 && (
                <div className="space-y-1">
                  {invalidRows.slice(0, 3).map((r) => (
                    <p key={r.rowNum} className="text-xs text-red-500 dark:text-red-400">
                      Row {r.rowNum}: {r.error}
                    </p>
                  ))}
                  {invalidRows.length > 3 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      +{invalidRows.length - 3} more errors (these rows will be skipped)
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <CustomButton variant="secondary" size="sm" onClick={reset}>
                Back
              </CustomButton>
              <CustomButton
                size="sm"
                onClick={handleImport}
                disabled={validRows.length === 0}
              >
                Import {validRows.length} Store{validRows.length !== 1 ? 's' : ''}
              </CustomButton>
            </DialogFooter>
          </>
        )}

        {/* ── STEP: importing ──────────────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 size={28} className="animate-spin text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importing {validRows.length} store{validRows.length !== 1 ? 's' : ''}…
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This may take a moment.</p>
          </div>
        )}

        {/* ── STEP: done ───────────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <>
            <div className="space-y-4 py-2">
              {/* Top summary */}
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {result.created} store{result.created !== 1 ? 's' : ''} created
                  </p>
                  {result.failed.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {result.failed.length} row{result.failed.length !== 1 ? 's' : ''} skipped
                    </p>
                  )}
                </div>
              </div>

              {/* Skipped rows detail */}
              {result.failed.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowFailedDetails((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-neutral-900"
                  >
                    <span>Skipped rows ({result.failed.length})</span>
                    {showFailedDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showFailedDetails && (
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {result.failed.map((f) => (
                        <div key={f.row} className="px-3 py-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Row {f.row} — {f.storeName || '(unnamed)'}
                          </span>
                          <p className="text-xs text-red-500 dark:text-red-400">{f.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <CustomButton size="sm" onClick={() => handleClose(false)}>
                Close
              </CustomButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
