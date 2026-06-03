// 시니어 일자리 추천 로직 - Python 노트북에서 TypeScript로 포팅
import { extractRegionFromText } from "./location";

export type SurveyAnswers = {
  Q1: string[];
  Q2: string[];
  Q3: string;
  Q4: string;
  Q5: string;
  Q6: string[];
};

export type NCSResult = {
  attitudeKeywords: string[];
  candidateCodes: string[];
  boost: Record<string, number>;
  q5: string;
};

export type JobRecommendation = {
  rank: number;
  채용공고명: string;
  모집직종: string;
  모집요강: string;
  reason: string;
  matchRate?: number;
};

export type RawJob = {
  채용공고명: string;
  자격면허: string;
  근무형태: string;
  근무지역: string;
  모집요강: string;
  모집직종: string;
  링크: string;
};

// NCS 직종 레지스트리
export const NCS_REGISTRY: Record<string, { name: string; group: string }> = {
  "02010302": { name: "고객관리",                       group: "행정·사무" },
  "02020302": { name: "사무행정",                       group: "행정·사무" },
  "04020202": { name: "평생교육프로그램 운영·상담·교수",   group: "교육·문화" },
  "06010108": { name: "요양지원",                       group: "돌봄·복지" },
  "06010203": { name: "보건교육",                       group: "교육·문화" },
  "07010202": { name: "일상생활기능지원",                 group: "돌봄·복지" },
  "07010205": { name: "자원봉사관리",                    group: "돌봄·복지" },
  "07020202": { name: "청소년상담복지",                   group: "돌봄·복지" },
  "07030101": { name: "보육",                           group: "보육" },
  "07030103": { name: "아이돌봄",                       group: "보육" },
  "08010101": { name: "문화·예술기획",                   group: "교육·문화" },
  "08010104": { name: "문헌정보관리",                    group: "교육·문화" },
  "08010401": { name: "학예",                           group: "교육·문화" },
  "10030201": { name: "매장판매",                       group: "시장·판매" },
  "11010101": { name: "보안",                           group: "경비·안전" },
  "11020101": { name: "환경미화",                       group: "환경·청소" },
  "11020102": { name: "가사지원",                       group: "환경·청소" },
  "13010100": { name: "음식조리공통직무",                 group: "시장·판매" },
  "13010101": { name: "한식조리",                       group: "시장·판매" },
  "13010203": { name: "커피관리",                       group: "시장·판매" },
  "21010106": { name: "김치·반찬가공",                   group: "식품가공" },
  "21010108": { name: "곡류·서류·견과류가공",             group: "식품가공" },
  "24010103": { name: "채소재배",                       group: "농업" },
  "24010104": { name: "과수재배",                       group: "농업" },
};

// 공고 직종명 → NCS 그룹 매핑 (Colab의 CATEGORY_GROUP_MAP)
export const CATEGORY_GROUP_MAP: Record<string, string> = {
  // 돌봄·복지
  "요양보호사":                                "돌봄·복지",
  "요양보호사(노인요양사)":                     "돌봄·복지",
  "재가 요양보호사":                           "돌봄·복지",
  "사회복지사":                                "돌봄·복지",
  "산후조리 종사원(산모 도우미)":               "돌봄·복지",

  // 환경·청소
  "건물 청소원":                               "환경·청소",
  "건물 청소원(공공건물":                       "환경·청소",
  "거리 및 공공장소 청소원(환경 미화원)":        "환경·청소",
  "화학·환경·에너지 분야 단순 종사원":           "환경·청소",

  // 경비·안전
  "건물 경비원(청사":                          "경비·안전",
  "아파트·빌라 경비원":                        "경비·안전",
  "건물 관리원":                               "경비·안전",
  "빌딩 관리소장":                             "경비·안전",
  "공사현장 경비원":                           "경비·안전",
  "기타 경호 및 보안 관련 종사원":              "경비·안전",
  "주차 관리원 및 안내원":                      "경비·안전",
  "주차 운전원":                               "경비·안전",

  // 시장·판매
  "단체 급식 보조원":                          "시장·판매",
  "단체급식 조리사":                           "시장·판매",
  "병원 급식 조리사":                          "시장·판매",
  "유치원·어린이집 급식 조리사":                "시장·판매",
  "주방 보조원":                               "시장·판매",

  // 행정·사무
  "협회·회원단체 사무원":                       "행정·사무",
  "경영 및 진단 전문가(경영 컨설턴트":          "행정·사무",

  // 식품가공
  "식품공학 기술자 및 연구원":                  "식품가공",
  "기타 제조 관련 단순 종사원":                 "식품가공",
  "CNC 밀링기 조작원(NC 밀링기 조작원)":        "식품가공",
};

