const TERMS: Array<[string, string]> = [
  ['金門要塞總台', 'Kinmen Fortress Headquarters'],
  ['金門防衛司令部', 'Kinmen Defence Command'],
  ['金門防衛部隊', 'Kinmen defence forces'],
  ['福州綏靖公署', 'Fukien Pacification Headquarters'],
  ['華東軍區', 'East China Military District'],
  ['國軍後勤部隊', 'ROC logistics units'],
  ['國軍後勤', 'ROC logistics'],
  ['國軍岸防部隊', 'ROC coastal-defence units'],
  ['國軍海岸防衛部隊', 'ROC coastal-defence forces'],
  ['國軍包圍部隊', 'ROC encircling forces'],
  ['國軍追擊部隊', 'ROC pursuit forces'],
  ['國軍搜索部隊', 'ROC search units'],
  ['國軍清剿部隊', 'ROC clearance units'],
  ['國軍接收部隊', 'ROC receiving units'],
  ['岸防砲兵', 'coastal artillery'],
  ['戰車部隊', 'tank units'],
  ['戰車第3團', '3rd Tank Regiment'],
  ['空軍第3大隊', 'Air Force 3rd Group'],
  ['空軍第1轟炸大隊', 'Air Force 1st Bomber Group'],
  ['第45師(FAC小組)', '45th Division (FAC group)'],
  ['第45師', '45th Division'],
  ['第12兵團司令部', '12th Army Group headquarters'],
  ['第12兵團', '12th Army Group'],
  ['第22兵團司令部', '22nd Army Group headquarters'],
  ['第22兵團工兵', '22nd Army Group engineers'],
  ['第22兵團', '22nd Army Group'],
  ['第十兵團', 'Tenth Army Group'],
  ['解放軍華東軍區', 'PLA East China Military District'],
  ['解放軍', 'PLA'],
  ['解放軍第一梯隊', 'PLA first wave'],
  ['解放軍第二梯隊', 'PLA second wave'],
  ['解放軍先遣', 'PLA advance force'],
  ['解放軍灘頭部隊', 'PLA beachhead force'],
  ['解放軍灘頭與船隻', 'PLA beachhead troops and boats'],
  ['解放軍船團', 'PLA transport fleet'],
  ['解放軍殘部', 'PLA remnants'],
  ['解放軍散兵', 'PLA stragglers'],
  ['解放軍增援部隊', 'PLA reinforcement force'],
  ['解放軍增援殘部', 'PLA reinforcement remnants'],
  ['解放軍據點', 'PLA positions'],
  ['解放軍第28,29,31軍', 'PLA 28th, 29th, and 31st Armies'],
  ['解放軍第29,31軍', 'PLA 29th and 31st Armies'],
  ['解放軍第28軍', 'PLA 28th Army'],
  ['解放軍第246團', 'PLA 246th Regiment'],
  ['解放軍第251團殘部', 'PLA remnants of the 251st Regiment'],
  ['解放軍第251團一部', 'part of the PLA 251st Regiment'],
  ['解放軍第251團', 'PLA 251st Regiment'],
  ['解放軍第253團一部', 'part of the PLA 253rd Regiment'],
  ['解放軍第253團', 'PLA 253rd Regiment'],
  ['解放軍第244團(先遣)', 'PLA 244th Regiment (advance element)'],
  ['解放軍第244團殘部', 'PLA remnants of the 244th Regiment'],
  ['解放軍第244團', 'PLA 244th Regiment'],
  ['解放軍第259團第3連(約30人)', 'PLA 259th Regiment, 3rd Company (about 30 troops)'],
  ['解放軍第259團第3連', 'PLA 259th Regiment, 3rd Company'],
  ['第246團、第85師', '246th Regiment and 85th Division'],
  ['第259團第3連(約30人)', '259th Regiment, 3rd Company (about 30 troops)'],
  ['第253團(徐博)', '253rd Regiment (Xu Bo)'],
  ['第19軍(第13,14,18師)', '19th Army (13th, 14th, and 18th Divisions)'],
  ['第25軍(第40,45師)', '25th Army (40th and 45th Divisions)'],
  ['第18軍(第11,43,118師)', '18th Army (11th, 43rd, and 118th Divisions)'],
  ['第201師第601團', '201st Division, 601st Regiment'],
  ['第201師第602團', '201st Division, 602nd Regiment'],
  ['第201師全部', 'entire 201st Division'],
  ['第201師', '201st Division'],
  ['第118師第354團', '118th Division, 354th Regiment'],
  ['第118師第353團', '118th Division, 353rd Regiment'],
  ['第118師第352團', '118th Division, 352nd Regiment'],
  ['第118師(第352,353,354團)', '118th Division (352nd, 353rd, and 354th Regiments)'],
  ['第118師、第25軍', '118th and 25th Armies'],
  ['第118師、第14師、第40師(火力)', '118th and 14th Divisions, with 40th Division fire support'],
  ['第118師、戰車部隊', '118th Division and tank units'],
  ['第118師', '118th Division'],
  ['第14師第42團', '14th Division, 42nd Regiment'],
  ['第14師', '14th Division'],
  ['第40師、第11師', '40th and 11th Divisions'],
  ['第40師(火力)', '40th Division (fire support)'],
  ['第40師', '40th Division'],
  ['第43師', '43rd Division'],
  ['第五軍(第166,200師)', '5th Army (166th and 200th Divisions)'],
  ['第五軍', '5th Army'],
  ['第19軍', '19th Army'],
  ['第25軍', '25th Army'],
  ['第18軍', '18th Army'],
  ['第11師31團', '11th Division, 31st Regiment'],
  ['第18師52團', '18th Division, 52nd Regiment'],
  ['第3團第1營', '3rd Regiment, 1st Battalion'],
  ['第3團第1連第1排', '3rd Regiment, 1st Company, 1st Platoon'],
  ['第1轟炸大隊', '1st Bomber Group'],
  ['第3戰鬥大隊', '3rd Fighter Group'],
  ['空軍全面', 'ROC Air Force'],
  ['空軍(P-47、B-24)', 'ROC Air Force (P-47 and B-24)'],
  ['空軍(P-51)', 'ROC Air Force (P-51)'],
  ['空軍', 'ROC Air Force'],
  ['海軍第2艦隊', 'ROC Navy Second Fleet'],
  ['海軍、空軍', 'ROC Navy and Air Force'],
  ['海軍', 'ROC Navy'],
  ['國軍', 'ROC forces'],
  ['國軍部隊', 'ROC forces'],
  ['國軍各部', 'ROC units'],
  ['多部', 'multiple ROC units'],
  ['全體', 'entire force'],
  ['第十兵團', 'Tenth Army Group'],
  ['金門西半島灘頭', 'western Kinmen beachhead'],
  ['金門西半島', 'western Kinmen peninsula'],
  ['金門全境', 'all of Kinmen'],
  ['金門全島', 'the whole of Kinmen'],
  ['金門各地', 'across Kinmen'],
  ['金門北部外海', 'waters off northern Kinmen'],
  ['金門北部海域', 'northern Kinmen waters'],
  ['金門—大陸間海域', 'waters between Kinmen and the mainland'],
  ['金門北岸', 'northern Kinmen coast'],
  ['古寧頭北端海岸', 'northern Guningtou coast'],
  ['古寧頭北岸', 'northern Guningtou coast'],
  ['古寧頭北端懸崖', 'northern Guningtou cliff'],
  ['古寧頭北端', 'northern Guningtou'],
  ['古寧頭市區', 'Guningtou village'],
  ['古寧頭外圍', 'outskirts of Guningtou'],
  ['金門南海岸', 'southern Kinmen coast'],
  ['水頭—湖南高地', 'Shuitou–Hunan Heights'],
  ['水頭', 'Shuitou'],
  ['蓮河—大登島', 'Lianhe–Daden Island'],
  ['蓮河港', 'Lianhe Harbour'],
  ['蓮河', 'Lianhe'],
  ['金門—大陸', 'Kinmen–mainland'],
  ['廈門—汕頭', 'Xiamen–Shantou'],
  ['海上—金門', 'at sea–Kinmen'],
  ['嚨口—後沙—湖尾—古寧頭', 'Longkou–Housha–Huwei–Guningtou'],
  ['嚨口—后沙', 'Longkou–Housha'],
  ['蘭厝—嚨口', 'Lantso–Longkou'],
  ['湖尾—古寧頭', 'Huwei–Guningtou'],
  ['埔頭—林厝—古寧頭', 'Putou–Lincuo–Guningtou'],
  ['埔頭—林厝', 'Putou–Lincuo'],
  ['林厝—古寧頭', 'Lincuo–Guningtou'],
  ['古寧頭東南', 'southeast of Guningtou'],
  ['古寧頭', 'Guningtou'],
  ['湖尾高地', 'Huwei Heights'],
  ['湖南高地', 'Hunan Heights'],
  ['湖尾', 'Huwei'],
  ['南山', 'Nanshan'],
  ['林厝', 'Lincuo'],
  ['埔頭', 'Putou'],
  ['觀音亭山', 'Kuanyin Pavilion Hill'],
  ['雙乳山', 'Shuangru Hill'],
  ['太武山', 'Mount Taiwu'],
  ['金門', 'Kinmen'],
  ['福建', 'Fujian'],
  ['閩北', 'northern Fujian'],
  ['漳州', 'Zhangzhou'],
  ['福州', 'Fuzhou'],
  ['廈門', 'Xiamen'],
  ['汕頭', 'Shantou'],
  ['大登島', 'Daden Island'],
  ['小登島', 'Xiaodeng Island'],
  ['胡璉', 'Hu Lien'],
  ['葉飛', 'Ye Fei'],
  ['陳毅', 'Chen Yi'],
  ['粟裕', 'Su Yu'],
  ['湯恩伯', 'Tang Enbo'],
  ['李良榮', 'Li Liangrong'],
  ['沈向奎', 'Shen Xiangkui'],
  ['鄭果', 'Zheng Guo'],
  ['孫立人', 'Sun Li-jen'],
  ['雷開瑄', 'Lei Kaixuan'],
  ['傅伊仁', 'Fu Yiren'],
  ['陳振威', 'Chen Zhenwei'],
  ['陳誠', 'Chen Cheng'],
  ['羅卓英', 'Luo Zhuoying'],
  ['蕭鋒', 'Xiao Feng'],
  ['朱紹清', 'Zhu Shaoqing'],
  ['高魁元', 'Kao Kuei-yuan'],
  ['李樹蘭', 'Li Shulan'],
  ['劉雲瀚', 'Liu Yunhan'],
  ['李運成', 'Li Yuncheng'],
  ['周至柔', 'Chou Chih-jou'],
  ['邢永生', 'Xing Yongsheng'],
  ['劉天祥', 'Liu Tianxiang'],
  ['熊震球', 'Xiong Zhenqiu'],
  ['楊展', 'Yang Zhan'],
  ['曾紹林', 'Zeng Shaolin'],
  ['李光前', 'Li Guangqian'],
  ['楊書田', 'Yang Shutian'],
  ['唐俊賢', 'Tang Junxian'],
  ['林書嶠', 'Lin Shu-chiao'],
  ['毛澤東', 'Mao Zedong'],
  ['孫玉秀', 'Sun Yuxiu'],
  ['徐博', 'Xu Bo'],
  ['勞聲寰', 'Lao Shenghuan'],
  ['東北風', 'northeast wind'],
  ['西堡', 'Xipu'],
  ['安岐', 'Anqi'],
  ['瓊林', 'Qionglin'],
  ['第一梯隊', 'first wave'],
  ['第二梯隊', 'second wave'],
  ['殘部', 'remnants'],
  ['約', 'approx. '],
];

