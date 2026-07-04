"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SearchButton() {
  const pathname = usePathname() ?? "/";
  return (
    <Link
      href="/search"
      className={"search-btn" + (pathname === "/search" ? " is-active" : "")}
      aria-label="검색"
      title="검색"
    >
      <span aria-hidden="true">🔍</span>
    </Link>
  );
}
