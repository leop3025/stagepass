import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  url && token ? new Redis({ url, token }) : null;

export async function mirrorHold(showSeatId: string, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(`hold:${showSeatId}`, "1", { ex: ttlSeconds });
}

export async function clearHoldMirror(showSeatId: string) {
  if (!redis) return;
  await redis.del(`hold:${showSeatId}`);
}

export async function hasHoldMirror(showSeatId: string) {
  if (!redis) return null;
  return (await redis.exists(`hold:${showSeatId}`)) === 1;
}
