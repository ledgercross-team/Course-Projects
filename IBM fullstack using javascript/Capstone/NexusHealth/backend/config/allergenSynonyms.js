// backend/config/allergenSynonyms.js
// Common drug-class terms that may appear on FDA labels when the patient allergy name differs.

const ALLERGEN_SYNONYMS = {
  penicillin: ['beta-lactam', 'beta lactam', 'penicillins', 'amoxicillin', 'ampicillin'],
  amoxicillin: ['penicillin', 'beta-lactam', 'beta lactam', 'penicillins'],
  ampicillin: ['penicillin', 'beta-lactam', 'beta lactam', 'penicillins'],
  sulfa: ['sulfonamide', 'sulfonamides', 'sulfamethoxazole'],
  sulfonamide: ['sulfa', 'sulfonamides', 'sulfamethoxazole'],
  aspirin: ['salicylate', 'salicylates', 'nsaid', 'nsaids'],
  codeine: ['opioid', 'opioids', 'morphine'],
};

const buildAllergenSearchTerms = (allergenName) => {
  const normalizedName = String(allergenName || '').trim().toLowerCase();
  const terms = new Set();

  if (normalizedName.length >= 4) {
    terms.add(normalizedName);
  }

  const synonyms = ALLERGEN_SYNONYMS[normalizedName] || [];
  for (const synonym of synonyms) {
    if (synonym.length >= 4) {
      terms.add(synonym.toLowerCase());
    }
  }

  return [...terms];
};

module.exports = {
  ALLERGEN_SYNONYMS,
  buildAllergenSearchTerms,
};
