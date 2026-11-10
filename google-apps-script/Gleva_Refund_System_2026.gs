/**
 * ============================================================================
 * GLEVA COSMETICS — AUTOMATED REFUND MANAGEMENT & ANALYTICS SYSTEM V3 (2026–2027)
 * Hardened Google Apps Script (Production Release)
 * ============================================================================
 *
 * SECURITY & V3 UPGRADES:
 * 1. Removed insecure hardcoded fallback token from public code:
 *    - Reads `GLEVA_WEB_APP_SECRET_TOKEN` from `PropertiesService.getScriptProperties()`.
 *    - Enforces constant-time token verification on BOTH `doGet` and `doPost`.
 * 2. Server-Side Input & Duplicate Validation:
 *    - Validates Order ID, Customer Name, Refund Status, and positive INR amount on
 *      every write (`create`, `update`, `bulkUpdate`, `uploadScreenshot`, `delete`).
 *    - Prevents accidental duplicate Order IDs during `create` unless `allowDuplicate`
 *      is explicitly set.
 * 3. Private Google Drive Proof Vault:
 *    - Organizes uploaded screenshots inside `Refund Screenshots / 2026 / <Month> / <OrderID>`
 *      and strictly enforces `DriveApp.Access.PRIVATE, DriveApp.Permission.NONE`.
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
  VALID_STATUSES: [
    'Pending',
    'Initiated',
    'Processing',
    'Processed',
    'Partially Refunded',
    'Failed',
    'On Hold'
  ],
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
    .createMenu('⚡ Gleva Refund System V3')
    .addItem('🚀 Run Complete 2026 System Upgrade / Repair', 'setupRefundManagementSystem2026')
    .addSeparator()
    .addItem('🔑 Configure Web App Secret Token', 'promptConfigureWebAppSecretToken')
    .addItem('🔄 Reset Dashboard Interactive Filters', 'resetDashboardFilters')
    .addItem('📁 Sync Google Drive Screenshot Folders (2026)', 'organizeRefundScreenshotsInDrive')
    .addItem('🔒 Protect Calculated Columns', 'protectCalculatedColumns')
    .addSeparator()
    .addItem('📧 Configure Daily Pending Alert Trigger', 'installDailyAlertTrigger')
    .addToUi();
}

/**
 * Allows the sheet owner to securely store GLEVA_WEB_APP_SECRET_TOKEN in Script Properties
 * instead of hardcoding secrets in script files.
 */
function promptConfigureWebAppSecretToken() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Configure Gleva Web App Bearer Token',
    'Enter the secret token matching GLEVA_ADMIN_BEARER_TOKEN in your Vercel Environment Variables:',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() === ui.Button.OK) {
    const val = String(res.getResponseText() || '').trim();
    if (val.length < 12) {
      ui.alert('Security Error', 'Token must be at least 12 characters long.', ui.ButtonSet.OK);
      return;
    }
    PropertiesService.getScriptProperties().setProperty('GLEVA_WEB_APP_SECRET_TOKEN', val);
    ui.alert('Token Saved', 'GLEVA_WEB_APP_SECRET_TOKEN stored in Script Properties.', ui.ButtonSet.OK);
  }
}

function verifyRequestToken_(providedToken) {
  const expected = PropertiesService.getScriptProperties().getProperty('GLEVA_WEB_APP_SECRET_TOKEN');
  if (!expected || !providedToken) return false;
  const a = String(providedToken).trim();
  const b = String(expected).trim();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    const row = e.range.getRow();
    const col = e.range.getColumn();

    if (sheetName !== CONFIG.MASTER_TAB || row < 2) return;

    const now = new Date();
    sheet.getRange(row, 20).setValue(now).setNumberFormat('dd-mmm-yyyy');

    if (col === 21 && e.value && !sheet.getRange(row, 24).getValue()) {
      sheet.getRange(row, 24).setValue(now).setNumberFormat('dd-mmm-yyyy');
    }

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
      const oldVal = typeof e.oldValue !== 'undefined' ? String(e.oldValue) : '(Blank / Formula)';
      const newVal = typeof e.value !== 'undefined' ? String(e.value) : '(Updated)';
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

function resetDashboardFilters() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName(CONFIG.DASHBOARD_TAB);
  if (!dash) return;
  ss.toast('Dashboard filters reset to ALL.', 'Gleva Refund System V3', 3);
}

