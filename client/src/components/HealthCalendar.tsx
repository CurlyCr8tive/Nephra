import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import {
  format,
  isToday,
  isAfter,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Heart,
  Activity,
  Wind,
  Battery,
  Stethoscope,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { HealthMetrics } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Appointment {
  id: number;
  title: string;
  appointmentType: string;
  doctorName?: string | null;
  location?: string | null;
  appointmentDate: string;
  duration?: number | null;
  notes?: string | null;
  isCompleted?: boolean;
}

interface HealthCalendarProps {
  healthData: HealthMetrics[];
  userId?: number | null;
}

export function HealthCalendar({ healthData, userId = null }: HealthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");

  // Fetch appointments for the user
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/medical-appointments/${userId}`],
    enabled: !!userId,
  });

  // Get all health entries for a specific date (multiple readings per day)
  const getAllHealthDataForDate = (date: Date): HealthMetrics[] => {
    if (!date || !healthData || !Array.isArray(healthData)) return [];
    return healthData.filter((entry) => {
      if (!entry?.date) return false;
      return isSameDay(new Date(entry.date), date);
    });
  };

  // Get the first health entry for a date (used for calendar indicators)
  const getHealthDataForDate = (date: Date): HealthMetrics | undefined =>
    getAllHealthDataForDate(date)[0];

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    if (!appointments?.length) return [];
    return appointments.filter((apt) => {
      if (!apt.appointmentDate) return false;
      return isSameDay(new Date(apt.appointmentDate), date);
    });
  };

  // When clicking a day: select it and switch to day detail view
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setViewMode("day");
  };

  // Navigate months — also update DayPicker via the month prop
  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  // Helper: add days
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (viewMode === "week") {
      const start = startOfWeek(selectedDate);
      const end = endOfWeek(selectedDate);
      return healthData.filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return !isAfter(start, d) && !isAfter(d, end);
      });
    }
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return healthData.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return !isAfter(start, d) && !isAfter(d, end);
    });
  };

  const formatWeeklyChartData = () => {
    const start = startOfWeek(selectedDate);
    const end = endOfWeek(selectedDate);
    const data = [];
    let cur = start;
    while (!isAfter(cur, end)) {
      const day = getHealthDataForDate(cur);
      data.push({
        date: format(cur, "EEE M/d"),
        hydration: day?.hydration || 0,
        painLevel: day?.painLevel || 0,
        stressLevel: day?.stressLevel || 0,
        fatigueLevel: day?.fatigueLevel || 0,
        systolicBP: day?.systolicBP || 0,
        diastolicBP: day?.diastolicBP || 0,
      });
      cur = addDays(cur, 1);
    }
    return data;
  };

  const formatMonthlyChartData = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const weeks: any[] = [];
    let weekStart = startOfWeek(start);
    while (!isAfter(weekStart, end)) {
      const weekEnd = endOfWeek(weekStart);
      const weekData = healthData.filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return !isAfter(weekStart, d) && !isAfter(d, weekEnd);
      });
      const count = weekData.length;
      const sum = (key: keyof HealthMetrics) =>
        weekData.reduce((s, e) => s + ((e[key] as number) || 0), 0);
      weeks.push({
        week: `Week ${weeks.length + 1}`,
        hydration: count ? +(sum("hydration") / count).toFixed(1) : 0,
        painLevel: count ? Math.round(sum("painLevel") / count) : 0,
        stressLevel: count ? Math.round(sum("stressLevel") / count) : 0,
        fatigueLevel: count ? Math.round(sum("fatigueLevel") / count) : 0,
        systolicBP: count ? Math.round(sum("systolicBP") / count) : 0,
        diastolicBP: count ? Math.round(sum("diastolicBP") / count) : 0,
      });
      weekStart = addDays(weekEnd, 1);
    }
    return weeks;
  };

  // Render a calendar day cell
  const renderDayCell = (day: Date) => {
    const dayReadings = getAllHealthDataForDate(day);
    const dayApts = getAppointmentsForDate(day);
    const hasData = dayReadings.length > 0;
    const hasApts = dayApts.length > 0;
    const isSelected = isSameDay(day, selectedDate);
    const todayDay = isToday(day);

    // Color tint based on most severe reading
    let bg = "";
    if (hasData) {
      const first = dayReadings[0];
      if (first.painLevel && first.painLevel > 7) bg = "bg-red-100";
      else if (first.stressLevel && first.stressLevel > 7) bg = "bg-orange-100";
      else if (first.fatigueLevel && first.fatigueLevel > 7) bg = "bg-yellow-100";
      else bg = "bg-primary/5";
    }

    return (
      <button
        type="button"
        onClick={() => handleDayClick(day)}
        className={`relative h-10 w-10 p-0 flex flex-col items-center justify-center rounded-full
          ${bg}
          ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
          ${todayDay ? "font-bold" : ""}
          cursor-pointer hover:bg-primary/20 transition-colors`}
      >
        <span className={`text-sm ${todayDay ? "text-primary" : ""}`}>
          {format(day, "d")}
        </span>
        {/* Indicator dots */}
        {(hasData || hasApts) && (
          <div className="flex gap-0.5 absolute bottom-0.5">
            {hasData && <span className="w-1 h-1 rounded-full bg-primary" />}
            {hasApts && <span className="w-1 h-1 rounded-full bg-amber-500" />}
          </div>
        )}
      </button>
    );
  };

  // Render day detail view (all readings + appointments)
  const renderDetailView = () => {
    const readings = getAllHealthDataForDate(selectedDate);
    const dayApts = getAppointmentsForDate(selectedDate);

    if (!readings.length && !dayApts.length) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarIcon className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="font-medium text-muted-foreground">
            No data for {format(selectedDate, "MMMM d")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Log health data or add an appointment to see it here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
            {isToday(selectedDate) && (
              <Badge className="ml-2 bg-primary text-xs">Today</Badge>
            )}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setViewMode("month")}
          >
            ← Month view
          </Button>
        </div>

        {/* Appointments */}
        {dayApts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Appointments ({dayApts.length})
            </p>
            {dayApts.map((apt) => (
              <div
                key={apt.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100"
              >
                <CalendarIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{apt.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(apt.appointmentDate), "h:mm a")}
                      {apt.duration ? ` · ${apt.duration} min` : ""}
                    </span>
                    {apt.doctorName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {apt.doctorName}
                      </span>
                    )}
                    {apt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {apt.location}
                      </span>
                    )}
                  </div>
                  {apt.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>
                  )}
                </div>
                {apt.isCompleted && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">Done</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Health readings */}
        {readings.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Health readings ({readings.length})
            </p>
            {readings.map((reading, idx) => (
              <div key={reading.id ?? idx} className="rounded-lg border p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {reading.date
                    ? format(new Date(reading.date), "h:mm a")
                    : `Reading ${idx + 1}`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {reading.hydration != null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50">
                      <Droplets className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Hydration</p>
                        <p className="font-semibold text-sm">{reading.hydration} L</p>
                      </div>
                    </div>
                  )}
                  {reading.systolicBP != null && reading.diastolicBP != null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-purple-50">
                      <Heart className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Blood Pressure</p>
                        <p className="font-semibold text-sm">
                          {reading.systolicBP}/{reading.diastolicBP}
                        </p>
                      </div>
                    </div>
                  )}
                  {reading.painLevel != null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-red-50">
                      <Activity className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pain</p>
                        <p className="font-semibold text-sm">{reading.painLevel}/10</p>
                      </div>
                    </div>
                  )}
                  {reading.stressLevel != null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50">
                      <Wind className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Stress</p>
                        <p className="font-semibold text-sm">{reading.stressLevel}/10</p>
                      </div>
                    </div>
                  )}
                  {reading.fatigueLevel != null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50">
                      <Battery className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fatigue</p>
                        <p className="font-semibold text-sm">{reading.fatigueLevel}/10</p>
                      </div>
                    </div>
                  )}
                  {reading.estimatedGFR != null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-green-50">
                      <Stethoscope className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">eGFR</p>
                        <p className="font-semibold text-sm">
                          {Math.round(reading.estimatedGFR)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render week/month chart summary
  const renderCharts = () => {
    const chartData =
      viewMode === "week" ? formatWeeklyChartData() : formatMonthlyChartData();

    if (!chartData.length) {
      return (
        <p className="text-center text-muted-foreground py-8 text-sm">
          No data available for this period
        </p>
      );
    }

    const xKey = viewMode === "week" ? "date" : "week";

    return (
      <Tabs defaultValue="pain" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pain">Pain/Stress/Fatigue</TabsTrigger>
          <TabsTrigger value="bp">Blood Pressure</TabsTrigger>
          <TabsTrigger value="hydration">Hydration</TabsTrigger>
        </TabsList>
        <TabsContent value="pain" className="pt-4">
          <h4 className="text-sm font-medium mb-2">Health Metrics (0-10 scale)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar dataKey="painLevel" name="Pain" fill="#ef4444" />
              <Bar dataKey="stressLevel" name="Stress" fill="#f97316" />
              <Bar dataKey="fatigueLevel" name="Fatigue" fill="#eab308" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        <TabsContent value="bp" className="pt-4">
          <h4 className="text-sm font-medium mb-2">Blood Pressure (mmHg)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 200]} />
              <Tooltip />
              <Line type="monotone" dataKey="systolicBP" name="Systolic" stroke="#8b5cf6" dot={false} />
              <Line type="monotone" dataKey="diastolicBP" name="Diastolic" stroke="#a855f7" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
        <TabsContent value="hydration" className="pt-4">
          <h4 className="text-sm font-medium mb-2">Hydration (Liters)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Bar dataKey="hydration" name="Hydration" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    );
  };

  const panelTitle =
    viewMode === "day"
      ? "Day Details"
      : viewMode === "week"
      ? "Weekly Summary"
      : "Monthly Summary";

  return (
    <div className="space-y-4">
      {/* View mode selector */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <h2 className="text-2xl font-bold">Health Calendar</h2>
        <div className="flex items-center gap-2">
          {(["day", "week", "month"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewMode(mode)}
              className={viewMode === mode ? "bg-primary text-primary-foreground" : ""}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>Click a day to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && handleDayClick(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disableNavigation
              components={{
                Day: ({ date }: { date: Date }) => renderDayCell(date),
              }}
            />
            {/* Legend */}
            <div className="flex justify-center mt-2 gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Health data
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Appointment
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-300" />
                High pain/stress
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Detail / Summary card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{panelTitle}</CardTitle>
            <CardDescription>
              {viewMode === "day"
                ? format(selectedDate, "EEEE, MMMM d, yyyy")
                : viewMode === "week"
                ? "Weekly health metrics summary"
                : "Monthly health metrics summary"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[500px]">
            {viewMode === "day" ? renderDetailView() : renderCharts()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HealthCalendar;
