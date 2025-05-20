import { useState } from "react";
import { DayPicker, SelectSingleEventHandler } from "react-day-picker";
import { format, isToday, isAfter, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
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
  Calendar as CalendarIcon
} from "lucide-react";
import { HealthMetrics } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface HealthCalendarProps {
  healthData: HealthMetrics[];
  userId?: number | null;
}

export function HealthCalendar({ healthData, userId = null }: HealthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");
  
  // Log health data for debugging
  console.log("HealthCalendar rendering with:", {
    dataCount: healthData?.length || 0,
    userId: userId,
    selectedDate: selectedDate.toISOString().split('T')[0],
    viewMode
  });
  
  // Function to get health data for a specific date
  const getHealthDataForDate = (date: Date | null): HealthMetrics | undefined => {
    if (!date || !healthData || !Array.isArray(healthData)) {
      console.log("Missing date or invalid health data:", { date, healthDataType: typeof healthData });
      return undefined;
    }
    
    // Debug the incoming health data
    if (healthData.length > 0) {
      console.log(`Health data available for calendar (${healthData.length} entries)`);
    } else {
      console.log("Empty health data array provided to calendar");
    }
    
    return healthData.find(entry => {
      try {
        // Ensure we have a valid date by handling potential null/undefined
        if (!entry || !entry.date) return false;
        
        const entryDate = new Date(entry.date);
        const isSame = isSameDay(entryDate, date);
        
        // Log matches for debugging
        if (isSame) {
          console.log(`✅ Found health data match for ${date.toDateString()}`);
        }
        
        return isSame;
      } catch (error) {
        console.error("Error comparing dates:", error);
        return false;
      }
    });
  };
  
  // Function to prepare data for charts
  const prepareChartData = () => {
    if (viewMode === "day") {
      // Return data just for the selected day
      const data = getHealthDataForDate(selectedDate);
      return data ? [data] : [];
    } else if (viewMode === "week") {
      // Get start and end of the week for the selected date
      const start = startOfWeek(selectedDate);
      const end = endOfWeek(selectedDate);
      
      // Filter health data for the selected week
      return healthData.filter(entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        return !isAfter(start, entryDate) && !isAfter(entryDate, end);
      });
    } else {
      // Get start and end of the month for the current month
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      // Filter health data for the current month
      return healthData.filter(entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        return !isAfter(start, entryDate) && !isAfter(entryDate, end);
      });
    }
  };
  
  // Calculate health metric averages for charts
  const calculateAverages = () => {
    const data = prepareChartData();
    if (!data.length) return null;
    
    // Initialize totals
    const totals = {
      hydration: 0,
      systolicBP: 0,
      diastolicBP: 0,
      painLevel: 0,
      stressLevel: 0,
      fatigueLevel: 0,
      count: 0
    };
    
    // Sum up all values
    data.forEach(entry => {
      if (entry.hydration !== null && entry.hydration !== undefined) totals.hydration += entry.hydration;
      if (entry.systolicBP !== null && entry.systolicBP !== undefined) totals.systolicBP += entry.systolicBP;
      if (entry.diastolicBP !== null && entry.diastolicBP !== undefined) totals.diastolicBP += entry.diastolicBP;
      if (entry.painLevel !== null && entry.painLevel !== undefined) totals.painLevel += entry.painLevel;
      if (entry.stressLevel !== null && entry.stressLevel !== undefined) totals.stressLevel += entry.stressLevel;
      if (entry.fatigueLevel !== null && entry.fatigueLevel !== undefined) totals.fatigueLevel += entry.fatigueLevel;
      totals.count++;
    });
    
    // Calculate averages
    return {
      hydration: totals.count > 0 ? +(totals.hydration / totals.count).toFixed(1) : 0,
      systolicBP: totals.count > 0 ? Math.round(totals.systolicBP / totals.count) : 0,
      diastolicBP: totals.count > 0 ? Math.round(totals.diastolicBP / totals.count) : 0,
      painLevel: totals.count > 0 ? Math.round(totals.painLevel / totals.count) : 0,
      stressLevel: totals.count > 0 ? Math.round(totals.stressLevel / totals.count) : 0,
      fatigueLevel: totals.count > 0 ? Math.round(totals.fatigueLevel / totals.count) : 0
    };
  };
  
  // Navigate to previous month
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  // Navigate to next month
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // Format weekly data for charts
  const formatWeeklyChartData = () => {
    if (viewMode === "week") {
      const start = startOfWeek(selectedDate);
      const end = endOfWeek(selectedDate);
      
      const weeklyData = [];
      let currentDate = start;
      
      while (!isAfter(currentDate, end)) {
        const dayData = getHealthDataForDate(currentDate);
        weeklyData.push({
          date: format(currentDate, 'EEE'),
          hydration: dayData?.hydration || 0,
          painLevel: dayData?.painLevel || 0,
          stressLevel: dayData?.stressLevel || 0,
          fatigueLevel: dayData?.fatigueLevel || 0,
          systolicBP: dayData?.systolicBP || 0,
          diastolicBP: dayData?.diastolicBP || 0,
        });
        
        // Move to next day
        currentDate = addDays(currentDate, 1);
      }
      
      return weeklyData;
    }
    
    return [];
  };
  
  // Helper function to add days
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  // Format monthly data for charts - group by week
  const formatMonthlyChartData = () => {
    if (viewMode === "month") {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      // Create weekly buckets
      const weeks: any[] = [];
      let currentWeekStart = startOfWeek(start);
      
      while (!isAfter(currentWeekStart, end)) {
        const currentWeekEnd = endOfWeek(currentWeekStart);
        
        // Filter health data for this week
        const weekData = healthData.filter(entry => {
          if (!entry.date) return false;
          const entryDate = new Date(entry.date);
          return !isAfter(currentWeekStart, entryDate) && !isAfter(entryDate, currentWeekEnd);
        });
        
        // Calculate averages for the week
        const weekTotals = {
          hydration: 0,
          painLevel: 0,
          stressLevel: 0,
          fatigueLevel: 0,
          systolicBP: 0,
          diastolicBP: 0,
          count: weekData.length
        };
        
        weekData.forEach(entry => {
          if (entry.hydration !== null && entry.hydration !== undefined) weekTotals.hydration += entry.hydration;
          if (entry.painLevel !== null && entry.painLevel !== undefined) weekTotals.painLevel += entry.painLevel;
          if (entry.stressLevel !== null && entry.stressLevel !== undefined) weekTotals.stressLevel += entry.stressLevel;
          if (entry.fatigueLevel !== null && entry.fatigueLevel !== undefined) weekTotals.fatigueLevel += entry.fatigueLevel;
          if (entry.systolicBP !== null && entry.systolicBP !== undefined) weekTotals.systolicBP += entry.systolicBP;
          if (entry.diastolicBP !== null && entry.diastolicBP !== undefined) weekTotals.diastolicBP += entry.diastolicBP;
        });
        
        weeks.push({
          week: `Week ${weeks.length + 1}`,
          hydration: weekTotals.count > 0 ? +(weekTotals.hydration / weekTotals.count).toFixed(1) : 0,
          painLevel: weekTotals.count > 0 ? Math.round(weekTotals.painLevel / weekTotals.count) : 0,
          stressLevel: weekTotals.count > 0 ? Math.round(weekTotals.stressLevel / weekTotals.count) : 0,
          fatigueLevel: weekTotals.count > 0 ? Math.round(weekTotals.fatigueLevel / weekTotals.count) : 0,
          systolicBP: weekTotals.count > 0 ? Math.round(weekTotals.systolicBP / weekTotals.count) : 0,
          diastolicBP: weekTotals.count > 0 ? Math.round(weekTotals.diastolicBP / weekTotals.count) : 0,
        });
        
        // Move to next week
        currentWeekStart = addDays(currentWeekEnd, 1);
      }
      
      return weeks;
    }
    
    return [];
  };
  
  // Render calendar day cell
  const renderDayCell = (day: Date, modifiers: any) => {
    const dayData = getHealthDataForDate(day);
    
    // Set background colors based on health metrics
    let backgroundColor = "bg-background";
    let textColor = "text-foreground";
    
    if (dayData) {
      // Determine cell color based on highest severity
      if (dayData.painLevel && dayData.painLevel > 7) {
        backgroundColor = "bg-red-100";
        textColor = "text-red-800";
      } else if (dayData.stressLevel && dayData.stressLevel > 7) {
        backgroundColor = "bg-orange-100";
        textColor = "text-orange-800";
      } else if (dayData.fatigueLevel && dayData.fatigueLevel > 7) {
        backgroundColor = "bg-yellow-100";
        textColor = "text-yellow-800";
      } else if (dayData.hydration && dayData.hydration < 1) {
        backgroundColor = "bg-blue-100";
        textColor = "text-blue-800";
      }
    }
    
    // Add hover effect and cursor pointer for clickable appearance
    return (
      <button 
        type="button"
        onClick={() => setSelectedDate(day)}
        className={`h-12 w-12 p-0 flex flex-col items-center justify-center rounded-full ${backgroundColor} ${modifiers.selected ? "ring-2 ring-primary" : ""} cursor-pointer hover:bg-primary/20 transition-colors`}
      >
        <div className={`text-sm font-medium ${textColor}`}>
          {format(day, "d")}
        </div>
        {dayData && (
          <div className="flex mt-0.5 space-x-0.5">
            {dayData.hydration !== null && dayData.hydration !== undefined && (
              <div className="w-1 h-1 rounded-full bg-blue-500"></div>
            )}
            {dayData.painLevel !== null && dayData.painLevel !== undefined && (
              <div className="w-1 h-1 rounded-full bg-red-500"></div>
            )}
            {dayData.stressLevel !== null && dayData.stressLevel !== undefined && (
              <div className="w-1 h-1 rounded-full bg-orange-500"></div>
            )}
            {dayData.fatigueLevel !== null && dayData.fatigueLevel !== undefined && (
              <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
            )}
          </div>
        )}
      </button>
    );
  };
  
  // Render the detailed view for a selected date
  const renderDetailView = () => {
    const dayData = selectedDate ? getHealthDataForDate(selectedDate) : null;
    
    if (!selectedDate || !dayData) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            {selectedDate 
              ? "No health data recorded for this day" 
              : "Select a day to view details"}
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, "MMMM d, yyyy")}
            {isToday(selectedDate) && <Badge className="ml-2 bg-primary">Today</Badge>}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {dayData.hydration !== null && dayData.hydration !== undefined && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-blue-50">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Hydration</p>
                <p className="text-lg font-semibold">{dayData.hydration} L</p>
              </div>
            </div>
          )}
          
          {dayData.systolicBP !== null && dayData.systolicBP !== undefined && 
           dayData.diastolicBP !== null && dayData.diastolicBP !== undefined && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-purple-50">
              <Heart className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Blood Pressure</p>
                <p className="text-lg font-semibold">{dayData.systolicBP}/{dayData.diastolicBP}</p>
              </div>
            </div>
          )}
          
          {dayData.painLevel !== null && dayData.painLevel !== undefined && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-red-50">
              <Activity className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Pain Level</p>
                <p className="text-lg font-semibold">{dayData.painLevel}/10</p>
              </div>
            </div>
          )}
          
          {dayData.stressLevel !== null && dayData.stressLevel !== undefined && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-orange-50">
              <Wind className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Stress Level</p>
                <p className="text-lg font-semibold">{dayData.stressLevel}/10</p>
              </div>
            </div>
          )}
          
          {dayData.fatigueLevel !== null && dayData.fatigueLevel !== undefined && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-yellow-50">
              <Battery className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Fatigue Level</p>
                <p className="text-lg font-semibold">{dayData.fatigueLevel}/10</p>
              </div>
            </div>
          )}
          
          {dayData.estimatedGFR !== null && dayData.estimatedGFR !== undefined && (
            <div className="flex items-center space-x-2 p-2 rounded-md bg-green-50">
              <Stethoscope className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Est. GFR</p>
                <p className="text-lg font-semibold">{Math.round(dayData.estimatedGFR)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render the charts view
  const renderCharts = () => {
    const weeklyData = formatWeeklyChartData();
    const monthlyData = formatMonthlyChartData();
    const chartData = viewMode === "week" ? weeklyData : monthlyData;
    
    if (!chartData.length) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <p className="text-muted-foreground">No data available for this period</p>
        </div>
      );
    }
    
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
              <XAxis dataKey={viewMode === "week" ? "date" : "week"} />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar dataKey="painLevel" name="Pain" fill="#ef4444" />
              <Bar dataKey="stressLevel" name="Stress" fill="#f97316" />
              <Bar dataKey="fatigueLevel" name="Fatigue" fill="#eab308" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="bp" className="pt-4">
          <h4 className="text-sm font-medium mb-2">Blood Pressure (mm Hg)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viewMode === "week" ? "date" : "week"} />
              <YAxis domain={[0, 200]} />
              <Tooltip />
              <Line type="monotone" dataKey="systolicBP" name="Systolic" stroke="#8b5cf6" />
              <Line type="monotone" dataKey="diastolicBP" name="Diastolic" stroke="#a855f7" />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="hydration" className="pt-4">
          <h4 className="text-sm font-medium mb-2">Hydration (Liters)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viewMode === "week" ? "date" : "week"} />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Bar dataKey="hydration" name="Hydration" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    );
  };
  
  // Calculate summary data
  const averages = calculateAverages();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <h2 className="text-2xl font-bold">Health Calendar</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode("day")}
            className={viewMode === "day" ? "bg-primary text-primary-foreground" : ""}
          >
            Day
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode("week")}
            className={viewMode === "week" ? "bg-primary text-primary-foreground" : ""}
          >
            Week
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode("month")}
            className={viewMode === "month" ? "bg-primary text-primary-foreground" : ""}
          >
            Month
          </Button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex space-x-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Select a day to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              modifiers={{
                today: (day) => isToday(day),
                hasData: (day) => !!getHealthDataForDate(day)
              }}
              modifiersClassNames={{
                today: "bg-primary/10",
                hasData: "font-bold"
              }}
              components={{
                Day: ({ date, displayMonth, ...props }) => {
                  const day = date;
                  const modifiers = {
                    selected: isSameDay(day, selectedDate),
                    today: isToday(day)
                  };
                  return renderDayCell(day, modifiers);
                }
              }}
            />
            
            <div className="flex justify-center mt-2 text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Hydration</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Pain</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span>Stress</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>Fatigue</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {viewMode === "day" ? "Daily Details" : viewMode === "week" ? "Weekly Summary" : "Monthly Summary"}
            </CardTitle>
            <CardDescription>
              {viewMode === "day" 
                ? "View your health metrics for the selected day" 
                : viewMode === "week"
                  ? "Weekly health metrics summary"
                  : "Monthly health metrics summary"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === "day" ? renderDetailView() : renderCharts()}
            
            {/* Summary stats */}
            {(viewMode === "week" || viewMode === "month") && averages && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Summary</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Avg. Hydration</p>
                    <p className="text-lg font-semibold">{averages.hydration} L</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Avg. BP</p>
                    <p className="text-lg font-semibold">{averages.systolicBP}/{averages.diastolicBP}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Avg. Pain</p>
                    <p className="text-lg font-semibold">{averages.painLevel}/10</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Avg. Stress</p>
                    <p className="text-lg font-semibold">{averages.stressLevel}/10</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Avg. Fatigue</p>
                    <p className="text-lg font-semibold">{averages.fatigueLevel}/10</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}