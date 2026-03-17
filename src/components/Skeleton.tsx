"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({ className = "", variant = "rectangular" }: SkeletonProps) {
  const baseClasses = "bg-slate-200 dark:bg-white/5 relative overflow-hidden backdrop-blur-sm border border-slate-300 dark:border-white/5";
  
  const variantClasses = {
    text: "h-4 w-full rounded-md",
    rectangular: "h-32 w-full rounded-2xl",
    circular: "h-12 w-12 rounded-full",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <motion.div
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-gold/20 dark:via-accent-gold/10 to-transparent"
      />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-border last:border-0 bg-card/40 rounded-3xl">
          <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-1/4" />
          </div>
          <Skeleton variant="text" className="w-24 h-8" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card/40 p-8 rounded-[2rem] border border-border space-y-5 shadow-xl">
      <Skeleton variant="circular" className="w-14 h-14" />
      <div className="space-y-2">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="text" className="w-full h-8" />
      </div>
    </div>
  );
}
