import { getAllPosts, getProjects } from "@/lib/posts";
import HomeIndex from "./components/HomeIndex";

export default function Home() {
  const posts = getAllPosts();

  if (posts.length === 0) {
    return (
      <p className="empty">
        아직 기록이 없어요. <code>content/</code> 폴더에 첫 일지를 남겨보세요.
      </p>
    );
  }

  const categories = getProjects().filter((c) => c.count > 0);

  return <HomeIndex categories={categories} />;
}
