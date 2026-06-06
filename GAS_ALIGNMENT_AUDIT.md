# GAS ALIGNMENT AUDIT & ACTION ITEMS

**Generated**: 2026-06-06
**Status**: Frontend functions identified - waiting for GAS implementation confirmation

## SUMMARY

Frontend telah implement 27 API actions yang call GAS backend. Beberapa actions masih return mock data karena GAS tidak fully configured atau response format tidak sesuai ekspektasi. 

---

## AUDIT DETAIL: FUNCTIONS YANG PERLU SELARASKAN

### 🔴 CRITICAL - TIDAK BERFUNGSI (Must Fix)

#### 1. **createUser** - Buat Akun Login Staff Baru
**Status**: Gagal membuat user  
**Action Name**: `createUser`  
**Frontend Payload**:
```javascript
{
  staff_id: string,
  username: string,
  password: string,
  role: "ADMIN" | "LEADER" | "STAFF",
  login_enabled?: boolean
}
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: {
    user_id: string,
    staff_id: string,
    username: string,
    role: string,
    login_enabled: boolean,
    created_at?: string
  }
}
```
**GAS Requirement**:
- Action harus return object dengan minimal `user_id`, `staff_id`, `username`, `role`
- Validasi username unique
- Hash password dengan bcrypt atau library yang aman
- Simpan ke USERS sheet atau database

---

#### 2. **createStaff** - Tambah Staff Baru
**Status**: Gagal menambah staff  
**Action Name**: `createStaff`  
**Frontend Payload** (converted by `staffPayloadToGAS`):
```javascript
{
  staff_name: string,        // dari payload.name
  position: string,          // dari payload.position
  outlet: string,           // dari payload.outlet
  area: string,             // dari payload.area
  wa_number: string,        // dari payload.wa_number
  role: string,             // dari payload.role
  is_active: "TRUE"
}
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: {
    staff_id: string,
    name: string,
    position: string,
    outlet: string,
    area: string,
    wa_number: string,
    role: string,
    status: "ACTIVE",
    created_at: string,
    updated_at: string
  }
}
```
**GAS Requirement**:
- Generate unique `staff_id`
- Return normalized staff object
- Response HARUS include `staff_id` dan `created_at`
- `status` field harus di-normalize dari `is_active` atau `active_status`

---

#### 3. **createArea** - Tambah Area Baru
**Status**: Gagal menambah area  
**Action Name**: `createArea`  
**Frontend Payload**:
```javascript
{ name: string }
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: "area_name" // atau { area: "area_name" } atau { data: "area_name" }
}
```
**GAS Requirement**:
- Simpan area baru ke AREAS sheet
- Return response dengan minimal field: `area` atau `data` atau plain string

---

#### 4. **createCategory** - Tambah Kategori Baru
**Status**: Gagal menambah kategori  
**Action Name**: `createCategory`  
**Frontend Payload**:
```javascript
{ name: string }
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: "category_name" // atau { category: "category_name" } atau { data: "category_name" }
}
```
**GAS Requirement**:
- Simpan kategori baru ke CATEGORIES sheet
- Return response dengan minimal field: `category` atau `data` atau plain string

---

#### 5. **generateChecklistReport** - Kirim Checklist ke Staff
**Status**: Tidak generate checklist harian  
**Action Name**: `generateChecklistReport`  
**Frontend Payload**:
```javascript
{ template_id: string }
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: {
    task?: {
      task_id: string,
      checklist_token: string,
      checklist_link: string
    }
  }
}
```
**GAS Requirement**:
- Generate unique `task_id` dan `checklist_token`
- Create new row di CHECKLIST_REPORT sheet
- Generate WhatsApp link dengan token
- Return task_id untuk navigate ke halaman checklist
- Kirim WhatsApp ke PIC dengan link

---

#### 6. **getChecklistReports** - Ambil Semua Checklist Report
**Status**: Selalu return mock data  
**Action Name**: `getChecklistReports`  
**Frontend Payload**:
```javascript
{ outlet?: string, status?: string }
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: [
    {
      task_id: string,
      checklist_template_id: string,
      checklist_token: string,
      outlet: string,
      pic_name: string,
      status: "PENDING" | "SUBMITTED" | "APPROVED" | "REVISION_NEEDED",
      created_at: string,
      submitted_at?: string,
      submitted_by?: string
    }
  ]
}
```
**GAS Requirement**:
- Query CHECKLIST_REPORT sheet
- Return array dengan complete info
- Support filtering by outlet dan status

---

#### 7. **getChecklistDetail** - Detail Checklist & Items
**Status**: Selalu return mock data  
**Action Name**: `getChecklistDetail`  
**Frontend Payload**:
```javascript
{ task_id: string }
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: {
    task_id: string,
    checklist_token: string,
    checklist_template_id: string,
    outlet: string,
    area: string,
    category: string,
    pic_name: string,
    pic_wa: string,
    status: string,
    items: [
      {
        checklist_item_id: string,
        item_text: string,
        item_order: number,
        requires_photo: boolean,
        is_required: boolean,
        submitted: boolean,
        photo_url?: string,
        submitted_by?: string,
        submitted_at?: string
      }
    ]
  }
}
```
**GAS Requirement**:
- Query CHECKLIST_REPORT by task_id
- Get semua CHECKLIST_REPORT_ITEM untuk task tsb
- Return structured response dengan nested items array

