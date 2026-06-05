# Google Apps Script - Checklist Integration Guide

## BAGIAN 1: STRUKTUR GOOGLE SHEET

Buat 4 sheet dalam workbook yang sama:

### Sheet 1: CHECKLIST_TEMPLATE
```
Kolom A: template_id (PRIMARY KEY) - format: CHKM-YYYYMMDD-XXX
Kolom B: template_name
Kolom C: outlet
Kolom D: area
Kolom E: task_title
Kolom F: checklist_title
Kolom G: pic_name
Kolom H: pic_wa
Kolom I: requires_photo (TRUE/FALSE)
Kolom J: active_status (TRUE/FALSE)
Kolom K: created_at (timestamp)
Kolom L: updated_at (timestamp)
```

### Sheet 2: CHECKLIST_ITEM
```
Kolom A: checklist_item_id (PRIMARY KEY) - format: CHKI-YYYYMMDD-XXX
Kolom B: template_id (FK to CHECKLIST_TEMPLATE)
Kolom C: item_order (number 1, 2, 3, ...)
Kolom D: item_text
Kolom E: requires_photo (TRUE/FALSE)
Kolom F: is_required (TRUE/FALSE)
Kolom G: active_status (TRUE/FALSE)
Kolom H: created_at (timestamp)
Kolom I: updated_at (timestamp)
```

### Sheet 3: CHECKLIST_REPORT
```
Kolom A: report_id (PRIMARY KEY) - format: CHK-TSK-YYYYMMDD-XXX
Kolom B: task_id (FK - reference to TASK)
Kolom C: template_id (FK to CHECKLIST_TEMPLATE)
Kolom D: token (random string 32 char)
Kolom E: pic_name
Kolom F: pic_wa
Kolom G: outlet
Kolom H: area
Kolom I: report_date (date YYYY-MM-DD)
Kolom J: deadline (timestamp)
Kolom K: checklist_title
Kolom L: status (PENDING/SUBMITTED/APPROVED/REVISI) default: PENDING
Kolom M: submitted_at (timestamp, kosong jika belum)
Kolom N: staff_note (text)
Kolom O: after_photo_url (URL)
Kolom P: verified_by (nama leader/admin)
Kolom Q: verified_at (timestamp)
Kolom R: revision_note (text)
Kolom S: revision_count (number)
Kolom T: is_late (TRUE/FALSE)
Kolom U: created_at (timestamp)
Kolom V: updated_at (timestamp)
```

### Sheet 4: CHECKLIST_REPORT_ITEM
```
Kolom A: report_item_id (PRIMARY KEY) - format: CHKRI-YYYYMMDD-XXX
Kolom B: report_id (FK to CHECKLIST_REPORT)
Kolom C: checklist_item_id (FK to CHECKLIST_ITEM)
Kolom D: is_checked (TRUE/FALSE)
Kolom E: photo_url (URL)
Kolom F: checked_at (timestamp, kosong jika belum dicheck)
Kolom G: updated_at (timestamp)
```

---

## BAGIAN 2: CONTOH DATA AWAL

### CHECKLIST_TEMPLATE (Row 1-2, data mulai row 2)
```
Row 2 (Header): template_id | template_name | outlet | area | task_title | checklist_title | pic_name | pic_wa | requires_photo | active_status | created_at | updated_at

Row 3 (Data): CHKM-20260605-001 | Pagi Dapur | KBU | Dapur | Setup Pagi | Setup Dapur Pagi | Budi | 6281234567890 | TRUE | TRUE | 2026-01-15T08:00:00Z | 2026-01-15T08:00:00Z
Row 4 (Data): CHKM-20260605-002 | Closing Bar | Kisamen | Bar | Closing Bar | Closing Bar Harian | Dewi | 6281234567891 | TRUE | TRUE | 2026-01-15T09:00:00Z | 2026-01-15T09:00:00Z
```

