export type Coords = {
  latitude: number;
  longitude: number;
};

// ─────────────────────────────────────────────
// TODO: 아래 함수를 실제 Geocoding API로 교체하세요.
//       예) 카카오 로컬 API: https://developers.kakao.com/docs/latest/ko/local/dev-guide
//           Naver Maps Geocoding API
//       API 키는 server/_core/env.ts 의 ENV 객체에 추가하면 됩니다.
//
//       교체 시 서명만 유지하면 나머지 코드는 변경 불필요:
//       export async function reverseGeocode(coords: Coords): Promise<string>
// ─────────────────────────────────────────────

// 위도/경도 → 시/도 + 구/군 이름 (현재는 좌표 범위 테이블로 근사)
export async function reverseGeocode(coords: Coords): Promise<string> {
  const { latitude: lat, longitude: lon } = coords;

  // 주요 시/도 좌표 범위 (대략적 경계)
  if (lat >= 37.4 && lat <= 37.7 && lon >= 126.8 && lon <= 127.2) return "서울";
  if (lat >= 37.3 && lat <= 37.6 && lon >= 126.6 && lon <= 127.0) return "인천";
  if (lat >= 37.3 && lat <= 37.8 && lon >= 126.7 && lon <= 127.8) return "경기";
  if (lat >= 35.0 && lat <= 35.3 && lon >= 128.9 && lon <= 129.3) return "부산";
  if (lat >= 35.8 && lat <= 36.1 && lon >= 128.4 && lon <= 128.8) return "대구";
  if (lat >= 35.1 && lat <= 35.3 && lon >= 126.8 && lon <= 127.1) return "광주";
  if (lat >= 36.2 && lat <= 36.5 && lon >= 127.3 && lon <= 127.6) return "대전";
  if (lat >= 35.5 && lat <= 35.6 && lon >= 129.2 && lon <= 129.4) return "울산";
  if (lat >= 36.4 && lat <= 37.3 && lon >= 127.9 && lon <= 129.2) return "강원";
  if (lat >= 36.0 && lat <= 37.1 && lon >= 127.0 && lon <= 128.0) return "충북";
  if (lat >= 36.0 && lat <= 36.8 && lon >= 126.3 && lon <= 127.4) return "충남";
  if (lat >= 35.0 && lat <= 36.2 && lon >= 127.0 && lon <= 128.1) return "경북";
  if (lat >= 34.6 && lat <= 35.7 && lon >= 127.4 && lon <= 129.2) return "경남";
  if (lat >= 35.0 && lat <= 35.8 && lon >= 126.4 && lon <= 127.6) return "전북";
  if (lat >= 34.0 && lat <= 35.4 && lon >= 126.1 && lon <= 127.5) return "전남";
  if (lat >= 33.1 && lat <= 33.6 && lon >= 126.1 && lon <= 126.9) return "제주";
  if (lat >= 36.5 && lat <= 37.1 && lon >= 127.4 && lon <= 128.5) return "세종";

  return "전국";
}

// 두 좌표 간 직선 거리 계산 (km) — Haversine 공식
export function calcDistanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinLat * sinLat +
          Math.cos((a.latitude * Math.PI) / 180) *
            Math.cos((b.latitude * Math.PI) / 180) *
            sinLon * sinLon
      )
    );
  return R * c;
}

// ─────────────────────────────────────────────
// TODO: 아래 함수를 실제 Geocoding API로 교체하면
//       근무지역 텍스트 → 정확한 좌표 변환이 가능해져
//       거리 기반 필터링의 정확도가 크게 높아집니다.
// ─────────────────────────────────────────────

// 근무지역 텍스트에서 시/도 이름 추출 (텍스트 매칭)
export function extractRegionFromText(address: string): string {
  const regions = ["서울", "인천", "경기", "부산", "대구", "광주", "대전", "울산", "강원", "충북", "충남", "경북", "경남", "전북", "전남", "제주", "세종"];
  for (const r of regions) {
    if (address.includes(r)) return r;
  }
  return "";
}
