import type { Lang } from '../i18n/ui';
import { archiveMedia, type ArchiveMediaAsset } from './mediaCatalog';

export type Localized = Record<Lang, string>;

export interface ThenNowSection {
  id: string;
  number: string;
  title: Localized;
  eyebrow: Localized;
  description: Localized;
}

export interface ThenNowSourceLink {
  label: Localized;
  href: string;
}

export interface ThenNowSite {
  id: string;
  poiId?: string;
  code: string;
  title: Localized;
  category: Localized;
  status: Localized;
  role: Localized;
  present: Localized;
  evidenceNote: Localized;
  sourceLinks: ThenNowSourceLink[];
  mediaIds?: string[];
}

export const thenNowHero = {
  title: { 'zh-tw': '昔日戰場・今日古寧頭', 'zh-cn': '昔日战场・今日古宁头', en: 'Guningtou: Then & Now' } satisfies Localized,
  subtitle: { 'zh-tw': '1949 GUNINGTOU — THEN & NOW', 'zh-cn': '1949 GUNINGTOU — THEN & NOW', en: '1949 GUNINGTOU — THEN & NOW' } satisfies Localized,
  description: {
    'zh-tw': '從 1949 年的戰火，到今日的海岸聚落與軍事遺址，探索古寧頭七十多年的地景變遷。',
    'zh-cn': '从 1949 年的战火，到今日的海岸聚落与军事遗址，探索古宁头七十多年的地景变迁。',
    en: 'From the fire of 1949 to today’s coastal settlements and military heritage, explore more than seven decades of change at Guningtou.',
  } satisfies Localized,
  note: {
    'zh-tw': '本頁仍以 1949 古寧頭戰役為核心；戰後設施、紀念與活化只在能追溯來源的範圍內呈現。',
    'zh-cn': '本页仍以 1949 古宁头战役为核心；战后设施、纪念与活化只在可追溯来源的范围内呈现。',
    en: 'The 1949 Battle of Guningtou remains the centre of this site. Post-war facilities, memorials, and adaptive reuse are shown only where their sources can be traced.',
  } satisfies Localized,
};

export const thenNowSections: ThenNowSection[] = [
  {
    id: 'overview', number: '01',
    eyebrow: { 'zh-tw': '1949 與今日', 'zh-cn': '1949 与今日', en: '1949 AND TODAY' },
    title: { 'zh-tw': '同一片海岸，不同的時間層', 'zh-cn': '同一片海岸，不同的时间层', en: 'One coast, several layers of time' },
    description: { 'zh-tw': '1944 航照是戰前地景參考，不是 1949 現場照片；今日的戰史館、聚落與海岸，則讓訪客回到仍可走讀的地理現場。', 'zh-cn': '1944 航照是战前地景参考，不是 1949 现场照片；今日的战史馆、聚落与海岸，则让访客回到仍可走读的地理现场。', en: 'The 1944 aerial is a pre-battle landscape reference, not a photograph of 1949. Today’s museum, settlement, and coast return the visitor to a place that can still be walked and read.' },
  },
  {
    id: 'images', number: '02',
    eyebrow: { 'zh-tw': '戰場影像對照', 'zh-cn': '战场影像对照', en: 'BATTLEFIELD IMAGES' },
    title: { 'zh-tw': '照片先說明它看見了什麼', 'zh-cn': '照片先说明它看见了什么', en: 'Let each photograph say what it actually shows' },
    description: { 'zh-tw': '現況照片、戰後影像與歷史地圖並置閱讀；不同地點或不同角度不被包裝成精確的同景對照。', 'zh-cn': '现况照片、战后影像与历史地图并置阅读；不同地点或不同角度不被包装成精确的同景对照。', en: 'Current views, post-war photographs, and historical maps are read side by side. Different places and viewpoints are not presented as an exact same-angle comparison.' },
  },
  {
    id: 'explore', number: '03',
    eyebrow: { 'zh-tw': '古寧頭戰場探索', 'zh-cn': '古宁头战场探索', en: 'EXPLORE GUNINGTOU' },
    title: { 'zh-tw': '把地名放回地圖，再進入故事', 'zh-cn': '把地名放回地图，再进入故事', en: 'Put the place back on the map before entering the story' },
    description: { 'zh-tw': '沿著嚨口、北山、南山、林厝與海岸據點查看既有地點紀錄；沒有證據的路線不被自動補出。', 'zh-cn': '沿着垄口、北山、南山、林厝与海岸据点查看既有地点记录；没有证据的路线不被自动补出。', en: 'Use the existing location records for Longkou, Beishan, Nanshan, Lincuo, and the coastal sites. Routes are not invented where evidence is missing.' },
  },
  {
    id: 'activation', number: '04',
    eyebrow: { 'zh-tw': '軍事據點活化', 'zh-cn': '军事据点活化', en: 'MILITARY HERITAGE REUSE' },
    title: { 'zh-tw': '從戰地堡壘到今日文化地景', 'zh-cn': '从战地堡垒到今日文化地景', en: 'From frontline strongholds to cultural landscapes' },
    description: { 'zh-tw': '安東系列、湖下一營區、戰史館與海岸設施分開呈現：戰役原有地點、戰後營建、紀念建築與活化工程不是同一件事。', 'zh-cn': '安东系列、湖下一营区、战史馆与海岸设施分开呈现：战役原有地点、战后营建、纪念建筑与活化工程不是同一件事。', en: 'The Andong series, Huxia Camp, the museum, and coastal installations are kept distinct: a 1949 place, a later military build, a memorial, and adaptive reuse are not the same thing.' },
  },
  {
    id: 'traces', number: '05',
    eyebrow: { 'zh-tw': '留下的歷史痕跡', 'zh-cn': '留下的历史痕迹', en: 'TRACES THAT REMAIN' },
    title: { 'zh-tw': '自然、聚落與紀念共同留下線索', 'zh-cn': '自然、聚落与纪念共同留下线索', en: 'Nature, settlement, and memory leave different clues' },
    description: { 'zh-tw': '北山斷崖不是營區，古洋樓不是戰鬥碉堡；把不同類型的遺跡放回它們各自的歷史脈絡。', 'zh-cn': '北山断崖不是营区，古洋楼不是战斗碉堡；把不同类型的遗迹放回它们各自的历史脉络。', en: 'Beishan Cliff is not a camp, and the old western-style house is not a battle bunker. Each trace belongs to its own historical context.' },
  },
];

