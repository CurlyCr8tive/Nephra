import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths, subYears } from "date-fns";
import { useUser } from "@/contexts/UserContext";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { HealthMetrics } from "@shared/schema";

const FILTERS = ["1W", "1M", "3M", "6M", "1Y", "All"] as const;
type Filter = (typeof FILTERS)[number];

function getStartDate(filter: Filter): Date {
  const now = new Date();
  switch (filter) {
    case "1W": return subDays(now, 7);
    case "1M": return subMonths(now, 1);
    case "3M": return subMonths(now, 3);
    case "6M": return subMonths(now, 6);
    case "1Y": return subYears(now, 1);
    case "All": return subYears(now, 10);
  }
}

function filterLabel(filter: Filter): string {
  switch (filter) {
    case "1W": return "past week";
    case "1M": return "past month";
    case "3M": return "past 3 months";
    case "6M": return "past 6 months";
    case "1Y": return "past year";
    case "All": return "all time";
  }
}

export default function LogHistoryPage() {
  const { user } = useUser();
  const [filter, setFilter] = useState<Filter>("1M");

  // Hydration unit conversion
  const hydrationUnit: string = (user as any)?.preferredHydrationUnit ?? "liters";
  const toDisplayHydration = (liters: number): string => {
    if (hydrationUnit === "fl_oz") return `${(liters * 33.814).toFixed(0)} fl oz`;
    if (hydrationUnit === "cups") return `${(liters * 4.22675).toFixed(1)} cups`;
    return `${liters.toFixed(1)} L`;
  };

  const { data: metrics = [], isLoading } = useQuery<HealthMetrics[]>({
    queryKey: ["health-metrics", user?.id, "log-history", filter],
    queryFn: async () => {
      if (!user?.id) return [];
      const start = getStartDate(filter);
      const end = new Date();
      const res = await fetch(
        `/api/health-metrics/${user.id}/range?start=${start.toISOString()}&end=${end.toISOString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<HealthMetrics[]>;
    },
    enabled: !!user?.id,
  });

  const sorted = [...metrics].sort(
    (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
  );

  // Group by calendar day for display
  const grouped = sorted.reduce<Record<string, HealthMetrics[]>>((acc, m) => {
    const key = m.date ? format(new Date(m.date), "yyyy-MM-dd") : "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const groupedDays = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header title="Log History" />

      <main className="flex-grow pt-20 pb-20">
        <div className="px-4 py-4">
          {/* Filter bar */}
          <div className="flex gap-1.5 mb-5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  filter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Summary line */}
          {!isLoading && (
            <p className="text-xs text-muted-foreground mb-4">
              {sorted.length} {sorted.length === 1 ? "entry" : "entries"} for the {filterLabel(filter)}
            </p>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : groupedDays.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-base font-medium">No entries for this period</p>
              <p className="text-sm mt-1">Try selecting a longer time range or log your first reading.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedDays.map(([day, entries]) => {
                const dayDate = new Date(day + "T12:00:00");
                return (
                  <div key={day}>
                    {/* Day header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        {format(dayDate, "EEEE, MMMM d, yyyy")}
                      </span>
                      {entries.length > 1 && (
                        <span className="text-xs bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">
                          {entries.length} readings
                        </span>
                      )}
                    </div>

                    {/* Entries for this day */}
                    <div className="space-y-2">
                      {entries.map((m) => (
                        <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 text-sm">
                          <p className="text-xs font-medium text-primary mb-2">
                            {m.date ? format(new Date(m.date), "h:mm a") : "—"}
                          </p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                            {m.systolicBP != null && m.diastolicBP != null && (
                              <span>
                                <span className="text-muted-foreground">BP: </span>
                                {m.systolicBP}/{m.diastolicBP} mmHg
                              </span>
                            )}
                            {m.pulse != null && (
                              <span>
                                <span className="text-muted-foreground">Pulse: </span>
                                {m.pulse} bpm
                              </span>
                            )}
                            {m.hydration != null && (
                              <span>
                                <span className="text-muted-foreground">Hydration: </span>
                                {toDisplayHydration(Number(m.hydration))}
                              </span>
                            )}
                            {m.estimatedGFR != null && (
                              <span>
                                <span className="text-muted-foreground">eGFR: </span>
                                {Math.round(Number(m.estimatedGFR))} mL/min
                              </span>
                            )}
                            {m.painLevel != null && (
                              <span>
                                <span className="text-muted-foreground">Pain: </span>
                                {m.painLevel}/10
                              </span>
                            )}
                            {m.stressLevel != null && (
                              <span>
                                <span className="text-muted-foreground">Stress: </span>
                                {m.stressLevel}/10
                              </span>
                            )}
                            {m.fatigueLevel != null && (
                              <span>
                                <span className="text-muted-foreground">Fatigue: </span>
                                {m.fatigueLevel}/10
                              </span>
                            )}
                            {m.kslsScore != null && (
                              <span>
                                <span className="text-muted-foreground">KSLS: </span>
                                {Math.round(Number(m.kslsScore))}/100
                                {(m as any).kslsBand && ` (${(m as any).kslsBand})`}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
