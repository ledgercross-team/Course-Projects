// frontend/src/features/physicalPrescriptions/PhysicalPrescriptionsPage.jsx
import { useState } from 'react';
import { Plus, Tag, Trash2, MessageSquare, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { useGetClinicalRecordsQuery } from '@/features/users/usersApi';
import { useListMyImagesQuery, useDeleteImageMutation } from './prescriptionImagesApi';
import UploadImagesDialog from './UploadImagesDialog';
import ImageLightbox from './ImageLightbox';
import ImageCommentsList from './ImageCommentsList';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ImagePost({
  image,
  imageIndex,
  onOpenLightbox,
  onDelete,
  isDeleting,
  expandedId,
  onToggleExpand,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isExpanded = expandedId === image.imageId;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="block w-full cursor-zoom-in"
        onClick={() => onOpenLightbox(imageIndex)}
        aria-label={`View image: ${image.caption || image.originalFilename}`}
      >
        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={image.secureUrl}
            alt={image.caption || image.originalFilename}
            className="h-full w-full object-cover transition-opacity hover:opacity-90"
            loading="lazy"
          />
        </div>
      </button>

      <CardContent className="space-y-2 p-4">
        {image.caption && (
          <p className="text-sm text-foreground">{image.caption}</p>
        )}
        {image.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{formatDate(image.uploadedAt)}</p>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t px-4 pb-4 pt-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onToggleExpand(image.imageId)}
          aria-expanded={isExpanded}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {isExpanded ? 'Hide doctor comments' : 'Doctor comments'}
        </button>

        {isExpanded && (
          <div className="w-full">
            <ImageCommentsList imageId={image.imageId} />
          </div>
        )}

        {confirmDelete ? (
          <div className="flex w-full items-center gap-2">
            <span className="flex-1 text-sm text-muted-foreground">Delete this image?</span>
            <Button
              size="sm"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => onDelete(image.imageId)}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function PhysicalPrescriptionsPage() {
  const user = useSelector(selectCurrentUser);
  const patientId = user?._id;

  const { data: recordsData } = useGetClinicalRecordsQuery(patientId, { skip: !patientId });
  const recordId = recordsData?.records?.[0]?.recordId ?? null;

  const { data, isLoading, isError } = useListMyImagesQuery(patientId, { skip: !patientId });
  const [deleteImage, { isLoading: isDeleting }] = useDeleteImageMutation();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const images = data?.images ?? [];
  const allTags = [...new Set(images.flatMap((img) => img.tags ?? []))].sort();
  const filtered = activeTag ? images.filter((img) => img.tags?.includes(activeTag)) : images;

  const handleDelete = async (imageId) => {
    try {
      await deleteImage(imageId).unwrap();
    } catch {
      // silent; could add toast
    }
  };

  const toggleExpand = (imageId) => setExpandedId((prev) => (prev === imageId ? null : imageId));

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Physical Prescriptions
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Upload and manage your physical prescription images.
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          disabled={!recordId}
          title={!recordId ? 'Clinical record not found' : undefined}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Upload Images
        </Button>
      </header>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTag === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="ml-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">Loading images…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive" role="alert">Failed to load images.</p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
          <p>{activeTag ? `No images tagged "${activeTag}".` : 'No images uploaded yet.'}</p>
          {!activeTag && (
            <Button variant="outline" onClick={() => setUploadOpen(true)} disabled={!recordId}>
              <Plus className="mr-2 h-4 w-4" />
              Upload your first image
            </Button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {filtered.map((img, idx) => (
            <ImagePost
              key={img.imageId}
              image={img}
              imageIndex={idx}
              onOpenLightbox={(i) => setLightboxIndex(i)}
              onDelete={handleDelete}
              isDeleting={isDeleting}
              expandedId={expandedId}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={filtered}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}

      {recordId && (
        <UploadImagesDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          patientId={patientId}
          recordId={recordId}
        />
      )}
    </section>
  );
}
