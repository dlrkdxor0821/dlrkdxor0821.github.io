import { Suspense } from "react";
import { getAllPosts, categoryType, categoryGroups } from "@/lib/posts";
import SearchResults from "../components/SearchResults";

export default function SearchPage() {
  const groups = categoryGroups();
  const posts = getAllPosts().map((p) => ({
    ...p,
    type: p.group ?? groups.get(p.project) ?? categoryType(p.project),
  }));

  return (
    <Suspense fallback={null}>
      <SearchResults posts={posts} />
    </Suspense>
  );
}
