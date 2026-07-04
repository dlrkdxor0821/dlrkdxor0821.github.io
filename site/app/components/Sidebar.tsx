"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { slug: string; title: string; date: string; tags: string[] };
type CategoryType = "project" | "study";
type Project = { name: string; type: CategoryType; logs: Item[] };

const GROUPS: { type: CategoryType; label: string }[] = [
  { type: "project", label: "PROJECT" },
  { type: "study", label: "STUDY" },
];

export default function Sidebar({ projects }: { projects: Project[] }) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="rail">
      <Link href="/" className={"rail__brand" + (pathname === "/" ? " is-active" : "")}>
        <span className="rail__brand-ko">log</span>
        <span className="rail__brand-en">개발 기록</span>
      </Link>

      <nav className="rail__nav">
        {projects.length === 0 && <div className="rail__none">프로젝트 없음</div>}
        {GROUPS.map(({ type, label }) => {
          const group = projects.filter((p) => p.type === type);
          if (group.length === 0) return null;
          return (
            <section className="rail__section" key={type}>
              <div className="rail__heading">{label}</div>
              {group.map((p) => {
                const isActiveCategory = pathname === `/projects/${encodeURIComponent(p.name)}`;
                return (
                  <Link
                    key={p.name}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className={"rail__proj-link" + (isActiveCategory ? " is-active" : "")}
                  >
                    <span className="rail__proj-name">{p.name}</span>
                    <span className="rail__proj-count">{p.logs.length}</span>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
