import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ShareButton = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const message = `I just secured my channel with TubeClear AI. Check your monetization safety for free: ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast({ title: "Copied to clipboard!", description: "Share it with fellow creators." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleShare}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full glass glow-blue text-primary font-semibold text-sm hover:scale-105 transition-transform shadow-lg animate-pulse-glow"
    >
      {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
};

export default ShareButton;
