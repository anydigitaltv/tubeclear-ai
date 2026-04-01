import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useGlobalMarket } from "./GlobalMarketContext";
import { useNotifications } from "./NotificationContext";

interface LiveAlertContextType {
  language: string;
  setLanguage: (lang: string) => void;
  sendMultilingualAlert: (alert: MultilingualAlert) => void;
  formatLiveReport: (report: any) => string;
  getShareableMessage: (report: any, platform: string) => string;
}

export interface MultilingualAlert {
  title: string;
  message: string;
  riskLevel: number;
  videoUrl: string;
  timestamp: string;
}

const ALERT_TEMPLATES: Record<string, Record<string, string>> = {
  en: {
    complete: "Bhai, scan complete! Verified with Live 2026 Rules. Risk: {risk}. Details: {link}",
    low_risk: "✅ Great! Your content is compliant with latest policies.",
    medium_risk: "⚠️ Some concerns found. Review recommendations.",
    high_risk: "🚨 High risk detected! Immediate action required.",
    ai_detected: "🤖 AI elements detected. Disclosure label required per 2026 policy.",
  },
  hi: {
    complete: "Bhai, scan complete! Verified with Live 2026 Rules. Risk: {risk}. Details: {link}",
    low_risk: "✅ Badhiya! Aapka content latest policies ke saath compliant hai.",
    medium_risk: "⚠️ Kuch concerns mile hain. Recommendations review karein.",
    high_risk: "🚨 High risk detect hua! Turant action lein.",
    ai_detected: "🤖 AI elements detect hue. 2026 policy ke hisaab se disclosure label zaroori hai.",
  },
  ur: {
    complete: "Bhai, scan complete! Verified with Live 2026 Rules. Risk: {risk}. Details: {link}",
    low_risk: "✅ Shabash! Aapka content latest policies ke mutabiq hai.",
    medium_risk: "⚠️ Kuch issues mile hain. Baraye meherbani recommendations dekhein.",
    high_risk: "🚨 High risk mila! Fauri karwai zaroori hai.",
    ai_detected: "🤖 AI elements paye gaye. 2026 policy ke tehet disclosure label lazmi hai.",
  },
  es: {
    complete: "¡Hermano, escaneo completo! Verificado con Reglas 2026 en vivo. Riesgo: {risk}. Detalles: {link}",
    low_risk: "✅ ¡Genial! Tu contenido cumple con las últimas políticas.",
    medium_risk: "⚠️ Se encontraron algunas preocupaciones. Revisa las recomendaciones.",
    high_risk: "🚨 ¡Alto riesgo detectado! Se requiere acción inmediata.",
    ai_detected: "🤖 Elementos de IA detectados. Se requiere etiqueta de divulgación según la política de 2026.",
  },
  ar: {
    complete: "أخي، اكتمل الفحص! تم التحقق من قواعد 2026 المباشرة. المخاطرة: {risk}. التفاصيل: {link}",
    low_risk: "✅ رائع! محتواك متوافق مع أحدث السياسات.",
    medium_risk: "⚠️ تم العثور على بعض المخاوف. راجع التوصيات.",
    high_risk: "🚨 تم اكتشاف خطر عالي! مطلوب عمل فوري.",
    ai_detected: "🤖 تم اكتشاف عناصر الذكاء الاصطناعي. مطلوب ملصق إفصاح وفقًا لسياسة 2026.",
  },
};

const LiveAlertContext = createContext<LiveAlertContextType | undefined>(undefined);

