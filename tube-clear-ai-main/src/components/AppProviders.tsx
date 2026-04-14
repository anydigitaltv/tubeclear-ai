import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CoinProvider } from "@/contexts/CoinContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GlobalMarketProvider } from "@/contexts/GlobalMarketContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
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
import { PaymentProvider } from "@/contexts/PaymentContext";
import { DisputeProvider } from "@/contexts/DisputeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { MasterAdminProvider } from "@/contexts/MasterAdminContext";
import { AuditDoctorProvider } from "@/contexts/AuditDoctorContext";
import { SecureVaultProvider } from "@/contexts/SecureVaultContext";
import { MetadataFetcherProvider } from "@/contexts/MetadataFetcherContext";
import { PolicyWatcherProvider } from "@/contexts/PolicyWatcherContext";
import { PolicySyncProvider } from "@/contexts/PolicySyncContext";
import { HybridScannerProvider } from "@/contexts/HybridScannerContext";
import { LicenseKeyProvider } from "@/contexts/LicenseKeyContext";
import { LivePolicyEngineProvider } from "@/contexts/LivePolicyEngineContext";

const queryClient = new QueryClient();

/**
 * AppProviders - Single component that wraps the entire app with all providers
 * 
 * Provider hierarchy (by dependency):
 * Level 0: QueryClient, Tooltip (no dependencies)
 * Level 1: Auth (base authentication)
 * Level 2: Coin, Notification (depend on Auth)
 * Level 3: GlobalMarket (depends on Auth + Coin + Notification)
 * Level 4: All other providers (depend on Level 0-3)
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LicenseKeyProvider>
            <LivePolicyEngineProvider>
              <CoinProvider>
            <NotificationProvider>
              <GlobalMarketProvider>
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
                                        <PaymentProvider>
                                          <DisputeProvider>
                                            <CurrencyProvider>
                                              <MasterAdminProvider>
                                                <AuditDoctorProvider>
                                                  <SecureVaultProvider>
                                                    <MetadataFetcherProvider>
                                                      <PolicyWatcherProvider>
                                                        <PolicySyncProvider>
                                                          <HybridScannerProvider>
                                                            {children}
                                                          </HybridScannerProvider>
                                                        </PolicySyncProvider>
                                                      </PolicyWatcherProvider>
                                                    </MetadataFetcherProvider>
                                                  </SecureVaultProvider>
                                                </AuditDoctorProvider>
                                              </MasterAdminProvider>
                                            </CurrencyProvider>
                                          </DisputeProvider>
                                        </PaymentProvider>
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
              </GlobalMarketProvider>
            </NotificationProvider>
          </CoinProvider>
            </LivePolicyEngineProvider>
          </LicenseKeyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
