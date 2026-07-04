"use client";

import { useMemo, useState } from "react";
import { CategoryGroup } from "@/lib/markdown";
import { fallbackGroup } from "@/lib/adminConfig";
import { LoadedPost } from "./PostList";

export type DeclaredCategory = { name: string; group: string };
type Cat = { name: string; count: number; group: CategoryGroup };

function groupOf(post: LoadedPost): CategoryGroup {
  return post.fields.group ?? fallbackGroup(post.fields.project);
}

function CatEditor({
  cat,
  groups,
  busy,
  onApply,
  onDelete,
  onCancel,
}: {
  cat: Cat;
  groups: string[];
  busy: boolean;
  onApply: (oldName: string, newName: string, newGroup: CategoryGroup) => void;
  onDelete: (cat: Cat) => void;
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

      <div className="ed-field">
        <button type="button" className="ed-btn ed-btn--danger" disabled={busy} onClick={() => onDelete(cat)}>
          🗑 카테고리 삭제{cat.count > 0 ? ` (글 ${cat.count}개도 함께 삭제)` : ""}
        </button>
      </div>
    </div>
  );
}

export default function CategoryManager({
  posts,
  declaredCategories,
  groups,
  busy,
  onApply,
  onCreate,
  onDelete,
  onBack,
}: {
  posts: LoadedPost[];
  declaredCategories: DeclaredCategory[];
  groups: string[];
  busy: boolean;
  onApply: (oldName: string, newName: string, newGroup: CategoryGroup) => void;
  onCreate: (name: string, group: string) => void;
  onDelete: (cat: Cat) => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState<Cat | null>(null);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState(groups[0] ?? "");

  const cats = useMemo<Cat[]>(() => {
    const sorted = [...posts].sort((a, b) => (a.fields.date < b.fields.date ? 1 : -1));
    const map = new Map<string, Cat>();
    for (const p of sorted) {
      const existing = map.get(p.fields.project);
      if (existing) existing.count += 1;
      else map.set(p.fields.project, { name: p.fields.project, count: 1, group: groupOf(p) });
    }
    for (const d of declaredCategories) {
      if (!map.has(d.name)) map.set(d.name, { name: d.name, count: 0, group: d.group });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [posts, declaredCategories]);

  const create = () => {
    const n = newName.trim();
    if (!n || cats.some((c) => c.name === n)) return;
    onCreate(n, newGroup || groups[0] || "");
    setNewName("");
  };

  if (editing) {
    return (
      <CatEditor
        cat={editing}
        groups={groups}
        busy={busy}
        onApply={(oldName, newN, newG) => {
          onApply(oldName, newN, newG);
          setEditing(null);
        }}
        onDelete={(c) => {
          onDelete(c);
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
      <p className="ed-hint">카테고리를 클릭하면 이름·그룹을 바꾸거나 삭제할 수 있어요.</p>

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

      <div className="cat-add">
        <input
          className="ed-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="새 카테고리 이름"
        />
        <select
          className="ed-input ed-select cat-add__group"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="button" className="ed-btn" onClick={create} disabled={busy || !newName.trim()}>
          ＋ 추가
        </button>
      </div>
    </div>
  );
}
