export interface ValidatedLinkMeta {
  url?: string | null;
  linkVerified?: boolean;
  linkStatus?: number | null;
  linkBlockedReason?: string | null;
}

export const isVerifiedHttpUrl = (value?: string | null, verified?: boolean | null) => {
  return Boolean(verified && value && /^https?:\/\//i.test(value));
};

export const getLinkBlockLabel = (meta?: ValidatedLinkMeta) => {
  const reason = meta?.linkBlockedReason?.trim();
  if (!reason) return "링크 미검증";
  if (reason === "blocked") return "원문 사이트 차단";
  if (reason === "not_found") return "원문 없음";
  if (reason === "invalid_url") return "잘못된 링크";
  if (reason === "timeout") return "응답 시간 초과";
  if (reason === "content_mismatch") return "원문 확인 실패";
  return "링크 미검증";
};