import { FilterBar } from 'branddock-app';

const noop = () => {};

const Select = ({ label }: { label: string }) => (
  <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700" defaultValue="">
    <option value="">{label}</option>
  </select>
);

export const MetFiltersEnWeergave = () => (
  <FilterBar
    searchValue=""
    onSearchChange={noop}
    searchPlaceholder="Zoek in content..."
    viewMode="grid"
    onViewModeChange={noop}
    filters={
      <div className="flex items-center gap-2">
        <Select label="Alle types" />
        <Select label="Alle statussen" />
      </div>
    }
  />
);

export const MetZoekterm = () => (
  <FilterBar
    searchValue="persona"
    onSearchChange={noop}
    searchPlaceholder="Zoek in content..."
    viewMode="list"
    onViewModeChange={noop}
  />
);

export const AlleenZoeken = () => (
  <FilterBar searchValue="" onSearchChange={noop} searchPlaceholder="Zoek een concurrent..." />
);
