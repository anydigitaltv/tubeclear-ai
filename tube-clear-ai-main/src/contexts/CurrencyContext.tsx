import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Currency = "PKR" | "USD";

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertToUSD: (amount: number) => number;
  convertToPKR: (amount: number) => number;
  formatPrice: (amount: number) => string;
  exchangeRate: number;
}

const CURRENCY_KEY = "tubeclear_currency_preference";
const EXCHANGE_RATE = 278.5; // PKR to USD (example rate)

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_KEY);
      return (stored as Currency) || "PKR";
    } catch {
      return "PKR";
    }
  });

  const [exchangeRate] = useState<number>(EXCHANGE_RATE);

  const setCurrency = useCallback((newCurrency: Currency) => {
    localStorage.setItem(CURRENCY_KEY, newCurrency);
    setCurrencyState(newCurrency);
  }, []);

  const convertToUSD = useCallback((amount: number): number => {
    return amount / exchangeRate;
  }, [exchangeRate]);

  const convertToPKR = useCallback((amount: number): number => {
    return amount * exchangeRate;
  }, [exchangeRate]);

  const formatPrice = useCallback((amount: number): string => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`;
    }
    return `₨${amount.toLocaleString('en-PK')}`;
  }, [currency]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertToUSD,
        convertToPKR,
        formatPrice,
        exchangeRate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};

// Helper component for currency toggle UI
export const CurrencyToggle = () => {
  const { currency, setCurrency, formatPrice } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setCurrency("PKR")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          currency === "PKR"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-primary/20"
        }`}
      >
        PKR
      </button>
      <button
        onClick={() => setCurrency("USD")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          currency === "USD"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-primary/20"
        }`}
      >
        USD
      </button>
    </div>
  );
};
