// ─── Brand Archetype Reference Data ─────────────────────────
// Complete reference for all 12 Jungian brand archetypes.
// Based on Carl Jung + Carol Pearson & Margaret Mark (2001).
// Used for:
//  - Pre-populating canvas fields when an archetype is selected
//  - Background info display on the detail page
//  - AI Exploration context injection
//  - Export/campaign strategy generation
// ────────────────────────────────────────────────────────────

export interface ArchetypeDefinition {
  id: string;
  name: string;
  motto: string;
  quadrant: 'stability' | 'mastery' | 'freedom' | 'belonging';
  quadrantLabel: string;
  coreDesire: string;
  coreFear: string;
  goal: string;
  strategy: string;
  giftTalent: string;
  shadow: string;
  shadowName: string;
  voiceStyle: string;
  voiceAdjectives: string[];
  colorDirection: string;
  typographyDirection: string;
  imageryStyle: string;
  brandExamples: string[];
  subArchetypes: string[];
  bestIndustries: string[];
  contentApproach: string;
  positioningApproach: 'similarity' | 'aspiration' | 'guidance' | 'inspiration';
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'innocent',
    name: 'The Innocent',
    motto: 'Free to be you and me',
    quadrant: 'freedom',
    quadrantLabel: 'Independence & Fulfillment',
    coreDesire: 'To experience paradise — happiness, simplicity, and goodness',
    coreFear: 'Doing something wrong; complexity, deceit, and punishment',
    goal: 'To be happy and spread happiness',
    strategy: 'Do things right — be pure, moral, and optimistic',
    giftTalent: 'Faith, optimism, and loyalty',
    shadow: 'Naivety, denial, escapism, and victim mentality — can downplay real struggles and be slow to change',
    shadowName: 'The Victim',
    voiceStyle: 'Warm, sincere, optimistic, simple, and wholesome. Speaks with genuine enthusiasm and childlike wonder.',
    voiceAdjectives: ['Warm', 'Sincere', 'Optimistic', 'Simple', 'Wholesome'],
    colorDirection: 'White, pastels, and light blues — colors that evoke purity, freshness, and openness',
    typographyDirection: 'Clean, rounded sans-serif fonts. Friendly and approachable, never intimidating.',
    imageryStyle: 'Bright, natural light. Symbols of purity (doves, sunrises, rainbows). Simple, uncluttered compositions.',
    brandExamples: ['Dove', 'Coca-Cola', 'Whole Foods', 'Aveeno'],
    subArchetypes: ['Child', 'Dreamer', 'Idealist', 'Muse', 'Romantic'],
    bestIndustries: ['Beauty & skincare', 'Fresh food & organic', 'Family products', 'Wellness'],
    contentApproach: 'Feel-good stories, nostalgia, simple tips, community celebration, and lifestyle inspiration',
    positioningApproach: 'similarity',
  },
  {
    id: 'sage',
    name: 'The Sage',
    motto: 'The truth will set you free',
    quadrant: 'freedom',
    quadrantLabel: 'Independence & Fulfillment',
    coreDesire: 'Discovery of truth, wisdom, and understanding',
    coreFear: 'Ignorance, being duped or misled',
    goal: 'Use intelligence and analysis to understand the world and provide guidance',
    strategy: 'Seek knowledge, analyze, research, and share information',
    giftTalent: 'Wisdom, intelligence, clarity of thought, and rational decision-making',
    shadow: 'Arrogance, condescension, dogmatism, and ivory-tower thinking — using intelligence to manipulate rather than enlighten',
    shadowName: 'The Skeptic',
    voiceStyle: 'Intelligent, thoughtful, analytical, calm, and trustworthy. Authoritative but never condescending.',
    voiceAdjectives: ['Intelligent', 'Thoughtful', 'Analytical', 'Calm', 'Trustworthy'],
    colorDirection: 'Professional blues, deep greens, and muted purple — scholarly and trustworthy tones',
    typographyDirection: 'Classic serif or clean sans-serif. Structured and clear, suggesting expertise.',
    imageryStyle: 'Books, data visualizations, owls, knowledge symbols. Clean, structured layouts.',
    brandExamples: ['Google', 'TED', 'BBC', 'Harvard'],
    subArchetypes: ['Expert', 'Scholar', 'Advisor', 'Researcher', 'Mentor'],
    bestIndustries: ['Education', 'Consulting', 'News & media', 'Technology'],
    contentApproach: 'Research reports, how-to guides, deep analyses, thought leadership, and educational content',
    positioningApproach: 'guidance',
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    motto: 'You only get one life — make it count',
    quadrant: 'freedom',
    quadrantLabel: 'Independence & Fulfillment',
    coreDesire: 'Freedom to discover the world and find oneself',
    coreFear: 'Getting trapped, conforming, and inner emptiness',
    goal: 'Experience a more authentic, fulfilling life through exploration',
    strategy: 'Journey, seek new things, escape the mundane, embrace the unknown',
    giftTalent: 'Independence, bravery, ambition, and authenticity',
    shadow: 'Aimless wandering, commitment phobia, and using exploration as escapism — leaving trails of half-finished projects',
    shadowName: 'The Fugitive',
    voiceStyle: 'Adventurous, daring, independent, authentic, and curious. Inspires movement and discovery.',
    voiceAdjectives: ['Adventurous', 'Daring', 'Independent', 'Authentic', 'Curious'],
    colorDirection: 'Earth tones (forest green, sienna, slate) and vibrant accents — grounded yet exciting',
    typographyDirection: 'Rugged sans-serif or handwritten display fonts. Dynamic and genuine.',
    imageryStyle: 'Landscapes, maps, wide open spaces, trails, outdoor adventure. Real and unpolished.',
    brandExamples: ['Jeep', 'The North Face', 'Patagonia', 'GoPro'],
    subArchetypes: ['Seeker', 'Adventurer', 'Wanderer', 'Individualist', 'Pilgrim'],
    bestIndustries: ['Outdoor & adventure', 'Automotive (SUV)', 'Travel', 'Lifestyle'],
    contentApproach: 'Discovery stories, hidden gems, journey narratives, unboxing, and behind-the-scenes exploration',
    positioningApproach: 'inspiration',
  },
  {
    id: 'outlaw',
    name: 'The Outlaw',
    motto: 'Rules are meant to be broken',
    quadrant: 'mastery',
    quadrantLabel: 'Risk & Mastery',
    coreDesire: 'Revolution — liberation from the status quo',
    coreFear: 'Being powerless, trivialized, or forced to conform',
    goal: 'Dismantle old paradigms and instigate meaningful change',
    strategy: 'Disrupt, shock, provoke, and break rules',
    giftTalent: 'Risk-taking, progressive thought, radical freedom, and bravery',
    shadow: 'Destructiveness without vision, nihilism, bitterness, and rebellion for rebellion\'s sake',
    shadowName: 'The Destroyer',
    voiceStyle: 'Bold, provocative, rebellious, unfiltered, and edgy. Speaks truth to power without apology.',
    voiceAdjectives: ['Bold', 'Provocative', 'Rebellious', 'Unfiltered', 'Edgy'],
    colorDirection: 'Dark colors (black, deep red), industrial tones — raw, powerful, and unapologetic',
    typographyDirection: 'Bold display or condensed industrial fonts. Raw and unpolished.',
    imageryStyle: 'Urban, industrial, counter-cultural. Bold typography, edgy graphics, raw aesthetic.',
    brandExamples: ['Harley-Davidson', 'Virgin', 'Diesel', 'Red Bull'],
    subArchetypes: ['Rebel', 'Revolutionary', 'Wild Spirit', 'Misfit', 'Iconoclast'],
    bestIndustries: ['Automotive', 'Alternative lifestyle', 'Entertainment', 'Fashion'],
    contentApproach: 'Industry call-outs, myth-busting, provocative takes, manifesto-style content, and cultural commentary',
    positioningApproach: 'aspiration',
  },
  {
    id: 'magician',
    name: 'The Magician',
    motto: 'Anything can happen — I make things happen',
    quadrant: 'mastery',
    quadrantLabel: 'Risk & Mastery',
    coreDesire: 'Understanding fundamental laws and making dreams reality',
    coreFear: 'Unanticipated negative consequences and stagnation',
    goal: 'Transform reality, create magical moments, and turn vision into reality',
    strategy: 'Develop a vision and live it — use transformative principles',
    giftTalent: 'Finding win-win solutions, awe-inspiring intuition, and charismatic transformation',
    shadow: 'Manipulation, dishonesty, cult-like tendencies, and over-promising transformation that can\'t be delivered',
    shadowName: 'The Trickster',
    voiceStyle: 'Visionary, mystical, inspiring, and transformative. Creates a sense of wonder and possibility.',
    voiceAdjectives: ['Visionary', 'Inspiring', 'Transformative', 'Mystical', 'Charismatic'],
    colorDirection: 'Rich purples, deep blues, and metallic accents (gold, silver) — mystical and sophisticated',
    typographyDirection: 'Elegant serif or modern geometric fonts. Sophisticated and otherworldly.',
    imageryStyle: 'Mystical symbols, transformation sequences, before/after, special effects, elegant design.',
    brandExamples: ['Disney', 'Apple', 'Tesla', 'Dyson'],
    subArchetypes: ['Visionary', 'Catalyst', 'Innovator', 'Shaman', 'Healer'],
    bestIndustries: ['Technology', 'Entertainment', 'Beauty & health', 'Consulting'],
    contentApproach: 'Transformation stories, before/after showcases, visionary thought pieces, and product magic reveals',
    positioningApproach: 'inspiration',
  },
  {
    id: 'hero',
    name: 'The Hero',
    motto: 'Where there\'s a will, there\'s a way',
    quadrant: 'mastery',
    quadrantLabel: 'Risk & Mastery',
    coreDesire: 'Prove one\'s worth through courageous action and achieve mastery',
    coreFear: 'Weakness, vulnerability, and incompetence',
    goal: 'Make the world a better place through determination and excellence',
    strategy: 'Become as strong, competent, and powerful as possible',
    giftTalent: 'Competence, courage, self-sacrifice, and transformative strength',
    shadow: 'Arrogance, always needing a battle to fight, and reckless risk-taking — acting impulsively without considering consequences',
    shadowName: 'The Bully',
    voiceStyle: 'Bold, driven, confident, empowering, and action-oriented. Challenges and inspires simultaneously.',
    voiceAdjectives: ['Bold', 'Driven', 'Confident', 'Empowering', 'Direct'],
    colorDirection: 'Bold reds, deep blues, and dark grays — strong, dynamic, and confident',
    typographyDirection: 'Strong sans-serif, condensed or bold weights. Powerful and decisive.',
    imageryStyle: 'Action shots, achievement moments, dynamic compositions, athletic and aspirational.',
    brandExamples: ['Nike', 'Under Armour', 'BMW', 'FedEx'],
    subArchetypes: ['Warrior', 'Athlete', 'Rescuer', 'Liberator'],
    bestIndustries: ['Sports & fitness', 'Automotive', 'Delivery & logistics', 'Technology'],
    contentApproach: 'Challenge-based content, achievement stories, how-I-conquered narratives, and empowerment campaigns',
    positioningApproach: 'aspiration',
  },
  {
    id: 'lover',
    name: 'The Lover',
    motto: 'You\'re the only one',
    quadrant: 'belonging',
    quadrantLabel: 'Belonging & Enjoyment',
    coreDesire: 'Attain intimacy, connection, and sensual pleasure',
    coreFear: 'Being alone, unwanted, unloved — isolation and rejection',
    goal: 'Be in relationship with people, things, and experiences they love',
    strategy: 'Become increasingly attractive — physically, emotionally, and in every way',
    giftTalent: 'Passionate sensuality, faithfulness, appreciation of beauty, and warmth',
    shadow: 'Vanity, jealousy, codependency, and addiction to pleasure — manipulation through desire and obsessive behavior',
    shadowName: 'The Seducer',
    voiceStyle: 'Sensual, emotive, intimate, elegant, and warm. Creates desire and emotional closeness.',
    voiceAdjectives: ['Sensual', 'Elegant', 'Intimate', 'Warm', 'Indulgent'],
    colorDirection: 'Deep reds, burgundy, pink, gold, and nude/cream — romantic, luxurious, and inviting',
    typographyDirection: 'Elegant serif or script fonts. Refined and graceful.',
    imageryStyle: 'Romantic, intimate settings. Rich textures, close-up details, warm lighting, sensory experiences.',
    brandExamples: ['Chanel', 'Victoria\'s Secret', 'Godiva', 'Hallmark'],
    subArchetypes: ['Romantic', 'Companion', 'Hedonist', 'Matchmaker', 'Connoisseur'],
    bestIndustries: ['Luxury & fashion', 'Cosmetics & fragrance', 'Jewelry', 'Food & wine'],
    contentApproach: 'Sensory storytelling, intimate portraits, beauty showcases, and relationship-building narratives',
    positioningApproach: 'aspiration',
  },
  {
    id: 'jester',
    name: 'The Jester',
    motto: 'If I can\'t dance, I don\'t want to be part of your revolution',
    quadrant: 'belonging',
    quadrantLabel: 'Belonging & Enjoyment',
    coreDesire: 'Live in the moment with full enjoyment — have fun',
    coreFear: 'Boredom, being boring, and taking life too seriously',
    goal: 'Have a great time and lighten up the world',
    strategy: 'Play, make jokes, be funny, and use humor to connect',
    giftTalent: 'Wicked humor, originality, irreverence, and present-moment joy',
    shadow: 'Frivolity, cruelty masked as humor, using jokes to avoid depth — becoming offensive or irresponsible for attention',
    shadowName: 'The Cruel Joker',
    voiceStyle: 'Witty, playful, spontaneous, clever, and irreverent. Breaks tension and creates shared laughter.',
    voiceAdjectives: ['Witty', 'Playful', 'Spontaneous', 'Clever', 'Irreverent'],
    colorDirection: 'Bright, bold colors — orange, yellow, electric blue — energetic and attention-grabbing',
    typographyDirection: 'Playful display fonts, rounded or quirky typefaces. Never stiff or formal.',
    imageryStyle: 'Whimsical, quirky, colorful. Exaggeration, visual puns, unexpected compositions.',
    brandExamples: ['M&M\'s', 'Old Spice', 'Dollar Shave Club', 'Geico'],
    subArchetypes: ['Fool', 'Trickster', 'Entertainer', 'Comedian', 'Prankster'],
    bestIndustries: ['Confectionery', 'Entertainment', 'Beer & snacks', 'Social media'],
    contentApproach: 'Memes, viral videos, roasts, behind-the-scenes bloopers, and entertainment-first social content',
    positioningApproach: 'similarity',
  },
  {
    id: 'everyman',
    name: 'The Everyman',
    motto: 'All people are created equal',
    quadrant: 'belonging',
    quadrantLabel: 'Belonging & Enjoyment',
    coreDesire: 'Connection with others — belonging and fitting in',
    coreFear: 'Standing out, exclusion, hostility, and rejection',
    goal: 'To belong, fit in, and be accepted — create community',
    strategy: 'Develop solid virtues, be down-to-earth, and practice common touch',
    giftTalent: 'Stewardship, altruism, respect, fairness, and realism',
    shadow: 'Blandness, conformism, fear of standing out, and loss of distinctive identity — becoming invisible and insignificant',
    shadowName: 'The Conformist',
    voiceStyle: 'Friendly, humble, down-to-earth, inclusive, and honest. Like talking to a trusted neighbor.',
    voiceAdjectives: ['Friendly', 'Humble', 'Down-to-earth', 'Inclusive', 'Honest'],
    colorDirection: 'Neutral warm tones — earthy browns, soft greens, and approachable blues',
    typographyDirection: 'Clean, readable sans-serif. Nothing flashy — prioritize clarity and warmth.',
    imageryStyle: 'Everyday life, community scenes, relatable situations. Real people in real settings.',
    brandExamples: ['IKEA', 'Target', 'Ford', 'Levi\'s'],
    subArchetypes: ['Citizen', 'Advocate', 'Servant', 'Networker', 'Good Neighbor'],
    bestIndustries: ['Home & family', 'Everyday apparel', 'Family automotive', 'Retail'],
    contentApproach: 'Community stories, user-generated content, everyday tips, and relatable "just like you" narratives',
    positioningApproach: 'similarity',
  },
  {
    id: 'caregiver',
    name: 'The Caregiver',
    motto: 'Love your neighbor as yourself',
    quadrant: 'stability',
    quadrantLabel: 'Stability & Control',
    coreDesire: 'Protect others from harm and serve the greater good',
    coreFear: 'Selfishness, ingratitude, helplessness, and neglect',
    goal: 'To help, nurture, and care for others',
    strategy: 'Do things for others — be compassionate and generous',
    giftTalent: 'Compassion, patience, empathy, and generosity',
    shadow: 'Martyrdom, self-neglect, codependency, and enabling — control through guilt and emotional burnout',
    shadowName: 'The Martyr',
    voiceStyle: 'Warm, compassionate, reassuring, nurturing, and supportive. Like a caring parent or trusted advisor.',
    voiceAdjectives: ['Warm', 'Compassionate', 'Reassuring', 'Nurturing', 'Supportive'],
    colorDirection: 'Soft pastels, nurturing greens, and warm tones — comforting and safe',
    typographyDirection: 'Rounded, soft sans-serif fonts. Gentle and approachable.',
    imageryStyle: 'Comforting, family-oriented. Warm environments, hands holding, protective gestures.',
    brandExamples: ['UNICEF', 'Volvo', 'Johnson & Johnson', 'TOMS'],
    subArchetypes: ['Guardian', 'Samaritan', 'Healer', 'Angel', 'Parent'],
    bestIndustries: ['Healthcare', 'Nonprofits', 'Education', 'Insurance'],
    contentApproach: 'Helpful tips, support resources, community care stories, and protective guidance content',
    positioningApproach: 'guidance',
  },
  {
    id: 'ruler',
    name: 'The Ruler',
    motto: 'Power isn\'t everything — it\'s the only thing',
    quadrant: 'stability',
    quadrantLabel: 'Stability & Control',
    coreDesire: 'Control — create a prosperous, successful environment',
    coreFear: 'Chaos, being overthrown, weakness, and failure',
    goal: 'Create order, establish prosperity, and maintain excellence',
    strategy: 'Exercise power, demonstrate leadership, and command respect',
    giftTalent: 'Power, confidence, responsibility, and high-status leadership',
    shadow: 'Tyranny, elitism, authoritarianism, and intimidation — suppressing others and fearing vulnerability',
    shadowName: 'The Tyrant',
    voiceStyle: 'Authoritative, commanding, confident, refined, and sophisticated. Sets the standard others follow.',
    voiceAdjectives: ['Authoritative', 'Commanding', 'Refined', 'Sophisticated', 'Confident'],
    colorDirection: 'Rich, luxurious tones — black, gold, navy, and royal purple — premium and exclusive',
    typographyDirection: 'Classic serif or refined sans-serif. Elegant, restrained, and prestigious.',
    imageryStyle: 'Sleek, elegant, premium. Luxurious materials, architectural symmetry, refined environments.',
    brandExamples: ['Rolex', 'Mercedes-Benz', 'Louis Vuitton', 'American Express'],
    subArchetypes: ['Sovereign', 'Judge', 'Ambassador', 'Patriarch', 'Leader'],
    bestIndustries: ['Luxury automotive', 'Watches & jewelry', 'Premium hotels', 'Financial services'],
    contentApproach: 'Status showcases, leadership thought pieces, legacy stories, and premium lifestyle narratives',
    positioningApproach: 'aspiration',
  },
  {
    id: 'creator',
    name: 'The Creator',
    motto: 'If it can be imagined, it can be created',
    quadrant: 'stability',
    quadrantLabel: 'Stability & Control',
    coreDesire: 'Create something of enduring value through self-expression',
    coreFear: 'Mediocre vision or execution, stagnation, and inauthenticity',
    goal: 'Realize a vision and produce things of lasting meaning',
    strategy: 'Develop artistic control and skill — use imagination consistently',
    giftTalent: 'Creativity, imagination, nonconformity, and developed aesthetic',
    shadow: 'Perfectionism so severe nothing is ever finished, self-doubt, and impracticality — inability to be content and ship',
    shadowName: 'The Perfectionist',
    voiceStyle: 'Imaginative, inventive, expressive, visionary, and inspiring. Celebrates originality and self-expression.',
    voiceAdjectives: ['Imaginative', 'Inventive', 'Expressive', 'Visionary', 'Inspiring'],
    colorDirection: 'Vibrant, artistic palettes — unique combinations that break convention and express creativity',
    typographyDirection: 'Creative display or custom typefaces. Distinctive and design-forward.',
    imageryStyle: 'Artistic, visually engaging, creative process shots. Unique patterns, textures, and compositions.',
    brandExamples: ['LEGO', 'Adobe', 'Apple', 'Crayola'],
    subArchetypes: ['Artist', 'Innovator', 'Inventor', 'Storyteller', 'Entrepreneur'],
    bestIndustries: ['Art & design', 'Technology', 'Marketing', 'Creative tools'],
    contentApproach: 'How-it\'s-made stories, tutorials, process reveals, creative challenges, and inspiration showcases',
    positioningApproach: 'inspiration',
  },
];

