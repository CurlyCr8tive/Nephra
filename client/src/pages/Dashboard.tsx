import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import WelcomeCard from "@/components/WelcomeCard";
import EmotionalCheckInCard from "@/components/EmotionalCheckInCard";
import AICompanionCard from "@/components/AICompanionCard";
import HealthTrendsCard from "@/components/HealthTrendsCard";
import TransplantRoadmapCard from "@/components/TransplantRoadmapCard";
import { EnhancedTrendAnalysis } from "@/components/EnhancedTrendAnalysis";
import HealthStatusCard from "@/components/HealthStatusCard";
import { KSLSCompact } from "@/components/KSLSCard";
import { useHealthData } from "@/hooks/useHealthData";
import { useUser } from "@/contexts/UserContext";
import { useKSLSFromMetrics } from "@/hooks/useKSLS";
import HealthMetricAlert from "@/components/HealthMetricAlert";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false);
  
  // Get user data to ensure we're properly authenticated
  const { user } = useUser();
  
  // Pre-fetch health data for better performance
  const { weeklyMetrics, latestMetrics, isLoadingWeekly } = useHealthData();
  
  // Fetch KSLS for current user
  const { data: kslsData } = useKSLSFromMetrics(user?.id);
  
  useEffect(() => {
    if (user) {
      console.log("Dashboard loaded with authenticated user:", user.username);
      console.log("User ID:", user.id);
    }
    
    // Log data loading status and metrics to help debug
    if (!isLoadingWeekly) {
      console.log("Health data loaded:", {
        weeklyMetricsCount: weeklyMetrics?.length || 0,
        hasLatestMetrics: !!latestMetrics
      });
    }
    
    // Toggle enhanced analysis view after data loads based on available data
    if (!isLoadingWeekly && weeklyMetrics && weeklyMetrics.length > 0) {
      setShowEnhancedAnalysis(true);
    }
  }, [user, weeklyMetrics, latestMetrics, isLoadingWeekly]);

  const handleLogClick = () => {
    navigate("/track");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pt-20 pb-20">
        <div className="px-4 py-4">
          <WelcomeCard onLogClick={handleLogClick} />
          
          {/* KSLS Widget - Prioritized above GFR (doesn't require creatinine) */}
          {kslsData ? (
            <div className="mb-4">
              <KSLSCompact 
                result={kslsData.result} 
                onClick={() => {
                  // Scroll to the health trends section on the same page
                  const trendsSection = document.getElementById('health-trends');
                  if (trendsSection) {
                    trendsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              />
            </div>
          ) : (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                   onClick={handleLogClick}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Track Your Kidney Symptom Load (KSLS)
                    </h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Get instant insights without needing creatinine levels. Just log your daily health metrics:
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                        Blood pressure
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                        Hydration, fatigue, pain, stress levels
                      </li>
                    </ul>
                    <div className="mt-3 text-xs font-medium text-blue-800 flex items-center gap-1">
                      <span>Tap to log your first entry</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <HealthStatusCard />
          <EmotionalCheckInCard />
          
          {/* Show enhanced analysis if there's data, otherwise show basic trends */}
          <div id="health-trends">
            {showEnhancedAnalysis ? (
              <EnhancedTrendAnalysis />
            ) : (
              <HealthTrendsCard />
            )}
          </div>
          
          <AICompanionCard />
          <TransplantRoadmapCard />
          
          {/* Display health metric alerts if we have latest metrics data */}
          {latestMetrics && (
            <HealthMetricAlert metrics={latestMetrics} />
          )}
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
