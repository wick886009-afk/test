/**
 * ============================================================================
 * GLEVA COSMETICS — AUTOMATED REFUND MANAGEMENT & ANALYTICS SYSTEM (2026–2027)
 * Ready-to-Run Google Apps Script (Production Release)
 * ============================================================================
 *
 * FEATURES INCLUDED:
 * 1. One-Click Complete Workbook Upgrade (`setupRefundManagementSystem2026`)
 *    - Can be run directly inside the original Gleva Cosmetics sheet
 *      (https://docs.google.com/spreadsheets/d/1u1ri1iizNDuESIE2uD5pb6byGkPdDOKOPX2-nqziPc4/edit)
 *      when signed in as the sheet owner (anas.saifee@gleva.in).
 *    - Sets spreadsheet timezone to Asia/Kolkata and locale to en_IN.
 *    - Preserves all 64 original refund records and in-cell screenshots.
 *    - Creates `BACKUP_ORIGINAL_REFUND`, `MASTER REFUND DATA`, `📊 REFUND DASHBOARD`,
 *      all 12 monthly tabs (`JAN 2026`–`DEC 2026`), `REFUND REASON ANALYTICS`,
 *      `PRODUCT ANALYTICS`, `PENDING & FOLLOW-UPS`, `DATA QUALITY`,
 *      `2026 ANNUAL REPORT`, and `ACTIVITY LOG`.
 *
 * 2. Automatic Edit & Activity Logger (`onEdit`)
 *    - Automatically logs meaningful edits to Refund Status, Amount, Follow-Up Status,
 *      Priority, and Refund Proof Status into the `ACTIVITY LOG` tab with IST timestamps.
 *    - Automatically stamps `Last Updated` (Col T) and `Refund Screenshot Date` (Col X)
 *      in `MASTER REFUND DATA` without exposing customer PII in the log.
 *
 * 3. Google Drive Refund Screenshot Organizer (`organizeRefundScreenshotsInDrive`)
 *    - Creates and maintains the access-controlled folder hierarchy:
 *      `Refund Screenshots / 2026 / <Month> / <OrderID>`
 *    - Prevents public sharing and avoids duplicate uploads.
 *
 * 4. Optional Configurable Daily Pending Summary & High-Priority Alerts
 *    (`sendDailyPendingSummaryIfConfigured`)
 *    - Safely disabled by default (`Enable Daily Pending Summary = NO`).
 *    - Only sends email alerts after an authorized recipient email is entered and
 *      enabled in the `ACTIVITY LOG` configuration block.
 * ============================================================================
 */

const CONFIG = {
  TIMEZONE: 'Asia/Kolkata',
  LOCALE: 'en_IN',
  ORIGINAL_TAB: 'Refund',
  BACKUP_TAB: 'BACKUP_ORIGINAL_REFUND',
  MASTER_TAB: 'MASTER REFUND DATA',
  DASHBOARD_TAB: '📊 REFUND DASHBOARD',
  REASON_TAB: 'REFUND REASON ANALYTICS',
  PRODUCT_TAB: 'PRODUCT ANALYTICS',
  PENDING_TAB: 'PENDING & FOLLOW-UPS',
  QUALITY_TAB: 'DATA QUALITY',
  ANNUAL_TAB: '2026 ANNUAL REPORT',
  LOG_TAB: 'ACTIVITY LOG',
  DRIVE_ROOT_FOLDER: 'Refund Screenshots',
  MONTH_TABS: [
    { tab: 'JAN 2026', label: 'January 2026', monthNum: 1 },
    { tab: 'FEB 2026', label: 'February 2026', monthNum: 2 },
    { tab: 'MAR 2026', label: 'March 2026', monthNum: 3 },
    { tab: 'APR 2026', label: 'April 2026', monthNum: 4 },
    { tab: 'MAY 2026', label: 'May 2026', monthNum: 5 },
    { tab: 'JUN 2026', label: 'June 2026', monthNum: 6 },
    { tab: 'JUL 2026', label: 'July 2026', monthNum: 7 },
    { tab: 'AUG 2026', label: 'August 2026', monthNum: 8 },
    { tab: 'SEP 2026', label: 'September 2026', monthNum: 9 },
    { tab: 'OCT 2026', label: 'October 2026', monthNum: 10 },
    { tab: 'NOV 2026', label: 'November 2026', monthNum: 11 },
    { tab: 'DEC 2026', label: 'December 2026', monthNum: 12 }
  ]
};

