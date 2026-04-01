import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Coins, TrendingUp, TrendingDown, Play, Sparkles } from "lucide-react";
import { useCoins, type CoinTransaction } from "@/contexts/CoinContext";
import { cn } from "@/lib/utils";

const transactionIcons: Record<string, React.ReactNode> = {
  purchase: <TrendingUp className="h-4 w-4" />,
  rewarded_ad: <Play className="h-4 w-4" />,
  referral: <Sparkles className="h-4 w-4" />,
  scan_deep: <TrendingDown className="h-4 w-4" />,
  premium_feature: <TrendingDown className="h-4 w-4" />,
  admin_bonus: <Coins className="h-4 w-4" />,
};

const transactionLabels: Record<string, string> = {
  purchase: "Coin Purchase",
  rewarded_ad: "Watched Ad",
  referral: "Referral Bonus",
  scan_deep: "Deep Analysis",
  premium_feature: "Premium Feature",
  admin_bonus: "Admin Bonus",
};

const CoinHistory = () => {
  const { transactions, balance, isLoading } = useCoins();
  const [open, setOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            <Coins className="h-5 w-5 text-accent" />
            Coin History
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="font-bold text-accent">{balance} coins</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs">Purchase coins or watch ads to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        tx.amount > 0 ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"
                      )}
                    >
                      {transactionIcons[tx.type] || <Coins className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {transactionLabels[tx.type] || tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "font-bold",
                      tx.amount > 0 ? "text-accent" : "text-destructive"
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CoinHistory;
