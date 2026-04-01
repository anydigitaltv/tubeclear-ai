import { Coins, Plus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/contexts/CoinContext";
import { cn } from "@/lib/utils";

interface CoinBalanceProps {
  showBuyButton?: boolean;
  compact?: boolean;
  className?: string;
}

const CoinBalance = ({ showBuyButton = true, compact = false, className }: CoinBalanceProps) => {
  const { balance, isLoading } = useCoins();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Coins className="h-4 w-4 text-accent" />
        <span className="font-bold text-accent">{isLoading ? "..." : balance}</span>
      </div>
    );
  }

  return (
    <Card className={cn("glass-card border-accent/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Coins className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Balance</p>
              <p className="text-2xl font-bold text-gradient flex items-center gap-2">
                {isLoading ? "..." : balance}
                <Sparkles className="h-4 w-4 text-accent" />
              </p>
            </div>
          </div>
          {showBuyButton && (
            <Button variant="neon" size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Get More
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CoinBalance;
