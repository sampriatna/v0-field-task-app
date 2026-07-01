# GAS FIX PROMPT — Recurring tasks for Dapur / Bar / Waiters not generating

Paste this whole message to Claude (with access to the Google Apps Script project).

---

## Context / architecture

- Stack: Next.js frontend (Vercel) → `/api/gas` proxy → **Google Apps Script (GAS) Web App** → Google Sheets + Fonnte (WhatsApp).
- Recurring checklist templates live in a sheet (columns include: `template_id, template_name, outlet, area, category, pic_name, pic_wa, task_title, task_description, repeat_type, repeat_days, repeat_time, deadline_time, requires_photo, active_status, template_version, created_at, updated_at, checklist_items`).
- A time-driven trigger runs `generateRecurringTasks()` (or similar) to create daily/weekly tasks from these templates and send WhatsApp via Fonnte.

## Symptom (confirmed in production)

Daily recurring tasks for **Dapur (Opening/Closing Kitchen)**, **Bar (Opening/Closing Bar)**, and **Waiters (Opening Waiters)** stopped being generated. Other templates (Mushola, WC) still generate fine.

## Root cause (confirmed via live `getRecurringTemplates` API)

The `repeat_days` column is **corrupted** for exactly the broken templates. The stored value is the Java array reference string instead of day names:

```
TPL-27D44AF46B49 | DAILY | repeat_days = [Ljava.lang.Object;@6347f154 | Closing Kitchen  (Dapur)   <-- BROKEN
TPL-DA641234177C | DAILY | repeat_days = [Ljava.lang.Object;@111eee2e | Opening Kitchen  (Dapur)   <-- BROKEN
TPL-4B7602A2BF3C | DAILY | repeat_days = [Ljava.lang.Object;@4255e622 | Opening Waiters           <-- BROKEN
TPL-E9698593CC60 | DAILY | repeat_days = [Ljava.lang.Object;@38ff7f65 | Closing Waiters           <-- BROKEN
TPL-4D5F15E7DF19 | DAILY | repeat_days = [Ljava.lang.Object;@37f03a5f | Closing Bar               <-- BROKEN
TPL-E411591A6A01 | DAILY | repeat_days = [Ljava.lang.Object;@1f7a6cf9 | Opening Bar               <-- BROKEN
TPL-D66378276C19 | DAILY | repeat_days = [Ljava.lang.Object;@721e2149 | Closing Kasir             <-- BROKEN
TPL-DCB6503891D1 | DAILY | repeat_days = [Ljava.lang.Object;@46a6653e | Opening (Samtaro)         <-- BROKEN
TPL-021F43FC1CCD | DAILY | repeat_days = senin        | Mushola      <-- OK (clean string)
TPL-F18E34FDE10F | DAILY | repeat_days = senin        | WC           <-- OK
```

`[Ljava.lang.Object;@...` is what Apps Script writes when you place a **JavaScript array directly into a single cell** (via `appendRow([...])` or `range.setValues([[...]])`) without joining it to a string first. The frontend sends `repeat_days` correctly as a JSON array like `["senin","selasa","rabu","kamis","jumat","sabtu","minggu"]`; the corruption happens on the GAS write side.

Because the generator reads this garbage string and tries to match it against today's day name, the match fails and the template is skipped — so no task is created and no WhatsApp is sent.

## What to fix in GAS (3 parts)

### 1) Write `repeat_days` as a clean string (root cause)
In `createRecurringTemplate` and `updateRecurringTemplate` (and anywhere a template row is written), normalize `repeat_days` to a comma-joined lowercase string **before** writing to the cell:

```js
function normalizeRepeatDays(raw) {
  // Accept array, JSON string, or comma string; always return "senin,selasa,..."
  if (Array.isArray(raw)) return raw.join(',');
  if (typeof raw === 'string') {
    var s = raw.trim();
    if (s.startsWith('[')) {            // JSON array string
      try { return JSON.parse(s).join(','); } catch (e) {}
    }
    return s;                            // already "senin,selasa"
  }
  return '';
}
// use: row[repeatDaysColIndex] = normalizeRepeatDays(payload.repeat_days);
```

### 2) Make the generator tolerant when reading `repeat_days`
When parsing an existing template, handle the corrupted `[Ljava.lang.Object;` case and treat DAILY as "every day" regardless of repeat_days:

```js
function parseRepeatDays(value) {
  if (value == null) return [];
  var s = String(value).trim();
  if (s === '' || s.indexOf('[Ljava') === 0) return []; // corrupted -> empty
  if (s.startsWith('[')) { try { return JSON.parse(s); } catch (e) {} }
  return s.split(',').map(function (d) { return d.trim().toLowerCase(); }).filter(Boolean);
}

function shouldGenerateToday(template, todayDayName /* e.g. "senin" */) {
  var type = String(template.repeat_type || '').toUpperCase();
  if (type === 'DAILY') return true;                 // daily = every day, ignore repeat_days
  var days = parseRepeatDays(template.repeat_days);
  if (type === 'WEEKLY' || type === 'CUSTOM' || type === 'WEEKDAYS' || type === 'WEEKENDS') {
    if (days.length === 0) return false;             // misconfigured weekly -> log a warning
    return days.indexOf(todayDayName) !== -1;
  }
  return false;
}
```

Also add `Logger.log`/console logging when a template is skipped, including `template_id` and the reason, so future misconfigurations are visible.

### 3) One-time repair of the 8 corrupted rows
Write and run a one-off function to fix existing data. All broken ones are DAILY, so set them to all 7 days:

```js
function repairCorruptedRepeatDays() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('RECURRING_TEMPLATES'); // use real name
  var values = sheet.getDataRange().getValues();
  var header = values[0];
  var idCol = header.indexOf('template_id');
  var daysCol = header.indexOf('repeat_days');
  var typeCol = header.indexOf('repeat_type');
  var allDays = 'senin,selasa,rabu,kamis,jumat,sabtu,minggu';
  var fixed = 0;
  for (var r = 1; r < values.length; r++) {
    var v = String(values[r][daysCol] || '');
    if (v.indexOf('[Ljava') === 0) {
      var isDaily = String(values[r][typeCol] || '').toUpperCase() === 'DAILY';
      sheet.getRange(r + 1, daysCol + 1).setValue(isDaily ? allDays : 'senin');
      fixed++;
      Logger.log('Fixed ' + values[r][idCol]);
    }
  }
  Logger.log('Total fixed: ' + fixed);
}
```

## After fixing — verification

1. Run `repairCorruptedRepeatDays()` once, then confirm the sheet shows readable day names for all 8 templates.
2. Manually run `generateRecurringTasks()` and confirm Dapur, Bar, and Waiters tasks are created for today and WhatsApp is sent (respect the existing `Utilities.sleep` throttle between sends).
3. In the app, open **Recurring Templates**, edit + save one template, and re-check the sheet cell to confirm it now stores `senin,selasa,...` (not `[Ljava...`), proving the write fix works.
4. Confirm the daily trigger is still installed and scheduled.

## Important
- Do **not** change the JSON contract with the frontend: `getRecurringTemplates` should keep returning `repeat_days` in a form the app already handles (the app accepts both a comma string and an array).
- Keep all other behavior unchanged.
