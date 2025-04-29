import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Chart from "chart.js/auto";
import { useHealthData } from "@/hooks/useHealthData";
import { useUser } from "@/contexts/UserContext";
import { DataMigrationButton } from "@/components/DataMigrationButton";

export function HealthTrendsCard() {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [activeTab, setActiveTab] = useState<"hydration" | "bp" | "gfr">("hydration");
  
  // Get the real user data from context
  const { user } = useUser();
  const userId = user?.id; // Get authenticated user ID, with no fallback
  
  // Log user info for debugging
  console.log("HealthTrendsCard authenticated user:", {
    id: userId,
    username: user?.username,
    firstName: user?.firstName
  });
  
  // Fetch real health data from the API - useHealthData internally uses the authenticated user ID
  const { 
    weeklyMetrics, 
    isLoadingWeekly 
  } = useHealthData();

  useEffect(() => {
    if (chartRef.current && weeklyMetrics && !isLoadingWeekly) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      const labels = getLabels();
      const data = getChartData();

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
  }, [weeklyMetrics, activeTab, isLoadingWeekly]);

  const getLabels = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      // Return default labels for the past week
      const labels = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }
      return labels;
    }

    // Extract dates from metrics and format them, handling null values
    return weeklyMetrics.map(metric => {
      if (!metric.date) return '';
      return new Date(metric.date).toLocaleDateString('en-US', { weekday: 'short' });
    });
  };

  const getChartData = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      console.log("No weekly metrics data available for chart");
      // Return empty array instead of mock data to better reflect real situation
      return [];
    }

    console.log("Weekly metrics data for charts:", weeklyMetrics);
    
    // Extract appropriate data based on active tab
    switch (activeTab) {
      case "hydration":
        return weeklyMetrics.map(metric => metric.hydration || 0);
      case "bp":
        return weeklyMetrics.map(metric => metric.systolicBP || 0);
      case "gfr":
        // Add logging to see the GFR values being extracted
        const gfrValues = weeklyMetrics.map(metric => {
          console.log(`GFR data point: ${metric.estimatedGFR}`);
          return metric.estimatedGFR || 0;
        });
        console.log("GFR values for chart:", gfrValues);
        return gfrValues;
      default:
        return [];
    }
  };

  const getDatasetLabel = () => {
    switch (activeTab) {
      case "hydration":
        return "Water Intake (L)";
      case "bp":
        return "Systolic BP (mmHg)";
      case "gfr":
        return "Estimated GFR";
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
      case "gfr": {
        // For GFR, dynamically calculate max based on actual data
        if (weeklyMetrics && weeklyMetrics.length > 0) {
          const maxGfr = Math.max(...weeklyMetrics.map(metric => metric.estimatedGFR || 0));
          console.log("Max GFR value:", maxGfr);
          
          // Add 10% padding above the max value for better visualization
          // For very low GFR values, ensure a minimum range
          if (maxGfr < 30) {
            return Math.max(maxGfr + 10, 40); // Show at least up to 40 for low values
          } else {
            return Math.max(maxGfr * 1.1, 120); // Cap at 120 for normal range
          }
        }
        return 120; // Default for empty data
      }
      default:
        return 100;
    }
  };

  const getStepSize = () => {
    switch (activeTab) {
      case "hydration":
        return 1;
      case "bp":
        return 40;
      case "gfr":
        return 30;
      default:
        return 10;
    }
  };

  const calculateAverage = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      console.log("No metrics for average calculation");
      return "--";
    }

    console.log("Calculating average for", activeTab, "with", weeklyMetrics.length, "entries");

    switch (activeTab) {
      case "hydration": {
        const total = weeklyMetrics.reduce((sum, metric) => sum + (metric.hydration || 0), 0);
        return `${(total / weeklyMetrics.length).toFixed(1)}L / day`;
      }
      case "bp": {
        const systolicTotal = weeklyMetrics.reduce((sum, metric) => sum + (metric.systolicBP || 0), 0);
        const diastolicTotal = weeklyMetrics.reduce((sum, metric) => sum + (metric.diastolicBP || 0), 0);
        const avgSystolic = Math.round(systolicTotal / weeklyMetrics.length);
        const avgDiastolic = Math.round(diastolicTotal / weeklyMetrics.length);
        return `${avgSystolic}/${avgDiastolic}`;
      }
      case "gfr": {
        // Log each GFR value to ensure we're accessing the correct property
        weeklyMetrics.forEach((metric, index) => {
          console.log(`GFR entry ${index}:`, metric.estimatedGFR);
        });
        
        const gfrValues = weeklyMetrics.map(metric => metric.estimatedGFR || 0);
        const total = gfrValues.reduce((sum, value) => sum + value, 0);
        const average = Math.round(total / gfrValues.length);
        
        console.log("GFR average calculation:", total, "÷", gfrValues.length, "=", average);
        return `${average}`;
      }
      default:
        return "--";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <h3 className="font-display font-semibold mb-4">Your Health Trends</h3>
      
      <div className="flex mb-4">
        <button 
          className={`flex-1 text-sm py-2 border-b-2 ${
            activeTab === "hydration" 
              ? "border-primary text-primary font-medium" 
              : "border-neutral-200 text-neutral-500"
          }`}
          onClick={() => setActiveTab("hydration")}
        >
          Hydration
        </button>
        <button 
          className={`flex-1 text-sm py-2 border-b-2 ${
            activeTab === "bp" 
              ? "border-primary text-primary font-medium" 
              : "border-neutral-200 text-neutral-500"
          }`}
          onClick={() => setActiveTab("bp")}
        >
          Blood Pressure
        </button>
        <button 
          className={`flex-1 text-sm py-2 border-b-2 ${
            activeTab === "gfr" 
              ? "border-primary text-primary font-medium" 
              : "border-neutral-200 text-neutral-500"
          }`}
          onClick={() => setActiveTab("gfr")}
        >
          GFR
        </button>
      </div>
      
      <div className="chart-container" style={{ height: '200px' }}>
        {isLoadingWeekly ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <canvas ref={chartRef} id="healthChart"></canvas>
        )}
      </div>
      
      <div className="flex justify-between text-xs text-neutral-500 mt-2">
        {getLabels().map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-neutral-600">Weekly average</p>
          <p className="font-bold text-lg">{calculateAverage()}</p>
          
          {/* Show GFR trend information when GFR tab is active */}
          {activeTab === "gfr" && weeklyMetrics && weeklyMetrics.length > 0 && weeklyMetrics[0].gfrTrend && (
            <div className="mt-2 text-sm flex flex-col gap-1">
              <p className={`font-medium 
                ${weeklyMetrics[0].gfrTrend === 'significant_improvement' || weeklyMetrics[0].gfrTrend === 'moderate_improvement' ? 'text-green-600' : 
                  weeklyMetrics[0].gfrTrend === 'stable' ? 'text-blue-600' : 
                  weeklyMetrics[0].gfrTrend === 'possible_decline' ? 'text-amber-600' : 
                  'text-red-600'}`}>
                {weeklyMetrics[0].gfrTrendDescription}
              </p>
              {weeklyMetrics[0].gfrChangePercent && (
                <p className="text-xs text-neutral-600">
                  {weeklyMetrics[0].gfrChangePercent > 0 ? '+' : ''}{weeklyMetrics[0].gfrChangePercent.toFixed(1)}% change
                  {weeklyMetrics[0].gfrAbsoluteChange && 
                    ` (${weeklyMetrics[0].gfrAbsoluteChange > 0 ? '+' : ''}${weeklyMetrics[0].gfrAbsoluteChange.toFixed(1)} points)`}
                </p>
              )}
              {weeklyMetrics[0].gfrLongTermTrend && (
                <p className="text-xs text-neutral-600">Long-term: {weeklyMetrics[0].gfrLongTermTrend}</p>
              )}
            </div>
          )}
          
          {/* Only show import data button when there are no metrics or not enough metrics for trending */}
          {(!weeklyMetrics || weeklyMetrics.length < 2) && userId && (
            <div className="mt-3">
              <DataMigrationButton 
                sourceUserId={1} 
                targetUserId={userId} 
                buttonText="Import Sample Health Data" 
                variant="outline"
                className="text-xs px-3 py-1"
              />
            </div>
          )}
        </div>
        <Link href="/trends">
          <Button variant="ghost" className="text-primary text-sm flex items-center">
            View details
            <span className="material-icons text-sm ml-1">arrow_forward</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default HealthTrendsCard;