---

#### 8. **saveChecklistItems** - Simpan Item Checklist Template
**Status**: Gagal menyimpan  
**Action Name**: `saveChecklistTemplate` (NOTE: nama berbeda dari `saveChecklistItems`)  
**Frontend Payload**:
```javascript
{
  template_id: string,
  items: [
    {
      item_order: number,
      item_text: string,
      requires_photo: boolean,
      is_required: boolean,
      active_status: boolean
    }
  ]
}
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: [
    {
      checklist_item_id: string,
      template_id: string,
      item_order: number,
      item_text: string,
      requires_photo: boolean,
      is_required: boolean,
      active_status: boolean
    }
  ]
}
```
**GAS Requirement**:
- Action name: `saveChecklistTemplate` (bukan `saveChecklistItems`)
- Simpan/update items di CHECKLIST_ITEM sheet
- Generate `checklist_item_id` jika baru
- Return array of saved items

---

#### 9. **loginUser** - Multi-User Login
**Status**: Timeout atau gagal  
**Action Name**: `loginUser`  
**Frontend Payload** (dari `/app/api/auth/login/route.ts`):
```javascript
{
  username: string,
  password: string,
  admin_secret: string,
  api_key: string
}
```
**Frontend Expected Response**:
```javascript
{
  success: true,
  data: {
    staff_id: string,
    username: string,
    role: "ADMIN" | "LEADER" | "STAFF",
    name: string,
    outlet?: string
  }
}
```
**GAS Requirement**:
- Query USERS sheet by username
- Verify password dengan bcrypt compare
- Return user object jika cocok
- Jika username kosong (admin login), gunakan admin_secret

---

### 🟡 MEDIUM - MASALAH NORMALISASI DATA

#### 10. **normalizeStaffFromGAS** - Staff Status Field Tidak Konsisten
**Frontend Code**: `lib/api.ts` line ~60
**Issue**: GAS return `active_status` atau `is_active` atau `status` dengan value berbeda
- GAS v26 return: `active_status: "ACTIVE"`
- Frontend expect: `status: "ACTIVE"` | `status: "INACTIVE"`
**Fix Applied**: ✅ Sekarang support semua 3 field

**Frontend Code**:
```javascript
status: gasStaff.is_active === "TRUE" 
  || gasStaff.is_active === true 
  || gasStaff.is_active === "ACTIVE" 
  || gasStaff.status === "ACTIVE" 
  || gasStaff.active_status === "ACTIVE" 
  ? "ACTIVE" : "INACTIVE"
```

**GAS Requirement**:
- Konsisten return satu field: `active_status: "ACTIVE"` atau `active_status: "INACTIVE"`
- Jangan mix `is_active` dan `active_status`

---

#### 11. **BUG 2 - checklist_mode Field Missing**
**Frontend Issue**: Di `generateTaskFromTemplateIfNotExists_` GAS baris 250-261
**Problem**: Field `checklist_mode` di-set tapi tidak di-return dalam object `createdTask`
**Impact**: WhatsApp route error - tidak tau apakah kirim sebagai `sendChecklistTask` atau `sendNewTask`

**GAS Code Issue**:
```javascript
// Baris 250: set checklist_mode
checklist_mode: hasChecklist ? 'YES' : 'NO',

// Baris 261: cek checklist_mode (tapi undefined karena tidak di-return)
const wa = createdTask.checklist_mode === 'YES'
  ? FonnteService.sendChecklistTask(createdTask, checklistItems)
  : FonnteService.sendNewTask(createdTask);
```

**GAS Requirement**:
- Pastikan `checklist_mode` di-include dalam return object `createdTask`
- Return full object dengan semua fields termasuk `checklist_mode`, `checklist_token`, `checklist_link`

---

### 🟢 WORKING - TIDAK PERLU UBAH

- `getTaskByToken`, `getTaskDetail`, `markOpened`, `submitTaskReport`
- `getRecurringTemplates`, `getRecurringTemplate`
- `updateRecurringTemplate`, `toggleRecurringTemplateStatus`
- `getStaff`, `getAreas`, `getCategories`
- `updateStaff`, `deactivateStaff`, `activateStaff`
- `updateUser`, `deleteUser`
- `getChecklistItems` (setara dengan `saveChecklistTemplate` items)
- `resendWhatsApp`, `resendChecklistWhatsApp`

---

## ACTION ITEMS UNTUK GAS

### Priority 1: CRITICAL (Must Fix untuk system berfungsi)

