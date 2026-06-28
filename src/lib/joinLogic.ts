import { Specimen, PharmacItem } from '../types';

/**
 * Builds a Map index from specimen managementId to its associated PharmacItem
 * for fast O(1) JOIN lookups.
 */
export function buildSpecimenToPharmacIndex(pharmacopoeia: PharmacItem[]): Map<string, PharmacItem> {
  const index = new Map<string, PharmacItem>();
  for (const p of pharmacopoeia) {
    if (p.specimenIds && Array.isArray(p.specimenIds)) {
      for (const id of p.specimenIds) {
        index.set(id, p);
      }
    }
  }
  return index;
}

/**
 * Checks if a specimen belongs to a pharmacopoeia item and returns the item.
 */
export function getPharmacItemForSpecimen(
  specimen: Specimen,
  index: Map<string, PharmacItem>
): PharmacItem | null {
  if (!specimen || !specimen.managementId) return null;
  return index.get(specimen.managementId) || null;
}