export const thenNowSites: ThenNowSite[] = [
  {
    id: 'W013', poiId: 'POI-0019', code: 'W013',
    title: { 'zh-tw': '安東一營區', 'zh-cn': '安东一营区', en: 'Andong 1 Camp' },
    category: { 'zh-tw': '戰後軍事設施／活化據點', 'zh-cn': '战后军事设施／活化据点', en: 'Post-war military facility / adaptive reuse' },
    status: { 'zh-tw': '官方資料可查；2016 年活化開幕', 'zh-cn': '官方资料可查；2016 年活化开幕', en: 'Official record; adaptive-reuse opening in 2016' },
    role: { 'zh-tw': '與安東二、安東三同屬海岸防禦系統；現以熊震球與戰車故事作展示。', 'zh-cn': '与安东二、安东三同属海岸防御系统；现以熊震球与战车故事作展示。', en: 'Part of the Andong coastal defence system; now interpreted through the story of Hsiung Chen-chiu and the tanks.' },
    present: { 'zh-tw': '鄰近古寧頭戰史館與登陸海岸，展示空間由既有據點整理而成。', 'zh-cn': '邻近古宁头战史馆与登陆海岸，展示空间由既有据点整理而成。', en: 'Near the museum and landing coast, with an interpretation space adapted from the existing stronghold.' },
    evidenceNote: { 'zh-tw': '不得將戰後整建的營區直接稱為 1949 原始碉堡。', 'zh-cn': '不得将战后整建的营区直接称为 1949 原始碉堡。', en: 'The later rebuilt camp must not be described as an original 1949 bunker.' },
    sourceLinks: [
      { label: { 'zh-tw': '國家公園開幕報導', 'zh-cn': '国家公园开幕报道', en: 'National Park opening report' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/news/26680' },
      { label: { 'zh-tw': '安東一營區專題', 'zh-cn': '安东一营区专题', en: 'Andong 1 feature' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18475.html' },
    ],
  },
  {
    id: 'W012', poiId: 'POI-0026', code: 'W012',
    title: { 'zh-tw': 'W012 安東二營區（熾白安東）', 'zh-cn': 'W012 安东二营区（炽白安东）', en: 'W012 Andong 2 Camp (Chibai Andong)' },
    category: { 'zh-tw': '戰後軍事設施／民間活化', 'zh-cn': '战后军事设施／民间活化', en: 'Post-war military facility / community reuse' },
    status: { 'zh-tw': '官方據點資料與現況營運資料分開標示', 'zh-cn': '官方据点资料与现况运营资料分开标示', en: 'Official site record and current operator material kept separate' },
    role: { 'zh-tw': '海岸防禦據點；曾經歷軍方與海巡使用，後由民間團隊進駐。', 'zh-cn': '海岸防御据点；曾经历军方与海巡使用，后由民间团队进驻。', en: 'A coastal defence site with later military and coast-guard use, followed by private adaptive reuse.' },
    present: { 'zh-tw': '現況可見碉堡、海景與體驗活動；營運內容不等同官方歷史證據。', 'zh-cn': '现况可见碉堡、海景与体验活动；运营内容不等同官方历史证据。', en: 'The site presents bunkers, sea views, and activities; operator descriptions are not by themselves official historical evidence.' },
    evidenceNote: { 'zh-tw': '本站已將 W-012 現代營區與 POI-0023 道路研究紀錄分開；本輪座標依使用者上傳 chat.md 最後 XLS 表採用 24.4738, 118.3325。', 'zh-cn': '本站已将 W-012 现代营区与 POI-0023 道路研究记录分开；本轮坐标依用户上传 chat.md 最后 XLS 表采用 24.4738, 118.3325。', en: 'The present-day W-012 camp is separated from the POI-0023 road research record; this release adopts 24.4738, 118.3325 from the uploaded chat.md XLS table.' },
    sourceLinks: [
      { label: { 'zh-tw': '金門國家公園據點資料', 'zh-cn': '金门国家公园据点资料', en: 'Kinmen National Park site record' }, href: 'https://www.kmnp.gov.tw/ch/touristInfo/recreation-sites/49' },
      { label: { 'zh-tw': '現況營運網站（非唯一史料）', 'zh-cn': '现况运营网站（非唯一史料）', en: 'Current operator site (not sole historical evidence)' }, href: 'https://w-012.com/' },
    ],
    mediaIds: ['TN-MEDIA-W012-ENTRANCE-2026', 'TN-MEDIA-W012-EXTERIOR-2026'],
  },
  {
    id: 'W011', poiId: 'POI-0027', code: 'W011',
    title: { 'zh-tw': '安東三營區', 'zh-cn': '安东三营区', en: 'Andong 3 Camp' },
    category: { 'zh-tw': '戰後軍事設施／研究中', 'zh-cn': '战后军事设施／研究中', en: 'Post-war military facility / research' },
    status: { 'zh-tw': '官方 3D 現況解說可查；照片與清冊待補', 'zh-cn': '官方 3D 现况解说可查；照片与清册待补', en: 'Official 3D current-state feature found; photo and register work pending' },
    role: { 'zh-tw': '與 W012、W013 同屬安東系列，形成海岸防禦節點。', 'zh-cn': '与 W012、W013 同属安东系列，形成海岸防御节点。', en: 'Part of the Andong series with W012 and W013, forming a coastal defence group.' },
    present: { 'zh-tw': '目前以官方影片、研究入口與使用者指定座標呈現；不將座標說成官方實測。', 'zh-cn': '目前以官方影片、研究入口与用户指定坐标呈现；不将坐标说成官方实测。', en: 'Presented through the official video, research entry, and a user-specified coordinate; the point is not described as an official survey.' },
    evidenceNote: { 'zh-tw': '使用者指定座標；官方名稱、開放狀態與可公開影像仍需人工核對。', 'zh-cn': '用户指定坐标；官方名称、开放状态与可公开影像仍需人工核对。', en: 'The coordinate is user-specified; official name, access status, and reusable images still require human review.' },
    sourceLinks: [
      { label: { 'zh-tw': '國家公園 3D 現況影片', 'zh-cn': '国家公园 3D 现况影片', en: 'National Park 3D current-state video' }, href: 'https://www.youtube.com/watch?v=NbwId1bSfa8' },
      { label: { 'zh-tw': '安東一營區報導（含系列關係）', 'zh-cn': '安东一营区报道（含系列关系）', en: 'Andong 1 report (series relationship)' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/news/26680' },
    ],
  },
  {
    id: 'W016', poiId: 'POI-0028', code: 'W016',
    title: { 'zh-tw': '古寧頭三營區', 'zh-cn': '古宁头三营区', en: 'Guningtou Three Camp' },
    category: { 'zh-tw': '戰後軍事設施／公共展示', 'zh-cn': '战后军事设施／公共展示', en: 'Post-war military facility / public interpretation' },
    status: { 'zh-tw': '官方資料確認；2014 年啟用', 'zh-cn': '官方资料确认；2014 年启用', en: 'Officially identified; opened in 2014' },
    role: { 'zh-tw': '位於古寧頭戰史館後方，是古寧頭海岸戰後軍事遺址閱讀帶的一站。', 'zh-cn': '位于古宁头战史馆后方，是古宁头海岸战后军事遗址阅读带的一站。', en: 'Located behind the Guningtou Battle Museum, it is one stop in the post-war military-heritage reading band along the coast.' },
    present: { 'zh-tw': '由金門國家公園整理並開放作為軍事遺址展示；展示現況不等同 1949 原始工事。', 'zh-cn': '由金门国家公园整理并开放作为军事遗址展示；展示现况不等同 1949 原始工事。', en: 'Restored and opened by Kinmen National Park for military-heritage interpretation; the present display is not claimed to be an original 1949 fortification.' },
    evidenceNote: { 'zh-tw': '本筆採用使用者指定座標；不將座標說成官方實測，也不改寫 1949 原始工事。', 'zh-cn': '本笔采用用户指定坐标；不将坐标说成官方实测，也不改写 1949 原始工事。', en: 'This record uses a user-specified coordinate; it is not described as an official survey or an original 1949 fortification.' },
    sourceLinks: [
      { label: { 'zh-tw': '古寧頭三營區啟用公告', 'zh-cn': '古宁头三营区启用公告', en: 'Guningtou Three Camp opening notice' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/news/25845' },
      { label: { 'zh-tw': '古寧頭文化景觀研究', 'zh-cn': '古宁头文化景观研究', en: 'Guningtou cultural-landscape study' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18647' },
    ],
  },
  {
    id: 'W027', poiId: 'POI-0029', code: 'W027',
    title: { 'zh-tw': '湖下一營區', 'zh-cn': '湖下一营区', en: 'Huxia Camp 1' },
    category: { 'zh-tw': '戰後軍事設施／活化據點', 'zh-cn': '战后军事设施／活化据点', en: 'Post-war military facility / adaptive reuse' },
    status: { 'zh-tw': '官方資料可查；已開放參觀', 'zh-cn': '官方资料可查；已开放参观', en: 'Official record; open to visitors' },
    role: { 'zh-tw': '守望金烈水道口與海岸線的戰後海防據點，含房舍、哨所、碉堡與坑道。', 'zh-cn': '守望金烈水道口与海岸线的战后海防据点，含房舍、哨所、碉堡与坑道。', en: 'A post-war coastal defence site watching the Jinlie waterway and coast, with buildings, posts, bunkers, and tunnels.' },
    present: { 'zh-tw': '國家公園整理後以原有軍事風貌、壁畫與坑道供訪客理解。', 'zh-cn': '国家公园整理后以原有军事风貌、壁画与坑道供访客理解。', en: 'After National Park work, its military character, murals, and tunnels support visitor interpretation.' },
    evidenceNote: { 'zh-tw': '本筆採用使用者指定座標；1986–1988 建造資訊屬戰後設施，不能回推為 1949 原始工事。', 'zh-cn': '本笔采用用户指定坐标；1986–1988 建造信息属战后设施，不能回推为 1949 原始工事。', en: 'This record uses a user-specified coordinate; the 1986–1988 construction record is post-war and cannot be back-projected as an original 1949 fortification.' },
    sourceLinks: [
      { label: { 'zh-tw': '國家公園湖下一營區專題', 'zh-cn': '国家公园湖下一营区专题', en: 'National Park Huxia Camp feature' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18061.html' },
      { label: { 'zh-tw': '金門觀光旅遊網現況', 'zh-cn': '金门观光旅游网现况', en: 'Kinmen tourism current information' }, href: 'https://kinmen.travel/zh-tw/travel/attraction/1664' },
    ],
  },
  {
    id: 'MUSEUM', poiId: 'POI-0016', code: 'MUSEUM',
    title: { 'zh-tw': '古寧頭戰史館', 'zh-cn': '古宁头战史馆', en: 'Guningtou Battle Museum' },
    category: { 'zh-tw': '戰役紀念與公共展示', 'zh-cn': '战役纪念与公共展示', en: 'Battle memorial and public interpretation' },
    status: { 'zh-tw': '官方館史、移交與整修資料可查', 'zh-cn': '官方馆史、移交与整修资料可查', en: 'Official history, transfer, and renovation records available' },
    role: { 'zh-tw': '把 1949 戰役、老兵故事、油畫與今日公共展示連在一起。', 'zh-cn': '把 1949 战役、老兵故事、油画与今日公共展示连在一起。', en: 'Connects the 1949 battle, veteran stories, paintings, and public interpretation today.' },
    present: { 'zh-tw': '現有 2013 年 CC BY-SA 現況照片；官方頁面另記錄 2024 年整修與沉浸式劇場。', 'zh-cn': '现有 2013 年 CC BY-SA 现况照片；官方页面另记录 2024 年整修与沉浸式剧场。', en: 'A 2013 CC BY-SA current photograph is available; official material also records the 2024 renovation and immersive theatre.' },
    evidenceNote: { 'zh-tw': '館前展示戰車是今日紀念展示，不在本頁宣稱為原參戰車輛。', 'zh-cn': '馆前展示战车是今日纪念展示，不在本页宣称为原参战车辆。', en: 'The tanks outside are present-day memorial displays; this page does not claim they are the original combat vehicles.' },
    sourceLinks: [
      { label: { 'zh-tw': '戰史館整修與館史', 'zh-cn': '战史馆整修与馆史', en: 'Museum renovation and history' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/quarterly/32445/9779.html' },
      { label: { 'zh-tw': '古寧頭戰史館官方介紹', 'zh-cn': '古宁头战史馆官方介绍', en: 'Official museum profile' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/attractions/21008.html' },
    ],
    mediaIds: ['TN-MEDIA-MUSEUM-2013'],
  },
  {
    id: 'BEISHAN-CLIFF', poiId: 'POI-0021', code: 'COAST',
    title: { 'zh-tw': '北山斷崖', 'zh-cn': '北山断崖', en: 'Beishan Cliff' },
    category: { 'zh-tw': '自然海岸／戰場地景', 'zh-cn': '自然海岸／战场地景', en: 'Coastal landscape / battlefield terrain' },
    status: { 'zh-tw': '現況照片與文化景觀資料可查', 'zh-cn': '现况照片与文化景观资料可查', en: 'Current photograph and cultural-landscape material available' },
    role: { 'zh-tw': '1949 戰役終局的重要地形與今日海岸環境教育場域。', 'zh-cn': '1949 战役终局的重要地形与今日海岸环境教育场域。', en: 'Important terrain in the end of the 1949 battle and a present coastal education site.' },
    present: { 'zh-tw': '以自然斷崖、海岸視線與遠處播音牆呈現，不將自然地形誤寫成營區。', 'zh-cn': '以自然断崖、海岸视线与远处播音墙呈现，不将自然地形误写成营区。', en: 'Presented through the cliff, coastal sightlines, and the distant broadcasting wall—not as a camp.' },
    evidenceNote: { 'zh-tw': '照片標示拍攝日期與作者；戰場關聯仍連回既有 POI 與來源。', 'zh-cn': '照片标示拍摄日期与作者；战场关联仍连回既有 POI 与来源。', en: 'The photograph carries its date and author; battlefield context links back to the existing POI and sources.' },
    sourceLinks: [
      { label: { 'zh-tw': '北山聚落與文化景觀', 'zh-cn': '北山聚落与文化景观', en: 'Beishan settlement and cultural landscape' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18527.html' },
      { label: { 'zh-tw': '古寧頭文化景觀研究', 'zh-cn': '古宁头文化景观研究', en: 'Guningtou cultural-landscape study' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18647' },
    ],
    mediaIds: ['TN-MEDIA-BEISHAN-CLIFF-2022'],
  },
  {
    id: 'BROADCAST', poiId: 'POI-0020', code: 'MEMORY',
    title: { 'zh-tw': '北山播音牆', 'zh-cn': '北山播音墙', en: 'Beishan Broadcasting Wall' },
    category: { 'zh-tw': '戰後心理戰記憶地景', 'zh-cn': '战后心理战记忆地景', en: 'Post-war psychological-warfare memory site' },
    status: { 'zh-tw': '現況影像可查；設施年代需依來源閱讀', 'zh-cn': '现况影像可查；设施年代需依来源阅读', en: 'Current image available; facility date must be read from sources' },
    role: { 'zh-tw': '戰後對大陸播音設施，屬冷戰與戰地政務脈絡，不倒推為 1949 登陸工事。', 'zh-cn': '战后对大陆播音设施，属冷战与战地政务脉络，不倒推为 1949 登陆工事。', en: 'A post-war broadcasting facility in the Cold War and military-administration context, not a 1949 landing fortification.' },
    present: { 'zh-tw': '與北山斷崖、古寧頭海岸共同構成可步行理解的記憶地景。', 'zh-cn': '与北山断崖、古宁头海岸共同构成可步行理解的记忆地景。', en: 'Together with Beishan Cliff and the coast, it forms a walkable memory landscape.' },
    evidenceNote: { 'zh-tw': '本頁將設施年代與 1949 戰役分開標示。', 'zh-cn': '本页将设施年代与 1949 战役分开标示。', en: 'The page keeps the facility’s post-war date distinct from the 1949 battle.' },
    sourceLinks: [
      { label: { 'zh-tw': 'Wikimedia Commons 影像紀錄', 'zh-cn': 'Wikimedia Commons 影像记录', en: 'Wikimedia Commons image record' }, href: 'https://commons.wikimedia.org/wiki/File:%E9%87%91%E9%96%80%E5%8C%97%E5%B1%B1%E6%92%AD%E9%9F%B3%E7%AB%99.jpg' },
      { label: { 'zh-tw': '本站既有地點檔案', 'zh-cn': '本站既有地点档案', en: 'Existing site location record' }, href: 'locations/POI-0020' },
    ],
    mediaIds: ['TN-MEDIA-BROADCAST-WALL-2013'],
  },
  {
    id: 'PEACE', poiId: 'POI-0018', code: 'MEMORIAL',
    title: { 'zh-tw': '和平紀念園區', 'zh-cn': '和平纪念园区', en: 'Peace Memorial Park' },
    category: { 'zh-tw': '戰地遺產與和平紀念', 'zh-cn': '战地遗产与和平纪念', en: 'Battlefield heritage and peace memorial' },
    status: { 'zh-tw': '沿用本站既有 POI；現況照片已補入', 'zh-cn': '沿用本站既有 POI；现况照片已补入', en: 'Existing POI retained; a rights-cleared current photograph is available' },
    role: { 'zh-tw': '把戰役地點、砲陣地展示與和平紀念放在同一個公共空間閱讀。', 'zh-cn': '把战役地点、炮阵地展示与和平纪念放在同一个公共空间阅读。', en: 'A public space where the battle site, artillery display, and peace commemoration can be read together.' },
    present: { 'zh-tw': '以既有地點資料、和平紀念園區李氏宗祠現況影像與來源入口呈現。', 'zh-cn': '以既有地点资料、和平纪念园区李氏宗祠现况影像与来源入口呈现。', en: 'Presented through the existing location record, a current image of the Li Ancestral Hall, and source links.' },
    evidenceNote: { 'zh-tw': '影像是 2019 年現況照片，不把紀念園區建築誤寫成 1949 戰鬥工事。', 'zh-cn': '影像是 2019 年现况照片，不把纪念园区建筑误写成 1949 战斗工事。', en: 'The image is a 2019 current view; the memorial building is not described as a 1949 combat fortification.' },
    sourceLinks: [
      { label: { 'zh-tw': '本站既有地點檔案', 'zh-cn': '本站既有地点档案', en: 'Existing site location record' }, href: 'locations/POI-0018' },
      { label: { 'zh-tw': '影像來源與授權', 'zh-cn': '影像来源与授权', en: 'Image source and licence' }, href: 'https://commons.wikimedia.org/wiki/File:%E9%87%91%E9%96%80%E5%92%8C%E5%B9%B3%E7%B4%80%E5%BF%B5%E5%9C%92%E5%8D%80%E6%9D%8E%E6%B0%8F%E5%AE%97%E7%A5%A0.jpg' },
    ],
    mediaIds: ['TN-MEDIA-PEACE-ANCESTRAL-HALL-2019'],
  },
  {
    id: 'LI-GUANGQIAN', poiId: 'POI-0017', code: 'RITUAL',
    title: { 'zh-tw': '李光前將軍廟', 'zh-cn': '李光前将军庙', en: 'General Li Guangqian Shrine' },
    category: { 'zh-tw': '陣亡將士記憶與祭祀', 'zh-cn': '阵亡将士记忆与祭祀', en: 'Memory and ritual for the war dead' },
    status: { 'zh-tw': '沿用本站既有 POI；現況影像已補入', 'zh-cn': '沿用本站既有 POI；现况影像已补入', en: 'Existing POI retained; a rights-cleared current image is available' },
    role: { 'zh-tw': '以陣亡者記憶連接戰役敘事、地方祭祀與今日公共歷史。', 'zh-cn': '以阵亡者记忆连接战役叙事、地方祭祀与今日公共历史。', en: 'Connects the battle narrative, local ritual, and public history through memory of the fallen.' },
    present: { 'zh-tw': '保留地點與祭祀研究入口，並加入 2014 年現況影像；祭祀沿革仍依官方資料閱讀。', 'zh-cn': '保留地点与祭祀研究入口，并加入 2014 年现况影像；祭祀沿革仍依官方资料阅读。', en: 'The place and ritual research entry remain, now with a 2014 current image; ritual history remains source-led.' },
    evidenceNote: { 'zh-tw': '照片只證明拍攝時的現況，不替代廟宇沿革與祭祀活動的官方研究。', 'zh-cn': '照片只证明拍摄时的现况，不替代庙宇沿革与祭祀活动的官方研究。', en: 'The photograph documents its date of capture and does not replace official research into the shrine or rituals.' },
    sourceLinks: [
      { label: { 'zh-tw': '本站既有地點檔案', 'zh-cn': '本站既有地点档案', en: 'Existing site location record' }, href: 'locations/POI-0017' },
      { label: { 'zh-tw': '影像來源與授權', 'zh-cn': '影像来源与授权', en: 'Image source and licence' }, href: 'https://commons.wikimedia.org/wiki/File:%E6%9D%8E%E5%85%89%E5%89%8D%E5%B0%87%E8%BB%8D%E5%BB%9F_-_General_Li_Guangqian_Temple_-_2014.05_-_panoramio.jpg' },
    ],
    mediaIds: ['TN-MEDIA-LI-SHRINE-2014'],
  },
  {
    id: 'BEISHAN-COMMAND', poiId: 'POI-0035', code: 'RESEARCH',
    title: { 'zh-tw': '北山共軍指揮所', 'zh-cn': '北山共军指挥所', en: 'Beishan PLA command post' },
    category: { 'zh-tw': '名稱與位置待查', 'zh-cn': '名称与位置待查', en: 'Name and location pending' },
    status: { 'zh-tw': '研究中；未標示為確定地點', 'zh-cn': '研究中；未标示为确定地点', en: 'Research only; not marked as a confirmed site' },
    role: { 'zh-tw': '使用者指定的研究題目，需查明歷史名稱、確切位置與建築遺存。', 'zh-cn': '用户指定的研究题目，需查明历史名称、确切位置与建筑遗存。', en: 'A user-specified research topic requiring confirmation of historical name, location, and surviving structure.' },
    present: { 'zh-tw': '只列入研究清單，不進入地圖座標與照片導覽。', 'zh-cn': '只列入研究清单，不进入地图坐标与照片导览。', en: 'Listed only as a research item, not placed on the map or in a photo tour.' },
    evidenceNote: { 'zh-tw': '需人工裁決後才可建立正式地點關聯。', 'zh-cn': '需人工裁决后才可建立正式地点关联。', en: 'A human decision is required before a formal location relationship can be created.' },
    sourceLinks: [{ label: { 'zh-tw': '古寧頭文化景觀研究入口', 'zh-cn': '古宁头文化景观研究入口', en: 'Guningtou cultural-landscape research entry' }, href: 'https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18647' }],
  },
  {
    id: 'BEISHAN-HOUSE', poiId: 'POI-0034', code: 'SETTLEMENT',
    title: { 'zh-tw': '北山古洋樓', 'zh-cn': '北山古洋楼', en: 'Beishan Old Western-style House' },
    category: { 'zh-tw': '聚落文化景觀', 'zh-cn': '聚落文化景观', en: 'Settlement heritage' },
    status: { 'zh-tw': '現況影像與文化資產資料可查', 'zh-cn': '现况影像与文化资产资料可查', en: 'Current image and heritage record available' },
    role: { 'zh-tw': '以聚落、洋樓與戰場地景交疊的方式理解今日古寧頭。', 'zh-cn': '以聚落、洋楼与战场地景交叠的方式理解今日古宁头。', en: 'Helps read present-day Guningtou through the overlap of settlement, old house, and battlefield landscape.' },
    present: { 'zh-tw': '不是 1949 戰鬥碉堡；以文化景觀與聚落保存脈絡呈現。', 'zh-cn': '不是 1949 战斗碉堡；以文化景观与聚落保存脉络呈现。', en: 'Not a 1949 battle bunker; presented through settlement and cultural-landscape conservation.' },
    evidenceNote: { 'zh-tw': '影像授權與建築資訊明列於典藏資料。', 'zh-cn': '影像授权与建筑信息明列于典藏资料。', en: 'Image licensing and building information are listed in the archive record.' },
    sourceLinks: [{ label: { 'zh-tw': 'Wikimedia Commons 影像紀錄', 'zh-cn': 'Wikimedia Commons 影像记录', en: 'Wikimedia Commons image record' }, href: 'https://commons.wikimedia.org/wiki/File:%E5%8F%A4%E5%AF%A7%E9%A0%AD%E5%8C%97%E5%B1%B1%E5%8F%A4%E6%B4%8B%E6%A8%93.jpg' }],
    mediaIds: ['TN-MEDIA-BEISHAN-HOUSE-2018'],
  },
  {
    id: 'LINCUO-ARTILLERY', poiId: 'POI-0038', code: 'ARTILLERY',
    title: { 'zh-tw': '林厝砲陣地', 'zh-cn': '林厝炮阵地', en: 'Lincuo Artillery Position' },
    category: { 'zh-tw': '戰場與紀念地景', 'zh-cn': '战场与纪念地景', en: 'Battlefield and memorial landscape' },
    status: { 'zh-tw': '使用者指定座標；與和平紀念園區分開', 'zh-cn': '用户指定坐标；与和平纪念园区分开', en: 'User-specified point; kept separate from the Peace Memorial Park' },
    role: { 'zh-tw': '保留為獨立砲陣地研究項目，不以和平紀念園區或林厝聚落影像代替。', 'zh-cn': '保留为独立炮阵地研究项目，不以和平纪念园区或林厝聚落影像代替。', en: 'Kept as a separate artillery-position research item; no Peace Park or settlement image is used as a substitute.' },
    present: { 'zh-tw': '地圖標記採用使用者提供的 24.48300, 118.32100；現況遺構與展示關係仍需分層閱讀。', 'zh-cn': '地图标记采用用户提供的 24.48300, 118.32100；现况遗构与展示关系仍需分层阅读。', en: 'The map uses the user-provided 24.48300, 118.32100; surviving structures and later display layers remain separate.' },
    evidenceNote: { 'zh-tw': '本筆不與 POI-0018 金門和平紀念園區合併。', 'zh-cn': '本笔不与 POI-0018 金门和平纪念园区合并。', en: 'This record is not merged with POI-0018, Kinmen Peace Memorial Park.' },
    sourceLinks: [
      { label: { 'zh-tw': '本站既有地點檔案', 'zh-cn': '本站既有地点档案', en: 'Location record' }, href: 'locations/POI-0038' },
    ],
  },
];

export const thenNowGalleryIds = [
  'TN-MEDIA-MUSEUM-2013',
  'ARC-PHOTO-WANG-01',
  'TN-MEDIA-GUNINGTOU-BEACH-2015',
  'TN-MEDIA-BEISHAN-CLIFF-2022',
  'TN-MEDIA-BROADCAST-WALL-2013',
  'TN-MEDIA-BEISHAN-HOUSE-2018',
  'TN-MEDIA-PEACE-ANCESTRAL-HALL-2019',
  'TN-MEDIA-LI-SHRINE-2014',
  'TN-MEDIA-LINCUO-MEMORIAL-2019',
  'TN-MEDIA-ARCH-2012',
];

export function getThenNowMedia(id: string): ArchiveMediaAsset | undefined {
  return archiveMedia.find((asset) => asset.id === id);
}

export function getThenNowGallery(): ArchiveMediaAsset[] {
  return thenNowGalleryIds.map(getThenNowMedia).filter((asset): asset is ArchiveMediaAsset => Boolean(asset));
}
