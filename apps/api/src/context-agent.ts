/**
 * EvidentIS Context Agent — Prompt Intelligence System
 *
 * An AI middleware agent that:
 * 1. Captures every user prompt and AI response
 * 2. Enhances user prompts with relevant historical context
 * 3. Analyzes AI responses for quality and legal accuracy markers
 * 4. Organizes all interactions per user and per case/matter
 * 5. Retrieves relevant past interactions to enrich future prompts
 */

import { config } from './config.js';
import { pool } from './database.js';
import { logger } from './logger.js';
import { redis } from './redis.js';

// ============================================================================
// Types
// ============================================================================

export interface PromptInteraction {
  id: string;
  tenantId: string;
  advocateId: string;
  matterId: string | null;
  originalPrompt: string;
  enhancedPrompt: string;
  promptCategory: PromptCategory;
  promptTokens: number | null;
  aiResponse: string | null;
  responseTokens: number | null;
  responseQualityScore: number | null;
  responseHasCitations: boolean;
  contextInteractionIds: string[];
  contextDocumentIds: string[];
  modelUsed: string | null;
  latencyMs: number | null;
  tags: string[];
  createdAt: Date;
}

export type PromptCategory =
  | 'research'
  | 'drafting'
  | 'review'
  | 'analysis'
  | 'general';

export interface EnhancedPromptResult {
  enhancedPrompt: string;
  contextInteractionIds: string[];
  contextDocumentIds: string[];
  promptCategory: PromptCategory;
}

export interface InteractionReport {
  summary: {
    totalInteractions: number;
    byCategory: Record<PromptCategory, number>;
    averageQualityScore: number | null;
    totalPromptTokens: number;
    totalResponseTokens: number;
    dateRange: { from: string; to: string };
  };
  topMatters: Array<{
    matterId: string;
    matterTitle: string;
    interactionCount: number;
  }>;
  recentInteractions: PromptInteraction[];
}

// ============================================================================
// Category Detection
// ============================================================================

const CATEGORY_KEYWORDS: Record<PromptCategory, string[]> = {
  research: [
    'case law',
    'precedent',
    'section',
    'act',
    'statute',
    'judgment',
    'ruling',
    'court',
    'IPC',
    'CrPC',
    'CPC',
    'BNS',
    'BNSS',
    'constitution',
    'article',
    'legal research',
    'find cases',
    'supreme court',
    'high court',
    'tribunal',
  ],
  drafting: [
    'draft',
    'template',
    'agreement',
    'contract',
    'petition',
    'application',
    'affidavit',
    'plaint',
    'written statement',
    'notice',
    'deed',
    'will',
    'power of attorney',
    'memorandum',
    'articles of association',
  ],
  review: [
    'review',
    'check',
    'verify',
    'proofread',
    'compliance',
    'audit',
    'examine',
    'scrutinize',
    'identify issues',
    'red flag',
    'risk',
    'clause analysis',
  ],
  analysis: [
    'analyze',
    'analyse',
    'summarize',
    'summary',
    'explain',
    'interpret',
    'compare',
    'difference',
    'implication',
    'impact',
    'consequence',
    'meaning',
    'significance',
  ],
  general: [],
};

/**
 * Detect the category of a prompt based on keyword matching.
 */
export function detectPromptCategory(prompt: string): PromptCategory {
  const lower = prompt.toLowerCase();
  let bestCategory: PromptCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'general') continue;
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as PromptCategory;
    }
  }

  return bestCategory;
}

// ============================================================================
// Prompt Enhancement
// ============================================================================

/**
 * Rough token count estimate (words / 0.75).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length / 0.75);
}

/**
 * Retrieve relevant past interactions for context injection.
 * Uses full-text search in PostgreSQL to find semantically similar past prompts.
 */