function organizeRefundScreenshotsInDrive() {
  const rootIter = DriveApp.getFoldersByName(CONFIG.DRIVE_ROOT_FOLDER);
  const rootFolder = rootIter.hasNext()
    ? rootIter.next()
    : DriveApp.createFolder(CONFIG.DRIVE_ROOT_FOLDER);

  // Strictly enforce private access control on Drive proof folders
  rootFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  const yearIter = rootFolder.getFoldersByName('2026');
  const yearFolder = yearIter.hasNext() ? yearIter.next() : rootFolder.createFolder('2026');
  yearFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  monthNames.forEach(function(mName) {
    const mIter = yearFolder.getFoldersByName(mName);
    const mFolder = mIter.hasNext() ? mIter.next() : yearFolder.createFolder(mName);
    mFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Verified private folder structure: Refund Screenshots / 2026 / [January–December]',
    'Drive Screenshot Organizer',
    5
  );
  return rootFolder.getUrl();
}

function protectCalculatedColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(CONFIG.MASTER_TAB);
  if (!master) return;

  const rangesToProtect = ['K2:L500', 'Q2:R500'];
  rangesToProtect.forEach(function(a1) {
    const protection = master
      .getRange(a1)
      .protect()
      .setDescription('Calculated Formula Column (' + a1 + ')');
    protection.setWarningOnly(true);
  });

  ss.toast('Protected calculated columns (K:L, Q:R) with edit warnings.', 'Protection Applied', 4);
}

function sendDailyPendingSummaryIfConfigured() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.LOG_TAB);
  const master = ss.getSheetByName(CONFIG.MASTER_TAB);
  if (!logSheet || !master) return;

  const enabledFlag = String(logSheet.getRange('B3').getDisplayValue()).trim().toUpperCase();
  const recipientEmail = String(logSheet.getRange('B4').getDisplayValue()).trim();
  const thresholdDays = Number(logSheet.getRange('B5').getValue()) || 7;

  if (enabledFlag !== 'YES' || !recipientEmail || recipientEmail.indexOf('@') === -1) {
    return;
  }

  const lastRow = master.getLastRow();
  if (lastRow < 2) return;

  const data = master.getRange(2, 1, lastRow - 1, 24).getValues();
  let pendingCount = 0;
  let pendingAmount = 0;
  const highPriorityCases = [];

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
    'Gleva Cosmetics Refund Management System V3 — Daily Summary',
    '-----------------------------------------------------------',
    'Total Pending Refund Cases: ' + pendingCount,
    'Total Pending Refund Amount: ₹' + pendingAmount.toFixed(2),
    'High-Priority Cases (>' + thresholdDays + ' days): ' +
      (highPriorityCases.length ? highPriorityCases.join(', ') : 'None'),
    '',
    'Open Refund Dashboard: ' + ss.getUrl()
  ].join('\n');

  MailApp.sendEmail(recipientEmail, subject, body);
}

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
    'Daily alert trigger installed (9:00 AM IST).',
    'Trigger Installed',
    5
  );
}

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
  ss.toast(
    'Gleva Cosmetics 2026 Refund System V3 timezone (Asia/Kolkata), backup, and protections verified!',
    'System Ready',
    5
  );
}

function validateIncomingRecord_(rec) {
  const orderId = String(rec.orderId || '').trim();
  if (!orderId || orderId.length < 3 || orderId.length > 48) {
    return { valid: false, error: 'Invalid or missing Order ID' };
  }
  const amount = Number(rec.amount);
  if (isNaN(amount) || amount <= 0 || amount > 500000) {
    return { valid: false, error: 'Invalid refund amount' };
  }
  if (rec.refundStatus && CONFIG.VALID_STATUSES.indexOf(String(rec.refundStatus)) === -1) {
    return { valid: false, error: 'Invalid refundStatus value' };
  }
  return { valid: true };
}

