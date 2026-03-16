"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({ className = "", variant = "rectangular" }: SkeletonProps) {
  const baseClasses = "bg-slate-200/60 relative overflow-hidden";
  
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
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
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
    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
      <Skeleton variant="circular" className="w-12 h-12" />
      <div className="space-y-2">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="text" className="w-full h-8" />
      </div>
    </div>
  );
}