/** Lookup an archetype definition by its ID */
export function getArchetypeById(id: string): ArchetypeDefinition | undefined {
  return ARCHETYPES.find((a) => a.id === id.toLowerCase());
}

/** Get sub-archetypes for a given archetype ID */
export function getSubArchetypes(archetypeId: string): string[] {
  return getArchetypeById(archetypeId)?.subArchetypes ?? [];
}

/** Archetype options for select dropdowns */
export const ARCHETYPE_OPTIONS = ARCHETYPES.map((a) => ({
  value: a.id,
  label: a.name,
}));

/** Positioning approach options */
export const POSITIONING_OPTIONS = [
  { value: 'similarity', label: 'Similarity', description: '"We are the same as you"' },
  { value: 'aspiration', label: 'Aspiration', description: '"We are who you aspire to be"' },
  { value: 'guidance', label: 'Guidance', description: '"We are your lighthouse"' },
  { value: 'inspiration', label: 'Inspiration', description: '"We inspire you to believe"' },
];

/** Quadrant groupings for visual archetype wheel display */
export const QUADRANT_GROUPS = [
  {
    id: 'stability',
    label: 'Stability & Control',
    description: 'Providing structure, safety, and predictability',
    archetypes: ['caregiver', 'ruler', 'creator'],
  },
  {
    id: 'mastery',
    label: 'Risk & Mastery',
    description: 'Leaving a mark, proving oneself, achieving mastery',
    archetypes: ['hero', 'outlaw', 'magician'],
  },
  {
    id: 'freedom',
    label: 'Independence & Fulfillment',
    description: 'Yearning for liberation, change, and new experience',
    archetypes: ['innocent', 'sage', 'explorer'],
  },
  {
    id: 'belonging',
    label: 'Belonging & Enjoyment',
    description: 'Connecting with others, intimacy, and community',
    archetypes: ['jester', 'everyman', 'lover'],
  },
];
