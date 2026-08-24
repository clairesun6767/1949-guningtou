/**
 * @deprecated Compatibility wrapper for the former Leaflet battle map.
 * The production experience now uses the evidence-aware HistoricalMapExperience.
 */
import HistoricalMapExperience from './HistoricalMapExperience';

interface Props {
  lang?: string;
}

export default function BattleMap({ lang = 'zh-tw' }: Props) {
  return <HistoricalMapExperience lang={lang} />;
}

