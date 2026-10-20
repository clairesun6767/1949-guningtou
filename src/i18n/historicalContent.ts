import type { Event, HistoricalPerson, POI, TimelineEntry } from '../data/types';
import { TIMELINE_ENGLISH } from './timelineEnglish';
import { translateTimelineField } from './timelineFieldTranslation';

export type SiteLang = 'zh-tw' | 'zh-cn' | 'en';

export interface PersonCopy {
  name: string;
  category: string;
  role: string;
  bio: string;
  actions: string;
}

export interface PoiCopy {
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  historicalBackground: string;
  battleRole: string;
  historicalContext: string;
  importance: string;
  coordinateAccuracy: string;
  coordinateBasis: string;
  coordinateNote: string;
  openStatus: string;
}

export interface EventCopy {
  title: string;
  description: string;
  location: string;
  participants: string;
  rocUnits: string;
  plaUnits: string;
  commanders: string;
}

export interface TimelineCopy {
  title: string;
  description: string;
  location: string;
  rocUnits: string;
  plaUnits: string;
  keyFigures: string;
}

/**
 * The site stores the canonical historical record in Traditional Chinese.
 * This intentionally small character table is only for the zh-cn display
 * layer; it is not used to alter source data or to claim an independent
 * editorial translation. English fields below are authored presentation
 * copy, while unresolved records visibly remain under review.
 */
export const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  戰: '战',
  役: '役',
  國: '国',
  軍: '军',
  黨: '党',
  共: '共',
  產: '产',
  亞: '亚',
  萬: '万',
  東: '东',
  西: '西',
  南: '南',
  北: '北',
  門: '门',
  頭: '头',
  古: '古',
  寧: '宁',
  葉: '叶',
  飛: '飞',
  金: '金',
  廈: '厦',
  閩: '闽',
  臺: '台',
  台: '台',
  灣: '湾',
  兩: '两',
  岸: '岸',
  觀: '观',
  點: '点',
  據: '据',
  體: '体',
  參: '参',
  與: '与',
  計: '计',
  畫: '画',
  讀: '读',
  這: '这',
  個: '个',
  仍: '仍',
  發: '发',
  生: '生',
  的: '的',
  現: '现',
  場: '场',
  歷: '历',
  史: '史',
  資: '资',
  料: '料',
  數: '数',
  來: '来',
  源: '源',
  研: '研',
  究: '究',
  進: '进',
  行: '行',
  變: '变',
  化: '化',
  轉: '转',
  換: '换',
  會: '会',
  開: '开',
  關: '关',
  閉: '闭',
  麼: '么',
  為: '为',
  於: '于',
  後: '后',
  續: '续',
  影: '影',
  響: '响',
  記: '记',
  憶: '忆',
  時: '时',
  間: '间',
  內: '内',
  軸: '轴',
  第: '第',
  一: '一',
  二: '二',
  三: '三',
  四: '四',
  五: '五',
  六: '六',
  七: '七',
  八: '八',
  九: '九',
  十: '十',
  風: '风',
  潮: '潮',
  汐: '汐',
  海: '海',
  灘: '滩',
  船: '船',
  艦: '舰',
  砲: '炮',
  炮: '炮',
  彈: '弹',
  火: '火',
  力: '力',
  攻: '攻',
  擊: '击',
  守: '守',
  防: '防',
  線: '线',
  反: '反',
  包: '包',
  圍: '围',
  登: '登',
  陸: '陆',
  道: '道',
  路: '路',
  村: '村',
  莊: '庄',
  聚: '聚',
  落: '落',
  高: '高',
  地: '地',
  山: '山',
  崖: '崖',
  館: '馆',
  廟: '庙',
  園: '园',
  區: '区',
  營: '营',
  壘: '垒',
  堡: '堡',
  遺: '遗',
  跡: '迹',
  檔: '档',
  案: '案',
  圖: '图',
  像: '像',
  照: '照',
  閱: '阅',
  覽: '览',
  人: '人',
  物: '物',
  單: '单',
  位: '位',
  指: '指',
  揮: '挥',
  官: '官',
  兵: '兵',
  師: '师',
  團: '团',
  連: '连',
  長: '长',
  將: '将',
  領: '领',
  司: '司',
  令: '令',
  決: '决',
  策: '策',
  調: '调',
  整: '整',
  命: '命',
  增: '增',
  援: '援',
  抵: '抵',
  達: '达',
  接: '接',
  掌: '掌',
  權: '权',
  完: '完',
  成: '成',
  佈: '布',
  置: '置',
  退: '退',
  俘: '俘',
  獲: '获',
  殉: '殉',
  逝: '逝',
  戶: '户',
  牆: '墙',
  張: '张',
  組: '组',
  約: '约',
  攝: '摄',
  獨: '独',
  當: '当',
  僅: '仅',
  選: '选',
  裝: '装',
  飾: '饰',
  項: '项',
  敘: '叙',
  製: '制',
  狀: '状',
  態: '态',
  電: '电',
  視: '视',
  頁: '页',
  顯: '显',
  示: '示',
  質: '质',
  驗: '验',
  證: '证',
  確: '确',
  認: '认',
  部: '部',
  分: '分',
  待: '待',
  審: '审',
  查: '查',
  未: '未',
  詳: '详',
  細: '细',
  需: '需',
  要: '要',
  自: '自',
  依: '依',
  見: '见',
  聯: '联',
  絡: '络',
  原: '原',
  則: '则',
  保: '保',
  留: '留',
  另: '另',
  外: '外',
  對: '对',
  無: '无',
  法: '法',
  直: '直',
  代: '代',
  替: '替',
  以: '以',
  既: '既',
  有: '有',
  通: '通',
  過: '过',
  及: '及',
  其: '其',
  中: '中',
  之: '之',
  但: '但',
  而: '而',
  不: '不',
  同: '同',
  也: '也',
  可: '可',
  能: '能',
  因: '因',
  此: '此',
  持: '持',
  實: '实',
  際: '际',
  況: '况',
  設: '设',
  施: '施',
  建: '建',
  修: '修',
  復: '复',
  活: '活',
  旅: '旅',
  遊: '游',
  祭: '祭',
  祀: '祀',
  紀: '纪',
  念: '念',
  展: '展',
  望: '望',
};

export function toSimplified(text?: string): string {
  if (!text) return '';
  return [...text].map((character) => TRADITIONAL_TO_SIMPLIFIED[character] ?? character).join('');
}

