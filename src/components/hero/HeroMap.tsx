import HistoricalMapExperience from '../map/HistoricalMapExperience';

interface Props {
  base?: string;
  lang?: string;
}

export default function HeroMap({ base = '/1949-guningtou', lang = 'zh-tw' }: Props) {
  return <HistoricalMapExperience base={base} lang={lang} compact />;
}

