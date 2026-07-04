"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Post = { slug: string; title: string; date: string; project: string; tags: string[]; type: string };

const fmt = (d: string) => d.replace(/-/g, ". ");

function matches(query: string, post: Post): boolean {
  const haystack = `${post.title} ${post.tags.join(" ")} ${post.project}`.toLowerCase();
  return haystack.includes(query);
}

export default function SearchResults({ posts, groups }: { posts: Post[]; groups: string[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<string>("all");
  const filters = ["all", ...groups];

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

      <div className="home-filters" role="group" aria-label="그룹 필터">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={"home-filter" + (filter === f ? " is-active" : "")}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "전체" : f}
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
