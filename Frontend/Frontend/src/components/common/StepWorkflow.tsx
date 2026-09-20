import React from 'react';
import { Check } from 'lucide-react';

export interface WorkflowStep {
  number: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface StepWorkflowProps {
  steps: WorkflowStep[];
  onStepClick?: (index: number) => void;
}

export const StepWorkflow: React.FC<StepWorkflowProps> = ({ steps, onStepClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-xs">
      <ol className="flex items-center w-full justify-between gap-2 overflow-x-auto custom-scrollbar pb-1">
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <li
              key={idx}
              onClick={() => onStepClick && onStepClick(idx)}
              className={`flex items-center gap-3 shrink-0 ${
                onStepClick ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : isCurrent
                      ? 'bg-blue-900 text-white ring-4 ring-blue-100 font-extrabold'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.number}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold whitespace-nowrap ${
                      isCurrent
                        ? 'text-blue-950 font-extrabold'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-3xs text-slate-400 hidden lg:inline">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-12 mx-2 rounded ${
                    isCompleted ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                ></div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
