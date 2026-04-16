-- System Vault Table for Admin API Keys
-- Secure storage for Gemini & Groq API keys with health tracking

CREATE TABLE IF NOT EXISTS public.system_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine_id TEXT NOT NULL CHECK (engine_id IN ('gemini', 'groq')),
  api_key TEXT NOT NULL,
  key_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Health & Usage Tracking
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  rate_limit_hits INTEGER NOT NULL DEFAULT 0,
  
  -- Token Quota Tracking (Monthly)
  monthly_token_limit BIGINT, -- NULL = unlimited
  tokens_used_this_month BIGINT NOT NULL DEFAULT 0,
  last_token_reset TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'rate_limited', 'invalid', 'exhausted')),
  last_checked TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_vault ENABLE ROW LEVEL SECURITY;

-- Only admin can manage keys (add your admin email here)
CREATE POLICY "Admin can manage system vault" ON public.system_vault
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'your-admin-email@example.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'your-admin-email@example.com');

-- Allow read access for scanning (system needs to read keys)
CREATE POLICY "System can read active keys" ON public.system_vault
  FOR SELECT
  USING (is_active = true);

-- Indexes for performance
CREATE INDEX idx_system_vault_engine ON public.system_vault(engine_id);
CREATE INDEX idx_system_vault_status ON public.system_vault(status);
CREATE INDEX idx_system_vault_active ON public.system_vault(is_active, status);
CREATE INDEX idx_system_vault_created ON public.system_vault(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_vault_updated_at
  BEFORE UPDATE ON public.system_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to reset monthly token usage
CREATE OR REPLACE FUNCTION public.reset_monthly_token_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.system_vault
  SET 
    tokens_used_this_month = 0,
    last_token_reset = now()
  WHERE 
    monthly_token_limit IS NOT NULL
    AND (
      last_token_reset IS NULL 
      OR EXTRACT(MONTH FROM last_token_reset) != EXTRACT(MONTH FROM now())
      OR EXTRACT(YEAR FROM last_token_reset) != EXTRACT(YEAR FROM now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.system_vault IS 'Secure storage for admin API keys (Gemini & Groq)';
COMMENT ON COLUMN public.system_vault.engine_id IS 'AI engine: gemini or groq';
COMMENT ON COLUMN public.system_vault.api_key IS 'Encrypted API key';
COMMENT ON COLUMN public.system_vault.monthly_token_limit IS 'Monthly token quota (NULL = unlimited)';
COMMENT ON COLUMN public.system_vault.tokens_used_this_month IS 'Tokens consumed this month';
COMMENT ON COLUMN public.system_vault.status IS 'Key status: ready, rate_limited, invalid, exhausted';
