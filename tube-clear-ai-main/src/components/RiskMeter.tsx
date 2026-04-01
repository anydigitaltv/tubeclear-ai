import { useEffect, useState, useRef } from "react";

interface RiskMeterProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

const RiskMeter = ({ score, label, size = "lg" }: RiskMeterProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const to = score;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [score]);

  const radius = size === "lg" ? 80 : 40;
  const stroke = size === "lg" ? 10 : 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const svgSize = (radius + stroke) * 2;

  const getColor = (s: number) => {
    if (s <= 30) return "hsl(var(--cyber-green))";
    if (s <= 60) return "hsl(45, 100%, 50%)";
    return "hsl(var(--destructive))";
  };

  const getStatus = (s: number) => {
    if (s <= 30) return "Low Risk";
    if (s <= 60) return "Moderate";
    return "High Risk";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={getColor(animatedScore)}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${getColor(animatedScore)})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold tabular-nums ${size === "lg" ? "text-4xl" : "text-lg"}`}
            style={{ color: getColor(animatedScore) }}
          >
            {animatedScore}
          </span>
          {size === "lg" && (
            <span className="text-xs text-muted-foreground mt-1">{getStatus(animatedScore)}</span>
          )}
        </div>
      </div>
      <span className={`text-muted-foreground ${size === "lg" ? "text-sm font-medium" : "text-xs"}`}>
        {label}
      </span>
    </div>
  );
};

export default RiskMeter;
