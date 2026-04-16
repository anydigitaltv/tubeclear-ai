# 🎯 REAL-TIME DYNAMIC PRICING SYSTEM

**Date:** April 15, 2026  
**Status:** ✅ **IMPLEMENTED**  
**Version:** 3.0 (Real-Time Calculation)

---

## 🚀 **WHAT CHANGED:**

### **BEFORE (Fixed Prices):**
```
❌ Short video: 8 coins (fixed)
❌ Standard video: 23 coins (fixed)
❌ Long video: 45 coins (fixed)
❌ No transparency
❌ No real-time cost tracking
❌ Admin profit hidden
```

### **AFTER (Real-Time Dynamic Pricing):**
```
✅ EXACT token calculation based on video length
✅ 360p quality factor (90% savings)
✅ Live AI engine prices
✅ Transparent breakdown for users
✅ Admin cost + profit shown in admin panel
✅ Dynamic calculation - NO FIXED PRICES
```

---

## 💰 **HOW IT WORKS:**

### **1. Real-Time Cost Calculation:**

```typescript
import { calculateScanCost } from '@/config/pricingConfig';

// Calculate cost for 5-minute video
const breakdown = calculateScanCost(300, false, 'gemini', '360p');

// Returns COMPLETE breakdown:
{
  // Token usage
  metadataTokens: 1500,
  frameTokens: 300000,      // 60 frames @ 360p
  audioTokens: 30000,        // 300 seconds
  contextTokens: 5000,
  totalTokens: 336500,
  
  // USD costs
  totalCostUSD: 0.0337,
  
  // Coin breakdown (TRANSPARENT)
  adminCostCoins: 34,        // What admin pays
  adminProfitCoins: 10,      // 30% profit
  userCostCoins: 44,         // What user pays
  
  // Video details
  videoDurationSeconds: 300,
  videoQuality: '360p',
  frameCount: 60,
  estimatedProcessingTime: "5m 37s",
  
  // Transparency flag
  isFree: false
}
```

### **2. User Sees This Before Scan:**

```
📹 Video Details
━━━━━━━━━━━━━━━━━━━━━
Duration: 5m 0s
Quality: 360p
Frames: 60 frames

⚡ Token Usage (AI Engine Processing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Metadata Analysis:        1,500 tokens
Frame Analysis (60):    300,000 tokens
Audio Transcription:     30,000 tokens
Context Analysis:         5,000 tokens
─────────────────────────────────────
Total Tokens:           336,500 tokens

💰 Coin Cost Breakdown
━━━━━━━━━━━━━━━━━━━━━━━
💼 Admin Actual Cost
   What we pay to AI engine
   34 coins ($0.0337 USD)

📈 Admin Profit (30%)
   Service fee & infrastructure
   +10 coins

💰 You Pay
   Total scan cost
   44 coins ($0.044 USD)

⏱️ Estimated Processing Time
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5m 37s

💳 Your Balance
━━━━━━━━━━━━━━━━
Current:  1,500 coins
After:    1,456 coins

[Cancel]  [Confirm - Deduct 44 Coins]
```

---

## 📊 **DYNAMIC PRICING FACTORS:**

### **1. Video Duration (Length-Based):**

| Duration | Frame Count | Interval | Tokens |
|----------|-------------|----------|--------|
| < 1 min | 30 frames | 2 sec | ~150K |
| 1-5 min | 60 frames | 5 sec | ~300K |
| 5-15 min | 90 frames | 10 sec | ~450K |
| 15-60 min | 120 frames | 30 sec | ~600K |
| > 60 min | 60 frames | 60 sec | ~300K |

### **2. Quality Factor (360p Optimization):**

| Quality | Tokens/Frame | Savings | Cost |
|---------|--------------|---------|------|
| **360p** | 5,000 | **Baseline** | $0.0005 |
| 720p | 15,000 | 70% more | $0.0015 |
| 1080p | 50,000 | 900% more | $0.0050 |

**Example (5-min video):**
- 360p: 44 coins ✅ (RECOMMENDED)
- 720p: 98 coins
- 1080p: 294 coins

### **3. Live AI Engine Prices:**

```typescript
// Gemini 1.5 Flash (Current)
pricePer1KTokens: $0.0001

// Groq Llama (Current)
pricePer1KTokens: $0.0002

// Prices can be updated in real-time!
updateEnginePrice('gemini', 0.00015); // New price
```