const PERSON_EN: Record<string, PersonCopy> = {
  'PER-0001': { name: 'Chen Cheng', category: 'Political leader', role: 'The senior decision-maker who redirected Hu Lien’s force to Kinmen after assessing the island’s emergency.', bio: 'Chen Cheng (1898–1965), courtesy name Cih-hsiu, was from Qingtian, Zhejiang. He served as Chief of the General Staff and head of the Southeast Military and Political Headquarters.', actions: 'Assessed the crisis, redirected Hu Lien’s force, ordered the 19th Army to reinforce Kinmen, and flew to the island to inspect the front on 27 October.' },
  'PER-0002': { name: 'Tang Enbo', category: 'Senior ROC commander', role: 'The senior commander who moved the command headquarters to Kinmen after the fall of Xiamen.', bio: 'Tang Enbo (1898–1954) was from Wuyi, Zhejiang. He directed the Fuzhou Pacification Office and served as chairman of Fujian Province.', actions: 'Moved the headquarters to Kinmen after Xiamen fell and issued the temporary order defining command authority on Kinmen.' },
  'PER-0003': { name: 'Hu Lien', category: 'ROC field commander', role: 'Field commander who arrived on 26 October, assumed command, and completed the encirclement.', bio: 'Hu Lien (1907–1977), courtesy name Boyu, was from Hu County, Shaanxi, and graduated from the fourth class of the Whampoa Military Academy. He became the ROC’s operational commander at Guningtou.', actions: 'Moved the 12th Army Group from Shantou, reached Shuitou on 26 October, assessed the front from Hunan Heights, coordinated regimental commanders, completed the encirclement, and later commanded Kinmen’s defence.' },
  'PER-0004': { name: 'Kao Kuei-yuan', category: 'ROC field commander', role: 'Commander of the 18th Army, which reached Kinmen by sea from Shantou.', bio: 'Kao Kuei-yuan (1908–2001) was from Yixian, Shandong, and graduated from the fourth class of the Whampoa Military Academy. He commanded the 18th Army.', actions: 'Led the 18th Army to Kinmen and briefed Hu Lien on the front-line situation.' },
  'PER-0005': { name: 'Lee Shu-Lan', category: 'ROC unit commander', role: 'Commander of the 118th Division and the three-pronged counterattack and village fighting.', bio: 'Lee Shu-Lan commanded the ROC 118th Division during the Battle of Guningtou.', actions: 'Launched the counterattack at 04:30, directed the street fighting, shifted the main effort to the 353rd Regiment, and reported the end of fighting at 09:30 on 27 October.' },
  'PER-0006': { name: 'Lao Sheng-Huan', category: 'ROC unit commander', role: 'Forward air controller who directed P-51 attacks against the PLA landing fleet.', bio: 'Lao Sheng-Huan commanded the ROC 45th Division and had experience with U.S. forward-air-control training.', actions: 'Activated forward air control, directed eighteen P-51 sorties, and reported the destruction of more than one hundred boats.' },
  'PER-0007': { name: 'Chou Chih-Jou', category: 'ROC air support', role: 'Commander of the Air Force formations supporting the defence of Kinmen.', bio: 'Chou Chih-Jou (1899–1986) served as commander-in-chief of the ROC Air Force.', actions: 'Directed B-25 and P-51 attacks on the beachhead and C-47 illumination sorties through the night.' },
  'PER-0008': { name: 'Lee Yü-Hsi', category: 'ROC naval support', role: 'Commander of the Navy’s 2nd Fleet, which blockaded the Kinmen waters.', bio: 'Lee Yü-Hsi (1914–2003) commanded the ROC Navy’s 2nd Fleet.', actions: 'Directed vessels including Chung Jung to blockade the waters and fire naval guns at the PLA flotilla.' },
  'PER-0009': { name: 'Li Kuang-Chien', category: 'ROC unit commander', role: '42nd Regiment commander killed while leading the attack at Lincuo.', bio: 'Li Kuang-Chien (1917–1949) was from Hunan and commanded the 42nd Regiment of the 14th Division. He was the highest-ranking ROC officer killed at Guningtou.', actions: 'Led the attack on Lincuo, was killed in the charge, and was posthumously promoted.' },
  'PER-0010': { name: 'Hsiung Chen-Chiu', category: 'ROC armoured force', role: 'M5A1 tank No. 66 gunner credited in the record with firing the first shot.', bio: 'Hsiung Chen-Chiu (1931–?) was from Hunan. At eighteen he served as the gunner of M5A1 tank No. 66.', actions: 'Helped repair the stranded tank on the beach, fired at 00:30 on 25 October, and struck an ammunition boat after the first round hit a mast.' },
  'PER-0011': { name: 'Yang Chan', category: 'ROC armoured force', role: 'Platoon leader who ordered the tank crew to remain in action through the night.', bio: 'Yang Chan led the first platoon of the first company, 3rd Tank Regiment.', actions: 'Ordered overnight repairs after the tank ran aground and ordered the platoon into action at 00:30.' },
  'PER-0012': { name: 'Tseng Shao-Lin', category: 'ROC armoured force', role: 'Co-driver of tank No. 66, killed while operating its M1919 machine gun.', bio: 'Tseng Shao-Lin served as the co-driver of tank No. 66 and is recorded as the first fatality in the tank platoon.', actions: 'Operated the M1919 .30-calibre machine gun during the opening engagement and was killed in action.' },
  'PER-0013': { name: 'Chen Chen-Wei', category: 'ROC armoured force', role: 'Commander of the independent 3rd Tank Regiment’s 1st Battalion.', bio: 'Chen Chen-Wei commanded the armoured battalion equipped with twenty-one M5A1 tanks and had served in the Burma campaign.', actions: 'Led the tank battalion into Kinmen and brought its armoured experience from the Burma campaign.' },
  'PER-0014': { name: 'Lee Liang-Jung', category: 'Senior ROC commander', role: 'Interim senior commander on Kinmen before Hu Lien arrived.', bio: 'Lee Liang-Jung commanded the 22nd Army Group and temporarily directed the Kinmen forces before Hu Lien’s arrival.', actions: 'Held temporary command of the Kinmen units until the command transition.' },
  'PER-0015': { name: 'Shen Hsiang-Kuei', category: 'ROC unit commander', role: 'Commander of the 25th Army, which moved from Xiamen to Kinmen.', bio: 'Shen Hsiang-Kuei commanded the 25th Army during the Kinmen operation.', actions: 'Moved the 25th Army from Xiamen to Kinmen.' },
  'PER-0016': { name: 'Liu Yün-Han', category: 'ROC unit commander', role: 'Commander of the 19th Army, redirected to reinforce Kinmen.', bio: 'Liu Yün-Han commanded the 19th Army during the reinforcement of Kinmen.', actions: 'Redirected the army from its planned Zhejiang front to reinforce Kinmen.' },
  'PER-0017': { name: 'Foo Yih-Jen', category: 'ROC unit commander', role: 'Commander of the 602nd Regiment, which held the Guningtou defensive position.', bio: 'Foo Yih-Jen commanded the 602nd Regiment of the 201st Division.', actions: 'Held the Guningtou position and led the first counter-charge against the landing force.' },
  'PER-0018': { name: 'Cheng Kuo', category: 'ROC unit commander', role: 'Commander of the 201st Division, the young formation trained by Sun Li-Jen.', bio: 'Cheng Kuo commanded the 201st Division, a young formation moved from Taiwan to Kinmen.', actions: 'Led the 201st Division in the Kinmen defence.' },
  'PER-0019': { name: 'Sun Li-Jen', category: 'Senior ROC commander', role: 'Trainer of the young 201st Division before the Kinmen campaign.', bio: 'Sun Li-Jen (1900–1990) was from Anhui, studied at Tsinghua and Virginia Military Institute, and trained the 201st Division at Fengshan.', actions: 'Built the training foundation of the 201st Division, which later formed a key part of the Kinmen defence.' },
  'PER-0020': { name: 'Yang Shu-Tien', category: 'ROC unit commander', role: 'Commander of the 353rd Regiment, which took over the main Lincuo–Guningtou effort.', bio: 'Yang Shu-Tien commanded the 353rd Regiment of the 118th Division.', actions: 'Took over the main attack toward Lincuo and Guningtou.' },
  'PER-0021': { name: 'Tang Chun-Hsien', category: 'ROC unit commander', role: 'Commander of the 352nd Regiment, which entered the outer village area.', bio: 'Tang Chun-Hsien commanded the 352nd Regiment of the 118th Division.', actions: 'Led the regiment into the outskirts of Guningtou village.' },
  'PER-0022': { name: 'Lin Shu-Chiao', category: 'ROC unit commander', role: 'Commander of the 354th Regiment in the night clearance operations.', bio: 'Lin Shu-Chiao commanded the 354th Regiment of the 118th Division.', actions: 'Committed the regiment to night operations against remaining PLA forces in Guningtou.' },
  'PER-0023': { name: 'Lei Kai-Hsüan', category: 'ROC unit commander', role: 'Commander of the 601st Regiment defending the Longkou position.', bio: 'Lei Kai-Hsüan commanded the 601st Regiment of the 201st Division.', actions: 'Directed the defence of the Longkou position.' },
  'PER-0024': { name: 'Ye Fei', category: 'PLA senior commander', role: 'Senior PLA commander who approved the attack and later submitted a self-criticism.', bio: 'Ye Fei (1914–1999) was from Nan’an, Fujian, and commanded the PLA 10th Army Group. He was the senior PLA commander for the Kinmen operation.', actions: 'Commanded the 10th Army Group’s move into Fujian, approved the 24 October attack, and submitted a self-criticism to Mao Zedong after the defeat.' },
  'PER-0025': { name: 'Xiao Feng', category: 'PLA field commander', role: 'Deputy commander of the 28th Army and principal planner of the Kinmen operation.', bio: 'Xiao Feng served as deputy commander of the PLA 28th Army and was a principal planner of the attack on Kinmen.', actions: 'Issued the operation order, ordered the 24 October attack, questioned prisoners, and submitted a review after the battle.' },
  'PER-0026': { name: 'Zhu Shaoqing', category: 'PLA unit commander', role: 'Commander of the PLA 28th Army.', bio: 'Zhu Shaoqing commanded the PLA 28th Army during the Kinmen operation.', actions: 'Directed the 28th Army within the attack structure.' },
  'PER-0027': { name: 'Hsing Yung-Sheng', category: 'PLA unit commander', role: 'Commander of the 244th Regiment, wounded after landing at Longkou.', bio: 'Hsing Yung-Sheng commanded the PLA 244th Regiment.', actions: 'Led the regiment ashore at Longkou and continued to direct it after being seriously wounded.' },
  'PER-0028': { name: 'Liu Tien-Hsiang', category: 'PLA unit commander', role: 'Commander of the 251st Regiment, which landed at Huwei and fought through the first day.', bio: 'Liu Tien-Hsiang commanded the PLA 251st Regiment.', actions: 'Landed at Huwei, kept the regiment in action until 15:00, and later joined the 253rd Regiment.' },
  'PER-0029': { name: 'Hsu Po', category: 'PLA unit commander', role: 'Commander of the 253rd Regiment, later captured after hiding in Mount Taiwu.', bio: 'Hsu Po commanded the PLA 253rd Regiment. After the battle he remained in the Mount Taiwu area for more than one hundred days before being captured in February 1950.', actions: 'Landed at Guningtou, led the advance inland, hid in Mount Taiwu, and was eventually captured.' },
  'PER-0030': { name: 'Sun Yü-Hsiu', category: 'PLA unit commander', role: 'Commander of the 246th Regiment in the second reinforcement wave.', bio: 'Sun Yü-Hsiu commanded the PLA 246th Regiment.', actions: 'Led the second-wave reinforcement landing and died by suicide after being seriously wounded.' },
  'PER-0031': { name: 'Mao Zedong', category: 'Political leader', role: 'Chinese Communist leader who received Ye Fei’s post-battle self-criticism.', bio: 'Mao Zedong (1893–1976) was a Chinese Communist leader from Xiangtan, Hunan.', actions: 'Received Ye Fei’s self-criticism and did not punish him according to the existing project record.' },
  'PER-0032': { name: 'Chen Yi', category: 'PLA senior commander', role: 'Commander of the East China Military Region involved in the Kinmen operation decision.', bio: 'Chen Yi (1901–1972) commanded the East China Military Region.', actions: 'Replied with Su Yu on the proposed Kinmen–Xiamen operation and raised concerns about the boat supply.' },
  'PER-0033': { name: 'Su Yu', category: 'PLA senior commander', role: 'Deputy commander of the East China Military Region involved in the operation correspondence.', bio: 'Su Yu (1907–1984) was from Huitong, Hunan, and served as deputy commander of the East China Military Region.', actions: 'Co-signed the response to the 10th Army Group’s operation proposal.' },
  'PER-0034': { name: 'Lee Yün-Cheng', category: 'ROC unit commander', role: 'Commander of the 5th Army stationed on Little Kinmen and not directly engaged at Guningtou.', bio: 'Lee Yün-Cheng commanded the 5th Army, which was stationed on Little Kinmen (Lieyu).', actions: 'Maintained the Little Kinmen position; the record does not place him directly in the Guningtou fighting.' },
  'PER-0035': { name: 'Hu Ke-Hwa', category: 'ROC armoured force', role: 'Company commander in the 3rd Tank Regiment.', bio: 'Hu Ke-Hwa commanded a company of the 3rd Tank Regiment.', actions: 'Directed the tank company’s mobile support in the Kinmen defence.' },
  'PER-0036': { name: 'Chou Ming-Chin', category: 'ROC armoured force', role: 'Commander of the 3rd Tank Regiment’s 3rd Company and its mobile strike element.', bio: 'Chou Ming-Chin commanded the 3rd Company of the 1st Battalion, 3rd Tank Regiment.', actions: 'Led the company’s mobile strike operations.' },
};

