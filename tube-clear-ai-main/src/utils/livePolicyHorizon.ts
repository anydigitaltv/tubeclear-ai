/**
 * Live Policy Horizon - AI-Powered Real-Time Policy Search
 * Instructs AI to always search for most recent platform policy updates
 */

import { CURRENT_YEAR, getShortMonthYear } from './dynamicDate';

// Dynamic policy search prompt for AI engines
export const generateLivePolicySearchPrompt = (platformId: string): string => {
  const currentDate = new Date().toISOString();
  
  return `IMPORTANT: Search for the MOST RECENT ${platformId.toUpperCase()} platform policy updates relative to ${currentDate}.
  
CRITICAL INSTRUCTIONS:
1. ALWAYS prioritize the latest policy documents, guidelines, and announcements
2. Ignore outdated policies - focus on current ${CURRENT_YEAR} standards
3. Check official ${platformId} Creator Academy, Help Center, and Policy blogs
4. Look for "Last updated" or "Effective date" timestamps
5. If multiple versions exist, use the MOST RECENT one
6. Note any upcoming changes with future effective dates

SEARCH PRIORITIES:
- Monetization policies (ads, sponsorships, creator funds)
- Content guidelines (community standards, copyright)
- AI disclosure requirements (altered content labels)
- Branded content rules (paid partnerships)
- Platform-specific features (Reels, Shorts, TikTok videos)

Report findings with EXACT policy names, effective dates, and official source URLs.`;
};

// AI engine configuration for live horizon search
export const getAIEngineConfig = (engineId: string) => {
  const configs: Record<string, { maxTokens: number; temperature: number; systemPrompt: string }> = {
    gemini: {
      maxTokens: 8192,
      temperature: 0.3, // Lower for factual accuracy
      systemPrompt: `You are a policy research specialist analyzing ${CURRENT_YEAR} platform guidelines. 
ALWAYS search for the most recent information available. Cite sources with dates.`
    },
    groq: {
      maxTokens: 4096,
      temperature: 0.2, // Very low for precision
      systemPrompt: `Fast policy lookup for ${CURRENT_YEAR} standards. Prioritize recency and accuracy.`
    },
    grok: {
      maxTokens: 4096,
      temperature: 0.3,
      systemPrompt: `Real-time social media policy analysis. Check latest ${CURRENT_YEAR} updates from official sources.`
    },
    openai: {
      maxTokens: 8192,
      temperature: 0.2,
      systemPrompt: `Comprehensive policy research with emphasis on current ${CURRENT_YEAR} guidelines. Verify dates.`
    },
    claude: {
      maxTokens: 8192,
      temperature: 0.2,
      systemPrompt: `Detailed policy analysis with temporal awareness. Focus on ${CURRENT_YEAR} standards and upcoming changes.`
    },
    qwen: {
      maxTokens: 4096,
      temperature: 0.3,
      systemPrompt: `Multi-platform policy tracking for ${CURRENT_YEAR}. Emphasize recent updates.`
    }
  };
  
  return configs[engineId] || configs.gemini;
};

// Policy freshness checker
export const isPolicyFresh = (effectiveDate: string): boolean => {
  const date = new Date(effectiveDate);
  const now = new Date();
  const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
  
  return date > sixMonthsAgo;
};

// Generate policy update query with time horizon
export const generatePolicyUpdateQuery = (platformId: string, category?: string): string => {
  const baseQuery = `${platformId} platform policy update ${CURRENT_YEAR}`;
  const categoryPart = category ? ` ${category} guidelines` : '';
  
  return `${baseQuery}${categoryPart} official announcement last 6 months`;
};

// Extract date from policy text using multiple formats
export const extractPolicyDate = (text: string): Date | null => {
  const datePatterns = [
    /(?:last|updated|effective)\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1] || match[0];
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
};

// Calculate policy horizon score (0-100)
export const calculatePolicyHorizonScore = (effectiveDate: string): number => {
  const date = new Date(effectiveDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Perfect: Updated within last month
  if (diffDays < 30) return 100;
  
  // Good: Updated within last 6 months
  if (diffDays < 180) return 80;
  
  // Acceptable: Updated within last year
  if (diffDays < 365) return 60;
  
  // Outdated: Over a year old
  if (diffDays < 730) return 30;
  
  // Critical: Needs immediate review
  return 10;
};