async function findRelevantPastInteractions(
  tenantId: string,
  advocateId: string,
  prompt: string,
  matterId: string | null,
  limit: number = 5,
): Promise<PromptInteraction[]> {
  // Extract meaningful search terms (skip common words)
  const searchTerms = prompt
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10)
    .join(' & ');

  if (!searchTerms) return [];

  const params: unknown[] = [tenantId, advocateId, searchTerms, limit];
  let matterClause = '';

  // Prioritize same-matter interactions if a matter is provided
  if (matterId) {
    matterClause = `
      ORDER BY
        CASE WHEN matter_id = $5 THEN 0 ELSE 1 END,
        ts_rank(to_tsvector('english', original_prompt || ' ' || COALESCE(ai_response, '')), query) DESC,
        created_at DESC`;
    params.push(matterId);
  } else {
    matterClause = `
      ORDER BY
        ts_rank(to_tsvector('english', original_prompt || ' ' || COALESCE(ai_response, '')), query) DESC,
        created_at DESC`;
  }

  const result = await pool.query(
    `SELECT *, plainto_tsquery('english', $3) AS query
     FROM ai_prompt_interactions
     WHERE tenant_id = $1
       AND advocate_id = $2
       AND to_tsvector('english', original_prompt || ' ' || COALESCE(ai_response, ''))
           @@ plainto_tsquery('english', $3)
     ${matterClause}
     LIMIT $4`,
    params,
  );

  return result.rows.map(mapRowToInteraction);
}

/**
 * Build contextual enhancement for a user prompt.
 *
 * Fetches relevant past interactions and, if a matter is provided,
 * relevant document context from the existing ai-context module.
 */
