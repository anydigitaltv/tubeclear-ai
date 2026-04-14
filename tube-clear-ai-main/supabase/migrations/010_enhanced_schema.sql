-- ============================================
-- TubeClear AI - Enhanced Supabase Schema
-- ============================================
-- User profiles, scan history, policy monitoring
-- ============================================

-- 1. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  coin_balance INTEGER DEFAULT 50,
  total_scans INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CONNECTED PLATFORMS TABLE (Already exists, updating)
ALTER TABLE connected_platforms 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- 3. SCAN HISTORY TABLE
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_title TEXT,
  thumbnail_url TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion')),
  overall_risk INTEGER,
  ai_detected BOOLEAN DEFAULT FALSE,
  disclosure_verified BOOLEAN DEFAULT FALSE,
  scan_duration_seconds INTEGER,
  model_used TEXT,
  result_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. POLICY UPDATES TABLE
CREATE TABLE IF NOT EXISTS policy_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion')),
  policy_title TEXT NOT NULL,
  policy_description TEXT,
  policy_url TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  effective_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 5. USER NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. VIDEO RE-SCAN QUEUE TABLE
CREATE TABLE IF NOT EXISTS rescan_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scan_history(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_platform ON scan_history(platform);
CREATE INDEX IF NOT EXISTS idx_scan_history_created ON scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_updates_platform ON policy_updates(platform);
CREATE INDEX IF NOT EXISTS idx_policy_updates_active ON policy_updates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_rescan_queue_status ON rescan_queue(status);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescan_queue ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Scan History Policies
CREATE POLICY "Users can view own scans" ON scan_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON scan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans" ON scan_history
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Re-scan Queue Policies
CREATE POLICY "Users can view own rescan queue" ON rescan_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rescan requests" ON rescan_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PUBLIC POLICIES (Anyone can read policy updates)
ALTER TABLE policy_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view policy updates" ON policy_updates
  FOR SELECT USING (is_active = TRUE);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION: Create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- FUNCTION: Check policy updates and notify users
CREATE OR REPLACE FUNCTION check_policy_impact()
RETURNS TRIGGER AS $$
DECLARE
  affected_scans RECORD;
BEGIN
  -- Find scans that might be affected by new policy
  FOR affected_scans IN 
    SELECT DISTINCT sh.user_id, sh.id as scan_id, sh.video_title
    FROM scan_history sh
    WHERE sh.platform = NEW.platform
    AND sh.created_at < NEW.effective_date
  LOOP
    -- Add to re-scan queue
    INSERT INTO rescan_queue (user_id, scan_id, reason, priority)
    VALUES (affected_scans.user_id, affected_scans.scan_id, 
            'Policy Update: ' || NEW.policy_title, 1);
    
    -- Create notification
    INSERT INTO user_notifications (user_id, notification_type, title, message, metadata)
    VALUES (
      affected_scans.user_id,
      'policy_update',
      'New Policy Update Detected',
      'Your video "' || affected_scans.video_title || '" may need re-scan due to new ' || NEW.platform || ' policy.',
      jsonb_build_object('policy_id', NEW.id, 'scan_id', affected_scans.scan_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Auto-check policy impact
CREATE TRIGGER on_policy_update_created
  AFTER INSERT ON policy_updates
  FOR EACH ROW
  EXECUTE FUNCTION check_policy_impact();

-- SEED DATA: Initial policy updates
INSERT INTO policy_updates (platform, policy_title, policy_description, severity, effective_date) VALUES
('youtube', 'AI-Generated Content Disclosure', 'YouTube now requires explicit disclosure for AI-generated or synthetic content.', 'high', NOW()),
('tiktok', 'Community Guidelines Update', 'Updated policies on copyrighted music and branded content.', 'medium', NOW()),
('instagram', 'Reels Monetization Policy', 'New requirements for branded content disclosure in Reels.', 'high', NOW()),
('facebook', 'Video Content Standards', 'Updated standards for video monetization and ad-friendly content.', 'medium', NOW()),
('dailymotion', 'Content Quality Guidelines', 'New quality thresholds for partner program eligibility.', 'low', NOW());
