import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Key, ShieldCheck, AlertCircle } from "lucide-react";

interface CoinDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onAddKey: () => void;
  onBuyCoins: () => void;
  coinCost: number;
  userBalance: number;
}

export const CoinDeductionModal = ({
  isOpen,
  onClose,
  onConfirm,
  onAddKey,
  onBuyCoins,
  coinCost,
  userBalance
}: CoinDeductionModalProps) => {
  const hasEnoughCoins = userBalance >= coinCost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-blue-400">
            <ShieldCheck className="w-6 h-6" />
            Official Auditor Mode
          </DialogTitle>
          <DialogDescription className="text-slate-400 pt-2">
            Is scan ke liye Admin High-Speed Keys istemal hongi.
            {userBalance === 0 && (
              <p className="mt-2 text-yellow-400 font-semibold">
                ⚠️ Aapke paas 0 coins hain. Scan shuru karne ke liye coins khareedein!
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span>Scan Cost</span>
            </div>
            <span className="font-bold text-lg text-yellow-500">{coinCost} Coins</span>
          </div>

          <div className="flex items-center justify-between px-2 text-sm">
            <span className="text-slate-400">Aapka Balance:</span>
            <span className={hasEnoughCoins ? "text-green-400" : "text-red-400"}>
              {userBalance} Coins
            </span>
          </div>

          <div className="flex items-center justify-between px-2 text-sm">
            <span className="text-slate-400">Scan Ke Baad Balance:</span>
            <span className="text-blue-400 font-semibold">
              {userBalance - coinCost} Coins
            </span>
          </div>

          {!hasEnoughCoins && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-xs text-red-400">
                Aapke paas kafi coins nahi hain. Meharbani karke coins khareedein ya apni API key add karein.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onBuyCoins}
            className="flex-1 gap-2 border-yellow-600 hover:bg-yellow-600/20 text-yellow-400 bg-yellow-600/10"
          >
            <Coins className="w-4 h-4" />
            Coins Khareedein
          </Button>
          
          <Button
            variant="outline"
            onClick={onAddKey}
            className="flex-1 gap-2 border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <Key className="w-4 h-4" />
            Apni Key Dalein (Free)
          </Button>
          
          <Button
            onClick={onConfirm}
            disabled={!hasEnoughCoins}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Scan Shuru Karein
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};