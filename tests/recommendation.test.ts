import { describe, expect, it } from "vitest";
import { surveyToNCS, buildPrompt } from "../lib/recommendation";
import type { SurveyAnswers } from "../lib/recommendation";

describe("surveyToNCS", () => {
  it("돌봄 선택 시 관련 NCS 코드 포함", () => {
    const answers: SurveyAnswers = {
      Q1: ["친절하고 사람을 좋아해요"],
      Q2: ["보육, 돌봄"],
      Q3: "가볍게 걷기",
      Q4: "실내",
      Q5: "4~5일",
      Q6: [], Q7: "서울특별시", Q8: "강남구",
    };
    const result = surveyToNCS(answers);
    expect(result.candidateCodes.length).toBeGreaterThan(0);
    // 돌봄 관련 코드가 포함되어야 함
    const hasCareCode = result.candidateCodes.some((c) =>
      ["07030101", "07030103", "06010108", "07010202"].includes(c)
    );
    expect(hasCareCode).toBe(true);
  });

  it("실외 환경 + 앉아서 활동 시 농업/환경청소 제외", () => {
    const answers: SurveyAnswers = {
      Q1: ["꼼꼼해요"],
      Q2: ["서류 정리"],
      Q3: "주로 앉아서",
      Q4: "실내",
      Q5: "짧게",
      Q6: [], Q7: "서울특별시", Q8: "강남구",
    };
    const result = surveyToNCS(answers);
    // 농업 코드가 없어야 함
    const hasOutdoorCode = result.candidateCodes.some((c) =>
      ["24010103", "24010104"].includes(c)
    );
    expect(hasOutdoorCode).toBe(false);
  });

  it("요양보호사 자격증 시 부스트 적용", () => {
    const answers: SurveyAnswers = {
      Q1: ["친절하고 사람을 좋아해요"],
      Q2: ["보육, 돌봄"],
      Q3: "가볍게 걷기",
      Q4: "실내",
      Q5: "4~5일",
      Q6: ["요양보호사 자격증"], Q7: "서울특별시", Q8: "강남구",
    };
    const result = surveyToNCS(answers);
    // 요양보호사 관련 코드에 부스트가 있어야 함
    expect(result.boost["06010108"]).toBeGreaterThan(0);
  });

  it("태도 키워드 생성", () => {
    const answers: SurveyAnswers = {
      Q1: ["친절하고 사람을 좋아해요", "꼼꼼해요"],
      Q2: ["가게 운영"],
      Q3: "가볍게 걷기",
      Q4: "실내",
      Q5: "4~5일",
      Q6: [], Q7: "서울특별시", Q8: "강남구",
    };
    const result = surveyToNCS(answers);
    expect(result.attitudeKeywords.length).toBeGreaterThan(0);
  });
});

describe("buildPrompt", () => {
  it("프롬프트에 설문 응답 포함", () => {
    const answers: SurveyAnswers = {
      Q1: ["친절하고 사람을 좋아해요"],
      Q2: ["보육, 돌봄"],
      Q3: "가볍게 걷기",
      Q4: "실내",
      Q5: "4~5일",
      Q6: ["요양보호사 자격증"], Q7: "서울특별시", Q8: "강남구",
    };
    const ncsResult = surveyToNCS(answers);
    const prompt = buildPrompt(answers, ncsResult, [], []);
    expect(prompt).toContain("친절하고 사람을 좋아해요");
    expect(prompt).toContain("요양보호사 자격증");
    expect(prompt).toContain("recommendations");
  });

  it("자격증 없을 때 '없음' 표시", () => {
    const answers: SurveyAnswers = {
      Q1: ["자연을 좋아해요"],
      Q2: ["식물 가꾸기"],
      Q3: "야외 활동 가능",
      Q4: "실외",
      Q5: "짧게",
      Q6: [], Q7: "서울특별시", Q8: "강남구",
    };
    const ncsResult = surveyToNCS(answers);
    const prompt = buildPrompt(answers, ncsResult, [], []);
    expect(prompt).toContain("없음");
  });
});
