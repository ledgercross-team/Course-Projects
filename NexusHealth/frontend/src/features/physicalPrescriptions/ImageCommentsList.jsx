// frontend/src/features/physicalPrescriptions/ImageCommentsList.jsx
import { useListImageCommentsQuery } from './prescriptionImagesApi';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ImageCommentsList({ imageId }) {
  const { data, isLoading, isError } = useListImageCommentsQuery(imageId);

  const comments = data?.comments ?? [];

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading comments…</p>;
  }

  if (isError) {
    return <p className="text-xs text-destructive">Unable to load comments.</p>;
  }

  if (comments.length === 0) {
    return <p className="text-xs text-muted-foreground">No comments yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {comments.map((comment, idx) => (
        <li key={comment._id || idx} className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">
            {comment.authorId?.demographics?.legalName
              ? `${comment.authorId.demographics.legalName.first} ${comment.authorId.demographics.legalName.last}`
              : comment.authorRole}
            <span className="ml-1 font-normal text-muted-foreground">({comment.authorRole})</span>
          </span>
          <span className="text-sm text-foreground">{comment.body}</span>
          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