const POI_CATEGORY_EN: Record<string, string> = {
  'Landing Beach': 'Landing beach',
  Village: 'Village',
  'Command Post': 'Command post',
  'High Ground': 'High ground',
  Memorial: 'Memorial site',
  'Military Facility': 'Military facility',
  'Coastal Defense': 'Coastal defence',
  Road: 'Road / access point',
  Bunker: 'Bunker / field fortification',
  Tunnel: 'Tunnel / hideout',
};

const POI_OPEN_STATUS_EN: Record<string, string> = {
  '開放（戶外海岸）': 'Open (outdoor coast)',
  '開放（戶外）': 'Open (outdoor site)',
  '需確認': 'Access status requires confirmation',
};

const POI_EN: Record<string, Partial<PoiCopy>> = {
  'POI-0001': { description: 'One of the PLA first-wave landing points. The 244th Regiment came ashore here and was hit by ROC armour and the 601st Regiment. The record places tank No. 66 and the first shot nearby.', shortDescription: 'First-shot and landing-area record; the exact point remains estimated.', historicalBackground: 'Longkou was a coastal strip of beach and farmland before the battle. The ROC built simple field positions here, with the 601st Regiment and a tank platoon nearby.', battleRole: 'A planned eastern landing point for the PLA 244th Regiment. Strong wind and current shifted part of the flotilla here; tank No. 66 fired the opening shot at an ammunition boat.', historicalContext: 'The tank platoon was stranded after an exercise on 24 October. The first shot is recorded at 00:30 on 25 October, followed by the 244th Regiment’s landing.', importance: 'A first-wave landing area and the recorded setting of Hsiung Chen-Chiu’s first shot.' },
  'POI-0002': { description: 'The main landing beach on the northern coast. More than three hundred PLA wooden boats came ashore in this area; the falling tide left many boats stranded offshore.', shortDescription: 'Main landing beach of the first wave; exact shoreline segment remains estimated.', historicalBackground: 'The northern beach is a broad, relatively flat coast suitable for a large landing. The ROC prepared mines, beach obstacles, and earth-built field positions.', battleRole: 'The principal landing area. Boats were stranded by the falling tide, leaving troops exposed to armour, coastal artillery, and infantry fire.', historicalContext: 'The first wave began landing in this area from around 01:30 on 25 October 1949.', importance: 'Main landing area of the PLA first wave.' },
  'POI-0003': { description: 'Landing area of the PLA 251st Regiment. Huwei Heights changed hands several times during the first day.', shortDescription: '251st Regiment landing area and first-day contested high ground.', historicalBackground: 'Huwei is a coastal section on the eastern side of the Guningtou area, with high ground overlooking the sea.', battleRole: 'The 251st Regiment landed here, lost heavily under artillery fire, and fought repeatedly with the 118th Division for the nearby heights.', historicalContext: 'The advance party is recorded as landing at about 02:10 on 25 October; the regiment remained in action until the afternoon.', importance: 'Landing area and one of the fiercest first-day contests.' },
  'POI-0004': { description: 'A research-index point associated with the Housha–Longkou landing area. Its specific historical relationship remains under source review.', shortDescription: 'Associated landing-area record; exact site identity requires human review.', historicalBackground: 'The project has not yet established a site-specific narrative from two independent sources.', battleRole: 'Related to the 244th Regiment landing account; do not read this point as a verified separate landing geometry.', historicalContext: 'See the linked event, timeline, and source records before using this point for interpretation.', importance: 'Research candidate only; not a confirmed canonical location.' },
  'POI-0005': { description: 'A research-index point for the western end of the Lantso–Longkou landing area. Its precise site identity remains approximate.', shortDescription: 'Approximate landing-area record awaiting source confirmation.', historicalBackground: 'The project has not yet established a site-specific narrative from two independent sources.', battleRole: 'Associated with the 244th Regiment landing range; no automatic route or exact shoreline point is asserted.', historicalContext: 'See the linked event, timeline, and source records before using this point for interpretation.', importance: 'Research candidate only; not a confirmed canonical location.' },
  'POI-0006': { description: 'The core village battle area comprising Beishan, Nanshan, and Lincuo. Street fighting and the final encirclement took place across this settlement landscape.', shortDescription: 'Core village battle area; coordinate and sub-site boundaries need review.', historicalBackground: 'The project keeps the village as a historical area record rather than treating one point as the boundary of every settlement.', battleRole: 'A central area of street fighting, encirclement, and final attacks.', historicalContext: 'Read together with the linked events and timeline records; the record does not provide a survey-grade battlefield boundary.', importance: 'Core village battlefield area.' },
  'POI-0007': { description: 'A settlement area where Colonel Li Guangqian was killed while leading the 42nd Regiment. ROC forces retook Lincuo on the second day.', shortDescription: 'Lincuo village and memorial landscape; point identity is source-linked.', historicalBackground: 'The project uses Lincuo as a village and battlefield record, not as a single surveyed building point.', battleRole: 'A key point in the second-day contest and the recorded place of Li Guangqian’s death.', historicalContext: 'The linked event and timeline records provide the battle sequence; exact engagement geometry remains under review.', importance: 'Site of Li Guangqian’s death and a key second-day battle area.' },
  'POI-0008': { description: 'A village area retaken by the ROC 118th Division on 26 October, after which remaining PLA forces were pushed toward the northern coast.', shortDescription: 'Second-day line-change area; exact village point requires review.', historicalBackground: 'The project treats Nanshan as a settlement landscape rather than a single building coordinate.', battleRole: 'A key point in the ROC counterattack and the completion of the encirclement.', historicalContext: 'The timing and sequence are retained in the linked event and timeline records.', importance: 'Important second-day line-change location.' },
  'POI-0009': { description: 'A village-area record associated with the 118th Division’s 26 October counterattack toward Lincuo and Guningtou.', shortDescription: 'Counterattack start-area candidate; coordinate remains approximate.', historicalBackground: 'The project has not yet established a site-specific narrative from two independent sources.', battleRole: 'Recorded as the launch area of the ROC second-day main attack.', historicalContext: 'See the linked event and timeline records; no precise attack-axis geometry is inferred from this point.', importance: 'Candidate start area for the second-day counterattack.' },
  'POI-0010': { description: 'A high-ground command-post record associated with Hu Lien’s arrival and assumption of command on 26 October.', shortDescription: 'Command-post record; distinct from Huwei Heights.', historicalBackground: 'Official site material identifies Hunan Heights between Anqi and Dingbao and associates it with the 18th Army’s forward command post.', battleRole: 'A command point in the ROC response and the change in operational leadership.', historicalContext: 'Hu Lien is recorded as assessing the battle here after reaching Kinmen.', importance: 'Command-chain node in the battle record.' },
  'POI-0011': { description: 'The pier where Hu Lien is recorded as arriving on 26 October before travelling to Hunan Heights.', shortDescription: 'Arrival point in the command-transition narrative.', historicalBackground: 'The project keeps the pier as an arrival and transport location, separate from the battle-front geometry.', battleRole: 'Arrival point for the commander and the 12th Army Group command transition.', historicalContext: 'The associated event and source records should be read before inferring any wider headquarters boundary.', importance: 'Recorded arrival point for Hu Lien.' },
  'POI-0012': { description: 'A command-post and tank-reserve assembly record associated with the 18th Army.', shortDescription: 'Tank-reserve and command-post candidate; coordinate is approximate.', historicalBackground: 'The exact wartime command-post footprint remains under source review.', battleRole: 'Associated with the ROC tank reserve and command network.', historicalContext: 'See the linked events and sources; no precise compound boundary is asserted.', importance: 'Candidate tank-reserve assembly point.' },
  'POI-0013': { description: 'High ground associated with a PLA attack on ROC positions during the first day.', shortDescription: 'First-day high-ground contest; approximate point.', historicalBackground: 'The project does not yet have a site-specific independent survey for this high ground.', battleRole: 'A reported high-ground contest in the first-day battle sequence.', historicalContext: 'Use the linked event and timeline records for the sequence; the point is not a verified trench location.', importance: 'First-day high-ground contest.' },
  'POI-0014': { description: 'The site of the final large engagement in the battle record, where remaining PLA forces surrendered on 27 October.', shortDescription: 'Final large-engagement area; coordinate remains estimated.', historicalBackground: 'The project treats the hill as an area record and does not claim a single surrender point.', battleRole: 'Final large battle area before the remaining forces surrendered.', historicalContext: 'The surrender sequence is retained in the linked event and timeline records.', importance: 'Final large-engagement area.' },
  'POI-0015': { description: 'A high-ground record for the first-day contest involving the PLA 251st Regiment and the ROC 118th Division.', shortDescription: 'Do not merge with Hunan Heights; this is a separate research record.', historicalBackground: 'The project keeps the Huwei Heights and Hunan Heights records separate because the source and site names refer to different locations.', battleRole: 'A repeatedly contested high ground in the first-day account.', historicalContext: 'The relationship between the historical name and modern place identity remains under human review.', importance: 'First-day contested high ground; not an automatic alias of Hunan Heights.' },
  'POI-0016': { description: 'The Guningtou War Museum, established in 1984 and later transferred to Kinmen National Park management. The current exhibition includes battle paintings, armour, and an immersive theatre.', shortDescription: 'Museum and public interpretation site; current building location needs source-linked map review.', historicalBackground: 'Official museum and tourism sources record the 1984 construction and later transfer and renovation history.', battleRole: 'A post-war memory and interpretation site, not a 1949 combat position.', historicalContext: 'Use the museum’s official history and exhibition records for the building and display chronology.', importance: 'Core memorial and historical interpretation institution.' },
  'POI-0017': { description: 'A memorial temple built in Kinmen memory of Colonel Li Guangqian, the highest-ranking ROC officer recorded as killed at Guningtou.', shortDescription: 'Memorial and local-memory site; coordinate needs independent point confirmation.', historicalBackground: 'The temple belongs to the post-war memorial landscape and should not be presented as a wartime command post.', battleRole: 'A memorial reference connected to Li Guangqian’s death at Lincuo.', historicalContext: 'Ritual and local memory should be read with the official memorial and ceremony sources.', importance: 'Li Guangqian memorial site.' },
  'POI-0018': { description: 'A peace memorial park and exhibition area associated with the Lincuo battlefield landscape.', shortDescription: 'Post-war memorial landscape; not a 1949 fortification by itself.', historicalBackground: 'The park is a post-war memorial and heritage interpretation space.', battleRole: 'Connected to the memory of the battle rather than treated as a new battle event.', historicalContext: 'Current buildings and displays must be separated from the 1949 defensive geometry.', importance: 'Battle-memory and heritage interpretation site.' },
  'POI-0019': { description: 'A military-camp record near the war museum and memorial landscape. Its wartime and post-war use require site-specific documentation.', shortDescription: 'Military heritage candidate; current access and exact footprint need review.', historicalBackground: 'The project preserves the camp as a research record and does not infer a complete compound from a nearby museum coordinate.', battleRole: 'Associated with the surrounding military landscape; no new battle route is asserted.', historicalContext: 'Read with the official heritage and activity records for current reuse status.', importance: 'Military heritage research site.' },
  'POI-0020': { description: 'A post-war broadcasting facility associated with psychological-warfare transmissions across the Strait.', shortDescription: 'Cold War memory site; current point requires source and map confirmation.', historicalBackground: 'The broadcasting station belongs to the post-war Cold War layer, not the 1949 landing layer.', battleRole: 'It is not a 1949 battle position; it provides later historical context.', historicalContext: 'The station and wall should be read alongside post-war memory and heritage sources.', importance: 'Post-war psychological-warfare memory site.' },
  'POI-0021': { description: 'A coastal cliff at the northern end of Guningtou, associated in the battle record with the last large group of PLA troops trapped below the cliff.', shortDescription: 'Coastal landform and final-battle area; cliff extent is not a single point.', historicalBackground: 'The cliff is a coastal landform. The project does not equate it with a camp or a building.', battleRole: 'The final-battle account places a large group below the cliff before surrender.', historicalContext: 'Read the final-battle event and the official landscape sources before inferring the precise cliff segment.', importance: 'Coastal landform associated with the final battle.' },
  'POI-0022': { description: 'A commemorative arch marking an entrance to the Guningtou area.', shortDescription: 'Present-day landmark and visitor-route entry point.', historicalBackground: 'The arch belongs to the later commemorative landscape.', battleRole: 'It is not a 1949 combat position.', historicalContext: 'Use present-day heritage and visitor sources for its location and meaning.', importance: 'Entrance landmark for the present-day memory landscape.' },
  'POI-0023': { description: 'A road record associated with movement and supply during the battle period.', shortDescription: 'Route research record; not a verified historic road centreline.', historicalBackground: 'The project does not automatically map the modern road onto a 1949 movement route.', battleRole: 'Associated with movement and supply, but no historical geometry is promoted from the label alone.', historicalContext: 'Requires route-specific source review before it can be used as a battle trace.', importance: 'Research-only movement and supply record.' },
  'POI-0024': { description: 'A research record for surviving field-fortification remains in the Guningtou area.', shortDescription: 'Bunker research record; individual structures require field verification.', historicalBackground: 'The record refers to dispersed field fortifications rather than one confirmed bunker.', battleRole: 'Associated with the ROC defensive landscape; no individual bunker coordinate is asserted.', historicalContext: 'Use field survey and official heritage documentation before publishing a precise point.', importance: 'Fieldwork candidate for defensive remains.' },
  'POI-0025': { description: 'The Mount Taiwu area associated with the post-battle hiding and capture account of 253rd Regiment commander Xu Bo.', shortDescription: 'Post-battle narrative area; cave location is not precisely established.', historicalBackground: 'The project keeps this as a broad post-battle area and does not invent a cave coordinate.', battleRole: 'It belongs to the aftermath of the battle rather than the main battlefield geometry.', historicalContext: 'The capture narrative should be read with the linked event and source records.', importance: 'Post-battle hiding and capture area.' },
  'POI-0026': { description: 'Andong Camp 2 (W-012) is a present-day coastal military-heritage site on Kinmen’s north coast. Its coordinate is adopted from the user-provided 38-place table and is not presented as an official survey or 1949 battle coordinate.', shortDescription: 'W-012 current military-heritage site; user-specified point.', historicalBackground: 'The existing site record describes the sentry roof, rear foxhole, central salient, two anti-tank positions, and later restoration and adaptive reuse.', battleRole: 'A post-war coastal-defence site; no new 1949 route or combat geometry is inferred here.', historicalContext: 'The modern camp point remains separate from the POI-0023 road research record and from historical battle traces.', importance: 'A current military-heritage and adaptive-reuse site in the Guningtou coastal landscape.' },
  'POI-0027': { description: 'W011 Andong 3 Camp, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Andong defence-site record; user-specified point.', importance: 'A post-war military-site research and interpretation point.' },
  'POI-0028': { description: 'W016 Guningtou Three Camp, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Guningtou military-site record; user-specified point.', importance: 'A post-war military-site research and interpretation point.' },
  'POI-0029': { description: 'W027 Huxia Camp 1, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Huxia coastal-defence record; user-specified point.', importance: 'A post-war military-site research and interpretation point.' },
  'POI-0030': { description: 'Longkou 2 Camp, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Longkou military-site record; user-specified point.', importance: 'A post-war military-site research and interpretation point.' },
  'POI-0031': { description: 'Longkou Camp 1, with a coordinate adopted from the user-provided Kinmen_Guningtou_Locations.xlsx table.', shortDescription: 'Longkou Camp 1; user-specified point.', importance: 'A coastal-defence research and interpretation point.' },
  'POI-0032': { description: 'East One Red, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Coastal-defence record; user-specified point.', importance: 'A military-site research and interpretation point.' },
  'POI-0033': { description: 'Zhenzhong Fort, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Defensive-work record; user-specified point.', importance: 'A military-site research and interpretation point.' },
  'POI-0034': { description: 'Beishan Old Western-style House, retained as an alias/source-trace record after the user-directed merge into the Beishan PLA Command Post entry.', shortDescription: 'Merged research alias; no separate public map point.', importance: 'A Beishan settlement and heritage-building alias retained for traceability.' },
  'POI-0035': { description: 'Beishan PLA Command Post, the public canonical entry after the user-directed merge with the Beishan Old Western-style House record.', shortDescription: 'Merged Beishan command-post record; user-specified point.', importance: 'A historical research point with the merged Beishan site record.' },
  'POI-0036': { description: 'Guningtou Shuiwei Pagoda, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Settlement landmark record; user-specified point.', importance: 'A cultural-landscape research and interpretation point.' },
  'POI-0037': { description: 'Guandi Temple, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Settlement ritual-site record; user-specified point.', importance: 'A cultural-landscape research and interpretation point.' },
  'POI-0038': { description: 'Lincuo Artillery Position, kept separate from the Kinmen Peace Memorial Park record, with a coordinate adopted from the user-provided 38-place table.', shortDescription: 'Lincuo artillery-position record; user-specified point.', importance: 'A battlefield and memorial-landscape research point.' },
};

