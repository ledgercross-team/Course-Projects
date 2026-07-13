// frontend/src/features/consent/ProviderSearchCombobox.jsx
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLazySearchProvidersQuery } from '@/features/users/usersApi';
import { cn } from '@/lib/utils';

export default function ProviderSearchCombobox({ value, onChange, initialLabel = '', label = 'Primary physician' }) {
  const [userInput, setUserInput] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerSearch, { data, isFetching }] = useLazySearchProvidersQuery();

  const searchTerm = userInput ?? initialLabel;

  useEffect(() => {
    if (searchTerm.trim().length < 2) return undefined;

    const timeout = window.setTimeout(() => {
      triggerSearch(searchTerm.trim());
      setIsOpen(true);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchTerm, triggerSearch]);

  const providers = data?.providers || [];

  return (
    <div className="relative space-y-2">
      <Label htmlFor="providerSearch">{label}</Label>
      <Input
        id="providerSearch"
        value={searchTerm}
        onChange={(event) => {
          setUserInput(event.target.value);
          onChange(null);
        }}
        onFocus={() => {
          if (providers.length > 0) setIsOpen(true);
        }}
        placeholder="Search by name or NPI"
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">
        {isFetching ? 'Searching…' : 'Type at least 2 characters to search clinicians.'}
      </p>

      {isOpen && providers.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow-md">
          {providers.map((provider) => (
            <li key={provider.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  value === provider.id && 'bg-primary/10',
                )}
                onClick={() => {
                  onChange(provider);
                  setUserInput(`${provider.displayName} · NPI ${provider.npiNumber}`);
                  setIsOpen(false);
                }}
              >
                <span className="font-medium">{provider.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  NPI {provider.npiNumber} · {(provider.specializations || []).join(', ') || provider.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
