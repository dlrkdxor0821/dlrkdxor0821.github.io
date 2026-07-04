"use client";

import { useMemo, useState } from "react";
import { CategoryGroup } from "@/lib/markdown";
import { fallbackGroup } from "@/lib/adminConfig";
import { LoadedPost } from "./PostList";

type Cat = { name: string; count: number; group: CategoryGroup };

function groupOf(post: LoadedPost): CategoryGroup {
  return post.fields.group ?? fallbackGroup(post.fields.project);
}

function CatRow({
  cat,
  groups,
  busy,
  onApply,
}: {
  cat: Cat;
  groups: string[];
  busy: boolean;
  onApply: (oldName: string, newName: string, newGroup: CategoryGroup) => void;
}) {
  const [name, setName] = useState(cat.name);
  const [group, setGroup] = useState<CategoryGroup>(cat.group);
  const changed = name.trim() !== cat.name || group !== cat.group;
  const groupOptions = groups.includes(group) ? groups : [group, ...groups];

  return (
    <li className="catrow">
      <input className="ed-input catrow__name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="ed-input ed-select catrow__seg" value={group} onChange={(e) => setGroup(e.target.value)}>
        {groupOptions.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <span className="catrow__count">{cat.count}개</span>
      <button
        type="button"
        className="ed-btn ed-btn--sm ed-btn--primary"
        disabled={!changed || busy || !name.trim()}
        onClick={() => onApply(cat.name, name.trim(), group)}
      >
        적용
      </button>
    </li>
  );
}

export default function CategoryManager({
  posts,
  groups,
  busy,
  onApply,
  onBack,
}: {
  posts: LoadedPost[];
  groups: string[];
  busy: boolean;
  onApply: (oldName: string, newName: string, newGroup: CategoryGroup) => void;
  onBack: () => void;
}) {
  const cats = useMemo<Cat[]>(() => {
    const sorted = [...posts].sort((a, b) => (a.fields.date < b.fields.date ? 1 : -1));
    const map = new Map<string, Cat>();
    for (const p of sorted) {
      const existing = map.get(p.fields.project);
      if (existing) existing.count += 1;
      else map.set(p.fields.project, { name: p.fields.project, count: 1, group: groupOf(p) });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [posts]);

  return (
    <div className="view">
      <div className="manage-head">
        <h1 className="view__title">카테고리 관리</h1>
        <button type="button" className="ed-btn" onClick={onBack} disabled={busy}>
          ← 글 목록
        </button>
      </div>
      <p className="ed-hint">
        이름이나 그룹을 바꾸면 그 카테고리의 모든 글에 반영됩니다. 새 카테고리는 글쓰기의 “카테고리” 칸에 새 이름을 입력하면 생겨요.
      </p>

      {cats.length === 0 ? (
        <p className="empty">카테고리가 없어요.</p>
      ) : (
        <ul className="catlist">
          {cats.map((c) => (
            <CatRow key={c.name} cat={c} groups={groups} busy={busy} onApply={onApply} />
          ))}
        </ul>
      )}
    </div>
  );
}
