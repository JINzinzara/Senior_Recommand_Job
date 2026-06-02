// 시니어 일자리 추천 로직 - Python 노트북에서 TypeScript로 포팅

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

  // Q1 태도 키워드
  const attitudeKeywords: string[] = [];
  for (const choice of q1) {
    const keywords = Q1_ATTITUDE_MAP[choice] ?? [];
    attitudeKeywords.push(...keywords);
  }

  // Q2 NCS 코드 (중복 제거)
  const rawCodes: string[] = [];
  for (const choice of q2) {
    const codes = Q2_NCS_CODE_MAP[choice] ?? [];
    for (const code of codes) {
      if (!rawCodes.includes(code)) rawCodes.push(code);
    }
  }

  // 하드 필터링
  const candidateCodes = applyHardFilters(rawCodes, q3, q4);

  // Q6 자격증 부스트
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

// 프롬프트 생성 (서버에서 사용)
export function buildPrompt(answers: SurveyAnswers, ncsResult: NCSResult): string {
  const attitudeText = answers.Q1.join(", ");
  const interestText = answers.Q2.join(", ");
  const certText = answers.Q6.length > 0 ? answers.Q6.join(", ") : "없음";

  // 후보 직종 목록 생성
  const candidateGroups = new Set<string>();
  for (const code of ncsResult.candidateCodes) {
    const group = NCS_REGISTRY[code]?.group;
    if (group) candidateGroups.add(group);
  }

  const candidateJobsText = ncsResult.candidateCodes
    .map((code) => {
      const ncs = NCS_REGISTRY[code];
      const boostStr = ncsResult.boost[code] ? ` [자격증 우대 +${(ncsResult.boost[code] * 100).toFixed(0)}%]` : "";
      return `- ${ncs?.name ?? code} (${ncs?.group ?? ""})${boostStr}`;
    })
    .join("\n");

  return `당신은 노인 일자리 추천 전문가입니다.
아래 고령자분의 설문 응답과 후보 직종 목록을 보고, 가장 적합한 일자리 공고를 최대 5개 추천해주세요.

## 설문 응답
- 성격/태도: ${attitudeText}
- 관심 일터: ${interestText}
- 활동량: ${answers.Q3}
- 선호 환경: ${answers.Q4}
- 희망 근무일수: ${answers.Q5}
- 보유 자격증: ${certText}
- 태도 키워드: ${ncsResult.attitudeKeywords.join(", ")}

## 후보 직종 목록
${candidateJobsText || "- 특별한 제한 없음 (모든 직종 고려)"}

## 지침
1. 고령자분의 성격, 관심사, 신체 활동량, 보유 자격증을 종합적으로 고려하세요.
2. 자격증 보유 표시가 있는 직종은 우선적으로 검토하세요.
3. 설문 응답과 직종 간의 일치율을 계산하여 일치율이 높은 공고 최대 5개를 제시하세요. 적합한 공고가 적으면 그 수만큼만 추천하세요.
4. 추천 이유는 한 문장으로 간결하게 작성하세요 (20~30글자 이내).
5. 추천 이유에서 근무 일수나 시간은 제외하세요.
6. 반드시 아래 JSON 형식으로만 답변하세요.

{
  "recommendations": [
    {"rank": 1, "채용공고명": "공고제목", "모집직종": "직종명", "모집요강": "주 X일 근무, 시급 OOOO원", "reason": "추천 이유", "matchRate": 95},
    {"rank": 2, "채용공고명": "공고제목", "모집직종": "직종명", "모집요강": "주 X일 근무, 시급 OOOO원", "reason": "추천 이유", "matchRate": 88}
  ]
}

실제 공고 데이터가 없으므로, 후보 직종을 기반으로 현실적인 가상의 공고를 생성하여 추천해주세요.
공고명은 구체적이고 현실적으로 작성하세요 (예: "서울 노원구 요양보호사 모집", "강남구 어린이집 보육교사 보조").
모집요강에는 근무 일수와 시급 정보를 포함하세요.
희망 근무일수 "${answers.Q5}"를 반영하여 근무 조건을 설정하세요.`;
}
