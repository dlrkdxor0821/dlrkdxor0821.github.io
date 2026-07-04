"use client";

import { useState } from "react";

type Item = { orig: string | null; name: string };

export default function GroupManager({
  groups,
  usedGroups,
  busy,
  onApply,
  onBack,
}: {
  groups: string[];
  usedGroups: Set<string>; // 글이 실제로 속한 그룹(삭제 불가)
  busy: boolean;
  onApply: (order: string[], renames: { from: string; to: string }[]) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<Item[]>(groups.map((g) => ({ orig: g, name: g })));
  const [newName, setNewName] = useState("");

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const rename = (i: number, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], name: value };
    setItems(next);
  };
  const remove = (i: number) => setItems(items.filter((_, k) => k !== i));
  const add = () => {
    const n = newName.trim();
    if (!n || items.some((it) => it.name === n)) return;
    setItems([...items, { orig: null, name: n }]);
    setNewName("");
  };

  const apply = () => {
    const order = items.map((it) => it.name.trim()).filter(Boolean);
    if (new Set(order).size !== order.length) {
      alert("그룹 이름이 중복돼요.");
      return;
    }
    const renames = items
      .filter((it) => it.orig && it.name.trim() && it.name.trim() !== it.orig)
      .map((it) => ({ from: it.orig as string, to: it.name.trim() }));
    onApply(order, renames);
  };

  return (
    <div className="view">
      <div className="manage-head">
        <h1 className="view__title">그룹 관리</h1>
        <div className="ed-actions">
          <button type="button" className="ed-btn" onClick={onBack} disabled={busy}>
            ← 글 목록
          </button>
          <button type="button" className="ed-btn ed-btn--primary" onClick={apply} disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
      <p className="ed-hint">그룹을 추가·이름변경·순서변경·삭제할 수 있어요. 이름을 바꾸면 그 그룹의 모든 글에 반영됩니다. 글이 있는 그룹은 삭제할 수 없어요.</p>

      <ul className="grouplist">
        {items.map((it, i) => (
          <li key={i} className="grouprow">
            <div className="grouprow__order">
              <button type="button" className="ed-btn ed-btn--sm" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="위로">↑</button>
              <button type="button" className="ed-btn ed-btn--sm" onClick={() => move(i, 1)} disabled={i === items.length - 1 || busy} aria-label="아래로">↓</button>
            </div>
            <input className="ed-input grouprow__name" value={it.name} onChange={(e) => rename(i, e.target.value)} />
            <button
              type="button"
              className="ed-btn ed-btn--sm"
              onClick={() => remove(i)}
              disabled={busy || (it.orig !== null && usedGroups.has(it.orig))}
              title={it.orig !== null && usedGroups.has(it.orig) ? "글이 있는 그룹은 삭제 불가" : "삭제"}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>

      <div className="group-add">
        <input
          className="ed-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="새 그룹 이름"
        />
        <button type="button" className="ed-btn" onClick={add} disabled={busy}>
          ＋ 추가
        </button>
      </div>
    </div>
  );
}
