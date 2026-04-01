import type { AuditResult } from "@/components/AuditDashboard";

export function generateMockAudit(url: string): AuditResult {
  const isChannel = url.includes("/@") || url.includes("/channel/") || url.includes("/c/");
  const title = isChannel ? "Channel Overview Analysis" : "Video Content Audit";
  const channel = isChannel ? url.split("/").pop() || "Unknown Channel" : "Scanned Creator";

  const reusedScore = Math.floor(Math.random() * 40) + 5;
  const aiScore = Math.floor(Math.random() * 50) + 10;
  const metaScore = Math.floor(Math.random() * 35) + 5;
  const copyrightScore = Math.floor(Math.random() * 45) + 5;
  const overall = Math.round((reusedScore + aiScore + metaScore + copyrightScore) / 4);

  const status = (s: number) => (s <= 25 ? "pass" : s <= 50 ? "warning" : "fail") as "pass" | "warning" | "fail";

  return {
    videoTitle: title,
    channelName: channel,
    overallRisk: overall,
    checks: [
      {
        id: "reused",
        label: "Reused & Repetitious Content",
        status: status(reusedScore),
        score: reusedScore,
        detail: reusedScore <= 25
          ? "No significant content reuse detected across recent uploads."
          : "Some patterns of repetitive content structure found. Consider diversifying formats.",
      },
      {
        id: "ai_content",
        label: "AI-Generated Content Detection",
        status: status(aiScore),
        score: aiScore,
        detail: aiScore <= 25
          ? "Content appears to be primarily human-created with proper disclosures."
          : "Potential AI-generated voice or visuals detected. Ensure proper labeling per 2026 policy.",
      },
      {
        id: "metadata",
        label: "Misleading Metadata Analysis",
        status: status(metaScore),
        score: metaScore,
        detail: metaScore <= 25
          ? "Titles, descriptions, and tags accurately represent content."
          : "Some metadata may be flagged as clickbait or keyword-stuffed.",
      },
      {
        id: "copyright",
        label: "Copyright & Ad-Suitability",
        status: status(copyrightScore),
        score: copyrightScore,
        detail: copyrightScore <= 25
          ? "No copyright risks detected. Content is ad-friendly."
          : "Potential copyrighted material or sensitive topic flags detected.",
      },
    ],
  };
}
