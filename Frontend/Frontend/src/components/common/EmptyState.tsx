import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Requirements Found",
  message = "No evaluation criteria or evidence records matched the selected filter criteria.",
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-dashed border-slate-300 text-center my-6">
      <FileQuestion className="w-12 h-12 text-slate-400 mb-3" />
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{message}</p>
      {action}
    </div>
  );
};
