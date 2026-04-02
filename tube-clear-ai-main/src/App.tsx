import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { CoinProvider } from "@/contexts/CoinContext";
import { VideoProvider } from "@/contexts/VideoContext";
import { FeatureStoreProvider } from "@/contexts/FeatureStoreContext";
import { AIEngineProvider } from "@/contexts/AIEngineContext";
import { VideoScanProvider } from "@/contexts/VideoScanContext";
import { PolicyRulesProvider } from "@/contexts/PolicyRulesContext";
import { GhostGuardProvider } from "@/contexts/GhostGuardContext";
import { ContentChangeTrackerProvider } from "@/contexts/ContentChangeTrackerContext";
import { DynamicComplianceProvider } from "@/contexts/DynamicComplianceContext";
import { AIDoctorProvider } from "@/contexts/AIDoctorContext";
import { GuestModeProvider } from "@/contexts/GuestModeContext";
import { EncryptionProvider } from "@/contexts/EncryptionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PaymentProvider } from "@/contexts/PaymentContext";
import { DisputeProvider } from "@/contexts/DisputeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { MasterAdminProvider } from "@/contexts/MasterAdminContext";
import { AuditDoctorProvider } from "@/contexts/AuditDoctorContext";
import { SecureVaultProvider } from "@/contexts/SecureVaultContext";
// CRITICAL: Add missing contexts for Universal Audit Report
import { MetadataFetcherProvider } from "@/contexts/MetadataFetcherContext";
import { PolicyWatcherProvider } from "@/contexts/PolicyWatcherContext";
import { HybridScannerProvider } from "@/contexts/HybridScannerContext";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Admin from "./pages/Admin.tsx";
import SecuritySettings from "./pages/SecuritySettings.tsx";
import Payment from "./pages/Payment.tsx";
import DisputeForm from "./pages/DisputeForm.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CoinProvider>
          <PlatformProvider>
            <VideoProvider>
              <AIEngineProvider>
                <FeatureStoreProvider>
                  <VideoScanProvider>
                    <PolicyRulesProvider>
                      <GhostGuardProvider>
                        <ContentChangeTrackerProvider>
                          <DynamicComplianceProvider>
                            <AIDoctorProvider>
                              <GuestModeProvider>
                                <EncryptionProvider>
                                  <NotificationProvider>
                                    <PaymentProvider>
                                      <DisputeProvider>
                                        <CurrencyProvider>
                                          <MasterAdminProvider>
                                            <AuditDoctorProvider>
                                              <SecureVaultProvider>
                                                {/* CRITICAL: Universal Audit Report Contexts */}
                                                <MetadataFetcherProvider>
                                                  <PolicyWatcherProvider>
                                                    <HybridScannerProvider>
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
                                                    </HybridScannerProvider>
                                                  </PolicyWatcherProvider>
                                                </MetadataFetcherProvider>
                                              </SecureVaultProvider>
                                            </AuditDoctorProvider>
                                          </MasterAdminProvider>
                                        </CurrencyProvider>
                                      </DisputeProvider>
                                    </PaymentProvider>
                                  </NotificationProvider>
                                </EncryptionProvider>
                              </GuestModeProvider>
                            </AIDoctorProvider>
                          </DynamicComplianceProvider>
                        </ContentChangeTrackerProvider>
                      </GhostGuardProvider>
                    </PolicyRulesProvider>
                  </VideoScanProvider>
                </FeatureStoreProvider>
              </AIEngineProvider>
            </VideoProvider>
          </PlatformProvider>
        </CoinProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
