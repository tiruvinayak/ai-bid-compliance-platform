import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Evaluation System Error",
  message = "Unable to load compliance records from backend verification service. Please check your network connection.",
  onRetry
}) => {
  return (
    <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 my-6 flex flex-col items-start gap-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold">{title}</h4>
           <p className="text-xs text-rose-700 mt-1">{message || 'The requested record is unavailable.'}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-medium hover:bg-rose-800 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
