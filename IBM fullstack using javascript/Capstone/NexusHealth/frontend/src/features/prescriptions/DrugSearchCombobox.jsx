// frontend/src/features/prescriptions/DrugSearchCombobox.jsx
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { cn } from '@/lib/utils';
import { useSearchDrugsQuery } from './drugsApi';

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 150;

export default function DrugSearchCombobox({
  value,
  onChange,
  onInputChange,
  label = 'Drug',
  inputId = 'drugSearch',
}) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(searchQuery, DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const shouldSearch = trimmedQuery.length >= MIN_SEARCH_LENGTH && !value;

  const { data, isFetching, isError, error } = useSearchDrugsQuery(trimmedQuery, {
    skip: !shouldSearch,
  });

  const drugList = shouldSearch ? (data?.results?.drugs ?? []) : [];

  useEffect(() => {
    if (!value) return;
    setInputValue(value.name);
    setSearchQuery('');
    setIsOpen(false);
  }, [value]);

  useEffect(() => {
    if (!shouldSearch) {
      if (!value) setIsOpen(false);
      return;
    }

    if (drugList.length > 0) {
      setIsOpen(true);
    }
  }, [shouldSearch, drugList.length, value]);

  const handleInputChange = (nextValue) => {
    setInputValue(nextValue);
    setSearchQuery(nextValue);
    onChange(null);
    onInputChange?.();
    if (nextValue.trim().length >= MIN_SEARCH_LENGTH) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelectDrug = (drug) => {
    onChange(drug);
    setInputValue(drug.name);
    setSearchQuery('');
    setIsOpen(false);
  };

  const showDropdown = isOpen && !value && drugList.length > 0;

  return (
    <div className="relative space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onFocus={() => {
          if (!value && drugList.length > 0) setIsOpen(true);
        }}
        placeholder="Search drug name"
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">
        {isFetching
          ? 'Searching…'
          : isError
            ? error?.data?.error || 'Drug search failed.'
            : shouldSearch && drugList.length === 0 && !isFetching
              ? 'No matching drugs found.'
              : `Type at least ${MIN_SEARCH_LENGTH} characters.`}
      </p>
      {showDropdown && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-background shadow-md">
          {drugList.map((drug) => (
            <li key={drug.rxcui}>
              <button
                type="button"
                className={cn(
                  'flex w-full flex-col px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  value?.rxcui === drug.rxcui && 'bg-primary/10',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelectDrug(drug)}
              >
                <span className="font-medium">{drug.name}</span>
                <span className="font-mono text-xs text-muted-foreground">RxCUI {drug.rxcui}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
