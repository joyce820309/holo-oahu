export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[var(--color-skeleton)] rounded ${className}`} />
}

export function ItemCardSkeleton() {
  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-2">
      <div className="flex gap-3">
        <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ActivitiesSkeleton() {
  return (
    <div className="space-y-8 py-2">
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section}>
          <Skeleton className="h-4 w-28 mb-3" />
          <div className="relative space-y-4">
            <div
              style={{
                position: 'absolute',
                left: 19,
                top: 20,
                bottom: 20,
                width: 2,
                background: 'var(--mini-border)',
                zIndex: 0,
              }}
            />
            {Array.from({ length: section === 0 ? 2 : 1 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 relative" style={{ zIndex: 1 }}>
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 40 }}>
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-3 w-8 mt-1" />
                </div>
                <div className="glass-card p-4 flex-1">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-48 max-w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function FlightsSkeleton({ count = 2 }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-12 rounded-lg" />
              <Skeleton className="h-9 w-10 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-mini p-2 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="glass-mini p-2 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export function HotelsSkeleton({ count = 2 }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-9 w-12 rounded-lg" />
              <Skeleton className="h-9 w-10 rounded-lg" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityDetailSkeleton() {
  return (
    <div className="px-4 pb-36">
      <div className="flex items-center justify-between py-4">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-11 w-20 rounded-xl" />
      </div>
      <div className="space-y-4">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
        <div className="glass-card p-4 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function WeatherSkeleton() {
  return (
    <div className="glass-mini p-4 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  )
}

export function PackingSkeleton() {
  const catWidths  = ['w-16', 'w-20', 'w-14']
  const itemWidths = [['w-24', 'w-32', 'w-20'], ['w-28', 'w-20'], ['w-16', 'w-24', 'w-28']]
  return (
    <div className="space-y-6 py-2">
      {catWidths.map((cw, ci) => (
        <section key={ci}>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <Skeleton className={`h-4 ${cw}`} />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          <div className="space-y-2">
            {itemWidths[ci].map((iw, ii) => (
              <div key={ii} className="glass-mini p-3 flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                <Skeleton className={`h-4 ${iw}`} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
