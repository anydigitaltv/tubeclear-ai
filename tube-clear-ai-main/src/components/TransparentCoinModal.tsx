/**
 * Transparent Coin Deduction Modal
 * 
 * Shows user EXACT breakdown before deducting coins:
 * - Admin cost (actual)
 * - Admin profit
 * - Total user pays
 * - Token usage details
 * - Processing time estimate
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Clock, Zap, Shield, AlertCircle } from 'lucide-react';
import type { ScanCostBreakdown } from '@/utils/realTimeCostCalculator';

interface TransparentCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  costBreakdown: ScanCostBreakdown;
  userBalance: number;
  videoTitle?: string;
  videoDuration?: number;
}

export const TransparentCoinModal: React.FC<TransparentCoinModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  costBreakdown,
  userBalance,
  videoTitle,
  videoDuration
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canAfford = userBalance >= costBreakdown.userCostCoins;
  const insufficientFunds = !canAfford;
  
  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
  };
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="w-6 h-6 text-yellow-500" />
            Scan Cost Breakdown
          </DialogTitle>
          <DialogDescription>
            Transparent pricing - See exactly where your coins go
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Info */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <h3 className="font-semibold text-white mb-2">📹 Video Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {videoTitle && (
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="text-white truncate">{videoTitle}</p>
                </div>
              )}
              {videoDuration && (
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="text-white">{formatDuration(videoDuration)}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Quality:</span>
                <Badge variant="secondary" className="ml-2">{costBreakdown.videoQuality}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Frames:</span>
                <p className="text-white">{costBreakdown.frameCount} frames</p>
              </div>
            </div>
          </div>

          {/* Token Usage Breakdown */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              Token Usage (AI Engine Processing)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metadata Analysis:</span>
                <span className="text-white font-mono">{costBreakdown.metadataTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frame Analysis ({costBreakdown.frameCount} @ {costBreakdown.videoQuality}):</span>
                <span className="text-white font-mono">{costBreakdown.frameTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audio Transcription:</span>
                <span className="text-white font-mono">{costBreakdown.audioTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context Analysis:</span>
                <span className="text-white font-mono">{costBreakdown.contextTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-white font-semibold">Total Tokens:</span>
                <span className="text-green-400 font-mono font-bold">{costBreakdown.totalTokens.toLocaleString()} tokens</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Coin Cost Breakdown
            </h3>
            <div className="space-y-3">
              {/* Admin Cost */}
              <div className="flex justify-between items-center p-3 rounded bg-white/5">
                <div>
                  <p className="text-white font-semibold">💼 Admin Actual Cost</p>
                  <p className="text-xs text-muted-foreground">What we pay to AI engine</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-mono font-bold text-lg">{costBreakdown.adminCostCoins} coins</p>
                  <p className="text-xs text-muted-foreground">${costBreakdown.totalCostUSD.toFixed(4)} USD</p>
                </div>
              </div>

              {/* Admin Profit */}
              <div className="flex justify-between items-center p-3 rounded bg-white/5">
                <div>
                  <p className="text-white font-semibold">📈 Admin Profit ({costBreakdown.profitMarginPercent}%)</p>
                  <p className="text-xs text-muted-foreground">Service fee & infrastructure</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-mono font-bold text-lg">+{costBreakdown.adminProfitCoins} coins</p>
                  <p className="text-xs text-muted-foreground">Profit margin</p>
                </div>
              </div>

              {/* User Pays */}
              <div className="flex justify-between items-center p-4 rounded bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30">
                <div>
                  <p className="text-white font-bold text-lg">💰 You Pay</p>
                  <p className="text-xs text-muted-foreground">Total scan cost</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-mono font-bold text-2xl">{costBreakdown.userCostCoins} coins</p>
                  <p className="text-xs text-muted-foreground">${(costBreakdown.userCostCoins * costBreakdown.coinValueUSD).toFixed(3)} USD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Time */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Estimated Processing Time</h3>
            </div>
            <p className="text-2xl font-bold text-purple-400">{costBreakdown.estimatedProcessingTime}</p>
            <p className="text-xs text-muted-foreground mt-1">Based on {costBreakdown.totalTokens.toLocaleString()} tokens at ~1000 tokens/sec</p>
          </div>

          {/* User Balance */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Your Current Balance</p>
                <p className="text-2xl font-bold text-cyan-400">{userBalance.toLocaleString()} coins</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-sm">After Scan</p>
                <p className={`text-2xl font-bold ${insufficientFunds ? 'text-red-400' : 'text-green-400'}`}>
                  {(userBalance - costBreakdown.userCostCoins).toLocaleString()} coins
                </p>
              </div>
            </div>
          </div>

          {/* Insufficient Funds Warning */}
          {insufficientFunds && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-400">Insufficient Balance</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You need {(costBreakdown.userCostCoins - userBalance).toLocaleString()} more coins.
                  Please purchase coins or add your own API key for FREE scans.
                </p>
              </div>
            </div>
          )}

          {/* Free Scan Option */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-400">💡 Want FREE Scans?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your own Gemini or Groq API key in Settings to get unlimited FREE scans!
                  No coins will be deducted.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={insufficientFunds || isProcessing}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : insufficientFunds ? (
                'Insufficient Balance'
              ) : (
                `Confirm - Deduct ${costBreakdown.userCostCoins} Coins`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
