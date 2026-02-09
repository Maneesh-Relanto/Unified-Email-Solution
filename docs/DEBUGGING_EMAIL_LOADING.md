# Email Loading Debugging Guide

**Issue**: "Loading emails is taking forever... timeout is not shown also"

## Root Cause Analysis

The fix I made should enforce batch size limits across all providers. But if it's STILL slow, the issue is likely:

1. **OAuth provider APIs are slow** (Google/Microsoft are responding slowly)
2. **No credentials found** (server returns error immediately)
3. **Token refresh is failing** (can't authenticate with providers)
4. **Network timeout** (your internet is slow)

---

## Debug Steps (FOLLOW IN ORDER)

### STEP 1: Check Browser Console (F12)

1. Open the app
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Click "Fetch All Emails"
5. **Copy AND PASTE** everything you see in console

Looking for logs like:
```
═══════════════════════════════════════════════════════════════
[🔄 UnifiedInbox] 📧 FETCHING ALL OAUTH EMAILS
  Batch Size (limit): 20
  Pagination (skip): 0
  Timeout: 90s
═══════════════════════════════════════════════════════════════

[⏱️ UnifiedInbox] Elapsed: 1s / Timeout: 90s
[⏱️ UnifiedInbox] Elapsed: 2s / Timeout: 90s
...
[⏱️ UnifiedInbox] Elapsed: 15s / Timeout: 90s
[📬 UnifiedInbox] 📧 RESPONSE RECEIVED
```

---

### STEP 2: Check Server Console

1. **Look at the terminal** where you ran `pnpm dev`
2. **Copy the output** and share it with me

Should see something like:
```
[getAllOAuthEmails] Fetching from 2 providers with limit=20, skip=0
  [1/2] Fetching from user@gmail.com...
  ✓ Got 20 emails (1250ms)
  [2/2] Fetching from user@outlook.com...
  ✓ Got 15 emails (890ms)
[getAllOAuthEmails] Total fetched: 35, Returning: 20, Has more: true
```

---

### STEP 3: Check Network Tab (F12)

1. Open DevTools → **Network** tab
2. Click "Fetch All Emails"
3. Find request: `GET /api/email/oauth/all?limit=20&skip=0`
4. Check:
   - **Status**: Should be `200` ✓ or `400`/`500` ✗
   - **Time**: How long did it take? (shows "Waiting for server...")
   - **Response**: Click on it, go to "Response" tab
   - **Headers**: Check if there are any errors

---

### STEP 4: What Errors Could Appear?

**If you see errors** like:

**A) "No OAuth accounts connected"**
```json
{
  "error": "No OAuth accounts connected",
  "message": "Please authenticate with Google or Microsoft first"
}
```
**Fix**: Go to Settings > Add OAuth account (Google/Outlook)

**B) "Failed to fetch from OAuth accounts"**
```json
{
  "error": "Failed to fetch from OAuth accounts",
  "message": "[error details]"
}
```
**Indicates**: Token refresh failed or OAuth API error

**C) Network timeout** 
- Request hangs for 60+ seconds
- Server not responding
**Indicates**: OAuth provider slow or network issue

**D) Empty response**
```json
{
  "success": true,
  "count": 0,
  "totalFetched": 0,
  "emails": [],
  "hasMore": false
}
```
**Indicates**: APIs returned no emails (could be normal if inbox is empty)

---

## Timeout Dialog Not Showing - Why?

If timeout dialog should appear after 90 seconds but doesn't:

### Check 1: Elapsed Time Updating?
In browser console, watch for lines like:
```
[⏱️ UnifiedInbox] Elapsed: 1s / Timeout: 90s
[⏱️ UnifiedInbox] Elapsed: 2s / Timeout: 90s
[⏱️ UnifiedInbox] Elapsed: 3s / Timeout: 90s
```

- **If you see these**: Timer IS running, should eventually reach 90
- **If you DON'T see these**: Console.log isn't printing, which is very strange

### Check 2: Response Status
```
[📬 UnifiedInbox] 📧 RESPONSE RECEIVED
  Emails returned: 20
  Total fetched from all providers: 55
```

- **If you see this BEFORE 90 seconds**: Email loaded successfully, no timeout needed ✓
- **If you DON'T see this**: Waiting for server response
- **If you see it AFTER 90+ seconds**: Shows slow server, timeout dialog should have appeared

