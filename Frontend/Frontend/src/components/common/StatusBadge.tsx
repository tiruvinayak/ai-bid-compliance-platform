import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  AlertOctagon, 
  FileCheck2, 
  Clock, 
  ShieldAlert,
  Info
} from 'lucide-react';

export type BadgeStatus = 
  | 'PASS' 
  | 'FAIL' 
  | 'MISSING' 
  | 'REVIEW' 
  | 'CONFLICT' 
  | 'PROCESSED' 
  | 'PROCESSING' 
  | 'UPLOADED' 
  | 'COMPLETED' 
  | 'DRAFT' 
  | 'CRITICAL' 
  | 'HIGH' 
  | 'MEDIUM' 
  | 'LOW' 
  | string;

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const getBadgeConfig = () => {
    const norm = String(status || '').toUpperCase().trim();

    switch (norm) {
      case 'PASS':
      case 'PASSED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
          label: 'PASS'
        };

      case 'COMPLETED':
      case 'ACTIVE':
      case 'VERIFIED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
          label: norm
        };

      case 'FAIL':
      case 'FAILED':
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
          label: 'FAIL'
        };

      case 'MISSING':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
          label: 'MISSING'
        };

      case 'REVIEW':
      case 'REVIEW REQUIRED':
      case 'UNDER REVIEW':
      case 'PENDING':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
          label: norm === 'UNDER REVIEW' ? 'UNDER REVIEW' : 'REVIEW'
        };

      case 'CONFLICT':
      case 'DISCREPANCY':
        return {
          bg: 'bg-purple-50 text-purple-900 border-purple-300 font-bold',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
          label: 'CONFLICT'
        };

      case 'PROCESSED':
      case 'UPLOADED':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
          icon: <FileCheck2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
          label: norm
        };

      case 'PROCESSING':
      case 'IN_PROGRESS':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-300 font-semibold animate-pulse',
          icon: <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0 animate-spin" />,
          label: 'PROCESSING'
        };

      case 'CRITICAL':
        return {
          bg: 'bg-rose-100 text-rose-950 border-rose-400 font-extrabold uppercase',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-700 shrink-0" />,
          label: 'CRITICAL'
        };

      case 'HIGH':
        return {
          bg: 'bg-orange-50 text-orange-900 border-orange-300 font-bold',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />,
          label: 'HIGH'
        };

      case 'MEDIUM':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
          label: 'MEDIUM'
        };

      case 'LOW':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
          icon: <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
          label: 'LOW'
        };

      case 'DRAFT':
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-300 font-medium',
          icon: <HelpCircle className="w-3.5 h-3.5 text-gray-500 shrink-0" />,
          label: 'DRAFT'
        };

      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
          icon: null,
          label: norm || 'UNKNOWN'
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses = 
    size === 'sm' ? 'px-2 py-0.5 text-3xs' : 
    size === 'lg' ? 'px-3 py-1 text-xs' : 
    'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border shadow-2xs ${config.bg} ${sizeClasses} ${className}`}>
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