function cleanResearchField(value: string | undefined, fallback: string): string {
  if (!value || value.includes('【后沙】') || value.includes('參見關聯') || value.includes('參見戰役相關')) return fallback;
  return value;
}

export function normalizeLang(value?: string): SiteLang {
  return value === 'en' || value === 'zh-cn' ? value : 'zh-tw';
}

export function getPersonCopy(person: HistoricalPerson, langValue?: string): PersonCopy {
  const lang = normalizeLang(langValue);
  const raw: PersonCopy = {
    name: person.name_zh,
    category: person.primary_category ?? '人物',
    role: person.role_in_battle ?? person.primary_category ?? '角色待補',
    bio: person.biographical_summary ?? person.standard_bio ?? '尚無詳細資料',
    actions: person.battle_actions ?? '尚無已整理的戰役行動資料。',
  };
  if (lang === 'en') return PERSON_EN[person.person_id] ?? { ...raw, name: person.name_en ?? person.name_zh, category: 'Historical person', role: 'Editorial role translation pending review.', bio: 'English biography pending editorial review.', actions: 'English action summary pending editorial review.' };
  if (lang === 'zh-cn') return { ...raw, name: toSimplified(person.name_zh), category: toSimplified(raw.category), role: toSimplified(raw.role), bio: toSimplified(raw.bio), actions: toSimplified(raw.actions) };
  return raw;
}

