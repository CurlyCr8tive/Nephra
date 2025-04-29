import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHealthData } from "@/hooks/useHealthData";
import Chart from "chart.js/auto";
import { LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from "chart.js";
import { ChevronRight, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the prediction data interface
interface PredictionPoint {
  date: string;
  gfr: number;
  isActual: boolean;
}

// Register required Chart.js components
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export function GFRPredictionCard() {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { weeklyMetrics, isLoadingWeekly } = useHealthData();
  const [predictionData, setPredictionData] = useState<PredictionPoint[]>([]);
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [predictionStarted, setPredictionStarted] = useState(false);
  const { toast } = useToast();
  
  // Extract actual GFR data from health metrics
  useEffect(() => {
    if (weeklyMetrics && weeklyMetrics.length > 0 && !isLoadingWeekly) {
      // Convert weekly metrics to prediction points (actual data)
      const actualData: PredictionPoint[] = weeklyMetrics.map(metric => ({
        date: new Date(metric.date || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        gfr: metric.estimatedGFR || 0,
        isActual: true
      }));
      
      // Sort by date (oldest first)
      actualData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Save actual data
      setPredictionData(actualData);
    }
  }, [weeklyMetrics, isLoadingWeekly]);

  // Generate future predictions when requested
  const generatePredictions = () => {
    setIsGeneratingPrediction(true);
    setPredictionStarted(true);
    
    // Simulate prediction generation (will be replaced with real API call)
    setTimeout(() => {
      // Get actual data points
      const actualPoints = [...predictionData];
      
      if (actualPoints.length < 2) {
        toast({
          title: "Not enough data",
          description: "At least two data points are needed to generate a prediction",
          variant: "destructive"
        });
        setIsGeneratingPrediction(false);
        return;
      }
      
      // Get latest GFR value
      const latestActualGFR = actualPoints[actualPoints.length - 1].gfr;
      
      // Calculate trend from actual data
      let trendDirection = 0;
      if (actualPoints.length >= 2) {
        const firstGFR = actualPoints[0].gfr;
        const lastGFR = actualPoints[actualPoints.length - 1].gfr;
        trendDirection = lastGFR - firstGFR;
      }
      
      // Calculate prediction rate (simplified linear model)
      const averageChange = trendDirection / Math.max(1, actualPoints.length - 1);
      
      // Generate 3 future predictions
      const futurePredictions: PredictionPoint[] = [];
      const lastDate = new Date(actualPoints[actualPoints.length - 1].date);
      
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + (i * 7)); // Weekly predictions
        
        // Add some randomness to make predictions more realistic
        const randomFactor = Math.random() * 2 - 1; // Random value between -1 and 1
        const predictedValue = Math.max(5, latestActualGFR + (averageChange * i) + (randomFactor * 2));
        
        futurePredictions.push({
          date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          gfr: parseFloat(predictedValue.toFixed(1)),
          isActual: false
        });
      }
      
      // Combine actual data with predictions
      setPredictionData([...actualPoints, ...futurePredictions]);
      setIsGeneratingPrediction(false);
      
      // Show success toast
      toast({
        title: "Prediction generated",
        description: "GFR predictions have been generated based on your historical data",
      });
    }, 1500);
  };
  
  // Render chart when data changes
  useEffect(() => {
    // Only render if we have data and the chart container exists
    if (chartRef.current && predictionData.length > 0) {
      // Destroy previous chart instance if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;
      
      // Extract dates and GFR values
      const labels = predictionData.map(point => point.date);
      const actualData = predictionData
        .map((point, index) => point.isActual ? point.gfr : null);
      const predictedData = predictionData
        .map((point, index) => !point.isActual ? point.gfr : null);
      
      // Create chart
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Actual GFR",
              data: actualData,
              borderColor: "rgba(25, 118, 210, 1)",
              backgroundColor: "rgba(25, 118, 210, 0.2)",
              pointBackgroundColor: "rgba(25, 118, 210, 1)",
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 4,
              fill: false
            },
            {
              label: "Predicted GFR",
              data: predictedData,
              borderColor: "rgba(156, 39, 176, 1)",
              backgroundColor: "rgba(156, 39, 176, 0.2)",
              pointBackgroundColor: "rgba(156, 39, 176, 1)",
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.2,
              pointRadius: 4,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
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
                title: (items) => {
                  return items[0].label;
                },
                label: (context) => {
                  const datasetIndex = context.datasetIndex;
                  const value = context.raw as number;
                  
                  if (value === null) return "";
                  
                  const label = context.dataset.label || '';
                  return `${label}: ${value.toFixed(1)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              min: getMinYValue(),
              max: getMaxYValue(),
              title: {
                display: true,
                text: 'GFR (mL/min/1.73m²)',
                font: {
                  size: 12
                }
              },
              ticks: {
                stepSize: 15,
                font: {
                  size: 12
                },
                callback: function(value) {
                  return value;
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
  }, [predictionData]);
  
  // Calculate min and max values for the Y axis
  const getMinYValue = () => {
    if (predictionData.length === 0) return 0;
    
    // Find the minimum GFR value in the data
    const minGfr = Math.min(...predictionData.map(point => point.gfr));
    
    // Add some padding and round down to the nearest 10
    return Math.max(0, Math.floor((minGfr - 10) / 10) * 10);
  };
  
  const getMaxYValue = () => {
    if (predictionData.length === 0) return 120;
    
    // Find the maximum GFR value in the data
    const maxGfr = Math.max(...predictionData.map(point => point.gfr));
    
    // Add some padding and round up to the nearest 10
    return Math.min(150, Math.ceil((maxGfr + 10) / 10) * 10);
  };
  
  // Get trend analysis text
  const getTrendAnalysis = () => {
    if (predictionData.length < 2) return null;
    
    const actualDataPoints = predictionData.filter(point => point.isActual);
    if (actualDataPoints.length < 2) return null;
    
    const firstGFR = actualDataPoints[0].gfr;
    const lastGFR = actualDataPoints[actualDataPoints.length - 1].gfr;
    const difference = lastGFR - firstGFR;
    const percentChange = ((difference / firstGFR) * 100).toFixed(1);
    
    // Determine trend severity based on percent change
    if (difference > 0) {
      if (parseFloat(percentChange) > 10) {
        return {
          text: `Improving trend (+${percentChange}%)`,
          icon: <TrendingUp className="h-4 w-4 text-success" />,
          color: "text-success"
        };
      } else {
        return {
          text: `Slightly improving (+${percentChange}%)`,
          icon: <TrendingUp className="h-4 w-4 text-success" />,
          color: "text-success"
        };
      }
    } else if (difference < 0) {
      if (parseFloat(percentChange) < -10) {
        return {
          text: `Declining trend (${percentChange}%)`,
          icon: <TrendingDown className="h-4 w-4 text-destructive" />,
          color: "text-destructive"
        };
      } else {
        return {
          text: `Slightly declining (${percentChange}%)`,
          icon: <TrendingDown className="h-4 w-4 text-warning" />,
          color: "text-warning"
        };
      }
    } else {
      return {
        text: "Stable trend (0%)",
        icon: <CheckCircle className="h-4 w-4 text-info" />,
        color: "text-info"
      };
    }
  };

  // Helper to get future prediction text
  const getFuturePrediction = () => {
    const predictedPoints = predictionData.filter(point => !point.isActual);
    if (predictedPoints.length === 0) return null;
    
    const actualPoints = predictionData.filter(point => point.isActual);
    if (actualPoints.length === 0) return null;
    
    const latestActualGFR = actualPoints[actualPoints.length - 1].gfr;
    const latestPredictedGFR = predictedPoints[predictedPoints.length - 1].gfr;
    
    const difference = latestPredictedGFR - latestActualGFR;
    const percentChange = ((difference / latestActualGFR) * 100).toFixed(1);
    
    if (difference > 5) {
      return {
        text: `Projected improvement of ${percentChange}% in 3 weeks`,
        icon: <TrendingUp className="h-4 w-4 text-success" />,
        color: "text-success"
      };
    } else if (difference < -5) {
      return {
        text: `Projected decline of ${Math.abs(parseFloat(percentChange))}% in 3 weeks`,
        icon: <TrendingDown className="h-4 w-4 text-destructive" />,
        color: "text-destructive"
      };
    } else {
      return {
        text: "Projected to remain stable over the next 3 weeks",
        icon: <CheckCircle className="h-4 w-4 text-info" />,
        color: "text-info"
      };
    }
  };
  
  // Get trend analysis
  const trendAnalysis = getTrendAnalysis();
  
  // Get future prediction
  const futurePrediction = getFuturePrediction();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>GFR Prediction Engine</span>
          {!predictionStarted && (
            <Button 
              onClick={generatePredictions} 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              className="text-xs"
            >
              Generate Prediction
            </Button>
          )}
        </CardTitle>
        <CardDescription>Advanced trend analysis with future predictions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : predictionData.length < 2 ? (
          <div className="text-center py-8 text-neutral-500">
            <Info className="h-10 w-10 mx-auto mb-2 text-neutral-400" />
            <p className="mb-1">Not enough data for predictions</p>
            <p className="text-sm text-neutral-400">Log your health data at least twice to see GFR predictions</p>
          </div>
        ) : (
          <>
            <div className="chart-container" style={{ height: '220px', marginBottom: '12px' }}>
              <canvas ref={chartRef}></canvas>
            </div>
            {isGeneratingPrediction ? (
              <div className="flex items-center justify-center py-3 px-4 rounded-md bg-muted">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                <span className="text-sm">Analyzing your data and generating predictions...</span>
              </div>
            ) : (
              <>
                {trendAnalysis && (
                  <div className="flex items-center py-2 px-4 rounded-md bg-muted mb-2">
                    {trendAnalysis.icon}
                    <span className={`text-sm ml-2 ${trendAnalysis.color} font-medium`}>{trendAnalysis.text}</span>
                  </div>
                )}
                
                {futurePrediction && (
                  <div className="flex items-center py-2 px-4 rounded-md bg-muted">
                    {futurePrediction.icon}
                    <span className={`text-sm ml-2 ${futurePrediction.color} font-medium`}>{futurePrediction.text}</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default GFRPredictionCard;