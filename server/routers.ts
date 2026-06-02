import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { surveyToNCS, buildPrompt, NCS_REGISTRY } from "../lib/recommendation";
import type { SurveyAnswers, JobRecommendation } from "../lib/recommendation";

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
        })
      )
      .mutation(async ({ input }) => {
        const answers: SurveyAnswers = input;
        const ncsResult = surveyToNCS(answers);
        const prompt = buildPrompt(answers, ncsResult);

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "당신은 노인 일자리 추천 전문가입니다. 반드시 JSON 형식으로만 응답하세요.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const raw = response.choices[0]?.message?.content ?? "{}";
        let parsed: { recommendations?: JobRecommendation[] };
        try {
          parsed =
            typeof raw === "string" ? JSON.parse(raw) : (raw as typeof parsed);
        } catch {
          parsed = { recommendations: [] };
        }

        const candidateGroups = [...new Set(
          ncsResult.candidateCodes
            .map((code) => NCS_REGISTRY[code]?.group ?? "")
            .filter(Boolean)
        )];

        return {
          recommendations: parsed.recommendations ?? [],
          candidateGroups,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
