// frontend/src/features/physicalPrescriptions/ImageLightbox.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ImageLightbox({ images, currentIndex, onClose, onNavigate }) {
  const image = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const viewportRef = useRef(null);
  const imgRef = useRef(null);

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);

  const computeFitScale = useCallback((imgEl, viewportEl) => {
    if (!imgEl?.naturalWidth || !viewportEl) return 1;
    const availableW = viewportEl.clientWidth - 32;
    const availableH = viewportEl.clientHeight - 32;
    return Math.min(
      availableW / imgEl.naturalWidth,
      availableH / imgEl.naturalHeight,
    );
  }, []);

  const recalculateFit = useCallback(() => {
    const imgEl = imgRef.current;
    const viewportEl = viewportRef.current;
    if (!imgEl?.naturalWidth || !viewportEl) return;

    setNaturalSize({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
    setFitScale(computeFitScale(imgEl, viewportEl));
    setUserZoom(1);
  }, [computeFitScale]);

  const handleImageLoad = () => {
    recalculateFit();
  };

  useEffect(() => {
    setNaturalSize({ width: 0, height: 0 });
    setUserZoom(1);
  }, [currentIndex, image?.secureUrl]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return undefined;

    const observer = new ResizeObserver(() => {
      const imgEl = imgRef.current;
      if (imgEl?.naturalWidth) {
        setFitScale(computeFitScale(imgEl, viewportEl));
      }
    });

    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [computeFitScale]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
      if (event.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
      if (event.key === '+' || event.key === '=') {
        setUserZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
      }
      if (event.key === '-') {
        setUserZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
      }
      if (event.key === '0') setUserZoom(1);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setUserZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
  };

  if (!image) return null;

  const totalScale = fitScale * userZoom;
  const displayWidth = naturalSize.width > 0 ? naturalSize.width * totalScale : undefined;
  const displayHeight = naturalSize.height > 0 ? naturalSize.height * totalScale : undefined;
  const zoomPercent = Math.round(userZoom * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={() => setUserZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            disabled={userZoom <= ZOOM_MIN}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="min-w-[4rem] text-center text-sm text-white/80">
            {zoomPercent}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={() => setUserZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            disabled={userZoom >= ZOOM_MAX}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={() => setUserZoom(1)}
            aria-label="Fit to screen"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <p className="hidden text-xs text-white/50 sm:block">
          Opens fit-to-screen · Scroll or +/- to zoom
        </p>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <div
          ref={viewportRef}
          className="h-full w-full overflow-auto"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
        >
          <div className="flex min-h-full min-w-full items-center justify-center p-4">
            <img
              ref={imgRef}
              src={image.secureUrl}
              alt={image.caption || image.originalFilename}
              onLoad={handleImageLoad}
              className="rounded-md"
              style={{
                width: displayWidth,
                height: displayHeight,
                maxWidth: 'none',
                maxHeight: 'none',
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>

      <div
        className="shrink-0 space-y-1 border-t border-white/10 px-4 py-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {image.caption && <p className="text-sm text-white">{image.caption}</p>}
        {image.tags?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {image.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-white/50">
          {currentIndex + 1} / {images.length} · {formatDate(image.uploadedAt)}
        </p>
      </div>
    </div>
  );
}
