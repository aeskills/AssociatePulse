import React, { useRef, useState } from 'react';
import { Upload, X, FileImage, FileVideo, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UploadedMedia {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  thumbnailUrl?: string;
  drivePath?: string;
}

export interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  uploads: UploadedMedia[];
  onDeleteUpload: (id: string) => void;
}

export default function UploadZone({
  onFilesSelected,
  uploads,
  onDeleteUpload
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop box area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
          dragActive 
            ? 'border-primary-500 bg-primary-50/20' 
            : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          <Upload size={22} className="text-slate-500" />
        </div>

        <p className="text-sm font-bold text-slate-700">Drag & drop photos or videos here</p>
        <p className="text-xs text-slate-405 text-slate-450 mt-1">or click to browse from files</p>
        <p className="text-[10px] text-slate-400 font-medium mt-3">Supports multiple files (Images / MP4 up to 50MB)</p>
      </div>

      {/* Upload queue list */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Upload Queue ({uploads.length})
            </h4>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl border border-red-200/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload size={13} />
              <span>+ Add More Files</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploads.map((item) => {
              const isImage = item.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              
              return (
                <div key={item.id} className="flex gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl relative group">
                  {/* Thumbnail / Icon container */}
                  <div className="w-12 h-12 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-300/30">
                    {isImage && item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
                    ) : isImage ? (
                      <FileImage size={20} className="text-slate-400" />
                    ) : (
                      <FileVideo size={20} className="text-slate-400" />
                    )}
                  </div>

                  {/* File Upload progress details */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.size} · {item.status}</p>
                    
                    {/* Progress Bar */}
                    {item.status === 'uploading' && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-primary-500 h-full rounded-full transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.status === 'completed' && item.drivePath && (
                      <p className="text-[9px] text-emerald-600 font-extrabold truncate mt-1 bg-emerald-50 border border-emerald-100 rounded px-1 py-0.5 inline-block">
                        Saved: {item.drivePath.replace("Drive / ", "")}
                      </p>
                    )}
                  </div>

                  {/* Right hand actions */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {item.status === 'completed' && item.thumbnailUrl && (
                      <a
                        href={item.thumbnailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
                      >
                        <Eye size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteUpload(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
