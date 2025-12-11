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
      const { data: chartData, diastolicData } = getChartDataWithDiastolic();

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
            data: chartData,
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
              cornerRadius: 6,
              callbacks: {
                label: function(context) {
                  if (activeTab === "bp" && diastolicData && diastolicData.length > 0) {
                    const systolic = context.parsed.y;
                    const diastolic = diastolicData[context.dataIndex];
                    return `Systolic BP (mmHg): ${systolic}/${diastolic}`;
                  }
                  return context.dataset.label + ": " + context.parsed.y;
                }
              }
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

  // Helper function to aggregate multiple readings per day
  const aggregateByDay = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      return { labels: [], data: [] };
    }

    // Group metrics by day
    const dailyGroups = new Map<string, typeof weeklyMetrics>();
    
    weeklyMetrics.forEach(metric => {
      if (!metric.date) return;
      
      // Use date string (YYYY-MM-DD) as key to group by day
      const dateKey = new Date(metric.date).toISOString().split('T')[0];
      
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(metric);
    });

    // Sort by date (oldest to newest)
    const sortedDays = Array.from(dailyGroups.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );

    // Generate labels and aggregated data
    const labels = sortedDays.map(([dateKey]) => {
      const date = new Date(dateKey);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    const data = sortedDays.map(([, dayMetrics]) => {
      switch (activeTab) {
        case "hydration":
          // Sum all hydration entries for the day (cumulative intake)
          return dayMetrics.reduce((sum, m) => sum + (m.hydration || 0), 0);
          
        case "bp":
          // Average systolic BP for multiple readings per day
          const systolicSum = dayMetrics.reduce((sum, m) => sum + (m.systolicBP || 0), 0);
          return Math.round(systolicSum / dayMetrics.length);
          
        case "gfr":
          // Average GFR if multiple readings (typically one per day)
          const gfrSum = dayMetrics.reduce((sum, m) => sum + (m.estimatedGFR || 0), 0);
          return Math.round(gfrSum / dayMetrics.length);
          
        default:
          return 0;
      }
    });

    // For BP, also calculate diastolic values
    const diastolicData = activeTab === "bp" ? sortedDays.map(([, dayMetrics]) => {
      const diastolicSum = dayMetrics.reduce((sum, m) => sum + (m.diastolicBP || 0), 0);
      return Math.round(diastolicSum / dayMetrics.length);
    }) : [];

    return { labels, data, diastolicData };
  };

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

    return aggregateByDay().labels;
  };

  const getChartData = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      console.log("No weekly metrics data available for chart");
      return [];
    }

    console.log("Weekly metrics data for charts:", weeklyMetrics);
    return aggregateByDay().data;
  };

  const getChartDataWithDiastolic = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      console.log("No weekly metrics data available for chart");
      return { data: [], diastolicData: [] };
    }

    console.log("Weekly metrics data for charts:", weeklyMetrics);
    const aggregated = aggregateByDay();
    return { data: aggregated.data, diastolicData: aggregated.diastolicData || [] };
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

    const { data: dailyData } = aggregateByDay();
    
    if (dailyData.length === 0) {
      return "--";
    }

    switch (activeTab) {
      case "hydration": {
        const total = dailyData.reduce((sum, value) => sum + value, 0);
        return `${(total / dailyData.length).toFixed(1)}L / day`;
      }
      case "bp": {
        // For BP, we need to also calculate average diastolic from raw data
        const dailyGroups = new Map<string, typeof weeklyMetrics>();
        weeklyMetrics.forEach(metric => {
          if (!metric.date) return;
          const dateKey = new Date(metric.date).toISOString().split('T')[0];
          if (!dailyGroups.has(dateKey)) {
            dailyGroups.set(dateKey, []);
          }
          dailyGroups.get(dateKey)!.push(metric);
        });
        
        const avgSystolic = Math.round(dailyData.reduce((sum, value) => sum + value, 0) / dailyData.length);
        
        // Calculate average diastolic
        const dailyDiastolic = Array.from(dailyGroups.values()).map(dayMetrics => {
          const sum = dayMetrics.reduce((s, m) => s + (m.diastolicBP || 0), 0);
          return Math.round(sum / dayMetrics.length);
        });
        const avgDiastolic = Math.round(dailyDiastolic.reduce((sum, value) => sum + value, 0) / dailyDiastolic.length);
        
        return `${avgSystolic}/${avgDiastolic}`;
      }
      case "gfr": {
        const average = Math.round(dailyData.reduce((sum, value) => sum + value, 0) / dailyData.length);
        console.log("GFR average calculation:", average);
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
      
      <div className="chart-container" style={{ height: '250px' }}>
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
        <div className="w-full">
          <p className="text-sm text-neutral-600">Weekly average</p>
          <p className="font-bold text-lg">{calculateAverage()}</p>
          
          {/* Enhanced AI-powered GFR trend analysis */}
          {activeTab === "gfr" && weeklyMetrics && weeklyMetrics.length > 0 && (
            <div className="mt-2 text-sm flex flex-col gap-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h4 className="font-semibold text-primary">Kidney Function Insight</h4>
              </div>
              
              <p className={`font-medium mt-1
                ${weeklyMetrics[0].gfrTrend === 'significant_improvement' || weeklyMetrics[0].gfrTrend === 'moderate_improvement' ? 'text-green-600' : 
                  weeklyMetrics[0].gfrTrend === 'stable' ? 'text-blue-600' : 
                  weeklyMetrics[0].gfrTrend === 'possible_decline' ? 'text-amber-600' : 
                  'text-red-600'}`}>
                {weeklyMetrics[0].gfrTrendDescription || "Your kidney function appears stable based on recent measurements."}
              </p>
              
              {weeklyMetrics[0].gfrChangePercent && (
                <p className="text-xs text-neutral-700 mt-1">
                  {weeklyMetrics[0].gfrChangePercent > 0 ? '+' : ''}{weeklyMetrics[0].gfrChangePercent.toFixed(1)}% change
                  {weeklyMetrics[0].gfrAbsoluteChange && 
                    ` (${weeklyMetrics[0].gfrAbsoluteChange > 0 ? '+' : ''}${weeklyMetrics[0].gfrAbsoluteChange.toFixed(1)} points)`}
                </p>
              )}
              
              {weeklyMetrics[0].gfrLongTermTrend && (
                <div className="flex items-center mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    weeklyMetrics[0].gfrLongTermTrend === 'improving' ? 'bg-green-500' : 
                    weeklyMetrics[0].gfrLongTermTrend === 'stable' ? 'bg-blue-500' : 
                    'bg-amber-500'
                  }`}></span>
                  <p className="text-xs font-medium text-neutral-700">
                    {weeklyMetrics[0].gfrLongTermTrend === 'improving' ? 'Your kidney function has shown improvement over time' :
                     weeklyMetrics[0].gfrLongTermTrend === 'stable' ? 'Your kidney function has been stable for 3+ weeks' :
                     'Your kidney function shows changes that may need attention'}
                  </p>
                </div>
              )}
              
              {weeklyMetrics[0].gfrStability && (
                <p className="text-xs text-neutral-700 mt-1">
                  {weeklyMetrics[0].gfrStability}
                </p>
              )}
              
              {/* AI-powered personalized recommendation */}
              <div className="mt-3 bg-white p-2 rounded border border-blue-100 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 mt-0.5 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs">
                  {weeklyMetrics[0].gfrTrend === 'significant_decline' || weeklyMetrics[0].gfrTrend === 'moderate_decline' ? 
                    "Speak with your doctor about this change in kidney function." :
                    weeklyMetrics[0].gfrTrend === 'possible_decline' ?
                    "Consider discussing these recent changes with your healthcare provider at your next appointment." :
                    "Continue monitoring and maintaining your current health regimen."}
                </p>
              </div>
            </div>
          )}
          
          {/* Enhanced AI-powered Hydration insight */}
          {activeTab === "hydration" && weeklyMetrics && weeklyMetrics.length > 0 && (
            <div className="mt-2 text-sm flex flex-col gap-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h4 className="font-semibold text-primary">Hydration Insight</h4>
              </div>
              
              <p className="font-medium mt-1 text-blue-600">
                {weeklyMetrics[0]?.hydration && weeklyMetrics[0].hydration >= 2.5 ? 
                  "Your hydration levels are excellent! Great work staying well-hydrated." :
                  weeklyMetrics[0]?.hydration && weeklyMetrics[0].hydration >= 1.5 ?
                  "Your hydration is adequate, but could be improved for optimal kidney health." :
                  "Your hydration appears lower than recommended. Try to increase your water intake."}
              </p>
              
              {/* Calculate hydration trend */}
              {weeklyMetrics.length > 3 && (
                <p className="text-xs text-neutral-700 mt-1">
                  {(() => {
                    const recent = weeklyMetrics.slice(0, 3).reduce((sum, m) => sum + (m.hydration || 0), 0) / 3;
                    const older = weeklyMetrics.slice(3, 6).reduce((sum, m) => sum + (m.hydration || 0), 0) / 3;
                    const change = recent - older;
                    const percentChange = older ? (change / older) * 100 : 0;
                    return `${Math.abs(percentChange).toFixed(1)}% ${percentChange > 0 ? 'increase' : 'decrease'} in water intake compared to previous week`;
                  })()}
                </p>
              )}
              
              <div className="flex items-center mt-1">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  weeklyMetrics[0].hydration >= 2 ? 'bg-green-500' : 
                  weeklyMetrics[0].hydration >= 1.5 ? 'bg-blue-500' : 
                  'bg-amber-500'
                }`}></span>
                <p className="text-xs font-medium text-neutral-700">
                  {weeklyMetrics[0].hydration >= 2.5 ? 'Excellent hydration helps protect kidney function' :
                   weeklyMetrics[0].hydration >= 1.5 ? 'Moderate hydration - aim for 2-3L daily' :
                   'Low hydration may impact kidney function over time'}
                </p>
              </div>
              
              {/* AI-powered personalized recommendation */}
              <div className="mt-3 bg-white p-2 rounded border border-blue-100 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mt-0.5 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs">
                  {weeklyMetrics[0].hydration < 1.5 ? 
                    "Try setting water intake reminders throughout the day. Aim for at least 2L daily for kidney health." :
                    weeklyMetrics[0].hydration < 2 ?
                    "You're on track with hydration. Try adding another glass of water in the morning and evening." :
                    "Excellent hydration habits! Keep up the good work to maintain kidney health."}
                </p>
              </div>
            </div>
          )}
          
          {/* Enhanced AI-powered BP insight */}
          {activeTab === "bp" && weeklyMetrics && weeklyMetrics.length > 0 && (
            <div className="mt-2 text-sm flex flex-col gap-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h4 className="font-semibold text-primary">Blood Pressure Insight</h4>
              </div>
              
              <p className={`font-medium mt-1 ${
                weeklyMetrics[0].systolicBP >= 140 || weeklyMetrics[0].diastolicBP >= 90 ? 'text-red-600' : 
                weeklyMetrics[0].systolicBP >= 130 || weeklyMetrics[0].diastolicBP >= 85 ? 'text-amber-600' : 
                'text-green-600'
              }`}>
                {weeklyMetrics[0].systolicBP >= 140 || weeklyMetrics[0].diastolicBP >= 90 ? 
                  "Your blood pressure is elevated. This can impact kidney health over time." :
                  weeklyMetrics[0].systolicBP >= 130 || weeklyMetrics[0].diastolicBP >= 85 ?
                  "Your blood pressure is slightly elevated. Monitor closely." :
                  "Your blood pressure is within a healthy range. Great work!"}
              </p>
              
              {/* Calculate BP trend */}
              {weeklyMetrics.length > 3 && (
                <p className="text-xs text-neutral-700 mt-1">
                  {(() => {
                    const recentSys = weeklyMetrics.slice(0, 3).reduce((sum, m) => sum + (m.systolicBP || 0), 0) / 3;
                    const olderSys = weeklyMetrics.slice(3, 6).reduce((sum, m) => sum + (m.systolicBP || 0), 0) / 3;
                    const change = recentSys - olderSys;
                    return `${Math.abs(change).toFixed(1)} mmHg ${change > 0 ? 'increase' : 'decrease'} in systolic BP compared to previous week`;
                  })()}
                </p>
              )}
              
              <div className="flex items-center mt-1">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  weeklyMetrics[0].systolicBP < 130 && weeklyMetrics[0].diastolicBP < 80 ? 'bg-green-500' : 
                  weeklyMetrics[0].systolicBP < 140 && weeklyMetrics[0].diastolicBP < 90 ? 'bg-amber-500' : 
                  'bg-red-500'
                }`}></span>
                <p className="text-xs font-medium text-neutral-700">
                  {weeklyMetrics[0].systolicBP < 130 && weeklyMetrics[0].diastolicBP < 80 ? 
                    'Healthy blood pressure is protective for kidneys' :
                   weeklyMetrics[0].systolicBP < 140 && weeklyMetrics[0].diastolicBP < 90 ? 
                    'Borderline blood pressure - monitor closely' :
                    'Elevated blood pressure increases kidney disease risk'}
                </p>
              </div>
              
              {/* AI-powered personalized recommendation */}
              <div className="mt-3 bg-white p-2 rounded border border-blue-100 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 mt-0.5 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs">
                  {weeklyMetrics[0].systolicBP >= 140 || weeklyMetrics[0].diastolicBP >= 90 ? 
                    "Discuss your blood pressure readings with your healthcare provider. Regular monitoring is essential." :
                    weeklyMetrics[0].systolicBP >= 130 || weeklyMetrics[0].diastolicBP >= 85 ?
                    "Consider lifestyle changes like reduced sodium intake and regular exercise to help manage blood pressure." :
                    "Maintain your healthy diet and exercise routine to keep your blood pressure in this optimal range."}
                </p>
              </div>
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
