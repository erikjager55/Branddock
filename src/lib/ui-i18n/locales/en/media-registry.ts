// Canonical English UI strings — `media-registry` namespace.
// Render-edge labels for the media-library data registries (media type,
// category, sort). Keyed on the stable enum value / sort key; the constant
// files stay the English source of truth.
const mediaRegistry = {
  type: {
    IMAGE: 'Image',
    DOCUMENT: 'Document',
    VIDEO: 'Video',
    AUDIO: 'Audio',
  },
  category: {
    LOGO: 'Logo',
    BRAND_MARK: 'Brand Mark',
    ICON: 'Icon',
    ILLUSTRATION: 'Illustration',
    PHOTOGRAPHY: 'Photography',
    LIFESTYLE: 'Lifestyle',
    PRODUCT_PHOTO: 'Product Photo',
    TEAM_PHOTO: 'Team Photo',
    EVENT_PHOTO: 'Event Photo',
    HERO_IMAGE: 'Hero Image',
    BANNER: 'Banner',
    SOCIAL_MEDIA: 'Social Media',
    ADVERTISEMENT: 'Advertisement',
    INFOGRAPHIC: 'Infographic',
    PRESENTATION: 'Presentation',
    VIDEO_CONTENT: 'Video Content',
    ANIMATION: 'Animation',
    AUDIO_CONTENT: 'Audio Content',
    DOCUMENT_FILE: 'Document',
    TEMPLATE: 'Template',
    MOCKUP: 'Mockup',
    TEXTURE: 'Texture',
    PATTERN: 'Pattern',
    BACKGROUND: 'Background',
    OTHER: 'Other',
  },
  // Nested so the `field:order` sort value maps to `sort.<field>.<order>`
  // (i18next rewrites ':' to the key separator, so a flat colon key can't be used).
  sort: {
    createdAt: { desc: 'Newest first', asc: 'Oldest first' },
    name: { asc: 'Name A-Z', desc: 'Name Z-A' },
    fileSize: { desc: 'Largest first', asc: 'Smallest first' },
  },
} as const;

export default mediaRegistry;
