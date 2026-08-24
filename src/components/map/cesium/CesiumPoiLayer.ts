import type { CustomDataSource, Viewer } from 'cesium';
import type { CesiumPointFeature } from '../../../battle-replay/visualization/adapters/cesiumAdapter.js';
import { STRATEGIC_GEOGRAPHIC_LABELS } from '../../../battle-replay/visualization/adapters/cesiumAdapter.js';

type CesiumModule = typeof import('cesium');

function beaconSvg(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="64" viewBox="0 0 44 64"><path d="M22 62V28" stroke="${color}" stroke-width="1.5" opacity=".8"/><circle cx="22" cy="20" r="13" fill="#171b19" fill-opacity=".82" stroke="${color}" stroke-width="1.5"/><circle cx="22" cy="20" r="4.5" fill="${color}"/><circle cx="22" cy="20" r="9" fill="none" stroke="${color}" stroke-opacity=".35"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function poiColor(locationType?: string): string {
  if (locationType === 'landing-zone' || locationType === 'coast') return '#a95b4a';
  if (locationType === 'military-site') return '#82969a';
  return '#c0a36a';
}

export async function createPoiDataSource(
  Cesium: CesiumModule,
  viewer: Viewer,
  points: CesiumPointFeature[],
): Promise<CustomDataSource> {
  const source = new Cesium.CustomDataSource('canonical-historical-poi');
  for (const point of points) {
    source.entities.add({
      id: `battle-poi:${point.id}`,
      position: Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude),
      billboard: {
        image: beaconSvg(poiColor(point.locationType)),
        width: 33,
        height: 48,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 20000,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 28000),
        scaleByDistance: new Cesium.NearFarScalar(600, 1.22, 26000, .55),
      },
      label: {
        text: point.label ?? point.id,
        font: '600 14px serif',
        fillColor: Cesium.Color.fromCssColorString('#eee6d5'),
        outlineColor: Cesium.Color.fromCssColorString('#111615'),
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(18, -33),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 20000,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 18000),
        translucencyByDistance: new Cesium.NearFarScalar(700, 1, 18000, 0),
      },
      properties: { battleFeatureId: point.id },
    });
  }
  await viewer.dataSources.add(source);
  return source;
}

export async function createStrategicLabelDataSource(
  Cesium: CesiumModule,
  viewer: Viewer,
): Promise<CustomDataSource> {
  const source = new Cesium.CustomDataSource('strategic-geographic-labels');
  for (const place of STRATEGIC_GEOGRAPHIC_LABELS) {
    source.entities.add({
      id: `strategic-label:${place.id}`,
      position: Cesium.Cartesian3.fromDegrees(place.longitude, place.latitude, place.major ? 700 : 420),
      label: {
        text: place.label,
        font: place.major ? '600 18px monospace' : '500 13px monospace',
        fillColor: Cesium.Color.fromCssColorString(place.major ? '#eee7d7' : '#c6c0b1'),
        outlineColor: Cesium.Color.fromCssColorString('#101616'),
        outlineWidth: 5,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(place.major ? 9000 : 0, place.major ? 260000 : 155000),
        translucencyByDistance: new Cesium.NearFarScalar(12000, 1, place.major ? 250000 : 150000, 0),
        scaleByDistance: new Cesium.NearFarScalar(10000, 1.1, 250000, .62),
      },
    });
  }
  await viewer.dataSources.add(source);
  return source;
}
