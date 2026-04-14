import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface PDFReportData {
  title: string;
  url: string;
  thumbnail: string;
  platform: string;
  verdict: "PASS" | "FLAGGED" | "FAIL";
  fixRoadmap: string[];
  issues: any[];
  engine: string;
  policyCompliance?: Array<{
    rule: string;
    status: "PASS" | "FAIL";
    insight: string;
  }>;
  duration?: string;
  scanDate?: string;
}

/**
 * Professional PDF Report Generator for TubeClear AI
 * Includes Thumbnail, Fix Roadmap, and Bilingual Insights
 */
export const generateAuditPDF = async (data: PDFReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Header Section
  doc.setFillColor(30, 41, 59); // Slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("TubeClear AI - Audit Report", 15, 25);
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), "PPP p")}`, pageWidth - 15, 25, { align: "right" });

  // 2. Video Thumbnail & Basic Info
  let currentY = 50;
  
  try {
    // Adding Thumbnail Image
    if (data.thumbnail) {
      // Note: In a real browser env, you might need to proxy the image or use base64
      // to avoid CORS issues with jspdf
      doc.addImage(data.thumbnail, 'JPEG', 15, currentY, 50, 28);
    }
  } catch (e) {
    doc.rect(15, currentY, 50, 28);
    doc.text("No Thumbnail", 25, currentY + 15);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.title.substring(0, 60) + (data.title.length > 60 ? "..." : ""), 70, currentY + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Platform: ${data.platform.toUpperCase()}`, 70, currentY + 12);
  doc.text(`URL: ${data.url.substring(0, 50)}...`, 70, currentY + 18);
  doc.text(`AI Engine: ${data.engine}`, 70, currentY + 24);

  currentY += 40;

  // 3. Verdict Section (No Score - Only Verdict)
  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Final Verdict:", 15, currentY);
  
  const verdictColor = data.verdict === "PASS" ? [34, 197, 94] : data.verdict === "FLAGGED" ? [234, 179, 8] : [239, 68, 68];
  doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.setFontSize(16);
  doc.text(data.verdict, 50, currentY);
  
  // Additional info
  currentY += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  if (data.duration) {
    doc.text(`Video Duration: ${data.duration}`, 15, currentY);
    currentY += 6;
  }
  if (data.scanDate) {
    doc.text(`Scan Date: ${data.scanDate}`, 15, currentY);
    currentY += 6;
  }
  doc.text(`AI Engine Used: ${data.engine}`, 15, currentY);

  currentY += 15;

  // 4. Fix Roadmap (Step-by-Step Guide)
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.text("Fix Roadmap (Actionable Steps)", 15, currentY);
  currentY += 7;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  
  if (data.fixRoadmap && data.fixRoadmap.length > 0) {
    data.fixRoadmap.forEach((step, index) => {
      const stepText = `${index + 1}. ${step}`;
      const splitStep = doc.splitTextToSize(stepText, pageWidth - 30);
      doc.text(splitStep, 15, currentY);
      currentY += (splitStep.length * 5) + 2;
    });
  } else {
    doc.text("No specific fixes required. Content is safe.", 15, currentY);
    currentY += 10;
  }

  currentY += 5;

  // 5. Policy Compliance Grid (Like Dashboard)
  if (data.policyCompliance && data.policyCompliance.length > 0) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Policy Compliance Grid", 15, currentY);
    currentY += 7;
    
    const passCount = data.policyCompliance.filter(p => p.status === "PASS").length;
    const failCount = data.policyCompliance.filter(p => p.status === "FAIL").length;
    const totalCount = data.policyCompliance.length;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${totalCount} policies checked • ${passCount} PASS • ${failCount} FAIL`, 15, currentY);
    currentY += 7;
    
    // Policy Compliance Table
    autoTable(doc, {
      startY: currentY,
      head: [['Status', 'Policy Rule', 'Insight']],
      body: data.policyCompliance.map(policy => [
        policy.status,
        policy.rule,
        policy.insight
      ]),
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', width: 20 },
        1: { width: 60 },
        2: { width: 90 }
      },
      didParseCell: function(data) {
        // Color code PASS/FAIL
        if (data.section === 'body' && data.column.index === 0) {
          if (data.cell.raw === 'PASS') {
            data.cell.styles.textColor = [34, 197, 94];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 6. Detailed Violations Table (Only if there are violations)
  if (data.issues && data.issues.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Status', 'Policy Violation', 'Urdu Explanation (Wazahat)']],
      body: data.issues.map(issue => [
        "FAIL",
        issue.description || "Policy Breach",
        issue.urduExplanation || "Review karein aur policy ke mutabiq theek karein."
      ]),
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', width: 20 },
        1: { width: 60 },
        2: { width: 90 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.textColor = [239, 68, 68];
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 }
    });
  }

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("This report is generated by TubeClear AI. Always review official platform policies.", pageWidth / 2, finalY, { align: "center" });
  doc.text("© 2026 TubeClear AI Compliance Engine", pageWidth / 2, finalY + 5, { align: "center" });

  // Save PDF
  doc.save(`TubeClear_Report_${data.platform}_${Date.now()}.pdf`);
};