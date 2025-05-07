import React, { ReactNode } from "react";
import { useHealthMonitor } from "@/hooks/useHealthMonitor";
import { HealthAlertPopup } from "@/components/HealthAlertPopup";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Initialize health monitoring
  const { 
    alert, 
    showAlert, 
    setShowAlert, 
    acknowledgeAlert,
    isLoading
  } = useHealthMonitor({
    enableCriticalAlerts: true,
    enableWarningAlerts: true,
    enableInsightAlerts: true,
    checkInterval: 60000, // Check every minute
  });

  return (
    <div className="app-container">
      {/* Render the main application content */}
      {children}

      {/* Health Alert Popup */}
      {alert && (
        <HealthAlertPopup
          open={showAlert}
          onOpenChange={setShowAlert}
          alertType={alert.type}
          metrics={alert.metrics}
          message={alert.message}
          onAcknowledge={acknowledgeAlert}
          isLoading={isLoading}
          alertId={alert.id}
        />
      )}
    </div>
  );
}

export default AppLayout;