export function getPoiCopy(poi: POI, langValue?: string): PoiCopy {
  const lang = normalizeLang(langValue);
  const rawFallback = '此據點的逐筆說明尚待來源與現地資料核對。';
  const coordinateBasis = poi.coordinate_status === 'user_specified'
    ? '使用者指定座標'
    : poi.coordinate_status === 'modern_verified'
    ? '現代地點已查證'
    : poi.coordinate_status === 'representative'
      ? '現代代表點／範圍位置'
      : poi.coordinate_status === 'historical_review'
        ? '歷史位置審查中'
        : '位置尚未獨立查證';
  const raw: PoiCopy = {
    name: poi.name_chinese,
    category: poi.category ?? '戰場地點',
    description: poi.description ?? rawFallback,
    shortDescription: poi.short_description ?? poi.description ?? rawFallback,
    historicalBackground: cleanResearchField(poi.historical_background, rawFallback),
    battleRole: cleanResearchField(poi.battle_role, '此據點的戰役角色尚待逐筆核對，請參閱關聯事件與來源。'),
    historicalContext: cleanResearchField(poi.historical_context, '此據點的歷史脈絡尚待逐筆核對，請參閱關聯時間軸與來源。'),
    importance: poi.historical_importance ?? '此據點的重要性尚待逐筆核對。',
    coordinateAccuracy: poi.coordinate_accuracy ?? '未標示',
    coordinateBasis,
    coordinateNote: poi.coordinate_note ?? '',
    openStatus: poi.open_status ?? '未標示',
  };
  if (lang === 'en') {
    const copy = POI_EN[poi.poi_id] ?? {};
    const coordinateNote = poi.coordinate_note_en
      ?? (poi.coordinate_status === 'user_specified'
        ? 'The coordinate is adopted from the user-provided 38-place table and is not presented as an official survey or independently verified historical coordinate.'
        : poi.coordinate_status === 'modern_verified'
        ? 'The published coordinate identifies the present-day site; it is not automatically a 1949 battlefield coordinate.'
        : poi.coordinate_status === 'representative'
          ? 'The published coordinate is a present-day representative point for an area or named landscape, not a surveyed battle point.'
          : poi.coordinate_status === 'historical_review'
            ? 'The published coordinate is a research index while the historical place relationship remains under source review.'
            : 'The location remains unresolved and must not be read as a precise site coordinate.');
    return {
      name: poi.name_english ?? poi.name_chinese,
      category: POI_CATEGORY_EN[poi.category ?? ''] ?? 'Historical place',
      description: copy.description ?? 'English place description pending editorial review.',
      shortDescription: copy.shortDescription ?? 'English place summary pending editorial review.',
      historicalBackground: copy.historicalBackground ?? 'Site-specific historical background pending source review.',
      battleRole: copy.battleRole ?? 'Battle role pending source review; see linked events and sources.',
      historicalContext: copy.historicalContext ?? 'Historical context pending source review; see linked timeline records.',
      importance: copy.importance ?? 'Historical importance pending source review.',
      coordinateAccuracy: poi.coordinate_accuracy ?? 'Not yet independently verified',
      coordinateBasis: poi.coordinate_status === 'user_specified' ? 'User-specified coordinate' : poi.coordinate_status === 'modern_verified' ? 'Modern site verified' : poi.coordinate_status === 'representative' ? 'Modern representative / area point' : poi.coordinate_status === 'historical_review' ? 'Historical location under review' : 'Location not independently verified',
      coordinateNote,
      openStatus: POI_OPEN_STATUS_EN[poi.open_status ?? ''] ?? 'Access status not recorded',
    };
  }
  if (lang === 'zh-cn') {
    return { ...raw, name: toSimplified(raw.name), category: toSimplified(raw.category), description: toSimplified(raw.description), shortDescription: toSimplified(raw.shortDescription), historicalBackground: toSimplified(raw.historicalBackground), battleRole: toSimplified(raw.battleRole), historicalContext: toSimplified(raw.historicalContext), importance: toSimplified(raw.importance), coordinateAccuracy: toSimplified(raw.coordinateAccuracy), coordinateBasis: toSimplified(raw.coordinateBasis), coordinateNote: toSimplified(raw.coordinateNote), openStatus: toSimplified(raw.openStatus) };
  }
  return raw;
}

