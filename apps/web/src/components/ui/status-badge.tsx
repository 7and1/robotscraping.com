import { clsx } from 'clsx';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'blocked' | 'cached';

const statusConfig: Record<JobStatus, { label: string; className: string; dotColor: string }> = {
  queued: {
    label: 'Queued',
    className: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    dotColor: 'bg-yellow-400',
  },
  processing: {
    label: 'Processing',
    className: 'text-cyan border-cyan/40 bg-cyan/10',
    dotColor: 'bg-cyan',
  },
  completed: {
    label: 'Completed',
    className: 'text-neon border-neon/40 bg-neon/10',
    dotColor: 'bg-neon',
  },
  cached: {
    label: 'Cached',
    className: 'text-neon border-neon/40 bg-neon/10',
    dotColor: 'bg-neon',
  },
  failed: {
    label: 'Failed',
    className: 'text-laser border-laser/40 bg-laser/10',
    dotColor: 'bg-laser',
  },
  blocked: {
    label: 'Blocked',
    className: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
    dotColor: 'bg-orange-400',
  },
};

interface StatusBadgeProps {
  status: JobStatus | string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = false, className }: StatusBadgeProps) {
  const config = statusConfig[status as JobStatus] || {
    label: status,
    className: 'border-white/20 text-white/60 bg-white/5',
    dotColor: 'bg-white/60',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]',
        config.className,
        className,
      )}
    >
      {showDot && <span className={`h-2 w-2 rounded-full ${config.dotColor}`} aria-hidden="true" />}
      {config.label}
    </span>
  );
}
