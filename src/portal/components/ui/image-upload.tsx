import { useCallback, useRef, useState } from 'react';
import { Upload, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Input } from '@/portal/components/ui/input';
import { Button } from '@/portal/components/ui/button';
import { apiFetch } from '@/portal/api/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  previewHeight?: string;
  folder?: string;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

export function ImageUpload({
  value,
  onChange,
  label,
  placeholder = 'Paste URL or upload a file...',
  previewHeight = 'h-32',
  folder = 'general',
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'url' | 'upload'>('url');

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`Unsupported file type (${ext || 'unknown'}). Please choose a JPG, PNG, WebP, or GIF image.`);
        if (fileRef.current) fileRef.current.value = '';
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`);
        if (fileRef.current) fileRef.current.value = '';
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const data = await apiFetch<{ url?: string; filename?: string; storage?: string }>(
          `/uploads?folder=${encodeURIComponent(folder)}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (data?.url) {
          onChange(data.url);
          toast.success(`${file.name} uploaded successfully`);
        } else {
          throw new Error('Upload finished but storage URL was missing from server response.');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Image upload failed. Please try again.';
        console.error('Image upload error:', err);
        toast.error(`Upload failed: ${message}`);
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [folder, onChange],
  );

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="flex gap-1 mb-1">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`text-xs px-2 py-0.5 rounded ${mode === 'url' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LinkIcon className="inline h-3 w-3 mr-1" />URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`text-xs px-2 py-0.5 rounded ${mode === 'upload' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Upload className="inline h-3 w-3 mr-1" />Upload
        </button>
      </div>

      {mode === 'url' ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
      ) : (
        <div
          onClick={() => {
            if (!uploading) fileRef.current?.click();
          }}
          className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${
            uploading
              ? 'border-blue-300 bg-blue-50/50 cursor-wait'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50 cursor-pointer'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Uploading image...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">Click to choose a file (JPG, PNG, WebP up to 10MB)</span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
      )}

      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className={`${previewHeight} rounded-lg object-cover border`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-5 w-5 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
