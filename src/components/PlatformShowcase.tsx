import PlatformIcon from './PlatformIcon';
import { PLATFORMS } from '../lib/platforms';

export default function PlatformShowcase() {
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
      {PLATFORMS.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
        >
          <PlatformIcon id={p.id} size={20} />
          <span>{p.label}</span>
        </div>
      ))}
    </div>
  );
}
