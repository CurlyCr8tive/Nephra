import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/contexts/UserContext';

export interface HealthMetric {
  id: number;
  userId: number;
  date: string;
  metric: string;
  value: number;
}

export interface HealthAlert {
  id?: number;
  userId?: number;
  type: 'critical' | 'warning' | 'insight';
  message?: string;
  metrics: {
    name: string;
    value: number | string;
    threshold?: number | string;
  }[];
  timestamp: string;
  isAcknowledged?: boolean;
  acknowledgedAt?: string | null;
}

interface MonitorConfig {
  checkInterval?: number; // milliseconds
  enableCriticalAlerts?: boolean; 
  enableWarningAlerts?: boolean;
  enableInsightAlerts?: boolean;
}

const defaultConfig: MonitorConfig = {
  checkInterval: 60000, // Check every minute
  enableCriticalAlerts: true,
  enableWarningAlerts: true,
  enableInsightAlerts: true
};

export function useHealthMonitor(config: MonitorConfig = {}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const mergedConfig = { ...defaultConfig, ...config };
  
  const [alert, setAlert] = useState<HealthAlert | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  
  // Define threshold values
  const thresholds = {
    systolicBP: 160,
    diastolicBP: 100,
    hydration: 40, // percentage
    pain: 8,
    stress: 8,
    fatigue: 8
  };
  
  // Get recent health metrics
  const { data: healthMetrics } = useQuery({
    queryKey: ['/api/health-metrics', user?.id],
    enabled: !!user,
  });
  
  // Get recent journal entries for AI insights
  const { data: journalEntries } = useQuery({
    queryKey: ['/api/journal-entries', user?.id],
    enabled: !!user && mergedConfig.enableInsightAlerts,
  });
  
  // Get unacknowledged alerts
  const { data: healthAlerts } = useQuery({
    queryKey: ['/api/health-alerts', user?.id],
    enabled: !!user,
    refetchInterval: mergedConfig.checkInterval,
  });
  
  // Mutation to save alerts to the database
  const saveAlertMutation = useMutation({
    mutationFn: async (alertData: HealthAlert) => {
      const response = await apiRequest('POST', '/api/health-alerts', {
        userId: user?.id,
        type: alertData.type,
        message: alertData.message,
        metrics: alertData.metrics,
        timestamp: alertData.timestamp
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-alerts', user?.id] });
    }
  });
  
  // Mutation to acknowledge an alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await apiRequest('POST', `/api/health-alerts/${alertId}/acknowledge`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-alerts', user?.id] });
    }
  });
  
  // Check health metrics against thresholds
  const checkHealthMetrics = () => {
    if (!healthMetrics || !Array.isArray(healthMetrics) || healthMetrics.length === 0) {
      return;
    }
    
    // Sort by date (most recent first)
    const sortedMetrics = [...healthMetrics].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Group the most recent metrics by type
    const latestMetricsByType: Record<string, HealthMetric> = {};
    
    for (const metric of sortedMetrics) {
      if (!latestMetricsByType[metric.metric]) {
        latestMetricsByType[metric.metric] = metric;
      }
    }
    
    // Check for critical values
    const criticalMetrics = [];
    
    if (mergedConfig.enableCriticalAlerts) {
      // Check blood pressure
      const systolicBP = latestMetricsByType['systolicBP'];
      if (systolicBP && systolicBP.value > thresholds.systolicBP) {
        criticalMetrics.push({
          name: 'Systolic Blood Pressure',
          value: systolicBP.value,
          threshold: thresholds.systolicBP
        });
      }
      
      const diastolicBP = latestMetricsByType['diastolicBP'];
      if (diastolicBP && diastolicBP.value > thresholds.diastolicBP) {
        criticalMetrics.push({
          name: 'Diastolic Blood Pressure',
          value: diastolicBP.value,
          threshold: thresholds.diastolicBP
        });
      }
      
      // Check hydration
      const hydration = latestMetricsByType['hydration'];
      if (hydration && hydration.value < thresholds.hydration) {
        criticalMetrics.push({
          name: 'Hydration',
          value: `${hydration.value}%`,
          threshold: `${thresholds.hydration}%`
        });
      }
      
      // Check pain, stress, fatigue
      const pain = latestMetricsByType['pain'];
      if (pain && pain.value > thresholds.pain) {
        criticalMetrics.push({
          name: 'Pain Level',
          value: pain.value,
          threshold: thresholds.pain
        });
      }
      
      const stress = latestMetricsByType['stress'];
      if (stress && stress.value > thresholds.stress) {
        criticalMetrics.push({
          name: 'Stress Level',
          value: stress.value,
          threshold: thresholds.stress
        });
      }
      
      const fatigue = latestMetricsByType['fatigue'];
      if (fatigue && fatigue.value > thresholds.fatigue) {
        criticalMetrics.push({
          name: 'Fatigue Level',
          value: fatigue.value,
          threshold: thresholds.fatigue
        });
      }
    }
    
    // If critical metrics found, set alert
    if (criticalMetrics.length > 0) {
      const newAlert: HealthAlert = {
        type: 'critical',
        metrics: criticalMetrics,
        timestamp: new Date().toISOString()
      };
      
      setAlert(newAlert);
      setShowAlert(true);
      
      // Save alert to database
      saveAlertMutation.mutate(newAlert);
      return;
    }
    
    // Add checks for warning alerts (consecutive days with high values)
    // This would require more complex logic and historical data analysis
    
    // Add AI insights from journal entries (simplified example)
    if (mergedConfig.enableInsightAlerts && journalEntries && Array.isArray(journalEntries) && journalEntries.length > 0) {
      // This is a simplified example of how you might analyze journal entries
      // In a real implementation, you would use NLP or similar techniques
      
      const concerningKeywords = ['fatigued every day', 'still in pain', 'hard to breathe', 'not eating', 'can\'t sleep'];
      const recentEntries = journalEntries.slice(0, 5); // Last 5 entries
      
      const foundConcerns = concerningKeywords.filter(keyword => 
        recentEntries.some(entry => 
          entry.content && entry.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      if (foundConcerns.length > 0) {
        const insightAlert: HealthAlert = {
          type: 'insight',
          metrics: foundConcerns.map(concern => ({
            name: 'Journal Insight',
            value: concern
          })),
          message: `We've noticed potential concerns in your recent journal entries: ${foundConcerns.join(', ')}`,
          timestamp: new Date().toISOString()
        };
        
        setAlert(insightAlert);
        setShowAlert(true);
        
        // Save insight to database
        saveAlertMutation.mutate(insightAlert);
      }
    }
  };
  
  // Process alerts from the server
  useEffect(() => {
    if (healthAlerts && Array.isArray(healthAlerts) && healthAlerts.length > 0) {
      // Find any unacknowledged alerts, starting with critical ones
      const criticalAlerts = healthAlerts.filter(a => a.type === 'critical' && !a.isAcknowledged);
      const warningAlerts = healthAlerts.filter(a => a.type === 'warning' && !a.isAcknowledged);
      const insightAlerts = healthAlerts.filter(a => a.type === 'insight' && !a.isAcknowledged);
      
      // Display the most important unacknowledged alert
      if (criticalAlerts.length > 0 && mergedConfig.enableCriticalAlerts) {
        setAlert(criticalAlerts[0]);
        setShowAlert(true);
      } else if (warningAlerts.length > 0 && mergedConfig.enableWarningAlerts) {
        setAlert(warningAlerts[0]);
        setShowAlert(true);
      } else if (insightAlerts.length > 0 && mergedConfig.enableInsightAlerts) {
        setAlert(insightAlerts[0]);
        setShowAlert(true);
      }
    }
  }, [healthAlerts]);

  // Run health checks periodically and when data changes
  useEffect(() => {
    checkHealthMetrics();
    
    const interval = setInterval(() => {
      checkHealthMetrics();
    }, mergedConfig.checkInterval);
    
    return () => clearInterval(interval);
  }, [healthMetrics, journalEntries]);
  
  // Acknowledge the current alert
  const acknowledgeAlert = () => {
    if (alert && alert.id) {
      acknowledgeAlertMutation.mutate(alert.id);
      setShowAlert(false);
    } else {
      setShowAlert(false);
    }
  };
  
  return {
    alert,
    showAlert,
    setShowAlert,
    acknowledgeAlert,
    checkNow: checkHealthMetrics,
    healthAlerts,
    isLoading: saveAlertMutation.isPending || acknowledgeAlertMutation.isPending
  };
}