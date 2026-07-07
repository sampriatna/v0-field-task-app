# 🧪 TEST PLAN: Recurring Tasks (DAILY, WEEKLY, CLOSING)

**Test Number:** +628128660880 (Indonesia)  
**Date:** July 8, 2026  
**Timezone:** Asia/Jakarta

---

## 📋 Test Sequence Overview

```
Phase 1: Setup Dummy Templates
├─ Create DAILY template → test WhatsApp
├─ Create WEEKLY template → test WhatsApp
└─ Create CLOSING template → test WhatsApp

Phase 2: Test DAILY Tasks
├─ Run generateRecurringTasks()
├─ Verify TASK_MASTER created 1 DAILY task
├─ Verify WA sent to +628128660880
├─ Check WA_LOG for entry
├─ Check ERROR_LOG empty
└─ Run again WITHOUT force → verify NO DUPLICATE

Phase 3: Test WEEKLY Tasks
├─ Run generateRecurringTasks()
├─ Verify TASK_MASTER created 1 WEEKLY task
├─ Verify WA sent
├─ Check idempotency

Phase 4: Test CLOSING Tasks
├─ Run generateRecurringTasks()
├─ Verify TASK_MASTER created 1 CLOSING task
├─ Verify WA sent
├─ Check idempotency

Phase 5: Cleanup
├─ Disable all 3 dummy templates
└─ Verify no active dummy templates remain
```

---

## ⚙️ PHASE 1: Setup Dummy Templates

### What to Create in Google Sheets (RECURRING_TEMPLATES sheet)

**Template 1: DAILY Dummy**
```
template_id       : DAILY-DUMMY-TEST-001
template_name     : [DUMMY] Daily Test 628128660880
repeat_type       : DAILY
repeat_days       : (empty)
start_time        : 08:00
end_time          : 17:00
outlets           : All
areas             : All
categories        : All
staff             : All
wa_number         : 628128660880 (TEST)
wa_message_template : Test DAILY template - {outlet_name} - {date}
is_active         : TRUE (✓)
notes             : Do not delete until Phase 5. For testing only.
```

**Template 2: WEEKLY Dummy**
```
template_id       : WEEKLY-DUMMY-TEST-001
template_name     : [DUMMY] Weekly Test 628128660880
repeat_type       : WEEKLY
repeat_days       : Monday,Wednesday,Friday (pick 3 days, comma-separated)
start_time        : 09:00
end_time          : 10:00
outlets           : All
areas             : All
categories        : All
staff             : All
wa_number         : 628128660880 (TEST)
wa_message_template : Test WEEKLY template - {outlet_name} - {date}
is_active         : TRUE (✓)
notes             : Do not delete until Phase 5. For testing only.
```

**Template 3: CLOSING Dummy**
```
template_id       : CLOSING-DUMMY-TEST-001
template_name     : [DUMMY] Closing Test 628128660880
repeat_type       : CLOSING
repeat_days       : (empty)
start_time        : 17:00
end_time          : 22:00
outlets           : All
areas             : All
categories        : All
staff             : All
wa_number         : 628128660880 (TEST)
wa_message_template : Test CLOSING template - {outlet_name} - {date}
is_active         : TRUE (✓)
notes             : Do not delete until Phase 5. For testing only.
```

---

## 🧪 PHASE 2: Test DAILY Tasks

### Step 1: Open Google Apps Script Console

```
Apps Script Project → Logs (Ctrl+Enter or ⌘+Enter)
```

### Step 2: Run generateRecurringTasks()

In Apps Script editor, click Run button or:
```javascript
// In console, execute:
generateRecurringTasks();
```

### Step 3: Monitor Logs

Watch for entries like:
```
[DAILY-DUMMY-TEST-001] Task generated: task_id=XXX, date=2026-07-08
[WA] Message sent to +628128660880: Test DAILY template...
[SUCCESS] 1 tasks generated
```

### Step 4: Check TASK_MASTER Sheet

