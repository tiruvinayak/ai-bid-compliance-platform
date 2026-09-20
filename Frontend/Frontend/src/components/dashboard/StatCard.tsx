import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'blue' | 'amber' | 'rose' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue'
}) => {
  const getColors = () => {
    switch (variant) {
      case 'amber':
        return 'border-l-4 border-l-amber-500 text-amber-950 bg-amber-50/40';
      case 'rose':
        return 'border-l-4 border-l-rose-600 text-rose-950 bg-rose-50/40';
      case 'emerald':
        return 'border-l-4 border-l-emerald-600 text-emerald-950 bg-emerald-50/40';
      default:
        return 'border-l-4 border-l-blue-800 text-blue-950 bg-blue-50/30';
    }
  };

  return (
    <div className={`p-5 rounded-lg border border-slate-200 bg-white shadow-2xs ${getColors()} flex items-center justify-between`}>
      <div>
        <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
        {subtitle && <p className="text-3xs font-medium text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-3 rounded-md bg-slate-100/80 text-slate-700 shrink-0">
        {icon}
      </div>
    </div>
  );
};
