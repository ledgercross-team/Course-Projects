// frontend/src/features/doctors/DoctorCard.jsx
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DoctorCard({ doctor, onRemove, isRemoving }) {
  const specializations = (doctor.specializations || []).join(', ') || doctor.role;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg">{doctor.displayName}</CardTitle>
          {doctor.isPrimary && <Badge className="shrink-0 whitespace-nowrap">Primary</Badge>}
        </div>
        <CardDescription className="font-mono text-xs">NPI {doctor.npiNumber}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{specializations}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isRemoving}
          onClick={() => onRemove(doctor.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </CardContent>
    </Card>
  );
}
