import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading procurement evaluation data...",
  subtext = "Verifying bidder compliance records against GeM standards"
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200 shadow-2xs text-center my-6">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-800 animate-spin"></div>
        <Loader2 className="w-6 h-6 text-blue-800 absolute top-3 left-3 animate-pulse" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{message}</h3>
      <p className="text-xs text-slate-500 max-w-md">{subtext}</p>
    </div>
  );
};
