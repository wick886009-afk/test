import {
  FollowUpStatusType,
  ProofStatusType,
  ReasonCategoryType,
  RefundRecord,
  RefundStatusType
} from '@/lib/types/refund';

export const REFUND_STATUS_OPTIONS: RefundStatusType[] = [
  'Pending',
  'Initiated',
  'Processing',
  'Processed',
  'Partially Refunded',
  'Failed',
  'On Hold'
];

export const REASON_CATEGORY_OPTIONS: ReasonCategoryType[] = [
  'Delivery Delay',
  'Order Cancellation',
  'Return to Origin (RTO)',
  'Quality Issue',
  'Product Dissatisfaction',
  'Incorrect Product Delivered',
  'Product Not Received',
  'Damaged Product',
  'Missing Item',
  'Other'
];

export const FOLLOW_UP_OPTIONS: FollowUpStatusType[] = [
  'Action Required',
  'In Progress',
  'Awaiting Customer',
  'Awaiting Finance',
  'Escalated',
  'Closed / Completed'
];

export const ALL_MONTHS_2026 = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026', 'December 2026'
];

export const ALL_MONTHS_2027 = [
  'January 2027', 'February 2027', 'March 2027', 'April 2027',
  'May 2027', 'June 2027', 'July 2027', 'August 2027',
  'September 2027', 'October 2027', 'November 2027', 'December 2027'
];

