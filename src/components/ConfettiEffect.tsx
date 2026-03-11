import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiEffectProps {
  trigger: number; // increment to fire
  prolonged?: boolean; // completion celebration
}

export default function ConfettiEffect({
  trigger,
  prolonged = false,
}: ConfettiEffectProps) {
  useEffect(() => {
    if (trigger === 0) return;

    if (prolonged) {
      // 3 successive bursts over 5 seconds
      const fire = (delay: number) => {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0, x: 0.3 + Math.random() * 0.4 },
          });
        }, delay);
      };
      fire(0);
      fire(1500);
      fire(3000);
    } else {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0, x: 0.5 },
      });
    }
  }, [trigger, prolonged]);

  return null;
}
