"use client";

import { PostFields } from "@/lib/markdown";

export type LoadedPost = { slug: string; sha: string; fields: PostFields };

const fmt = (d: string) => d.replace(/-/g, ". ");

export default function PostList({
  posts,
  onNew,
  onEdit,
  onDelete,
  onManageCategories,
}: {
  posts: LoadedPost[];
  onNew: () => void;
  onEdit: (post: LoadedPost) => void;
  onDelete: (post: LoadedPost) => void;
  onManageCategories: () => void;
}) {
  const sorted = [...posts].sort((a, b) => (a.fields.date < b.fields.date ? 1 : -1));

  return (
    <div className="view">
      <div className="manage-head">
        <h1 className="view__title">글 관리</h1>
        <div className="ed-actions">
          <button type="button" className="ed-btn" onClick={onManageCategories}>
            🗂 카테고리 관리
          </button>
          <button type="button" className="ed-btn ed-btn--primary" onClick={onNew}>
            ✍ 새 글 쓰기
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="empty">아직 글이 없어요.</p>
      ) : (
        <ul className="mlist">
          {sorted.map((post) => (
            <li key={post.slug} className="mrow">
              <button type="button" className="mrow__main" onClick={() => onEdit(post)}>
                <span className="mrow__date">{fmt(post.fields.date)}</span>
                <span className="mrow__title">{post.fields.title || post.slug}</span>
                <span className="chip">{post.fields.project || "기타"}</span>
              </button>
              <button
                type="button"
                className="mrow__del"
                onClick={() => onDelete(post)}
                aria-label="삭제"
                title="삭제"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
