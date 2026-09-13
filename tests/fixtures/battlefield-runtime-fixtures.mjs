/**
 * NON_HISTORICAL_TEST_DATA
 * Synthetic runtime values used only to exercise the renderer-neutral engine.
 * They are deliberately not historical claims and must never be promoted into
 * the battle package or production map data.
 */

export const NON_HISTORICAL_TEST_DATA = {
  timeline: { startTime: 0, endTime: 100, initialTime: 10 },
  events: [
    {
      id: 'TEST-EVENT-ARRIVAL',
      title: { en: 'Synthetic arrival' },
      eventType: 'movement',
      startTime: 10,
      endTime: 30,
      locationRefs: [],
      participatingUnitRefs: ['TEST-UNIT-ROC'],
      routeRefs: ['TEST-ROUTE-VERIFIED'],
      sourceIds: [],
      evidenceIds: [],
      confidence: 'VERIFIED',
    },
    {
      id: 'TEST-EVENT-COUNTER',
      title: { en: 'Synthetic counter-movement' },
      eventType: 'movement',
      startTime: 20,
      endTime: 50,
      locationRefs: [],
      participatingUnitRefs: ['TEST-UNIT-ROC'],
      routeRefs: ['TEST-ROUTE-VERIFIED'],
      sourceIds: [],
      evidenceIds: [],
      confidence: 'SUPPORTED',
    },
  ],
  routes: [
    {
      id: 'TEST-ROUTE-VERIFIED',
      coordinates: [[118, 24], [120, 24]],
      startTime: 0,
      endTime: 100,
      historicalRouteStatus: 'verified',
      researchOnly: false,
      sourceIds: [],
      evidenceIds: [],
      confidence: 'VERIFIED',
    },
    {
      id: 'TEST-ROUTE-CANDIDATE',
      coordinates: [[118, 24], [118.5, 24.5]],
      startTime: 0,
      endTime: 100,
      historicalRouteStatus: 'candidate',
      researchOnly: true,
      sourceIds: [],
      evidenceIds: [],
      confidence: 'PARTIAL',
    },
  ],
  units: [
    {
      id: 'TEST-UNIT-ROC',
      name: { en: 'Synthetic ROC unit' },
      side: 'roc',
      type: 'infantry',
      routeId: 'TEST-ROUTE-VERIFIED',
      startTime: 0,
      endTime: 100,
      status: 'ready',
      sourceIds: [],
      evidenceIds: [],
      confidence: 'VERIFIED',
    },
    {
      id: 'TEST-UNIT-RESEARCH',
      name: { en: 'Synthetic research unit' },
      side: 'pla',
      type: 'infantry',
      routeId: 'TEST-ROUTE-CANDIDATE',
      startTime: 0,
      endTime: 100,
      status: 'moving',
      researchOnly: true,
      sourceIds: [],
      evidenceIds: [],
      confidence: 'PARTIAL',
    },
  ],
  pois: [
    {
      id: 'TEST-POI-01',
      name: { en: 'Synthetic point of interest' },
      position: [118.2, 24.2],
      sourceIds: [],
      evidenceIds: [],
      confidence: 'VERIFIED',
    },
  ],
  sources: [],
  regions: [],
  stories: [
    {
      id: 'TEST-STORY-01',
      title: { en: 'Synthetic vertical slice' },
      sourceIds: [],
      evidenceIds: [],
      confidence: 'PARTIAL',
      steps: [
        {
          id: 'TEST-STORY-STEP-01',
          time: 25,
          eventId: 'TEST-EVENT-ARRIVAL',
          cameraCommandId: 'TEST-CAMERA-01',
          narration: { en: 'Synthetic narration; not a historical claim.' },
        },
      ],
    },
  ],
};
