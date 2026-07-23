import PlatformIcon from './PlatformIcon';
import { CONTENT_PLATFORMS } from '../lib/platforms';

export default function PlatformShowcase() {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-6 sm:gap-x-3">
      {CONTENT_PLATFORMS.map((p) => (
        <div
          key={p.id}
          className="flex flex-col items-center gap-2.5 text-center"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:ring-slate-700/70">
            <PlatformIcon id={p.id} size={22} />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {p.label === '哔哩哔哩' ? 'B站' : p.label}
          </span>
        </div>
      ))}
    </div>
  );
}
