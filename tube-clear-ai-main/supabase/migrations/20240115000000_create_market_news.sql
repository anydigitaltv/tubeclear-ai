-- Create market_news table for policy updates
-- Date: 2024-01-15

CREATE TABLE IF NOT EXISTS market_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  platform TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'policy_update',
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_market_news_platform ON market_news(platform);
CREATE INDEX IF NOT EXISTS idx_market_news_risk_level ON market_news(risk_level);
CREATE INDEX IF NOT EXISTS idx_market_news_created_at ON market_news(created_at DESC);

-- Insert evergreen dummy data
INSERT INTO market_news (title, summary, platform, risk_level, category) VALUES
(
  'YouTube Policy Update: New AI Disclosure Rules',
  'YouTube now requires creators to clearly disclose AI-generated or AI-modified content. Failure to disclose may result in content removal or demonetization. This applies to synthetic voices, deepfakes, and AI-generated visuals.',
  'youtube',
  'high',
  'policy_update'
),
(
  'TikTok Music Copyright Alert for Creators',
  'TikTok has strengthened its music copyright enforcement. Creators using unlicensed music in commercial content may face strikes. Use only TikTok Commercial Music Library or licensed tracks for brand-safe content.',
  'tiktok',
  'medium',
  'copyright'
),
(
  'Facebook Monetization: New Partner Standards',
  'Meta has updated its Partner Monetization Policies with stricter community standards compliance. Pages must maintain consistent original content and avoid engagement bait to remain eligible for in-stream ads.',
  'facebook',
  'medium',
  'monetization'
),
(
  'Instagram Reels: Community Guideline Changes',
  'Instagram has updated its Reels monetization criteria. Content must be original, advertiser-friendly, and comply with new community guidelines. Re-uploaded content from other platforms may be deprioritized.',
  'instagram',
  'low',
  'community_guidelines'
),
(
  'Dailymotion Advertiser Policy Update',
  'Dailymotion has revised its advertising partner policies with enhanced content quality standards. Videos must meet minimum production quality and comply with European content regulations for monetization.',
  'dailymotion',
  'low',
  'advertiser_policy'
),
(
  'Cross-Platform Copyright Enforcement Tightened',
  'Major platforms are collaborating on cross-platform copyright enforcement. Copyright strikes on one platform may now affect monetization eligibility on others. Creators should ensure all content is properly licensed.',
  'all',
  'high',
  'copyright'
);

-- Enable RLS
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access to market_news"
  ON market_news
  FOR SELECT
  USING (is_active = true);

-- Admin can manage all
CREATE POLICY "Allow authenticated users full access"
  ON market_news
  FOR ALL
  USING (auth.role() = 'authenticated');
