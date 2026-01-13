export function PlaygroundSkeleton() {
  return (
    <div className="glass rounded-2xl p-8 animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-white/10 rounded" />
          <div className="mt-2 h-4 w-40 bg-white/5 rounded" />
        </div>
        <div className="h-6 w-24 bg-white/10 rounded-full" />
      </div>
      <div className="space-y-4">
        <div className="h-12 w-full bg-white/5 rounded-xl" />
        <div className="h-32 w-full bg-white/5 rounded-xl" />
        <div className="h-12 w-full bg-white/5 rounded-xl" />
        <div className="h-12 w-full bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

export function JobsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass rounded-xl p-4 animate-pulse">
          <div className="h-4 w-3/4 bg-white/5 rounded mb-3" />
          <div className="h-5 w-1/2 bg-white/10 rounded mb-3" />
          <div className="h-4 w-1/4 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SchedulesSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass rounded-xl p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-white/5 rounded mb-3" />
              <div className="h-5 w-1/2 bg-white/10 rounded" />
            </div>
            <div className="h-8 w-20 bg-white/10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsageSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-2xl p-4 animate-pulse">
            <div className="h-4 w-16 bg-white/5 rounded mb-3" />
            <div className="h-8 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-white/5 rounded" />
          ))}
        </div>
      </div>
    </>
  );
}
