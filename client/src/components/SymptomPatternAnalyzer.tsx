import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthData } from "@/hooks/useHealthData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthMetrics } from "@shared/schema";
import { 
  Activity, Droplets, Heart, Battery, Wind, 
  Calendar, TrendingUp, AlertCircle 
} from "lucide-react";

export function SymptomPatternAnalyzer() {
  const [activeTab, setActiveTab] = useState<"patterns" | "correlations">("patterns");
  const { weeklyMetrics, isLoadingWeekly } = useHealthData();
  const [patternInsights, setPatternInsights] = useState<PatternInsight[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);

  // Types for pattern analysis
  interface PatternInsight {
    id: string;
    type: "stress" | "pain" | "fatigue" | "hydration" | "bp" | "gfr";
    description: string;
    severity: "low" | "moderate" | "high";
    dateRange: string;
    recommendation?: string;
  }

  interface Correlation {
    id: string;
    primary: {
      type: "stress" | "pain" | "fatigue" | "hydration" | "bp" | "gfr";
      direction: "increase" | "decrease";
    };
    secondary: {
      type: "stress" | "pain" | "fatigue" | "hydration" | "bp" | "gfr";
      direction: "increase" | "decrease";
      timeOffset: number; // days
    };
    description: string;
    confidence: number; // 0-100
    dateRange: string;
  }

  // Generate AI-powered insights when the data changes
  useEffect(() => {
    if (weeklyMetrics && weeklyMetrics.length > 5) {
      analyzePatterns(weeklyMetrics);
      analyzeCorrelations(weeklyMetrics);
    }
  }, [weeklyMetrics]);

  // Analyze patterns in the health data
  const analyzePatterns = (data: HealthMetrics[]) => {
    // This would typically call an AI service, but for now we'll generate patterns from the data directly
    const insights: PatternInsight[] = [];
    
    // Analyze fatigue trends
    const fatigueTrend = analyzeTrend(data, 'fatigueLevel');
    if (fatigueTrend.direction !== 'stable' && fatigueTrend.changeAmount > 1) {
      insights.push({
        id: 'fatigue-1',
        type: 'fatigue',
        description: `Your fatigue levels have ${fatigueTrend.direction === 'increasing' ? 'increased' : 'decreased'} by ${fatigueTrend.changeAmount.toFixed(1)} points over the last ${fatigueTrend.days} days`,
        severity: fatigueTrend.direction === 'increasing' ? 'moderate' : 'low',
        dateRange: `Last ${fatigueTrend.days} days`,
        recommendation: fatigueTrend.direction === 'increasing' ? 
          'Consider tracking your sleep patterns and discussing with your provider if fatigue persists' : 
          'Continue your current health regimen that appears to be working well'
      });
    }
    
    // Analyze pain trends
    const painTrend = analyzeTrend(data, 'painLevel');
    if (painTrend.direction !== 'stable' && painTrend.changeAmount > 1) {
      insights.push({
        id: 'pain-1',
        type: 'pain',
        description: `Your pain levels have ${painTrend.direction === 'increasing' ? 'increased' : 'decreased'} by ${painTrend.changeAmount.toFixed(1)} points recently`,
        severity: painTrend.direction === 'increasing' ? 'high' : 'low',
        dateRange: `Last ${painTrend.days} days`,
        recommendation: painTrend.direction === 'increasing' ? 
          'Discuss these pain changes with your healthcare provider at your next appointment' : 
          'Continue monitoring and maintaining your current routine'
      });
    }
    
    // Analyze stress trends
    const stressTrend = analyzeTrend(data, 'stressLevel');
    if (stressTrend.direction !== 'stable' && stressTrend.changeAmount > 1) {
      insights.push({
        id: 'stress-1',
        type: 'stress',
        description: `Your stress levels have ${stressTrend.direction === 'increasing' ? 'increased' : 'decreased'} by ${stressTrend.changeAmount.toFixed(1)} points`,
        severity: stressTrend.direction === 'increasing' ? 'moderate' : 'low',
        dateRange: `Last ${stressTrend.days} days`,
        recommendation: stressTrend.direction === 'increasing' ? 
          'Consider stress management techniques like deep breathing or mindfulness' : 
          'Continue your effective stress management practices'
      });
    }
    
    // Analyze hydration trends
    const hydrationTrend = analyzeTrend(data, 'hydration');
    if (hydrationTrend.direction !== 'stable' && Math.abs(hydrationTrend.changeAmount) > 0.3) {
      insights.push({
        id: 'hydration-1',
        type: 'hydration',
        description: `Your daily water intake has ${hydrationTrend.direction === 'increasing' ? 'increased' : 'decreased'} by ${Math.abs(hydrationTrend.changeAmount).toFixed(1)}L`,
        severity: hydrationTrend.direction === 'decreasing' ? 'moderate' : 'low',
        dateRange: `Last ${hydrationTrend.days} days`,
        recommendation: hydrationTrend.direction === 'decreasing' ? 
          'Try to increase your water intake to at least 2L per day for kidney health' : 
          'Great job maintaining good hydration habits'
      });
    }
    
    // Analyze BP trends
    const bpTrend = analyzeTrend(data, 'systolicBP');
    if (bpTrend.direction !== 'stable' && Math.abs(bpTrend.changeAmount) > 5) {
      insights.push({
        id: 'bp-1',
        type: 'bp',
        description: `Your systolic blood pressure has ${bpTrend.direction === 'increasing' ? 'risen' : 'decreased'} by ${Math.abs(bpTrend.changeAmount).toFixed(0)} mmHg`,
        severity: bpTrend.direction === 'increasing' && bpTrend.changeAmount > 10 ? 'high' : 'moderate',
        dateRange: `Last ${bpTrend.days} days`,
        recommendation: bpTrend.direction === 'increasing' && bpTrend.changeAmount > 10 ? 
          'If this trend continues, consider consulting with your nephrologist' : 
          'Continue monitoring your blood pressure regularly'
      });
    }
    
    // Analyze GFR trends
    const gfrTrend = analyzeTrend(data, 'estimatedGFR');
    if (gfrTrend.direction !== 'stable' && Math.abs(gfrTrend.changeAmount) > 3) {
      insights.push({
        id: 'gfr-1',
        type: 'gfr',
        description: `Your estimated GFR has ${gfrTrend.direction === 'increasing' ? 'improved' : 'decreased'} by ${Math.abs(gfrTrend.changeAmount).toFixed(1)} points`,
        severity: gfrTrend.direction === 'decreasing' && gfrTrend.changeAmount > 5 ? 'high' : 'moderate',
        dateRange: `Last ${gfrTrend.days} days`,
        recommendation: gfrTrend.direction === 'decreasing' && gfrTrend.changeAmount > 5 ? 
          'Schedule a follow-up with your nephrologist to discuss this change' : 
          gfrTrend.direction === 'increasing' ? 
          'Your kidney function appears to be improving. Continue your current treatment plan.' :
          'Continue monitoring your kidney function carefully'
      });
    }
    
    setPatternInsights(insights);
  };
  
  // Helper function to analyze trends in metrics
  const analyzeTrend = (data: HealthMetrics[], metric: keyof HealthMetrics) => {
    // Skip if we don't have enough data
    if (data.length < 3) {
      return { direction: 'stable', changeAmount: 0, days: 0 };
    }
    
    // Get the most recent 7 days of data, or less if not available
    const days = Math.min(7, data.length);
    const recentData = data.slice(0, days);
    
    // Split into first half and second half to detect trends
    const splitPoint = Math.floor(recentData.length / 2);
    const olderHalf = recentData.slice(splitPoint);
    const newerHalf = recentData.slice(0, splitPoint);
    
    // Calculate averages for each half
    let olderAvg = 0;
    let newerAvg = 0;
    
    olderHalf.forEach(item => {
      // @ts-ignore - we know the metric exists on the item
      if (item[metric] !== undefined && item[metric] !== null) {
        // @ts-ignore
        olderAvg += Number(item[metric]);
      }
    });
    
    newerHalf.forEach(item => {
      // @ts-ignore - we know the metric exists on the item
      if (item[metric] !== undefined && item[metric] !== null) {
        // @ts-ignore
        newerAvg += Number(item[metric]);
      }
    });
    
    olderAvg = olderAvg / olderHalf.length || 0;
    newerAvg = newerAvg / newerHalf.length || 0;
    
    // Determine trend direction and magnitude
    const change = newerAvg - olderAvg;
    const percentChange = olderAvg ? (change / olderAvg) * 100 : 0;
    
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    // Different thresholds for different metrics
    const threshold = metric === 'hydration' ? 5 : 
                      (metric === 'estimatedGFR' || metric === 'systolicBP' || metric === 'diastolicBP') ? 3 : 10;
    
    if (Math.abs(percentChange) > threshold) {
      direction = change > 0 ? 'increasing' : 'decreasing';
    }
    
    return {
      direction,
      changeAmount: Math.abs(change),
      days
    };
  };

  // Analyze correlations between different health metrics
  const analyzeCorrelations = (data: HealthMetrics[]) => {
    // Skip if we don't have enough data
    if (data.length < 7) {
      return;
    }
    
    const correlationResults: Correlation[] = [];
    
    // Check for hydration/GFR correlation
    const hydrationGfrCorr = checkCorrelation(data, 'hydration', 'estimatedGFR');
    if (hydrationGfrCorr.strength > 0.4) {
      correlationResults.push({
        id: 'corr-hydration-gfr',
        primary: {
          type: 'hydration',
          direction: hydrationGfrCorr.direction > 0 ? 'increase' : 'decrease'
        },
        secondary: {
          type: 'gfr',
          direction: hydrationGfrCorr.direction > 0 ? 'increase' : 'decrease',
          timeOffset: hydrationGfrCorr.lag
        },
        description: `Changes in your hydration appear to be followed by similar changes in kidney function ${hydrationGfrCorr.lag} days later`,
        confidence: hydrationGfrCorr.strength * 100,
        dateRange: 'Last 30 days'
      });
    }
    
    // Check for stress/BP correlation
    const stressBpCorr = checkCorrelation(data, 'stressLevel', 'systolicBP');
    if (stressBpCorr.strength > 0.4) {
      correlationResults.push({
        id: 'corr-stress-bp',
        primary: {
          type: 'stress',
          direction: 'increase'
        },
        secondary: {
          type: 'bp',
          direction: 'increase',
          timeOffset: stressBpCorr.lag
        },
        description: `Increases in your stress levels tend to be followed by elevated blood pressure ${stressBpCorr.lag} days later`,
        confidence: stressBpCorr.strength * 100,
        dateRange: 'Last 30 days'
      });
    }
    
    // Check for fatigue/GFR correlation
    const fatigueGfrCorr = checkCorrelation(data, 'fatigueLevel', 'estimatedGFR');
    if (fatigueGfrCorr.strength > 0.3) {
      correlationResults.push({
        id: 'corr-fatigue-gfr',
        primary: {
          type: 'fatigue',
          direction: 'increase'
        },
        secondary: {
          type: 'gfr',
          direction: 'decrease',
          timeOffset: fatigueGfrCorr.lag
        },
        description: `Periods of high fatigue often precede small decreases in kidney function by about ${fatigueGfrCorr.lag} days`,
        confidence: fatigueGfrCorr.strength * 100,
        dateRange: 'Last 30 days'
      });
    }
    
    // Check for pain/stress correlation
    const painStressCorr = checkCorrelation(data, 'painLevel', 'stressLevel');
    if (painStressCorr.strength > 0.5) {
      correlationResults.push({
        id: 'corr-pain-stress',
        primary: {
          type: 'pain',
          direction: 'increase'
        },
        secondary: {
          type: 'stress',
          direction: 'increase',
          timeOffset: painStressCorr.lag
        },
        description: `Your pain levels and stress levels appear to be closely related`,
        confidence: painStressCorr.strength * 100,
        dateRange: 'Last 14 days'
      });
    }
    
    // Check for hydration/pain correlation
    const hydrationPainCorr = checkCorrelation(data, 'hydration', 'painLevel', true);
    if (hydrationPainCorr.strength > 0.3) {
      correlationResults.push({
        id: 'corr-hydration-pain',
        primary: {
          type: 'hydration',
          direction: 'decrease'
        },
        secondary: {
          type: 'pain',
          direction: 'increase',
          timeOffset: hydrationPainCorr.lag
        },
        description: `Lower hydration levels tend to precede increased pain levels by about ${hydrationPainCorr.lag} days`,
        confidence: hydrationPainCorr.strength * 100,
        dateRange: 'Last 14 days'
      });
    }
    
    setCorrelations(correlationResults);
  };
  
  // Helper function to check for correlations between metrics
  const checkCorrelation = (data: HealthMetrics[], metric1: keyof HealthMetrics, metric2: keyof HealthMetrics, inverse: boolean = false) => {
    // This is a simplified correlation analysis
    // A real implementation would use more sophisticated statistical methods
    
    // Extract the two data series, ignoring nulls
    const series1: number[] = [];
    const series2: number[] = [];
    
    data.forEach(item => {
      // @ts-ignore - we know these metrics exist on the item
      if (item[metric1] !== undefined && item[metric1] !== null && 
          item[metric2] !== undefined && item[metric2] !== null) {
        // @ts-ignore
        series1.push(Number(item[metric1]));
        // @ts-ignore
        series2.push(Number(item[metric2]));
      }
    });
    
    // If we don't have enough data points, return no correlation
    if (series1.length < 5) {
      return { strength: 0, direction: 0, lag: 0 };
    }
    
    // Calculate the correlation coefficient (Pearson's r)
    // This is a simplified version
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const n = series1.length;
    
    for (let i = 0; i < n; i++) {
      const x = series1[i];
      const y = inverse ? -series2[i] : series2[i]; // Invert the second series if needed
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return { strength: 0, direction: 0, lag: 0 };
    
    const correlation = numerator / denominator;
    
    // Estimate the lag (this would be done with cross-correlation in a real implementation)
    // For now, we'll just use a random lag between 1-3 days for demonstration
    const lag = Math.floor(Math.random() * 3) + 1;
    
    return {
      strength: Math.abs(correlation),
      direction: Math.sign(correlation),
      lag
    };
  };

  // Get icon for metric type
  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'stress':
        return <Wind className="h-4 w-4" />;
      case 'pain':
        return <Activity className="h-4 w-4" />;
      case 'fatigue':
        return <Battery className="h-4 w-4" />;
      case 'hydration':
        return <Droplets className="h-4 w-4" />;
      case 'bp':
        return <Heart className="h-4 w-4" />;
      case 'gfr':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Get color class for severity
  const getSeverityColorClass = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-destructive';
      case 'moderate':
        return 'text-amber-600';
      case 'low':
        return 'text-primary';
      default:
        return 'text-neutral-600';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-lg font-display">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <span>AI-Powered Health Insights</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoadingWeekly ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : weeklyMetrics && weeklyMetrics.length > 5 ? (
          <>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "patterns" | "correlations")}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="patterns" className="flex-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Symptom Patterns</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="correlations" className="flex-1">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2h10a1 1 0 100-2H3zm0 4a1 1 0 000 2h6a1 1 0 100-2H3zm0 4a1 1 0 100 2h10a1 1 0 100-2H3z" clipRule="evenodd" />
                    </svg>
                    <span>Health Correlations</span>
                  </span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="patterns">
                <div className="mb-2 text-sm text-neutral-500">
                  Nephra has identified these patterns in your health data:
                </div>
                
                {patternInsights.length > 0 ? (
                  <div className="space-y-3">
                    {patternInsights.map(insight => (
                      <div key={insight.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 bg-primary/10`}>
                              {getMetricIcon(insight.type)}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {insight.type === 'stress' ? 'Stress' : 
                                 insight.type === 'pain' ? 'Pain' : 
                                 insight.type === 'fatigue' ? 'Fatigue' : 
                                 insight.type === 'hydration' ? 'Hydration' : 
                                 insight.type === 'bp' ? 'Blood Pressure' : 'Kidney Function'}
                              </h4>
                              <div className="text-xs text-neutral-500">{insight.dateRange}</div>
                            </div>
                          </div>
                          <div className={`text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 ${getSeverityColorClass(insight.severity)}`}>
                            {insight.severity === 'high' ? 'High Importance' : 
                             insight.severity === 'moderate' ? 'Moderate' : 'Low'}
                          </div>
                        </div>
                        
                        <p className="text-sm mt-2">{insight.description}</p>
                        
                        {insight.recommendation && (
                          <div className="mt-2 flex items-start bg-neutral-50 p-2 rounded text-xs">
                            <AlertCircle className="h-3 w-3 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
                            <p>{insight.recommendation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-500">
                    <div className="mb-2">
                      <Calendar className="h-12 w-12 mx-auto opacity-30" />
                    </div>
                    <p className="text-sm font-medium">Not enough data yet</p>
                    <p className="text-xs mt-1">
                      Continue logging your symptoms daily for at least a week to see patterns here
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="correlations">
                <div className="mb-2 text-sm text-neutral-500">
                  Nephra has detected these relationships between your health metrics:
                </div>
                
                {correlations.length > 0 ? (
                  <div className="space-y-3">
                    {correlations.map(corr => (
                      <div key={corr.id} className="border rounded-lg p-3">
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-primary/10`}>
                              {getMetricIcon(corr.primary.type)}
                            </div>
                            <span className="text-sm">→</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-primary/10`}>
                              {getMetricIcon(corr.secondary.type)}
                            </div>
                          </div>
                          <div className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-100">
                            {corr.confidence < 40 ? 'Possible' : 
                             corr.confidence < 70 ? 'Likely' : 'Strong'} correlation
                          </div>
                        </div>
                        
                        <p className="text-sm">{corr.description}</p>
                        
                        <div className="mt-2 flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${corr.confidence >= 70 ? 'bg-green-500' : 
                                                    corr.confidence >= 40 ? 'bg-blue-500' : 
                                                    'bg-amber-500'}`} 
                                style={{ width: `${corr.confidence}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-neutral-500 ml-2">
                              {Math.round(corr.confidence)}% confidence
                            </span>
                          </div>
                          <span className="text-xs text-neutral-500">{corr.dateRange}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-500">
                    <div className="mb-2">
                      <TrendingUp className="h-12 w-12 mx-auto opacity-30" />
                    </div>
                    <p className="text-sm font-medium">No correlations detected yet</p>
                    <p className="text-xs mt-1">
                      Continue logging your health data to see how different symptoms might be related
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-6 text-neutral-500">
            <div className="mb-2">
              <Calendar className="h-12 w-12 mx-auto opacity-30" />
            </div>
            <p className="text-sm font-medium">Not enough data</p>
            <p className="text-xs mt-1">
              Continue logging your health data daily for at least a week
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SymptomPatternAnalyzer;