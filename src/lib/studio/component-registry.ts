// =============================================================
// Component Registry — defines which components each deliverable type needs
// =============================================================

export type ComponentType =
  | 'headline' | 'subheadline' | 'body_text' | 'caption' | 'cta'
  | 'hashtags' | 'subject_line' | 'preview_text' | 'meta_description'
  | 'hero_image' | 'post_image' | 'slide_image' | 'thumbnail'
  | 'visual_brief'
  | 'video_script' | 'shot_list' | 'storyboard'
  | 'slide_deck' | 'outline' | 'talking_points'
  | 'seo_keywords' | 'alt_text'
  | 'tweet_text' | 'thread_hook'
  | 'display_url' | 'description' | 'primary_text'
  | 'benefits_section' | 'social_proof'
  | 'boilerplate' | 'quote'
  | 'overlay_text';

export type ContentTab = 'text' | 'images' | 'video' | 'carousel';

export type ComponentGroupType = 'single' | 'variant' | 'sequence_item' | 'slide' | 'section';

export interface UserChoiceSpec {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}

export interface ComponentSpec {
  type: ComponentType;
  label: string;
  contentTab: ContentTab;
  groupType: ComponentGroupType;
  minCount?: number;
  maxCount?: number;
  variantCount?: number;
  required: boolean;
  order: number;
  dependsOn?: ComponentType[];
  userChoices?: UserChoiceSpec[];
}

