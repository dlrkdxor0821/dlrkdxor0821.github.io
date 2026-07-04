"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type CategoryType = "project" | "study";
type Post = { slug: string; title: string; date: string; project: string; tags: string[]; type: CategoryType };

const fmt = (d: string) => d.replace(/-/g, ". ");
const FILTERS: { value: "all" | CategoryType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "project", label: "Project" },
  { value: "study", label: "Study" },
];

function matches(query: string, post: Post): boolean {
  const haystack = `${post.title} ${post.tags.join(" ")} ${post.project}`.toLowerCase();
  return haystack.includes(query);
}

export default function SearchResults({ posts }: { posts: Post[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<"all" | CategoryType>("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter !== "all" && post.type !== filter) return false;
      if (!q) return true;
      return matches(q, post);
    });
  }, [posts, query, filter]);

  return (
    <div className="view">
      <h1 className="view__title">검색</h1>

      <input
        className="home-search"
        type="search"
        placeholder="제목·태그·카테고리로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        aria-label="글 검색"
      />

      <div className="home-filters" role="group" aria-label="카테고리 필터">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={"home-filter" + (filter === f.value ? " is-active" : "")}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="home__hint">
        <b>{results.length}</b>개의 글
      </p>

      {results.length === 0 ? (
        <p className="empty">검색 결과가 없어요.</p>
      ) : (
        <ul className="dlist">
          {results.map((post) => (
            <li key={post.slug}>
              <Link className="drow" href={`/logs/${post.slug}`}>
                <span className="drow__date">{fmt(post.date)}</span>
                <span className="drow__title">{post.title}</span>
                <span className="chip">{post.project}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
