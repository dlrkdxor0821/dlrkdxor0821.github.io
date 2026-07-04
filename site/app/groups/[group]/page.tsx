import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects, CategoryType } from "@/lib/posts";

const LABELS: Record<CategoryType, string> = { project: "프로젝트", study: "스터디" };

export function generateStaticParams() {
  return [{ group: "project" }, { group: "study" }];
}

export default function GroupPage({ params }: { params: { group: string } }) {
  const group = params.group;
  if (group !== "project" && group !== "study") notFound();

  const categories = getProjects().filter((c) => c.type === group && c.count > 0);

  return (
    <div className="view">
      <Link href="/" className="back">← 홈</Link>
      <h1 className="view__title">{LABELS[group]}</h1>

      {categories.length === 0 ? (
        <p className="empty">이 그룹에 카테고리가 없어요.</p>
      ) : (
        <ul className="plist">
          {categories.map((c) => (
            <li key={c.name}>
              <Link className="prow" href={`/projects/${encodeURIComponent(c.name)}`}>
                <span className="prow__name">{c.name}</span>
                <span className="prow__count">{c.count}개</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
