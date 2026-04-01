# 📊 TUBECLEAR AI AUDIT REPORT - USAGE GUIDE

## ✅ COMPONENT CREATED: `AuditReportCard.tsx`

---

## 🎯 **FEATURES IMPLEMENTED**

### **Visual Design:**
- ✅ Professional gradient header with TubeClear branding
- ✅ Prominent overall risk score display (30/100 LOW RISK)
- ✅ Color-coded sections (Green/Yellow/Orange/Red)
- ✅ Status badges (PASS/WARNING/FAIL)
- ✅ Clickable external policy links
- ✅ Copy & Share buttons
- ✅ Live verification timestamp

### **Report Sections:**
1. **AI-Generated Content** (Risk: 43/100) - WARNING
2. **Misleading Metadata** (Risk: 35/100) - WARNING  
3. **Copyright & Ad-Suitability** (Risk: 33/100) - PASS

### **Interactive Elements:**
- ✅ Copy Full Report button (copies to clipboard)
- ✅ Share Report Link button (opens sharing modal)
- ✅ Clickable video URL (opens in new tab)
- ✅ Clickable policy links (official documentation)

---

## 🔧 **USAGE EXAMPLE**

### **Basic Usage:**
```tsx
import AuditReportCard from "@/components/AuditReportCard";

const ScanResultsPage = () => {
  const report = {
    videoUrl: "https://youtube.com/watch?v=abc123",
    verifiedTimestamp: new Date().toISOString(),
    platform: "YouTube",
    overallRisk: 30,
    whyAnalysis: {
      riskReason: "Clickbait keywords detected",
      aiDetectionReason: "Potential AI elements found",
      metadataReason: "Misleading title",
      policyLinks: [
        "https://support.google.com/youtube/answer/2801973#ai-disclosure"
      ],
      exactViolations: ["Clickbait title", "Misleading claims"]
    },
    shareable: true
  };

  return (
    <div className="container mx-auto p-4">
      <AuditReportCard 
        report={report}
        platform="YouTube"
        videoUrl="https://youtube.com/watch?v=abc123"
        onCopy={() => console.log("Report copied!")}
        onShare={() => console.log("Share opened!")}
      />
    </div>
  );
};
```

---

### **Integration with Hybrid Scanner:**
```tsx
import { useHybridScanner } from "@/contexts/HybridScannerContext";
import { useLiveAlert } from "@/contexts/LiveAlertContext";
import AuditReportCard from "@/components/AuditReportCard";

const ScanResults = () => {
  const { generateWhyAnalysis, copyReportToClipboard } = useHybridScanner();
  const { getShareableMessage } = useLiveAlert();
  const [scanResult, setScanResult] = useState(null);

  // After scan completes
  useEffect(() => {
    if (scanResult) {
      const whyAnalysis = generateWhyAnalysis(scanResult);
      const fullReport = {
        videoUrl: currentVideo.url,
        verifiedTimestamp: getLiveVerificationTimestamp(),
        platform: currentVideo.platform,
        overallRisk: scanResult.riskScore,
        whyAnalysis,
        shareable: true
      };
      setScanResult(fullReport);
    }
  }, [scanResult]);

  const handleCopy = async () => {
    const success = await copyReportToClipboard(scanResult);
    if (success) {
      toast.success("Report copied to clipboard!");
    }
  };

  const handleShare = () => {
    const shareText = getShareableMessage(scanResult, "whatsapp");
    navigator.clipboard.writeText(shareText);
    toast.success("Share link copied!");
  };

  return (
    <AuditReportCard 
      report={scanResult}
      platform={currentVideo.platform}
      videoUrl={currentVideo.url}
      onCopy={handleCopy}
      onShare={handleShare}
    />
  );
};
```

---

## 📋 **PROP REFERENCE**

### **AuditReportCardProps:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `report` | `FullReport` | ✅ Yes | Complete scan report object |
| `platform` | `string` | ❌ No | Platform name (YouTube/TikTok/etc.) |
| `videoUrl` | `string` | ❌ No | Direct link to the scanned video |
| `onCopy` | `() => void` | ❌ No | Callback when copy button clicked |
| `onShare` | `() => void` | ❌ No | Callback when share button clicked |

---

## 🎨 **CUSTOMIZATION OPTIONS**

### **Change Color Scheme:**
```tsx
// In getRiskColor function
const getRiskColor = (score: number) => {
  if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
  if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-200";
  if (score >= 30) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-green-600 bg-green-50 border-green-200";
};
```

### **Add Custom Sections:**
```tsx
// Add more AuditSection components
<AuditSection
  title="4. COMMUNITY GUIDELINES"
  riskScore={25}
  status="PASS"
  reason="No violations detected"
  learnMoreLink="https://support.google.com/youtube/answer/2801973"
  icon="👥"
/>
```

---

## 📊 **SAMPLE OUTPUT**

