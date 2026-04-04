# 🔐 SUPABASE AUTH CONFIGURATION GUIDE

**Configuration Date:** April 2, 2026  
**Supabase Project:** `ltqfhujtjdmezldfscnx`  
**Status:** ✅ **CONFIGURED**

---

## 📋 **SUPABASE CREDENTIALS**

### **Updated .env File:**

```env
VITE_SUPABASE_PROJECT_ID="ltqfhujtjdmezldfscnx"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ACTUAL_ANON_KEY_HERE"
VITE_SUPABASE_URL="https://ltqfhujtjdmezldfscnx.supabase.co"
```

---

## ⚠️ **IMPORTANT: GET YOUR ACTUAL SUPABASE KEY**

The `.env` file currently has a placeholder key. You need to replace it with your actual Supabase anon/publishable key.

### **How to Get Your Key:**

1. Go to: https://supabase.com/dashboard/project/ltqfhujtjdmezldfscnx
2. Navigate to: **Settings** → **API**
3. Copy the **anon public** key (also called publishable key)
4. Replace `YOUR_ACTUAL_ANON_KEY_HERE` in `.env` with your actual key

**Example:**
```env
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0cWZodWp0amRtZXpsZGZzY254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTQ2MjEsImV4cCI6MjA5MDMzMDYyMX0.ACTUAL_KEY_FROM_SUPABASE_DASHBOARD"
```

---

## 🔗 **AUTH CALLBACK URL CONFIGURATION**

### **OAuth Flow:**

```
User clicks "Sign In with Google"
    ↓
App redirects to Supabase OAuth endpoint
    ↓
Supabase handles Google authentication
    ↓
Google redirects back to Supabase callback:
    https://ltqfhujtjdmezldfscnx.supabase.co/auth/v1/callback
    ↓
Supabase processes tokens and redirects to your app:
    https://your-app.com/auth/callback
    ↓
AuthCallback page exchanges tokens for session
    ↓
Redirects to dashboard: /dashboard ✅
```

---

## ⚙️ **SUPABASE DASHBOARD SETUP**

### **Step 1: Configure Redirect URLs**

1. Go to: https://supabase.com/dashboard/project/ltqfhujtjdmezldfscnx
2. Navigate to: **Authentication** → **URL Configuration**
3. Add these redirect URLs:

**For Development:**
```
http://localhost:8080/auth/callback
http://localhost:8080
```

**For Production (Vercel):**
```
https://tubeclear-ai.vercel.app/auth/callback
https://tubeclear-ai.vercel.app
```

4. Click **"Save"**

---

### **Step 2: Enable Google OAuth Provider**

1. Go to: **Authentication** → **Providers**
2. Find **Google** in the list
3. Click to enable it
4. Configure:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
   - **Authorized redirect URIs**: Must include the Supabase callback URL
   
5. Click **"Save"**

---

### **Step 3: Verify Site URL**

1. Go to: **Authentication** → **URL Configuration**
2. Check **Site URL** is set to your production URL:
   ```
   https://tubeclear-ai.vercel.app
   ```
3. This is where Supabase redirects after successful authentication

---

## 📝 **CODE CONFIGURATION**

### **AuthContext.tsx - Already Configured ✅**

The authentication logic is already set up correctly:

```typescript
const signInWithGoogle = async () => {
  try {
    // Clear any existing broken session first
    await supabase.auth.signOut();
    
    // Use app's auth callback page
    const redirectUri = `${window.location.origin}/auth/callback`;
    
    console.log('Initiating Google OAuth with redirect:', redirectUri);
    console.log('Supabase will handle callback at:', 
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`);
    
    // Use standard Supabase signInWithOAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
      },
    });
    
    if (error) {
      console.error('OAuth error:', error);
      throw new Error(error.message || 'OAuth authentication failed');
    }
    
    console.log('OAuth redirect initiated', data);
  } catch (err) {
    console.error('Login failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    alert(`Login failed: ${errorMessage}. Please check your internet connection and try again.`);
  }
};
```

**Key Points:**
- ✅ Uses `window.location.origin` for dynamic redirect URL
- ✅ Works in both development and production
- ✅ Proper error handling
- ✅ Logs Supabase callback URL for debugging

---

### **AuthCallback.tsx - Redirect Logic ✅**

After successful authentication, users are redirected to the dashboard:

```typescript
// Line 52-54: After token exchange
console.log('AuthCallback: Session created successfully, redirecting to dashboard');
navigate("/dashboard");

// Line 66-68: If session already exists
console.log('AuthCallback: Existing session found, redirecting to dashboard');
navigate("/dashboard");
```

**Redirect Flow:**
1. User authenticates with Google
2. Supabase redirects to `/auth/callback`
3. AuthCallback exchanges tokens for session
4. **Redirects to `/dashboard`** ✅

---

## 🧪 **TESTING THE CONFIGURATION**

### **Test 1: Local Development**

```bash
# 1. Update .env with your actual Supabase key
# 2. Restart dev server
npm run dev