export const LiveAlertProvider = ({ children }: { children: ReactNode }) => {
  const { userLocation } = useGlobalMarket();
  const { addNotification } = useNotifications();
  
  const [language, setLanguageState] = useState<string>(() => {
    // Detect from browser or user preference
    const stored = localStorage.getItem('tubeclear_language');
    if (stored) return stored;
    
    const browserLang = navigator.language.split('-')[0];
    return ['en', 'hi', 'ur', 'es', 'ar'].includes(browserLang) ? browserLang : 'en';
  });

  const setLanguage = useCallback((lang: string) => {
    localStorage.setItem('tubeclear_language', lang);
    setLanguageState(lang);
  }, []);

  // Send multilingual SMS/notification
  const sendMultilingualAlert = useCallback((alert: MultilingualAlert) => {
    const templates = ALERT_TEMPLATES[language] || ALERT_TEMPLATES.en;
    
    // Determine risk level message
    let riskMessage = templates.low_risk;
    if (alert.riskLevel > 70) {
      riskMessage = templates.high_risk;
    } else if (alert.riskLevel > 30) {
      riskMessage = templates.medium_risk;
    }
    
    // Format complete message
    const completeMessage = templates.complete
      .replace('{risk}', alert.riskLevel.toString())
      .replace('{link}', alert.videoUrl);
    
    // Create notification
    addNotification({
      type: alert.riskLevel > 50 ? "warning" : "success",
      title: alert.title,
      message: `${riskMessage}\n\n${completeMessage}`,
    });
    
    console.log(`[${language.toUpperCase()}] Alert sent:`, {
      title: alert.title,
      risk: alert.riskLevel,
      url: alert.videoUrl,
    });
    
    // In production, send actual SMS via gateway
    // await fetch(SMS_GATEWAY_URL, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     to: userPhoneNumber,
    //     message: completeMessage,
    //     language,
    //   }),
    // });
  }, [language, userLocation, addNotification]);

  // Format live report with verification timestamp
  const formatLiveReport = useCallback((report: any): string => {
    const verifiedAt = new Date(report.verifiedTimestamp).toLocaleString();
    const platform = report.platform.charAt(0).toUpperCase() + report.platform.slice(1);
    
    return `
╔═══════════════════════════════════════════╗
   TUBECLEAR AI - LIVE POLICY SCAN REPORT
╚═══════════════════════════════════════════╝

📹 VIDEO INFORMATION
───────────────────────────────────────
Platform: ${platform}
Verified: ${verifiedAt}
Video URL: ${report.videoUrl}

⚠️ RISK ASSESSMENT
───────────────────────────────────────
Overall Risk: ${report.overallRisk}/100
Risk Level: ${getRiskLevel(report.overallRisk)}

📊 DETAILED ANALYSIS
───────────────────────────────────────
${formatAnalysis(report.whyAnalysis)}

🔗 OFFICIAL POLICY REFERENCES
───────────────────────────────────────
${report.whyAnalysis.policyLinks.map((link: string) => `• ${link}`).join('\n')}

❌ SPECIFIC VIOLATIONS
───────────────────────────────────────
${report.whyAnalysis.exactViolations.map((v: string) => `• ${v}`).join('\n')}

───────────────────────────────────────
Generated by TubeClear AI
${new Date().toLocaleString()}
═══════════════════════════════════════════
    `.trim();
  }, []);

  // Get shareable message for social media
  const getShareableMessage = useCallback((report: any, platform: string): string => {
    const riskEmoji = report.overallRisk > 70 ? '🚨' : report.overallRisk > 30 ? '⚠️' : '✅';
    const shortLink = report.videoUrl.length > 30 
      ? report.videoUrl.substring(0, 30) + '...' 
      : report.videoUrl;
    
    const messages: Record<string, string> = {
      whatsapp: `
${riskEmoji} *TubeClear AI Scan Report* ${riskEmoji}

${getRiskLevel(report.overallRisk)} Risk Detected: ${report.overallRisk}/100

📹 Video: ${shortLink}
✅ Verified: ${new Date(report.verifiedTimestamp).toLocaleString()}

${report.whyAnalysis.riskReason}

🔗 Full Policy Links:
${report.whyAnalysis.policyLinks[0] || 'N/A'}

_Scan your videos free at TubeClear AI_
      `.trim(),
      
      tiktok: `
${riskEmoji} Tubeclear AI found ${getRiskLevel(report.overallRisk).toLowerCase()} risk (${report.overallRisk}/100) in this video!

Check if YOUR content is safe 👇
${report.videoUrl}

#TubeClear #ContentCreator #YouTubeTips #AIScan
      `.trim(),
      
      twitter: `
${riskEmoji} Just scanned with @TubeClearAI

Risk Level: ${getRiskLevel(report.overallRisk)} (${report.overallRisk}/100)
Verified: ${new Date(report.verifiedTimestamp).toLocaleDateString()}

Policy violations found: ${report.whyAnalysis.exactViolations.length}

Scan yours: tubeclear-ai.vercel.app
      `.trim(),
    };
    
    return messages[platform] || messages.whatsapp;
  }, []);

  // Helper functions
  function getRiskLevel(score: number): string {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    if (score >= 10) return 'LOW';
    return 'MINIMAL';
  }

  function formatAnalysis(analysis: any): string {
    let text = '';
    
    if (analysis.riskReason) {
      text += `Primary Concern:\n${analysis.riskReason}\n\n`;
    }
    
    if (analysis.aiDetectionReason) {
      text += `🤖 AI Detection:\n${analysis.aiDetectionReason}\n\n`;
    }
    
    if (analysis.metadataReason) {
      text += `📝 Metadata Analysis:\n${analysis.metadataReason}\n\n`;
    }
    
    return text.trim();
  }

  return (
    <LiveAlertContext.Provider
      value={{
        language,
        setLanguage,
        sendMultilingualAlert,
        formatLiveReport,
        getShareableMessage,
      }}
    >
      {children}
    </LiveAlertContext.Provider>
  );
};

export const useLiveAlert = () => {
  const ctx = useContext(LiveAlertContext);
  if (!ctx) throw new Error("useLiveAlert must be used within LiveAlertProvider");
  return ctx;
};