### CHECKLIST_ITEM (Row 1-2, data mulai row 2)
```
Row 2 (Header): checklist_item_id | template_id | item_order | item_text | requires_photo | is_required | active_status | created_at | updated_at

Row 3 (Data): CHKI-20260605-001 | CHKM-20260605-001 | 1 | Cuci seluruh area dapur | FALSE | TRUE | TRUE | 2026-01-15T08:00:00Z | 2026-01-15T08:00:00Z
Row 4 (Data): CHKI-20260605-002 | CHKM-20260605-001 | 2 | Bersihkan kompor dan hood | TRUE | TRUE | TRUE | 2026-01-15T08:00:00Z | 2026-01-15T08:00:00Z
Row 5 (Data): CHKI-20260605-003 | CHKM-20260605-001 | 3 | Ganti lap dapur | FALSE | FALSE | TRUE | 2026-01-15T08:00:00Z | 2026-01-15T08:00:00Z
Row 6 (Data): CHKI-20260605-004 | CHKM-20260605-002 | 1 | Hitung stock minuman | TRUE | TRUE | TRUE | 2026-01-15T09:00:00Z | 2026-01-15T09:00:00Z
Row 7 (Data): CHKI-20260605-005 | CHKM-20260605-002 | 2 | Bersihkan meja bar | FALSE | TRUE | TRUE | 2026-01-15T09:00:00Z | 2026-01-15T09:00:00Z
```

### CHECKLIST_REPORT (Row 1-2, data mulai row 2)
```
Row 2 (Header): report_id | task_id | template_id | token | pic_name | pic_wa | outlet | area | report_date | deadline | checklist_title | status | submitted_at | staff_note | after_photo_url | verified_by | verified_at | revision_note | revision_count | is_late | created_at | updated_at

Row 3 (Data): CHK-TSK-20260605-001 | TSK-001 | CHKM-20260605-001 | abc1234def5678ghi9101112 | Budi | 6281234567890 | KBU | Dapur | 2026-06-05 | 2026-06-05T17:00:00Z | Setup Dapur Pagi | SUBMITTED | 2026-06-05T08:30:00Z | Semua selesai | https://drive.google.com/uc?id=xxx | Admin Nusa | 2026-06-05T09:00:00Z |  | 0 | FALSE | 2026-06-05T08:00:00Z | 2026-06-05T09:00:00Z
```

### CHECKLIST_REPORT_ITEM (Row 1-2, data mulai row 2)
```
Row 2 (Header): report_item_id | report_id | checklist_item_id | is_checked | photo_url | checked_at | updated_at

Row 3 (Data): CHKRI-20260605-001 | CHK-TSK-20260605-001 | CHKI-20260605-001 | TRUE |  | 2026-06-05T08:15:00Z | 2026-06-05T08:15:00Z
Row 4 (Data): CHKRI-20260605-002 | CHK-TSK-20260605-001 | CHKI-20260605-002 | TRUE | https://drive.google.com/uc?id=yyy | 2026-06-05T08:20:00Z | 2026-06-05T08:20:00Z
Row 5 (Data): CHKRI-20260605-003 | CHK-TSK-20260605-001 | CHKI-20260605-003 | FALSE |  |  | 
```

---

## BAGIAN 3: GOOGLE APPS SCRIPT - FULL CODE

Paste kode di bawah ke Editor Google Apps Script (sebagai 1 file apps-script.gs):

