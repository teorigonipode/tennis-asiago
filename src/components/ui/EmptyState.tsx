import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-cream-100 p-4 text-wood-400">
        <Icon className="h-8 w-8" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-forest-800">{title}</h3>
      {description && <p className="max-w-md text-sm text-cream-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
