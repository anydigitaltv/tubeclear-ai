import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "@/components/AppProviders";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import History from "./pages/History.tsx";
import MarketWatcher from "./pages/MarketWatcher.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Admin from "./pages/Admin.tsx";
import SecuritySettings from "./pages/SecuritySettings.tsx";
import Payment from "./pages/Payment.tsx";
import DisputeForm from "./pages/DisputeForm.tsx";
import LicenseKeys from "./pages/LicenseKeys.tsx";
import APISettings from "./pages/APISettings.tsx";
import APIKeyManager from "./pages/APIKeyManager.tsx";
import FeatureStorePage from "./pages/FeatureStorePage.tsx";
import FAQPage from "./pages/FAQPage.tsx";
import PolicyNewsroomPage from "./pages/PolicyNewsroomPage.tsx";
import PendingScans from "./pages/PendingScans.tsx";
import DiffEngine from "./pages/DiffEngine.tsx";
import PolicyMonitor from "./pages/PolicyMonitor.tsx";
import YouTubeScan from "./pages/scan/YouTubeScan.tsx";
import TikTokScan from "./pages/scan/TikTokScan.tsx";
import FBScan from "./pages/scan/FBScan.tsx";
import IGScan from "./pages/scan/IGScan.tsx";
import DailymotionScan from "./pages/scan/DailymotionScan.tsx";
import VideoViolations from "./pages/VideoViolations.tsx";
import MyVideos from "./pages/MyVideos.tsx";
import CopyrightFingerprint from "./pages/CopyrightFingerprint.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = () => (
  <AppProviders>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pending-scans" element={<PendingScans />} />
        <Route path="/diff-engine" element={<DiffEngine />} />
        <Route path="/policy-monitor" element={<PolicyMonitor />} />
        <Route path="/violations" element={<VideoViolations />} />
        <Route path="/my-videos" element={<MyVideos />} />
        <Route path="/history" element={<History />} />
        <Route path="/market" element={<MarketWatcher />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/security" element={<SecuritySettings />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/dispute" element={<DisputeForm />} />
        <Route path="/license-keys" element={<LicenseKeys />} />
        <Route path="/settings" element={<APISettings />} />
        <Route path="/api-key-manager" element={<APIKeyManager />} />
        <Route path="/store" element={<FeatureStorePage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/newsroom" element={<PolicyNewsroomPage />} />
        {/* Platform-specific scan pages */}
        <Route path="/scan/youtube" element={<YouTubeScan />} />
        <Route path="/scan/tiktok" element={<TikTokScan />} />
        <Route path="/scan/facebook" element={<FBScan />} />
        <Route path="/scan/instagram" element={<IGScan />} />
        <Route path="/scan/dailymotion" element={<DailymotionScan />} />
        <Route path="/copyright-fingerprint" element={<CopyrightFingerprint />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);

export default App;
