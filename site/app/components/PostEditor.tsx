"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { PostFields, CategoryGroup } from "@/lib/markdown";

export default function PostEditor({
  initial,
  isNew,
  categories,
  categoryGroups,
  saving,
  onSave,
  onCancel,
}: {
  initial: PostFields;
  isNew: boolean;
  categories: string[];
  categoryGroups: Record<string, CategoryGroup>; // 기존 카테고리 → 그룹
  saving: boolean;
  onSave: (fields: PostFields) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [project, setProject] = useState(initial.project || "기타");
  const [group, setGroup] = useState<CategoryGroup>(
    initial.group ?? categoryGroups[initial.project || "기타"] ?? "study",
  );
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [body, setBody] = useState(initial.body);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");

  // 카테고리를 바꿀 때, 이미 존재하는 카테고리면 그 그룹으로 자동 맞춤
  const onProjectChange = (value: string) => {
    setProject(value);
    const known = categoryGroups[value.trim()];
    if (known) setGroup(known);
  };

  const previewHtml = useMemo(
    () => (preview ? (marked.parse(body, { async: false }) as string) : ""),
    [preview, body],
  );

  const dirty =
    title !== initial.title ||
    date !== initial.date ||
    project !== (initial.project || "기타") ||
    group !== (initial.group ?? categoryGroups[initial.project || "기타"] ?? "study") ||
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
          <label className="ed-label">카테고리</label>
          <input
            className="ed-input"
            list="ed-categories"
            value={project}
            onChange={(e) => onProjectChange(e.target.value)}
            placeholder="예: ROS2 (없으면 새로 생성)"
          />
          <datalist id="ed-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="ed-field">
        <label className="ed-label">분류 (대카테고리)</label>
        <div className="ed-seg">
          <button
            type="button"
            className={"ed-seg__btn" + (group === "project" ? " is-active" : "")}
            onClick={() => setGroup("project")}
          >
            프로젝트
          </button>
          <button
            type="button"
            className={"ed-seg__btn" + (group === "study" ? " is-active" : "")}
            onClick={() => setGroup("study")}
          >
            스터디
          </button>
        </div>
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
