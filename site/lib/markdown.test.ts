import { describe, it, expect } from "vitest";
import { parseMarkdown, buildMarkdown, slugify, makeSlug, PostFields } from "./markdown";

describe("parseMarkdown", () => {
  it("블록 리스트 태그와 값을 파싱한다", () => {
    const raw = `---
title: AMCL 정리 — 파티클로 내 위치 찾기 (Adaptive Monte Carlo Localization)
date: 2026-06-16
project: Nav2
tags:
  - AMCL
  - Localization
  - 파티클필터
---

본문 시작
둘째 줄`;
    const f = parseMarkdown(raw);
    expect(f.title).toBe("AMCL 정리 — 파티클로 내 위치 찾기 (Adaptive Monte Carlo Localization)");
    expect(f.date).toBe("2026-06-16");
    expect(f.project).toBe("Nav2");
    expect(f.tags).toEqual(["AMCL", "Localization", "파티클필터"]);
    expect(f.body).toBe("본문 시작\n둘째 줄");
  });

  it("인라인 배열 태그도 파싱한다", () => {
    const raw = `---
title: 로그인 버그 수정
date: 2026-06-09
project: auth앱
tags: [auth, bugfix]
---
본문`;
    const f = parseMarkdown(raw);
    expect(f.tags).toEqual(["auth", "bugfix"]);
  });

  it("frontmatter가 없으면 전체를 본문으로 본다", () => {
    const f = parseMarkdown("그냥 본문");
    expect(f.title).toBe("");
    expect(f.body).toBe("그냥 본문");
  });
});

describe("buildMarkdown / round-trip", () => {
  it("특수문자·한글·빈 태그를 보존한다", () => {
    const original: PostFields = {
      title: "제목: 콜론 포함 — 대시",
      date: "2026-07-05",
      project: "기타",
      tags: [],
      body: "첫 줄\n\n둘째 문단",
    };
    const built = buildMarkdown(original);
    const parsed = parseMarkdown(built);
    expect(parsed).toEqual(original);
  });

  it("블록 태그 라운드트립", () => {
    const original: PostFields = {
      title: "ROS2 정리",
      date: "2026-06-16",
      project: "ROS2",
      tags: ["ROS2", "DDS", "통신"],
      body: "내용",
    };
    expect(parseMarkdown(buildMarkdown(original))).toEqual(original);
  });

  it("group(Project/Study)을 저장·복원한다", () => {
    const original: PostFields = {
      title: "새 프로젝트 글",
      date: "2026-07-05",
      project: "내 프로젝트",
      group: "project",
      tags: ["a"],
      body: "본문",
    };
    const built = buildMarkdown(original);
    expect(built).toContain("group: project");
    expect(parseMarkdown(built)).toEqual(original);
  });

  it("group이 없으면 frontmatter에 넣지 않는다", () => {
    const built = buildMarkdown({
      title: "t",
      date: "2026-07-05",
      project: "기타",
      tags: [],
      body: "b",
    });
    expect(built).not.toContain("group:");
  });
});

describe("slugify / makeSlug", () => {
  it("한글을 보존하고 공백/특수문자를 하이픈으로 바꾼다", () => {
    expect(slugify("리비 시스템 — 종합 정리")).toBe("리비-시스템-종합-정리");
    expect(slugify("AMCL 정리!!")).toBe("amcl-정리");
  });

  it("빈 제목은 post로 대체", () => {
    expect(slugify("   ")).toBe("post");
  });

  it("makeSlug는 날짜-slug 형식", () => {
    expect(makeSlug("2026-07-05", "테스트 글")).toBe("2026-07-05-테스트-글");
  });
});
