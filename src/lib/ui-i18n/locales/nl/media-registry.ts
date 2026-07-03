// Nederlandse UI-strings — `media-registry` namespace.
// Render-edge labels voor de media-library registries (type, categorie, sortering).
const mediaRegistry = {
  type: {
    IMAGE: 'Afbeelding',
    DOCUMENT: 'Document',
    VIDEO: 'Video',
    AUDIO: 'Audio',
  },
  category: {
    LOGO: 'Logo',
    BRAND_MARK: 'Merkmerk',
    ICON: 'Icoon',
    ILLUSTRATION: 'Illustratie',
    PHOTOGRAPHY: 'Fotografie',
    LIFESTYLE: 'Lifestyle',
    PRODUCT_PHOTO: 'Productfoto',
    TEAM_PHOTO: 'Teamfoto',
    EVENT_PHOTO: 'Eventfoto',
    HERO_IMAGE: 'Hero-afbeelding',
    BANNER: 'Banner',
    SOCIAL_MEDIA: 'Social media',
    ADVERTISEMENT: 'Advertentie',
    INFOGRAPHIC: 'Infographic',
    PRESENTATION: 'Presentatie',
    VIDEO_CONTENT: 'Videocontent',
    ANIMATION: 'Animatie',
    AUDIO_CONTENT: 'Audiocontent',
    DOCUMENT_FILE: 'Document',
    TEMPLATE: 'Template',
    MOCKUP: 'Mockup',
    TEXTURE: 'Textuur',
    PATTERN: 'Patroon',
    BACKGROUND: 'Achtergrond',
    OTHER: 'Overig',
  },
  sort: {
    createdAt: { desc: 'Nieuwste eerst', asc: 'Oudste eerst' },
    name: { asc: 'Naam A-Z', desc: 'Naam Z-A' },
    fileSize: { desc: 'Grootste eerst', asc: 'Kleinste eerst' },
  },
} as const;

export default mediaRegistry;
