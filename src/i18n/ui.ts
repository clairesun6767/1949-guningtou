// ============================================================
// 全站共用 UI 字典 — 三語 (zh-tw / zh-cn / en)
// ============================================================

export type Lang = 'zh-tw' | 'zh-cn' | 'en';

export const UI: Record<Lang, Record<string, string>> = {
  'zh-tw': {
    siteTitle: '古寧頭戰役 1949',
    siteTagline: '以歷史見和平',
    siteDesc: '1949 年古寧頭戰役數位知識平台。以歷史見和平，多史觀並存。',
    home: '首頁',
    search: '搜尋...',

    // Nav groups
    navUnderstanding: '認識戰役',
    navContext: '世界局勢與戰役背景',
    navAnalysis: '戰役解析',
    navAftermath: '戰後影響',
    navBattlefield: '走進戰場',
    navTimeline: '四日時間軸',
    navMap: '戰役地圖',
    navStories: '戰役故事',
    navPeople: '人物與現場',
    navFigures: '人物',
    navLocations: '地點',
    navWeapons: '武器',
    navArtifacts: '文物',
    navResearch: '史料研究',
    navPerspectives: '多元觀點',
    navSources: '文獻資料庫',
    navArchive: '數位典藏',
    navPeace: '和平與計畫',
    navAfterwar: '戰後至今',
    navBattlefieldOS: 'Battlefield OS',
    navAbout: '關於本站',

    // Perspectives page
    rocAccounts: '國軍記載',
    plaAccounts: '解放軍記載',
    civilianMemory: '居民記憶',
    sourceDifferences: '史料差異',
    verified: '已多方證實',
    partiallyVerified: '部分證實',
    disputed: '存在爭議',
    oralAccounts: '口述資料為主',
    politicallyContested: '政治性爭議',
    methodology: '研究方法',

    // Footer
    footerPlatform: '古寧頭戰役數位知識平台 · 1949',
    footerSource: '資料來源：Battlefield Research Database · 所有史料均附來源 · 多史觀並存 · 政治中立',
    footerPeace: '歷史已然發生，無法改變。透過理解歷史，珍惜和平的可貴。',
    footerReport: '發現錯誤或想補充史料？',
    footerReportLink: '回報問題',
    footerUpdated: '最後更新',
    footerVersion: '資料版本 v1.0',

    // Translation status
    translationInProgress: '部分內容正在翻譯中，未完成段落暫時顯示繁體中文。',
  },

  'zh-cn': {
    siteTitle: '古宁头战役 1949',
    siteTagline: '以历史见和平',
    siteDesc: '1949 年古宁头战役数字知识平台。以历史见和平，多史观并存。',
    home: '首页',
    search: '搜索...',

    navUnderstanding: '认识战役',
    navContext: '世界局势与战役背景',
    navAnalysis: '战役解析',
    navAftermath: '战后影响',
    navBattlefield: '走进战场',
    navTimeline: '四日时间轴',
    navMap: '战役地图',
    navStories: '战役故事',
    navPeople: '人物与现场',
    navFigures: '人物',
    navLocations: '地点',
    navWeapons: '武器',
    navArtifacts: '文物',
    navResearch: '史料研究',
    navPerspectives: '多元视角',
    navSources: '文献数据库',
    navArchive: '数字典藏',
    navPeace: '和平与计划',
    navAfterwar: '战后至今',
    navBattlefieldOS: 'Battlefield OS',
    navAbout: '关于本站',

    rocAccounts: '国军记载',
    plaAccounts: '解放军记载',
    civilianMemory: '居民记忆',
    sourceDifferences: '史料差异',
    verified: '已多方证实',
    partiallyVerified: '部分证实',
    disputed: '存在争议',
    oralAccounts: '口述资料为主',
    politicallyContested: '政治性争议',
    methodology: '研究方法',

    footerPlatform: '古宁头战役数字知识平台 · 1949',
    footerSource: '数据来源：Battlefield Research Database · 所有史料均附来源 · 多史观并存 · 政治中立',
    footerPeace: '历史已然发生，无法改变。透过理解历史，珍惜和平的可贵。',
    footerReport: '发现错误或想补充史料？',
    footerReportLink: '回报问题',
    footerUpdated: '最后更新',
    footerVersion: '数据版本 v1.0',

    translationInProgress: '部分内容正在翻译中，未完成段落暂时显示繁体中文。',
  },

  en: {
    siteTitle: 'Battle of Guningtou 1949',
    siteTagline: 'Learning Peace Through History',
    siteDesc: 'Digital knowledge platform for the 1949 Battle of Guningtou. Multiple perspectives, one history.',
    home: 'Home',
    search: 'Search...',

    navUnderstanding: 'Understanding the Battle',
    navContext: 'World Context & Background',
    navAnalysis: 'Battle Analysis',
    navAftermath: 'Aftermath & Impact',
    navBattlefield: 'Explore the Battlefield',
    navTimeline: 'Four-Day Timeline',
    navMap: 'Battle Map',
    navStories: 'Battle Stories',
    navPeople: 'People & Sites',
    navFigures: 'Key Figures',
    navLocations: 'Locations',
    navWeapons: 'Weapons',
    navArtifacts: 'Artifacts',
    navResearch: 'Sources & Research',
    navPerspectives: 'Multiple Perspectives',
    navSources: 'Document Database',
    navArchive: 'Digital Archive',
    navPeace: 'Peace & Projects',
    navAfterwar: 'Post-War to Today',
    navBattlefieldOS: 'Battlefield OS',
    navAbout: 'About',

    rocAccounts: 'ROC Accounts',
    plaAccounts: 'PLA Accounts',
    civilianMemory: 'Civilian Recollections',
    sourceDifferences: 'Differences Between Sources',
    verified: 'Verified by multiple sources',
    partiallyVerified: 'Partially verified',
    disputed: 'Disputed',
    oralAccounts: 'Based on oral accounts',
    politicallyContested: 'Politically contested',
    methodology: 'Research Methodology',

    footerPlatform: 'Battle of Guningtou Digital Knowledge Platform · 1949',
    footerSource: 'Data: Battlefield Research Database · All claims cite sources · Multiple perspectives · Politically neutral',
    footerPeace: 'History cannot be changed. Through understanding history, we learn to cherish peace.',
    footerReport: 'Found an error or have additional sources?',
    footerReportLink: 'Report an issue',
    footerUpdated: 'Last updated',
    footerVersion: 'Data version v1.0',

    translationInProgress: 'Some sections are still being translated. Where a translation is unavailable, the original Traditional Chinese text is shown.',
  },
};

export function t(key: string, lang: Lang): string {
  return UI[lang]?.[key] || UI['zh-tw']?.[key] || key;
}