# 3. Open browser: http://localhost:8080
# 4. Click "Sign In with Google"
# 5. Complete Google authentication
# 6. Should redirect to: http://localhost:8080/auth/callback
# 7. Then redirect to: http://localhost:8080/dashboard ✅
```

**Expected Console Output:**
```
Initiating Google OAuth with redirect: http://localhost:8080/auth/callback
Supabase will handle callback at: https://ltqfhujtjdmezldfscnx.supabase.co/auth/v1/callback
OAuth redirect initiated
AuthCallback: Processing authentication...
AuthCallback: Exchange tokens for session...
AuthCallback: Session created successfully, redirecting to dashboard
Auth state changed: SIGNED_IN
```

---

### **Test 2: Production (Vercel)**

```bash
# 1. Deploy to Vercel
git push origin main

# 2. Wait for deployment
# 3. Visit: https://tubeclear-ai.vercel.app
# 4. Click "Sign In with Google"
# 5. Complete authentication
# 6. Should redirect to: https://tubeclear-ai.vercel.app/auth/callback
# 7. Then redirect to: https://tubeclear-ai.vercel.app/dashboard ✅
```

---

## 🔍 **TROUBLESHOOTING**

### **Error: "Invalid API key"**

**Cause:** Wrong or missing Supabase publishable key

**Fix:**
1. Get correct key from Supabase Dashboard → Settings → API
2. Update `.env` file
3. Restart dev server: `npm run dev`
4. For Vercel: Update environment variables in Vercel dashboard

---

### **Error: "Redirect URI mismatch"**

**Cause:** Redirect URL not configured in Supabase

**Fix:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your redirect URLs (see Step 1 above)
3. Save changes
4. Wait 1 minute
5. Try login again

---

### **Error: "Provider not enabled"**

**Cause:** Google OAuth not enabled in Supabase

**Fix:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Configure Client ID and Client Secret
4. Save changes
5. Try login again

---

### **White Screen After Login**

**Cause:** AuthCallback not redirecting properly

**Fix:**
1. Check browser console for errors
2. Verify `/auth/callback` route exists in App.tsx
3. Ensure AuthCallback component imports correctly
4. Check network tab for failed requests

---

## 📊 **CURRENT CONFIGURATION SUMMARY**

| Setting | Value | Status |
|---------|-------|--------|
| **Supabase URL** | `https://ltqfhujtjdmezldfscnx.supabase.co` | ✅ Updated |
| **Project ID** | `ltqfhujtjdmezldfscnx` | ✅ Updated |
| **Publishable Key** | `YOUR_ACTUAL_ANON_KEY_HERE` | ⚠️ **NEEDS UPDATE** |
| **Callback URL** | `/auth/callback` | ✅ Configured |
| **Post-Login Redirect** | `/dashboard` | ✅ Configured |
| **OAuth Provider** | Google | ⚠️ **NEEDS ENABLED** |
| **Redirect URLs** | localhost + Vercel | ⚠️ **NEEDS ADDED** |

---

## ✅ **ACTION ITEMS**

### **Required (Do Now):**

1. ⚠️ **Get your actual Supabase anon key** from dashboard
2. ⚠️ **Update `.env` file** with the real key
3. ⚠️ **Add redirect URLs** in Supabase dashboard
4. ⚠️ **Enable Google OAuth** provider in Supabase
5. ⚠️ **Configure Google Client ID/Secret** in Supabase

### **Optional (Recommended):**

6. ✅ Test login flow locally
7. ✅ Deploy to Vercel
8. ✅ Test login flow in production
9. ✅ Verify dashboard redirect works

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Before Deploying to Vercel:**

- [ ] `.env` file has correct Supabase credentials
- [ ] Redirect URLs added in Supabase dashboard
- [ ] Google OAuth enabled and configured
- [ ] Tested locally and working

### **After Deploying to Vercel:**

- [ ] Add environment variables in Vercel dashboard:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`
- [ ] Redeploy application
- [ ] Test login on production URL
- [ ] Verify redirect to dashboard works

---

## 📞 **SUPABASE DASHBOARD LINKS**

- **Project Dashboard:** https://supabase.com/dashboard/project/ltqfhujtjdmezldfscnx
- **Authentication Settings:** https://supabase.com/dashboard/project/ltqfhujtjdmezldfscnx/auth/settings
- **API Keys:** https://supabase.com/dashboard/project/ltqfhujtjdmezldfscnx/settings/api
- **Providers:** https://supabase.com/dashboard/project/ltqfhujtjdmezldfscnx/auth/providers

---

## 🎯 **QUICK START**

### **1. Update .env:**
```bash
# Open .env file
# Replace YOUR_ACTUAL_ANON_KEY_HERE with your real key from Supabase dashboard
```

### **2. Configure Supabase:**
```bash
# Go to Supabase dashboard
# Add redirect URLs
# Enable Google OAuth
# Configure Google credentials
```

### **3. Test Locally:**
```bash
npm run dev
# Visit http://localhost:8080
# Click "Sign In with Google"
# Verify redirect to dashboard
```

### **4. Deploy:**
```bash
git add .
git commit -m "Update Supabase configuration to new project"
git push origin main
# Update Vercel environment variables
# Test on production
```

---

**Document Created:** April 2, 2026  
**Supabase Project:** ltqfhujtjdmezldfscnx  
**Status:** ⚠️ **REQUIRES MANUAL CONFIGURATION IN SUPABASE DASHBOARD**
