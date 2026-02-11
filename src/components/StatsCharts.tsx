"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#818cf8", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"];

export default function StatsCharts({
  activityTimeline,
  topCaptioners,
  moderationData,
  engagementData,
}: {
  activityTimeline: { date: string; count: number }[];
  topCaptioners: { id: string; count: number }[];
  moderationData: { name: string; value: number }[];
  engagementData: { name: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Activity Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          📈 Caption Activity (Last 14 Days)
        </h3>
        {activityTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={activityTimeline}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#818cf8"
                fill="url(#colorCount)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity data.</p>
        )}
      </div>

      {/* Top Captioners */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          🎯 Top Captioners
        </h3>
        {topCaptioners.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topCaptioners} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="id"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {topCaptioners.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm">No captioner data.</p>
        )}
      </div>

      {/* Engagement Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          💡 Engagement Breakdown
        </h3>
        {engagementData.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {engagementData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Legend
                wrapperStyle={{ color: "#9ca3af", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm">No engagement data yet.</p>
        )}
      </div>

      {/* Moderation Overview */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          🛡️ Content Health
        </h3>
        {moderationData.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={moderationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {moderationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.name.startsWith("Reported")
                        ? "#f87171"
                        : "#34d399"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm">No moderation data yet.</p>
        )}
      </div>
    </div>
  );
}
