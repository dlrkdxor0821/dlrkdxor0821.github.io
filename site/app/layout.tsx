import "./globals.css";
import Shell from "./components/Shell";
import { getProjects, getPostsByProject } from "@/lib/posts";

export const metadata = {
  title: "log — 개발 기록",
  description: "마크다운으로 쓰는 개발 기록",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const projects = getProjects().map((pr) => ({
    name: pr.name,
    type: pr.type,
    logs: getPostsByProject(pr.name).map((p) => ({ slug: p.slug, title: p.title, date: p.date, tags: p.tags })),
  }));

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="grain" aria-hidden="true" />
        <Shell projects={projects}>{children}</Shell>
      </body>
    </html>
  );
}