// Q1 태도 키워드 매핑
const Q1_ATTITUDE_MAP: Record<string, string[]> = {
  "친절하고 사람을 좋아해요": [
    "친절한 응대 자세",
    "대상자를 배려하려는 의지",
    "타인의 요구를 이해하려는 노력",
    "원활한 의사소통 태도",
  ],
  "꼼꼼해요": [
    "꼼꼼한 업무 처리",
    "정확성 추구",
    "기록 철저",
    "세밀한 작업에 대한 집중력",
  ],
  "성실하고 책임감 있어요": [
    "위생 준수",
    "규정 준수",
    "안전의식",
    "책임감 있는 업무 수행",
    "성실한 근무 태도",
  ],
  "창의적이에요": [
    "창의적 기획",
    "예술적 감각",
    "새로운 아이디어를 적용하려는 의지",
  ],
  "자연을 좋아해요": [
    "자연 친화적 태도",
    "생명 존중",
    "환경 보전 의식",
  ],
};

// Q2 NCS 코드 매핑
const Q2_NCS_CODE_MAP: Record<string, string[]> = {
  "보육, 돌봄": ["07030101", "07030103", "06010108", "07010202"],
  "동네 관리 및 청소": ["11010101", "11020101", "11020102"],
  "가게 운영": ["10030201", "02010302"],
  "음식 만들기": ["13010100", "13010101", "21010106", "21010108"],
  "식물 가꾸기": ["24010103", "24010104"],
  "행사 및 문화 돕기": ["08010101", "08010104", "08010401", "07010205"],
  "서류 정리": ["02020302"],
  "교육 및 상담": ["04020202", "06010203", "07020202"],
  "카페 및 바리스타": ["13010203"],
};

// Q6 자격증 부스트 매핑
const Q6_BOOST_MAP: Record<string, { codes: string[]; boost: number }> = {
  "요양보호사 자격증": { codes: ["06010108", "07010202"], boost: 0.15 },
  "사회복지사 1급/2급 자격증": { codes: ["07010205", "04020202", "07020202"], boost: 0.15 },
};

const OUTDOOR_GROUPS = new Set(["농업", "환경·청소", "경비·안전"]);
const INDOOR_GROUPS = new Set(["행정·사무", "교육·문화", "보육", "돌봄·복지", "시장·판매", "식품가공"]);

// 하드 필터링 (활동량, 환경에 따른 직종 제외)
function applyHardFilters(candidateCodes: string[], q3Activity: string, q4Environment: string): string[] {
  return candidateCodes.filter((code) => {
    const group = NCS_REGISTRY[code]?.group ?? "";

    if (q3Activity === "주로 앉아서") {
      if (OUTDOOR_GROUPS.has(group)) return false;
    } else if (q3Activity === "가볍게 걷기") {
      if (group === "농업") return false;
    }

    if (q4Environment === "실내") {
      if (OUTDOOR_GROUPS.has(group)) return false;
    } else if (q4Environment === "실외") {
      const indoorWithoutMarket = new Set([...INDOOR_GROUPS].filter(g => g !== "시장·판매"));
      if (indoorWithoutMarket.has(group)) return false;
    }

    return true;
  });
}

// 설문 응답 → NCS 결과 변환
export function surveyToNCS(answers: SurveyAnswers): NCSResult {
  const q1 = answers.Q1 ?? [];
  const q2 = answers.Q2 ?? [];
  const q3 = answers.Q3 ?? "상관없음";
  const q4 = answers.Q4 ?? "상관없음";
  const q5 = answers.Q5 ?? "4~5일";
  const q6 = answers.Q6 ?? [];

  const attitudeKeywords: string[] = [];
  for (const choice of q1) {
    attitudeKeywords.push(...(Q1_ATTITUDE_MAP[choice] ?? []));
  }

  const rawCodes: string[] = [];
  for (const choice of q2) {
    for (const code of Q2_NCS_CODE_MAP[choice] ?? []) {
      if (!rawCodes.includes(code)) rawCodes.push(code);
    }
  }

  const candidateCodes = applyHardFilters(rawCodes, q3, q4);

  const boost: Record<string, number> = {};
  for (const cert of q6) {
    const entry = Q6_BOOST_MAP[cert];
    if (entry) {
      for (const code of entry.codes) {
        boost[code] = (boost[code] ?? 0) + entry.boost;
      }
    }
  }

  return { attitudeKeywords, candidateCodes, boost, q5 };
}

