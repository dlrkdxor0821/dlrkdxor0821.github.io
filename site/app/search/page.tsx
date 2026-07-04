import { Suspense } from "react";
import { getAllPosts, categoryType } from "@/lib/posts";
import SearchResults from "../components/SearchResults";

export default function SearchPage() {
  const posts = getAllPosts().map((p) => ({ ...p, type: categoryType(p.project) }));

  return (
    <Suspense fallback={null}>
      <SearchResults posts={posts} />
    </Suspense>
  );
}