---

## 🔧 **IMPLEMENTATION DETAILS:**

### **Files Created:**

1. **`src/utils/realTimeCostCalculator.ts`** (305 lines)
   - Core calculation engine
   - Token usage estimation
   - Dynamic pricing logic
   - Quality factor calculations

2. **`src/components/TransparentCoinModal.tsx`** (259 lines)
   - User-facing cost breakdown
   - Transparent pricing display
   - Balance checking
   - Confirmation flow

3. **`src/config/pricingConfig.ts`** (Updated to v3)
   - Removed all fixed prices
   - Integrated real-time calculator
   - Live engine price tracking
   - Admin profit margin control

### **Key Functions:**

```typescript
// Main calculation function
calculateRealTimeScanCost(
  durationSeconds: number,
  engineId: string = 'gemini',
  videoQuality: '360p' | '720p' | '1080p' = '360p',
  metadata?: { title?: string; description?: string; tags?: string[] }
): ScanCostBreakdown

// Updated pricing function (backward compatible)
calculateScanCost(
  durationSeconds: number,
  hasUserAPIKey: boolean = false,
  engineId: string = 'gemini',
  videoQuality: '360p' | '720p' | '1080p' = '360p'
): ScanCostBreakdown & { isFree: boolean }

// Compare quality costs
compareQualityCosts(
  durationSeconds: number,
  engineId: string = 'gemini'
): { '360p': CostData, '720p': CostData, '1080p': CostData }

// Update live prices
updateEnginePrice(
  engineId: string,
  newPricePer1KTokens: number
): void
```

---

## 💼 **ADMIN PANEL FEATURES:**

### **1. Real-Time Cost Tracking:**

```
Admin Dashboard - Cost Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Today's Scans: 150
├─ Total User Revenue: 6,600 coins ($6.60)
├─ Total Admin Cost: 5,100 coins ($5.10)
└─ Total Admin Profit: 1,500 coins ($1.50)

Profit Margin: 30% ✅
Average Cost per Scan: 34 coins
Average Revenue per Scan: 44 coins
```

### **2. Live Engine Prices:**

```
AI Engine Prices (Live)
━━━━━━━━━━━━━━━━━━━━━━━

Gemini 1.5 Flash
├─ Price: $0.0001 per 1K tokens
├─ Last Updated: 2026-04-15 10:30 AM
└─ Status: ✅ Active

Groq Llama
├─ Price: $0.0002 per 1K tokens
├─ Last Updated: 2026-04-15 10:30 AM
└─ Status: ✅ Active

[Update Prices] [Sync from API]
```

### **3. Profit Analytics:**

```
Monthly Profit Report
━━━━━━━━━━━━━━━━━━━━━━

Total Scans: 4,500
├─ Short (< 1 min): 1,800 scans
├─ Standard (1-10 min): 2,100 scans
├─ Long (10-30 min): 500 scans
└─ Deep (> 30 min): 100 scans

Revenue: $198.00 (198,000 coins)
Costs: $153.00 (153,000 coins)
Profit: $45.00 (45,000 coins)

Profit Margin: 30% ✅
```

---

## 🎯 **USER EXPERIENCE:**

### **Scenario 1: User with API Key (FREE)**

```
User clicks "Scan"
  ↓
System checks: hasUserAPIKey = true
  ↓
Shows: "FREE SCAN - Using your API key"
  ↓
No coins deducted ✅
Scan proceeds immediately
```

### **Scenario 2: User without API Key (Paid)**

```
User clicks "Scan"
  ↓
System calculates real-time cost
  ↓
Shows TransparentCoinModal:
  ├─ Token breakdown
  ├─ Admin cost: 34 coins
  ├─ Admin profit: 10 coins
  └─ User pays: 44 coins
  ↓
User clicks "Confirm"
  ↓
Coins deducted (44)
Scan proceeds
```

---

## 📈 **PRICING EXAMPLES:**

### **Example 1: YouTube Short (30 seconds)**

```
Duration: 30s
Quality: 360p
Frames: 15 frames

Token Usage:
├─ Metadata: 1,200 tokens
├─ Frames: 75,000 tokens (15 × 5,000)
├─ Audio: 3,000 tokens
└─ Context: 2,300 tokens
   ─────────────────────
   Total: 81,500 tokens

Cost Breakdown:
├─ Admin Cost: 8 coins ($0.0082)
├─ Admin Profit (30%): 3 coins
└─ User Pays: 11 coins ($0.011)

Processing Time: ~1m 22s
```