const EVENT_TITLES_EN: Record<string, string> = {
  'EVT-0001': 'PLA amphibious landing operation — first wave', 'EVT-0002': 'ROC full counterattack — day one', 'EVT-0003': 'Regimental commander Li Guangqian killed in action',
  'EVT-0004': 'PLA reinforcement and ROC encirclement — day two', 'EVT-0005': 'The Battle of Guningtou ends — day three', 'EVT-0006': 'Post-battle handling and conflicting accounts',
  'EVT-0007': 'Joint ROC air and naval blockade operation', 'EVT-0008': 'Hu Lien arrives in Kinmen and assumes command', 'EVT-0009': 'The contest for Huwei',
  'EVT-0010': 'Longkou landing and destruction', 'EVT-0011': 'Fighting at the Guningtou landing beach', 'EVT-0012': 'The first large-scale ROC air bombardment',
  'EVT-0013': 'ROC naval blockade operation', 'EVT-0014': 'Regimental commander Li Guangqian killed in action', 'EVT-0015': 'Day-one fighting ends; the front begins to form',
  'EVT-0016': 'The PLA second wave fails to reinforce the landing', 'EVT-0017': 'Street fighting in Guningtou — day two', 'EVT-0018': 'Hu Lien arrives in Kinmen and takes command',
  'EVT-0019': 'ROC forces retake Lincuo and Nanshan', 'EVT-0020': 'ROC forces complete the Guningtou encirclement', 'EVT-0021': 'Destruction at the northern cliff base',
  'EVT-0022': 'The final PLA reinforcement wave lands and is captured', 'EVT-0023': 'Li Shulan reports the end of fighting', 'EVT-0024': 'Shuangru Hill battle — the final large engagement',
  'EVT-0025': 'Ye Fei submits a self-criticism to Mao Zedong', 'EVT-0026': 'Battle results and disputed casualty figures', 'EVT-0027': 'The last PLA combatant is captured',
  'EVT-0028': 'The PLA sea crossing', 'EVT-0029': 'Landing units fight independently', 'EVT-0030': 'Chen Cheng flies to Kinmen for inspection',
};

