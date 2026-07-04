import Link from "next/link";
import { getProjects, getPostsByProject } from "@/lib/posts";

const fmtDate = (d: string) => d.replace(/-/g, ". ");

export function generateStaticParams() {
  return getProjects().map((project) => ({ name: project.name }));
}

export default function ProjectPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const posts = getPostsByProject(name);

  return (
    <div className="view">
      <Link href="/projects" className="back">← 프로젝트</Link>
      <h1 className="view__title">{name}</h1>

      {posts.length === 0 ? (
        <p className="empty">이 프로젝트의 일지가 없어요.</p>
      ) : (
        <ul className="dlist">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link className="drow" href={`/logs/${post.slug}`}>
                <span className="drow__date">{fmtDate(post.date)}</span>
                <span className="drow__title">{post.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
