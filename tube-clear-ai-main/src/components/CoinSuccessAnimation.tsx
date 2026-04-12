import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Coins, Sparkles } from "lucide-react";

interface CoinSuccessAnimationProps {
  isVisible: boolean;
}

const CoinSuccessAnimation = ({ isVisible }: CoinSuccessAnimationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <motion.div
                animate={{ 
                  rotateY: [0, 360, 720],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="relative z-10"
              >
                <div className="w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.5)] border-4 border-yellow-300">
                  <Coins className="w-12 h-12 text-yellow-900" />
                </div>
              </motion.div>
              
              {/* Celebration Sparkles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.cos(i * 60 * Math.PI / 180) * 80,
                    y: Math.sin(i * 60 * Math.PI / 180) * 80
                  }}
                  transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-center space-y-2"
            >
              <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                AUDITOR ACTIVATED
              </h2>
              <p className="text-blue-400 font-bold tracking-widest uppercase text-xs">
                Using High-Speed Admin Keys
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CoinSuccessAnimation;