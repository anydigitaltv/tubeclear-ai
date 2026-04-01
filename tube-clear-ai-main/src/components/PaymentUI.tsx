import { useState, useRef } from "react";
import { CreditCard, Wallet, DollarSign, QrCode, Upload, CheckCircle, Loader2, RefreshCw, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayment, type PaymentMethod } from "@/contexts/PaymentContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

const PaymentUI = () => {
  const { processPayment, isProcessing, syncCoins, paymentRecords } = usePayment();
  const { addNotification } = useNotifications();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("easypaisa");
  const [inputValue, setInputValue] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const paymentMethods: { id: PaymentMethod; name: string; icon: React.ReactNode; region: string }[] = [
    { id: "easypaisa", name: "EasyPaisa", icon: <Wallet className="h-5 w-5" />, region: "Pakistan" },
    { id: "jazzcash", name: "JazzCash", icon: <CreditCard className="h-5 w-5" />, region: "Pakistan" },
    { id: "lemonsqueezy", name: "LemonSqueezy", icon: <DollarSign className="h-5 w-5" />, region: "Global Cards" },
    { id: "usdt", name: "USDT (TRC20)", icon: <QrCode className="h-5 w-5" />, region: "Crypto" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      addNotification({
        type: "error",
        title: "Input Required",
        message: "Please enter a Transaction ID or Promo Code",
      });
      return;
    }

    const res = await processPayment(selectedMethod, inputValue.trim(), screenshot || undefined);
    setResult(res);

    if (res.success) {
      setInputValue("");
      setScreenshot(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSync = async () => {
    await syncCoins();
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Buy Coins</h1>
          <p className="text-sm text-muted-foreground">Choose your payment method</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Coins
        </Button>
      </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {paymentMethods.map((method) => (
          <Card
            key={method.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedMethod === method.id
                ? "border-primary bg-primary/10"
                : "border-border/20 hover:border-primary/50"
            )}
            onClick={() => setSelectedMethod(method.id)}
          >
            <CardContent className="p-4 text-center">
              <div className={cn(
                "w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2",
                selectedMethod === method.id ? "bg-primary/20" : "bg-secondary/50"
              )}>
                {method.icon}
              </div>
              <p className="font-medium text-sm">{method.name}</p>
              <p className="text-xs text-muted-foreground">{method.region}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Form */}
      <Card className="glass-card border-border/20">
        <CardHeader>
          <CardTitle className="text-lg">Enter Payment Details</CardTitle>
          <CardDescription>
            Enter your Transaction ID (TID) or Promo Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unified Input */}
          <div className="space-y-2">
            <Label htmlFor="input">Transaction ID or Promo Code</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="input"
                  placeholder="Enter TID or promo code..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pr-10"
                />
                <Gift className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Payment Screenshot (Optional)</Label>
            <div
              className="border-2 border-dashed border-border/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {screenshot ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{screenshot.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                  <p className="text-xs text-muted-foreground mt-1">OCR will extract date, time & amount</p>
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Payment"
            )}
          </Button>

          {/* Result Message */}
          {result && (
            <div className={cn(
              "p-4 rounded-lg border",
              result.success
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <CreditCard className="h-5 w-5 text-red-500" />
                )}
                <p className={cn(
                  "text-sm",
                  result.success ? "text-green-500" : "text-red-500"
                )}>
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="glass-card border-border/20">
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      record.status === "approved" ? "bg-green-500/20" : "bg-orange-500/20"
                    )}>
                      {record.status === "approved" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">+{record.coins} coins</p>
                      <p className="text-xs text-muted-foreground">
                        {record.transactionId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="capitalize text-xs">
                      {record.method}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentUI;
