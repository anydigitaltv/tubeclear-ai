import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Transaction types - NO FREE COINS, only manual additions
export type CoinTransactionType =
  | "purchase"        // User bought coins
  | "rewarded_ad"     // User watched ad for coins
  | "scan_deep"       // Spent on deep scan
  | "premium_feature" // Spent on premium feature
  | "admin_bonus"     // Manual admin addition
  | "referral"        // Referral bonus (manually approved)
  | "access_pass";    // 24h access pass for flagged video

export interface CoinTransaction {
  id: string;
  type: CoinTransactionType;
  amount: number;
  description: string;
  created_at: string;
}

interface CoinContextType {
  balance: number;
  transactions: CoinTransaction[];
  isLoading: boolean;
  addCoins: (amount: number, type: CoinTransactionType, description?: string) => Promise<boolean>;
  spendCoins: (amount: number, type: CoinTransactionType, description?: string) => Promise<boolean>;
  canAfford: (amount: number) => boolean;
  refetchBalance: () => Promise<void>;
}

const COIN_STORAGE_KEY = "tubeclear_coins";

const CoinContext = createContext<CoinContextType | undefined>(undefined);

export const CoinProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load balance from Supabase (login) or localStorage (guest)
  useEffect(() => {
    const loadBalance = async () => {
      setIsLoading(true);
      
      if (user) {
        // Fetch from Database for authenticated users
        const { data: profile } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", user.id)
          .single();
          
        const { data: txs } = await supabase
          .from("coin_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
          
        setBalance(profile?.coins || 0);
        setTransactions(txs || []);
      } else {
        // Load from localStorage for guests
        const stored = localStorage.getItem(COIN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setBalance(parsed.balance || 0);
          setTransactions(parsed.transactions || []);
        }
      }
      setIsLoading(false);
    };

    loadBalance();
  }, [user]);

  const saveToLocalStorage = useCallback((newBalance: number, newTransactions: CoinTransaction[]) => {
    const storageKey = user ? `${COIN_STORAGE_KEY}_${user.id}` : COIN_STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify({
      balance: newBalance,
      transactions: newTransactions.slice(0, 50),
    }));
  }, [user]);

  const addTransaction = useCallback(async (
    type: CoinTransactionType,
    amount: number,
    description?: string
  ): Promise<boolean> => {
    const newTransaction: CoinTransaction = {
      id: crypto.randomUUID(),
      type,
      amount,
      description: description || getDefaultDescription(type, amount),
      created_at: new Date().toISOString(),
    };

    const newBalance = balance + amount;
    const newTransactions = [newTransaction, ...transactions];

    setBalance(newBalance);
    setTransactions(newTransactions);
    saveToLocalStorage(newBalance, newTransactions);

    return true;
  }, [balance, transactions, saveToLocalStorage]);

  const addCoins = useCallback(async (
    amount: number,
    type: CoinTransactionType,
    description?: string
  ): Promise<boolean> => {
    if (amount <= 0) return false;
    return addTransaction(type, amount, description);
  }, [addTransaction]);

  const spendCoins = useCallback(async (
    amount: number,
    type: CoinTransactionType,
    description?: string
  ): Promise<boolean> => {
    if (!canAfford(amount)) return false;
    return addTransaction(type, -amount, description);
  }, [addTransaction, balance]);

  const canAfford = useCallback((amount: number): boolean => {
    return balance >= amount;
  }, [balance]);

  const refetchBalance = useCallback(async () => {
    // Reload from localStorage
    const storageKey = user ? `${COIN_STORAGE_KEY}_${user.id}` : COIN_STORAGE_KEY;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      setBalance(parsed.balance || 0);
    }
  }, [user]);

  return (
    <CoinContext.Provider
      value={{
        balance,
        transactions,
        isLoading,
        addCoins,
        spendCoins,
        canAfford,
        refetchBalance,
      }}
    >
      {children}
    </CoinContext.Provider>
  );
};

function getDefaultDescription(type: CoinTransactionType, amount: number): string {
  const isEarn = amount > 0;
  
  switch (type) {
    case "purchase":
      return "Coin purchase";
    case "rewarded_ad":
      return "Watched rewarded ad";
    case "scan_deep":
      return "Deep video analysis";
    case "premium_feature":
      return "Premium feature purchase";
    case "admin_bonus":
      return "Admin bonus";
    case "referral":
      return "Referral bonus";
    case "access_pass":
      return "24h access pass";
    default:
      return isEarn ? "Coins earned" : "Coins spent";
  }
}

export const useCoins = () => {
  const ctx = useContext(CoinContext);
  if (!ctx) throw new Error("useCoins must be used within CoinProvider");
  return ctx;
};
