import Link from "next/link";

type Category = { name: string; type: string; count: number };

export default function HomeIndex({
  groups,
  categories,
}: {
  groups: string[];
  categories: Category[];
}) {
  return (
    <div className="view">
      <h1 className="home__title">log</h1>
      <p className="home__sub">매일의 작업 기록. 카테고리를 골라 보세요.</p>

      {groups.map((groupName) => {
        const group = categories.filter((c) => c.type === groupName);
        if (group.length === 0) return null;
        return (
          <section key={groupName} className="home-group">
            <Link href={`/groups/${encodeURIComponent(groupName)}`} className="home-group__title">
              {groupName}
            </Link>
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