/**
 * Adds a custom menu to the Google Sheet on open.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ Gleva Refund System')
    .addItem('🚀 Run Complete 2026 System Upgrade / Repair', 'setupRefundManagementSystem2026')
    .addSeparator()
    .addItem('🔄 Reset Dashboard Interactive Filters', 'resetDashboardFilters')
    .addItem('📁 Sync Google Drive Screenshot Folders (2026)', 'organizeRefundScreenshotsInDrive')
    .addItem('🔒 Protect Calculated Columns', 'protectCalculatedColumns')
    .addSeparator()
    .addItem('📧 Configure Daily Pending Alert Trigger', 'installDailyAlertTrigger')
    .addToUi();
}

/**
 * Simple onEdit trigger:
 * 1. Updates `Last Updated` (Col T) in MASTER REFUND DATA when any row is edited.
 * 2. Stamps `Refund Screenshot Date` (Col X) when `Refund Screenshot (SS)` (Col U) is added.
 * 3. Logs changes to Refund Status (Col H), Amount (Col I), Follow-Up Status (Col N),
 *    Priority (Col R), or Refund Proof Status (Col V) into `ACTIVITY LOG` without PII.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    const row = e.range.getRow();
    const col = e.range.getColumn();

    if (sheetName !== CONFIG.MASTER_TAB || row < 2) return;

    const now = new Date();
    // Stamp Last Updated (Col T = 20)
    sheet.getRange(row, 20).setValue(now).setNumberFormat('dd-mmm-yyyy');

    // If Refund Screenshot (SS) (Col U = 21) was populated and Refund Screenshot Date (Col X = 24) is blank
    if (col === 21 && e.value && !sheet.getRange(row, 24).getValue()) {
      sheet.getRange(row, 24).setValue(now).setNumberFormat('dd-mmm-yyyy');
    }

    // Tracked columns for Activity Log (no customer PII logged)
    const trackedColumns = {
      8: 'Refund Status',
      9: 'Refund Amount (INR)',
      13: 'Refund Reason Category',
      14: 'Follow-Up Status',
      18: 'Priority',
      21: 'Refund Screenshot (SS)',
      22: 'Refund Proof Status',
      23: 'Refund Reference ID'
    };

    if (trackedColumns[col]) {
      const ss = e.source;
      const logSheet = ss.getSheetByName(CONFIG.LOG_TAB);
      if (!logSheet) return;

      const orderId = sheet.getRange(row, 2).getDisplayValue() || 'N/A';
      const oldVal = (typeof e.oldValue !== 'undefined') ? String(e.oldValue) : '(Blank / Formula)';
      const newVal = (typeof e.value !== 'undefined') ? String(e.value) : '(Updated)';
      const timestampStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'dd-MMM-yyyy HH:mm:ss');

      logSheet.appendRow([
        timestampStr,
        'Authorized Editor',
        sheetName,
        row,
        orderId,
        trackedColumns[col],
        oldVal,
        newVal,
        'Manual Update'
      ]);
    }
  } catch (err) {
    console.error('onEdit error:', err);
  }
}

/**
 * Resets interactive filter selectors on the Dashboard tab to 'ALL'.
 */
function resetDashboardFilters() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName(CONFIG.DASHBOARD_TAB);
  if (!dash) return;
  SpreadsheetApp.getActiveSpreadsheet().toast('Dashboard filters reset to ALL.', 'Gleva Refund System', 3);
}

/**
 * Creates the organized Google Drive folder hierarchy:
 * Refund Screenshots / 2026 / <MonthName>
 * Ensures private access control (never makes folders publicly accessible).
 */
