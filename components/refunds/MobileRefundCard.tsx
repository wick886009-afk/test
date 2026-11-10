'use client';
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Image as ImageIcon,
  Trash2,
  Upload
} from 'lucide-react';
import { RefundRecord, RefundStatusType } from '@/lib/types/refund';
import { formatINR, REFUND_STATUS_OPTIONS } from '@/lib/utils/refund-math';

/**
 * ============================================================================
 * MOBILE-FIRST REFUND RECORD CARD (< 768px)
 * - Replaces wide desktop tables on phone screens (320px–430px+).
 * - Displays Order ID, Customer Name, Refund Amount, and color-coded status
 *   at a glance, with expandable details, tap-to-edit, quick status update,
 *   and direct camera/gallery screenshot attachment.
 * ============================================================================
 */

interface MobileRefundCardProps {
  record: RefundRecord;
  isSelected: boolean;
  onToggleSelect: (caseId: string) => void;
  onOpenDrawer: (rec: RefundRecord) => void;
  onEdit: (rec: RefundRecord) => void;
  onUploadScreenshot: (rec: RefundRecord) => void;
  onPreviewScreenshot: (rec: RefundRecord) => void;
  onQuickStatusChange: (rec: RefundRecord, status: RefundStatusType) => void;
  onDelete: (rec: RefundRecord) => void;
  renderStatusBadge: (status: RefundStatusType) => React.ReactNode;
}

export default function MobileRefundCard({
  record,
  isSelected,
  onToggleSelect,
  onOpenDrawer,
  onEdit,
  onUploadScreenshot,
  onPreviewScreenshot,
  onQuickStatusChange,
  onDelete,
  renderStatusBadge
}: MobileRefundCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-2xl gleva-glass-card p-3.5 transition-all ${
        isSelected ? 'ring-2 ring-[#881337] dark:ring-[#EF4444]' : ''
      }`}
    >
      {/* Top Row: Checkbox + Order ID + Amount */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(record.caseId)}
            aria-label={`Select order ${record.orderId}`}
            className="mt-1 rounded border-stone-300 text-[#881337] focus:ring-[#881337]"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenDrawer(record)}
                className="text-sm font-extrabold text-[#881337] dark:text-[#FFE4E6] hover:underline truncate"
              >
                {record.orderId}
              </button>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                Row #{record.rowNumber}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#171717] dark:text-[#FFF8F0] truncate mt-0.5">
              {record.customerName}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
              {record.dateDisplay} • {record.reasonCategory}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-extrabold text-[#171717] dark:text-[#FFF8F0]">
            {formatINR(record.amount)}
          </div>
          <div className="mt-1">{renderStatusBadge(record.refundStatus)}</div>
        </div>
      </div>

      {/* Product Preview Pill */}
      <div className="mt-2.5 pt-2.5 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
        <div className="truncate text-stone-600 dark:text-stone-300 flex-1">
          <span className="font-semibold">SKU:</span> {record.product.replace(/\n/g, ' + ')}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-200 shrink-0"
        >
          <span>{expanded ? 'Less' : 'Details'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Details Section */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-stone-800 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2 bg-[#FFF8F0] dark:bg-stone-900/80 p-2.5 rounded-xl">
            <div>
              <div className="text-[10px] text-stone-400">Customer Email</div>
              <div className="font-medium truncate">{record.email || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-stone-400">Follow-Up / SLA</div>
              <div className="font-medium">{record.followUpStatus}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] text-stone-400">Customer Return Reason</div>
              <div className="font-medium text-stone-700 dark:text-stone-200">
                {record.reasonForReturn}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-stone-500">Quick Status:</label>
            <select
              value={record.refundStatus}
              onChange={e =>
                onQuickStatusChange(record, e.target.value as RefundStatusType)
              }
              className="flex-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            >
              {REFUND_STATUS_OPTIONS.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Touch-Friendly Action Controls */}
      <div className="mt-3 pt-2.5 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onOpenDrawer(record)}
          className="flex-1 py-2 px-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[11px] font-semibold flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Full Case</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(record)}
          className="flex-1 py-2 px-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[11px] font-semibold flex items-center justify-center gap-1"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        {record.screenshotThumb ? (
          <button
            type="button"
            onClick={() => onPreviewScreenshot(record)}
            className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Proof</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUploadScreenshot(record)}
            className="flex-1 py-2 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#881337] dark:text-rose-300 border border-rose-200 text-[11px] font-semibold flex items-center justify-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add SS</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(record)}
          aria-label={`Delete ${record.orderId}`}
          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#EF4444] hover:bg-rose-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
