"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import SearchButton from "./SearchButton";

type Item = { slug: string; title: string; date: string; tags: string[] };
type CategoryType = "project" | "study";
type Project = { name: string; type: CategoryType; logs: Item[] };

const STORE_KEY = "rail-collapsed";

export default function Shell({
  projects,
  children,
}: {
  projects: Project[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // 새로고침해도 접힘 상태 유지 (하이드레이션 후 읽어 미스매치 방지)
  useEffect(() => {
    if (localStorage.getItem(STORE_KEY) === "1") setCollapsed(true);
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORE_KEY, next ? "1" : "0");
      return next;
    });

  return (
    <div className={"shell" + (collapsed ? " shell--collapsed" : "")}>
      <button
        type="button"
        className="rail-toggle"
        onClick={toggle}
        aria-label={collapsed ? "사이드패널 열기" : "사이드패널 접기"}
        aria-expanded={!collapsed}
        title={collapsed ? "패널 열기" : "패널 접기"}
      >
        <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
      </button>
      <SearchButton />
      <ThemeToggle />
      <Sidebar projects={projects} />
      <main className="stage">{children}</main>
    </div>
  );
}