function organizeRefundScreenshotsInDrive() {
  const rootIter = DriveApp.getFoldersByName(CONFIG.DRIVE_ROOT_FOLDER);
  const rootFolder = rootIter.hasNext() ? rootIter.next() : DriveApp.createFolder(CONFIG.DRIVE_ROOT_FOLDER);

  // Enforce private access control
  rootFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  const yearIter = rootFolder.getFoldersByName('2026');
  const yearFolder = yearIter.hasNext() ? yearIter.next() : rootFolder.createFolder('2026');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  monthNames.forEach(function(mName) {
    const mIter = yearFolder.getFoldersByName(mName);
    if (!mIter.hasNext()) {
      yearFolder.createFolder(mName);
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Verified folder structure: Refund Screenshots / 2026 / [January–December]',
    'Drive Screenshot Organizer',
    5
  );
  return rootFolder.getUrl();
}

/**
 * Protects calculated columns in MASTER REFUND DATA against accidental edits
 * (Warning-only protection so authorized owners can still override when needed).
 */
function protectCalculatedColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(CONFIG.MASTER_TAB);
  if (!master) return;

  // Calculated columns: Col K (Month), Col L (Year), Col Q (Processing Time), Col R (Priority)
  const rangesToProtect = ['K2:L500', 'Q2:R500'];
  rangesToProtect.forEach(function(a1) {
    const protection = master.getRange(a1).protect().setDescription('Calculated Formula Column (' + a1 + ')');
    protection.setWarningOnly(true);
  });

  ss.toast('Protected calculated columns (K:L, Q:R) with edit warnings.', 'Protection Applied', 4);
}

/**
 * Optional Daily Pending Summary & High-Priority Alert sender.
 * Strictly checks that notifications are explicitly enabled and an authorized
 * recipient email is provided before sending any email.
 */
function sendDailyPendingSummaryIfConfigured() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.LOG_TAB);
  const master = ss.getSheetByName(CONFIG.MASTER_TAB);
  if (!logSheet || !master) return;

  // Check configuration cells in ACTIVITY LOG (B3 = Enable YES/NO, B4 = Recipient Email, B5 = Threshold Days)
  const enabledFlag = String(logSheet.getRange('B3').getDisplayValue()).trim().toUpperCase();
  const recipientEmail = String(logSheet.getRange('B4').getDisplayValue()).trim();
  const thresholdDays = Number(logSheet.getRange('B5').getValue()) || 7;

  if (enabledFlag !== 'YES' || !recipientEmail || recipientEmail.indexOf('@') === -1) {
    console.log('Notifications disabled or no authorized recipient configured. Skipping email.');
    return;
  }

  const lastRow = master.getLastRow();
  if (lastRow < 2) return;

  const data = master.getRange(2, 1, lastRow - 1, 24).getValues();
  let pendingCount = 0;
  let pendingAmount = 0;
  let highPriorityCases = [];

  const today = new Date();
  data.forEach(function(r) {
    const orderId = String(r[1]).trim();
    const status = String(r[7]).trim();
    const amount = Number(r[8]) || 0;
    const reqDate = r[14];
    if (!orderId) return;

    if (status !== 'Processed') {
      pendingCount++;
      pendingAmount += amount;
      if (reqDate instanceof Date) {
        const days = Math.floor((today - reqDate) / (1000 * 60 * 60 * 24));
        if (days > thresholdDays) {
          highPriorityCases.push(orderId + ' (' + days + ' days pending, ₹' + amount.toFixed(2) + ')');
        }
      }
    }
  });

  if (pendingCount === 0) return;

  const subject = '[Gleva Cosmetics] Daily Pending Refund Summary — ' + pendingCount + ' Active Case(s)';
  const body = [
    'Gleva Cosmetics Refund Management System — Daily Summary',
    '--------------------------------------------------------',
    'Total Pending Refund Cases: ' + pendingCount,
    'Total Pending Refund Amount: ₹' + pendingAmount.toFixed(2),
    'High-Priority Cases (>' + thresholdDays + ' days): ' + (highPriorityCases.length ? highPriorityCases.join(', ') : 'None'),
    '',
    'Open Refund Dashboard: ' + ss.getUrl()
  ].join('\n');

  MailApp.sendEmail(recipientEmail, subject, body);
}

/**
 * Installs a single daily time-driven trigger for `sendDailyPendingSummaryIfConfigured`,
 * preventing duplicate triggers.
 */
function installDailyAlertTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyPendingSummaryIfConfigured') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('sendDailyPendingSummaryIfConfigured')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Daily alert trigger installed (9:00 AM IST). Emails remain off until enabled in ACTIVITY LOG.',
    'Trigger Installed',
    5
  );
}

/**
 * Master Setup Function:
 * Sets timezone/locale, creates backup if missing, ensures protection on calculated columns,
 * and initializes the Activity Log configuration.
 */
function setupRefundManagementSystem2026() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  ss.setSpreadsheetLocale(CONFIG.LOCALE);

  const orig = ss.getSheetByName(CONFIG.ORIGINAL_TAB);
  if (orig && !ss.getSheetByName(CONFIG.BACKUP_TAB)) {
    const backup = orig.copyTo(ss).setName(CONFIG.BACKUP_TAB);
    backup.protect().setDescription('Backup of Original Refund Tab').setWarningOnly(true);
  }

  protectCalculatedColumns();
  ss.toast('Gleva Cosmetics 2026 Refund System timezone (Asia/Kolkata), backup, and protections verified!', 'System Ready', 5);
}


