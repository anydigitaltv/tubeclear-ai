import { useState } from "react";
import { Coins, Crown, Shield, Scan, Ban, Check, Lock, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCoins } from "@/contexts/CoinContext";
import { useFeatureStore, type FeatureId } from "@/contexts/FeatureStoreContext";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Shield,
  Scan,
  Ban,
};

const FeatureStore = () => {
  const { balance } = useCoins();
  const { features, isFeatureActive, purchaseFeature, getRemainingDays } = useFeatureStore();
  const [purchasingId, setPurchasingId] = useState<FeatureId | null>(null);

  const handlePurchase = async (featureId: FeatureId, price: number) => {
    if (balance < price) return;
    
    setPurchasingId(featureId);
    const success = await purchaseFeature(featureId);
    setPurchasingId(null);
    
    if (!success && !isFeatureActive(featureId)) {
      // Could show toast here
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet UI */}
      <Card className="glass-card border-accent/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent" />
            Coin Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                <Coins className="h-7 w-7 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-3xl font-bold text-accent">{balance}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Coins
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Store */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Feature Store</h3>
        <div className="grid gap-4">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || Shield;
            const isActive = isFeatureActive(feature.id);
            const remainingDays = getRemainingDays(feature.id);
            const canAfford = balance >= feature.price;
            const isPurchasing = purchasingId === feature.id;

            return (
              <Card
                key={feature.id}
                className={cn(
                  "glass-card transition-all duration-300",
                  isActive ? "border-green-500/30" : "border-border/20"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-green-500/20 text-green-500"
                          : "bg-secondary/50 text-muted-foreground"
                      )}
                    >
                      {isActive ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{feature.name}</h4>
                        {isActive && (
                          <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {feature.description}
                      </p>
                      
                      {/* Expiry Timer */}
                      {isActive && remainingDays > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{remainingDays} days remaining</span>
                        </div>
                      )}
                    </div>

                    {/* Price / Action */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-accent" />
                        <span className="font-bold text-foreground">{feature.price}</span>
                      </div>
                      
                      {isActive ? (
                        <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Owned
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant={canAfford ? "neon" : "outline"}
                          className="text-xs gap-1"
                          disabled={!canAfford || isPurchasing}
                          onClick={() => handlePurchase(feature.id, feature.price)}
                        >
                          {!canAfford ? (
                            <>
                              <Lock className="h-3 w-3" />
                              Locked
                            </>
                          ) : isPurchasing ? (
                            "Buying..."
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeatureStore;