const EVENT_DESCRIPTIONS_EN: Record<string, string> = {
  'EVT-0001': 'The first wave departed from Xiamen on 24 October, was pushed off course by strong winds, and reached the Guningtou coast. All three PLA regiments reached shore but could not consolidate a stable beachhead without unified command.',
  'EVT-0002': 'The ROC launched a three-pronged counterattack before dawn, followed by coordinated naval and air operations that cut off further reinforcement. The initial encirclement was completed by evening.',
  'EVT-0003': 'Colonel Li Guangqian was killed while leading the 14th Division, 42nd Regiment, at Lincuo. He was the highest-ranking ROC officer recorded as killed at Guningtou.',
  'EVT-0004': 'A second PLA reinforcement attempt reached shore only in part. The ROC counterattacked, street fighting spread through Guningtou, Hu Lien assumed command, and the encirclement was completed at night.',
  'EVT-0005': 'The remaining PLA force was trapped near the northern cliff. The final reinforcement group was captured, Li Shulan reported the end of fighting, and remaining forces surrendered at Shuangru Hill.',
  'EVT-0006': 'Post-battle reports give different casualty and capture figures. The project retains those differences instead of treating one account as the only count.',
  'EVT-0007': 'ROC forward air control, naval guns, and bomber and fighter formations worked together to strike the PLA landing fleet and cut off reinforcement.',
  'EVT-0008': 'Hu Lien arrived at Shuitou, assessed the front at Hunan Heights, and assumed operational command of the 118th Division and 25th Army.',
  'EVT-0009': 'The PLA 251st Regiment and ROC forces repeatedly contested Huwei and its associated high ground during the first day.',
  'EVT-0010': 'The PLA 244th Regiment landed at Longkou and came under crossfire from ROC armour and the 601st Regiment.',
  'EVT-0011': 'The PLA 253rd Regiment landed at Guningtou, where the 602nd Regiment held a defensive position. The force suffered heavy losses while part of it entered the village area.',
  'EVT-0012': 'Forward air control directed P-51 sorties against the landing fleet. The existing record describes the operation as an example of three-service cooperation.',
  'EVT-0013': 'Vessels of the Navy’s 2nd Fleet used machine guns and naval guns against PLA wooden boats in the Kinmen waters.',
  'EVT-0014': 'Colonel Li Guangqian was killed while leading the attack at Lincuo; later memorial practice linked his name to the General Li Guangqian Temple.',
  'EVT-0015': 'After the first day, remaining PLA troops withdrew toward the Guningtou–Lincuo–Huwei line while the ROC established an initial encirclement.',
  'EVT-0016': 'Strong winds scattered the second reinforcement wave. Only part of the force reached shore and came under ROC fire.',
  'EVT-0017': 'The 118th Division counterattacked toward Lincuo and Guningtou. Street fighting and close air support shaped the second-day battle.',
  'EVT-0018': 'Hu Lien reached Shuitou, travelled to Hunan Heights, and took command while coordinating the regimental commanders.',
  'EVT-0019': 'ROC forces retook Lincuo and Nanshan with tank support, pushing remaining PLA forces back toward the northern coast.',
  'EVT-0020': 'The ROC completed the encirclement of the remaining PLA force around Guningtou, compressing it onto a narrow northern beach.',
  'EVT-0021': 'A large PLA group was trapped below the northern cliff with food and ammunition exhausted. The existing account records heavy losses and surrender at daybreak.',
  'EVT-0022': 'The final PLA reinforcement group landed in a motorboat and was immediately surrounded and captured.',
  'EVT-0023': 'Major General Li Shulan reported to Hu Lien that the fighting at Guningtou had ended.',
  'EVT-0024': 'Remaining PLA troops near Shuangru Hill surrendered after being surrounded. The project treats this as the final large engagement.',
  'EVT-0025': 'Ye Fei submitted a written self-criticism to Mao Zedong, identifying inadequate boats, failure to consolidate the beachhead, and the lack of unified command.',
  'EVT-0026': 'The project retains competing casualty and capture figures and identifies the source relationship rather than collapsing them into one unqualified total.',
  'EVT-0027': 'After the battle, 253rd Regiment commander Xu Bo hid in the Mount Taiwu area for more than one hundred days before being captured.',
  'EVT-0028': 'The PLA first wave departed from several staging points and was pushed off course by strong winds and difficult channels.',
  'EVT-0029': 'After landing, communications broke down and the three regiments fought independently, preventing a stable beachhead from forming.',
  'EVT-0030': 'Chen Cheng flew to Kinmen to inspect the front; the existing record also describes a later surrender encountered on the return journey.',
};