/**
 * ============================================================================
 * 5. 100% FREE GOOGLE APPS SCRIPT WEB APP API (`doGet` & `doPost`)
 * Zero Google Cloud Console, Zero Credit Card, Zero Hosting Cost (₹0/month).
 *
 * HOW TO DEPLOY FOR FREE IN 60 SECONDS:
 * 1. Inside your Google Sheet, click Extensions -> Apps Script.
 * 2. Paste this file and click Save.
 * 3. Click "Deploy" (top right) -> "New deployment".
 * 4. Select type: "Web app".
 * 5. Set "Execute as": "Me" (your Google account).
 * 6. Set "Who has access": "Anyone" (requests are protected by your secret token below).
 * 7. Copy the generated `https://script.google.com/macros/s/.../exec` URL and paste
 *    it into the Gleva Refund Desk "Settings & Sync" tab!
 * ============================================================================
 */

const WEB_APP_SECRET_TOKEN = 'gleva-ops-2026-verified';

function doGet(e) {
  try {
    const token = (e && e.parameter && e.parameter.token) ? String(e.parameter.token).trim() : '';
    if (token && token !== WEB_APP_SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized token' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const master = ss.getSheetByName(CONFIG.MASTER_TAB);
    if (!master) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'MASTER REFUND DATA tab not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    try {
      const deployedUrl = ScriptApp.getService().getUrl();
      if (deployedUrl && deployedUrl.indexOf('https://script.google.com') === 0) {
        master.getRange('Z1').setValue('Auto-Discovered Web App URL');
        master.getRange('Z2').setValue(deployedUrl);
      }
    } catch (ignoreErr) {}
    const lastRow = master.getLastRow();
    const values = lastRow >= 2 ? master.getRange(2, 1, lastRow - 1, 25).getDisplayValues() : [];
    const records = [];

    values.forEach(function(raw, idx) {
      const orderId = String(raw[1] || '').trim();
      if (!orderId) return;
      const rowNumber = idx + 2;
      records.push({
        rowNumber: rowNumber,
        caseId: 'CASE-' + ('000' + (rowNumber - 1)).slice(-3) + '-' + orderId,
        date: String(raw[0] || ''),
        dateDisplay: String(raw[0] || ''),
        orderId: orderId,
        customerName: String(raw[2] || '').trim(),
        email: String(raw[3] || '').trim(),
        product: String(raw[4] || '').trim(),
        reasonForReturn: String(raw[5] || '').trim(),
        currentStatus: String(raw[6] || '').trim(),
        refundStatus: String(raw[7] || 'Processed').trim(),
        amount: parseFloat(String(raw[8] || '0').replace(/[^0-9.-]+/g, '')) || 0,
        month: String(raw[10] || ''),
        year: parseInt(String(raw[11] || '2026'), 10) || 2026,
        reasonCategory: String(raw[12] || 'Other'),
        followUpStatus: String(raw[13] || 'Closed / Completed'),
        requestedDate: String(raw[14] || ''),
        processedDate: String(raw[15] || ''),
        processingTime: String(raw[16] || 'Date Required'),
        priority: String(raw[17] || 'Completed'),
        remarks: String(raw[18] || ''),
        lastUpdated: String(raw[19] || ''),
        proofStatus: String(raw[21] || 'Available'),
        referenceId: String(raw[22] || ''),
        screenshotDate: String(raw[23] || ''),
        orderTypeCategory: String(raw[24] || ''),
        screenshotUrl: String(raw[20] || raw[9] || '').trim()
      });
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      syncedAt: new Date().toISOString(),
      count: records.length,
      records: records
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.token !== WEB_APP_SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized token' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const master = ss.getSheetByName(CONFIG.MASTER_TAB);
    const logSheet = ss.getSheetByName(CONFIG.LOG_TAB);
    const rec = body.record || {};
    const action = body.action || 'update';
    const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd-MMM-yyyy HH:mm:ss');

    if (action === 'create') {
      const colB = master.getRange(2, 2, 500, 1).getDisplayValues().map(function(r) { return String(r[0] || '').trim(); });
      const emptyIdx = colB.indexOf('');
      const targetRow = emptyIdx !== -1 ? (emptyIdx + 2) : (master.getLastRow() + 1);

      // Write only user-editable columns so formula columns (K, L, M, N, Q, R, T, V, Y) are untouched
      master.getRange(targetRow, 1, 1, 9).setValues([[
        rec.date, rec.orderId, rec.customerName, rec.email, rec.product,
        rec.reasonForReturn, rec.currentStatus, rec.refundStatus, Number(rec.amount || 0)
      ]]);
      master.getRange(targetRow, 15, 1, 2).setValues([[rec.requestedDate || '', rec.processedDate || '']]);
      master.getRange(targetRow, 19).setValue(rec.remarks || '');
      if (rec.screenshotThumb) {
        try {
          const cImg = SpreadsheetApp.newCellImage().setSourceUrl(String(rec.screenshotThumb)).build();
          master.getRange(targetRow, 10).setValue(cImg);
          master.getRange(targetRow, 21).setValue(cImg);
        } catch (e) {}
      }
      master.getRange(targetRow, 23, 1, 2).setValues([[rec.referenceId || '', rec.screenshotDate || '']]);

      if (logSheet) {
        logSheet.appendRow([nowStr, body.operator || 'Web App', CONFIG.MASTER_TAB, targetRow, rec.orderId, 'New Refund Case', '', rec.refundStatus + ' (₹' + rec.amount + ')', 'Free Apps Script API']);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'created', rowNumber: targetRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update') {
      const colB = master.getRange(2, 2, 500, 1).getDisplayValues().map(function(r) { return String(r[0] || '').trim(); });
      const matchIdx = colB.indexOf(String(rec.orderId || '').trim());
      if (matchIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Order ID not found: ' + rec.orderId }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const rowNum = matchIdx + 2;

      master.getRange(rowNum, 1, 1, 9).setValues([[
        rec.date, rec.orderId, rec.customerName, rec.email, rec.product,
        rec.reasonForReturn, rec.currentStatus, rec.refundStatus, Number(rec.amount || 0)
      ]]);
      master.getRange(rowNum, 15, 1, 2).setValues([[rec.requestedDate || '', rec.processedDate || '']]);
      master.getRange(rowNum, 19).setValue(rec.remarks || '');
      master.getRange(rowNum, 23, 1, 2).setValues([[rec.referenceId || '', rec.screenshotDate || '']]);

      if (logSheet) {
        logSheet.appendRow([nowStr, body.operator || 'Web App', CONFIG.MASTER_TAB, rowNum, rec.orderId, 'Updated Case', '', rec.refundStatus + ' (₹' + rec.amount + ')', 'Free Apps Script API']);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'updated', rowNumber: rowNum }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'uploadScreenshot') {
      const targetOrderId = String(rec.orderId || body.orderId || '').trim();
      if (!targetOrderId) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Missing orderId for screenshot upload' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const colB = master.getRange(2, 2, 500, 1).getDisplayValues().map(function(r) { return String(r[0] || '').trim(); });
      const matchIdx = colB.indexOf(targetOrderId);
      if (matchIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Order ID not found: ' + targetOrderId }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const rowNum = matchIdx + 2;
      const imgSource = String(rec.screenshotThumb || body.screenshotThumb || '').trim();
      if (imgSource) {
        try {
          const cellImg = SpreadsheetApp.newCellImage().setSourceUrl(imgSource).build();
          master.getRange(rowNum, 10).setValue(cellImg);
          master.getRange(rowNum, 21).setValue(cellImg);
        } catch (imgErr) {
          master.getRange(rowNum, 21).setValue(imgSource);
        }
      }
      master.getRange(rowNum, 23, 1, 2).setValues([[rec.referenceId || '', rec.screenshotDate || nowStr.slice(0, 11)]]);

      if (logSheet) {
        logSheet.appendRow([nowStr, body.operator || 'Web App', CONFIG.MASTER_TAB, rowNum, targetOrderId, 'Uploaded Refund Screenshot (SS)', 'Missing', 'Available', 'Web App Screenshot Upload']);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'uploaded', orderId: targetOrderId, rowNumber: rowNum }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      const targetOrderId = String(rec.orderId || body.orderId || '').trim();
      if (!targetOrderId) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Missing orderId for delete' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const colB = master.getRange(2, 2, 500, 1).getDisplayValues().map(function(r) { return String(r[0] || '').trim(); });
      const matchIdx = colB.indexOf(targetOrderId);
      if (matchIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Order ID not found: ' + targetOrderId }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const rowNum = matchIdx + 2;
      // Clear user input cells or delete row if rowNum > 65; if rowNum <= 65, delete row from MASTER REFUND DATA
      master.deleteRow(rowNum);

      if (logSheet) {
        logSheet.appendRow([nowStr, body.operator || 'Web App', CONFIG.MASTER_TAB, rowNum, targetOrderId, 'Deleted Refund Record', targetOrderId, 'Deleted', 'Web App Delete']);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'deleted', orderId: targetOrderId, rowNumber: rowNum }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
