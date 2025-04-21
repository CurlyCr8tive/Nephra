import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { Tab } from "@/components/ui/tabs";
import Chart from "chart.js/auto";

export function HealthTrendsCard() {
  const { user } = useUser();
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [activeTab, setActiveTab] = useState<"hydration" | "bp" | "gfr">("hydration");
  const { weeklyMetrics, isLoadingWeekly } = user ? useHealthData({ userId: user.id }) : { weeklyMetrics: [], isLoadingWeekly: false };

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

    // Extract dates from metrics and format them
    return weeklyMetrics.map(metric => 
      new Date(metric.date).toLocaleDateString('en-US', { weekday: 'short' })
    );
  };

  const getChartData = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      // Return mock data if no metrics exist
      return [1.5, 2.0, 1.8, 1.2, 2.2, 1.5, 2.0];
    }

    // Extract appropriate data based on active tab
    switch (activeTab) {
      case "hydration":
        return weeklyMetrics.map(metric => metric.hydration || 0);
      case "bp":
        return weeklyMetrics.map(metric => metric.systolicBP || 0);
      case "gfr":
        return weeklyMetrics.map(metric => metric.estimatedGFR || 0);
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
      case "gfr":
        return 120;
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
      switch (activeTab) {
        case "hydration":
          return "1.8L / day";
        case "bp":
          return "120/80";
        case "gfr":
          return "45";
        default:
          return "--";
      }
    }

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
        const total = weeklyMetrics.reduce((sum, metric) => sum + (metric.estimatedGFR || 0), 0);
        return `${Math.round(total / weeklyMetrics.length)}`;
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
