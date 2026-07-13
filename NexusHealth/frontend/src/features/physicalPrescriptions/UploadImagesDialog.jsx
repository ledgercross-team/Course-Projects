// frontend/src/features/physicalPrescriptions/UploadImagesDialog.jsx
import { useRef, useState } from 'react';
import { X, Upload, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUploadPrescriptionImagesMutation } from './prescriptionImagesApi';

const ACCEPT = 'image/jpeg,image/png,image/webp';

export default function UploadImagesDialog({ open, onOpenChange, patientId, recordId }) {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');

  const [upload, { isLoading }] = useUploadPrescriptionImagesMutation();

  const addFiles = (newFiles) => {
    const validated = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => {
      const combined = [...prev, ...validated];
      return combined.slice(0, 10);
    });
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrop = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (files.length === 0) {
      setError('Select at least one image.');
      return;
    }

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('recordId', recordId);
    if (caption.trim()) formData.append('caption', caption.trim());
    if (tags.length > 0) formData.append('tags', tags.join(','));
    files.forEach((f) => formData.append('files', f));

    try {
      await upload(formData).unwrap();
      setFiles([]);
      setCaption('');
      setTags([]);
      setTagInput('');
      onOpenChange(false);
    } catch (err) {
      setError(err?.data?.error || 'Upload failed.');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFiles([]);
      setCaption('');
      setTags([]);
      setTagInput('');
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Physical Prescriptions</DialogTitle>
            <DialogDescription>
              Upload photos of your paper prescriptions. Up to 10 images at once (JPEG, PNG, WebP, max 10 MB each).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload images"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center transition-colors hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <ImagePlus className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Drag & drop images here, or <span className="text-primary underline">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">{files.length}/10 selected</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {/* Previews */}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {files.map((file, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Notes / Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. From Dr. Smith visit on Jun 14"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tagInput">Tags (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tagInput"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  placeholder="Type a tag and press Enter or comma"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 rounded-full hover:bg-muted focus-visible:outline-none"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || files.length === 0}>
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {isLoading ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
