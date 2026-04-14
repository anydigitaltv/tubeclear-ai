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
import FeatureStorePage from "./pages/FeatureStorePage.tsx";
import FAQPage from "./pages/FAQPage.tsx";
import PolicyNewsroomPage from "./pages/PolicyNewsroomPage.tsx";
import PendingScans from "./pages/PendingScans.tsx";
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
        <Route path="/history" element={<History />} />
        <Route path="/market" element={<MarketWatcher />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/security" element={<SecuritySettings />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/dispute" element={<DisputeForm />} />
        <Route path="/license-keys" element={<LicenseKeys />} />
        <Route path="/settings" element={<APISettings />} />
        <Route path="/store" element={<FeatureStorePage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/newsroom" element={<PolicyNewsroomPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);

export default App;
