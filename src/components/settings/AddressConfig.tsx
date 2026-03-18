import type { ResolvedLocation } from '../../types/index.ts';
import { LocationSearch } from '../common/LocationSearch.tsx';
import { t } from '../../lib/i18n/index.ts';

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
        label={t.setup.homeLabel}
        value={homeAddress}
        onChange={onHomeChange}
        placeholder={t.setup.homePlaceholder}
      />
      <LocationSearch
        label={t.setup.workLabel}
        value={workAddress}
        onChange={onWorkChange}
        placeholder={t.setup.workPlaceholder}
      />
    </div>
  );
}
