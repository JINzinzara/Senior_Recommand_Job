import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
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
import { reverseGeocode, type Coords } from "../lib/location";
import { readFileSync } from "fs";
import { join } from "path";

// 서버 시작 시 공고 데이터 로드 (메모리 캐시)
let _jobsCache: RawJob[] | null = null;
function loadJobs(): RawJob[] {
  if (_jobsCache) return _jobsCache;
  try {
    const raw = readFileSync(join(__dirname, "data/jobs.json"), "utf-8");
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
          location: z
            .object({ latitude: z.number(), longitude: z.number() })
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { location, ...surveyFields } = input;
        const answers: SurveyAnswers = surveyFields;
        const ncsResult = surveyToNCS(answers);

        // 위치가 있으면 시/도 이름으로 변환 (API 교체 시 이 부분만 변경)
        const userRegion = location
          ? await reverseGeocode(location as Coords)
          : undefined;

        // 실제 공고 로드 → 중복 제거 → 필터링 → 위치순 정렬
        const allJobs = deduplicateJobs(loadJobs());
        const { mapped, unmapped } = filterJobs(allJobs, ncsResult);
        const sortedMapped = userRegion ? sortJobsByRegion(mapped, userRegion) : mapped;
        const sortedUnmapped = userRegion ? sortJobsByRegion(unmapped, userRegion) : unmapped;

        // 토큰 절약: mapped 최대 20개, unmapped 최대 10개
        const prompt = buildPrompt(answers, ncsResult, sortedMapped.slice(0, 20), sortedUnmapped.slice(0, 10), userRegion);

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "당신은 노인 일자리 추천 전문가입니다. 반드시 JSON 형식으로만 응답하세요. JSON 코드 블록(```json)은 제거하고 순수 JSON만 응답하세요.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          });

          let raw = response.choices[0]?.message?.content ?? "{}";

          if (Array.isArray(raw)) {
            const textContent = raw.find((c: any) => c.type === "text") as any;
            raw = textContent?.text ?? "{}";
          }

          raw = String(raw).replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

          let parsed: { recommendations?: JobRecommendation[] };
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { recommendations: [] };
          }

          const recommendations = (parsed.recommendations ?? [])
            .filter((item: any) =>
              item?.rank && item?.채용공고명 && item?.모집직종 && item?.모집요강 && item?.reason
            )
            .slice(0, 5)
            .map((item: any, idx: number) => ({
              rank: idx + 1,
              채용공고명: String(item.채용공고명 || ""),
              모집직종: String(item.모집직종 || ""),
              모집요강: String(item.모집요강 || ""),
              reason: String(item.reason || ""),
              matchRate:
                typeof item.matchRate === "number"
                  ? Math.min(100, Math.max(0, item.matchRate))
                  : undefined,
            }));

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
