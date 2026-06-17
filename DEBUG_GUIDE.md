# Debugging Guide: Task Input and Submission Issues

## Issues Fixed

### 1. **Task Status Field Bug** ✓ FIXED
- **File**: `app/tasks/[taskId]/page.tsx` line 515
- **Issue**: Using `task.task_status` instead of `task.status` for reminder button condition
- **Fix**: Changed to use correct `task.status` field
- **Impact**: Reminder button now appears correctly for OPEN/LATE tasks

## Common Issues and Solutions

### Issue: "Tugas Tidak Ditemukan" (Task Not Found) on Report Page

**Symptom**: Staff clicking on WhatsApp link gets "Link tugas tidak valid atau token salah"

**Causes**:
1. Task ID and token mismatch in URL
2. Task doesn't exist in GAS database
3. Token was invalidated or regenerated

**Solutions**:
- Verify task was created successfully in GAS
- Check that task token matches in both GAS and frontend URL
- Test with a newly created task

### Issue: Photo Upload Not Working

**Symptom**: Photo uploader showing "Gagal membaca foto" or stuck processing

**Causes**:
1. File size > 5MB (before compression)
2. Invalid image format (must be image/*)
3. Canvas compression failing (fallback to original)
4. CORS issues with cross-origin images

**Solutions**:
- Ensure image is < 5MB before upload
- Use device camera or valid image format
- Check browser console for CORS errors
- Try re-taking photo if compression fails

### Issue: "Foto terlalu besar untuk dikirim" (Photo Too Large)

**Symptom**: Submit button gives error "Foto terlalu besar untuk dikirim"

**Causes**:
1. Compressed image still > body limit (~4.5MB for Vercel)
2. Multiple large photos in form
3. Photo compression not working properly

**Solutions**:
- Image compression automatically reduces to 1280px max
- JPEG quality set to 0.7 to minimize size
- If still too large, try lower quality images
- Check `dataUrlByteSize()` in console: `console.log("[v0] Photo size:", dataUrlByteSize(base64))`

### Issue: Form Input Lag or Freezing

**Symptom**: Photo uploader becomes unresponsive after selecting image

**Causes**:
1. Large image taking time to compress
2. Browser busy with canvas operations
3. Memory issues on older devices

**Solutions**:
- Wait for processing spinner to complete (shows "Memproses foto...")
- Ensure phone has sufficient free memory
- Try with smaller/lower-resolution photo
- Clear browser cache if persistent

### Issue: Submit Button Disabled or Greyed Out

**Symptom**: "UPLOAD FOTO DULU" button won't enable

**Causes**:
1. Photo not yet uploaded/selected
2. Photo upload failed silently
3. Form state not updating

**Solutions**:
- Ensure photo is selected and preview shows "Foto siap"
- Check browser console for errors
- Try selecting photo again
- Refresh page and retry

### Issue: "Gagal mengirim. Periksa koneksi internet"

**Symptom**: Submit fails with connection error

**Causes**:
1. No internet connection
2. GAS endpoint unreachable
3. Server error (500, 413, etc.)

**Solutions**:
- Check internet connection
- Try again in a few moments
- Check if photo size is acceptable (< 4.5MB)
- Contact leader if persists

## Testing the Complete Workflow

### Step 1: Create a Test Task
1. Login to dashboard as admin
2. Click "Tugas Baru" → "Buat tugas manual"
3. Fill form with:
   - Outlet: KBU
   - Area: outdoor tengah
   - Task: DAILY CLOSING BAR
   - PIC: Select a staff member
   - Deadline: 16/06/2026 23:00 WIB
   - Description: Test task
   - Photo: Upload a small test image
4. Click "Buat Tugas"

### Step 2: Get Report Link
1. Click on task to view details
2. Scroll to find report link (should be in task data or message sent to staff via WhatsApp)
3. Copy link in format: `/report/TASK-XXXXXXX?token=xxxxx`

### Step 3: Test Staff Form
1. Open report link in browser (or share to staff phone)
2. Should see task deadline banner
3. Task instructions visible in collapsible section
4. Click "KETUK UNTUK AMBIL FOTO" to upload photo
5. Photo should show preview with "Foto siap" checkmark
6. Add optional note if desired
7. Click "KIRIM LAPORAN" button
8. Should see success screen

### Step 4: Verify Submission
1. Return to dashboard
2. Check task status changed to SUBMITTED
3. View task detail to see submitted photo
4. Click "Setujui" or "Minta Revisi"

## Console Debugging

Add these to browser console while testing:

```javascript
// Check photo size
console.log("[v0] Photo size:", dataUrlByteSize(base64))

// Check API response
console.log("[v0] API Response:", response)

// Check task data
console.log("[v0] Task data:", task)
```

## Environment Variables to Check

Ensure these are set in `.env.development.local`:
```
GAS_WEB_APP_URL=https://script.google.com/macros/s/...
ADMIN_PASSWORD=@Tukgumer123
```

## Recent Fixes Applied

1. **Time Period Filtering** - Dashboard now shows Hari Ini/Minggu Ini/Bulan Ini filters
2. **Task Status Field** - Fixed incorrect `task_status` reference in task detail page
3. **Error Handling** - Improved error messages for photo upload failures

## Testing Commands

```bash
# Check if server is running
curl http://localhost:3000

# View dev server logs
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```