```
[ ] 1. createUser
  - Tambah action createUser ke POST switch
  - Validasi staff_id, username, password
  - Hash password dengan library aman
  - Return object: { user_id, staff_id, username, role, login_enabled, created_at }
  - Sheet: USERS

[ ] 2. createStaff
  - Accept payload: { staff_name, position, outlet, area, wa_number, role, is_active }
  - Generate staff_id
  - Normalize response: return { staff_id, name (dari staff_name), position, outlet, area, wa_number, role, status: "ACTIVE", created_at, updated_at }
  - Sheet: STAFF (atau sesuai nama sheet Anda)

[ ] 3. createArea
  - Accept: { name }
  - Simpan ke AREAS sheet
  - Return: { success: true, data: "area_name" }

[ ] 4. createCategory
  - Accept: { name }
  - Simpan ke CATEGORIES sheet
  - Return: { success: true, data: "category_name" }

[ ] 5. generateChecklistReport
  - Accept: { template_id }
  - Query CHECKLIST_TEMPLATE by template_id
  - Generate task_id dan checklist_token
  - Create row di CHECKLIST_REPORT sheet
  - Return: { success: true, data: { task: { task_id, checklist_token, checklist_link } } }
  - Kirim WhatsApp ke PIC
  - Sheet: CHECKLIST_TEMPLATE, CHECKLIST_REPORT

[ ] 6. loginUser
  - Accept: { username, password, admin_secret, api_key }
  - Query USERS sheet by username
  - Verify password
  - Return: { success: true, data: { staff_id, username, role, name, outlet } }
  - Sheet: USERS

[ ] 7. Fix checklist_mode bug (generateTaskFromTemplateIfNotExists_)
  - Ensure checklist_mode, checklist_token, checklist_link di-include dalam return object
  - Fix baris 261 logic jadi benar route ke sendChecklistTask vs sendNewTask
```

### Priority 2: IMPORTANT (Untuk dashboard & reporting)

```
[ ] 8. getChecklistReports
  - Accept: { outlet?, status? }
  - Query CHECKLIST_REPORT sheet
  - Support filtering
  - Return array dengan: task_id, checklist_template_id, outlet, pic_name, status, created_at, submitted_at

[ ] 9. getChecklistDetail
  - Accept: { task_id }
  - Query CHECKLIST_REPORT by task_id
  - Get nested CHECKLIST_REPORT_ITEM items
  - Return structured object dengan items array

[ ] 10. saveChecklistTemplate (action name, bukan saveChecklistItems)
  - Accept: { template_id, items: [...] }
  - Simpan/update ke CHECKLIST_ITEM sheet
  - Return array of saved items dengan checklist_item_id
```

### Priority 3: DATA CONSISTENCY (Untuk hindari parsing error)

```
[ ] 11. Konsisten field naming di semua response:
  - Staff sheet: gunakan `active_status` (jangan `is_active`)
  - Semua sheet: return `created_at` dan `updated_at` bukan `created_at` + `last_updated`
  - Template response: include semua field dari sheet, jangan partial
```

---

## TESTING CHECKLIST

Untuk setiap action, test dengan curl:

```bash
# createUser
curl -X POST "GAS_URL?action=createUser" \
  -d '{"staff_id":"STF-001","username":"budi","password":"pass123","role":"STAFF","admin_secret":"YOUR_SECRET"}'

# createStaff
curl -X POST "GAS_URL?action=createStaff" \
  -d '{"staff_name":"Budi","position":"Staff","outlet":"KBU","area":"Dapur","wa_number":"628xxx","role":"STAFF","is_active":"TRUE","admin_secret":"YOUR_SECRET"}'

# createArea
curl -X POST "GAS_URL?action=createArea" \
  -d '{"name":"Gudang","admin_secret":"YOUR_SECRET"}'

# generateChecklistReport
curl -X POST "GAS_URL?action=generateChecklistReport" \
  -d '{"template_id":"TPL-001","admin_secret":"YOUR_SECRET"}'

# loginUser
curl -X POST "GAS_URL?action=loginUser" \
  -d '{"username":"budi","password":"pass123","admin_secret":"YOUR_SECRET"}'
```

---

## NOTES UNTUK GAS DEVELOPER

1. **Sheet Structure**: Pastikan sudah punya sheets: STAFF, AREAS, CATEGORIES, USERS, CHECKLIST_TEMPLATE, CHECKLIST_ITEM, CHECKLIST_REPORT, CHECKLIST_REPORT_ITEM
2. **Unique ID Generation**: Gunakan consistent format: `STF-XXXXX`, `TPL-XXXXX`, `CHK-XXXXX`, `USR-XXXXX`
3. **Error Handling**: Selalu return `{ success: false, error: "message" }` jika ada error, jangan throw exception
4. **Performance**: Cache read operations seperti getStaff, getAreas, getCategories untuk response cepat
5. **Security**: 
   - Validate semua input
   - Hash password dengan bcrypt
   - Check admin_secret sebelum CRUD operations
   - Implement rate limiting untuk login
