/**
 * KSLS (Kidney Stress Load Score) Display Card
 * 
 * Shows the current KSLS score with visual band indicator,
 * top contributing factors, and interpretation.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { KSLSResult, KSLSInterpretation } from '@/hooks/useKSLS';
import { KSLSInfoDialog } from './KSLSInfoDialog';

interface KSLSCardProps {
  result: KSLSResult;
  interpretation: KSLSInterpretation;
  showDetails?: boolean;
}

const getBandColor = (band: 'stable' | 'elevated' | 'high') => {
  switch (band) {
    case 'stable':
      return 'bg-green-500';
    case 'elevated':
      return 'bg-yellow-500';
    case 'high':
      return 'bg-red-500';
  }
};

const getBandIcon = (band: 'stable' | 'elevated' | 'high') => {
  switch (band) {
    case 'stable':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'elevated':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'high':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
  }
};

const getBandText = (band: 'stable' | 'elevated' | 'high') => {
  switch (band) {
    case 'stable':
      return 'Stable';
    case 'elevated':
      return 'Elevated';
    case 'high':
      return 'High';
  }
};

const getFactorLabel = (factor: string): string => {
  const labels: Record<string, string> = {
    'blood pressure': 'Blood Pressure',
    'hydration': 'Hydration',
    'fatigue': 'Fatigue',
    'pain': 'Pain',
    'stress': 'Stress',
    'weight': 'Weight/BMI',
  };
  return labels[factor] || factor;
};

export function KSLSCard({ result, interpretation, showDetails = true }: KSLSCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                Kidney Stress Load Score
                <Badge 
                  variant={result.band === 'stable' ? 'default' : 'destructive'}
                  className={getBandColor(result.band)}
                >
                  {getBandText(result.band)}
                </Badge>
              </CardTitle>
              <KSLSInfoDialog>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </KSLSInfoDialog>
            </div>
            <CardDescription>
              Daily wellness index (not GFR or diagnosis)
            </CardDescription>
          </div>
          {getBandIcon(result.band)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">KSLS Score</span>
            <span className="text-3xl font-bold">{result.ksls.toFixed(1)}</span>
          </div>
          <Progress 
            value={result.ksls} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 (Low Stress)</span>
            <span>100 (High Stress)</span>
          </div>
        </div>

        {/* Summary */}
        <Alert>
          <AlertDescription>{interpretation.summary}</AlertDescription>
        </Alert>

        {/* Top Contributing Factors */}
        {interpretation.top_factors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Top Contributors
            </h4>
            <div className="flex flex-wrap gap-2">
              {interpretation.top_factors.map((factor, idx) => (
                <Badge key={idx} variant="outline">
                  {getFactorLabel(factor)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Explanation */}
        {showDetails && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold">What This Means</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {interpretation.detail}
            </p>
          </div>
        )}

        {/* Personalized Context (if available) */}
        {interpretation.personalized_context && showDetails && (
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              For You
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {interpretation.personalized_context}
            </p>
          </div>
        )}

        {/* Factor Breakdown (if showing details) */}
        {showDetails && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold">Factor Breakdown</h4>
            <div className="space-y-2 text-xs">
              <FactorBar label="Blood Pressure" value={result.factors.bp_norm} />
              <FactorBar label="Hydration" value={result.factors.hydro_norm} />
              {result.factors.fatigue_norm !== null && (
                <FactorBar label="Fatigue" value={result.factors.fatigue_norm} />
              )}
              {result.factors.pain_norm !== null && (
                <FactorBar label="Pain" value={result.factors.pain_norm} />
              )}
              {result.factors.stress_norm !== null && (
                <FactorBar label="Stress" value={result.factors.stress_norm} />
              )}
              <FactorBar label="Weight/BMI" value={result.factors.weight_norm} />
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              BMI: {result.bmi.toFixed(1)}
            </p>
          </div>
        )}

        {/* Safety Note */}
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900">
            {interpretation.safety_note}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Factor Bar - Shows normalized stress level for each factor
 */
function FactorBar({ label, value }: { label: string; value: number }) {
  const percentage = value * 100;
  const colorClass = 
    value < 0.33 ? 'bg-green-500' :
    value < 0.66 ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Compact KSLS Display - For dashboards/summaries
 */
interface KSLSCompactProps {
  result: KSLSResult;
  onClick?: () => void;
}

export function KSLSCompact({ result, onClick }: KSLSCompactProps) {
  return (
    <div 
      className={`p-4 rounded-lg border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">KSLS</p>
          <KSLSInfoDialog>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
          </KSLSInfoDialog>
        </div>
        <Badge 
          className={getBandColor(result.band)}
        >
          {getBandText(result.band)}
        </Badge>
      </div>
      <p className="text-2xl font-bold">{result.ksls.toFixed(0)}</p>
      <p className="text-xs text-muted-foreground mt-1">Tap for details & trends</p>
    </div>
  );
}
