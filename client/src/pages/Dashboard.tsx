import { useState } from "react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import WelcomeCard from "@/components/WelcomeCard";
import EmotionalCheckInCard from "@/components/EmotionalCheckInCard";
import AICompanionCard from "@/components/AICompanionCard";
import HealthTrendsCard from "@/components/HealthTrendsCard";
import TransplantRoadmapCard from "@/components/TransplantRoadmapCard";
import HealthLogging from "@/pages/HealthLogging";

export default function Dashboard() {
  const [showLoggingForm, setShowLoggingForm] = useState(false);

  const handleLogClick = () => {
    setShowLoggingForm(true);
  };

  const handleCloseLoggingForm = () => {
    setShowLoggingForm(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pt-20 pb-20">
        {showLoggingForm ? (
          <HealthLogging onClose={handleCloseLoggingForm} />
        ) : (
          <div className="px-4 py-4">
            <WelcomeCard onLogClick={handleLogClick} />
            <EmotionalCheckInCard />
            <AICompanionCard />
            <HealthTrendsCard />
            <TransplantRoadmapCard />
          </div>
        )}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
