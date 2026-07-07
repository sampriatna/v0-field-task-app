# 🚀 START TESTING HERE

**Status:** Ready to test recurring tasks (DAILY, WEEKLY, CLOSING)  
**Test WhatsApp:** +628128660880  
**Timezone:** Asia/Jakarta  
**Date:** July 8, 2026

---

## 📋 What You'll Test

```
✓ DAILY recurring tasks
✓ WEEKLY recurring tasks  
✓ CLOSING recurring tasks
✓ Idempotency (no duplicates)
✓ WhatsApp messaging
✓ Logging (TASK_MASTER, WA_LOG, ERROR_LOG)
✓ Cleanup (disable dummy templates)
```

---

## ⚡ Quick Start (Choose One)

### Option A: 5-Minute Quick Test
**For:** If you just want to get started quickly  
👉 **Read:** [TEST_QUICK_REFERENCE.md](./TEST_QUICK_REFERENCE.md)

- Copy 3 template rows
- Run test
- Check results
- Cleanup

---

### Option B: Detailed Step-by-Step
**For:** If you want detailed instructions with screenshots  
👉 **Read:** [TEST_PLAN_DAILY_WEEKLY_CLOSING.md](./TEST_PLAN_DAILY_WEEKLY_CLOSING.md)

- Detailed templates with all fields
- Verification queries
- Troubleshooting guide
- Root cause analysis

---

### Option C: Test Tracking (Recommended)
**For:** If you want to log results for reference  
👉 **Read:** [TEST_EXECUTION_LOG.md](./TEST_EXECUTION_LOG.md)

- Pre-test checklist
- Phase-by-phase tracking
- Screenshot markers
- Issue logging

---

## 🎯 Test Sequence (All Options)

1. **Create 3 dummy templates** in RECURRING_TEMPLATES sheet
   - DAILY-DUMMY-TEST-001
   - WEEKLY-DUMMY-TEST-001
   - CLOSING-DUMMY-TEST-001

2. **Run test for each template type**
   ```javascript
   generateRecurringTasks();
   ```

3. **Verify each phase** (3 checks per template)
   - [ ] Task created in TASK_MASTER
   - [ ] WhatsApp message sent to +628128660880
   - [ ] Idempotency check (no duplicate when run again)

4. **Check logs** (same for each phase)
   - [ ] WA_LOG entry created
   - [ ] ERROR_LOG is empty

5. **Cleanup**
   - [ ] Set all dummy templates `is_active = FALSE`
   - [ ] Verify no more WA messages sent

---

## 📊 Expected Results (PASS Criteria)

| Item | Expected | Status |
|------|----------|--------|
| DAILY task created | 1 row in TASK_MASTER | [ ] ✅ / [ ] ❌ |
| DAILY WA sent | Message on +628128660880 | [ ] ✅ / [ ] ❌ |
| DAILY idempotent | 0 duplicates on re-run | [ ] ✅ / [ ] ❌ |
| WEEKLY task created | 1 row (if today in repeat_days) | [ ] ✅ / [ ] ❌ |
| WEEKLY WA sent | Message on +628128660880 | [ ] ✅ / [ ] ❌ |
| WEEKLY idempotent | 0 duplicates on re-run | [ ] ✅ / [ ] ❌ |
| CLOSING task created | 1 row in TASK_MASTER | [ ] ✅ / [ ] ❌ |
| CLOSING WA sent | Message on +628128660880 | [ ] ✅ / [ ] ❌ |
| CLOSING idempotent | 0 duplicates on re-run | [ ] ✅ / [ ] ❌ |
| Logs clean | No entries in ERROR_LOG | [ ] ✅ / [ ] ❌ |
| Cleanup | All dummies disabled | [ ] ✅ / [ ] ❌ |

---

## 🐛 If Tests FAIL

### Common Issues & Fixes

**Issue 1: Task NOT Created**
- [ ] Check ERROR_LOG for error message
- [ ] Verify template exists in RECURRING_TEMPLATES
- [ ] Verify `is_active = TRUE`
- [ ] **Next:** Run Google Apps Script audit (see section below)

**Issue 2: WA Message NOT Received**
- [ ] Check ERROR_LOG for Fonnte API error
- [ ] Verify Fonnte API token valid
- [ ] Verify +628128660880 is "Trusted Contact"
- [ ] Check phone message balance
- [ ] **Next:** Fix Fonnte integration

