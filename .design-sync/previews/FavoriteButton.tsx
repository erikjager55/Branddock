import { FavoriteButton } from 'branddock-app';

const noop = () => {};

const Rij = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    {children}
    <span className="text-sm text-gray-600">{label}</span>
  </div>
);

export const Favoriet = () => (
  <Rij label="Gemarkeerd als favoriet">
    <FavoriteButton isFavorite onToggle={noop} />
  </Rij>
);

export const GeenFavoriet = () => (
  <Rij label="Niet gemarkeerd">
    <FavoriteButton isFavorite={false} onToggle={noop} />
  </Rij>
);

export const Klein = () => (
  <Rij label="Compacte variant (sm) in lijstweergave">
    <FavoriteButton isFavorite size="sm" onToggle={noop} />
  </Rij>
);
