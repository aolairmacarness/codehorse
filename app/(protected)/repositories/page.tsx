import { RepositoriesView } from "@/app/module/repositories/components/repositories-view";
import { getRepositoriesPage } from "@/app/module/repositories/actions";

export default async function RepositoriesPage() {
  const page = await getRepositoriesPage(1);

  return (
    <RepositoriesView
      initialRepos={page.repos}
      initialHasMore={page.hasMore}
    />
  );
}
