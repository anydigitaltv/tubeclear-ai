# VERCEL ENVIRONMENT VARIABLES SETUP GUIDE

## 📋 Required Environment Variables

Copy and paste these exact values into your Vercel Dashboard:

### Variable 1:
```
Name: VITE_SUPABASE_PROJECT_ID
Value: ltqfhujtjdmezldfscnx
Environment: [✓] Production  [✓] Preview  [✓] Development
```

### Variable 2:
```
Name: VITE_SUPABASE_ANON_KEY
Value: sb_publishable_KqIT9WCP9cCMrA1W76iXTw_R5RE-owA
Environment: [✓] Production  [✓] Preview  [✓] Development
```

### Variable 3:
```
Name: VITE_SUPABASE_URL
Value: https://ltqfhujtjdmezldfscnx.supabase.co
Environment: [✓] Production  [✓] Preview  [✓] Development
```

---

## 🚀 Step-by-Step Instructions

### Option A: Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Login with your GitHub account

2. **Select Your Project**
   - Click on `tube-clear-ai` project

3. **Open Environment Variables**
   - Click **Settings** tab at the top
   - Click **Environment Variables** in left sidebar

4. **Add Variables**
   - Click **"Add New"** button
   - Enter the Name (e.g., `VITE_SUPABASE_PROJECT_ID`)
   - Enter the Value (from above)
   - Select all 3 environments: Production, Preview, Development
   - Click **Save**
   - Repeat for all 3 variables

5. **Redeploy**
   - Go to **Deployments** tab
   - Find the latest deployment
   - Click the **three dots menu (⋮)**
   - Click **"Redeploy"**
   - Wait 2-3 minutes for deployment to complete

---

### Option B: Install Vercel CLI (Advanced)

If you want to use command line:

```powershell
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variables
vercel env add VITE_SUPABASE_PROJECT_ID production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_SUPABASE_URL production

# Repeat for preview and development
```

---

## ✅ Verification Checklist

After adding variables, verify:

- [ ] All 3 variables are added
- [ ] Values are correct (no extra spaces)
- [ ] All environments selected (Production, Preview, Development)
- [ ] Redeploy triggered
- [ ] Deployment successful (check Vercel logs)
- [ ] Live site working

---

## 🔍 Troubleshooting

### Issue: Site still not working after deploy

**Solution 1:** Check Vercel Build Logs
- Go to Deployments tab
- Click on latest deployment
- Check for errors in build logs

**Solution 2:** Verify Environment Variables
- Make sure variables are set for **Production** environment
- Redeploy after adding variables

**Solution 3:** Check Supabase Connection
- Open browser console (F12)
- Look for Supabase connection errors
- Verify URL and keys are correct

### Issue: "Cannot read properties of undefined"

This means environment variables are not loaded. Make sure:
- Variables start with `VITE_` prefix
- You redeployed after adding variables
- Variables are set for Production environment

---

## 🎯 Quick Copy-Paste Format

For easy copying:

```
VITE_SUPABASE_PROJECT_ID=ltqfhujtjdmezldfscnx
VITE_SUPABASE_ANON_KEY=sb_publishable_KqIT9WCP9cCMrA1W76iXTw_R5RE-owA
VITE_SUPABASE_URL=https://ltqfhujtjdmezldfscnx.supabase.co
```

---

## 📞 Need Help?

If you're stuck:
1. Take a screenshot of your Vercel Environment Variables page
2. Share the deployment error (if any)
3. I'll guide you through the fix!
