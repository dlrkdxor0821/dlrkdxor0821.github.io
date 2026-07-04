"use client";

import Link from "next/link";
import { useAdmin } from "./AdminContext";

// 우측 상단 관리자 로그인 버튼. 로그인 전에만 보이고, 로그인 후엔 사이드바 메뉴가 담당.
export default function AdminButton() {
  const { ready, loggedIn } = useAdmin();
  if (!ready || loggedIn) return null;

  return (
    <Link href="/manage" className="admin-login-btn" aria-label="관리자 로그인" title="관리자 로그인">
      <span aria-hidden="true">🔑</span>
    </Link>
  );
}
