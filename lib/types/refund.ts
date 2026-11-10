export type RefundStatusType =
  | 'Pending'
  | 'Initiated'
  | 'Processing'
  | 'Processed'
  | 'Partially Refunded'
  | 'Failed'
  | 'On Hold';

export type ReasonCategoryType =
  | 'Delivery Delay'
  | 'Order Cancellation'
  | 'Return to Origin (RTO)'
  | 'Quality Issue'
  | 'Product Dissatisfaction'
  | 'Incorrect Product Delivered'
  | 'Product Not Received'
  | 'Damaged Product'
  | 'Missing Item'
  | 'Other';

export type FollowUpStatusType =
  | 'Action Required'
  | 'In Progress'
  | 'Awaiting Customer'
  | 'Awaiting Finance'
  | 'Escalated'
  | 'Closed / Completed';

export type ProofStatusType = 'Available' | 'Missing' | 'Not Required';

export interface RefundRecord {
  rowNumber: number;
  caseId: string;
  date: string;
  dateDisplay: string;
  orderId: string;
  customerName: string;
  email: string;
  product: string;
  reasonForReturn: string;
  currentStatus: string;
  refundStatus: RefundStatusType;
  amount: number;
  month: string;
  year: number;
  reasonCategory: ReasonCategoryType;
  followUpStatus: FollowUpStatusType;
  requestedDate: string;
  processedDate: string;
  processingTime: string;
  priority: string;
  remarks: string;
  lastUpdated: string;
  proofStatus: ProofStatusType;
  referenceId: string;
  screenshotDate: string;
  orderTypeCategory: string;
  screenshotThumb: string;
  driveViewUrl: string;
  previousScreenshots?: string[];
}

export interface ActivityLogEntry {
  id: string;
  timestampIst: string;
  operator: string;
  rowNumber: number;
  orderId: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  changeType:
    | 'Web App Edit'
    | 'Web App Create'
    | 'Screenshot Upload'
    | 'Sheet Sync'
    | 'QA Verification'
    | 'Bulk Update'
    | 'Security Audit';
}

export type NavPageId =
  | 'dashboard'
  | 'all-refunds'
  | 'monthly-refunds'
  | 'pending-refunds'
  | 'screenshots'
  | 'product-analytics'
  | 'reason-analytics'
  | 'annual-reports'
  | 'activity-log'
  | 'settings';

export interface AdminSessionPayload {
  username: string;
  role: 'Super Administrator';
  email: string;
  displayName: string;
  mustChangePassword: boolean;
  rememberMe: boolean;
  iat: number;
  exp: number;
  csrfToken: string;
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  year: string;
  month: string;
  status: string;
  reason: string;
  product: string;
  proof: string;
  dateFrom?: string;
  dateTo?: string;
  isBuiltIn?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  read: boolean;
  targetOrderId?: string;
  targetPage?: NavPageId;
}
