import React from 'react';
import type { RiskLevel } from '../../types';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface RiskBadgeProps {
  risk: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk, size = 'md' }) => {
  const getStyle = () => {
    const normRisk = String(risk || '').toUpperCase();
    switch (normRisk) {
      case 'LOW':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />,
          label: 'LOW RISK'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />,
          label: 'MEDIUM RISK'
        };
      case 'HIGH':
      case 'CRITICAL':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: <ShieldX className="w-3.5 h-3.5 text-rose-700" />,
          label: `${normRisk} RISK`
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />,
          label: normRisk || 'LOW RISK'
        };
    }
  };

  const style = getStyle() || {
    bg: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />,
    label: 'LOW RISK'
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-2xs font-bold' : size === 'lg' ? 'px-3 py-1.5 text-sm font-bold' : 'px-2.5 py-1 text-xs font-bold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border ${style.bg} ${sizeClasses}`}>
      {style.icon}
      <span>{style.label}</span>
    </span>
  );
};