// 실제 공고 데이터를 설문 결과로 필터링 (Colab의 filtered_jobs)
export function filterJobs(
  jobs: RawJob[],
  ncsResult: NCSResult
): { mapped: RawJob[]; unmapped: RawJob[] } {
  const targetGroups = new Set<string>();
  for (const code of ncsResult.candidateCodes) {
    const group = NCS_REGISTRY[code]?.group;
    if (group) targetGroups.add(group);
  }

  const mapped: RawJob[] = [];
  const unmapped: RawJob[] = [];

  for (const job of jobs) {
    const jobGroup = CATEGORY_GROUP_MAP[job.모집직종] ?? "";
    if (jobGroup && targetGroups.has(jobGroup)) {
      mapped.push(job);
    } else {
      unmapped.push(job);
    }
  }

  return { mapped, unmapped };
}

// 사용자 위치 기반으로 mapped/unmapped 내부 정렬
// 같은 시/도 공고를 앞으로 배치 — 나중에 실제 거리 계산 API로 교체 가능
export function sortJobsByRegion(jobs: RawJob[], userRegion: string): RawJob[] {
  if (!userRegion || userRegion === "전국") return jobs;
  return [...jobs].sort((a, b) => {
    const aMatch = extractRegionFromText(a.근무지역) === userRegion ? 0 : 1;
    const bMatch = extractRegionFromText(b.근무지역) === userRegion ? 0 : 1;
    return aMatch - bMatch;
  });
}

// 중복 공고 제거
export function deduplicateJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.채용공고명}|${job.모집직종}|${job.근무지역}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 실제 공고 목록을 포함한 프롬프트 생성
export function buildPrompt(
  answers: SurveyAnswers,
  ncsResult: NCSResult,
  mappedJobs: RawJob[],
  unmappedJobs: RawJob[],
  userRegion?: string
): string {
  const certText = answers.Q6.length > 0 ? answers.Q6.join(", ") : "없음";
  const regionText = userRegion && userRegion !== "전국" ? userRegion : undefined;

  const mappedText = mappedJobs
    .map((j) => `- ${j.채용공고명} / ${j.모집직종} / ${j.근무형태} / ${j.근무지역.slice(0, 30)}`)
    .join("\n") || "없음";

  const unmappedText = unmappedJobs
    .map((j) => `- ${j.채용공고명} / ${j.모집직종} / ${j.근무형태} / ${j.근무지역.slice(0, 30)}`)
    .join("\n") || "없음";

  return `당신은 노인 일자리 추천 전문가입니다.
아래 고령자분의 설문 응답과 실제 공고 목록을 보고, 가장 적합한 공고 최대 5개를 추천해주세요.

## 설문 응답
- 성격/태도: ${answers.Q1.join(", ")}
- 관심 일터: ${answers.Q2.join(", ")}
- 활동량: ${answers.Q3}
- 선호 환경: ${answers.Q4}
- 희망 근무일수: ${answers.Q5}
- 보유 자격증: ${certText}
- 태도 키워드: ${ncsResult.attitudeKeywords.join(", ")}${regionText ? `\n- 현재 위치: ${regionText} 근처` : ""}

## 공고 목록 (분류된 직종)
${mappedText}

## 공고 목록 (직종 미분류 - 설문 응답과 직접 비교하여 적합한 공고 추천)
${unmappedText}

## 지침
1. 고령자분의 성격, 관심사, 신체 활동량, 보유 자격증을 종합적으로 고려하세요.${regionText ? `\n2. 현재 위치(${regionText})와 근무지역이 가까운 공고를 우선 추천하세요.` : ""}
${regionText ? "3" : "2"}. 자격증 보유 표시가 있는 직종은 우선적으로 검토하세요.
${regionText ? "4" : "3"}. 설문 응답과 공고 간의 일치율을 계산하여 일치율이 높은 공고 최대 5개를 제시하세요. 적합한 공고가 적으면 그 수만큼만 추천하세요.
${regionText ? "5" : "4"}. 추천 이유는 한 문장으로 간결하게 작성하세요 (20~30글자 이내).
${regionText ? "6" : "5"}. 추천 이유에서 근무 일수나 시간은 제외하세요.
${regionText ? "7" : "6"}. '직종 미분류' 공고도 설문 응답과 직접 비교해서 적합하다고 판단되면 추천 목록에 포함하세요.
${regionText ? "8" : "7"}. 반드시 아래 JSON 형식으로만 답변하세요. 다른 텍스트는 포함하지 마세요.

{
  "recommendations": [
    {"rank": 1, "채용공고명": "공고제목", "모집직종": "직종명", "모집요강": "근무 일수", "reason": "추천 이유", "matchRate": 95},
    {"rank": 2, "채용공고명": "공고제목", "모집직종": "직종명", "모집요강": "근무 일수", "reason": "추천 이유", "matchRate": 85}
  ]
}`;
}
