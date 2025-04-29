import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import Chart from "chart.js/auto";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { HealthMetrics } from "@shared/schema";

export default function HealthTrends() {
  // Use authenticated user's data only without fallbacks
  const { user } = useUser();
  const userId = user?.id;
  
  // Log user info to help with debugging
  useEffect(() => {
    if (user) {
      console.log("HealthTrends - Authenticated as:", user.username, "ID:", user.id);
    } else {
      console.log("HealthTrends - No user authenticated");
    }
  }, [user]);
  
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("7d");
  
  // Initialize tabs
  const [activeTab, setActiveTab] = useState<"hydration" | "bp" | "gfr" | "pain" | "stress" | "fatigue">("hydration");
  
  // Chart references
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Get health data - useHealthData now gets userId from context automatically
  const { weeklyMetrics = [], isLoadingWeekly = false } = useHealthData();

  // Format data based on date range
  const getDateRangeData = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      return {
        labels: [],
        data: []
      };
    }
    
    const today = new Date();
    let startDate;
    
    if (dateRange === "7d") {
      startDate = subDays(today, 7);
    } else if (dateRange === "30d") {
      startDate = subDays(today, 30);
    } else {
      startDate = subDays(today, 90);
    }
    
    // Filter data within date range
    const filteredData = weeklyMetrics.filter(
      (metric: HealthMetrics) => {
        if (!metric.date) return false;
        const metricDate = new Date(metric.date);
        return metricDate >= startDate && metricDate <= today;
      }
    );
    
    // Sort by date
    const sortedData = filteredData.sort(
      (a: HealthMetrics, b: HealthMetrics) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    );
    
    // Extract labels (dates) and data points
    const labels = sortedData.map(
      (metric: HealthMetrics) => {
        if (!metric.date) return "";
        return format(new Date(metric.date), dateRange === "7d" ? "EEE" : "MM/dd");
      }
    );
    
    let dataPoints: number[];
    switch (activeTab) {
      case "hydration":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.hydration || 0);
        break;
      case "bp":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.systolicBP || 0);
        break;
      case "gfr":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.estimatedGFR || 0);
        break;
      case "pain":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.painLevel || 0);
        break;
      case "stress":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.stressLevel || 0);
        break;
      case "fatigue":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.fatigueLevel || 0);
        break;
      default:
        dataPoints = [];
    }
    
    return {
      labels,
      data: dataPoints
    };
  };

  // Update chart when data changes
  useEffect(() => {
    if (chartRef.current && !isLoadingWeekly) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      const { labels, data } = getDateRangeData();

      const colors = {
        hydration: {
          border: "rgba(25, 118, 210, 1)",
          background: "rgba(25, 118, 210, 0.2)",
        },
        bp: {
          border: "rgba(236, 64, 122, 1)",
          background: "rgba(236, 64, 122, 0.2)",
        },
        gfr: {
          border: "rgba(255, 152, 0, 1)",
          background: "rgba(255, 152, 0, 0.2)",
        },
        pain: {
          border: "rgba(244, 67, 54, 1)",
          background: "rgba(244, 67, 54, 0.2)",
        },
        stress: {
          border: "rgba(156, 39, 176, 1)",
          background: "rgba(156, 39, 176, 0.2)",
        },
        fatigue: {
          border: "rgba(76, 175, 80, 1)",
          background: "rgba(76, 175, 80, 0.2)",
        },
      };

      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: getDatasetLabel(),
            data,
            backgroundColor: colors[activeTab].background,
            borderColor: colors[activeTab].border,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: colors[activeTab].border,
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              titleFont: {
                size: 14
              },
              bodyFont: {
                size: 14
              },
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: getMaxYValue(),
              ticks: {
                stepSize: getStepSize(),
                font: {
                  size: 12
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    }
  }, [weeklyMetrics, activeTab, dateRange, isLoadingWeekly]);

  const getDatasetLabel = () => {
    switch (activeTab) {
      case "hydration":
        return "Water Intake (L)";
      case "bp":
        return "Systolic BP (mmHg)";
      case "gfr":
        return "Estimated GFR";
      case "pain":
        return "Pain Level (1-10)";
      case "stress":
        return "Stress Level (1-10)";
      case "fatigue":
        return "Fatigue Level (1-10)";
      default:
        return "";
    }
  };

  const getMaxYValue = () => {
    switch (activeTab) {
      case "hydration":
        return 3;
      case "bp":
        return 200;
      case "gfr":
        return 120;
      case "pain":
      case "stress":
      case "fatigue":
        return 10;
      default:
        return 100;
    }
  };

  const getStepSize = () => {
    switch (activeTab) {
      case "hydration":
        return 0.5;
      case "bp":
        return 20;
      case "gfr":
        return 15;
      case "pain":
      case "stress":
      case "fatigue":
        return 1;
      default:
        return 10;
    }
  };

  const calculateAverage = () => {
    const { data } = getDateRangeData();
    
    if (!data || data.length === 0) {
      return "No data";
    }
    
    const sum = data.reduce((acc: number, val: number) => acc + val, 0);
    const avg = sum / data.length;
    
    switch (activeTab) {
      case "hydration":
        return `${avg.toFixed(1)}L / day`;
      case "bp":
        return `${Math.round(avg)}`;
      case "gfr":
        return `${Math.round(avg)}`;
      case "pain":
      case "stress":
      case "fatigue":
        return `${avg.toFixed(1)}/10`;
      default:
        return `${avg.toFixed(1)}`;
    }
  };

  const getTrend = () => {
    const { data } = getDateRangeData();
    
    if (!data || data.length < 2) {
      return { text: "N/A", color: "text-neutral-500" };
    }
    
    // Calculate simple trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((acc: number, val: number) => acc + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc: number, val: number) => acc + val, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    // Different trends have different meanings based on the metric
    if (Math.abs(difference) < 0.1 * firstAvg) {
      return { text: "Stable", color: "text-neutral-500" };
    }
    
    if (activeTab === "hydration" || activeTab === "gfr") {
      // Higher is better for hydration and GFR
      return difference > 0 
        ? { text: "Improving", color: "text-success" }
        : { text: "Declining", color: "text-error" };
    } else {
      // Lower is better for BP, pain, stress, and fatigue
      return difference < 0 
        ? { text: "Improving", color: "text-success" }
        : { text: "Worsening", color: "text-error" };
    }
  };

  const trend = getTrend();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Health Trends" />
      
      <main className="flex-grow pt-20 pb-20">
        <div className="px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-lg">Health Analytics</h2>
              
              <div className="flex rounded-lg overflow-hidden border border-neutral-200">
                <button 
                  className={`text-xs px-3 py-1.5 ${dateRange === "7d" ? "bg-primary text-white" : "bg-white text-neutral-600"}`}
                  onClick={() => setDateRange("7d")}
                >
                  7D
                </button>
                <button 
                  className={`text-xs px-3 py-1.5 ${dateRange === "30d" ? "bg-primary text-white" : "bg-white text-neutral-600"}`}
                  onClick={() => setDateRange("30d")}
                >
                  30D
                </button>
                <button 
                  className={`text-xs px-3 py-1.5 ${dateRange === "90d" ? "bg-primary text-white" : "bg-white text-neutral-600"}`}
                  onClick={() => setDateRange("90d")}
                >
                  90D
                </button>
              </div>
            </div>
            
            <Tabs defaultValue="hydration" onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="hydration" className="flex-1">Hydration</TabsTrigger>
                <TabsTrigger value="bp" className="flex-1">BP</TabsTrigger>
                <TabsTrigger value="gfr" className="flex-1">GFR</TabsTrigger>
                <TabsTrigger value="pain" className="flex-1">Pain</TabsTrigger>
                <TabsTrigger value="stress" className="flex-1">Stress</TabsTrigger>
                <TabsTrigger value="fatigue" className="flex-1">Fatigue</TabsTrigger>
              </TabsList>
              
              <div className="chart-container mb-4" style={{ height: '300px' }}>
                {isLoadingWeekly ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <canvas ref={chartRef} id="healthDetailChart"></canvas>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-neutral-100 rounded-lg p-4">
                  <p className="text-xs text-neutral-500 mb-1">Average</p>
                  <p className="font-bold text-lg">{calculateAverage()}</p>
                </div>
                <div className="bg-neutral-100 rounded-lg p-4">
                  <p className="text-xs text-neutral-500 mb-1">Trend</p>
                  <p className={`font-bold text-lg ${trend.color}`}>{trend.text}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-sm mb-2">Insights</h3>
                <div className="bg-neutral-100 rounded-lg p-4">
                  <p className="text-sm text-neutral-600">
                    {activeTab === "hydration" && "Maintaining proper hydration is crucial for kidney health. Aim for a consistent daily water intake."}
                    {activeTab === "bp" && "Keeping your blood pressure under control helps protect your kidneys from further damage."}
                    {activeTab === "gfr" && "Your GFR (Glomerular Filtration Rate) is an important indicator of kidney function. Monitor changes over time."}
                    {activeTab === "pain" && "Tracking pain levels can help your healthcare provider adjust your treatment plan."}
                    {activeTab === "stress" && "Reducing stress may help improve your overall health and potentially your kidney function."}
                    {activeTab === "fatigue" && "Monitoring fatigue levels is important for kidney patients. Rest when needed and discuss persistent fatigue with your healthcare provider."}
                  </p>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