export function normalizeRenderableImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const s = String(rawUrl).trim();
  if (s.startsWith('data:image/')) return s;
  const driveFileMatch =
    s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w1200`;
  }
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return '';
}

export function normalizeSheetDateToIso(rawDate: string): string {
  if (!rawDate) return '2026-11-03';
  const s = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const monStr = m[2].slice(0, 3).toLowerCase();
    const monMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const mm = monMap[monStr] || '11';
    const yr = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${yr}-${mm}-${day}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '2026-11-03';
}

export function formatDdMmmYyyy(rawDate: string): string {
  if (!rawDate) return '';
  const iso = normalizeSheetDateToIso(rawDate);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return rawDate;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export function getMonthYearFromIso(rawDate: string): { monthLabel: string; yearNum: number } {
  const iso = normalizeSheetDateToIso(rawDate || '2026-11-03');
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return { monthLabel: 'November 2026', yearNum: 2026 };
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return {
    monthLabel: `${fullMonths[d.getMonth()]} ${d.getFullYear()}`,
    yearNum: d.getFullYear()
  };
}

export function classifyReasonFormula(reasonText: string): ReasonCategoryType {
  if (!reasonText) return 'Other';
  const r = reasonText.toLowerCase();
  if (/rto|refused the order/.test(r)) return 'Return to Origin (RTO)';
  if (/instead of|incorrect product|wrong product/.test(r)) return 'Incorrect Product Delivered';
  if (/damaged|broken/.test(r)) return 'Damaged Product';
  if (/defective|expired|expiry|is dry|quality/.test(r)) return 'Quality Issue';
  if (/not satisfied|dissatisfaction/.test(r)) return 'Product Dissatisfaction';
  if (/not received|not delivered/.test(r)) return 'Product Not Received';
  if (/missing/.test(r)) return 'Missing Item';
  if (/delay/.test(r)) return 'Delivery Delay';
  if (/mistake|cancel|price difference|somewhere else|out of station|out of stock|unservicable/.test(r)) {
    return 'Order Cancellation';
  }
  return 'Other';
}

export function computeOrderTypeCategory(productText: string): string {
  const clean = (productText || '').trim();
  const lines = clean.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return 'Multi-Product Order (2+ Items)';
  const single = lines[0] || 'Unknown';
  const sl = single.toLowerCase();
  if (sl.includes('curl defining hair brush') && !sl.includes('scrunchies')) return 'Curl Defining Hair Brush';
  if (sl.includes('smooth') && sl.includes('clipper')) return 'SmoothCut Pro Nail Clipper';
  if (sl.includes('eagle beak nail clipper')) return 'Eagle Beak Nail Clipper Set (With Filer and Nail Remover)';
  return single;
}

export function calculatePendingDays(requestedDate: string, referenceToday = '2026-11-03'): number | null {
  if (!requestedDate) return null;
  const req = new Date(requestedDate + 'T00:00:00');
  const now = new Date(referenceToday + 'T00:00:00');
  if (isNaN(req.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - req.getTime()) / (1000 * 60 * 60 * 24)));
}

export function recomputeFormulaColumns(
  rec: Partial<RefundRecord>,
  manualCategoryOverride?: boolean,
  fallbackThumbnailMap?: { byOrder?: Record<string, string>; byRow?: Record<number, string> }
): RefundRecord {
  const dateIso = normalizeSheetDateToIso(rec.date || '2026-11-03');
  const { monthLabel, yearNum } = getMonthYearFromIso(dateIso);
  const status: RefundStatusType = rec.refundStatus || 'Pending';
  const oidKey = (rec.orderId || '').trim().toUpperCase();
  const rawCandidateThumb =
    rec.screenshotThumb ||
    (rec as any).screenshotUrl ||
    fallbackThumbnailMap?.byOrder?.[oidKey] ||
    fallbackThumbnailMap?.byRow?.[rec.rowNumber || 0] ||
    '';
  const resolvedScreenshotThumb = normalizeRenderableImageUrl(rawCandidateThumb);
  const hasScreenshot = Boolean(resolvedScreenshotThumb && resolvedScreenshotThumb.trim() !== '');

  const reasonCategory: ReasonCategoryType =
    manualCategoryOverride && rec.reasonCategory
      ? rec.reasonCategory
      : classifyReasonFormula(rec.reasonForReturn || '');

  const followUpStatus: FollowUpStatusType =
    status === 'Processed'
      ? 'Closed / Completed'
      : rec.followUpStatus && rec.followUpStatus !== 'Closed / Completed'
      ? rec.followUpStatus
      : 'Action Required';

  let processingTime = 'Date Required';
  if (rec.requestedDate && rec.processedDate) {
    const d1 = new Date(rec.requestedDate + 'T00:00:00');
    const d2 = new Date(rec.processedDate + 'T00:00:00');
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const days = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      processingTime = `${days} days`;
    }
  } else if (status === 'Processed' && rec.processingTime && rec.processingTime !== 'Date Required') {
    processingTime = rec.processingTime;
  }

  let priority = 'Completed';
  if (status !== 'Processed') {
    const pDays = calculatePendingDays(rec.requestedDate || '');
    if (pDays === null) priority = 'Date Required';
    else if (pDays > 7) priority = 'High Priority';
    else if (pDays >= 3) priority = 'Medium Priority';
    else priority = 'Normal Priority';
  }

  let proofStatus: ProofStatusType = 'Missing';
  if (status === 'Failed' || rec.currentStatus === 'Cancelled - No Payment') {
    proofStatus = 'Not Required';
  } else if (hasScreenshot) {
    proofStatus = 'Available';
  }

  return {
    rowNumber: rec.rowNumber || 67,
    caseId:
      rec.caseId ||
      `CASE-${String((rec.rowNumber || 67) - 1).padStart(3, '0')}-${(rec.orderId || 'NEW').trim()}`,
    date: dateIso,
    dateDisplay: formatDdMmmYyyy(dateIso),
    orderId: (rec.orderId || '').trim(),
    customerName: (rec.customerName || '').trim(),
    email: (rec.email || '').trim(),
    product: (rec.product || '').trim(),
    reasonForReturn: (rec.reasonForReturn || '').trim(),
    currentStatus: (rec.currentStatus || 'Cancelled').trim(),
    refundStatus: status,
    amount: Number(rec.amount || 0),
    month: monthLabel,
    year: yearNum,
    reasonCategory,
    followUpStatus,
    requestedDate: rec.requestedDate || '',
    processedDate: rec.processedDate || '',
    processingTime,
    priority,
    remarks:
      rec.remarks === 'Missing valid customer email in original sheet' &&
      rec.email &&
      rec.email.trim() !== '' &&
      rec.email.trim() !== '---'
        ? ''
        : rec.remarks || '',
    lastUpdated: rec.lastUpdated || formatDdMmmYyyy('2026-11-03'),
    proofStatus,
    referenceId: rec.referenceId || '',
    screenshotDate: rec.screenshotDate || '',
    orderTypeCategory: computeOrderTypeCategory(rec.product || ''),
    screenshotThumb: resolvedScreenshotThumb,
    driveViewUrl:
      rec.driveViewUrl ||
      'https://drive.google.com/drive/folders/1-qHK5tJelBcr9GoaOQpz3TKzvCvCgf5x',
    previousScreenshots: rec.previousScreenshots || []
  };
}

export function formatINR(val: number): string {
  return '₹' + Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function encodeFileToHdDataUrl(file: File, maxDim = 1150, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new window.Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        let w = img.naturalWidth || img.width || 800;
        let h = img.naturalHeight || img.height || 1000;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}
