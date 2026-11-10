'use client';
import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {
  ActivityLogEntry,
  RefundRecord,
  RefundStatusType
} from '@/lib/types/refund';
import { formatINR, REFUND_STATUS_OPTIONS } from '@/lib/utils/refund-math';

/**
 * ============================================================================
 * MULTI-SECTION SLIDE-OVER REFUND RECORD DRAWER
 * - Supports standard slide-over drawer mode AND full-screen expansion.
 * - Multi-section layout:
 *   1. Overview & Customer Financials
 *   2. Refund Lifecycle Timeline & Processing Time SLA
 *   3. Payment Proof & Screenshot Vault (with historical trail)
 *   4. Order Activity History
 * ============================================================================
 */

interface RefundDetailDrawerProps {
  record: RefundRecord | null;
  activityLogs: ActivityLogEntry[];
  onClose: () => void;
  onEdit: (rec: RefundRecord) => void;
  onUploadScreenshot: (rec: RefundRecord) => void;
  onPreviewScreenshot: (rec: RefundRecord) => void;
  onDelete: (rec: RefundRecord) => void;
  onQuickStatusChange: (rec: RefundRecord, status: RefundStatusType) => void;
  renderStatusBadge: (status: RefundStatusType) => React.ReactNode;
}

export default function RefundDetailDrawer({
  record,
  activityLogs,
  onClose,
  onEdit,
  onUploadScreenshot,
  onPreviewScreenshot,
  onDelete,
  onQuickStatusChange,
  renderStatusBadge
}: RefundDetailDrawerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'proof' | 'history'>('overview');

  if (!record) return null;

  const orderLogs = activityLogs.filter(
    l =>
      l.orderId.toLowerCase().includes(record.orderId.toLowerCase()) ||
      l.rowNumber === record.rowNumber
  );

  const timelineSteps = [
    {
      label: 'Order & Return Logged',
      detail: `Order ${record.orderId} logged on ${record.dateDisplay} (${record.currentStatus})`,
      date: record.dateDisplay,
      done: true
    },
    {
      label: 'Return Reason Classified',
      detail: `${record.reasonCategory}: "${record.reasonForReturn}"`,
      date: record.requestedDate || record.dateDisplay,
      done: true
    },
    {
      label: 'Finance Refund Processing',
      detail: `Status: ${record.refundStatus} • Amount: ${formatINR(record.amount)}`,
      date: record.processedDate || record.lastUpdated,
      done: ['Processing', 'Processed', 'Partially Refunded'].includes(record.refundStatus)
    },
    {
      label: 'Payment Proof Verification',
      detail:
        record.proofStatus === 'Available'
          ? `HD Screenshot verified in Vault (${record.referenceId || 'In-Cell Proof'})`
          : `Proof Status: ${record.proofStatus}`,
      date: record.screenshotDate || record.lastUpdated,
      done: record.proofStatus === 'Available'
    },
    {
      label: 'Case Closure & Reconciliation',
      detail: `Follow-Up: ${record.followUpStatus} • Priority: ${record.priority}`,
      date: record.lastUpdated,
      done: record.refundStatus === 'Processed'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`bg-[#FFF8F0] dark:bg-[#171717] text-[#171717] dark:text-[#FFF8F0] h-full flex flex-col justify-between shadow-2xl border-l border-[#881337]/20 transition-all duration-200 ${
          isFullScreen ? 'w-full' : 'w-full max-w-2xl'
        }`}
      >
        {/* Top Drawer Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                <span>{record.caseId}</span>
                <span>•</span>
                <span>Sheet Row #{record.rowNumber}</span>
                <span>•</span>
                <span>{record.month}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Order {record.orderId}
                </h2>
                <span className="text-lg sm:text-xl font-extrabold text-[#881337] dark:text-[#EF4444]">
                  {formatINR(record.amount)}
                </span>
                {renderStatusBadge(record.refundStatus)}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? 'Exit Full Screen' : 'Expand Full Screen'}
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 transition"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details drawer"
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Multi-Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: 'Overview & Financials', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'timeline', label: 'Refund Timeline & SLA', icon: <Clock className="w-3.5 h-3.5" /> },
              { id: 'proof', label: 'Proof & Screenshots', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { id: 'history', label: `Activity (${orderLogs.length})`, icon: <Activity className="w-3.5 h-3.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Quick Status Update Bar */}
              <div className="p-4 rounded-2xl gleva-glass-card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold">Update Refund Status</div>
                  <div className="text-[11px] text-stone-500">
                    Syncs immediately with MASTER REFUND DATA (Row #{record.rowNumber})
                  </div>
                </div>
                <select
                  value={record.refundStatus}
                  onChange={e =>
                    onQuickStatusChange(record, e.target.value as RefundStatusType)
                  }
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-800 border border-[#881337]/30"
                >
                  {REFUND_STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer & Order Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl gleva-glass-card">
                  <div className="text-[11px] text-stone-400">Customer Name</div>
                  <div className="text-sm font-bold mt-0.5">{record.customerName}</div>
                </div>
                <div className="p-3.5 rounded-2xl gleva-glass-card">
                  <div className="text-[11px] text-stone-400">Customer Email</div>
                  <div className="text-sm font-semibold mt-0.5 break-all">{record.email || '—'}</div>
                </div>
                <div className="sm:col-span-2 p-3.5 rounded-2xl gleva-glass-card">
                  <div className="text-[11px] text-stone-400">
                    Ordered Product(s) • <span className="text-[#881337] dark:text-[#D4A373] font-semibold">{record.orderTypeCategory}</span>
                  </div>
                  <div className="text-sm font-semibold mt-1 whitespace-pre-line">
                    {record.product}
                  </div>
                </div>
                <div className="sm:col-span-2 p-3.5 rounded-2xl gleva-glass-card">
                  <div className="text-[11px] text-stone-400">
                    Return Reason • <span className="font-semibold text-[#881337] dark:text-[#FFE4E6]">{record.reasonCategory}</span>
                  </div>
                  <div className="text-sm font-medium mt-1">{record.reasonForReturn}</div>
                </div>
              </div>

              {/* Auto-Calculated Sheet Formula Columns */}
              <div className="p-4 rounded-2xl gleva-glass-card space-y-3">
                <div className="text-xs font-bold flex items-center gap-1.5 text-[#881337] dark:text-[#D4A373]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Protected Sheet Formula Fields</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-stone-400">Current Order Status</div>
                    <div className="font-semibold">{record.currentStatus}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400">Follow-Up Status</div>
                    <div className="font-semibold">{record.followUpStatus}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400">SLA Priority</div>
                    <div className="font-semibold">{record.priority}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400">Processing Turnaround</div>
                    <div className="font-semibold">{record.processingTime}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400">UTR / Reference ID</div>
                    <div className="font-mono font-semibold">{record.referenceId || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400">Last Updated</div>
                    <div className="font-semibold">{record.lastUpdated}</div>
                  </div>
                </div>
                {record.remarks && (
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-xs text-amber-700 dark:text-amber-300">
                    <strong>Remarks:</strong> {record.remarks}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl gleva-glass-card">
                <h3 className="text-sm font-bold mb-1">End-to-End Refund Lifecycle</h3>
                <p className="text-xs text-stone-500 mb-4">
                  Tracks Order {record.orderId} from initial cancellation/return request through payout verification.
                </p>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                  {timelineSteps.map((st, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center absolute left-0 top-0 text-xs font-bold ${
                          st.done
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                        }`}
                      >
                        {st.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-stone-200/70 dark:border-stone-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold">{st.label}</span>
                          <span className="text-[11px] font-mono text-stone-400">{st.date}</span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{st.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proof' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl gleva-glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">Attached Payment Proof Screenshot</h3>
                    <p className="text-xs text-stone-500">
                      Proof Status: <strong>{record.proofStatus}</strong> • UTR: <strong>{record.referenceId || 'In-Cell Verified'}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUploadScreenshot(record)}
                    className="px-3 py-1.5 rounded-xl bg-[#881337] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{record.screenshotThumb ? 'Replace Proof' : 'Upload Proof'}</span>
                  </button>
                </div>

                {record.screenshotThumb ? (
                  <div className="space-y-3">
                    <div
                      onClick={() => onPreviewScreenshot(record)}
                      className="rounded-2xl bg-stone-950 p-4 flex flex-col items-center justify-center cursor-pointer border border-stone-800 group"
                    >
                      <img
                        src={record.screenshotThumb}
                        alt={`Refund proof for ${record.orderId}`}
                        className="max-h-80 object-contain rounded-lg group-hover:scale-[1.02] transition"
                      />
                      <span className="mt-2 text-xs text-stone-300 inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Click to open interactive HD zoom lightbox
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <a
                        href={record.driveViewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#881337] dark:text-[#FFE4E6] hover:underline"
                      >
                        <span>Open Google Drive Proof Folder</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={record.screenshotThumb}
                        download={`${record.orderId}_Refund_Proof.webp`}
                        className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Download Image
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-rose-300 text-center space-y-2">
                    <ImageIcon className="w-8 h-8 text-rose-400 mx-auto" />
                    <div className="text-sm font-bold">No Screenshot Attached</div>
                    <p className="text-xs text-stone-500">
                      Attach a UPI, Razorpay, or bank payout screenshot from your desktop or phone camera.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {orderLogs.length === 0 ? (
                <div className="p-6 rounded-2xl gleva-glass-card text-center text-xs text-stone-500">
                  No manual modifications recorded since initial MASTER REFUND DATA sync.
                </div>
              ) : (
                orderLogs.map(log => (
                  <div key={log.id} className="p-3.5 rounded-2xl gleva-glass-card text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#881337] dark:text-[#FFE4E6]">
                        {log.fieldChanged}
                      </span>
                      <span className="font-mono text-[11px] text-stone-400">{log.timestampIst}</span>
                    </div>
                    <div className="text-stone-600 dark:text-stone-300">
                      Changed from <strong>{log.oldValue || '—'}</strong> to{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">{log.newValue}</strong>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Operator: {log.operator} • {log.changeType}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onDelete(record)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#EF4444] text-xs font-semibold border border-rose-200 dark:border-rose-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Case</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUploadScreenshot(record)}
              className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Proof SS</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="px-4 py-2 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Case</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#881337] text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
