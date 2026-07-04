"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "./AdminContext";

type Item = { slug: string; title: string; date: string; tags: string[] };
type Project = { name: string; type: string; logs: Item[] };

function AdminFooter() {
  const { ready, loggedIn, logout } = useAdmin();
  if (!ready || !loggedIn) return null; // 로그인 진입은 우측 상단 버튼이 담당

  return (
    <div className="rail__admin">
      <Link href="/manage?new=1" className="rail__admin-link">✍ 글쓰기</Link>
      <Link href="/manage" className="rail__admin-link">🗂 글 관리</Link>
      <button type="button" className="rail__admin-link rail__admin-link--btn" onClick={logout}>
        로그아웃
      </button>
    </div>
  );
}

export default function Sidebar({ projects, groups }: { projects: Project[]; groups: string[] }) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="rail">
      <Link href="/" className={"rail__brand" + (pathname === "/" ? " is-active" : "")}>
        <span className="rail__brand-ko">log</span>
        <span className="rail__brand-en">개발 기록</span>
      </Link>

      <nav className="rail__nav">
        {projects.length === 0 && <div className="rail__none">카테고리 없음</div>}
        {groups.map((groupName) => {
          const group = projects.filter((p) => p.type === groupName);
          const href = `/groups/${encodeURIComponent(groupName)}`;
          return (
            <section className="rail__section" key={groupName}>
              <Link
                href={href}
                className={"rail__heading rail__heading--link" + (pathname === href ? " is-active" : "")}
              >
                {groupName}
              </Link>
              {group.length === 0 ? (
                <div className="rail__empty">아직 글 없음</div>
              ) : (
                group.map((p) => {
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
                })
              )}
            </section>
          );
        })}
      </nav>

      <AdminFooter />
    </aside>
  );
}