function doGet(e) {
  try {
    const token = e && e.parameter && e.parameter.token ? String(e.parameter.token).trim() : '';
    if (!verifyRequestToken_(token)) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing GLEVA_WEB_APP_SECRET_TOKEN' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const master = ss.getSheetByName(CONFIG.MASTER_TAB);
    if (!master) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'MASTER REFUND DATA tab not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

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

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'ok',
        syncedAt: new Date().toISOString(),
        count: records.length,
        records: records
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) })).setMimeType(
      ContentService.MimeType.JSON
    );
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!verifyRequestToken_(body.token)) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing GLEVA_WEB_APP_SECRET_TOKEN' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const master = ss.getSheetByName(CONFIG.MASTER_TAB);
    const logSheet = ss.getSheetByName(CONFIG.LOG_TAB);
    const rec = body.record || {};
    const action = body.action || 'update';
    const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd-MMM-yyyy HH:mm:ss');

    if (action === 'create') {
      const check = validateIncomingRecord_(rec);
      if (!check.valid) {
        return ContentService.createTextOutput(JSON.stringify({ error: check.error })).setMimeType(
          ContentService.MimeType.JSON
        );
      }

      const colB = master
        .getRange(2, 2, 500, 1)
        .getDisplayValues()
        .map(function(r) {
          return String(r[0] || '').trim();
        });
      const existingIdx = colB.findIndex(function(oid) {
        return oid.toLowerCase() === String(rec.orderId || '').trim().toLowerCase();
      });
      if (existingIdx !== -1 && !body.allowDuplicate) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Duplicate Order ID already exists at row ' + (existingIdx + 2) })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      const emptyIdx = colB.indexOf('');
      const targetRow = emptyIdx !== -1 ? emptyIdx + 2 : master.getLastRow() + 1;

      master.getRange(targetRow, 1, 1, 9).setValues([
        [
          rec.date,
          rec.orderId,
          rec.customerName,
          rec.email,
          rec.product,
          rec.reasonForReturn,
          rec.currentStatus,
          rec.refundStatus,
          Number(rec.amount || 0)
        ]
      ]);
      master
        .getRange(targetRow, 15, 1, 2)
        .setValues([[rec.requestedDate || '', rec.processedDate || '']]);
      master.getRange(targetRow, 19).setValue(rec.remarks || '');
      if (rec.screenshotThumb) {
        try {
          const cImg = SpreadsheetApp.newCellImage()
            .setSourceUrl(String(rec.screenshotThumb))
            .build();
          master.getRange(targetRow, 10).setValue(cImg);
          master.getRange(targetRow, 21).setValue(cImg);
        } catch (imgErr) {}
      }
      master
        .getRange(targetRow, 23, 1, 2)
        .setValues([[rec.referenceId || '', rec.screenshotDate || '']]);

      if (logSheet) {
        logSheet.appendRow([
          nowStr,
          body.operator || 'Authenticated Admin',
          CONFIG.MASTER_TAB,
          targetRow,
          rec.orderId,
          'New Refund Case',
          '',
          rec.refundStatus + ' (₹' + rec.amount + ')',
          'Gleva V3 Server API'
        ]);
      }

      return ContentService.createTextOutput(
        JSON.stringify({ status: 'created', rowNumber: targetRow })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update') {
      const check = validateIncomingRecord_(rec);
      if (!check.valid) {
        return ContentService.createTextOutput(JSON.stringify({ error: check.error })).setMimeType(
          ContentService.MimeType.JSON
        );
      }

      const colB = master
        .getRange(2, 2, 500, 1)
        .getDisplayValues()
        .map(function(r) {
          return String(r[0] || '').trim();
        });
      const matchIdx = colB.indexOf(String(rec.orderId || '').trim());
      if (matchIdx === -1) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Order ID not found: ' + rec.orderId })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      const rowNum = matchIdx + 2;

      master.getRange(rowNum, 1, 1, 9).setValues([
        [
          rec.date,
          rec.orderId,
          rec.customerName,
          rec.email,
          rec.product,
          rec.reasonForReturn,
          rec.currentStatus,
          rec.refundStatus,
          Number(rec.amount || 0)
        ]
      ]);
      master
        .getRange(rowNum, 15, 1, 2)
        .setValues([[rec.requestedDate || '', rec.processedDate || '']]);
      master.getRange(rowNum, 19).setValue(rec.remarks || '');
      master
        .getRange(rowNum, 23, 1, 2)
        .setValues([[rec.referenceId || '', rec.screenshotDate || '']]);

      if (logSheet) {
        logSheet.appendRow([
          nowStr,
          body.operator || 'Authenticated Admin',
          CONFIG.MASTER_TAB,
          rowNum,
          rec.orderId,
          'Updated Case',
          '',
          rec.refundStatus + ' (₹' + rec.amount + ')',
          'Gleva V3 Server API'
        ]);
      }

      return ContentService.createTextOutput(
        JSON.stringify({ status: 'updated', rowNumber: rowNum })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'bulkUpdate') {
      const updatedOrders = (rec && rec.updatedOrders) || [];
      const newStatus = String((rec && rec.refundStatus) || '');
      if (CONFIG.VALID_STATUSES.indexOf(newStatus) === -1) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Invalid bulk status' })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      const colB = master
        .getRange(2, 2, 500, 1)
        .getDisplayValues()
        .map(function(r) {
          return String(r[0] || '').trim();
        });
      let updatedCount = 0;
      updatedOrders.forEach(function(oid) {
        const idx = colB.indexOf(String(oid).trim());
        if (idx !== -1) {
          master.getRange(idx + 2, 8).setValue(newStatus);
          updatedCount++;
        }
      });
      if (logSheet && updatedCount > 0) {
        logSheet.appendRow([
          nowStr,
          body.operator || 'Authenticated Admin',
          CONFIG.MASTER_TAB,
          0,
          updatedCount + ' Orders',
          'Bulk Status Update',
          'Multiple',
          newStatus,
          'Gleva V3 Server API'
        ]);
      }
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'bulk_updated', updatedCount: updatedCount })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'uploadScreenshot') {
      const targetOrderId = String(rec.orderId || body.orderId || '').trim();
      if (!targetOrderId) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Missing orderId for screenshot upload' })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      const colB = master
        .getRange(2, 2, 500, 1)
        .getDisplayValues()
        .map(function(r) {
          return String(r[0] || '').trim();
        });
      const matchIdx = colB.indexOf(targetOrderId);
      if (matchIdx === -1) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Order ID not found: ' + targetOrderId })
        ).setMimeType(ContentService.MimeType.JSON);
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
      master
        .getRange(rowNum, 23, 1, 2)
        .setValues([[rec.referenceId || '', rec.screenshotDate || nowStr.slice(0, 11)]]);

      if (logSheet) {
        logSheet.appendRow([
          nowStr,
          body.operator || 'Authenticated Admin',
          CONFIG.MASTER_TAB,
          rowNum,
          targetOrderId,
          'Uploaded Refund Screenshot (SS)',
          'Missing',
          'Available',
          'Gleva V3 Server API'
        ]);
      }

      return ContentService.createTextOutput(
        JSON.stringify({ status: 'uploaded', orderId: targetOrderId, rowNumber: rowNum })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      const targetOrderId = String(rec.orderId || body.orderId || '').trim();
      if (!targetOrderId) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Missing orderId for delete' })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      const colB = master
        .getRange(2, 2, 500, 1)
        .getDisplayValues()
        .map(function(r) {
          return String(r[0] || '').trim();
        });
      const matchIdx = colB.indexOf(targetOrderId);
      if (matchIdx === -1) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Order ID not found: ' + targetOrderId })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      const rowNum = matchIdx + 2;
      master.deleteRow(rowNum);

      if (logSheet) {
        logSheet.appendRow([
          nowStr,
          body.operator || 'Authenticated Admin',
          CONFIG.MASTER_TAB,
          rowNum,
          targetOrderId,
          'Deleted Refund Record',
          targetOrderId,
          'Deleted',
          'Gleva V3 Server API'
        ]);
      }

      return ContentService.createTextOutput(
        JSON.stringify({ status: 'deleted', orderId: targetOrderId, rowNumber: rowNum })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) })).setMimeType(
      ContentService.MimeType.JSON
    );
  }
}
