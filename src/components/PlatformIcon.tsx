import { getPlatformIcon, getPlatformLabel, type PlatformId } from '../lib/platforms';

interface PlatformIconProps {
  id: PlatformId | string;
  size?: number;
  className?: string;
}

export default function PlatformIcon({ id, size = 18, className = '' }: PlatformIconProps) {
  const src = getPlatformIcon(id);
  const label = getPlatformLabel(id);

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
