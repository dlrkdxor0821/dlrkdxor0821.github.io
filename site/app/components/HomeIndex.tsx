import Link from "next/link";

type CategoryType = "project" | "study";
type Category = { name: string; type: CategoryType; count: number };

const GROUPS: { type: CategoryType; label: string }[] = [
  { type: "project", label: "PROJECT" },
  { type: "study", label: "STUDY" },
];

export default function HomeIndex({ categories }: { categories: Category[] }) {
  return (
    <div className="view">
      <h1 className="home__title">log</h1>
      <p className="home__sub">매일의 작업 기록. 카테고리를 골라 보세요.</p>

      {GROUPS.map(({ type, label }) => {
        const group = categories.filter((c) => c.type === type);
        if (group.length === 0) return null;
        return (
          <section key={type} className="home-group">
            <h2 className="home-group__title">{label}</h2>
            <ul className="plist">
              {group.map((category) => (
                <li key={category.name}>
                  <Link className="prow" href={`/projects/${encodeURIComponent(category.name)}`}>
                    <span className="prow__name">{category.name}</span>
                    <span className="prow__count">{category.count}개</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