function ordinal(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const suffix = number % 100 >= 11 && number % 100 <= 13 ? 'th' : number % 10 === 1 ? 'st' : number % 10 === 2 ? 'nd' : number % 10 === 3 ? 'rd' : 'th';
  return String(number) + suffix;
}

export function translateTimelineField(value?: string): string {
  if (!value) return '';
  let result = value.replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/、/g, ', ').replace(/，/g, ', ').replace(/；/g, '; ');
  for (const [source, target] of TERMS.slice().sort((a, b) => b[0].length - a[0].length)) result = result.split(source).join(target);
  return result
    .replace(/第(\d+)兵團/g, (_, n: string) => ordinal(n) + ' Army Group')
    .replace(/第(\d+)軍/g, (_, n: string) => ordinal(n) + ' Army')
    .replace(/第(\d+)師/g, (_, n: string) => ordinal(n) + ' Division')
    .replace(/第(\d+)團/g, (_, n: string) => ordinal(n) + ' Regiment')
    .replace(/第(\d+)營/g, (_, n: string) => ordinal(n) + ' Battalion')
    .replace(/第(\d+)連/g, (_, n: string) => ordinal(n) + ' Company')
    .replace(/第(\d+)排/g, (_, n: string) => ordinal(n) + ' Platoon')
    .replace(/第(\d+)門/g, '$1 guns')
    .replace(/第(\d+)架次/g, '$1 sorties')
    .replace(/第十二/g, '12th')
    .replace(/第十八/g, '18th')
    .replace(/第五/g, '5th')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function translateTimelineTime(value?: string): string {
  if (!value) return '';
  return value
    .replace(/約/g, 'approx. ')
    .replace(/傍晚/g, 'evening')
    .replace(/黃昏/g, 'dusk')
    .replace(/拂曉/g, 'before dawn')
    .replace(/黎明/g, 'dawn')
    .replace(/凌晨/g, 'early morning')
    .replace(/清晨/g, 'early morning')
    .replace(/上午/g, 'morning')
    .replace(/下午/g, 'afternoon')
    .replace(/夜間/g, 'at night')
    .replace(/夜晚/g, 'night')
    .replace(/夜/g, 'night')
    .replace(/中午/g, 'noon')
    .replace(/整夜/g, 'through the night')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
