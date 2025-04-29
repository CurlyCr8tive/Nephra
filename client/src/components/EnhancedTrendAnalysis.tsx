import { useState } from "react";
import { useHealthData } from "@/hooks/useHealthData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, TrendingDown, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

// Helper function to format date for display
const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper for getting color based on value
const getTrendColor = (trend: string | undefined) => {
  if (!trend) return "text-gray-500";
  
  switch (trend) {
    case "significant_improvement":
    case "possible_improvement":
      return "text-green-600";
    case "stable":
      return "text-blue-600";
    case "possible_decline":
      return "text-amber-600";
    case "significant_decline":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
};

// Helper for getting icon based on trend
const getTrendIcon = (trend: string | undefined) => {
  if (!trend) return <Activity className="h-4 w-4" />;
  
  switch (trend) {
    case "significant_improvement":
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case "possible_improvement":
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    case "stable":
      return <ArrowRightIcon className="h-4 w-4 text-blue-600" />;
    case "possible_decline":
      return <ArrowDownIcon className="h-4 w-4 text-amber-600" />;
    case "significant_decline":
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

export function EnhancedTrendAnalysis() {
  const { weeklyMetrics, isLoadingWeekly } = useHealthData();
  const [activeMetric, setActiveMetric] = useState<"gfr" | "bp" | "hydration" | "stress" | "pain" | "fatigue">("gfr");
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  
  // Early return for loading state
  if (isLoadingWeekly) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle>Enhanced Trend Analysis</CardTitle>
          <CardDescription>Loading your health trends...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Early return if no data
  if (!weeklyMetrics || weeklyMetrics.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle>Enhanced Trend Analysis</CardTitle>
          <CardDescription>Your health trends will appear here</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <p className="text-muted-foreground">No health data recorded yet</p>
          <p className="text-sm text-muted-foreground mt-2">Log your health metrics to see trend analysis</p>
        </CardContent>
      </Card>
    );
  }
  
  // Sort metrics by date (newest first)
  const sortedMetrics = [...weeklyMetrics].sort((a, b) => {
    const dateA = new Date(a.date || '');
    const dateB = new Date(b.date || '');
    return dateB.getTime() - dateA.getTime();
  });
  
  // Format data for recharts
  const chartData = sortedMetrics.slice().reverse().map(metric => ({
    date: formatDate(metric.date || new Date()),
    gfr: metric.estimatedGFR || 0,
    systolic: metric.systolicBP || 0,
    diastolic: metric.diastolicBP || 0,
    hydration: metric.hydration || 0,
    stress: metric.stressLevel || 0,
    pain: metric.painLevel || 0,
    fatigue: metric.fatigueLevel || 0,
  }));
  
  // Extract the latest metrics for the summary
  const latestMetric = sortedMetrics[0] || null;
  
  // Define GFR stages for reference lines and fill areas
  const gfrStages = [
    { value: 90, label: 'G1', color: '#4ade80' }, // Green
    { value: 60, label: 'G2', color: '#22d3ee' }, // Cyan
    { value: 45, label: 'G3a', color: '#facc15' }, // Yellow
    { value: 30, label: 'G3b', color: '#fb923c' }, // Orange
    { value: 15, label: 'G4', color: '#f87171' }, // Red
    { value: 0, label: 'G5', color: '#ef4444' }, // Dark Red
  ];
  
  // Calculate appropriate yAxis domain based on activeMetric
  const getYAxisDomain = () => {
    switch (activeMetric) {
      case 'gfr':
        return [0, Math.max(120, ...chartData.map(d => d.gfr * 1.1))];
      case 'bp':
        return [0, Math.max(200, ...chartData.map(d => d.systolic * 1.1))];
      case 'hydration':
        return [0, Math.max(3, ...chartData.map(d => d.hydration * 1.2))];
      case 'stress':
      case 'pain':
      case 'fatigue':
        return [0, 10];
      default:
        return [0, 100];
    }
  };
  
  // Get chart data based on active metric
  const getActiveMetricData = () => {
    switch (activeMetric) {
      case 'gfr':
        return {
          name: 'Estimated GFR',
          key: 'gfr',
          color: '#0ea5e9', // Blue
          unit: '',
          formatter: (value: number) => `${Math.round(value)}`
        };
      case 'bp':
        return {
          name: 'Blood Pressure',
          key: 'systolic',
          secondKey: 'diastolic',
          color: '#f43f5e', // Pink
          secondColor: '#fb7185', // Lighter pink
          unit: 'mmHg',
          formatter: (value: number) => `${Math.round(value)}`
        };
      case 'hydration':
        return {
          name: 'Hydration',
          key: 'hydration',
          color: '#0ea5e9', // Blue
          unit: 'L',
          formatter: (value: number) => value.toFixed(1)
        };
      case 'stress':
        return {
          name: 'Stress Level',
          key: 'stress',
          color: '#f97316', // Orange
          unit: '',
          formatter: (value: number) => `${Math.round(value)}/10`
        };
      case 'pain':
        return {
          name: 'Pain Level',
          key: 'pain',
          color: '#ef4444', // Red
          unit: '',
          formatter: (value: number) => `${Math.round(value)}/10`
        };
      case 'fatigue':
        return {
          name: 'Fatigue',
          key: 'fatigue',
          color: '#8b5cf6', // Purple
          unit: '',
          formatter: (value: number) => `${Math.round(value)}/10`
        };
      default:
        return {
          name: 'Value',
          key: 'value',
          color: '#a3a3a3', // Gray
          unit: '',
          formatter: (value: number) => `${value}`
        };
    }
  };
  
  // Get tooltip formatter based on active metric
  const getTooltipFormatter = (value: number, name: string) => {
    const activeData = getActiveMetricData();
    
    if (name === 'gfr') return [`${Math.round(value)}`, 'GFR'];
    if (name === 'systolic') return [`${Math.round(value)}`, 'Systolic BP'];
    if (name === 'diastolic') return [`${Math.round(value)}`, 'Diastolic BP'];
    if (name === 'hydration') return [`${value.toFixed(1)} L`, 'Hydration'];
    if (name === 'stress') return [`${Math.round(value)}/10`, 'Stress'];
    if (name === 'pain') return [`${Math.round(value)}/10`, 'Pain'];
    if (name === 'fatigue') return [`${Math.round(value)}/10`, 'Fatigue'];
    
    return [value, name];
  };
  
  // Trend description (if available)
  const trendDescription = latestMetric?.gfrTrendDescription || "Insufficient data for analysis";
  
  // Current value for the active metric
  const getCurrentValue = () => {
    if (!latestMetric) return "N/A";
    
    switch (activeMetric) {
      case "gfr":
        return Math.round(latestMetric.estimatedGFR || 0).toString();
      case "bp":
        return `${latestMetric.systolicBP || 0}/${latestMetric.diastolicBP || 0}`;
      case "hydration":
        return `${(latestMetric.hydration || 0).toFixed(1)} L`;
      case "stress":
        return `${latestMetric.stressLevel || 0}/10`;
      case "pain":
        return `${latestMetric.painLevel || 0}/10`;
      case "fatigue":
        return `${latestMetric.fatigueLevel || 0}/10`;
      default:
        return "N/A";
    }
  };
  
  // Get change percentage for active metric (if available)
  const getChangePercentage = () => {
    if (activeMetric !== "gfr" || !latestMetric?.gfrChangePercent) return null;
    return latestMetric.gfrChangePercent;
  };
  
  const changePercent = getChangePercentage();
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Enhanced Trend Analysis</CardTitle>
            <CardDescription>Track your health metrics over time</CardDescription>
          </div>
          <div className="flex space-x-1">
            <Button
              variant={timeRange === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("week")}
              className="text-xs h-8"
            >
              Week
            </Button>
            <Button
              variant={timeRange === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("month")}
              className="text-xs h-8"
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gfr" onValueChange={(v) => setActiveMetric(v as any)}>
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="gfr">GFR</TabsTrigger>
            <TabsTrigger value="bp">BP</TabsTrigger>
            <TabsTrigger value="hydration">Water</TabsTrigger>
            <TabsTrigger value="stress">Stress</TabsTrigger>
            <TabsTrigger value="pain">Pain</TabsTrigger>
            <TabsTrigger value="fatigue">Fatigue</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gfr" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current GFR</span>
                    <span className="text-2xl font-bold">{getCurrentValue()}</span>
                  </div>
                  
                  {latestMetric?.gfrTrend && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(latestMetric.gfrTrend)}
                      <span className={`text-sm font-medium ${getTrendColor(latestMetric.gfrTrend)}`}>
                        {changePercent !== null && (
                          <span>{changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}% </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm font-medium">Trend Analysis</span>
                  <p className={`text-sm ${getTrendColor(latestMetric?.gfrTrend || undefined)}`}>
                    {trendDescription || "GFR trend data not available"}
                  </p>
                  {latestMetric?.gfrLongTermTrend && latestMetric.gfrLongTermTrend !== "unknown" && (
                    <p className="text-xs text-muted-foreground">
                      Long-term: {latestMetric.gfrLongTermTrend === "improving" ? "Improving" : 
                                 latestMetric.gfrLongTermTrend === "declining" ? "Declining" : 
                                 latestMetric.gfrLongTermTrend === "fluctuating" ? "Fluctuating" : 
                                 latestMetric.gfrLongTermTrend === "consistent" ? "Consistent" : "Unknown"}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <defs>
                      {gfrStages.slice(0, -1).map((stage, index) => (
                        <linearGradient
                          key={stage.label}
                          id={`gfr-gradient-${stage.label}`}
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop offset="5%" stopColor={stage.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={stage.color} stopOpacity={0.1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={getYAxisDomain()} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={6}
                    />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    
                    {/* GFR Stage Reference Areas */}
                    <Area 
                      type="monotone" 
                      dataKey="gfr" 
                      stroke={getActiveMetricData().color} 
                      strokeWidth={2}
                      fill={`url(#gfr-gradient-${gfrStages.find(s => s.value <= (chartData[0]?.gfr || 90))?.label || 'G1'})`}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    
                    {/* GFR Stage Reference Lines */}
                    {gfrStages.slice(0, -1).map((stage) => (
                      <ReferenceLine 
                        key={stage.label}
                        y={stage.value} 
                        stroke={stage.color} 
                        strokeDasharray="3 3"
                        label={{ 
                          value: stage.label, 
                          position: 'right', 
                          fill: stage.color,
                          fontSize: 10
                        }} 
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {latestMetric?.estimatedGFR && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Stage Assessment</span>
                    <span>
                      {latestMetric.estimatedGFR >= 90 ? 'G1 - Normal' :
                       latestMetric.estimatedGFR >= 60 ? 'G2 - Mildly Decreased' :
                       latestMetric.estimatedGFR >= 45 ? 'G3a - Mild-Moderate' :
                       latestMetric.estimatedGFR >= 30 ? 'G3b - Moderate-Severe' :
                       latestMetric.estimatedGFR >= 15 ? 'G4 - Severely Decreased' :
                       'G5 - Kidney Failure'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, ((latestMetric.estimatedGFR || 0) / 90) * 100)} 
                    className={`h-2`}
                  />
                </div>
              )}
              
              {latestMetric?.gfrCalculationMethod && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Calculation method: {latestMetric.gfrCalculationMethod === 'creatinine-based' ? 
                    'Based on lab results (high confidence)' : 
                    'Based on symptoms and vitals (moderate confidence)'}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="bp" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Current BP</span>
                    <div className="text-2xl font-bold">
                      {latestMetric ? `${latestMetric.systolicBP || 0}/${latestMetric.diastolicBP || 0}` : "N/A"}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Assessment</span>
                  <p className="text-sm">
                    {!latestMetric ? "No data available" :
                     latestMetric.systolicBP! >= 180 || latestMetric.diastolicBP! >= 120 ? 
                     "Hypertensive Crisis" :
                     latestMetric.systolicBP! >= 140 || latestMetric.diastolicBP! >= 90 ? 
                     "High Blood Pressure (Stage 2)" :
                     latestMetric.systolicBP! >= 130 || latestMetric.diastolicBP! >= 80 ? 
                     "High Blood Pressure (Stage 1)" :
                     latestMetric.systolicBP! >= 120 && latestMetric.diastolicBP! < 80 ? 
                     "Elevated" : "Normal"}
                  </p>
                </div>
              </div>
              
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={[0, 200]} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={5}
                    />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="systolic" 
                      name="Systolic" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="diastolic" 
                      name="Diastolic" 
                      stroke="#fb7185" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <ReferenceLine y={120} stroke="#7f1d1d" strokeDasharray="3 3" />
                    <ReferenceLine y={90} stroke="#7f1d1d" strokeDasharray="3 3" />
                    <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine y={180} stroke="#7f1d1d" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {latestMetric?.systolicBP && latestMetric.diastolicBP && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Blood Pressure Category</span>
                  </div>
                  <Progress 
                    value={
                      latestMetric.systolicBP >= 180 || latestMetric.diastolicBP >= 120 ? 100 :
                      latestMetric.systolicBP >= 140 || latestMetric.diastolicBP >= 90 ? 80 :
                      latestMetric.systolicBP >= 130 || latestMetric.diastolicBP >= 80 ? 60 :
                      latestMetric.systolicBP >= 120 && latestMetric.diastolicBP < 80 ? 40 : 20
                    } 
                    className={`h-2 ${
                      latestMetric.systolicBP >= 180 || latestMetric.diastolicBP >= 120 ? 'bg-red-700' :
                      latestMetric.systolicBP >= 140 || latestMetric.diastolicBP >= 90 ? 'bg-red-500' :
                      latestMetric.systolicBP >= 130 || latestMetric.diastolicBP >= 80 ? 'bg-orange-500' :
                      latestMetric.systolicBP >= 120 && latestMetric.diastolicBP < 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Normal</span>
                    <span>Elevated</span>
                    <span>Stage 1</span>
                    <span>Stage 2</span>
                    <span>Crisis</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="hydration" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Water Intake</span>
                    <div className="text-2xl font-bold">
                      {latestMetric ? `${latestMetric.hydration?.toFixed(1) || '0.0'} L` : "N/A"}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Assessment</span>
                  <p className="text-sm">
                    {!latestMetric ? "No data available" :
                     latestMetric.hydration! >= 2.5 ? "Excellent hydration" :
                     latestMetric.hydration! >= 2.0 ? "Good hydration" :
                     latestMetric.hydration! >= 1.5 ? "Adequate hydration" :
                     latestMetric.hydration! >= 1.0 ? "Moderate hydration" :
                     "Low hydration"}
                  </p>
                </div>
              </div>
              
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="hydrationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={[0, Math.max(3, ...chartData.map(d => d.hydration * 1.2))]} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={6}
                    />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="hydration" 
                      name="Hydration" 
                      stroke="#0ea5e9" 
                      fill="url(#hydrationGradient)"
                      strokeWidth={2}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <ReferenceLine y={2.5} stroke="#0c4a6e" strokeDasharray="3 3" label={{ value: "Target", position: 'right', fill: "#0c4a6e", fontSize: 10 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {latestMetric?.hydration && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Daily Water Intake</span>
                    <span>
                      {latestMetric.hydration >= 2.5 ? 'Excellent' :
                       latestMetric.hydration >= 2.0 ? 'Good' :
                       latestMetric.hydration >= 1.5 ? 'Adequate' :
                       latestMetric.hydration >= 1.0 ? 'Moderate' :
                       'Low'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, (latestMetric.hydration / 2.5) * 100)} 
                    className={`h-2 ${
                      latestMetric.hydration >= 2.5 ? 'bg-blue-700' :
                      latestMetric.hydration >= 2.0 ? 'bg-blue-500' :
                      latestMetric.hydration >= 1.5 ? 'bg-blue-400' :
                      latestMetric.hydration >= 1.0 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Stress tab content */}
          <TabsContent value="stress" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Stress Level</span>
                    <div className="text-2xl font-bold">
                      {latestMetric ? `${latestMetric.stressLevel || 0}/10` : "N/A"}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Assessment</span>
                  <p className="text-sm">
                    {!latestMetric ? "No data available" :
                     latestMetric.stressLevel! >= 8 ? "Very high stress" :
                     latestMetric.stressLevel! >= 6 ? "High stress" :
                     latestMetric.stressLevel! >= 4 ? "Moderate stress" :
                     latestMetric.stressLevel! >= 2 ? "Low stress" :
                     "Minimal stress"}
                  </p>
                </div>
              </div>
              
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={6}
                    />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stress" 
                      name="Stress" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <ReferenceLine y={6} stroke="#9a3412" strokeDasharray="3 3" label={{ value: "High", position: 'right', fill: "#9a3412", fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {latestMetric?.stressLevel !== undefined && (
                <div className="space-y-1">
                  <Progress 
                    value={(latestMetric.stressLevel! / 10) * 100} 
                    className={`h-2 ${
                      latestMetric.stressLevel! >= 8 ? 'bg-red-600' :
                      latestMetric.stressLevel! >= 6 ? 'bg-orange-500' :
                      latestMetric.stressLevel! >= 4 ? 'bg-yellow-500' :
                      latestMetric.stressLevel! >= 2 ? 'bg-yellow-400' :
                      'bg-green-500'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Minimal</span>
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                    <span>Very High</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Pain tab content */}
          <TabsContent value="pain" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Pain Level</span>
                    <div className="text-2xl font-bold">
                      {latestMetric ? `${latestMetric.painLevel || 0}/10` : "N/A"}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Assessment</span>
                  <p className="text-sm">
                    {!latestMetric ? "No data available" :
                     latestMetric.painLevel! >= 8 ? "Severe pain" :
                     latestMetric.painLevel! >= 6 ? "Moderate-severe pain" :
                     latestMetric.painLevel! >= 4 ? "Moderate pain" :
                     latestMetric.painLevel! >= 2 ? "Mild pain" :
                     "Minimal pain"}
                  </p>
                </div>
              </div>
              
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={6}
                    />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pain" 
                      name="Pain" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <ReferenceLine y={6} stroke="#991b1b" strokeDasharray="3 3" label={{ value: "Severe", position: 'right', fill: "#991b1b", fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {latestMetric?.painLevel !== undefined && (
                <div className="space-y-1">
                  <Progress 
                    value={(latestMetric.painLevel! / 10) * 100} 
                    className={`h-2 ${
                      latestMetric.painLevel! >= 8 ? 'bg-red-700' :
                      latestMetric.painLevel! >= 6 ? 'bg-red-500' :
                      latestMetric.painLevel! >= 4 ? 'bg-orange-500' :
                      latestMetric.painLevel! >= 2 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>None</span>
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Worst</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Fatigue tab content */}
          <TabsContent value="fatigue" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Fatigue Level</span>
                    <div className="text-2xl font-bold">
                      {latestMetric ? `${latestMetric.fatigueLevel || 0}/10` : "N/A"}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Assessment</span>
                  <p className="text-sm">
                    {!latestMetric ? "No data available" :
                     latestMetric.fatigueLevel! >= 8 ? "Severe fatigue" :
                     latestMetric.fatigueLevel! >= 6 ? "Significant fatigue" :
                     latestMetric.fatigueLevel! >= 4 ? "Moderate fatigue" :
                     latestMetric.fatigueLevel! >= 2 ? "Mild fatigue" :
                     "Minimal fatigue"}
                  </p>
                </div>
              </div>
              
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={6}
                    />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="fatigue" 
                      name="Fatigue" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <ReferenceLine y={6} stroke="#6d28d9" strokeDasharray="3 3" label={{ value: "High", position: 'right', fill: "#6d28d9", fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {latestMetric?.fatigueLevel !== undefined && (
                <div className="space-y-1">
                  <Progress 
                    value={(latestMetric.fatigueLevel! / 10) * 100} 
                    className={`h-2 ${
                      latestMetric.fatigueLevel! >= 8 ? 'bg-purple-800' :
                      latestMetric.fatigueLevel! >= 6 ? 'bg-purple-600' :
                      latestMetric.fatigueLevel! >= 4 ? 'bg-purple-500' :
                      latestMetric.fatigueLevel! >= 2 ? 'bg-purple-400' :
                      'bg-green-500'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>None</span>
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>High</span>
                    <span>Severe</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}