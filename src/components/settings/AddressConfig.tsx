import type { ResolvedLocation } from '../../types/index.ts';
import { LocationSearch } from '../common/LocationSearch.tsx';

interface AddressConfigProps {
  homeAddress: ResolvedLocation | null;
  workAddress: ResolvedLocation | null;
  onHomeChange: (loc: ResolvedLocation) => void;
  onWorkChange: (loc: ResolvedLocation) => void;
}

export function AddressConfig({
  homeAddress,
  workAddress,
  onHomeChange,
  onWorkChange,
}: AddressConfigProps) {
  return (
    <div className="space-y-4">
      <LocationSearch
        label="Privatadresse"
        value={homeAddress}
        onChange={onHomeChange}
        placeholder="z.B. Zürich Altstetten"
      />
      <LocationSearch
        label="Arbeitsadresse"
        value={workAddress}
        onChange={onWorkChange}
        placeholder="z.B. ETH Zürich"
      />
    </div>
  );
}
