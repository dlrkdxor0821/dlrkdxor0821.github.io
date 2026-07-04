import Link from "next/link";
import { getProjects, getGroups } from "@/lib/posts";

export default function ProjectsPage() {
  const projects = getProjects();

  if (projects.length === 0) {
    return <p className="empty">아직 카테고리가 없어요.</p>;
  }

  const configured = getGroups();
  const used = projects.map((p) => p.type);
  const groups = [...configured, ...used].filter((g, i, a) => a.indexOf(g) === i);

  return (
    <div className="view">
      <h1 className="view__title">전체 카테고리</h1>
      {groups.map((groupName) => {
        const group = projects.filter((p) => p.type === groupName);
        if (group.length === 0) return null;
        return (
          <section key={groupName} className="plist-group">
            <Link href={`/groups/${encodeURIComponent(groupName)}`} className="plist-group__title">
              {groupName}
            </Link>
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
