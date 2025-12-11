/**
 * KSLS Trend Visualization Component
 * 
 * Shows KSLS history over time with:
 * - Line chart of overall KSLS score (7/30/90 day views)
 * - Stacked area chart of factor contributions
 * - Band transition visualization
 * - Comparison with GFR trends
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface KSLSHistoryPoint {
  date: Date;
  ksls: number;
  band: 'stable' | 'elevated' | 'high';
  factors: {
    bp: number;
    hydration: number;
    fatigue: number | null;
    pain: number | null;
    stress: number | null;
    weight: number;
  };
  gfr?: number; // Optional GFR for comparison
}

interface KSLSTrendChartProps {
  history: KSLSHistoryPoint[];
  dateRange?: '7d' | '30d' | '90d';
}

const getBandColor = (band: 'stable' | 'elevated' | 'high') => {
  switch (band) {
    case 'stable':
      return '#10b981'; // green-500
    case 'elevated':
      return '#f59e0b'; // yellow-500
    case 'high':
      return '#ef4444'; // red-500
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold">{label}</p>
        <p className="text-sm">KSLS: <span className="font-bold">{data.ksls.toFixed(1)}</span></p>
        <p className="text-sm">
          Band: <Badge className={`bg-[${getBandColor(data.band)}]`}>{data.band}</Badge>
        </p>
        {data.gfr && (
          <p className="text-sm">GFR: <span className="font-medium">{data.gfr.toFixed(0)}</span></p>
        )}
      </div>
    );
  }
  return null;
};

export function KSLSTrendChart({ history, dateRange = '30d' }: KSLSTrendChartProps) {
  const [viewMode, setViewMode] = useState<'score' | 'factors' | 'comparison'>('score');
  
  // Filter data by date range
  const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const cutoffDate = subDays(new Date(), daysBack);
  const filteredHistory = history.filter(point => point.date >= cutoffDate);
  
  // Format data for charts
  const chartData = filteredHistory.map(point => ({
    date: format(point.date, 'MM/dd'),
    ksls: point.ksls,
    band: point.band,
    gfr: point.gfr,
    // Factor contributions (normalized values * 100 for percentage display)
    bp_contribution: point.factors.bp * 35, // BP has 35% weight
    hydration_contribution: point.factors.hydration * 15,
    fatigue_contribution: point.factors.fatigue !== null ? point.factors.fatigue * 15 : 0,
    pain_contribution: point.factors.pain !== null ? point.factors.pain * 10 : 0,
    stress_contribution: point.factors.stress !== null ? point.factors.stress * 10 : 0,
    weight_contribution: point.factors.weight * 15,
  }));
  
  // Calculate trend
  const getTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 };
    
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.ksls, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.ksls, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (Math.abs(change) < 5) {
      return { direction: 'stable', change };
    }
    return { direction: change > 0 ? 'increasing' : 'decreasing', change };
  };
  
  const trend = getTrend();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>KSLS Trend Analysis</CardTitle>
            <CardDescription>
              {daysBack}-day history of your Kidney Stress Load Score
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend.direction === 'increasing' && (
              <TrendingUp className="h-5 w-5 text-red-500" />
            )}
            {trend.direction === 'decreasing' && (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
            {trend.direction === 'stable' && (
              <Minus className="h-5 w-5 text-gray-500" />
            )}
            <span className="text-sm font-medium">
              {Math.abs(trend.change).toFixed(1)}% {trend.direction}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="score">Score Trend</TabsTrigger>
            <TabsTrigger value="factors">Factor Breakdown</TabsTrigger>
            <TabsTrigger value="comparison">KSLS vs GFR</TabsTrigger>
          </TabsList>
          
          <TabsContent value="score" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'KSLS Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={33} 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Stable', position: 'right', fontSize: 10 }}
                />
                <ReferenceLine 
                  y={66} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Elevated', position: 'right', fontSize: 10 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ksls" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Interpretation:</p>
              {trend.direction === 'increasing' && (
                <p>Your KSLS has increased by {Math.abs(trend.change).toFixed(1)}% over this period. Consider reviewing factors contributing to elevated stress.</p>
              )}
              {trend.direction === 'decreasing' && (
                <p>Great news! Your KSLS has decreased by {Math.abs(trend.change).toFixed(1)}% over this period. Your kidney stress management is improving.</p>
              )}
              {trend.direction === 'stable' && (
                <p>Your KSLS has remained stable over this period. Continue maintaining your current health routines.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="factors" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Contribution (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area 
                  type="monotone" 
                  dataKey="bp_contribution" 
                  stackId="1" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  name="Blood Pressure"
                />
                <Area 
                  type="monotone" 
                  dataKey="hydration_contribution" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  name="Hydration"
                />
                <Area 
                  type="monotone" 
                  dataKey="fatigue_contribution" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  name="Fatigue"
                />
                <Area 
                  type="monotone" 
                  dataKey="pain_contribution" 
                  stackId="1" 
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  name="Pain"
                />
                <Area 
                  type="monotone" 
                  dataKey="stress_contribution" 
                  stackId="1" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  name="Stress"
                />
                <Area 
                  type="monotone" 
                  dataKey="weight_contribution" 
                  stackId="1" 
                  stroke="#ec4899" 
                  fill="#ec4899" 
                  name="Weight/BMI"
                />
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Understanding Factor Contributions:</p>
              <p>This chart shows how much each factor contributes to your overall KSLS. Taller sections indicate higher stress from that factor.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="comparison" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis 
                  yAxisId="left" 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'KSLS', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  domain={[0, 120]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'GFR', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="ksls" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="KSLS (Stress)"
                />
                {chartData.some(d => d.gfr) && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="gfr" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="GFR (Function)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">KSLS vs GFR:</p>
              <p className="mb-2">
                <strong>KSLS</strong> (blue) measures daily stress on kidneys from modifiable factors like BP and hydration.
              </p>
              <p className="mb-2">
                <strong>GFR</strong> (green) measures actual kidney filtration function from blood tests.
              </p>
              <p>
                <strong>Remember:</strong> KSLS is NOT a replacement for GFR. They measure different things. 
                High KSLS doesn't mean declining kidney function, and low KSLS doesn't guarantee healthy kidneys. 
                Both are valuable for different reasons.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
