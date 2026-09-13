import type { LocalizedText } from '../types/index.js';
import type {
  SourceRegistryEntry,
  SourceRegistryType,
} from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsFrom(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return [];
  return Array.isArray(input.sources) ? input.sources : [];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function localized(value: unknown): LocalizedText | undefined {
  const normalized = text(value);
  return normalized ? { 'zh-Hant': normalized } : undefined;
}

/**
 * Normalize legacy source vocabulary without changing the legacy catalog.
 * The original value is retained in metadata so the registry never loses
 * provenance or silently claims a stronger source class.
 */
export function sourceRegistryType(value: unknown): SourceRegistryType {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('口述')) return 'ORAL_HISTORY';
  if (raw.includes('地圖') || raw.includes('地图') || raw.includes('航照') || raw.includes('航拍')) return 'MAP';
  if (raw.includes('照片') || raw.includes('影像') || raw.includes('油畫') || raw.includes('油画')) return 'PHOTO';
  if (raw.includes('檔案') || raw.includes('档案') || raw.includes('archive')) return 'ARCHIVE';
  if (raw.includes('官方') || raw.includes('政府') || raw.includes('國防部') || raw.includes('国防部')) return 'OFFICIAL_RECORD';
  if (raw.includes('論文') || raw.includes('论文') || raw.includes('學術') || raw.includes('学术') || raw.includes('research')) return 'RESEARCH';
  if (raw.includes('新聞') || raw.includes('新闻') || raw.includes('article')) return 'ARTICLE';
  if (raw.includes('網站') || raw.includes('网站') || raw.includes('網') || raw.includes('web')) return 'WEBSITE';
  if (raw.includes('書') || raw.includes('书') || raw.includes('出版')) return 'BOOK';
  return 'UNKNOWN';
}

export function adaptLegacySourceRegistry(input: unknown): SourceRegistryEntry[] {
  return recordsFrom(input).flatMap(item => {
    if (!isRecord(item)) return [];
    const id = text(item.source_id);
    const title = localized(item.title);
    if (!id || !title) return [];
    const urlOrIdentifier = text(item.url_or_identifier);
    const author = localized(item.author_or_institution);
    const citation = text(item.relevant_pages_or_sections);
    const notes = localized(item.notes);
    return [{
      id,
      title,
      type: sourceRegistryType(item.source_type),
      author,
      year: text(item.publication_date),
      url: urlOrIdentifier?.startsWith('http') ? urlOrIdentifier : undefined,
      archiveId: urlOrIdentifier && !urlOrIdentifier.startsWith('http') ? urlOrIdentifier : undefined,
      citation,
      notes,
      legacyVerificationStatus: text(item.verification_status),
      provenance: {
        dataset: 'data/sources.json',
        legacyId: id,
      },
      metadata: {
        legacySourceType: item.source_type,
        sourceLevel: item.source_level,
        evidenceLevel: item.evidence_level,
        accessDate: item.access_date,
        relevanceSummary: item.relevance_summary,
        usageRights: item.usage_rights,
      },
    } satisfies SourceRegistryEntry];
  });
}

export function sourceRegistryIds(registry: SourceRegistryEntry[]): Set<string> {
  return new Set(registry.map(source => source.id));
}