**Expected results:**
- [ ] New row created
- [ ] `template_id` = DAILY-DUMMY-TEST-001
- [ ] `task_date` = 2026-07-08 (today's date in Asia/Jakarta)
- [ ] `task_status` = "PENDING" or "SENT"
- [ ] `task_id` = non-empty

```sql
SELECT * FROM TASK_MASTER 
WHERE template_id = 'DAILY-DUMMY-TEST-001' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Step 5: Check WhatsApp

**Expected:** Message received on +628128660880
```
Test DAILY template - [Outlet Name] - July 8, 2026
```

**If NOT received:**
- [ ] Check WA_LOG for failed entry
- [ ] Check ERROR_LOG for WhatsApp API error
- [ ] Check Fonnte dashboard: is +628128660880 in "Trusted Contacts"?

### Step 6: Check WA_LOG Sheet

**Expected entry:**
```
wa_id           : (auto-generated)
phone_number    : 628128660880
template_id     : DAILY-DUMMY-TEST-001
task_id         : (from TASK_MASTER)
wa_status       : "SENT" or "PENDING"
wa_message      : Test DAILY template - [Outlet] - July 8, 2026
sent_at         : 2026-07-08 HH:MM:SS
response_code   : 200 or similar success code
notes           : (if any error, should log here)
```

**Query:**
```
SELECT * FROM WA_LOG 
WHERE template_id = 'DAILY-DUMMY-TEST-001' 
ORDER BY sent_at DESC 
LIMIT 1;
```

### Step 7: Check ERROR_LOG Sheet

**Expected:** No error entries for DAILY-DUMMY-TEST-001

```
SELECT * FROM ERROR_LOG 
WHERE template_id = 'DAILY-DUMMY-TEST-001';
-- Should return 0 rows
```

### Step 8: Test Idempotency (NO DUPLICATE)

**Run again WITHOUT force flag:**
```javascript
generateRecurringTasks(); // Run without any force parameter
```

**Expected logs:**
```
[DAILY-DUMMY-TEST-001] Task already exists for 2026-07-08. SKIP.
[INFO] 0 tasks generated (all templates already have today's task)
```

**Verify TASK_MASTER still has only 1 row for today:**
```
SELECT COUNT(*) FROM TASK_MASTER 
WHERE template_id = 'DAILY-DUMMY-TEST-001' 
AND task_date = '2026-07-08';
-- Should return 1 (not 2!)
```

**Verify WA_LOG has only 1 entry:**
```
SELECT COUNT(*) FROM WA_LOG 
WHERE template_id = 'DAILY-DUMMY-TEST-001' 
AND DATE(sent_at) = '2026-07-08';
-- Should return 1 (not 2!)
```

---

## 🧪 PHASE 3: Test WEEKLY Tasks

### Step 1: Check Today's Day of Week

```javascript
const today = new Date();
const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
console.log("Today is:", dayName); // Monday, Wednesday, Friday, etc.
```

**Key:** If today is NOT one of your WEEKLY repeat_days, template will skip.  
**Recommendation:** Set `repeat_days` to include TODAY.

### Step 2: Run generateRecurringTasks()

```javascript
generateRecurringTasks();
```

### Step 3: Check TASK_MASTER

**Expected:**
- [ ] New row for WEEKLY-DUMMY-TEST-001
- [ ] `task_date` = today (if today matches repeat_days)
- [ ] `repeat_type` = "WEEKLY"

```
SELECT * FROM TASK_MASTER 
WHERE template_id = 'WEEKLY-DUMMY-TEST-001' 
AND task_date = '2026-07-08';
```

### Step 4: Check WhatsApp

**Expected:** Message for WEEKLY template

### Step 5: Check Logs (WA_LOG, ERROR_LOG)

Same as DAILY (Phase 2, Steps 6-7)

### Step 6: Test Idempotency

Run again and verify 0 duplicates.

---

## 🧪 PHASE 4: Test CLOSING Tasks

### Step 1: Understand CLOSING Task Timing

CLOSING tasks are typically for evening check-out (17:00-22:00).  
**Question:** Should CLOSING task for 2026-07-08 be generated TODAY (during morning trigger)?

**Recommended logic:**
- If trigger runs at 00:00 (midnight): CLOSING task for TODAY should be generated  
- If trigger runs at 08:00 (morning): CLOSING task for TODAY should be generated

### Step 2: Run generateRecurringTasks()

```javascript
generateRecurringTasks();
```

### Step 3: Check TASK_MASTER

**Expected:**
- [ ] New row for CLOSING-DUMMY-TEST-001
- [ ] `task_date` = 2026-07-08
- [ ] `repeat_type` = "CLOSING"

### Step 4: Check WhatsApp

**Expected:** Message for CLOSING template

### Step 5: Check Logs

Same as DAILY

### Step 6: Test Idempotency

Run again and verify 0 duplicates.

---

## 🧪 PHASE 5: Cleanup

### Step 1: Disable All Dummy Templates

In RECURRING_TEMPLATES sheet, set `is_active` = FALSE for:
- [ ] DAILY-DUMMY-TEST-001
- [ ] WEEKLY-DUMMY-TEST-001
- [ ] CLOSING-DUMMY-TEST-001

### Step 2: Verify No Active Dummies

```javascript
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RECURRING_TEMPLATES");
const data = sheet.getDataRange().getValues();
const active = data.filter(row => row.is_active === TRUE && row.template_name.includes("[DUMMY]"));
console.log("Active dummy templates:", active);
// Should return 0 rows
```

### Step 3: Delete Dummy Rows (Optional)

If templates show as ACTIVE, delete rows:
- Delete row with DAILY-DUMMY-TEST-001
- Delete row with WEEKLY-DUMMY-TEST-001
- Delete row with CLOSING-DUMMY-TEST-001

### Step 4: Verify WA Log

Ensure no new WhatsApp messages are sent (previous templates deleted/disabled).

---

## ✅ PHASE 6: Sign-Off Checklist

- [ ] DAILY template: Task created ✓, WA sent ✓, No duplicate ✓
- [ ] WEEKLY template: Task created ✓, WA sent ✓, No duplicate ✓
- [ ] CLOSING template: Task created ✓, WA sent ✓, No duplicate ✓
- [ ] All dummy templates DISABLED ✓
- [ ] No WA messages after cleanup ✓
- [ ] ERROR_LOG empty for all tests ✓

---

## 🐛 Troubleshooting

### Issue 1: Task NOT Created (TASK_MASTER empty)

**Check logs for:**
```
[ERROR] WEEKLY_REPEAT_DAYS_EMPTY
[ERROR] CLOSING_NOT_SUPPORTED (if CLOSING repeat_type not recognized)
[ERROR] Template not found: (template_id)
```

**Fix:**
1. Verify template exists in RECURRING_TEMPLATES
2. Verify `is_active = TRUE`
3. Check if `repeat_days` is empty for WEEKLY (might need default)

### Issue 2: WA NOT Received

**Check ERROR_LOG:**
```
[WA_ERROR] Fonnte API returned 401: Invalid token
[WA_ERROR] Phone number not verified: +628128660880
[WA_ERROR] Message too long (> 1024 chars)
```

**Fix:**
1. Verify `wa_number` is correct
2. Verify Fonnte API key valid
3. Verify phone is "Trusted Contact" in Fonnte dashboard
4. Check message length

### Issue 3: DUPLICATE Tasks Created

**If running again creates duplicate:**

**Check TASK_MASTER for duplicate rows:**
```
SELECT template_id, task_date, COUNT(*) as count 
FROM TASK_MASTER 
GROUP BY template_id, task_date 
HAVING count > 1;
```

**Root cause:** Date comparison not working (timezone issue?)

**Fix:**
- Check date format in comparison (should be "YYYY-MM-DD")
- Check timezone in `Utilities.formatDate(date, "Asia/Jakarta", "yyyy-MM-dd")`
- Add UNIQUE constraint on (template_id, task_date)

### Issue 4: ERROR_LOG Showing Errors

**Check ERROR_LOG sheet for:**
```
- Error messages
- Stack traces
- Template IDs that failed
```

**Common errors:**
- `WEEKLY_REPEAT_DAYS_EMPTY`: Template has repeat_type WEEKLY but repeat_days empty
- `ALREADY_EXISTS`: Task already created (expected on re-run, not an error)
- `FONNTE_API_ERROR`: WhatsApp API issue

---

## 📝 Test Results Template

**Date:** 2026-07-08  
**Tester:** [Your Name]  
**Test Number:** +628128660880

### DAILY Test
- [ ] Task created: YES / NO
- [ ] WA received: YES / NO
- [ ] Idempotent (no duplicate): YES / NO
- [ ] Error log clean: YES / NO
- **Status:** ✅ PASS / ❌ FAIL

### WEEKLY Test
- [ ] Task created: YES / NO
- [ ] WA received: YES / NO
- [ ] Idempotent (no duplicate): YES / NO
- [ ] Error log clean: YES / NO
- **Status:** ✅ PASS / ❌ FAIL

### CLOSING Test
- [ ] Task created: YES / NO
- [ ] WA received: YES / NO
- [ ] Idempotent (no duplicate): YES / NO
- [ ] Error log clean: YES / NO
- **Status:** ✅ PASS / ❌ FAIL

### Cleanup
- [ ] All dummy templates disabled: YES / NO
- [ ] No active dummies: YES / NO
- **Status:** ✅ PASS / ❌ FAIL

**Overall Result:** ✅ ALL PASS / ⚠️ PARTIAL / ❌ FAILED

**Notes:**
```
[Add any issues, observations, or notes here]
```

---

## 🎯 Next Steps (If Tests Fail)

1. **Collect Logs**
   - Screenshot ERROR_LOG entries
   - Screenshot TASK_MASTER (failed entries)
   - Screenshot WA_LOG (failed entries)

2. **Run Google Apps Script Audit**
   - Use `CLAUDE_PROMPT_GAS_AUDIT.md`
   - Focus on:
     - Timezone handling (Asia/Jakarta)
     - Date comparison logic
     - WEEKLY repeat_days validation
     - CLOSING task date logic

3. **Check Fonnte Integration**
   - Verify API token valid
   - Verify phone number trusted
   - Check rate limits

4. **Database Consistency**
   - Backup sheets before modifications
   - Check for orphaned rows in WA_LOG (task_id not in TASK_MASTER)

---

**Created:** 2026-07-08  
**Last Updated:** 2026-07-08  
**Status:** Ready for Testing
