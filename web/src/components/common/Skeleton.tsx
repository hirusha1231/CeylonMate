import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-6 w-full', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-stone-200/80 dark:bg-slate-800/80 rounded-lg ${className}`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-stone-200/60 p-6 rounded-2xl shadow-xl space-y-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
};
