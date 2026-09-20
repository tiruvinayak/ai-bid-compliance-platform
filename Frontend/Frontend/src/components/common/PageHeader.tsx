import React from 'react';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  badge
}) => {
  return (
    <div className="page-header flex-col sm:flex-row mb-6">
      <div className="page-header-content w-full">
        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs">
            <Link to="/dashboard" className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Portal</span>
            </Link>
            {breadcrumbs.map((item, index) => {
              const target = item.href || item.path;
              return (
                <React.Fragment key={index}>
                  <span className="breadcrumb-separator">/</span>
                  {target ? (
                    <Link to={target} className="truncate max-w-[200px]">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-900 font-semibold truncate max-w-[240px]">
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <h1 className="page-title">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && <p className="page-description">{subtitle}</p>}
      </div>

      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
};
