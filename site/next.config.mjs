/** @type {import('next').NextConfig} */
const nextConfig = {
  // "export"는 프로덕션 빌드(next build)에만 적용 — dev 모드에서 켜두면
  // 한글 등 비-ASCII slug 라우트에서 generateStaticParams 매칭 에러가 난다.
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "images.prismic.io" }],
  },
};

export default nextConfig;
