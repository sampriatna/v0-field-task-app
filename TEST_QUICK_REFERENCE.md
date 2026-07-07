# ⚡ Test Quick Reference

**Test WhatsApp Number:** +628128660880  
**Timezone:** Asia/Jakarta  
**Date:** July 8, 2026

---

## 🚀 Quick Start (5 Minutes)

### 1. Create 3 Templates in RECURRING_TEMPLATES Sheet

Copy-paste these rows (replace values in brackets with your sheet column numbers):

```
| template_id | template_name | repeat_type | repeat_days | is_active | wa_number | notes |
|---|---|---|---|---|---|---|
| DAILY-DUMMY-TEST-001 | [DUMMY] Daily Test 628128660880 | DAILY | | TRUE | 628128660880 | Test only, disable after |
| WEEKLY-DUMMY-TEST-001 | [DUMMY] Weekly Test 628128660880 | WEEKLY | Monday,Wednesday,Friday | TRUE | 628128660880 | Test only, disable after |
| CLOSING-DUMMY-TEST-001 | [DUMMY] Closing Test 628128660880 | CLOSING | | TRUE | 628128660880 | Test only, disable after |
```

### 2. Run Test

**In Google Apps Script:**
```javascript
generateRecurringTasks();
// Check Execution log (Ctrl+Enter)
```

### 3. Verify Results

| Check | Command | Expected |
|-------|---------|----------|
| **Task Created** | `TASK_MASTER` filter by template_id | 1 row |
| **WA Sent** | Check phone +628128660880 | Message received |
| **WA Log** | `WA_LOG` filter by template_id | 1 entry, status SENT |
| **Error Log** | `ERROR_LOG` filter by template_id | 0 rows |
| **No Duplicate** | Run again + count TASK_MASTER | Still 1 row |

### 4. Cleanup

Set `is_active = FALSE` for all 3 dummy templates.

---

## 🔍 Monitoring Sheets

### TASK_MASTER Quick Check

```javascript
// In Apps Script console:
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName("TASK_MASTER");
const data = sheet.getDataRange().getValues();

// Filter DUMMY tasks:
const dummyTasks = data.filter(row => 
  row[0]?.includes("DUMMY") // Assuming template_id in column A
);

console.log("DUMMY Tasks:", dummyTasks);
console.log("Count:", dummyTasks.length);
```

### WA_LOG Quick Check

```javascript
const sheet = ss.getSheetByName("WA_LOG");
const data = sheet.getDataRange().getValues();

// Filter DUMMY templates:
const dummyWA = data.filter(row => 
  row[2]?.includes("DUMMY") // Assuming template_id in column C
);

console.log("DUMMY WA Logs:", dummyWA);
dummyWA.forEach(row => {
  console.log(`${row[0]} → ${row[1]} (${row[3]})`); // ID, phone, status
});
```

### ERROR_LOG Quick Check

```javascript
const sheet = ss.getSheetByName("ERROR_LOG");
const data = sheet.getDataRange().getValues();

// Filter DUMMY templates:
const dummyErrors = data.filter(row => 
  row[2]?.includes("DUMMY") // Assuming template_id in column C
);

console.log("DUMMY Errors:", dummyErrors.length, "entries");
dummyErrors.forEach(row => {
  console.log(`ERROR: ${row[6]}`); // Error message
});
```

---

## ❌ Troubleshooting (3 Common Issues)

### Issue 1: Task NOT Created

```
Logs show: [SKIP] WEEKLY_REPEAT_DAYS_EMPTY
```

**Fix:** WEEKLY template needs `repeat_days` filled (e.g., "Monday,Wednesday,Friday")

---

### Issue 2: WA NOT Received

```
ERROR_LOG shows: [WA_ERROR] Fonnte API returned 401
```

**Fix:**
1. Check Fonnte API token in GAS project properties
2. Verify +628128660880 is "Trusted Contact" in Fonnte dashboard
3. Check phone balance

---

### Issue 3: DUPLICATE Task Created

```
TASK_MASTER has 2 rows for same (template_id, date)
WA_LOG has 2 entries for same template + date
```

**Fix:** Date comparison might be using wrong timezone
- Check: `Utilities.formatDate(date, "Asia/Jakarta", "yyyy-MM-dd")`
- Should NOT use "UTC"

---

## 📋 Test Checklist

**Before Test:**
- [ ] 3 dummy templates created in RECURRING_TEMPLATES
- [ ] All set `is_active = TRUE`
- [ ] All use `wa_number = 628128660880`

**During Test:**
- [ ] Run `generateRecurringTasks()`
- [ ] Check logs (no errors)
- [ ] Check +628128660880 for WA message

**After Each Template Test:**
- [ ] TASK_MASTER has 1 row
- [ ] WA_LOG has 1 entry
- [ ] ERROR_LOG empty
- [ ] Run again → 0 duplicates

**Cleanup:**
- [ ] Set all dummy templates `is_active = FALSE`
- [ ] OR delete dummy rows from sheet
- [ ] Verify no more WA messages sent

---

## 🎯 What Passes = ✅

- ✅ Task created in TASK_MASTER
- ✅ WA message received on test phone
- ✅ WA_LOG records entry with status SENT
- ✅ ERROR_LOG empty
- ✅ Re-running does NOT create duplicate
- ✅ All 3 template types (DAILY, WEEKLY, CLOSING) work

---

## 🛑 What Fails = ❌

- ❌ Task NOT created (stays in ERROR_LOG or skipped)
- ❌ WA NOT received (no message on phone)
- ❌ WA_LOG entry shows status = FAILED
- ❌ ERROR_LOG has error messages
- ❌ Re-running creates DUPLICATE row
- ❌ Any template type fails

---

## 📞 Test Number Details

**Number:** +628128660880  
**Format:** Indonesian (+62 country code, 8xxx area)  
**Type:** WhatsApp enabled  
**Trusted:** Must be added as "Trusted Contact" in Fonnte dashboard  
**Rate Limit:** Check Fonnte limits (usually 60-100 msgs/min per number)

---

## ⏱️ Timeline

- **2-3 min:** Create templates
- **1 min:** Run test
- **1-2 min:** Verify each phase (DAILY, WEEKLY, CLOSING)
- **1 min:** Cleanup
- **Total:** ~8-10 minutes

---

**Next:** See full details in [TEST_PLAN_DAILY_WEEKLY_CLOSING.md](./TEST_PLAN_DAILY_WEEKLY_CLOSING.md)

Last Updated: 2026-07-08
