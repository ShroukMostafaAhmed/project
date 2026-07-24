"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => setPhase("idle"),  400);   // logo appeared
    const t2 = setTimeout(() => setPhase("exit"),   2400);  // start exit
    const t3 = setTimeout(() => onDone(),           2900);  // unmount

    // Progress bar
    const TOTAL = 2000;
    const STEP  = 40;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += STEP;
      setProgress(Math.min((elapsed / TOTAL) * 100, 100));
      if (elapsed >= TOTAL) clearInterval(interval);
    }, STEP);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearInterval(interval);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 55% 45%, #1e1b4b 0%, #0d0b2e 45%, #020617 100%)",
        opacity:    phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.5s ease" : "none",
      }}
    >
      {/* ── Grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,.07) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(99,102,241,.07) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { s:"600px", t:"-15%", r:"-10%",  bg:"#6366f1", op:.22, dur:"9s",  del:"0s"   },
          { s:"500px", b:"-20%", l:"-8%",   bg:"#7c3aed", op:.18, dur:"11s", del:"1s"   },
          { s:"350px", t:"35%",  l:"25%",   bg:"#a78bfa", op:.10, dur:"7s",  del:".5s"  },
        ].map((b, i) => (
          <div key={i}
            className="absolute rounded-full"
            style={{
              width: b.s, height: b.s,
              top: (b as {t?:string}).t, right: (b as {r?:string}).r,
              bottom: (b as {b?:string}).b, left: (b as {l?:string}).l,
              background: `radial-gradient(circle,${b.bg} 0%,transparent 70%)`,
              opacity: b.op,
              animation: `blob${i+1} ${b.dur} ease-in-out ${b.del} infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Main content ── */}
      <div
        className="relative z-10 flex flex-col items-center gap-8"
        style={{
          opacity:   phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(20px) scale(.96)" : "translateY(0) scale(1)",
          transition: "opacity .5s ease, transform .5s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* Logo */}
        <div className="relative flex items-center justify-center">
          {/* Rings */}
          {[28, 22, 16].map((size, i) => (
            <span
              key={i}
              className="absolute rounded-full border"
              style={{
                width:  `${size * 4}px`,
                height: `${size * 4}px`,
                borderColor: `rgba(99,102,241,${.12 - i * .03})`,
                animation: `ripple ${2 + i * .4}s ease-out ${i * .3}s infinite`,
              }}
            />
          ))}

          {/* Box */}
          <div
            className="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background:  "linear-gradient(135deg,#6366f1 0%,#7c3aed 50%,#4f46e5 100%)",
              boxShadow:   "0 0 60px 10px rgba(99,102,241,.35), 0 20px 40px rgba(0,0,0,.4)",
            }}
          >
            {/* Shine */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{ background: "linear-gradient(135deg,rgba(255,255,255,.25) 0%,transparent 55%)" }}
            />
            <Building2 className="w-11 h-11 text-white drop-shadow-xl relative z-10" strokeWidth={1.8} />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg,#ffffff 20%,#a5b4fc 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            شركة المساهمين
          </h1>
          <p className="text-indigo-300/60 text-sm font-medium tracking-widest uppercase">
            Real Estate Management System
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent" />

        {/* Progress */}
        <div className="w-64 space-y-3">
          {/* Track */}
          <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.08)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#6366f1,#a78bfa,#6366f1)",
                backgroundSize: "200% 100%",
                animation: "shimmerBar 1.5s linear infinite",
              }}
            />
            {/* Glow head */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
              style={{
                left:       `calc(${progress}% - 8px)`,
                background: "#818cf8",
                boxShadow:  "0 0 12px 4px rgba(129,140,248,.7)",
                transition: "left 75ms linear",
                opacity:    progress > 0 && progress < 100 ? 1 : 0,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30 tracking-wider">جاري التهيئة...</span>
            <span className="text-[11px] text-indigo-400 font-bold tabular-nums">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Dots */}
        <div className="flex gap-2 items-end h-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                width:           i === 2 ? 10 : i === 1 || i === 3 ? 7 : 5,
                height:          i === 2 ? 10 : i === 1 || i === 3 ? 7 : 5,
                background:      "#818cf8",
                opacity:         0.5 + i * .08,
                animation:       `bounce .9s ease-in-out ${i * .12}s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes ripple {
          0%   { transform:scale(.85); opacity:.6 }
          100% { transform:scale(1.3); opacity:0  }
        }
        @keyframes blob1 {
          0%,100% { transform:translate(0,0)    scale(1)    }
          33%     { transform:translate(-50px,70px) scale(1.12) }
          66%     { transform:translate(40px,-50px) scale(.9)  }
        }
        @keyframes blob2 {
          0%,100% { transform:translate(0,0)    scale(1)    }
          33%     { transform:translate(70px,-40px) scale(1.15) }
          66%     { transform:translate(-30px,60px) scale(.95) }
        }
        @keyframes blob3 {
          0%,100% { transform:translate(0,0)       scale(1)   }
          50%     { transform:translate(-40px,-40px) scale(1.2) }
        }
        @keyframes shimmerBar {
          0%   { background-position:100% 0 }
          100% { background-position:-100% 0 }
        }
        @keyframes bounce {
          from { transform:translateY(0) }
          to   { transform:translateY(-8px) }
        }
      `}</style>
    </div>
  );
}
