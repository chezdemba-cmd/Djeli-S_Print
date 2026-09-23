import { timingSafeEqual } from "node:crypto";

export function isValidCronAuthorization(authorization: string | null, secret: string | undefined) {
  if (!secret || secret.length < 16 || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