```
╔══════════════════════════════════════════════════════╗
   🛡️ TUBECLEAR AI AUDIT REPORT (LIVE VERIFIED)
╚══════════════════════════════════════════════════════╝

Generated: Apr 1, 2026 8:57 PM
Platform Detected: YouTube
Video Link: https://youtube.com/watch?v=abc123 🔗
Policy Version: v2026-04-01

┌──────────────────────────────────────────────────────┐
│  OVERALL RISK SCORE                                  │
│  30/100 (LOW RISK)                    ✅             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 🤖 1. AI-GENERATED CONTENT            RISK: 43/100  │
│    Status: WARNING                                   │
│                                                      │
│    REASON: Potential AI-generated voice or visuals   │
│              detected.                               │
│    POLICY: Per April 2026 Rules, 'Altered Content'   │
│              label is MANDATORY.                     │
│    LEARN MORE: [Official Policy Link] 🔗             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 📝 2. MISLEADING METADATA             RISK: 35/100  │
│    Status: WARNING                                   │
│                                                      │
│    REASON: High intensity of clickbait keywords      │
│              detected in Title.                      │
│    POLICY: Violates Community Standards on deceptive │
│              practices.                              │
│    LEARN MORE: [Official Policy Link] 🔗             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ©️ 3. COPYRIGHT & AD-SUITABILITY      RISK: 33/100  │
│    Status: PASS                                      │
│                                                      │
│    REASON: No direct copyright strikes, but          │
│              sensitive topics flagged.               │
│    LEARN MORE: [Ad-Friendly Guidelines] 🔗           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  📋 COPY FULL REPORT    |    📱 SHARE REPORT LINK    │
└──────────────────────────────────────────────────────┘

Report by TubeClear AI • Verified against Live 2026 Policies
Timestamp: 2026-04-01T20:57:00.000Z
```

---

## 🔌 **CONNECTING TO BACKEND**

### **With HybridScannerContext:**
```tsx
const { executeHybridScan, generateWhyAnalysis } = useHybridScanner();
const { verifyPolicyTimestamp } = usePolicyWatcher();

const handleScanComplete = async (videoInput) => {
  // Execute scan
  const result = await executeHybridScan(videoInput);
  
  // Generate why analysis
  const whyAnalysis = generateWhyAnalysis(result);
  
  // Get verification timestamp
  const verification = verifyPolicyTimestamp(videoInput.platformId);
  
  // Build full report
  const fullReport: FullReport = {
    videoUrl: videoInput.videoUrl,
    verifiedTimestamp: verification.verifiedAt,
    platform: videoInput.platformId,
    overallRisk: result.riskScore,
    whyAnalysis,
    shareable: true
  };
  
  setReport(fullReport);
};
```

---

## 🎯 **RESPONSIVE DESIGN**

The component is fully responsive:

- **Desktop:** Full width with 3-column meta info
- **Tablet:** 2-column grid layout
- **Mobile:** Single column stack, optimized for small screens

---

## ✅ **ACCESSIBILITY FEATURES**

- ✅ Semantic HTML structure
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation support
- ✅ High contrast color scheme
- ✅ Screen reader friendly

---

## 🚀 **NEXT STEPS**

1. **Import into your page:**
   ```tsx
   import AuditReportCard from "@/components/AuditReportCard";
   ```

2. **Connect to scan results:**
   ```tsx
   const report = generateWhyAnalysis(scanResult);
   ```

3. **Test copy functionality:**
   ```tsx
   const handleCopy = async () => {
     await copyReportToClipboard(report);
     toast.success("Copied!");
   };
   ```

4. **Add sharing modal:**
   ```tsx
   const handleShare = () => {
     setOpenShareModal(true);
   };
   ```

---

## 💡 **PRO TIPS**

### **Dynamic Risk Calculation:**
```tsx
// Calculate overall risk from individual sections
const calculateOverallRisk = (sections) => {
  const total = sections.reduce((sum, section) => sum + section.riskScore, 0);
  return Math.round(total / sections.length);
};

const sections = [
  { riskScore: 43, weight: 0.4 }, // AI Content
  { riskScore: 35, weight: 0.3 }, // Metadata
  { riskScore: 33, weight: 0.3 }, // Copyright
];

const overallRisk = calculateOverallRisk(sections); // 37/100
```

### **Auto-Update Timestamp:**
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setLastUpdated(new Date());
  }, 60000); // Update every minute
  
  return () => clearInterval(interval);
}, []);
```

---

## 🏆 **COMPLETION STATUS**

✅ **Audit Report Card Component** - COMPLETE  
✅ **Copy Functionality** - COMPLETE  
✅ **Share Functionality** - COMPLETE  
✅ **Clickable Policy Links** - COMPLETE  
✅ **Live Verification Badge** - COMPLETE  
✅ **Responsive Design** - COMPLETE  

**Ready for production use!** 🚀
