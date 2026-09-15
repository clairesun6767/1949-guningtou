export type XiamenGcpCandidateStatus = 'CANDIDATE' | 'UNCONFIRMED';

export interface XiamenPixelCoordinate {
  x: number;
  y: number;
}

export interface XiamenGcpCandidate {
  id: string;
  label: string;
  photoId: string;
  pixel: XiamenPixelCoordinate;
  targetLonLat: null;
  status: XiamenGcpCandidateStatus;
  confidence: 'LOW' | 'MEDIUM';
  observation: string;
  referenceToVerify: string;
}

export const XIAMEN_GCP_REGISTRATION_EXPERIMENT = {
  id: 'XIAMEN_GCP_SINGLE_A01_01',
  datasetId: 'XIAMEN_WWII_AERIAL_UNVERIFIED_01',
  imageId: 'amoy-1943-11-22-set-a-01',
  mode: 'SINGLE_IMAGE_REGISTRATION_EXPERIMENT',
  status: 'BLOCKED — CANDIDATE GCPs REQUIRE REFERENCE VERIFICATION',
  qaStatus: 'NOT PASSED',
  referenceSource: '1946 HSIA-MEN 1:12,500 / Amoy_12500_1946 + modern coastline cross-check',
  candidateFeatures: [
    {
      id: 'A01-COAST-01',
      label: 'Xiamen coastline／水陸界線',
      photoId: 'amoy-1943-11-22-set-a-01',
      pixel: { x: 871, y: 330 },
      targetLonLat: null,
      status: 'CANDIDATE',
      confidence: 'MEDIUM',
      observation: '右側連續高對比水陸邊界，可作初始 coastline candidate。',
      referenceToVerify: '1946 HSIA-MEN shoreline geometry',
    },
    {
      id: 'A01-HARBOR-01',
      label: 'harbor／港灣邊緣',
      photoId: 'amoy-1943-11-22-set-a-01',
      pixel: { x: 805, y: 520 },
      targetLonLat: null,
      status: 'CANDIDATE',
      confidence: 'MEDIUM',
      observation: '海岸線與密集 waterfront blocks 的轉折帶，可能是港灣作業區。',
      referenceToVerify: 'historical harbor edge and shoreline bend',
    },
    {
      id: 'A01-BAY-01',
      label: 'major bay／海灣轉折',
      photoId: 'amoy-1943-11-22-set-a-01',
      pixel: { x: 740, y: 845 },
      targetLonLat: null,
      status: 'CANDIDATE',
      confidence: 'LOW',
      observation: '影像下半部可見水線凹入與海岸弧段，需與歷史地圖核對。',
      referenceToVerify: 'major bay / inlet geometry',
    },
    {
      id: 'A01-LANDMARK-01',
      label: 'persistent landmark／大型固定構造物',
      photoId: 'amoy-1943-11-22-set-a-01',
      pixel: { x: 288, y: 694 },
      targetLonLat: null,
      status: 'CANDIDATE',
      confidence: 'LOW',
      observation: '大型規則構造物與周邊道路可作固定地標候選，不先命名。',
      referenceToVerify: '1946 map / current basemap persistent footprint',
    },
    {
      id: 'A01-ROAD-01',
      label: 'persistent road corridor／道路廊道',
      photoId: 'amoy-1943-11-22-set-a-01',
      pixel: { x: 470, y: 535 },
      targetLonLat: null,
      status: 'CANDIDATE',
      confidence: 'LOW',
      observation: '長距離線性道路與街廓方向可作幾何交叉檢查。',
      referenceToVerify: 'historical road alignment; modern road only as reference',
    },
    {
      id: 'B03-ISLAND-01',
      label: 'Gulangyu／nearby islands candidate',
      photoId: 'amoy-1943-11-22-set-b-03',
      pixel: { x: 126, y: 1020 },
      targetLonLat: null,
      status: 'UNCONFIRMED',
      confidence: 'LOW',
      observation: '需先確認影像方向、裁切與海岸位置，不能直接標作 Gulangyu。',
      referenceToVerify: 'Kulangsu / Gulangyu island outline and harbor relation',
    },
  ] satisfies readonly XiamenGcpCandidate[],
  qa: {
    minimumControlPoints: 4,
    availableVerifiedControlPoints: 0,
    maxResidualPixels: 8,
    spatialSpread: 'NOT MEASURED',
    residualsPixels: [] as readonly number[],
    mosaicAllowed: false,
    terrainProjectionAllowed: false,
  },
} as const;

export function evaluateXiamenRegistrationQa(
  candidates: readonly XiamenGcpCandidate[],
  verifiedTargetCount = candidates.filter(candidate => candidate.targetLonLat !== null).length,
  residualsPixels: readonly number[] = [],
) {
  const enoughTargets = verifiedTargetCount >= 4;
  const residualsWithinLimit = residualsPixels.length > 0 && residualsPixels.every(value => Number.isFinite(value) && value <= 8);
  const pass = enoughTargets && residualsWithinLimit;
  return {
    status: pass ? 'PASS' as const : 'BLOCKED' as const,
    pass,
    reason: pass ? 'minimum verified GCP count and residual threshold met' : 'verified target coordinates and residual QA are incomplete',
    verifiedTargetCount,
    candidateCount: candidates.length,
    residualsPixels: [...residualsPixels],
    mosaicAllowed: pass,
    terrainProjectionAllowed: pass,
  };
}