function localizedMilitaryText(value: string | undefined, lang: SiteLang): string {
  if (!value) return '';
  if (lang === 'zh-cn') return toSimplified(value);
  if (lang === 'zh-tw') return value;
  return translateTimelineField(value);
}

export function getEventCopy(event: Event, langValue?: string): EventCopy {
  const lang = normalizeLang(langValue);
  if (lang === 'en') {
    return {
      title: EVENT_TITLES_EN[event.event_id] ?? 'Historical event',
      description: EVENT_DESCRIPTIONS_EN[event.event_id] ?? 'English event description pending editorial review.',
      location: event.location ? 'Location recorded in the canonical source-linked event.' : 'Location not recorded',
      participants: localizedMilitaryText(event.participants, lang),
      rocUnits: localizedMilitaryText(event.roc_units, lang),
      plaUnits: localizedMilitaryText(event.pla_units, lang),
      commanders: localizedMilitaryText(event.commanders, lang),
    };
  }
  return {
    title: lang === 'zh-cn' ? toSimplified(event.title) : event.title,
    description: lang === 'zh-cn' ? toSimplified(event.description) : event.description,
    location: lang === 'zh-cn' ? toSimplified(event.location ?? '位置未详') : event.location ?? '位置未詳',
    participants: localizedMilitaryText(event.participants, lang),
    rocUnits: localizedMilitaryText(event.roc_units, lang),
    plaUnits: localizedMilitaryText(event.pla_units, lang),
    commanders: localizedMilitaryText(event.commanders, lang),
  };
}

export function getTimelineCopy(entry: TimelineEntry, langValue?: string): TimelineCopy {
  const lang = normalizeLang(langValue);
  if (lang === 'en') {
    const editorial = TIMELINE_ENGLISH[entry.timeline_id];
    return {
      title: editorial?.title ?? 'Historical timeline record',
      description: editorial?.description ?? 'Canonical timeline description retained with source references.',
      location: translateTimelineField(entry.location),
      rocUnits: translateTimelineField(entry.roc_units),
      plaUnits: translateTimelineField(entry.pla_units),
      keyFigures: translateTimelineField(entry.key_figures),
    };
  }
  const simplify = (value?: string) => lang === 'zh-cn' ? toSimplified(value) : value ?? '';
  return {
    title: simplify(entry.title),
    description: simplify(entry.description),
    location: simplify(entry.location),
    rocUnits: simplify(entry.roc_units),
    plaUnits: simplify(entry.pla_units),
    keyFigures: simplify(entry.key_figures),
  };
}

export function getEventEnglishTitle(eventId: string): string | undefined {
  return EVENT_TITLES_EN[eventId];
}

export function getEventEnglishDescription(eventId: string): string | undefined {
  return EVENT_DESCRIPTIONS_EN[eventId];
}