/** Maps deliverable content types to their component pipeline specs */
export const COMPONENT_REGISTRY: Record<string, ComponentSpec[]> = {
  'Blog Post': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'meta_description', label: 'Meta Description', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Body Text', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'seo_keywords', label: 'SEO Keywords', contentTab: 'text', groupType: 'single', required: true, order: 4 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 5 },
    { type: 'hero_image', label: 'Hero Image', contentTab: 'images', groupType: 'single', required: true, order: 6, dependsOn: ['visual_brief'] },
    { type: 'alt_text', label: 'Image Alt Text', contentTab: 'text', groupType: 'single', required: true, order: 7, dependsOn: ['hero_image'] },
  ],

  'Facebook Post': [
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 1,
      userChoices: [{ key: 'imageSource', label: 'Image Source', options: [
        { value: 'ai_generated', label: 'AI Generated' },
        { value: 'stock_photo', label: 'Stock Photo' },
        { value: 'upload', label: 'Upload' },
      ], defaultValue: 'ai_generated' }],
    },
    { type: 'post_image', label: 'Post Image', contentTab: 'images', groupType: 'single', required: true, order: 2, dependsOn: ['visual_brief'] },
    { type: 'caption', label: 'Caption', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: false, order: 4 },
  ],

  'Instagram Post': [
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 1,
      userChoices: [{ key: 'imageSource', label: 'Image Source', options: [
        { value: 'ai_generated', label: 'AI Generated' },
        { value: 'stock_photo', label: 'Stock Photo' },
        { value: 'upload', label: 'Upload' },
      ], defaultValue: 'ai_generated' }],
    },
    { type: 'post_image', label: 'Post Image', contentTab: 'images', groupType: 'single', required: true, order: 2, dependsOn: ['visual_brief'] },
    { type: 'caption', label: 'Caption', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: true, order: 4 },
    { type: 'alt_text', label: 'Alt Text', contentTab: 'text', groupType: 'single', required: true, order: 5, dependsOn: ['post_image'] },
  ],

  'Instagram Carousel': [
    { type: 'slide_image', label: 'Slide', contentTab: 'carousel', groupType: 'slide', minCount: 4, maxCount: 10, required: true, order: 1 },
    { type: 'visual_brief', label: 'Slide Visual Brief', contentTab: 'images', groupType: 'slide', required: true, order: 2 },
    { type: 'overlay_text', label: 'Slide Overlay Text', contentTab: 'text', groupType: 'slide', required: false, order: 3 },
    { type: 'caption', label: 'Caption', contentTab: 'text', groupType: 'single', required: true, order: 4 },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: true, order: 5 },
  ],

  'LinkedIn Post': [
    { type: 'body_text', label: 'Post Body', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 2 },
    { type: 'post_image', label: 'Post Image', contentTab: 'images', groupType: 'single', required: false, order: 3, dependsOn: ['visual_brief'] },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: false, order: 4 },
  ],

  'Twitter Thread': [
    { type: 'thread_hook', label: 'Thread Hook', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'tweet_text', label: 'Tweet', contentTab: 'text', groupType: 'sequence_item', minCount: 3, maxCount: 10, required: true, order: 2 },
  ],

  'X Post': [
    { type: 'body_text', label: 'Post Text', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 2 },
    { type: 'post_image', label: 'Post Image', contentTab: 'images', groupType: 'single', required: false, order: 3, dependsOn: ['visual_brief'] },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: false, order: 4 },
  ],

  'Search Ad': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'variant', variantCount: 3, required: true, order: 1 },
    { type: 'description', label: 'Description', contentTab: 'text', groupType: 'variant', variantCount: 2, required: true, order: 2 },
    { type: 'display_url', label: 'Display URL', contentTab: 'text', groupType: 'single', required: true, order: 3 },
  ],

  'Social Ad': [
    { type: 'primary_text', label: 'Primary Text', contentTab: 'text', groupType: 'variant', variantCount: 3, required: true, order: 1 },
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'variant', variantCount: 3, required: true, order: 2 },
    { type: 'description', label: 'Description', contentTab: 'text', groupType: 'variant', variantCount: 3, required: true, order: 3 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 4 },
    { type: 'post_image', label: 'Ad Image', contentTab: 'images', groupType: 'variant', variantCount: 3, required: true, order: 5, dependsOn: ['visual_brief'] },
  ],

  'Display Ad': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'description', label: 'Description', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'cta', label: 'Call to Action', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 4 },
    { type: 'post_image', label: 'Ad Image', contentTab: 'images', groupType: 'single', required: true, order: 5, dependsOn: ['visual_brief'] },
  ],

  'Newsletter': [
    { type: 'subject_line', label: 'Subject Line', contentTab: 'text', groupType: 'variant', variantCount: 3, required: true, order: 1 },
    { type: 'preview_text', label: 'Preview Text', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Email Body', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'cta', label: 'Call to Action', contentTab: 'text', groupType: 'single', required: true, order: 4 },
  ],

  'Welcome Sequence': [
    { type: 'subject_line', label: 'Subject Line', contentTab: 'text', groupType: 'sequence_item', minCount: 3, maxCount: 5, required: true, order: 1 },
    { type: 'preview_text', label: 'Preview Text', contentTab: 'text', groupType: 'sequence_item', minCount: 3, maxCount: 5, required: true, order: 2 },
    { type: 'body_text', label: 'Email Body', contentTab: 'text', groupType: 'sequence_item', minCount: 3, maxCount: 5, required: true, order: 3 },
    { type: 'cta', label: 'Call to Action', contentTab: 'text', groupType: 'sequence_item', minCount: 3, maxCount: 5, required: true, order: 4 },
  ],

  'Email Campaign': [
    { type: 'subject_line', label: 'Subject Line', contentTab: 'text', groupType: 'variant', variantCount: 3, required: true, order: 1 },
    { type: 'preview_text', label: 'Preview Text', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Email Body', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'cta', label: 'Call to Action', contentTab: 'text', groupType: 'single', required: true, order: 4 },
  ],

  'Landing Page': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'subheadline', label: 'Subheadline', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'visual_brief', label: 'Hero Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 3 },
    { type: 'hero_image', label: 'Hero Image', contentTab: 'images', groupType: 'single', required: true, order: 4, dependsOn: ['visual_brief'] },
    { type: 'benefits_section', label: 'Benefits Section', contentTab: 'text', groupType: 'single', required: true, order: 5 },
    { type: 'social_proof', label: 'Social Proof', contentTab: 'text', groupType: 'single', required: true, order: 6 },
    { type: 'cta', label: 'Call to Action', contentTab: 'text', groupType: 'single', required: true, order: 7 },
  ],

  'Explainer Video': [
    { type: 'video_script', label: 'Video Script', contentTab: 'video', groupType: 'section', minCount: 4, maxCount: 6, required: true, order: 1 },
    { type: 'shot_list', label: 'Shot List', contentTab: 'video', groupType: 'single', required: true, order: 2, dependsOn: ['video_script'] },
    { type: 'visual_brief', label: 'Thumbnail Brief', contentTab: 'images', groupType: 'single', required: true, order: 3 },
    { type: 'thumbnail', label: 'Thumbnail', contentTab: 'images', groupType: 'single', required: false, order: 4, dependsOn: ['visual_brief'] },
  ],

  'Social Video': [
    { type: 'video_script', label: 'Video Script', contentTab: 'video', groupType: 'section', minCount: 3, maxCount: 5, required: true, order: 1 },
    { type: 'shot_list', label: 'Shot List', contentTab: 'video', groupType: 'single', required: true, order: 2, dependsOn: ['video_script'] },
    { type: 'caption', label: 'Caption', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: false, order: 4 },
  ],

  'Sales Deck': [
    { type: 'outline', label: 'Deck Outline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'slide_deck', label: 'Slide', contentTab: 'carousel', groupType: 'slide', minCount: 8, maxCount: 12, required: true, order: 2, dependsOn: ['outline'] },
    { type: 'talking_points', label: 'Talking Points', contentTab: 'text', groupType: 'single', required: true, order: 3, dependsOn: ['slide_deck'] },
  ],

  'Pitch Deck': [
    { type: 'outline', label: 'Deck Outline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'slide_deck', label: 'Slide', contentTab: 'carousel', groupType: 'slide', minCount: 10, maxCount: 15, required: true, order: 2, dependsOn: ['outline'] },
    { type: 'talking_points', label: 'Talking Points', contentTab: 'text', groupType: 'single', required: true, order: 3, dependsOn: ['slide_deck'] },
  ],

  'Press Release': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'subheadline', label: 'Subheadline', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Body Text', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'quote', label: 'Quote', contentTab: 'text', groupType: 'single', required: true, order: 4 },
    { type: 'boilerplate', label: 'Boilerplate', contentTab: 'text', groupType: 'single', required: true, order: 5 },
  ],

  'Thought Leadership Article': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'meta_description', label: 'Meta Description', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Article Body', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'seo_keywords', label: 'SEO Keywords', contentTab: 'text', groupType: 'single', required: false, order: 4 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 5 },
    { type: 'hero_image', label: 'Hero Image', contentTab: 'images', groupType: 'single', required: false, order: 6, dependsOn: ['visual_brief'] },
  ],

  'Case Study': [
    { type: 'headline', label: 'Headline', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'body_text', label: 'Case Study Body', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'quote', label: 'Client Quote', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 4 },
    { type: 'hero_image', label: 'Hero Image', contentTab: 'images', groupType: 'single', required: false, order: 5, dependsOn: ['visual_brief'] },
  ],

  'White Paper': [
    { type: 'headline', label: 'Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'outline', label: 'Outline', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Body', contentTab: 'text', groupType: 'single', required: true, order: 3, dependsOn: ['outline'] },
    { type: 'visual_brief', label: 'Cover Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 4 },
    { type: 'hero_image', label: 'Cover Image', contentTab: 'images', groupType: 'single', required: false, order: 5, dependsOn: ['visual_brief'] },
  ],

  'Product Description': [
    { type: 'headline', label: 'Product Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'body_text', label: 'Description', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'benefits_section', label: 'Key Benefits', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'seo_keywords', label: 'SEO Keywords', contentTab: 'text', groupType: 'single', required: false, order: 4 },
  ],

  'Career Page': [
    { type: 'headline', label: 'Page Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'body_text', label: 'Page Content', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'benefits_section', label: 'Why Join Us', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'cta', label: 'Call to Action', contentTab: 'text', groupType: 'single', required: true, order: 4 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 5 },
    { type: 'hero_image', label: 'Hero Image', contentTab: 'images', groupType: 'single', required: false, order: 6, dependsOn: ['visual_brief'] },
  ],

  'Job Ad Copy': [
    { type: 'headline', label: 'Job Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'body_text', label: 'Job Description', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'cta', label: 'Apply CTA', contentTab: 'text', groupType: 'single', required: true, order: 3 },
  ],

  'Employee Story': [
    { type: 'headline', label: 'Story Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'body_text', label: 'Story', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'quote', label: 'Employee Quote', contentTab: 'text', groupType: 'single', required: true, order: 3 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 4 },
    { type: 'post_image', label: 'Story Image', contentTab: 'images', groupType: 'single', required: false, order: 5, dependsOn: ['visual_brief'] },
  ],

  'Employer Brand Video': [
    { type: 'video_script', label: 'Video Script', contentTab: 'video', groupType: 'section', minCount: 3, maxCount: 5, required: true, order: 1 },
    { type: 'shot_list', label: 'Shot List', contentTab: 'video', groupType: 'single', required: true, order: 2, dependsOn: ['video_script'] },
    { type: 'visual_brief', label: 'Thumbnail Brief', contentTab: 'images', groupType: 'single', required: false, order: 3 },
    { type: 'thumbnail', label: 'Thumbnail', contentTab: 'images', groupType: 'single', required: false, order: 4, dependsOn: ['visual_brief'] },
  ],

  'Impact Report': [
    { type: 'headline', label: 'Report Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'outline', label: 'Report Outline', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Report Body', contentTab: 'text', groupType: 'single', required: true, order: 3, dependsOn: ['outline'] },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: false, order: 4 },
    { type: 'hero_image', label: 'Cover Image', contentTab: 'images', groupType: 'single', required: false, order: 5, dependsOn: ['visual_brief'] },
  ],

  'TikTok Video': [
    { type: 'video_script', label: 'Video Script', contentTab: 'video', groupType: 'single', required: true, order: 1 },
    { type: 'caption', label: 'Caption', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'hashtags', label: 'Hashtags', contentTab: 'text', groupType: 'single', required: true, order: 3 },
  ],

  'YouTube Video': [
    { type: 'headline', label: 'Video Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'description', label: 'Video Description', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'video_script', label: 'Video Script', contentTab: 'video', groupType: 'section', minCount: 4, maxCount: 8, required: true, order: 3 },
    { type: 'shot_list', label: 'Shot List', contentTab: 'video', groupType: 'single', required: true, order: 4, dependsOn: ['video_script'] },
    { type: 'visual_brief', label: 'Thumbnail Brief', contentTab: 'images', groupType: 'single', required: true, order: 5 },
    { type: 'thumbnail', label: 'Thumbnail', contentTab: 'images', groupType: 'single', required: true, order: 6, dependsOn: ['visual_brief'] },
    { type: 'seo_keywords', label: 'Tags/Keywords', contentTab: 'text', groupType: 'single', required: false, order: 7 },
  ],

  'Podcast Script': [
    { type: 'headline', label: 'Episode Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'outline', label: 'Episode Outline', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'body_text', label: 'Script', contentTab: 'text', groupType: 'single', required: true, order: 3, dependsOn: ['outline'] },
    { type: 'talking_points', label: 'Talking Points', contentTab: 'text', groupType: 'single', required: false, order: 4, dependsOn: ['outline'] },
  ],

  'Webinar': [
    { type: 'headline', label: 'Webinar Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'outline', label: 'Agenda', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'slide_deck', label: 'Slide', contentTab: 'carousel', groupType: 'slide', minCount: 10, maxCount: 20, required: true, order: 3, dependsOn: ['outline'] },
    { type: 'talking_points', label: 'Talking Points', contentTab: 'text', groupType: 'single', required: true, order: 4, dependsOn: ['slide_deck'] },
    { type: 'cta', label: 'Registration CTA', contentTab: 'text', groupType: 'single', required: true, order: 5 },
  ],

  'Infographic': [
    { type: 'headline', label: 'Title', contentTab: 'text', groupType: 'single', required: true, order: 1 },
    { type: 'outline', label: 'Data Points & Flow', contentTab: 'text', groupType: 'single', required: true, order: 2 },
    { type: 'visual_brief', label: 'Visual Brief', contentTab: 'images', groupType: 'single', required: true, order: 3, dependsOn: ['outline'] },
    { type: 'hero_image', label: 'Infographic Image', contentTab: 'images', groupType: 'single', required: true, order: 4, dependsOn: ['visual_brief'] },
    { type: 'alt_text', label: 'Alt Text', contentTab: 'text', groupType: 'single', required: true, order: 5, dependsOn: ['hero_image'] },
  ],
};

/** Returns the component specs for a deliverable type, or undefined if no pipeline mapping exists */
export function getComponentSpecs(contentType: string): ComponentSpec[] | undefined {
  return COMPONENT_REGISTRY[contentType];
}

/** Check if a deliverable type supports the pipeline mode */
export function supportsPipelineMode(contentType: string): boolean {
  return contentType in COMPONENT_REGISTRY;
}

/** Get all registered deliverable types that support pipeline mode */
export function getPipelineDeliverableTypes(): string[] {
  return Object.keys(COMPONENT_REGISTRY);
}