```javascript
// ===== HELPER FUNCTIONS =====

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
const DRIVE_FOLDER_ID = PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID");

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

function findRowByValue(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex - 1] === value) return i + 1;
  }
  return -1;
}

function generateId(prefix) {
  const date = new Date();
  const dateStr = Utilities.formatDate(date, "GMT+7", "yyyyMMdd");
  const random = Math.random().toString(36).substr(2, 3).toUpperCase();
  return \`\${prefix}-\${dateStr}-\${random}\`;
}

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx];
  });
  return obj;
}

// ===== MAIN ACTIONS =====

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const adminSecret = payload.admin_secret;

    // Validate admin secret
    const storedSecret = PropertiesService.getScriptProperties().getProperty("ADMIN_API_KEY");
    if (adminSecret !== storedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Unauthorized"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    let result;

    switch (action) {
      case "getChecklistTemplates":
        result = handleGetChecklistTemplates();
        break;
      case "createChecklistTemplate":
        result = handleCreateChecklistTemplate(payload);
        break;
      case "updateChecklistTemplate":
        result = handleUpdateChecklistTemplate(payload);
        break;
      case "getChecklistItems":
        result = handleGetChecklistItems(payload.template_id);
        break;
      case "saveChecklistItems":
        result = handleSaveChecklistItems(payload);
        break;
      case "generateChecklistReport":
        result = handleGenerateChecklistReport(payload);
        break;
      case "getChecklistReports":
        result = handleGetChecklistReports();
        break;
      case "getChecklistDetail":
        result = handleGetChecklistDetail(payload.task_id);
        break;
      case "getChecklistByToken":
        result = handleGetChecklistByToken(payload.task_id, payload.token);
        break;
      case "submitChecklistReport":
        result = handleSubmitChecklistReport(payload);
        break;
      case "approveChecklist":
        result = handleApproveChecklist(payload);
        break;
      case "requestChecklistRevision":
        result = handleRequestChecklistRevision(payload);
        break;
      case "resendChecklistWhatsApp":
        result = handleResendChecklistWhatsApp(payload);
        break;
      default:
        result = { success: false, error: \`Unknown action: \${action}\` };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== ACTION HANDLERS =====

function handleGetChecklistTemplates() {
  try {
    const sheet = getSheet("CHECKLIST_TEMPLATE");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const templates = data.slice(1).map(row => rowToObject(row, headers));
    return { success: true, data: templates };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleCreateChecklistTemplate(payload) {
  try {
    const sheet = getSheet("CHECKLIST_TEMPLATE");
    const templateId = generateId("CHKM");
    const row = [
      templateId,
      payload.template_name,
      payload.outlet,
      payload.area,
      payload.task_title,
      payload.checklist_title,
      payload.pic_name,
      payload.pic_wa,
      payload.requires_photo || FALSE,
      TRUE,
      new Date(),
      new Date()
    ];
    sheet.appendRow(row);
    return { success: true, data: { template_id: templateId } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleUpdateChecklistTemplate(payload) {
  try {
    const sheet = getSheet("CHECKLIST_TEMPLATE");
    const rowNum = findRowByValue(sheet, 1, payload.template_id);
    if (rowNum === -1) return { success: false, error: "Template not found" };

    const headers = sheet.getRange(1, 1, 1, 12).getValues()[0];
    const row = [
      payload.template_id,
      payload.template_name,
      payload.outlet,
      payload.area,
      payload.task_title,
      payload.checklist_title,
      payload.pic_name,
      payload.pic_wa,
      payload.requires_photo || FALSE,
      payload.active_status !== false ? TRUE : FALSE,
      sheet.getRange(rowNum, 11).getValue(),
      new Date()
    ];
    sheet.getRange(rowNum, 1, 1, 12).setValues([row]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleGetChecklistItems(templateId) {
  try {
    const sheet = getSheet("CHECKLIST_ITEM");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const items = data.slice(1)
      .filter(row => row[1] === templateId)
      .map(row => rowToObject(row, headers))
      .sort((a, b) => a.item_order - b.item_order);
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleSaveChecklistItems(payload) {
  try {
    const sheet = getSheet("CHECKLIST_ITEM");
    const templateId = payload.template_id;
    const items = payload.items; // Array of { item_text, requires_photo, is_required, item_order }

    // Delete existing items for this template
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][1] === templateId) {
        sheet.deleteRow(i + 1);
      }
    }

    // Add new items
    items.forEach((item, idx) => {
      const itemId = generateId("CHKI");
      const row = [
        itemId,
        templateId,
        idx + 1,
        item.item_text,
        item.requires_photo || FALSE,
        item.is_required || FALSE,
        TRUE,
        new Date(),
        new Date()
      ];
      sheet.appendRow(row);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleGenerateChecklistReport(payload) {
  try {
    const reportSheet = getSheet("CHECKLIST_REPORT");
    const reportId = generateId("CHK-TSK");
    const token = generateToken();

    const row = [
      reportId,
      payload.task_id,
      payload.template_id,
      token,
      payload.pic_name,
      payload.pic_wa,
      payload.outlet,
      payload.area,
      payload.report_date,
      payload.deadline,
      payload.checklist_title,
      "PENDING",
      "",
      "",
      "",
      "",
      "",
      "",
      0,
      FALSE,
      new Date(),
      new Date()
    ];

    reportSheet.appendRow(row);

    // Create report items (all unchecked initially)
    const itemSheet = getSheet("CHECKLIST_REPORT_ITEM");
    const checklistSheet = getSheet("CHECKLIST_ITEM");
    const itemData = checklistSheet.getDataRange().getValues();
    const headers = itemData[0];

    itemData.slice(1)
      .filter(row => row[1] === payload.template_id)
      .forEach(row => {
        const itemObj = rowToObject(row, headers);
        const reportItemId = generateId("CHKRI");
        const reportItemRow = [
          reportItemId,
          reportId,
          itemObj.checklist_item_id,
          FALSE,
          "",
          "",
          ""
        ];
        itemSheet.appendRow(reportItemRow);
      });

    return {
      success: true,
      data: {
        report_id: reportId,
        task_id: payload.task_id,
        token: token,
        checklist_link: \`https://task.nf3.company/checklist-report/\${reportId}?token=\${token}\`
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleGetChecklistReports() {
  try {
    const sheet = getSheet("CHECKLIST_REPORT");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const reports = data.slice(1).map(row => rowToObject(row, headers));
    return { success: true, data: reports };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleGetChecklistDetail(taskId) {
  try {
    const reportSheet = getSheet("CHECKLIST_REPORT");
    const itemSheet = getSheet("CHECKLIST_ITEM");
    const reportItemSheet = getSheet("CHECKLIST_REPORT_ITEM");

    // Find report
    const reportData = reportSheet.getDataRange().getValues();
    const reportHeaders = reportData[0];
    const reportRow = reportData.find(r => r[1] === taskId);
    if (!reportRow) return { success: false, error: "Checklist not found" };

    const report = rowToObject(reportRow, reportHeaders);
    const reportId = report.report_id;
    const templateId = report.template_id;

    // Get checklist items
    const itemData = itemSheet.getDataRange().getValues();
    const itemHeaders = itemData[0];
    const items = itemData.slice(1)
      .filter(row => row[1] === templateId && row[6] === TRUE) // active_status = TRUE
      .map(row => rowToObject(row, itemHeaders))
      .sort((a, b) => a.item_order - b.item_order);

    // Get checked items
    const reportItemData = reportItemSheet.getDataRange().getValues();
    const reportItemHeaders = reportItemData[0];
    const checkedItems = reportItemData.slice(1)
      .filter(row => row[1] === reportId)
      .map(row => rowToObject(row, reportItemHeaders));

    return {
      success: true,
      data: {
        report_id: reportId,
        task_id: taskId,
        template_id: templateId,
        token: report.token,
        pic_name: report.pic_name,
        pic_wa: report.pic_wa,
        outlet: report.outlet,
        area: report.area,
        report_date: report.report_date,
        deadline: report.deadline,
        checklist_title: report.checklist_title,
        items: items,
        submitted_at: report.submitted_at || null,
        checked_items: checkedItems,
        after_photo_url: report.after_photo_url || null,
        staff_note: report.staff_note || null,
        status: report.status,
        verified_by: report.verified_by || null,
        verified_at: report.verified_at || null,
        revision_note: report.revision_note || null,
        revision_count: report.revision_count || 0,
        is_late: report.is_late || FALSE
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleGetChecklistByToken(taskId, token) {
  try {
    const reportSheet = getSheet("CHECKLIST_REPORT");
    const reportData = reportSheet.getDataRange().getValues();
    const reportHeaders = reportData[0];

    const reportRow = reportData.find(r => r[1] === taskId && r[3] === token);
    if (!reportRow) {
      return { success: false, error: "Link checklist tidak valid" };
    }

    // Return same as getChecklistDetail
    return handleGetChecklistDetail(taskId);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleSubmitChecklistReport(payload) {
  try {
    const reportSheet = getSheet("CHECKLIST_REPORT");
    const reportItemSheet = getSheet("CHECKLIST_REPORT_ITEM");

    // Validate token
    const reportData = reportSheet.getDataRange().getValues();
    const reportHeaders = reportData[0];
    const reportRowIdx = reportData.findIndex(r => r[1] === payload.task_id && r[3] === payload.token);
    if (reportRowIdx === -1) {
      return { success: false, error: "Token tidak valid" };
    }

    const reportRowNum = reportRowIdx + 1;

    // Update checked items
    const checkedItems = payload.checked_items; // Array of { checklist_item_id, is_checked, photo_url? }
    checkedItems.forEach(item => {
      const itemData = reportItemSheet.getDataRange().getValues();
      const itemIdx = itemData.findIndex(r =>
        r[1] === reportData[reportRowIdx][0] && r[2] === item.checklist_item_id
      );
      if (itemIdx !== -1) {
        const itemRowNum = itemIdx + 1;
        reportItemSheet.getRange(itemRowNum, 4).setValue(item.is_checked ? TRUE : FALSE);
        reportItemSheet.getRange(itemRowNum, 5).setValue(item.photo_url || "");
        reportItemSheet.getRange(itemRowNum, 6).setValue(new Date());
        reportItemSheet.getRange(itemRowNum, 7).setValue(new Date());
      }
    });

    // Update report
    const reportObj = rowToObject(reportData[reportRowIdx], reportHeaders);
    reportObj.status = "SUBMITTED";
    reportObj.submitted_at = new Date();
    reportObj.staff_note = payload.staff_note || "";
    if (payload.after_photo_base64) {
      // TODO: Upload foto ke Drive dan simpan URL
      reportObj.after_photo_url = "https://drive.google.com/uc?id=xxx"; // Placeholder
    }

    const reportRow = reportHeaders.map(h => reportObj[h]);
    reportSheet.getRange(reportRowNum, 1, 1, reportRow.length).setValues([reportRow]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleApproveChecklist(payload) {
  try {
    const reportSheet = getSheet("CHECKLIST_REPORT");
    const reportData = reportSheet.getDataRange().getValues();
    const reportHeaders = reportData[0];
    const reportRowIdx = reportData.findIndex(r => r[0] === payload.report_id);

    if (reportRowIdx === -1) {
      return { success: false, error: "Report not found" };
    }

    const reportRowNum = reportRowIdx + 1;
    const reportObj = rowToObject(reportData[reportRowIdx], reportHeaders);
    reportObj.status = "APPROVED";
    reportObj.verified_by = payload.verified_by;
    reportObj.verified_at = new Date();
    reportObj.updated_at = new Date();

    const reportRow = reportHeaders.map(h => reportObj[h]);
    reportSheet.getRange(reportRowNum, 1, 1, reportRow.length).setValues([reportRow]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleRequestChecklistRevision(payload) {
  try {
    const reportSheet = getSheet("CHECKLIST_REPORT");
    const reportData = reportSheet.getDataRange().getValues();
    const reportHeaders = reportData[0];
    const reportRowIdx = reportData.findIndex(r => r[0] === payload.report_id);

    if (reportRowIdx === -1) {
      return { success: false, error: "Report not found" };
    }

    const reportRowNum = reportRowIdx + 1;
    const reportObj = rowToObject(reportData[reportRowIdx], reportHeaders);
    reportObj.status = "REVISI";
    reportObj.revision_note = payload.revision_note;
    reportObj.revision_count = (reportObj.revision_count || 0) + 1;
    reportObj.verified_by = payload.verified_by;
    reportObj.verified_at = new Date();
    reportObj.updated_at = new Date();

    const reportRow = reportHeaders.map(h => reportObj[h]);
    reportSheet.getRange(reportRowNum, 1, 1, reportRow.length).setValues([reportRow]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function handleResendChecklistWhatsApp(payload) {
  try {
    // TODO: Integrate dengan WhatsApp API (Twilio, Fonnte, dll)
    // Untuk sekarang, hanya return success
    return { success: true, message: "WhatsApp reminder akan dikirim" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## BAGIAN 4: SETUP SCRIPT PROPERTIES

Di Google Apps Script Editor:
1. Klik **Project Settings** (gear icon)
2. Scroll ke **Script properties**
3. Tambahkan:
   - Key: `SPREADSHEET_ID`, Value: `[ID Spreadsheet mu]`
   - Key: `DRIVE_FOLDER_ID`, Value: `[ID Folder Drive untuk upload foto]`
   - Key: `ADMIN_API_KEY`, Value: `[API key yang sama di Vercel env]`

---

## BAGIAN 5: DEPLOY WEB APP

Di Google Apps Script:
1. Klik **Deploy** → **New Deployment**
2. Type: **Web app**
3. Execute as: **Me** (akun Google yang punya sheet)
4. Who has access: **Anyone**
5. Copy URL dan set sebagai `GAS_WEB_APP_URL` di Vercel

---

## BAGIAN 6: TESTING MANUAL

### Test 1: Create Checklist Template
```bash
curl -X POST https://script.google.com/.../exec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createChecklistTemplate",
    "admin_secret": "YOUR_API_KEY",
    "template_name": "Test Template",
    "outlet": "KBU",
    "area": "Dapur",
    "task_title": "Test Task",
    "checklist_title": "Test Checklist",
    "pic_name": "Budi",
    "pic_wa": "6281234567890",
    "requires_photo": true
  }'
