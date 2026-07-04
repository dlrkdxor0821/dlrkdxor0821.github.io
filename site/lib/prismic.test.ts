import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isPrismicConfigured } from "./prismic";

describe("isPrismicConfigured", () => {
  const savedRepo = process.env.PRISMIC_REPOSITORY_NAME;
  const savedToken = process.env.PRISMIC_ACCESS_TOKEN;

  beforeEach(() => {
    delete process.env.PRISMIC_REPOSITORY_NAME;
    delete process.env.PRISMIC_ACCESS_TOKEN;
  });

  afterEach(() => {
    if (savedRepo === undefined) delete process.env.PRISMIC_REPOSITORY_NAME;
    else process.env.PRISMIC_REPOSITORY_NAME = savedRepo;
    if (savedToken === undefined) delete process.env.PRISMIC_ACCESS_TOKEN;
    else process.env.PRISMIC_ACCESS_TOKEN = savedToken;
  });

  it("저장소명이 없으면 false (앱이 죽지 않음)", () => {
    expect(isPrismicConfigured()).toBe(false);
  });

  it("저장소명이 있으면 true", () => {
    process.env.PRISMIC_REPOSITORY_NAME = "asd0821";
    expect(isPrismicConfigured()).toBe(true);
  });
});
