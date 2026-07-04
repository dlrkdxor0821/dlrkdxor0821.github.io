"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { PostFields, CategoryGroup } from "@/lib/markdown";

export default function PostEditor({
  initial,
  isNew,
  categories,
  categoryGroups,
  groups,
  saving,
  onSave,
  onCancel,
}: {
  initial: PostFields;
  isNew: boolean;
  categories: string[];
  categoryGroups: Record<string, CategoryGroup>; // 기존 카테고리 → 그룹
  groups: string[]; // 선택 가능한 그룹 목록
  saving: boolean;
  onSave: (fields: PostFields) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [project, setProject] = useState(initial.project);
  const defaultGroup = initial.group ?? categoryGroups[initial.project] ?? groups[0] ?? "스터디";
  const [group, setGroup] = useState<CategoryGroup>(defaultGroup);
  const [newCatMode, setNewCatMode] = useState(false);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [body, setBody] = useState(initial.body);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");

  // 현재 group이 목록에 없으면(예전 값) 목록에 포함해 표시
  const groupOptions = groups.includes(group) ? groups : [group, ...groups];
  // 선택한 그룹에 속한 카테고리만 (+ 현재 값이 목록에 없으면 포함)
  const catsInGroup = categories.filter((c) => categoryGroups[c] === group);
  const catOptions = project && !catsInGroup.includes(project) ? [project, ...catsInGroup] : catsInGroup;

  // 그룹을 바꾸면, 현재 카테고리가 다른 그룹의 것이면 비운다(직접 입력한 새 것은 유지)
  const onGroupChange = (g: string) => {
    setGroup(g);
    if (!newCatMode && categoryGroups[project] && categoryGroups[project] !== g) setProject("");
  };

  const previewHtml = useMemo(
    () => (preview ? (marked.parse(body, { async: false }) as string) : ""),
    [preview, body],
  );

  const dirty =
    title !== initial.title ||
    date !== initial.date ||
    project !== initial.project ||
    group !== defaultGroup ||
    tagsText !== initial.tags.join(", ") ||
    body !== initial.body;

  const submit = () => {
    if (!title.trim()) return setError("제목을 입력하세요.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("날짜를 YYYY-MM-DD 형식으로 입력하세요.");
    setError("");
    onSave({
      title: title.trim(),
      date,
      project: project.trim() || "기타",
      group,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      body,
    });
  };

  const cancel = () => {
    if (dirty && !window.confirm("저장하지 않은 변경이 있어요. 나갈까요?")) return;
    onCancel();
  };

  // ⌘/Ctrl+S 저장 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // 저장 안 하고 탭 닫기/새로고침 시 경고
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <div className="view">
      <div className="manage-head">
        <h1 className="view__title">{isNew ? "새 글 쓰기" : "글 수정"}</h1>
        <div className="ed-actions">
          <button type="button" className="ed-btn" onClick={cancel} disabled={saving}>
            취소
          </button>
          <button type="button" className="ed-btn ed-btn--primary" onClick={submit} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {error && <p className="ed-error">{error}</p>}

      <div className="ed-field">
        <label className="ed-label">제목</label>
        <input className="ed-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="글 제목" />
      </div>

      <div className="ed-row">
        <div className="ed-field">
          <label className="ed-label">날짜</label>
          <input className="ed-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="ed-field">
          <label className="ed-label">그룹 (대분류)</label>
          <select className="ed-input ed-select" value={group} onChange={(e) => onGroupChange(e.target.value)}>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ed-field">
        <label className="ed-label">카테고리 ({group})</label>
        {newCatMode ? (
          <div className="ed-newcat">
            <input
              className="ed-input"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="새 카테고리 이름"
              autoFocus
            />
            <button
              type="button"
              className="ed-btn ed-btn--sm"
              onClick={() => {
                setNewCatMode(false);
                setProject("");
              }}
            >
              목록에서 선택
            </button>
          </div>
        ) : (
          <select
            className="ed-input ed-select"
            value={project}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setNewCatMode(true);
                setProject("");
              } else {
                setProject(e.target.value);
              }
            }}
          >
            <option value="">카테고리 선택</option>
            {catOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__new__">＋ 새 카테고리 직접 입력…</option>
          </select>
        )}
      </div>

      <div className="ed-field">
        <label className="ed-label">태그 (쉼표로 구분)</label>
        <input
          className="ed-input"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="예: ROS2, SLAM, 위치추정"
        />
      </div>

      <div className="ed-field">
        <div className="ed-body-head">
          <label className="ed-label">본문 (마크다운)</label>
          <button type="button" className="ed-toggle" onClick={() => setPreview((p) => !p)}>
            {preview ? "편집" : "미리보기"}
          </button>
        </div>
        {preview ? (
          <div className="prose ed-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        ) : (
          <textarea
            className="ed-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="마크다운으로 작성하세요…"
            rows={20}
          />
        )}
      </div>
    </div>
  );
}
