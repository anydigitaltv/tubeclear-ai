/**
 * Context Analyzer - Understand Video Context for Accurate Scoring
 * Differentiates between educational, news, entertainment content
 * Applies context-aware policy enforcement
 */

export interface ContextAnalysis {
  category: 'educational' | 'news' | 'entertainment' | 'documentary' | 'music' | 'gaming' | 'other';
  intent: 'inform' | 'entertain' | 'persuade' | 'educate' | 'document';
  ageAppropriate: boolean;
  targetAudience: 'all_ages' | 'teen' | 'adult' | 'mature';
  educationalValue: number; // 0-100
  contextMultiplier: number; // Adjusts violation severity
  regionalCompliance: Record<string, boolean>;
  culturalSensitivity: 'high' | 'medium' | 'low';
}

/**
 * Analyze video context from metadata and content analysis
 */
export const analyzeVideoContext = (
  title: string,
  description: string,
  tags: string[],
  category?: string,
  frameResults?: any[],
  audioResult?: any
): ContextAnalysis => {
  const fullText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  // Detect category
  const detectedCategory = detectCategory(fullText, category);

  // Detect intent
  const intent = detectIntent(fullText, detectedCategory);

  // Check age appropriateness
  const ageAppropriate = checkAgeAppropriateness(fullText, frameResults, audioResult);

  // Determine target audience
  const targetAudience = detectTargetAudience(fullText, ageAppropriate);

  // Calculate educational value
  const educationalValue = calculateEducationalValue(fullText, detectedCategory);

  // Calculate context multiplier
  const contextMultiplier = getContextMultiplier(detectedCategory, intent);

  // Check regional compliance
  const regionalCompliance = checkRegionalCompliance(fullText, detectedCategory);

  // Assess cultural sensitivity
  const culturalSensitivity = assessCulturalSensitivity(fullText, detectedCategory);

  return {
    category: detectedCategory,
    intent,
    ageAppropriate,
    targetAudience,
    educationalValue,
    contextMultiplier,
    regionalCompliance,
    culturalSensitivity,
  };
};

/**
 * Detect video category from metadata
 */
const detectCategory = (text: string, providedCategory?: string): ContextAnalysis['category'] => {
  if (providedCategory) {
    return providedCategory as ContextAnalysis['category'];
  }

  const categories: Array<{ name: ContextAnalysis['category']; keywords: string[] }> = [
    {
      name: 'educational',
      keywords: ['tutorial', 'how to', 'learn', 'education', 'teach', 'course', 'lesson', 'explain'],
    },
    {
      name: 'news',
      keywords: ['news', 'breaking', 'report', 'journalism', 'update', 'current events', 'politics'],
    },
    {
      name: 'documentary',
      keywords: ['documentary', 'documenting', 'real story', 'true story', 'investigation'],
    },
    {
      name: 'music',
      keywords: ['music', 'song', 'album', 'official video', 'lyric', 'concert', 'performance'],
    },
    {
      name: 'gaming',
      keywords: ['game', 'gaming', 'gameplay', 'walkthrough', 'lets play', 'esport'],
    },
    {
      name: 'entertainment',
      keywords: ['entertainment', 'fun', 'comedy', 'vlog', 'challenge', 'prank'],
    },
  ];

  for (const { name, keywords } of categories) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return name;
    }
  }

  return 'other';
};

/**
 * Detect creator intent
 */
const detectIntent = (text: string, category: ContextAnalysis['category']): ContextAnalysis['intent'] => {
  const intents: Array<{ name: ContextAnalysis['intent']; keywords: string[] }> = [
    { name: 'educate', keywords: ['learn', 'teach', 'tutorial', 'guide', 'tips', 'how to'] },
    { name: 'inform', keywords: ['news', 'report', 'update', 'information', 'facts'] },
    { name: 'document', keywords: ['documentary', 'record', 'history', 'archive'] },
    { name: 'persuade', keywords: ['review', 'opinion', 'why', 'should', 'must'] },
  ];

  for (const { name, keywords } of intents) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return name;
    }
  }

  // Default based on category
  if (category === 'educational' || category === 'documentary') return 'educate';
  if (category === 'news') return 'inform';
  return 'entertain';
};

/**
 * Check if content is age-appropriate
 */
const checkAgeAppropriateness = (
  text: string,
  frameResults?: any[],
  audioResult?: any
): boolean => {
  const adultKeywords = [
    '18+', 'mature', 'explicit', 'adult', 'nsfw',
    'violence', 'gore', 'horror', 'scary',
  ];

  const hasAdultContent = adultKeywords.some(keyword => text.includes(keyword));

  // Check frame analysis results
  const framesWithAdultContent = frameResults?.filter(
    frame => frame.analysis?.violations?.some((v: string) =>
      v.toLowerCase().includes('adult') || v.toLowerCase().includes('nudity')
    )
  ).length || 0;

  // Check audio analysis
  const audioHasAdultContent = audioResult?.hasAdultContent || false;

  return !hasAdultContent && framesWithAdultContent === 0 && !audioHasAdultContent;
};

/**
 * Detect target audience
 */
const detectTargetAudience = (
  text: string,
  ageAppropriate: boolean
): ContextAnalysis['targetAudience'] => {
  if (!ageAppropriate) return 'mature';

  const matureKeywords = ['mature', '18+', 'adult', 'explicit'];
  const teenKeywords = ['teen', 'young adult', '13+'];
  const kidsKeywords = ['kids', 'children', 'family friendly', 'all ages'];

  if (matureKeywords.some(k => text.includes(k))) return 'mature';
  if (kidsKeywords.some(k => text.includes(k))) return 'all_ages';
  if (teenKeywords.some(k => text.includes(k))) return 'teen';

  return 'all_ages';
};

