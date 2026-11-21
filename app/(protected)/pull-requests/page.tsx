import { getOpenPullRequests } from "@/app/module/pull-requests/actions";
import { PullRequestsView } from "@/app/module/pull-requests/components/pull-requests-view";

export default async function PullRequestsPage() {
  const pullRequests = await getOpenPullRequests();

  return <PullRequestsView pullRequests={pullRequests} />;
}
