import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthData } from "@/hooks/useHealthData";
import { useUser } from "@/contexts/UserContext";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, AlertCircle, Info } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function KSLSTrendsAnalyzer() {
  const { user } = useUser();
  const { weeklyMetrics, isLoadingWeekly } = useHealthData();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  const getBandColor = (band: string) => {
    switch (band) {
      case 'stable':
        return 'bg-green-500';
      case 'elevated':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBandText = (band: string) => {
    switch (band) {
      case 'stable':
        return 'Stable';
      case 'elevated':
        return 'Elevated';
      case 'high':
        return 'High';
      default:
        return 'Unknown';
    }
  };

  // Filter metrics based on date range and ensure KSLS data exists
  const getFilteredMetrics = () => {
    if (!weeklyMetrics) return [];
    
    const now = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return weeklyMetrics
      .filter(m => m.kslsScore !== null && new Date(m.date) >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const filteredMetrics = getFilteredMetrics();

  // Calculate KSLS statistics
  const kslsStats = {
    current: filteredMetrics.length > 0 ? filteredMetrics[filteredMetrics.length - 1].kslsScore : null,
    average: filteredMetrics.length > 0 
      ? Math.round(filteredMetrics.reduce((sum, m) => sum + (m.kslsScore || 0), 0) / filteredMetrics.length)
      : null,
    lowest: filteredMetrics.length > 0 
      ? Math.min(...filteredMetrics.map(m => m.kslsScore || 100))
      : null,
    highest: filteredMetrics.length > 0 
      ? Math.max(...filteredMetrics.map(m => m.kslsScore || 0))
      : null,
    trend: (() => {
      if (filteredMetrics.length < 2) return 'stable';
      const recent = filteredMetrics.slice(-7).reduce((sum, m) => sum + (m.kslsScore || 0), 0) / Math.min(7, filteredMetrics.length);
      const older = filteredMetrics.slice(0, 7).reduce((sum, m) => sum + (m.kslsScore || 0), 0) / Math.min(7, filteredMetrics.length);
      const change = recent - older;
      if (change < -5) return 'improving';
      if (change > 5) return 'worsening';
      return 'stable';
    })()
  };

  // Prepare chart data
  const chartData = {
    labels: filteredMetrics.map(m => {
      const date = new Date(m.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'KSLS Score',
        data: filteredMetrics.map(m => m.kslsScore),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const index = context.dataIndex;
            const metric = filteredMetrics[index];
            return [
              `KSLS: ${metric.kslsScore}/100`,
              `Band: ${getBandText(metric.kslsBand || '')}`,
              `BP: ${metric.systolicBP}/${metric.diastolicBP}`,
              `Hydration: ${metric.hydration}L`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        },
        title: {
          display: true,
          text: 'KSLS Score (0-100)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            KSLS Trend Analysis
          </CardTitle>
          <div className="flex gap-2">
            <button 
              className={`text-xs px-3 py-1 rounded ${dateRange === "7d" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              onClick={() => setDateRange("7d")}
            >
              7D
            </button>
            <button 
              className={`text-xs px-3 py-1 rounded ${dateRange === "30d" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              onClick={() => setDateRange("30d")}
            >
              30D
            </button>
            <button 
              className={`text-xs px-3 py-1 rounded ${dateRange === "90d" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              onClick={() => setDateRange("90d")}
            >
              90D
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoadingWeekly ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No KSLS data available for this period</p>
            <p className="text-sm text-gray-500">Log your health metrics to see KSLS trends</p>
          </div>
        ) : (
          <>
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Current</p>
                <p className="text-2xl font-bold text-blue-600">{kslsStats.current}</p>
                <Badge className={`mt-1 ${getBandColor(filteredMetrics[filteredMetrics.length - 1]?.kslsBand || '')}`}>
                  {getBandText(filteredMetrics[filteredMetrics.length - 1]?.kslsBand || '')}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Average</p>
                <p className="text-2xl font-bold">{kslsStats.average}</p>
                <p className="text-xs text-gray-500 mt-1">{dateRange} period</p>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Best</p>
                <p className="text-2xl font-bold text-green-600">{kslsStats.lowest}</p>
                <p className="text-xs text-gray-500 mt-1">Lowest stress</p>
              </div>

              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Trend</p>
                <div className="flex items-center gap-1">
                  {kslsStats.trend === 'improving' && <TrendingDown className="h-5 w-5 text-green-600" />}
                  {kslsStats.trend === 'worsening' && <TrendingUp className="h-5 w-5 text-red-600" />}
                  {kslsStats.trend === 'stable' && <Minus className="h-5 w-5 text-gray-600" />}
                  <p className={`text-lg font-bold ${
                    kslsStats.trend === 'improving' ? 'text-green-600' : 
                    kslsStats.trend === 'worsening' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {kslsStats.trend === 'improving' ? 'Improving' : 
                     kslsStats.trend === 'worsening' ? 'Worsening' : 
                     'Stable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64 mb-6">
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Insights */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2 mb-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">KSLS Insights</h4>
                  
                  {kslsStats.trend === 'improving' && (
                    <p className="text-sm text-blue-800 mb-2">
                      Great progress! Your kidney stress indicators have improved over the past {dateRange}. 
                      Your current score of {kslsStats.current} shows better symptom management.
                    </p>
                  )}
                  
                  {kslsStats.trend === 'worsening' && (
                    <p className="text-sm text-blue-800 mb-2">
                      Your KSLS has increased recently, indicating higher kidney stress. 
                      Focus on hydration, blood pressure control, and stress management. Consider discussing with your healthcare provider.
                    </p>
                  )}
                  
                  {kslsStats.trend === 'stable' && (
                    <p className="text-sm text-blue-800 mb-2">
                      Your KSLS has remained stable at around {kslsStats.average} over the past {dateRange}. 
                      Continue your current health management routine.
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>What affects KSLS:</strong> Blood pressure, hydration levels, fatigue, pain, stress, and BMI. 
                      Track these factors to understand what impacts your score.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Factor Breakdown for Latest Reading */}
            {filteredMetrics[filteredMetrics.length - 1]?.kslsFactors && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Latest Factor Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(() => {
                    try {
                      const factors = JSON.parse(filteredMetrics[filteredMetrics.length - 1].kslsFactors as any);
                      return Object.entries(factors).map(([key, value]: [string, any]) => (
                        <div key={key} className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm font-semibold">{typeof value === 'number' ? value.toFixed(1) : value}</p>
                        </div>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default KSLSTrendsAnalyzer;
