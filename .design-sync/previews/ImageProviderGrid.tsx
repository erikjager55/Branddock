import { ImageProviderGrid } from 'branddock-app';

const providers = [
  { id: 'flux-pro', label: 'FLUX Pro', description: 'Scherp en fotorealistisch; sterk bij mensen.', cost: '4 credits', preview: '' },
  { id: 'imagen', label: 'Imagen', description: 'Goede tekstweergave in beeld.', cost: '3 credits', preview: '' },
  { id: 'recraft', label: 'Recraft', description: 'Vectorachtige illustraties en iconen.', cost: '2 credits', preview: '' },
  { id: 'ideogram', label: 'Ideogram', description: 'Typografie en logo-achtige composities.', cost: '3 credits', preview: '' },
];

export const MetSelectie = () => (
  <ImageProviderGrid providers={providers} selectedId="flux-pro" onSelect={() => {}} />
);

export const AndereKeuze = () => (
  <ImageProviderGrid providers={providers} selectedId="recraft" onSelect={() => {}} />
);
