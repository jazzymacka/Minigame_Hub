import { useEffect, useState } from "react";

export default function Countdown({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [value, setValue] = useState(seconds);

  useEffect(() => {
    setValue(seconds);
    if (seconds <= 0) {
      onDone();
      return;
    }
    const interval = setInterval(() => {
      setValue((v) => {
        if (v <= 1) {
          clearInterval(interval);
          setTimeout(onDone, 700);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  return (
    <div className="fixed inset-0 z-50 flex select-none items-center justify-center bg-bg/90 backdrop-blur-md">
      <div key={value} className="animate-countdown font-display text-[min(40vw,220px)] font-bold text-accent">
        {value > 0 ? value : "GO!"}
      </div>
    </div>
  );
}
