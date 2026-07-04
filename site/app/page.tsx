import { getAllPosts, getProjects, getGroups } from "@/lib/posts";
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

  // 선언된 빈 카테고리도 사이드바처럼 홈에 표시 (count 0 포함)
  const categories = getProjects();
  // groups.json 순서 + 설정에 없지만 실제 쓰인 그룹을 뒤에 덧붙임
  const configured = getGroups();
  const used = categories.map((c) => c.type);
  const groups = [...configured, ...used.filter((g) => !configured.includes(g))].filter(
    (g, i, a) => a.indexOf(g) === i,
  );

  return <HomeIndex groups={groups} categories={categories} />;
}
