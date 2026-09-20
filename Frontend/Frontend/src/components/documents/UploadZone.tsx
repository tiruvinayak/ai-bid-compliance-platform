import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, FileCode, Image as ImageIcon, Presentation } from 'lucide-react';

interface UploadZoneProps {
  title: string;
  subtitle?: string;
  allowedTypes?: string[];
  onFileUpload: (file: File) => void | Promise<void>;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMb?: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  title,
  subtitle = "Drag & drop procurement documents here, or click to browse",
  allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'],
  onFileUpload,
  multiple = true,
  maxFiles = multiple ? 10 : 1,
  maxSizeMb = 50
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (files: File[]) => {
    setValidationError('');
    if (files.length > maxFiles) {
      setValidationError(`Select no more than ${maxFiles} file${maxFiles === 1 ? '' : 's'} at a time.`);
      return;
    }

    const invalidType = files.find((file) => {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
      return !allowedTypes.map((type) => type.toLowerCase()).includes(extension);
    });
    if (invalidType) {
      setValidationError(`${invalidType.name} is not an accepted file type.`);
      return;
    }

    const oversized = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (oversized) {
      setValidationError(`${oversized.name} exceeds the ${maxSizeMb} MB file size limit.`);
      return;
    }

    for (const file of files) {
      try {
        await onFileUpload(file);
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : 'The file could not be uploaded.');
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center font-sans ${
        isDragging
          ? "border-blue-700 bg-blue-50/80 shadow-md"
          : "border-slate-300 hover:border-blue-800 hover:bg-slate-50/80 bg-white"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={allowedTypes.join(',')}
        onChange={handleChange}
        className="hidden"
      />

      <div className="p-3.5 bg-blue-50 text-blue-900 rounded-full mb-3 shadow-2xs border border-blue-200">
        <UploadCloud className="w-8 h-8" />
      </div>

      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">{subtitle}</p>

      {/* Format Icons bar */}
      <div className="flex items-center justify-center gap-3 my-3 py-2 px-4 bg-slate-50 rounded-lg border border-slate-200 text-3xs text-slate-600">
        <div className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-rose-600" /> PDF</div>
        <div className="flex items-center gap-1"><FileCode className="w-3.5 h-3.5 text-blue-600" /> DOC/DOCX</div>
        <div className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> XLS/XLSX/CSV</div>
        <div className="flex items-center gap-1"><Presentation className="w-3.5 h-3.5 text-amber-600" /> PPT/PPTX</div>
        <div className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5 text-purple-600" /> JPG/PNG</div>
      </div>

       <span className="text-3xs font-extrabold font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
         {allowedTypes.join(', ').toUpperCase()} • MAX {maxSizeMb} MB • MAX {maxFiles} FILE{maxFiles === 1 ? '' : 'S'}
       </span>
       {validationError && <p className="mt-3 text-xs font-semibold text-rose-700" role="alert">{validationError}</p>}
    </div>
  );
};
