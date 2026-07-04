"use client";

import { useMemo, useState } from "react";
import { CategoryGroup } from "@/lib/markdown";
import { fallbackGroup } from "@/lib/adminConfig";
import { LoadedPost } from "./PostList";

type Cat = { name: string; count: number; group: CategoryGroup };

function groupOf(post: LoadedPost): CategoryGroup {
  return post.fields.group ?? fallbackGroup(post.fields.project);
}

function CatEditor({
  cat,
  groups,
  busy,
  onApply,
  onCancel,
}: {
  cat: Cat;
  groups: string[];
  busy: boolean;
  onApply: (oldName: string, newName: string, newGroup: CategoryGroup) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(cat.name);
  const [group, setGroup] = useState<CategoryGroup>(cat.group);
  const changed = name.trim() !== cat.name || group !== cat.group;
  const groupOptions = groups.includes(group) ? groups : [group, ...groups];

  return (
    <div className="view">
      <div className="manage-head">
        <h1 className="view__title">카테고리 수정</h1>
        <div className="ed-actions">
          <button type="button" className="ed-btn" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={!changed || busy || !name.trim()}
            onClick={() => onApply(cat.name, name.trim(), group)}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
      <p className="ed-hint">{cat.count}개의 글이 이 카테고리에 속해 있어요. 바꾸면 모두에 반영됩니다.</p>

      <div className="ed-field">
        <label className="ed-label">카테고리 이름</label>
        <input className="ed-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="ed-field">
        <label className="ed-label">그룹 (대분류)</label>
        <select className="ed-input ed-select" value={group} onChange={(e) => setGroup(e.target.value)}>
          {groupOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
    </div>
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
  const [editing, setEditing] = useState<Cat | null>(null);

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

  if (editing) {
    return (
      <CatEditor
        cat={editing}
        groups={groups}
        busy={busy}
        onApply={(oldName, newName, newGroup) => {
          onApply(oldName, newName, newGroup);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="view">
      <div className="manage-head">
        <h1 className="view__title">카테고리 관리</h1>
        <button type="button" className="ed-btn" onClick={onBack} disabled={busy}>
          ← 글 목록
        </button>
      </div>
      <p className="ed-hint">카테고리를 클릭하면 이름·그룹을 바꿀 수 있어요. 새 카테고리는 글쓰기의 “카테고리” 칸에 새 이름을 입력하면 생겨요.</p>

      {cats.length === 0 ? (
        <p className="empty">카테고리가 없어요.</p>
      ) : (
        <ul className="mlist">
          {cats.map((c) => (
            <li key={c.name} className="mrow">
              <button type="button" className="mrow__main" onClick={() => setEditing(c)}>
                <span className="mrow__title">{c.name}</span>
                <span className="chip">{c.group}</span>
                <span className="mrow__date">{c.count}개</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
