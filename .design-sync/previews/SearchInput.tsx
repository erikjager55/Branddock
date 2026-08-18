import { SearchInput } from 'branddock-app';

const Kolom = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-sm">{children}</div>
);

export const Leeg = () => (
  <Kolom>
    <SearchInput value="" onChange={() => {}} placeholder="Zoek in je content..." />
  </Kolom>
);

export const MetZoekterm = () => (
  <Kolom>
    <SearchInput value="persona" onChange={() => {}} placeholder="Zoek in je content..." />
  </Kolom>
);
