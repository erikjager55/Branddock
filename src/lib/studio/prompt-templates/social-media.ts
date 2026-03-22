// =============================================================
// Social Media Templates (7 types)
// LinkedIn Post/Article, Instagram, X/Twitter Thread,
// Facebook, TikTok/Reels Script, Social Carousel
// =============================================================

import type { PromptTemplate } from './helpers';
import { buildBaseSystemPrompt, extractTextSettings, buildContextBlock, formatAdditionalSettings } from './helpers';

function buildSocialUserPrompt(
  userPrompt: string,
  context: import('./helpers').UserPromptParams['context'],
  settings: import('./helpers').UserPromptParams['settings'],
  platformGuidance: string,
): string {
  const { tone } = extractTextSettings(settings);
  const contextBlock = buildContextBlock(context);
  const additionalSpecs = formatAdditionalSettings(settings);

  return `${contextBlock}

## PLATFORM GUIDANCE
${platformGuidance}

## CONTENT SPECIFICATIONS
Tone: ${tone}${additionalSpecs}

## USER PROMPT
${userPrompt}`;
}

export const SOCIAL_MEDIA_TEMPLATES: Record<string, PromptTemplate> = {
  'linkedin-post': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a LinkedIn content strategist. Write professional LinkedIn posts that drive engagement and thought leadership. Follow these best practices:
- Open with a strong hook line (first 2 lines are visible before "see more")
- Use short paragraphs (1-2 sentences each) with line breaks for readability
- Include personal insights or data points
- End with a question or CTA to drive comments
- Add 3-5 relevant hashtags at the bottom
- Optimal length: 150-300 words`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Platform: LinkedIn. Character limit: ~3000. Posts with images get 2x engagement. First 2 lines must hook the reader.',
      ),
  },

  'linkedin-article': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a LinkedIn article writer specializing in long-form professional content. Write LinkedIn native articles that establish thought leadership:
- Compelling headline (under 70 characters)
- Strong opening paragraph that hooks the professional reader
- Well-structured with H2 subheadings every 200-300 words
- Include actionable insights and frameworks
- Professional yet conversational tone
- 800-2000 words optimal length`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Platform: LinkedIn Article (long-form). No character limit. Include H2 subheadings and a CTA.',
      ),
  },

  'instagram-post': {
    systemPrompt: buildBaseSystemPrompt(
      `You are an Instagram content creator. Write engaging Instagram captions that complement visual content:
- Open with an attention-grabbing first line
- Tell a micro-story or share a valuable insight
- Use emojis strategically (not excessively)
- Include a clear CTA (save, share, comment, or link in bio)
- Add 15-30 relevant hashtags (mix of popular and niche)
- Also suggest what the accompanying image should depict
- Optimal caption length: 125-300 words`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Platform: Instagram. Caption limit: 2200 chars. First line must hook. Include image direction suggestion and hashtag block.',
      ),
  },

  'twitter-thread': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a Twitter/X thread writer. Create compelling, viral-worthy threads that educate and engage:
- Tweet 1 (hook): Must stop the scroll. Bold claim, surprising stat, or provocative question
- Each tweet: 1 clear idea, under 280 characters
- Use numbered tweets (1/, 2/, etc.) for readability
- Mix of insights, examples, and data points
- Final tweet: Summary + CTA (follow, retweet, save)
- Optimal thread length: 5-12 tweets`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Platform: X/Twitter. Each tweet max 280 chars. Number each tweet (1/, 2/, etc.). Thread should be 5-12 tweets.',
      ),
  },

  'facebook-post': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a Facebook content strategist. Write engaging Facebook posts optimized for the algorithm:
- Conversational, approachable tone
- Ask questions to drive comments (algorithm boost)
- Tell stories or share relatable experiences
- Include a clear CTA
- Optimal length: 80-250 words
- Posts with images/videos get significantly more reach`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Platform: Facebook. Conversational tone works best. Include a question to drive engagement.',
      ),
  },

  'tiktok-script': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a short-form video scriptwriter for TikTok and Instagram Reels. Write scripts that capture attention instantly:
- Hook (0-3 seconds): Must stop the scroll — bold statement, question, or visual hook
- Body (3-45 seconds): Deliver value fast — tips, story, or reveal
- CTA (last 5 seconds): Tell viewers exactly what to do (follow, comment, save)
- Write in a casual, energetic, direct speaking style
- Include visual/action directions in [brackets]
- Specify on-screen text suggestions
- Optimal video length: 15-60 seconds`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Platform: TikTok/Reels. Script format with [visual directions]. Hook must be in first 3 seconds. 15-60 second video.',
      ),
  },

  'social-carousel': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a social media carousel designer and copywriter. Create multi-slide carousel content:
- Slide 1 (Cover): Bold headline that creates curiosity. Must make people swipe.
- Slides 2-8: One key point per slide. Short text (max 30 words per slide).
- Final Slide: CTA (save, share, follow, or visit link)
- Each slide should have a clear heading and 1-2 supporting sentences
- Format each slide clearly as "Slide 1:", "Slide 2:", etc.
- Also suggest background colors or image themes per slide
- Optimal: 5-10 slides`,
    ),
    buildUserPrompt: (params) =>
      buildSocialUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Multi-slide carousel (5-10 slides). Format each slide as "Slide 1:", "Slide 2:", etc. Keep text per slide under 30 words.',
      ),
  },
};
