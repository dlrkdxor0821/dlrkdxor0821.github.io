"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "../components/AdminContext";
import PostList, { LoadedPost } from "../components/PostList";
import PostEditor from "../components/PostEditor";
import CategoryManager from "../components/CategoryManager";
import { PostFields, CategoryGroup, parseMarkdown, buildMarkdown, makeSlug } from "@/lib/markdown";
import { PROJECT_CATEGORY_NAMES } from "@/lib/adminConfig";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function LoginGate() {
  const { login } = useAdmin();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const ok = await login(pw);
    setBusy(false);
    if (!ok) setError("비밀번호가 틀렸어요.");
  };

  return (
    <div className="view view--center">
      <h1 className="view__title">관리자 로그인</h1>
      <form className="login-form" onSubmit={submit}>
        <input
          className="ed-input"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호"
          autoFocus
        />
        {error && <p className="ed-error">{error}</p>}
        <button type="submit" className="ed-btn ed-btn--primary" disabled={busy}>
          {busy ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}

export default function ManagePage() {
  const { ready, loggedIn, api } = useAdmin();
  const [posts, setPosts] = useState<LoadedPost[] | null>(null);
  const [editing, setEditing] = useState<{ post: LoadedPost | null; isNew: boolean } | null>(null);
  const [managingCats, setManagingCats] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const loadPosts = useCallback(async (): Promise<LoadedPost[]> => {
    const res = await api("/api/posts");
    if (!res.ok) throw new Error(`목록 로드 실패 (${res.status})`);
    const data: { slug: string; sha: string; raw: string }[] = await res.json();
    const loaded = data.map((d) => ({ slug: d.slug, sha: d.sha, fields: parseMarkdown(d.raw) }));
    setPosts(loaded);
    return loaded;
  }, [api]);

  // 로그인 후: 목록 로드 + URL 의도(new/slug) 처리
  useEffect(() => {
    if (!ready || !loggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadPosts();
        if (cancelled) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("new") === "1") {
          setEditing({ post: null, isNew: true });
        } else {
          const slug = params.get("slug");
          if (slug) {
            const found = loaded.find((p) => p.slug === slug);
            if (found) setEditing({ post: found, isNew: false });
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, loggedIn, loadPosts]);

  const uniqueSlug = (base: string, existing: LoadedPost[]): string => {
    const taken = new Set(existing.map((p) => p.slug));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  const handleSave = async (fields: PostFields) => {
    setSaving(true);
    try {
      const content = buildMarkdown(fields);
      let slug: string;
      let body: Record<string, unknown>;
      if (editing?.isNew) {
        slug = uniqueSlug(makeSlug(fields.date, fields.title), posts ?? []);
        body = { content };
      } else {
        slug = editing!.post!.slug;
        body = { content, sha: editing!.post!.sha };
      }
      const res = await api(`/api/posts/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`저장 실패 (${res.status})`);
      await loadPosts();
      setEditing(null);
      setToast("저장됐어요. 잠시 후(1~2분) 사이트에 반영됩니다.");
      setTimeout(() => setToast(""), 6000);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: LoadedPost) => {
    if (!window.confirm(`"${post.fields.title || post.slug}" 글을 삭제할까요?`)) return;
    try {
      const res = await api(`/api/posts/${encodeURIComponent(post.slug)}?sha=${post.sha}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`삭제 실패 (${res.status})`);
      await loadPosts();
      setToast("삭제됐어요.");
      setTimeout(() => setToast(""), 6000);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  // 카테고리 이름/그룹 일괄 변경 — 해당 카테고리의 모든 글 frontmatter 수정
  const handleCategoryApply = async (
    oldName: string,
    newName: string,
    newGroup: CategoryGroup,
  ) => {
    const affected = (posts ?? []).filter((p) => p.fields.project === oldName);
    if (affected.length === 0) return;
    setSaving(true);
    try {
      for (const p of affected) {
        const content = buildMarkdown({ ...p.fields, project: newName, group: newGroup });
        const res = await api(`/api/posts/${encodeURIComponent(p.slug)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content, sha: p.sha }),
        });
        if (!res.ok) throw new Error(`카테고리 변경 실패 (${res.status})`);
      }
      await loadPosts();
      setToast(`카테고리 반영: ${affected.length}개 글. 잠시 후 사이트에 적용됩니다.`);
      setTimeout(() => setToast(""), 6000);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set((posts ?? []).map((p) => p.fields.project).filter(Boolean))).sort(),
    [posts],
  );

  // 기존 카테고리 → 그룹(대분류) 매핑 (최신 글 기준, 없으면 이름 폴백)
  const categoryGroupMap = useMemo(() => {
    const sorted = [...(posts ?? [])].sort((a, b) => (a.fields.date < b.fields.date ? 1 : -1));
    const map: Record<string, CategoryGroup> = {};
    for (const p of sorted) {
      if (p.fields.project in map) continue;
      map[p.fields.project] =
        p.fields.group ?? (PROJECT_CATEGORY_NAMES.includes(p.fields.project) ? "project" : "study");
    }
    return map;
  }, [posts]);

  if (!ready) return null;
  if (!loggedIn) return <LoginGate />;

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      {editing ? (
        <PostEditor
          initial={
            editing.isNew
              ? { title: "", date: today(), project: "기타", tags: [], body: "" }
              : editing.post!.fields
          }
          isNew={editing.isNew}
          categories={categories}
          categoryGroups={categoryGroupMap}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : managingCats ? (
        <CategoryManager
          posts={posts ?? []}
          busy={saving}
          onApply={handleCategoryApply}
          onBack={() => setManagingCats(false)}
        />
      ) : loadError ? (
        <p className="empty">{loadError}</p>
      ) : posts === null ? (
        <p className="empty">불러오는 중…</p>
      ) : (
        <PostList
          posts={posts}
          onNew={() => setEditing({ post: null, isNew: true })}
          onEdit={(p) => setEditing({ post: p, isNew: false })}
          onDelete={handleDelete}
          onManageCategories={() => setManagingCats(true)}
        />
      )}
    </>
  );
}