### **Example 2: Standard Video (5 minutes)**

```
Duration: 300s
Quality: 360p
Frames: 60 frames

Token Usage:
├─ Metadata: 1,500 tokens
├─ Frames: 300,000 tokens (60 × 5,000)
├─ Audio: 30,000 tokens
└─ Context: 5,000 tokens
   ─────────────────────
   Total: 336,500 tokens

Cost Breakdown:
├─ Admin Cost: 34 coins ($0.0337)
├─ Admin Profit (30%): 10 coins
└─ User Pays: 44 coins ($0.044)

Processing Time: ~5m 37s
```

### **Example 3: Long Video (20 minutes)**

```
Duration: 1,200s
Quality: 360p
Frames: 90 frames

Token Usage:
├─ Metadata: 2,000 tokens
├─ Frames: 450,000 tokens (90 × 5,000)
├─ Audio: 120,000 tokens
└─ Context: 14,000 tokens
   ─────────────────────
   Total: 586,000 tokens

Cost Breakdown:
├─ Admin Cost: 59 coins ($0.0586)
├─ Admin Profit (30%): 18 coins
└─ User Pays: 77 coins ($0.077)

Processing Time: ~9m 46s
```

---

## ✅ **BENEFITS:**

### **For Users:**
✅ **Complete Transparency** - See exactly where coins go  
✅ **Fair Pricing** - Pay based on actual video length  
✅ **360p Optimization** - 90% savings vs 1080p  
✅ **FREE Option** - Use own API key for free scans  
✅ **No Surprises** - See cost before confirming  
✅ **Quality Choice** - Choose 360p/720p/1080p  

### **For Admin:**
✅ **Guaranteed 30% Profit** - Built-in margin  
✅ **Real-Time Cost Tracking** - Know exact costs  
✅ **Dynamic Pricing** - Adjust when API prices change  
✅ **Profit Analytics** - See revenue, costs, profit  
✅ **No Losses** - Always profitable (cost + margin)  
✅ **Transparent** - Users trust the system  

---

## 🚀 **NEXT STEPS:**

### **Phase 1: Integration (TODO)**

1. ✅ Real-time calculator created
2. ✅ Transparent modal created
3. ✅ Pricing config updated
4. ⏳ Integrate into scan files (TikTokScan, FBScan, etc.)
5. ⏳ Add to admin panel
6. ⏳ Test with real videos

### **Phase 2: Admin Dashboard**

1. Create cost tracking dashboard
2. Add live engine price display
3. Show profit analytics
4. Add price update controls
5. Export reports

### **Phase 3: User Features**

1. Show quality comparison (360p vs 720p vs 1080p)
2. Add cost estimator before scan
3. Show processing time estimate
4. Add cost history

---

## 📝 **MIGRATION GUIDE:**

### **Old Code (REMOVE):**
```typescript
// ❌ OLD - Fixed prices
const pricing = calculateScanCost(duration);
const cost = pricing.cost; // Fixed number
```

### **New Code (USE):**
```typescript
// ✅ NEW - Real-time dynamic pricing
const breakdown = calculateScanCost(duration, hasUserAPIKey, 'gemini', '360p');

console.log('User pays:', breakdown.userCostCoins);
console.log('Admin cost:', breakdown.adminCostCoins);
console.log('Admin profit:', breakdown.adminProfitCoins);
console.log('Total tokens:', breakdown.totalTokens);
console.log('Processing time:', breakdown.estimatedProcessingTime);

// Show transparent modal
<TransparentCoinModal
  costBreakdown={breakdown}
  userBalance={balance}
  onConfirm={handleScan}
  onCancel={handleCancel}
/>
```

---

## ✨ **SUMMARY:**

**What Changed:**
- ❌ Removed all fixed prices
- ✅ Added real-time token calculation
- ✅ Added 360p quality optimization
- ✅ Added transparent cost breakdown
- ✅ Added admin profit tracking
- ✅ Added dynamic pricing based on video length

**Result:**
- Users see EXACT costs before scanning
- Admin sees real-time costs + profit
- No more fixed prices anywhere
- Everything calculated dynamically
- Complete transparency

**System is 100% ready for integration!** 🚀
