'use client';
import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Command,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import {
  FollowUpStatusType,
  NavPageId,
  ReasonCategoryType,
  RefundRecord,
  RefundStatusType,
  SavedFilterPreset
} from '@/lib/types/refund';
import {
  ALL_MONTHS_2026,
  encodeFileToHdDataUrl,
  FOLLOW_UP_OPTIONS,
  formatINR,
  REASON_CATEGORY_OPTIONS,
  REFUND_STATUS_OPTIONS
} from '@/lib/utils/refund-math';

/**
 * ============================================================================
 * MODULAR REFUND MODALS, COMMAND PALETTE & MOBILE FILTER SHEET
 * - AddRefundModal (with real-time duplicate Order ID check & camera capture)
 * - EditRefundModal
 * - UploadScreenshotModal (supports mobile gallery & rear camera)
 * - CommandPaletteModal (Cmd/Ctrl + K global search & quick actions)
 * - MobileFilterSheet (full-screen mobile filter drawer with date range & presets)
 * ============================================================================
 */

export function AddRefundModal({
  existingRecords,
  onClose,
  onSave
}: {
  existingRecords: RefundRecord[];
  onClose: () => void;
  onSave: (form: any, allowDuplicate: boolean) => void;
}) {
  const [date, setDate] = useState('2026-11-10');
  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [product, setProduct] = useState('Curl Defining Hair Brush');
  const [reasonForReturn, setReasonForReturn] = useState('Product delayed; refund requested');
  const [currentStatus, setCurrentStatus] = useState('Cancelled');
  const [refundStatus, setRefundStatus] = useState<RefundStatusType>('Pending');
  const [amount, setAmount] = useState('563.02');
  const [requestedDate, setRequestedDate] = useState('2026-11-10');
  const [processedDate, setProcessedDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [screenshotThumb, setScreenshotThumb] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const duplicateMatch = existingRecords.find(
    r => r.orderId.trim().toLowerCase() === orderId.trim().toLowerCase() && orderId.trim() !== ''
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const hdUrl = await encodeFileToHdDataUrl(f, 1150, 0.84);
    setScreenshotThumb(hdUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FFF8F0] dark:bg-[#171717] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#881337]/20 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <h3 className="text-base font-bold">Add New Refund Case</h3>
            <p className="text-xs text-stone-500">
              Formula columns (Month, Year, Category, Priority, Proof Status) auto-calculate
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {duplicateMatch && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-xs space-y-2">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Duplicate Guard: Order <strong>{duplicateMatch.orderId}</strong> already exists at Row #{duplicateMatch.rowNumber} ({duplicateMatch.customerName} • {formatINR(duplicateMatch.amount)}).
              </span>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-medium">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={e => setAllowDuplicate(e.target.checked)}
                className="rounded text-[#881337]"
              />
              <span>Confirm creating a separate split-refund entry for this Order ID</span>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Order / Case Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Order ID *</label>
            <input
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. GL160105"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Customer Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer full name"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Customer Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="customer@gmail.com"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Product(s) (One per line for multi-item bundles) *</label>
            <textarea
              rows={2}
              value={product}
              onChange={e => setProduct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Reason for Return *</label>
            <input
              type="text"
              value={reasonForReturn}
              onChange={e => setReasonForReturn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Current Order Status</label>
            <input
              type="text"
              value={currentStatus}
              onChange={e => setCurrentStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Status *</label>
            <select
              value={refundStatus}
              onChange={e => setRefundStatus(e.target.value as RefundStatusType)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              {REFUND_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Amount (INR) *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">UTR / Refund Reference ID</label>
            <input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              placeholder="Optional bank/UPI UTR"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Requested Date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={e => setRequestedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Processed Date</label>
            <input
              type="date"
              value={processedDate}
              onChange={e => setProcessedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">
              Attach Proof Screenshot (Phone Camera or Gallery)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="w-full p-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-[11px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Internal Remarks / Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Internal finance or customer support notes"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Boolean(duplicateMatch && !allowDuplicate)}
            onClick={() =>
              onSave(
                {
                  date,
                  orderId,
                  customerName,
                  email,
                  product,
                  reasonForReturn,
                  currentStatus,
                  refundStatus,
                  amount,
                  requestedDate,
                  processedDate,
                  remarks,
                  referenceId,
                  screenshotThumb
                },
                allowDuplicate
              )
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#881337] to-[#EF4444] disabled:opacity-40 text-white text-xs font-bold shadow-sm"
          >
            Save Refund Record
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditRefundModal({
  record,
  onClose,
  onSave
}: {
  record: RefundRecord;
  onClose: () => void;
  onSave: (updated: RefundRecord) => void;
}) {
  const [customerName, setCustomerName] = useState(record.customerName);
  const [email, setEmail] = useState(record.email);
  const [product, setProduct] = useState(record.product);
  const [reasonForReturn, setReasonForReturn] = useState(record.reasonForReturn);
  const [reasonCategory, setReasonCategory] = useState<ReasonCategoryType>(record.reasonCategory);
  const [currentStatus, setCurrentStatus] = useState(record.currentStatus);
  const [refundStatus, setRefundStatus] = useState<RefundStatusType>(record.refundStatus);
  const [amount, setAmount] = useState(String(record.amount));
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatusType>(record.followUpStatus);
  const [requestedDate, setRequestedDate] = useState(record.requestedDate);
  const [processedDate, setProcessedDate] = useState(record.processedDate);
  const [remarks, setRemarks] = useState(record.remarks);
  const [referenceId, setReferenceId] = useState(record.referenceId);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FFF8F0] dark:bg-[#171717] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#881337]/20 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <h3 className="text-base font-bold">
              Edit Refund Case — {record.orderId} (Row #{record.rowNumber})
            </h3>
            <p className="text-xs text-stone-500">
              Case ID: <code>{record.caseId}</code>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Customer Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Product(s)</label>
            <textarea
              rows={2}
              value={product}
              onChange={e => setProduct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Reason for Return</label>
            <input
              type="text"
              value={reasonForReturn}
              onChange={e => setReasonForReturn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Reason Category</label>
            <select
              value={reasonCategory}
              onChange={e => setReasonCategory(e.target.value as ReasonCategoryType)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              {REASON_CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Current Status</label>
            <input
              type="text"
              value={currentStatus}
              onChange={e => setCurrentStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Status</label>
            <select
              value={refundStatus}
              onChange={e => setRefundStatus(e.target.value as RefundStatusType)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              {REFUND_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Amount INR</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Follow-Up Status</label>
            <select
              value={followUpStatus}
              onChange={e => setFollowUpStatus(e.target.value as FollowUpStatusType)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              {FOLLOW_UP_OPTIONS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">UTR / Reference ID</label>
            <input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              placeholder="Bank/UPI UTR"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Requested Date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={e => setRequestedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Refund Processed Date</label>
            <input
              type="date"
              value={processedDate}
              onChange={e => setProcessedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Remarks / Internal Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...record,
                customerName: customerName.trim(),
                email: email.trim(),
                product: product.trim(),
                reasonForReturn: reasonForReturn.trim(),
                reasonCategory,
                currentStatus: currentStatus.trim(),
                refundStatus,
                amount: parseFloat(amount) || record.amount,
                followUpStatus,
                requestedDate,
                processedDate,
                remarks,
                referenceId
              })
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#881337] to-[#EF4444] text-white text-xs font-bold"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function UploadScreenshotModal({
  record,
  onClose,
  onUpload
}: {
  record: RefundRecord;
  onClose: () => void;
  onUpload: (rec: RefundRecord, file: File, refId: string) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [referenceId, setReferenceId] = useState(record.referenceId || '');

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF8F0] dark:bg-[#171717] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#881337]/20 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <h3 className="text-base font-bold">Upload Refund Proof — {record.orderId}</h3>
            <p className="text-xs text-stone-500">
              Drive Vault: <code>Refund Screenshots / 2026 / {record.month.split(' ')[0]} / {record.orderId}</code>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#881337]" />
              <span>Select From Phone Gallery or Camera (JPG, PNG, WebP)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">UTR / Refund Reference Number</label>
            <input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              placeholder="e.g. UPI/UTR 423618992014"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>
          <p className="text-[11px] text-stone-500">
            Uploading a screenshot sets <code>Proof Status = Available</code> while preserving historical screenshots in the audit trail.
          </p>
        </div>

        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFile}
            onClick={() => selectedFile && onUpload(record, selectedFile, referenceId)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#881337] to-[#EF4444] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Sync Proof</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteModal({
  isOpen,
  records,
  onClose,
  onSelectRecord,
  onNavigate,
  onOpenAddModal,
  onTriggerSync,
  onExportCsv,
  onToggleTheme
}: {
  isOpen: boolean;
  records: RefundRecord[];
  onClose: () => void;
  onSelectRecord: (rec: RefundRecord) => void;
  onNavigate: (page: NavPageId) => void;
  onOpenAddModal: () => void;
  onTriggerSync: () => void;
  onExportCsv: () => void;
  onToggleTheme: () => void;
}) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const matchedRecords = q
    ? records
        .filter(
          r =>
            r.orderId.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q) ||
            r.referenceId.toLowerCase().includes(q) ||
            r.product.toLowerCase().includes(q)
        )
        .slice(0, 8)
    : records.slice(0, 5);

  const quickActions = [
    { label: 'Add New Refund Record (Shortcut: N)', action: () => { onClose(); onOpenAddModal(); } },
    { label: 'Sync Live with Google Sheets (Shortcut: S)', action: () => { onClose(); onTriggerSync(); } },
    { label: 'Export Filtered Records to CSV (Shortcut: E)', action: () => { onClose(); onExportCsv(); } },
    { label: 'Toggle Light / Dark Mode (Shortcut: T)', action: () => { onClose(); onToggleTheme(); } },
    { label: 'Go to Master Refund Ledger', action: () => { onClose(); onNavigate('all-refunds'); } },
    { label: 'Go to Refund Proof Vault', action: () => { onClose(); onNavigate('screenshots'); } }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-start justify-center pt-16 p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#FFF8F0] dark:bg-[#171717] w-full max-w-xl rounded-3xl shadow-2xl border border-[#881337]/25 overflow-hidden"
      >
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#881337]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by Order ID (GL147891), customer name, UTR reference, or product…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-mono px-2 py-1 rounded bg-stone-200 dark:bg-stone-800"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Matching Refund Cases ({matchedRecords.length})
            </div>
            <div className="space-y-1 mt-1">
              {matchedRecords.map(r => (
                <button
                  key={r.caseId}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectRecord(r);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-[#FFE4E6]/50 dark:hover:bg-stone-800 flex items-center justify-between text-left transition"
                >
                  <div>
                    <span className="font-bold text-[#881337] dark:text-[#FFE4E6]">{r.orderId}</span>
                    <span className="mx-2 text-stone-400">•</span>
                    <span className="font-semibold">{r.customerName}</span>
                    <span className="ml-2 text-[11px] text-stone-500">({r.product.split('\n')[0]})</span>
                  </div>
                  <div className="font-bold">{formatINR(r.amount)}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Quick Commands
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={qa.action}
                  className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-900 hover:bg-[#881337] hover:text-white text-left font-medium transition flex items-center gap-2"
                >
                  <Command className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  filterYear,
  setFilterYear,
  filterMonth,
  setFilterMonth,
  filterStatus,
  setFilterStatus,
  filterReason,
  setFilterReason,
  filterProof,
  setFilterProof,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  savedPresets,
  onApplyPreset,
  onReset
}: {
  isOpen: boolean;
  onClose: () => void;
  filterYear: string;
  setFilterYear: (v: string) => void;
  filterMonth: string;
  setFilterMonth: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterReason: string;
  setFilterReason: (v: string) => void;
  filterProof: string;
  setFilterProof: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  savedPresets: SavedFilterPreset[];
  onApplyPreset: (p: SavedFilterPreset) => void;
  onReset: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center">
      <div className="bg-[#FFF8F0] dark:bg-[#171717] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#881337]" />
            <h3 className="text-base font-bold">Mobile Filters & Date Range</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Saved Filter Presets */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-stone-500">One-Tap Filter Presets</div>
          <div className="flex flex-wrap gap-1.5">
            {savedPresets.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onApplyPreset(p)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-[#881337]"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Year</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            >
              <option value="ALL">All Years (2026–2027)</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            >
              <option value="ALL">All Months</option>
              {ALL_MONTHS_2026.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Refund Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            >
              <option value="ALL">All Statuses</option>
              {REFUND_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Return Reason Category</label>
            <select
              value={filterReason}
              onChange={e => setFilterReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            >
              <option value="ALL">All Reasons</option>
              {REASON_CATEGORY_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Custom Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Custom Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Screenshot Proof Status</label>
            <select
              value={filterProof}
              onChange={e => setFilterProof(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            >
              <option value="ALL">All Proof States</option>
              <option value="Available Only">Proof Available Only</option>
              <option value="Missing Only">Missing Proof Only</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#881337] text-white text-xs font-bold"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
