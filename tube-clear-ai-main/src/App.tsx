import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "@/components/AppProviders";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Admin from "./pages/Admin.tsx";
import SecuritySettings from "./pages/SecuritySettings.tsx";
import Payment from "./pages/Payment.tsx";
import DisputeForm from "./pages/DisputeForm.tsx";
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
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/security" element={<SecuritySettings />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/dispute" element={<DisputeForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);

export default App;
