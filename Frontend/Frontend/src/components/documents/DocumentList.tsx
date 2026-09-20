import React from 'react';
import type { BidderDocument } from '../../types';
import { DocumentCard } from './DocumentCard';

interface DocumentListProps {
  documents: BidderDocument[];
  onRemove?: (id: string) => void;
  onViewDetails?: (doc: BidderDocument) => void;
  emptyMessage?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onRemove,
  onViewDetails,
  emptyMessage = "No bidder documents uploaded yet."
}) => {
  if (documents.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-sans">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onRemove={onRemove ? () => onRemove(doc.id) : undefined}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
};