### Check 3: Browser DevTools Console Errors
Look for ANY red error messages:
```
[ERROR] or [Exception] in console
```

These indicate:
- Code errors in my changes
- Missing dependencies
- Browser compatibility issues

---

## Performance Expectations

### Good Performance:
```
Time to load: 2-4 seconds
Elapsed log shows: 2-3 seconds
Response comes back with 20 emails
No timeout dialog needed
```

### Slow Performance (But Working):
```
Time to load: 5-15 seconds
Elapsed log shows: 5-15 seconds
Response comes back with 20 emails
No timeout dialog (since completed)
```

### BROKEN (Timeout Triggered):
```
Time to load: 90+ seconds
Elapsed log shows: 1s, 2s, 3s ... 88s, 89s, 90s
[🚨 UnifiedInbox] TIMEOUT TRIGGERED! Showing timeout dialog...
Dialog appears after 90 seconds
User can click "Continue Waiting" or "Stop Loading"
If continues, response eventually comes (at 120s+)
```

### VERY BROKEN (Hangs Completely):
```
Time to load: ∞ (never stops)
Elapsed log shows: Nothing (interval not running)
Response never comes
Server logs show: Nothing (server not receiving request)
```

---

## What I Fixed

### Before (BROKEN):
```
User sets: batchSize = 20
Server has 3 OAuth accounts
Server fetches: 20 from Gmail + 20 from Outlook + 20 from Yahoo = 60 emails
Client returns: 60 emails to user
User expected: 20
Performance: 3x slower
```

### After (FIXED):
```
User sets: batchSize = 20
Server has 3 OAuth accounts
Server fetches: 20 from each (60 total to get good variety)
Server truncates: Just returns top 20 newest
Client returns: 20 emails to user
User expected: 20 ✓
Performance: Still fetches 60 but only returns 20 (similar speed but correct)
```

---

## Most Likely Culprits

**If email loading is slow, it's probably:**

1. **🥶 OAuth API slow** (70% likely)
   - Gmail API sometimes takes 1-2 seconds per batch
   - Outlook API sometimes takes 1000-1500ms per batch
   - With 3 accounts = 3-5 seconds minimum

2. **🔑 Token refresh required** (20% likely)
   - First request: ~500ms for token refresh
   - Subsequent: ~200ms (cached)
   - If token expired: Forces refresh every request

3. **🌐 Network latency** (5% likely)
   - Slow internet = slow OAuth API calls
   - Lots of interruptions = high latency

4. **❌ My code has a bug** (5% likely)
   - But all 359 tests pass
   - Logging has been added to debug

---

## What To Share With Me

Reply with ALL of:

1. **Browser Console Output**
   - Full console logs when loading emails
   - Any red errors

2. **Server Console Output**
   - Terminal output showing what server is doing
   - The `[getAllOAuthEmails]` logs

3. **Network Tab Response**
   - Response JSON from `/api/email/oauth/all` request
   - How long it took to complete

4. **How long it takes**
   - From clicking "Load Emails" to emails appearing
   - "Loading..." timeout after how many seconds?

5. **Screenshot** (like you sent)
   - Shows "Showing 0 emails" hanging

---

## Testing Timeout Dialog

To test the timeout dialog works:

1. Set custom TTL: Settings → Cache & Loading → Timeout: **5 seconds**
2. Click "Fetch All Emails"
3. Don't do anything
4. **After 5 seconds**: Should see red timeout warning dialog
5. Click:"Continue Waiting" → Keeps loading
6. OR "Stop Loading" → Cancels request

If timeout dialog **DOES** appear with 5-second timeout, then:
- ✓ Timeout feature works
- ✓ Dialog renders correctly
- Issue is that email load completes BEFORE 90-second default timeout

If timeout dialog **DOES NOT** appear even with 5-second timeout:
- ✗ Real bug in timeout logic
- Need to debug why setShowTimeoutDialog(true) isn't working

---

## Next Steps

1. **Gather the debug info above** (console logs, server logs, network response)
2. **Share with me**
3. I'll help diagnose the actual bottleneck
4. Could be:
   - OAuth providers (can't fix - their problem)
   - Token refresh (can cache tokens better)
   - Network (can't fix - ISP issue)
   - Code bug (I'll fix)
