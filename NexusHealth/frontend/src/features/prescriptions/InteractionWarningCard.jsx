// frontend/src/features/prescriptions/InteractionWarningCard.jsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TIER_STYLES = {
  HARD_STOP: 'border-destructive/40 bg-destructive/10 text-destructive',
  SOFT_WARNING: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const TIER_LABELS = {
  HARD_STOP: 'Hard stop',
  SOFT_WARNING: 'Warning',
};

function SeverityBadge({ tier }) {
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 font-semibold', TIER_STYLES[tier] || TIER_STYLES.SOFT_WARNING)}
    >
      {TIER_LABELS[tier] || tier}
    </Badge>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-0.5 text-muted-foreground">{value}</dd>
    </div>
  );
}

function OpenFdaSection({ openFda }) {
  if (!openFda?.warningsExcerpt && !openFda?.contraindicationsExcerpt) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">openFDA label</p>
      {openFda.warningsExcerpt && (
        <DetailRow label="Warnings" value={openFda.warningsExcerpt} />
      )}
      {openFda.contraindicationsExcerpt && (
        <DetailRow label="Contraindications" value={openFda.contraindicationsExcerpt} />
      )}
    </div>
  );
}

function InteractionItem({ interaction }) {
  const [expanded, setExpanded] = useState(false);
  const summary =
    interaction.mechanismDescription ||
    interaction.rxcheck?.mechanism ||
    'Drug interaction detected';

  return (
    <Card className="border-amber-500/30 shadow-none">
      <CardHeader className="p-4 pb-0">
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <SeverityBadge tier={interaction.tier} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {interaction.activeDrugName} + {interaction.newDrugName}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{summary}</p>
            {interaction.prescribedByName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Active med prescribed by {interaction.prescribedByName}
              </p>
            )}
          </div>
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 pt-3">
          <dl className="space-y-2 text-sm">
            <DetailRow label="Mechanism" value={interaction.mechanismDescription || interaction.rxcheck?.mechanism} />
            <DetailRow label="Clinical consequence" value={interaction.clinicalConsequence || interaction.rxcheck?.clinical_consequence} />
            <DetailRow label="Evidence level" value={interaction.evidenceLevel || interaction.rxcheck?.severity} />
            {(interaction.oncHighPriority || interaction.rxcheck?.onc_high_priority) && (
              <DetailRow label="ONC high priority" value="Yes" />
            )}
            <DetailRow label="Management" value={interaction.rxcheck?.management} />
          </dl>
          <OpenFdaSection openFda={interaction.openFda} />
        </CardContent>
      )}
    </Card>
  );
}

function AllergyFlagItem({ flag }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-destructive/30 shadow-none">
      <CardHeader className="p-4 pb-0">
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <SeverityBadge tier={flag.tier || 'HARD_STOP'} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              Allergy: {flag.allergenName}
              {flag.newDrugName ? ` vs ${flag.newDrugName}` : ''}
            </p>
            {flag.reactionDescription && (
              <p className="mt-0.5 text-sm text-muted-foreground">{flag.reactionDescription}</p>
            )}
            {flag.severity && (
              <p className="mt-1 text-xs text-muted-foreground">Severity: {flag.severity}</p>
            )}
          </div>
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 pt-3">
          <OpenFdaSection openFda={flag.openFda} />
        </CardContent>
      )}
    </Card>
  );
}

export default function InteractionWarningCard({ interactions = [], allergyFlags = [] }) {
  const hasInteractions = interactions.length > 0;
  const hasAllergies = allergyFlags.length > 0;

  if (!hasInteractions && !hasAllergies) return null;

  return (
    <div className="space-y-3">
      {hasInteractions && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Drug interaction warnings</p>
          {interactions.map((interaction) => (
            <InteractionItem
              key={`${interaction.drug1RxnormCui}-${interaction.drug2RxnormCui}`}
              interaction={interaction}
            />
          ))}
        </div>
      )}

      {hasAllergies && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Allergy contraindications</p>
          {allergyFlags.map((flag) => (
            <AllergyFlagItem
              key={`${flag.allergenRxnormCui}-${flag.newDrugRxnormCui || flag.allergenName}`}
              flag={flag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
