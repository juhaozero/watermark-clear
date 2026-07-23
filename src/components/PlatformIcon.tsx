import { getPlatformIcon, getPlatformLabel, type PlatformId } from '../lib/platforms';

interface PlatformIconProps {
  id: PlatformId | string;
  size?: number;
  className?: string;
}

function AutoDetectIcon({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function PlatformIcon({ id, size = 18, className = '' }: PlatformIconProps) {
  const label = getPlatformLabel(id);

  if (id === 'auto') {
    return <AutoDetectIcon size={size} className={className} />;
  }

  const src = getPlatformIcon(id);

  return (
    <img
      src={src}
      alt={`${label} 图标`}
      width={size}
      height={size}
      className={`shrink-0 rounded-sm object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
