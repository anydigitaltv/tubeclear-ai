import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  DollarSign, 
  Activity,
  RefreshCw,
  AlertCircle,
  Tag,
  Percent
} from "lucide-react";
import { useGlobalMarket } from "@/contexts/GlobalMarketContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export const MarketWatcherDashboard = () => {
  const {
    userLocation,
    exchangeRates,
    competitorRates,
    priceHistory,
    isLoading,
    fetchExchangeRates,
    checkCompetitorRates,
    adjustPricesForRegion,
    calculateProfitMargin,
    getCoinPackagePrice,
    isFlashSaleActive,
    getFlashSaleDiscount,
  } = useGlobalMarket();

  const { currency, formatPrice } = useCurrency();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const handleRefresh = async () => {
    await fetchExchangeRates(true);
    await checkCompetitorRates();
    setLastUpdate(new Date());
  };

  // Calculate average competitor price
  const avgCompetitorPrice = competitorRates.length > 0
    ? competitorRates.reduce((sum, r) => sum + r.avgPricePerScan, 0) / competitorRates.length
    : 0;

  // Our target price (10% cheaper)
  const ourTargetPrice = avgCompetitorPrice * 0.9;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Global Market Watcher
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time pricing intelligence & auto-adjustment
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* User Location Card */}
      {userLocation && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Your Region
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-lg font-semibold text-white">{userLocation.country}</p>
                <Badge variant="outline" className="mt-1">{userLocation.countryCode}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="text-lg font-semibold text-white">{userLocation.currency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economic Tier</p>
                <p className="text-lg font-semibold capitalize text-white">{userLocation.tier.replace('tier', 'Tier ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                {userLocation.isHoliday ? (
                  <Badge className="bg-green-500 text-white">🎉 Holiday Sale</Badge>
                ) : (
                  <Badge variant="secondary">Normal Pricing</Badge>
                )}
              </div>
            </div>

            {/* Flash Sale Banner */}
            {isFlashSaleActive() && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Percent className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="font-bold text-green-400">Flash Sale Active!</p>
                    <p className="text-sm text-green-300">
                      Get {(getFlashSaleDiscount() * 100).toFixed(0)}% OFF on all packages during holidays
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exchange Rates */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Live Exchange Rates
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(exchangeRates.lastFetched).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(exchangeRates.rates).slice(0, 5).map(([currency, rate]) => (
              <div key={currency} className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{currency}/USD</p>
                <p className="text-xl font-bold text-white">{rate.toFixed(2)}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Auto-updates every 48 hours or when change exceeds 2%
          </div>
        </CardContent>
      </Card>

      {/* Competitor Analysis */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Competitor Price Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Competitor List */}
          <div className="space-y-3">
            {competitorRates.map((competitor, idx) => (
              <div key={idx} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                <div>
                  <p className="font-medium text-white">{competitor.service}</p>
                  <p className="text-xs text-muted-foreground">Average market price</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">${competitor.avgPricePerScan.toFixed(4)}</p>
                  <Badge variant="outline" className="text-xs">per scan</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Our Competitive Advantage */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Average</p>
                <p className="text-2xl font-bold text-white">${avgCompetitorPrice.toFixed(4)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-400" />
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Our Target Price</p>
                <p className="text-2xl font-bold text-green-400">${ourTargetPrice.toFixed(4)}</p>
              </div>
            </div>
            <Progress value={90} className="h-2" />
            <p className="text-xs text-center text-green-400 font-medium">
              ✓ We're 10% cheaper than competitors!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional Pricing */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Regional Coin Package Pricing
          </CardTitle>
          <CardDescription>
            Prices adjusted based on your location's economic tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: "starter", name: "Starter Pack", baseCoins: 100 },
              { id: "standard", name: "Standard Pack", baseCoins: 600 },
              { id: "premium", name: "Premium Pack", baseCoins: 1500 },
            ].map((pkg) => {
              const adjustedPrice = getCoinPackagePrice(pkg.id);
              return (
                <div key={pkg.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-white">{pkg.name}</p>
                    <p className="text-sm text-muted-foreground">{pkg.baseCoins} coins</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{formatPrice(adjustedPrice)}</p>
                    {userLocation?.tier === 'tier1' && (
                      <Badge variant="outline" className="text-xs mt-1">Tier 1 Pricing</Badge>
                    )}
                    {userLocation?.tier === 'tier2' && (
                      <Badge className="text-xs mt-1 bg-blue-500">Tier 2 Discount</Badge>
                    )}
                    {userLocation?.tier === 'tier3' && (
                      <Badge className="text-xs mt-1 bg-purple-500">Tier 3 Max Discount</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Profit Margin Calculator */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Profit Margin Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">API Cost per Scan</p>
              <p className="text-2xl font-bold text-white">$0.02</p>
              <p className="text-xs text-muted-foreground mt-1">(Example)</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">Your Region Margin</p>
              <p className="text-2xl font-bold text-primary">
                {userLocation?.tier === 'tier1' ? '70%' : 
                 userLocation?.tier === 'tier2' ? '40%' : '30%'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {userLocation?.tier?.replace('tier', 'Tier ')} region
              </p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">Final Price</p>
              <p className="text-2xl font-bold text-green-400">
                ${calculateProfitMargin(0.02).toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">After margin</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Auto-Adjustment Active</p>
              <p className="text-xs text-yellow-300 mt-1">
                Prices automatically adjust based on exchange rates, competitor analysis, and regional economics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price History */}
      {priceHistory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Price Adjustments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {priceHistory.slice(-10).reverse().map((adjustment, idx) => (
                <div key={idx} className="flex items-center justify-between bg-secondary/20 rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{adjustment.region}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {adjustment.reason.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {adjustment.newPrice > adjustment.oldPrice ? (
                        <TrendingUp className="w-4 h-4 text-red-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-white font-mono">
                        {adjustment.oldPrice.toFixed(2)} → {adjustment.newPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(adjustment.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Market data refreshes automatically every 48 hours</p>
        <p>Last manual update: {lastUpdate.toLocaleTimeString()}</p>
      </div>
    </div>
  );
};
