import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

const fmtDate = (d: string) => d.replace(/-/g, ". ");

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default function LogPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(decodeURIComponent(params.slug));
  if (!post) notFound();

  return (
    <article className="view">
      <div className="doc__date">{fmtDate(post.date)}</div>
      <h1 className="doc__title">{post.title}</h1>

      {(post.project !== "기타" || post.tags.length > 0) && (
        <div className="doc__meta">
          {post.project !== "기타" && <span className="chip">{post.project}</span>}
          {post.tags.map((t) => (
            <span className="tagword" key={t}>#{t}</span>
          ))}
        </div>
      )}

      <div className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </article>
  );
}
