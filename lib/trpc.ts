import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

function getApiBaseUrl(): string {
  // 웹 브라우저에서 실행 시 localhost 사용
  if (typeof window !== "undefined") {
    return "http://localhost:3000";
  }
  // 폰(Expo Go)에서 실행 시 맥의 로컬 IP 사용 (같은 와이파이 필요)
  return "http://192.168.219.102:3002";
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}
