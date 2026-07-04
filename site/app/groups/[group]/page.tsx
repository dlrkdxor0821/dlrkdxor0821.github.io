import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects, getGroups } from "@/lib/posts";

export function generateStaticParams() {
  // 설정된 그룹 + 글에서 실제로 쓰인 그룹
  const configured = getGroups();
  const used = getProjects().map((c) => c.type);
  const all = [...configured, ...used].filter((g, i, a) => a.indexOf(g) === i);
  return all.map((group) => ({ group }));
}

export default function GroupPage({ params }: { params: { group: string } }) {
  const group = decodeURIComponent(params.group);
  const categories = getProjects().filter((c) => c.type === group);
  if (categories.length === 0 && !getGroups().includes(group)) notFound();

  return (
    <div className="view">
      <Link href="/" className="back">← 홈</Link>
      <h1 className="view__title">{group}</h1>

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