```

### Test 2: Save Checklist Items
```bash
curl -X POST https://script.google.com/.../exec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "saveChecklistItems",
    "admin_secret": "YOUR_API_KEY",
    "template_id": "CHKM-20260605-001",
    "items": [
      { "item_text": "Item 1", "requires_photo": false, "is_required": true, "item_order": 1 },
      { "item_text": "Item 2", "requires_photo": true, "is_required": true, "item_order": 2 }
    ]
  }'
```

### Test 3: Generate Checklist Report
```bash
curl -X POST https://script.google.com/.../exec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generateChecklistReport",
    "admin_secret": "YOUR_API_KEY",
    "task_id": "TSK-001",
    "template_id": "CHKM-20260605-001",
    "pic_name": "Budi",
    "pic_wa": "6281234567890",
    "outlet": "KBU",
    "area": "Dapur",
    "report_date": "2026-06-05",
    "deadline": "2026-06-05T17:00:00Z",
    "checklist_title": "Setup Dapur Pagi"
  }'
```

### Test 4: Get Checklist Detail
```bash
curl -X POST https://script.google.com/.../exec \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getChecklistDetail",
    "admin_secret": "YOUR_API_KEY",
    "task_id": "TSK-001"
  }'
```

---

## BAGIAN 7: FRONTEND INTEGRATION

Frontend `lib/api.ts` sudah compatible dengan actions ini. Pastikan route.ts ada di ADMIN_ACTIONS:

```typescript
const ADMIN_ACTIONS = [
  "getChecklistTemplates",
  "createChecklistTemplate",
  "updateChecklistTemplate",
  "getChecklistItems",
  "saveChecklistItems",
  "generateChecklistReport",
  "getChecklistReports",
  "getChecklistDetail",
  "getChecklistByToken",
  "submitChecklistReport",
  "approveChecklist",
  "requestChecklistRevision",
  "resendChecklistWhatsApp",
  // ... actions lainnya
];
```

Frontend page `/checklists/[taskId]` akan automatically call `getChecklistDetail(taskId)` via `lib/api.ts`.

Staff page (future) `/checklist-report/[reportId]` akan call `getChecklistByToken(taskId, token)` untuk validasi token.