**Issue 3: DUPLICATE Task Created**
- [ ] TASK_MASTER has 2+ rows for same (template_id, date)
- [ ] WA_LOG has 2+ entries for same template + date
- [ ] **Root cause:** Likely timezone/date comparison bug in GAS
- [ ] **Next:** Run Google Apps Script audit

**Issue 4: ERROR_LOG Has Errors**
- [ ] Read ERROR_LOG messages
- [ ] Common errors: `WEEKLY_REPEAT_DAYS_EMPTY`, `FONNTE_API_ERROR`
- [ ] **Next:** Fix root cause (see troubleshooting section)

---

## 🔧 Google Apps Script Audit (If Tests Fail)

**If tests fail, the issue is in Google Apps Script (not the Next.js frontend).**

Use this prompt to audit GAS:

👉 **Read:** [CLAUDE_PROMPT_GAS_AUDIT.md](./CLAUDE_PROMPT_GAS_AUDIT.md)

This guides a full audit of:
- Timezone handling (should use Asia/Jakarta)
- Date comparison logic (why duplicates?)
- WEEKLY repeat_days validation
- CLOSING task date logic
- Fonnte WhatsApp integration

---

## 📁 Test Document Files

| File | Purpose | Duration |
|------|---------|----------|
| [TEST_QUICK_REFERENCE.md](./TEST_QUICK_REFERENCE.md) | Quick start guide | 5 min |
| [TEST_PLAN_DAILY_WEEKLY_CLOSING.md](./TEST_PLAN_DAILY_WEEKLY_CLOSING.md) | Detailed test plan with queries | 20 min |
| [TEST_EXECUTION_LOG.md](./TEST_EXECUTION_LOG.md) | Fillable test tracking sheet | As you test |
| [CLAUDE_PROMPT_GAS_AUDIT.md](./CLAUDE_PROMPT_GAS_AUDIT.md) | GAS audit instructions (if needed) | 30 min |

---

## 🎬 Let's Go!

**Choose your path:**

1. **Fast & Simple?** → [TEST_QUICK_REFERENCE.md](./TEST_QUICK_REFERENCE.md) ⚡
2. **Detailed & Thorough?** → [TEST_PLAN_DAILY_WEEKLY_CLOSING.md](./TEST_PLAN_DAILY_WEEKLY_CLOSING.md) 📖
3. **Track Results?** → [TEST_EXECUTION_LOG.md](./TEST_EXECUTION_LOG.md) 📊

---

## ✨ Frontend Fixes Applied (Context)

Before you start testing, note that **frontend fixes are already applied**:

- ✅ Public actions (staff links) removed from ADMIN_ACTIONS
- ✅ needsAdminSecret() logic fixed
- ✅ API logging system added (`__vz_showApiLog()` in console)
- ✅ Link normalization added

This test focuses on **backend (Google Apps Script) functionality** only.

---

## 🎯 Test Goals

**Phase 1: Setup**
- Create 3 dummy templates with test WhatsApp number

**Phase 2: Verify Functionality**
- DAILY tasks generate correctly
- WEEKLY tasks generate correctly (if today in repeat_days)
- CLOSING tasks generate correctly

**Phase 3: Verify Quality**
- Tasks logged correctly in TASK_MASTER
- WhatsApp messages sent and logged
- No duplicate tasks created on re-run
- Error logging works

**Phase 4: Cleanup**
- All dummy templates disabled
- No more messages sent

---

## ⏱️ Time Estimates

| Phase | Duration |
|-------|----------|
| Setup (create templates) | 3-5 min |
| DAILY test | 2-3 min |
| WEEKLY test | 2-3 min |
| CLOSING test | 2-3 min |
| Cleanup | 2-3 min |
| **Total** | **~15-20 min** |

---

## 📞 Support

**If you get stuck:**
1. Check troubleshooting section above
2. Check ERROR_LOG for clues
3. Use Google Apps Script console to debug
4. Run [CLAUDE_PROMPT_GAS_AUDIT.md](./CLAUDE_PROMPT_GAS_AUDIT.md) audit

---

**Ready? Pick a guide above and let's go! 🚀**

---

**Document Version:** 1.0  
**Created:** 2026-07-08  
**Status:** Ready for Testing
