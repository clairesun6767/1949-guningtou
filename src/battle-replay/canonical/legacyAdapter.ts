import { adaptLegacyBattlefieldData } from '../adapters/legacy/LegacyBattlefieldAdapter.js';
import type { LegacyDataInput } from '../adapters/legacy/types.js';
import {
  adaptLegacySourceRegistry,
} from './sourceRegistry.js';
import type { LegacyHistoricalCatalogResult } from './types.js';

/**
 * Read the existing museum datasets into an auditable migration summary.
 * This adapter deliberately stops before canonical promotion: free-text
 * names, approximate coordinates, and candidate relationships remain legacy
 * records until a researcher supplies an explicit review decision.
 */
export function adaptLegacyHistoricalCatalog(
  input: LegacyDataInput,
  battleId = 'BAT-GUN-1949',
): LegacyHistoricalCatalogResult {
  const adapted = adaptLegacyBattlefieldData(input, battleId);
  return {
    sourceRegistry: adaptLegacySourceRegistry(input.sources),
    adapted: {
      sources: adapted.sources.length,
      locations: adapted.locations.length,
      factions: adapted.factions.length,
      units: adapted.units.length,
      events: adapted.events.length,
      topologicalConnections: adapted.topologicalConnections.length,
      promotedRoutes: adapted.routes.length,
    },
    issues: adapted.issues,
    unresolvedReferences: adapted.unresolvedReferences,
    migration: {
      authoritativeSource: 'data/*.json (legacy museum catalog during V1.2 migration)',
      destination: 'data/battles/guningtou-1949 (explicitly reviewed canonical package)',
      promotionPolicy: 'explicit-review-only',
    },
  };
}
