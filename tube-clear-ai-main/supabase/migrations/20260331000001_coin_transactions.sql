-- Coin transactions table for tracking coin earnings and spendings
-- NO FREE COINS - only manual additions (purchase, ads, referral, admin)
CREATE TABLE public.coin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'rewarded_ad', 'referral', 'scan_deep', 'premium_feature', 'admin_bonus')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coin transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own coin transactions" ON public.coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_coin_transactions_user_id ON public.coin_transactions(user_id);
CREATE INDEX idx_coin_transactions_created_at ON public.coin_transactions(created_at DESC);

-- Function to update coin balance on transaction
CREATE OR REPLACE FUNCTION public.handle_coin_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET coin_balance = coin_balance + NEW.amount
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_coin_transaction
AFTER INSERT ON public.coin_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_coin_transaction();
