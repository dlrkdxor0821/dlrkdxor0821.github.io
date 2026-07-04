import { Suspense } from "react";
import { getAllPosts, categoryType, categoryGroups, getGroups } from "@/lib/posts";
import SearchResults from "../components/SearchResults";

export default function SearchPage() {
  const catGroups = categoryGroups();
  const posts = getAllPosts().map((p) => ({
    ...p,
    type: p.group ?? catGroups.get(p.project) ?? categoryType(p.project),
  }));
  const configured = getGroups();
  const used = posts.map((p) => p.type);
  const groups = [...configured, ...used].filter((g, i, a) => a.indexOf(g) === i);

  return (
    <Suspense fallback={null}>
      <SearchResults posts={posts} groups={groups} />
    </Suspense>
  );
}
