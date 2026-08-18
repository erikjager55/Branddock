import { BrandContextTagsEditor } from 'branddock-app';

const merkTags = ['helder', 'zonder jargon', 'nuchter', 'onderbouwd', 'Nederlands'];

export const MetSelectie = () => (
  <BrandContextTagsEditor
    initialTags={merkTags}
    customTags={['MKB-gericht']}
    selectedTags={new Set(['helder', 'nuchter', 'MKB-gericht'])}
    onToggleTag={() => {}}
    onAddCustomTag={() => {}}
  />
);

export const Laden = () => (
  <BrandContextTagsEditor
    initialTags={[]}
    customTags={[]}
    selectedTags={new Set()}
    onToggleTag={() => {}}
    onAddCustomTag={() => {}}
    isLoading
  />
);
