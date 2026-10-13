import { CircleCheck, CircleDot, Eye, Inbox } from "lucide-react";
import { ActivityFeed, BarChart, Panel, StatusBreakdown } from "@/components/dashboard/charts";
import { ParamSelect } from "@/components/dashboard/filters";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/ui/card";
import { boardQuery } from "@/lib/validators";
import { pageUser } from "@/server/page-auth";
import { boardInsights, boardSummary, type BoardRange } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const RANGES: { value: BoardRange; label: string; note: string }[] = [
  { value: "30d", label: "Last 30 days", note: "Cases escalated in the last 30 days" },
  { value: "90d", label: "Last 90 days", note: "Cases escalated in the last 90 days" },
  { value: "all", label: "All time", note: "Every case that has been escalated" },
];

/** The numbers around the review work. The cases themselves are on the Review Board. */
export default async function ReviewDashboardPage({ searchParams }: PageProps<"/review">) {
  const user = await pageUser(["reviewer", "admin"]);
  const raw = (await searchParams).range;
  const parsed = boardQuery.shape.range.safeParse((Array.isArray(raw) ? raw[0] : raw) || undefined);
  const range: BoardRange = (parsed.success ? parsed.data : undefined) ?? "90d";
  const [summary, insights] = await Promise.all([boardSummary(user), boardInsights(user, range)]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        action={
          <ParamSelect
            label="Period"
            value={range}
            options={RANGES}
            hrefs={Object.fromEntries(RANGES.map((r) => [r.value, r.value === "90d" ? "/review" : `/review?range=${r.value}`]))}
          />
        }
      />

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Escalated"
          Icon={CircleDot}
          value={summary.escalated}
          note={`${summary.newThisWeek} new this week`}
        />
        <StatTile
          label="Under Review"
          Icon={Eye}
          value={summary.underReview}
          note={
            summary.oldestUnderReviewDays === null
              ? "None open"
              : `Oldest has been open ${plural(summary.oldestUnderReviewDays, "day", "days")}`
          }
        />
        <StatTile label="Shared with you" Icon={Inbox} value={summary.sharedUnattached} note="Not yet attached to a case" />
        <StatTile label="Closed this month" Icon={CircleCheck} value={summary.closedThisMonth} note="Now in Case Archives" />
      </dl>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Cases escalated per week" note="The last seven weeks, each starting on Monday">
          <BarChart data={insights.weeks} unit={["case escalated", "cases escalated"]} />
        </Panel>
        <Panel title="Cases by status" note={RANGES.find((r) => r.value === range)!.note}>
          <StatusBreakdown counts={insights.statuses} />
        </Panel>
      </div>

      <Panel title="Recent activity">
        <ActivityFeed items={insights.activity} />
      </Panel>
    </>
  );
}
