import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import {
  surveyToNCS,
  filterJobs,
  sortJobsByRegion,
  deduplicateJobs,
  buildPrompt,
  NCS_REGISTRY,
  type SurveyAnswers,
  type JobRecommendation,
  type RawJob,
} from "../lib/recommendation";
import { readFileSync } from "fs";
import { join } from "path";

// 서버 시작 시 공고 데이터 로드 (메모리 캐시)
let _jobsCache: RawJob[] | null = null;
function loadJobs(): RawJob[] {
  if (_jobsCache) return _jobsCache;
  try {
    const raw = readFileSync(join(process.cwd(), "server/data/jobs.json"), "utf-8");
    _jobsCache = JSON.parse(raw) as RawJob[];
  } catch {
    _jobsCache = [];
  }
  return _jobsCache;
}

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),

  jobs: router({
    recommend: publicProcedure
      .input(
        z.object({
          Q1: z.array(z.string()),
          Q2: z.array(z.string()),
          Q3: z.string(),
          Q4: z.string(),
          Q5: z.string(),
          Q6: z.array(z.string()),
          Q7: z.string(), // 시/도
          Q8: z.string(), // 시/군/구
        })
      )
      .mutation(async ({ input }) => {
        const answers: SurveyAnswers = input;
        const ncsResult = surveyToNCS(answers);

        // 실제 공고 로드 → 중복 제거 → 필터링 → 선택 지역 우선 정렬
        const allJobs = deduplicateJobs(loadJobs());
        const { mapped, unmapped } = filterJobs(allJobs, ncsResult);
        const userRegionKeyword = answers.Q7.replace(/특별시|광역시|특별자치시|특별자치도|도$/, "").trim();
        const sigungu = answers.Q8 === "전체" ? undefined : answers.Q8;
        const sortedMapped = sortJobsByRegion(mapped, userRegionKeyword, sigungu);
        const sortedUnmapped = sortJobsByRegion(unmapped, userRegionKeyword, sigungu);

        // 토큰 절약: mapped 최대 20개, unmapped 최대 10개
        const prompt = buildPrompt(answers, ncsResult, sortedMapped.slice(0, 20), sortedUnmapped.slice(0, 10));

        try {
          const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
          const response = await client.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 2000,
            system: "당신은 노인 일자리 추천 전문가입니다. 반드시 JSON 형식으로만 응답하세요. JSON 코드 블록(```json)은 제거하고 순수 JSON만 응답하세요.",
            messages: [{ role: "user", content: prompt }],
          });

          let raw = (response.content[0] as any)?.text ?? "{}";
          raw = String(raw).replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

          let parsed: { recommendations?: JobRecommendation[] };
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { recommendations: [] };
          }

          // 공고명으로 원본 데이터에서 링크·전화번호 매칭
          const allJobsForMatch = loadJobs();
          const findOriginalJob = (name: string) =>
            allJobsForMatch.find((j) => j.채용공고명 === name);

          const recommendations = (parsed.recommendations ?? [])
            .filter((item: any) =>
              item?.rank && item?.채용공고명 && item?.모집직종 && item?.모집요강 && item?.reason
            )
            .slice(0, 5)
            .map((item: any, idx: number) => {
              const original = findOriginalJob(String(item.채용공고명 || ""));
              return {
                rank: idx + 1,
                채용공고명: String(item.채용공고명 || ""),
                모집직종: String(item.모집직종 || ""),
                모집요강: String(item.모집요강 || ""),
                reason: String(item.reason || ""),
                matchRate:
                  typeof item.matchRate === "number"
                    ? Math.min(100, Math.max(0, item.matchRate))
                    : undefined,
                링크: original?.링크 || "",
                contTel: original?.contTel || "",
              };
            });

          const candidateGroups = [
            ...new Set(
              ncsResult.candidateCodes
                .map((code) => NCS_REGISTRY[code]?.group ?? "")
                .filter(Boolean)
            ),
          ];

          return { recommendations, candidateGroups };
        } catch (error) {
          console.error("Recommendation error:", error);
          return { recommendations: [], candidateGroups: [] };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
