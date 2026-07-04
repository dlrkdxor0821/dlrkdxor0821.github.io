import * as prismic from "@prismicio/client";

export function isPrismicConfigured(): boolean {
  return Boolean(process.env.PRISMIC_REPOSITORY_NAME);
}

/**
 * Prismic 클라이언트를 반환한다. 설정(.env)이 없으면 null —
 * 호출부는 null을 받아 미디어 기능만 비활성화하고 앱은 계속 동작한다.
 */
export function getPrismicClient(): prismic.Client | null {
  if (!isPrismicConfigured()) return null;
  return prismic.createClient(process.env.PRISMIC_REPOSITORY_NAME!, {
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  });
}
