import Link from "next/link";
import { getProjects, CategoryType } from "@/lib/posts";

const GROUPS: { type: CategoryType; label: string }[] = [
  { type: "project", label: "프로젝트" },
  { type: "study", label: "스터디" },
];

export default function ProjectsPage() {
  const projects = getProjects();

  if (projects.length === 0) {
    return <p className="empty">아직 프로젝트가 없어요.</p>;
  }

  return (
    <div className="view">
      <h1 className="view__title">프로젝트</h1>
      {GROUPS.map(({ type, label }) => {
        const group = projects.filter((p) => p.type === type);
        if (group.length === 0) return null;
        return (
          <section key={type} className="plist-group">
            <h2 className="plist-group__title">{label}</h2>
            <ul className="plist">
              {group.map((project) => (
                <li key={project.name}>
                  <Link className="prow" href={`/projects/${encodeURIComponent(project.name)}`}>
                    <span className="prow__name">{project.name}</span>
                    <span className="prow__count">{project.count}개</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
