import { toSimplified } from './historicalContent';

const RANK_TRANSLATIONS: Record<string, string> = {
  '陸軍一級上將': 'Army General',
  '陸軍二級上將': 'Army General',
  '陸軍中將': 'Lieutenant General',
  '陸軍少將': 'Major General',
  '空軍一級上將': 'Air Force General',
  '海軍上將': 'Admiral',
  '上校': 'Colonel',
  '二兵': 'Private',
  '排長': 'Platoon commander',
  '副駕駛': 'Co-pilot',
  '營長': 'Battalion commander',
  '團長': 'Regimental commander',
  '師長': 'Division commander',
  '司令員': 'Commander',
  '副軍長': 'Deputy army commander',
  '軍長': 'Army commander',
  '中共中央主席': 'Chairman of the Central Committee',
  '副司令員': 'Deputy commander',
  '連長': 'Company commander',
};

export function displayRank(value: string | undefined, lang = 'zh-tw'): string | undefined {
  if (!value) return value;
  if (lang === 'en') return RANK_TRANSLATIONS[value] ?? value;
  return lang === 'zh-cn' ? toSimplified(value) : value;
}
export function displayVerificationStatus(value: string | undefined, lang = 'zh-tw'): string | undefined {
  if (!value) return value;
  const labels: Record<string, string> = {
    verified: 'Verified',
    partially_verified: 'Partially verified',
    conflicting_sources: 'Conflicting sources',
    needs_human_review: 'Needs human review',
    reviewed_v2: 'Reviewed',
  };
  if (lang === 'en') return labels[value] ?? value.replaceAll('_', ' ');
  const zhCn: Record<string, string> = {
    verified: '已多方证实',
    partially_verified: '部分证实',
    conflicting_sources: '来源存在冲突',
    needs_human_review: '需要人工审查',
    reviewed_v2: '已审阅',
  };
  return lang === 'zh-cn' ? zhCn[value] ?? toSimplified(value.replaceAll('_', ' ')) : value;
}

function ordinal(value: string): string {
  const number = Number(value);
  if (number % 100 >= 11 && number % 100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
}

export function displayUnit(value: string | undefined, lang = 'zh-tw'): string | undefined {
  if (!value) return value;
  if (lang === 'zh-cn') return toSimplified(value);
  if (lang !== 'en') return value;
  return value
    .replace(/第(\d+)兵團/g, (_, number: string) => `${ordinal(number)} Army Group`)
    .replace(/第(\d+)軍/g, (_, number: string) => `${ordinal(number)} Army`)
    .replace(/第(\d+)師/g, (_, number: string) => `${ordinal(number)} Division`)
    .replace(/第(\d+)團/g, (_, number: string) => `${ordinal(number)} Regiment`)
    .replace(/第(\d+)營/g, (_, number: string) => `${ordinal(number)} Battalion`)
    .replace(/第(\d+)連/g, (_, number: string) => `${ordinal(number)} Company`)
    .replace(/第(\d+)排/g, (_, number: string) => `${ordinal(number)} Platoon`)
    .replace(/戰車/g, 'Tank ')
    .replace(/海軍/g, 'Navy ')
    .replace(/空軍/g, 'Air Force ')
    .replace(/岸防砲兵/g, 'coastal artillery')
    .replace(/步兵/g, 'infantry');
}
