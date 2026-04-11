/**
 * Live Policy News Generator
 * Uses Gemini API to generate fresh policy updates for all platforms
 * Runs without specific year references - always current
 */

import { supabase } from "@/integrations/supabase/client";

interface PolicyNewsItem {
  title: string;
  summary: string;
  platform: string;
  risk_level: "low" | "medium" | "high";
  category: string;
  source_url?: string;
}

const PLATFORMS = ["youtube", "tiktok", "facebook", "instagram", "dailymotion"];

const CATEGORIES = [
  "policy_update",
  "copyright",
  "monetization",
  "community_guidelines",
  "advertiser_policy",
  "safety",
];

/**
 * Generate fresh policy news using Gemini API
 */
export const generatePolicyNews = async (
  apiKey: string,
  platform: string = "all"
): Promise<PolicyNewsItem[]> => {
  const targetPlatforms = platform === "all" ? PLATFORMS : [platform];

  const allNews: PolicyNewsItem[] = [];

  for (const plat of targetPlatforms) {
    try {
      const news = await fetchPlatformNews(apiKey, plat);
      allNews.push(...news);
    } catch (error) {
      console.error(`Failed to generate news for ${plat}:`, error);
    }
  }

  return allNews;
};

/**
 * Fetch news for a specific platform
 */
const fetchPlatformNews = async (
  apiKey: string,
  platform: string
): Promise<PolicyNewsItem[]> => {
  const prompt = `You are an expert policy analyst for social media platforms. 

Generate 2 fresh, realistic policy updates for ${platform} that creators need to know about. Focus on:
- Recent changes to community guidelines
- Monetization policy updates
- Copyright enforcement changes
- AI content disclosure requirements
- Advertiser-friendly content standards
- Safety and compliance requirements

IMPORTANT RULES:
1. Do NOT mention any specific year - make it timeless and current
2. Make the updates realistic and actionable
3. Include specific details about what changed and why it matters
4. Assess risk level accurately (low, medium, or high)
5. Assign appropriate category

Return ONLY a valid JSON array with this exact structure:
[
  {
    "title": "Clear, specific title about the policy change",
    "summary": "Detailed explanation of what changed and impact on creators (2-3 sentences)",
    "platform": "${platform}",
    "risk_level": "low|medium|high",
    "category": "policy_update|copyright|monetization|community_guidelines|advertiser_policy|safety"
  }
]

Make each update unique, specific, and valuable for content creators.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates[0]?.content?.parts[0]?.text;

  if (!text) {
    throw new Error("No content generated");
  }

  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Invalid JSON response");
  }

  const newsItems: PolicyNewsItem[] = JSON.parse(jsonMatch[0]);

  // Validate and clean
  return newsItems
    .filter(
      (item) =>
        item.title &&
        item.summary &&
        item.platform &&
        ["low", "medium", "high"].includes(item.risk_level)
    )
    .map((item) => ({
      ...item,
      platform: item.platform.toLowerCase(),
      risk_level: item.risk_level as "low" | "medium" | "high",
      category: CATEGORIES.includes(item.category) ? item.category : "policy_update",
    }));
};

/**
 * Save generated news to database
 */
export const savePolicyNews = async (
  newsItems: PolicyNewsItem[]
): Promise<boolean> => {
  try {
    // @ts-ignore - market_news table not in generated types yet
    const { error } = await supabase.from("market_news").insert(
      newsItems.map((item) => ({
        title: item.title,
        summary: item.summary,
        platform: item.platform,
        risk_level: item.risk_level,
        category: item.category,
        source_url: item.source_url || null,
        is_active: true,
      }))
    );

    if (error) {
      console.error("Error saving policy news:", error);
      return false;
    }

    console.log(`✅ Saved ${newsItems.length} policy news items`);
    return true;
  } catch (error) {
    console.error("Failed to save policy news:", error);
    return false;
  }
};

/**
 * Check if we should generate new news (max once per day)
 */
export const shouldGenerateNews = (): boolean => {
  const lastGenerated = localStorage.getItem("tubeclear_last_news_generation");

  if (!lastGenerated) {
    return true;
  }

  const lastDate = new Date(lastGenerated);
  const now = new Date();
  const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

  return hoursSince >= 24; // Generate once per day
};

/**
 * Update last generation timestamp
 */
export const markNewsGenerated = (): void => {
  localStorage.setItem("tubeclear_last_news_generation", new Date().toISOString());
};

/**
 * Main function: Generate and save fresh policy news
 */
export const updatePolicyNews = async (apiKey?: string): Promise<boolean> => {
  // Check if we should generate
  if (!shouldGenerateNews()) {
    console.log("⏭️ News already generated today, skipping");
    return false;
  }

  // Use provided API key or check localStorage
  const userApiKey = apiKey || localStorage.getItem("tubeclear_gemini_key");

  if (!userApiKey) {
    console.warn("No Gemini API key available for news generation");
    return false;
  }

  try {
    console.log("🔄 Generating fresh policy news...");
    const newsItems = await generatePolicyNews(userApiKey);

    if (newsItems.length === 0) {
      console.warn("No news items generated");
      return false;
    }

    const saved = await savePolicyNews(newsItems);

    if (saved) {
      markNewsGenerated();
      console.log(`✅ Successfully generated and saved ${newsItems.length} news items`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to update policy news:", error);
    return false;
  }
};

/**
 * Manual trigger for admins
 */
export const forceUpdatePolicyNews = async (apiKey: string): Promise<boolean> => {
  try {
    console.log("🔄 Force updating policy news...");
    const newsItems = await generatePolicyNews(apiKey, "all");

    if (newsItems.length === 0) {
      console.warn("No news items generated");
      return false;
    }

    const saved = await savePolicyNews(newsItems);

    if (saved) {
      markNewsGenerated();
      console.log(`✅ Force update complete: ${newsItems.length} news items`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Force update failed:", error);
    return false;
  }
};