/**
 * Calculate educational value score (0-100)
 */
const calculateEducationalValue = (
  text: string,
  category: ContextAnalysis['category']
): number => {
  let score = 0;

  // Category base score
  const categoryScores: Record<string, number> = {
    educational: 80,
    documentary: 70,
    news: 60,
    music: 30,
    gaming: 40,
    entertainment: 20,
    other: 10,
  };

  score += categoryScores[category] || 10;

  // Boost for educational keywords
  const eduKeywords = ['learn', 'teach', 'tutorial', 'guide', 'explain', 'understand', 'study'];
  eduKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 5;
  });

  return Math.min(100, score);
};

/**
 * Get context multiplier for violation severity adjustment
 */
export const getContextMultiplier = (
  category: ContextAnalysis['category'],
  intent: ContextAnalysis['intent']
): number => {
  const multipliers: Record<string, Record<string, number>> = {
    educational: {
      inform: 0.3, // Educational + informative = most lenient
      educate: 0.3,
      document: 0.4,
      entertain: 0.6,
      persuade: 0.5,
    },
    news: {
      inform: 0.4, // News reporting = lenient for violence/graphic
      document: 0.5,
      educate: 0.5,
      persuade: 0.6,
      entertain: 0.7,
    },
    documentary: {
      document: 0.4,
      inform: 0.5,
      educate: 0.5,
      persuade: 0.6,
      entertain: 0.7,
    },
    entertainment: {
      entertain: 1.0, // Entertainment = strict enforcement
      persuade: 0.9,
      inform: 0.8,
      educate: 0.7,
      document: 0.8,
    },
    music: {
      entertain: 0.9,
      persuade: 0.8,
      inform: 0.7,
      educate: 0.7,
      document: 0.8,
    },
    gaming: {
      entertain: 0.9,
      educate: 0.7,
      inform: 0.7,
      document: 0.8,
      persuade: 0.8,
    },
    other: {
      entertain: 1.0,
      inform: 0.9,
      educate: 0.8,
      persuade: 0.9,
      document: 0.9,
    },
  };

  return multipliers[category]?.[intent] || 1.0;
};

/**
 * Check regional compliance
 */
const checkRegionalCompliance = (
  text: string,
  category: ContextAnalysis['category']
): Record<string, boolean> => {
  return {
    // EU (GDPR, strict content laws)
    eu: !text.includes('data leak') && !text.includes('privacy violation'),

    // India (IT Rules 2021)
    india: !text.includes('anti-national') && !text.includes('religious hate'),

    // USA (COPPA, DMCA)
    usa: !text.includes('kids data') && !text.includes('copyright bypass'),

    // Middle East (cultural sensitivity)
    middle_east: category !== 'music' || !text.includes('inappropriate'),

    // Global (universally banned content)
    global: !text.includes('terrorism') && !text.includes('child exploitation'),
  };
};

/**
 * Assess cultural sensitivity
 */
const assessCulturalSensitivity = (
  text: string,
  category: ContextAnalysis['category']
): ContextAnalysis['culturalSensitivity'] => {
  const sensitiveKeywords = [
    'religion', 'politics', 'race', 'culture', 'tradition',
    'controversial', 'sensitive', 'debate',
  ];

  const sensitiveCount = sensitiveKeywords.filter(k => text.includes(k)).length;

  if (sensitiveCount >= 3) return 'low';
  if (sensitiveCount >= 1) return 'medium';
  return 'high';
};

/**
 * Adjust violation severity based on context
 */
export const adjustViolationSeverity = (
  originalSeverity: 'low' | 'medium' | 'high' | 'critical',
  contextMultiplier: number
): 'low' | 'medium' | 'high' | 'critical' => {
  const severityScores: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const scoreNames = ['low', 'medium', 'high', 'critical'];
  const originalScore = severityScores[originalSeverity];
  const adjustedScore = Math.round(originalScore * contextMultiplier);

  return scoreNames[Math.max(0, Math.min(3, adjustedScore - 1))] as any;
};

/**
 * Generate context summary for UI
 */
export const generateContextSummary = (context: ContextAnalysis): string => {
  const summaries = {
    educational: '📚 Educational content - Context-aware policy enforcement applied',
    news: '📰 News/Reporting - Journalistic context considered',
    documentary: '🎬 Documentary - Documentary standards applied',
    music: '🎵 Music content - Copyright & licensing checked',
    gaming: '🎮 Gaming content - Age ratings considered',
    entertainment: '🎭 Entertainment - Standard policy enforcement',
    other: '📹 General content - Standard policy enforcement',
  };

  return summaries[context.category] || summaries.other;
};

/**
 * Check if educational exemption applies
 */
export const checkEducationalExemption = (
  context: ContextAnalysis,
  violation: string
): boolean => {
  // Educational content gets leniency for certain violations
  if (context.category !== 'educational' && context.category !== 'news' && context.category !== 'documentary') {
    return false;
  }

  const exemptableViolations = [
    'violence',
    'graphic',
    'disturbing',
    'mature theme',
  ];

  return exemptableViolations.some(v => violation.toLowerCase().includes(v));
};
