// frontend/src/features/physicalPrescriptions/PatientPhysicalImagesPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  usePhysicianListImagesQuery,
  useAddImageCommentMutation,
} from './prescriptionImagesApi';
import ImageLightbox from './ImageLightbox';
import ImageCommentsList from './ImageCommentsList';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CommentInput({ imageId }) {
  const [body, setBody] = useState('');
  const [addComment, { isLoading }] = useAddImageCommentMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    try {
      await addComment({ imageId, body: body.trim() }).unwrap();
      setBody('');
    } catch {
      // silent; could add error state
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
      <Input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        className="h-8 text-sm"
        disabled={isLoading}
      />
      <Button type="submit" size="sm" variant="ghost" disabled={isLoading || !body.trim()} aria-label="Post comment">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function ImagePost({ image, allImages, imageIndex, onOpenLightbox, expandedId, onToggleExpand }) {
  const isExpanded = expandedId === image.imageId;

  return (
    <Card className="overflow-hidden">
      {/* Image */}
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
          {isExpanded ? 'Hide comments' : 'Comments'}
        </button>

        {isExpanded && (
          <div className="w-full space-y-3">
            <ImageCommentsList imageId={image.imageId} />
            <CommentInput imageId={image.imageId} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function PatientPhysicalImagesPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = usePhysicianListImagesQuery(patientId, { skip: !patientId });
  const images = data?.images ?? [];

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (imageId) => setExpandedId((prev) => (prev === imageId ? null : imageId));

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Physical Prescriptions
          </h1>
          <p className="text-sm text-muted-foreground">Patient-uploaded physical prescription images.</p>
        </div>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">Loading images…</p>
      )}

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Failed to load images. You may not be on this patient's care team.
        </p>
      )}

      {!isLoading && !isError && images.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          <p>This patient has not uploaded any physical prescription images yet.</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {images.map((img, idx) => (
            <ImagePost
              key={img.imageId}
              image={img}
              allImages={images}
              imageIndex={idx}
              onOpenLightbox={(i) => setLightboxIndex(i)}
              expandedId={expandedId}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}
    </section>
  );
}
