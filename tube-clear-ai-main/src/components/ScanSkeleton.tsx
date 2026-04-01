import { Skeleton } from "@/components/ui/skeleton";

const ScanSkeleton = () => {
  return (
    <section className="container mx-auto px-6 py-12 space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="glass-card p-6 flex flex-col md:flex-row items-center gap-6">
        <Skeleton className="w-[180px] h-[180px] rounded-full bg-secondary/50" />
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-7 w-3/4 bg-secondary/50" />
          <Skeleton className="h-4 w-1/2 bg-secondary/50" />
          <Skeleton className="h-4 w-2/3 bg-secondary/50" />
        </div>
      </div>

      {/* Check cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded bg-secondary/50" />
                <Skeleton className="h-5 w-40 bg-secondary/50" />
              </div>
              <Skeleton className="h-5 w-16 bg-secondary/50" />
            </div>
            <Skeleton className="h-4 w-full bg-secondary/50" />
            <Skeleton className="h-3 w-full rounded-full bg-secondary/50" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ScanSkeleton;
