import React from "react";
import { ProfessionalDashboard } from "@/components/ProfessionalDashboard";
import type { FullReport } from "@/contexts/HybridScannerContext";
import type { VideoMetadata } from "@/contexts/MetadataFetcherContext";

interface UniversalAuditReportProps {
  report: FullReport;
  metadata?: VideoMetadata;
  platform?: string;
  videoUrl?: string;
  isGuest?: boolean;
  onCopy?: () => void;
  onShare?: () => void;
  onRunDeepScan?: () => void;
}

export const UniversalAuditReport = ({
  report,
  metadata,
  platform = "YouTube",
  videoUrl,
  isGuest = false,
  onCopy,
  onShare,
  onRunDeepScan
}: UniversalAuditReportProps) => {
  // Use the new Professional Dashboard as the main render
  return (
    <ProfessionalDashboard
      report={report}
      metadata={metadata}
      platform={platform.toLowerCase()}
      videoUrl={videoUrl}
      isGuest={isGuest}
      onRunDeepScan={onRunDeepScan}
    />
  );
};

export default UniversalAuditReport;
