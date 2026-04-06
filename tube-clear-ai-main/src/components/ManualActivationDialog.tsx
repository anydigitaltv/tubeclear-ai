import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, Shield, Clock, AlertCircle } from "lucide-react";

interface ManualActivationProps {
  featureName: string;
  featureDescription: string;
  coinCost: number;
  duration: string;
  icon?: React.ReactNode;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
  userBalance: number;
}

export const ManualActivationDialog = ({
  featureName,
  featureDescription,
  coinCost,
  duration,
  icon = <Shield className="w-12 h-12" />,
  onConfirm,
  disabled = false,
  userBalance
}: ManualActivationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      console.error("Activation failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const insufficientBalance = userBalance < coinCost;

  return (
    <>
      {/* Activation Button */}
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled || insufficientBalance}
        className="w-full"
        variant={insufficientBalance ? "outline" : "default"}
      >
        {icon}
        <span className="ml-2">Activate {featureName}</span>
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              Activate {featureName}?
            </DialogTitle>
            <DialogDescription>
              Please review the details before confirming
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Feature Description */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium">{featureDescription}</p>
            </div>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                <Coins className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-green-700">Cost</p>
                  <p className="font-bold text-green-900">FREE!</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-700">Duration</p>
                  <p className="font-bold text-blue-900">{duration}</p>
                </div>
              </div>
            </div>

            {/* User Balance - Hidden since scans are free */}
            {/* <div className={`p-3 rounded-lg border ${
              insufficientBalance 
                ? "bg-red-50 border-red-200" 
                : "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Balance:</span>
                <span className={`font-bold ${
                  insufficientBalance ? "text-red-600" : "text-gray-900"
                }`}>
                  {userBalance} coins
                </span>
              </div>
              {insufficientBalance && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Insufficient balance
                </p>
              )}
            </div> */}

            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ Coins will be deducted immediately upon confirmation. 
                Feature will auto-expire after {duration}.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Activate Free Feature
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Pre-Scan Calculator Component
interface PreScanCalculatorProps {
  videoTitle: string;
  videoLength: number; // in seconds
  platformId: string;
  costPerScan: number;
  userBalance: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onBuyCoins: () => void;
  onUseBYOK: () => void;
}

export const PreScanCalculator = ({
  videoTitle,
  videoLength,
  platformId,
  costPerScan,
  userBalance,
  onConfirm,
  onCancel,
  onBuyCoins,
  onUseBYOK
}: PreScanCalculatorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const insufficientBalance = userBalance < costPerScan;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-blue-600" />
            Scan Cost Calculator
          </DialogTitle>
          <DialogDescription>
            Review the scan details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Information */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-semibold mb-1">Video to Scan:</p>
            <p className="text-sm text-muted-foreground truncate">{videoTitle}</p>
          </div>

          {/* Scan Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700">Length</span>
              </div>
              <p className="font-bold text-blue-900">{formatDuration(videoLength)}</p>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">Platform</span>
              </div>
              <p className="font-bold text-green-900 capitalize">{platformId}</p>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700">Cost</span>
              </div>
              <p className="font-bold text-purple-900">FREE!</p>
            </div>
          </div>

          {/* Balance Display - Hidden since scans are free */}
          {/* <div className={`p-4 rounded-lg border ${
            insufficientBalance 
              ? "bg-red-50 border-red-200" 
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Balance:</span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className={`font-bold text-lg ${
                  insufficientBalance ? "text-red-600" : "text-gray-900"
                }`}>
                  {userBalance} coins
                </span>
              </div>
            </div>
            
            {insufficientBalance && (
              <div className="text-xs text-red-600 space-y-1">
                <p className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Insufficient balance for this scan
                </p>
                <p>You need {costPerScan - userBalance} more coins</p>
              </div>
            )}
          </div> */}

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ Coins will be deducted immediately after confirmation. 
              The scan cannot be refunded once started.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="sm:ml-2 bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>Scanning...</>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Start Free Scan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualActivationDialog;
