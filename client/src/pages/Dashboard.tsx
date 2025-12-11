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
import { useHealthData } from "@/hooks/useHealthData";
import { useUser } from "@/contexts/UserContext";
import HealthMetricAlert from "@/components/HealthMetricAlert";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false);
  
  // Get user data to ensure we're properly authenticated
  const { user } = useUser();
  
  // Pre-fetch health data for better performance
  const { weeklyMetrics, latestMetrics, isLoadingWeekly } = useHealthData();
  
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
          <HealthStatusCard />
          <EmotionalCheckInCard />
          
          {/* Show enhanced analysis if there's data, otherwise show basic trends */}
          {showEnhancedAnalysis ? (
            <EnhancedTrendAnalysis />
          ) : (
            <HealthTrendsCard />
          )}
          
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