export async function enhancePrompt(
  tenantId: string,
  advocateId: string,
  originalPrompt: string,
  matterId: string | null = null,
): Promise<EnhancedPromptResult> {
  const category = detectPromptCategory(originalPrompt);
  const contextInteractionIds: string[] = [];
  const contextDocumentIds: string[] = [];

  // 1. Find relevant past interactions
  const pastInteractions = await findRelevantPastInteractions(
    tenantId,
    advocateId,
    originalPrompt,
    matterId,
  );

  // 2. Build context block from past interactions
  let contextBlock = '';

  if (pastInteractions.length > 0) {
    contextBlock += '\n\n## Relevant Prior Context\n';
    contextBlock +=
      'The following are relevant excerpts from prior interactions with this user:\n\n';

    for (const interaction of pastInteractions) {
      contextInteractionIds.push(interaction.id);

      // Include a condensed summary of the past interaction
      const responseSnippet = interaction.aiResponse
        ? interaction.aiResponse.slice(0, 300) +
          (interaction.aiResponse.length > 300 ? '...' : '')
        : '(no response recorded)';

      contextBlock += `**Prior Query** (${interaction.promptCategory}, ${new Date(interaction.createdAt).toLocaleDateString('en-IN')}):\n`;
      contextBlock += `> ${interaction.originalPrompt.slice(0, 200)}\n`;
      contextBlock += `**Prior Answer Excerpt**: ${responseSnippet}\n\n`;
    }
  }

  // 3. If a matter is provided, get document context
  if (matterId) {
    try {
      const matterDocs = await pool.query(
        `SELECT id, title, doc_type FROM documents
         WHERE tenant_id = $1 AND matter_id = $2 AND status = 'processed'
         ORDER BY created_at DESC LIMIT 5`,
        [tenantId, matterId],
      );

      if (matterDocs.rows.length > 0) {
        contextBlock += '\n## Active Matter Documents\n';
        for (const doc of matterDocs.rows) {
          contextDocumentIds.push(doc.id);
          contextBlock += `- ${doc.title} (${doc.doc_type})\n`;
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to fetch matter documents for context');
    }
  }

  // 4. Build the enhanced prompt
  let enhancedPrompt = originalPrompt;

  if (contextBlock) {
    enhancedPrompt = `${originalPrompt}\n\n---\n${contextBlock}`;
  }

  // 5. Add category-specific instructions
  const categoryInstructions = getCategoryInstructions(category);
  if (categoryInstructions) {
    enhancedPrompt = `${categoryInstructions}\n\n${enhancedPrompt}`;
  }

  return {
    enhancedPrompt,
    contextInteractionIds,
    contextDocumentIds,
    promptCategory: category,
  };
}

/**
 * Get category-specific system instructions to improve response quality.
 */
function getCategoryInstructions(category: PromptCategory): string | null {
  const instructions: Record<PromptCategory, string | null> = {
    research:
      'You are a legal research assistant for Indian law. Cite specific sections, acts, and case law. ' +
      'Always mention the court, year, and citation format. Distinguish between binding and persuasive precedents.',
    drafting:
      'You are a legal drafting assistant for Indian legal practice. Follow standard Indian legal drafting conventions. ' +
      'Include all mandatory clauses, use precise legal language, and ensure compliance with applicable Indian statutes.',
    review:
      'You are a legal document reviewer. Identify potential risks, missing clauses, compliance gaps, and ambiguities. ' +
      'Rate severity of each issue found. Reference applicable Indian laws and regulations.',
    analysis:
      'You are a legal analyst specializing in Indian law. Provide structured analysis with clear reasoning. ' +
      'Consider all relevant statutes, precedents, and regulatory guidelines.',
    general: null,
  };

  return instructions[category];
}

// ============================================================================
// Response Analysis
// ============================================================================

/**
 * Analyze an AI response for quality markers.
 * Returns a quality score between 0.0 and 1.0.
 */
export function analyzeResponse(response: string): {
  qualityScore: number;
  hasCitations: boolean;
} {
  let score = 0.5; // Base score

  // Check for citations (section references, case citations)
  const hasCitations =
    /\b(Section\s+\d+|Art(?:icle)?\.?\s+\d+|\d{4}\s+\(\d+\)\s+SCC|\d{4}\s+AIR|vs?\.\s+)/i.test(
      response,
    );
  if (hasCitations) score += 0.15;

  // Check for structured reasoning
  const hasStructure =
    /\b(firstly|secondly|thirdly|however|therefore|accordingly|in conclusion|analysis|finding)\b/i.test(
      response,
    );
  if (hasStructure) score += 0.1;

  // Check for adequate length (not too short, not just filler)
  const wordCount = response.split(/\s+/).length;
  if (wordCount > 50 && wordCount < 5000) score += 0.1;
  if (wordCount >= 100) score += 0.05;

  // Check for legal terminology
  const legalTerms =
    /\b(jurisdiction|statute|precedent|liability|indemnity|arbitration|adjudication|tribunal|appellant|respondent)\b/i.test(
      response,
    );
  if (legalTerms) score += 0.1;

  // Cap at 1.0
  return {
    qualityScore: Math.min(1.0, score),
    hasCitations,
  };
}

// ============================================================================
// Storage
// ============================================================================

/**
 * Store a complete interaction (prompt + response) in the database.
 */
export async function storeInteraction(params: {
  tenantId: string;
  advocateId: string;
  matterId?: string | null;
  originalPrompt: string;
  enhancedPrompt: string;
  promptCategory: PromptCategory;
  aiResponse: string;
  contextInteractionIds: string[];
  contextDocumentIds: string[];
  modelUsed?: string;
  latencyMs?: number;
  tags?: string[];
}): Promise<PromptInteraction> {
  const { qualityScore, hasCitations } = analyzeResponse(params.aiResponse);
  const promptTokens = estimateTokens(params.enhancedPrompt);
  const responseTokens = estimateTokens(params.aiResponse);

  const result = await pool.query(
    `INSERT INTO ai_prompt_interactions (
       tenant_id, advocate_id, matter_id,
       original_prompt, enhanced_prompt, prompt_category, prompt_tokens,
       ai_response, response_tokens, response_quality_score, response_has_citations,
       context_interaction_ids, context_document_ids,
       model_used, latency_ms, tags
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      params.tenantId,
      params.advocateId,
      params.matterId || null,
      params.originalPrompt,
      params.enhancedPrompt,
      params.promptCategory,
      promptTokens,
      params.aiResponse,
      responseTokens,
      qualityScore,
      hasCitations,
      params.contextInteractionIds,
      params.contextDocumentIds,
      params.modelUsed || null,
      params.latencyMs || null,
      params.tags || [],
    ],
  );

  logger.info(
    {
      interactionId: result.rows[0].id,
      tenantId: params.tenantId,
      category: params.promptCategory,
      qualityScore,
    },
    'AI interaction stored',
  );

  return mapRowToInteraction(result.rows[0]);
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Get interaction history for a user, optionally filtered by matter.
 */
export async function getInteractionHistory(
  tenantId: string,
  advocateId: string,
  options: {
    matterId?: string;
    category?: PromptCategory;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ interactions: PromptInteraction[]; total: number }> {
  const { matterId, category, limit = 20, offset = 0 } = options;

  const conditions = ['tenant_id = $1', 'advocate_id = $2'];
  const params: unknown[] = [tenantId, advocateId];
  let paramIndex = 3;

  if (matterId) {
    conditions.push(`matter_id = $${paramIndex++}`);
    params.push(matterId);
  }
  if (category) {
    conditions.push(`prompt_category = $${paramIndex++}`);
    params.push(category);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM ai_prompt_interactions WHERE ${whereClause}`,
    params,
  );

  const dataResult = await pool.query(
    `SELECT * FROM ai_prompt_interactions
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return {
    interactions: dataResult.rows.map(mapRowToInteraction),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Get a single interaction by ID.
 */
export async function getInteractionById(
  tenantId: string,
  interactionId: string,
): Promise<PromptInteraction | null> {
  const result = await pool.query(
    `SELECT * FROM ai_prompt_interactions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, interactionId],
  );

  return result.rows.length > 0 ? mapRowToInteraction(result.rows[0]) : null;
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Generate a usage and quality analytics report for a user.
 */
export async function generateUserReport(
  tenantId: string,
  advocateId: string,
  dateRange?: { from: Date; to: Date },
): Promise<InteractionReport> {
  const dateFilter = dateRange
    ? 'AND created_at >= $3 AND created_at <= $4'
    : '';
  const params: unknown[] = [tenantId, advocateId];
  if (dateRange) {
    params.push(dateRange.from, dateRange.to);
  }

  // Summary stats
  const summary = await pool.query(
    `SELECT
       COUNT(*) AS total_interactions,
       prompt_category,
       AVG(response_quality_score) AS avg_quality,
       SUM(prompt_tokens) AS total_prompt_tokens,
       SUM(response_tokens) AS total_response_tokens,
       MIN(created_at) AS first_interaction,
       MAX(created_at) AS last_interaction
     FROM ai_prompt_interactions
     WHERE tenant_id = $1 AND advocate_id = $2 ${dateFilter}
     GROUP BY prompt_category`,
    params,
  );

  const byCategory: Record<PromptCategory, number> = {
    research: 0,
    drafting: 0,
    review: 0,
    analysis: 0,
    general: 0,
  };

  let totalInteractions = 0;
  let totalQuality = 0;
  let qualityCount = 0;
  let totalPromptTokens = 0;
  let totalResponseTokens = 0;
  let earliest = new Date().toISOString();
  let latest = new Date().toISOString();

  for (const row of summary.rows) {
    const cat = row.prompt_category as PromptCategory;
    const count = parseInt(row.total_interactions, 10);
    byCategory[cat] = count;
    totalInteractions += count;
    if (row.avg_quality != null) {
      totalQuality += parseFloat(row.avg_quality) * count;
      qualityCount += count;
    }
    totalPromptTokens += parseInt(row.total_prompt_tokens || '0', 10);
    totalResponseTokens += parseInt(row.total_response_tokens || '0', 10);
    if (row.first_interaction) {
      earliest =
        row.first_interaction < earliest
          ? row.first_interaction
          : earliest;
    }
    if (row.last_interaction) {
      latest =
        row.last_interaction > latest ? row.last_interaction : latest;
    }
  }

  // Top matters
  const topMatters = await pool.query(
    `SELECT
       p.matter_id,
       m.title AS matter_title,
       COUNT(*) AS interaction_count
     FROM ai_prompt_interactions p
     LEFT JOIN matters m ON m.id = p.matter_id AND m.tenant_id = p.tenant_id
     WHERE p.tenant_id = $1 AND p.advocate_id = $2 AND p.matter_id IS NOT NULL ${dateFilter}
     GROUP BY p.matter_id, m.title
     ORDER BY interaction_count DESC
     LIMIT 10`,
    params,
  );

  // Recent interactions
  const recent = await pool.query(
    `SELECT * FROM ai_prompt_interactions
     WHERE tenant_id = $1 AND advocate_id = $2 ${dateFilter}
     ORDER BY created_at DESC
     LIMIT 10`,
    params,
  );

  return {
    summary: {
      totalInteractions,
      byCategory,
      averageQualityScore:
        qualityCount > 0 ? totalQuality / qualityCount : null,
      totalPromptTokens,
      totalResponseTokens,
      dateRange: {
        from: earliest,
        to: latest,
      },
    },
    topMatters: topMatters.rows.map((row: Record<string, unknown>) => ({
      matterId: row.matter_id as string,
      matterTitle: (row.matter_title as string) || 'Untitled Matter',
      interactionCount: parseInt(row.interaction_count as string, 10),
    })),
    recentInteractions: recent.rows.map(mapRowToInteraction),
  };
}

/**
 * Generate a per-matter interaction report.
 */
export async function generateMatterReport(
  tenantId: string,
  matterId: string,
): Promise<InteractionReport> {
  // Summary stats
  const summary = await pool.query(
    `SELECT
       COUNT(*) AS total_interactions,
       prompt_category,
       AVG(response_quality_score) AS avg_quality,
       SUM(prompt_tokens) AS total_prompt_tokens,
       SUM(response_tokens) AS total_response_tokens,
       MIN(created_at) AS first_interaction,
       MAX(created_at) AS last_interaction
     FROM ai_prompt_interactions
     WHERE tenant_id = $1 AND matter_id = $2
     GROUP BY prompt_category`,
    [tenantId, matterId],
  );

  const byCategory: Record<PromptCategory, number> = {
    research: 0,
    drafting: 0,
    review: 0,
    analysis: 0,
    general: 0,
  };

  let totalInteractions = 0;
  let totalQuality = 0;
  let qualityCount = 0;
  let totalPromptTokens = 0;
  let totalResponseTokens = 0;
  let earliest = new Date().toISOString();
  let latest = new Date().toISOString();

  for (const row of summary.rows) {
    const cat = row.prompt_category as PromptCategory;
    const count = parseInt(row.total_interactions, 10);
    byCategory[cat] = count;
    totalInteractions += count;
    if (row.avg_quality != null) {
      totalQuality += parseFloat(row.avg_quality) * count;
      qualityCount += count;
    }
    totalPromptTokens += parseInt(row.total_prompt_tokens || '0', 10);
    totalResponseTokens += parseInt(row.total_response_tokens || '0', 10);
    if (row.first_interaction) {
      earliest =
        row.first_interaction < earliest
          ? row.first_interaction
          : earliest;
    }
    if (row.last_interaction) {
      latest =
        row.last_interaction > latest ? row.last_interaction : latest;
    }
  }

  // Recent interactions
  const recent = await pool.query(
    `SELECT * FROM ai_prompt_interactions
     WHERE tenant_id = $1 AND matter_id = $2
     ORDER BY created_at DESC
     LIMIT 20`,
    [tenantId, matterId],
  );

  return {
    summary: {
      totalInteractions,
      byCategory,
      averageQualityScore:
        qualityCount > 0 ? totalQuality / qualityCount : null,
      totalPromptTokens,
      totalResponseTokens,
      dateRange: {
        from: earliest,
        to: latest,
      },
    },
    topMatters: [],
    recentInteractions: recent.rows.map(mapRowToInteraction),
  };
}

// ============================================================================
// Full Pipeline: Enhance → Call AI → Analyze → Store
// ============================================================================

/**
 * Execute the full Context Agent pipeline:
 * 1. Enhance the prompt with historical context
 * 2. Send to AI service
 * 3. Analyze the response
 * 4. Store the complete interaction
 */
export async function executePromptPipeline(params: {
  tenantId: string;
  advocateId: string;
  prompt: string;
  matterId?: string;
  tags?: string[];
}): Promise<{
  interaction: PromptInteraction;
  aiResponse: string;
  enhancedPrompt: string;
  category: PromptCategory;
}> {
  const startTime = Date.now();

  // 1. Enhance prompt
  const enhancement = await enhancePrompt(
    params.tenantId,
    params.advocateId,
    params.prompt,
    params.matterId || null,
  );

  // 2. Call AI service
  const aiResponse = await callAIService(enhancement.enhancedPrompt);
  const latencyMs = Date.now() - startTime;

  // 3. Store interaction (analysis happens inside)
  const interaction = await storeInteraction({
    tenantId: params.tenantId,
    advocateId: params.advocateId,
    matterId: params.matterId,
    originalPrompt: params.prompt,
    enhancedPrompt: enhancement.enhancedPrompt,
    promptCategory: enhancement.promptCategory,
    aiResponse,
    contextInteractionIds: enhancement.contextInteractionIds,
    contextDocumentIds: enhancement.contextDocumentIds,
    modelUsed: 'ollama-default',
    latencyMs,
    tags: params.tags,
  });

  return {
    interaction,
    aiResponse,
    enhancedPrompt: enhancement.enhancedPrompt,
    category: enhancement.promptCategory,
  };
}

/**
 * Call the AI service with an enhanced prompt.
 */
async function callAIService(prompt: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.AI_SERVICE_INTERNAL_KEY) {
    headers['x-internal-key'] = config.AI_SERVICE_INTERNAL_KEY;
  }

  const response = await fetch(`${config.AI_SERVICE_URL}/research`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: prompt,
      stream: false,
      max_results: 5,
    }),
    signal: AbortSignal.timeout(config.AI_SERVICE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(
      `AI service returned ${response.status}: ${errorText}`,
    );
  }

  const result = (await response.json()) as { answer?: string };
  return result.answer || '(No response generated)';
}

// ============================================================================
// Helpers
// ============================================================================

function mapRowToInteraction(row: Record<string, unknown>): PromptInteraction {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    advocateId: row.advocate_id as string,
    matterId: (row.matter_id as string) || null,
    originalPrompt: row.original_prompt as string,
    enhancedPrompt: row.enhanced_prompt as string,
    promptCategory: row.prompt_category as PromptCategory,
    promptTokens: (row.prompt_tokens as number) || null,
    aiResponse: (row.ai_response as string) || null,
    responseTokens: (row.response_tokens as number) || null,
    responseQualityScore: (row.response_quality_score as number) || null,
    responseHasCitations: (row.response_has_citations as boolean) || false,
    contextInteractionIds: (row.context_interaction_ids as string[]) || [],
    contextDocumentIds: (row.context_document_ids as string[]) || [],
    modelUsed: (row.model_used as string) || null,
    latencyMs: (row.latency_ms as number) || null,
    tags: (row.tags as string[]) || [],
    createdAt: new Date(row.created_at as string),
  };
}
