export type Xiamen1943AerialBatch = 'initial-five' | 'follow-up-three';

export type XiamenAerialDateStatus = 'DATE UNVERIFIED';

export interface Xiamen1943AerialPhoto {
  id: string;
  label: string;
  batch: Xiamen1943AerialBatch;
  sequence: number;
  localAssetPath: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  alt: string;
}

/**
 * Metadata deliberately contains the user's claimed date, but never promotes
 * it to verifiedDate. The source pixels live outside public/ and are only
 * addressable by the development-only local asset route.
 */
export const XIAMEN_WWII_AERIAL_UNVERIFIED_01 = {
  id: 'XIAMEN_WWII_AERIAL_UNVERIFIED_01',
  label: '廈門二戰時期航照候選資料',
  englishLabel: 'WWII AERIAL CANDIDATE',
  claimedDate: '1943-11-22',
  verifiedDate: null,
  dateStatus: 'DATE UNVERIFIED' as XiamenAerialDateStatus,
  previousLabel: '第一批上傳時曾標為 1944；後續更正為 1943-11-22；兩者均保留為 provenance history。',
  provenanceClues: ['53-8-12', '53-8-20'] as const,
  provenanceCluePolicy: '影像上可辨識的字串只作 provenance clue；不自行解讀為西元日期。',
  status: 'USER-SUPPLIED / UNVERIFIED',
  rightsStatus: 'BLOCKED — RIGHTS UNCLEAR',
  alignmentStatus: 'NOT ORTHORECTIFIED',
  applicationMode: 'EVIDENCE / GEOREGISTRATION RESEARCH',
  assetPolicy: 'LOCAL ONLY — PIXELS NOT IN GIT',
  assetRoot: '.local/aerial-poc/xiamen',
  photoCount: 8,
} as const;

export const XIAMEN_1943_AERIAL_PHOTOS: readonly Xiamen1943AerialPhoto[] = [
  {
    id: 'amoy-1943-11-22-set-a-01',
    label: 'A-01',
    batch: 'initial-five',
    sequence: 1,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-a-01.jpg',
    width: 960,
    height: 1280,
    bytes: 250740,
    sha256: 'b37db3b002eb68e70315049e415db1173dc8edee16e43c150d185523b65d3294',
    alt: '廈門二戰時期航照候選圖 A-01，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-a-02',
    label: 'A-02',
    batch: 'initial-five',
    sequence: 2,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-a-02.jpg',
    width: 960,
    height: 1280,
    bytes: 222580,
    sha256: '804e0427ed6415af7b55e314dec8fdaf8d30721c0ab86cb2dab8df8a1ddaff49',
    alt: '廈門二戰時期航照候選圖 A-02，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-a-03',
    label: 'A-03',
    batch: 'initial-five',
    sequence: 3,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-a-03.jpg',
    width: 960,
    height: 1280,
    bytes: 223745,
    sha256: '7dbc85242829265d64a06079e98881ff9e28a29f83a030737e2182c0ed63a4b5',
    alt: '廈門二戰時期航照候選圖 A-03，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-a-04',
    label: 'A-04',
    batch: 'initial-five',
    sequence: 4,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-a-04.jpg',
    width: 960,
    height: 1280,
    bytes: 220580,
    sha256: 'b0b232d6ac5b6b82025e3cd1dc6287e7b9911c276ab83494b035378aabba3ec8',
    alt: '廈門二戰時期航照候選圖 A-04，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-a-05',
    label: 'A-05',
    batch: 'initial-five',
    sequence: 5,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-a-05.jpg',
    width: 960,
    height: 1280,
    bytes: 244936,
    sha256: 'f6f8ead6bf112f415d45784437ff26926e1e126ad0faea8e2e3be81ef412121a',
    alt: '廈門二戰時期航照候選圖 A-05，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-b-01',
    label: 'B-01',
    batch: 'follow-up-three',
    sequence: 6,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-b-01.jpg',
    width: 960,
    height: 1280,
    bytes: 240497,
    sha256: 'd6281a4e5b3058c34df207ae9b102bce72ce5834cb998f6eb51122a48a0fd3ea',
    alt: '廈門二戰時期航照候選圖 B-01，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-b-02',
    label: 'B-02',
    batch: 'follow-up-three',
    sequence: 7,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-b-02.jpg',
    width: 960,
    height: 1280,
    bytes: 201100,
    sha256: '1856593f1e99350de9170e3e056ec59081c61a187ead57c8f4aab21483ad05c9',
    alt: '廈門二戰時期航照候選圖 B-02，使用者提供，日期未核驗',
  },
  {
    id: 'amoy-1943-11-22-set-b-03',
    label: 'B-03',
    batch: 'follow-up-three',
    sequence: 8,
    localAssetPath: '.local/aerial-poc/xiamen/amoy-1943-11-22-set-b-03.jpg',
    width: 960,
    height: 1280,
    bytes: 230011,
    sha256: '06ea117e0108e8d7941c424c4ad993dde0c4a0a8aff5c92e18d4773029895323',
    alt: '廈門二戰時期航照候選圖 B-03，使用者提供，日期未核驗',
  },
] as const;

export const XIAMEN_1943_AERIAL_POC = XIAMEN_WWII_AERIAL_UNVERIFIED_01;
export const XIAMEN_WWII_AERIAL_PHOTOS = XIAMEN_1943_AERIAL_PHOTOS;
