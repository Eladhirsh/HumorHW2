import { createClient } from "@/lib/supabase/server";
import StatsCharts from "@/components/StatsCharts";

async function fetchStats() {
  const supabase = await createClient();

  // Counts
  const [
    { count: totalProfiles },
    { count: totalImages },
    { count: totalCaptions },
    { count: totalVotes },
    { count: totalLikes },
    { count: totalReportedCaptions },
    { count: totalReportedImages },
    { count: publicImages },
    { count: featuredCaptions },
    { count: totalShares },
    { count: totalCommunities },
    { count: totalHumorFlavors },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("images").select("*", { count: "exact", head: true }),
    supabase.from("captions").select("*", { count: "exact", head: true }),
    supabase.from("caption_votes").select("*", { count: "exact", head: true }),
    supabase.from("caption_likes").select("*", { count: "exact", head: true }),
    supabase
      .from("reported_captions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("reported_images")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("images")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
    supabase
      .from("captions")
      .select("*", { count: "exact", head: true })
      .eq("is_featured", true),
    supabase.from("shares").select("*", { count: "exact", head: true }),
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("humor_flavors").select("*", { count: "exact", head: true }),
  ]);

  // Top captioners — profiles with most captions
  const { data: topCaptioners } = await supabase
    .from("captions")
    .select("profile_id")
    .limit(500);

  const captionerCounts: Record<string, number> = {};
  topCaptioners?.forEach((c) => {
    captionerCounts[c.profile_id] = (captionerCounts[c.profile_id] || 0) + 1;
  });
  const topCaptionerEntries = Object.entries(captionerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Recent activity — last 20 captions with timestamps
  const { data: recentCaptions } = await supabase
    .from("captions")
    .select("created_datetime_utc")
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  // Group recent captions by day for activity chart
  const activityByDay: Record<string, number> = {};
  recentCaptions?.forEach((c) => {
    const day = c.created_datetime_utc?.slice(0, 10);
    if (day) activityByDay[day] = (activityByDay[day] || 0) + 1;
  });
  const activityTimeline = Object.entries(activityByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  // Top liked captions
  const { data: topLikedCaptions } = await supabase
    .from("captions")
    .select("id, content, like_count, is_featured")
    .order("like_count", { ascending: false })
    .limit(5);

  // Content moderation ratio
  const moderationData = [
    { name: "Reported Captions", value: totalReportedCaptions || 0 },
    { name: "Reported Images", value: totalReportedImages || 0 },
    { name: "Clean Captions", value: (totalCaptions || 0) - (totalReportedCaptions || 0) },
    { name: "Clean Images", value: (totalImages || 0) - (totalReportedImages || 0) },
  ];

  // Caption engagement distribution
  const engagementData = [
    { name: "Votes", value: totalVotes || 0 },
    { name: "Likes", value: totalLikes || 0 },
    { name: "Shares", value: totalShares || 0 },
  ];

  return {
    counts: {
      profiles: totalProfiles || 0,
      images: totalImages || 0,
      captions: totalCaptions || 0,
      votes: totalVotes || 0,
      likes: totalLikes || 0,
      reportedCaptions: totalReportedCaptions || 0,
      reportedImages: totalReportedImages || 0,
      publicImages: publicImages || 0,
      featuredCaptions: featuredCaptions || 0,
      shares: totalShares || 0,
      communities: totalCommunities || 0,
      humorFlavors: totalHumorFlavors || 0,
    },
    topCaptioners: topCaptionerEntries.map(([id, count]) => ({
      id: id.slice(0, 8),
      count,
    })),
    activityTimeline,
    topLikedCaptions: topLikedCaptions || [],
    moderationData,
    engagementData,
  };
}

export default async function AdminDashboard() {
  const stats = await fetchStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">
          Platform overview and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KPICard label="Users" value={stats.counts.profiles} color="indigo" />
        <KPICard label="Images" value={stats.counts.images} color="cyan" subtitle={`${stats.counts.publicImages} public`} />
        <KPICard label="Captions" value={stats.counts.captions} color="emerald" subtitle={`${stats.counts.featuredCaptions} featured`} />
        <KPICard label="Votes" value={stats.counts.votes} color="amber" />
        <KPICard label="Likes" value={stats.counts.likes} color="pink" />
        <KPICard label="Shares" value={stats.counts.shares} color="violet" />
        <KPICard label="Communities" value={stats.counts.communities} color="teal" />
        <KPICard label="Humor Flavors" value={stats.counts.humorFlavors} color="orange" />
      </div>

      {/* Moderation alert */}
      {(stats.counts.reportedCaptions > 0 ||
        stats.counts.reportedImages > 0) && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-red-300 font-medium">Content Flagged for Review</p>
            <p className="text-red-400 text-sm">
              {stats.counts.reportedCaptions} caption report(s) &middot;{" "}
              {stats.counts.reportedImages} image report(s)
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <StatsCharts
        activityTimeline={stats.activityTimeline}
        topCaptioners={stats.topCaptioners}
        moderationData={stats.moderationData}
        engagementData={stats.engagementData}
      />

      {/* Top Liked Captions */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          🏆 Top Liked Captions
        </h3>
        <div className="space-y-3">
          {stats.topLikedCaptions.map((caption, i) => (
            <div
              key={caption.id}
              className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
            >
              <span className="text-xl font-bold text-gray-500 w-6">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-sm truncate">
                  &ldquo;{caption.content}&rdquo;
                </p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-pink-400">
                    ♥ {caption.like_count}
                  </span>
                  {caption.is_featured && (
                    <span className="text-xs text-amber-400">⭐ Featured</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {stats.topLikedCaptions.length === 0 && (
            <p className="text-gray-500 text-sm">No captions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-600/20 to-indigo-600/5 border-indigo-800/50 text-indigo-400",
    cyan: "from-cyan-600/20 to-cyan-600/5 border-cyan-800/50 text-cyan-400",
    emerald: "from-emerald-600/20 to-emerald-600/5 border-emerald-800/50 text-emerald-400",
    amber: "from-amber-600/20 to-amber-600/5 border-amber-800/50 text-amber-400",
    pink: "from-pink-600/20 to-pink-600/5 border-pink-800/50 text-pink-400",
    violet: "from-violet-600/20 to-violet-600/5 border-violet-800/50 text-violet-400",
    teal: "from-teal-600/20 to-teal-600/5 border-teal-800/50 text-teal-400",
    orange: "from-orange-600/20 to-orange-600/5 border-orange-800/50 text-orange-400",
  };
  const classes = colorMap[color] || colorMap.indigo;

  return (
    <div
      className={`bg-gradient-to-br ${classes} border rounded-lg p-4`}
    >
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
