import type { Position2D } from '../types/index.js';

export type CoordinateOrder = 'latitude-longitude' | 'longitude-latitude';

export type CoordinateParseResult =
  | { status: 'parsed'; position: Position2D; detectedOrder: CoordinateOrder; message: string }
  | { status: 'ambiguous' | 'invalid'; message: string };

function validLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function validLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function parseCoordinateInput(input: string): CoordinateParseResult {
  const labelledLatitude = input.match(/(?:lat(?:itude)?|緯度)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i);
  const labelledLongitude = input.match(/(?:lon(?:gitude)?|lng|經度)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i);
  if (labelledLatitude && labelledLongitude) {
    const latitude = Number(labelledLatitude[1]);
    const longitude = Number(labelledLongitude[1]);
    if (!validLatitude(latitude) || !validLongitude(longitude)) {
      return { status: 'invalid', message: '標示的經緯度超出 WGS84 合法範圍。' };
    }
    return {
      status: 'parsed',
      position: [longitude, latitude],
      detectedOrder: labelledLatitude.index! < labelledLongitude.index! ? 'latitude-longitude' : 'longitude-latitude',
      message: `辨識為 longitude ${longitude}, latitude ${latitude}（依欄位標示）。`,
    };
  }

  const values = input.trim().match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (values.length !== 2 || values.some(value => !Number.isFinite(value))) {
    return { status: 'invalid', message: '請輸入兩個十進位數值，例如 24.xxxxxx, 118.xxxxxx。' };
  }

  const [first, second] = values;
  const latLonValid = validLatitude(first) && validLongitude(second);
  const lonLatValid = validLongitude(first) && validLatitude(second);
  if (latLonValid && !lonLatValid) {
    return {
      status: 'parsed', position: [second, first], detectedOrder: 'latitude-longitude',
      message: `辨識為 latitude ${first}, longitude ${second}；將以 [${second}, ${first}] 儲存。`,
    };
  }
  if (lonLatValid && !latLonValid) {
    return {
      status: 'parsed', position: [first, second], detectedOrder: 'longitude-latitude',
      message: `辨識為 longitude ${first}, latitude ${second}；將以 [${first}, ${second}] 儲存。`,
    };
  }
  if (latLonValid && lonLatValid) {
    return { status: 'ambiguous', message: '兩個數值都可能是緯度，無法安全判斷順序。請加上 lat/lng 標示。' };
  }
  return { status: 'invalid', message: '經緯度超出 WGS84 合法範圍。' };
}
