import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SliderWithLabel } from "@/components/SliderWithLabel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HealthCalendar } from "@/components/HealthCalendar";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { useToast } from "@/hooks/use-toast";
import Chart from "chart.js/auto";
import { format, subDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { HealthMetrics } from "@shared/schema";
import { 
  ChevronLeft, 
  ChevronRight, 
  Droplets, 
  Heart, 
  Activity, 
  Wind, 
  Battery, 
  Stethoscope,
  Upload,
  PlusCircle,
  CalendarDays,
  Clock,
  Pill,
  Calculator as CalculatorIcon 
} from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  taken: boolean;
}

export default function TrackPage() {
  const { toast } = useToast();
  // Use state to explicitly control active tab to prevent reset issues
  const [activeSection, setActiveSection] = useState("analytics");
  const [activeDataTab, setActiveDataTab] = useState<"hydration" | "bp" | "gfr" | "pain" | "stress" | "fatigue">("hydration");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("7d");
  
  // State for health data entry
  const [hydration, setHydration] = useState<number>(1.5);
  const [systolicBP, setSystolicBP] = useState<string>("120");
  const [diastolicBP, setDiastolicBP] = useState<string>("80");
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [painLevel, setPainLevel] = useState<number>(2);
  const [fatigueLevel, setFatigueLevel] = useState<number>(3);
  const [medicalNotes, setMedicalNotes] = useState<string>("");
  const [estimatedGFR, setEstimatedGFR] = useState<number>(70);
  const [medications, setMedications] = useState<Medication[]>([
    { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", taken: false },
    { name: "Metoprolol", dosage: "25mg", frequency: "Twice daily", taken: false },
  ]);
  
  // Chart references
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Get user context
  const { user } = useUser();
  
  // Safely access user ID without fallback to ensure correct data is shown
  // No need to manually pass userId anymore, useHealthData gets it from context
  const { 
    weeklyMetrics = [], 
    isLoadingWeekly = false,
    logHealthMetrics,
    isLogging = false,
    latestMetrics = null
  } = useHealthData();

  // Additional check to ensure we have health data for display
  useEffect(() => {
    // Log detailed health metrics status for debugging
    console.log("⚕️ Track page health metrics status:", {
      hasWeeklyData: weeklyMetrics && weeklyMetrics.length > 0,
      weeklyDataCount: weeklyMetrics?.length || 0,
      hasLatestMetric: !!latestMetrics,
      userId: user?.id,
      isLoadingWeekly
    });
    
    // If we have latest metrics available but weeklyMetrics is empty, 
    // we might have an issue with data synchronization
    if (latestMetrics && (!weeklyMetrics || weeklyMetrics.length === 0)) {
      console.log("⚠️ Latest metrics available but weekly metrics missing - data sync issue detected");
    }
  }, [weeklyMetrics, latestMetrics, user?.id, isLoadingWeekly]);
  
  // Log the number of metrics for debugging
  useEffect(() => {
    console.log("TrackPage received health metrics:", {
      count: weeklyMetrics?.length || 0,
      hasData: weeklyMetrics?.length > 0,
      dates: weeklyMetrics?.map(m => m.date),
      userId: user?.id
    });
  }, [weeklyMetrics, user?.id]);
  
  // Function to save health data
  const saveHealthData = async () => {
    // Validate inputs
    if (!systolicBP || !diastolicBP) {
      toast({
        title: "Validation Error",
        description: "Please enter both systolic and diastolic blood pressure values.",
        variant: "destructive"
      });
      return;
    }
    
    // Convert to numbers
    const systolicNum = parseInt(systolicBP, 10);
    const diastolicNum = parseInt(diastolicBP, 10);
    
    // Validate BP ranges
    if (systolicNum < 70 || systolicNum > 220 || diastolicNum < 40 || diastolicNum > 120) {
      toast({
        title: "Validation Error",
        description: "Blood pressure values appear to be outside normal ranges. Please verify.",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate estimated GFR
    const calculatedGFR = calculateEstimatedGFR();
    
    const healthData = {
      userId: user?.id, // Use directly from user object
      // Use a Date object instead of ISO string
      date: new Date(),
      hydration,
      systolicBP: systolicNum,
      diastolicBP: diastolicNum,
      painLevel,
      stressLevel,
      fatigueLevel,
      estimatedGFR: calculatedGFR,
      notes: medicalNotes
    };
    
    // Use the logHealthMetrics function from the useHealthData hook
    logHealthMetrics(healthData);
    
    // Reset form
    setMedicalNotes("");
  };
  
  // Calculate estimated GFR using a simplified approach that accounts for health metrics
  const calculateEstimatedGFR = () => {
    if (!user) return 70; // Default if no user data
    
    // Log all user data for diagnosis
    console.log("User data for GFR calculation:", {
      id: user.id,
      age: user.age,
      gender: user.gender,
      diseaseStage: user.kidneyDiseaseStage,
      height: user.height,
      weight: user.weight,
    });
    
    const age = user.age || 40; // Default to 40 if not provided
    // Get CKD stage from user profile data
    const diseaseStage = user.kidneyDiseaseStage || 1; // Default to stage 1
    
    // Base GFR based on CKD stage (simplified for demo)
    let baseGFR = 90;
    if (diseaseStage === 2) baseGFR = 75;
    else if (diseaseStage === 3) baseGFR = 45;
    else if (diseaseStage === 4) baseGFR = 25;
    else if (diseaseStage === 5) baseGFR = 15;
    
    // Adjustment factors (simplified for demo)
    const ageAdjustment = Math.max(0, (40 - age) / 100);
    
    // Try to get gender from session storage as backup
    let genderStr = '';
    
    // First try from user object
    if (user.gender) {
      genderStr = String(user.gender).toLowerCase();
      console.log("Using gender from user object:", genderStr);
    } 
    // SECURITY FIX: No localStorage fallbacks for user data
    else {
      // Use safe default when user data is incomplete
      genderStr = 'female'; // Safe default for GFR calculation
      console.log("Using safe default gender for calculation");
    }
    
    const genderFactor = genderStr === 'female' ? 0.85 : 1.0;
    
    // Health metric adjustments (simplified for demo)
    const bpFactor = 1 - Math.max(0, (Number(systolicBP) - 120) / 400);
    const hydrationFactor = 1 + (hydration / 10);
    const stressFactor = 1 - (stressLevel / 20);
    const painFactor = 1 - (painLevel / 20);
    const fatigueFactor = 1 - (fatigueLevel / 20);
    
    // Calculate adjusted GFR (without race factor - aligned with CKD-EPI 2021)
    let adjustedGFR = baseGFR * (1 + ageAdjustment) * genderFactor * 
                      bpFactor * hydrationFactor * stressFactor * painFactor * fatigueFactor;
    
    // Ensure GFR stays within reasonable bounds
    adjustedGFR = Math.min(Math.max(adjustedGFR, 5), 120);
    
    const finalGFR = Math.round(adjustedGFR);
    console.log("Calculated GFR:", finalGFR, "with factors:", {
      baseGFR,
      ageAdjustment,
      genderFactor,
      bpFactor,
      hydrationFactor,
      stressFactor,
      painFactor,
      fatigueFactor
    });
    
    return finalGFR;
  };
  
  // Toggle medication taken status
  const toggleMedication = (index: number) => {
    const updatedMedications = [...medications];
    updatedMedications[index].taken = !updatedMedications[index].taken;
    setMedications(updatedMedications);
  };
  
  // Format data based on date range for charts
  const getDateRangeData = () => {
    if (!weeklyMetrics || weeklyMetrics.length === 0) {
      return {
        labels: [],
        data: []
      };
    }
    
    const today = new Date();
    let startDate;
    
    if (dateRange === "7d") {
      startDate = subDays(today, 7);
    } else if (dateRange === "30d") {
      startDate = subDays(today, 30);
    } else {
      startDate = subDays(today, 90);
    }
    
    // Filter data within date range
    const filteredData = weeklyMetrics.filter(
      (metric: HealthMetrics) => {
        if (!metric.date) return false;
        const metricDate = new Date(metric.date);
        return metricDate >= startDate && metricDate <= today;
      }
    );
    
    // Sort by date
    const sortedData = filteredData.sort(
      (a: HealthMetrics, b: HealthMetrics) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    );
    
    // Extract labels (dates) and data points
    const labels = sortedData.map(
      (metric: HealthMetrics) => {
        if (!metric.date) return "";
        return format(new Date(metric.date), dateRange === "7d" ? "EEE" : "MM/dd");
      }
    );
    
    let dataPoints: number[];
    switch (activeDataTab) {
      case "hydration":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.hydration || 0);
        break;
      case "bp":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.systolicBP || 0);
        break;
      case "gfr":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.estimatedGFR || 0);
        break;
      case "pain":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.painLevel || 0);
        break;
      case "stress":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.stressLevel || 0);
        break;
      case "fatigue":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.fatigueLevel || 0);
        break;
      default:
        dataPoints = [];
    }
    
    return {
      labels,
      data: dataPoints
    };
  };
  
  // Update chart when data changes
  useEffect(() => {
    if (activeSection === "analytics" && chartRef.current && !isLoadingWeekly) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      const { labels, data } = getDateRangeData();

      const colors = {
        hydration: {
          border: "rgba(25, 118, 210, 1)",
          background: "rgba(25, 118, 210, 0.2)",
        },
        bp: {
          border: "rgba(236, 64, 122, 1)",
          background: "rgba(236, 64, 122, 0.2)",
        },
        gfr: {
          border: "rgba(255, 152, 0, 1)",
          background: "rgba(255, 152, 0, 0.2)",
        },
        pain: {
          border: "rgba(244, 67, 54, 1)",
          background: "rgba(244, 67, 54, 0.2)",
        },
        stress: {
          border: "rgba(156, 39, 176, 1)",
          background: "rgba(156, 39, 176, 0.2)",
        },
        fatigue: {
          border: "rgba(76, 175, 80, 1)",
          background: "rgba(76, 175, 80, 0.2)",
        },
      };

      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: getDatasetLabel(),
            data,
            backgroundColor: colors[activeDataTab].background,
            borderColor: colors[activeDataTab].border,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: colors[activeDataTab].border,
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              titleFont: {
                size: 14
              },
              bodyFont: {
                size: 14
              },
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: getMaxYValue(),
              ticks: {
                stepSize: getStepSize(),
                font: {
                  size: 12
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
  }, [weeklyMetrics, activeDataTab, dateRange, isLoadingWeekly, activeSection]);

  const getDatasetLabel = () => {
    switch (activeDataTab) {
      case "hydration":
        return "Water Intake (L)";
      case "bp":
        return "Systolic BP (mmHg)";
      case "gfr":
        return "Estimated GFR";
      case "pain":
        return "Pain Level (1-10)";
      case "stress":
        return "Stress Level (1-10)";
      case "fatigue":
        return "Fatigue Level (1-10)";
      default:
        return "";
    }
  };

  const getMaxYValue = () => {
    switch (activeDataTab) {
      case "hydration":
        return 3;
      case "bp":
        return 200;
      case "gfr":
        return 120;
      case "pain":
      case "stress":
      case "fatigue":
        return 10;
      default:
        return 100;
    }
  };

  const getStepSize = () => {
    switch (activeDataTab) {
      case "hydration":
        return 0.5;
      case "bp":
        return 20;
      case "gfr":
        return 15;
      case "pain":
      case "stress":
      case "fatigue":
        return 1;
      default:
        return 10;
    }
  };

  const calculateAverage = () => {
    const { data } = getDateRangeData();
    
    if (!data || data.length === 0) {
      return "No data";
    }
    
    const sum = data.reduce((acc: number, val: number) => acc + val, 0);
    const avg = sum / data.length;
    
    switch (activeDataTab) {
      case "hydration":
        return `${avg.toFixed(1)}L / day`;
      case "bp":
        return `${Math.round(avg)}`;
      case "gfr":
        return `${Math.round(avg)}`;
      case "pain":
      case "stress":
      case "fatigue":
        return `${avg.toFixed(1)}/10`;
      default:
        return `${avg.toFixed(1)}`;
    }
  };

  const getTrend = () => {
    const { data } = getDateRangeData();
    
    if (!data || data.length < 2) {
      return { text: "N/A", color: "text-neutral-500" };
    }
    
    // Calculate simple trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((acc: number, val: number) => acc + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc: number, val: number) => acc + val, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    // Different trends have different meanings based on the metric
    if (Math.abs(difference) < 0.1 * firstAvg) {
      return { text: "Stable", color: "text-neutral-500" };
    }
    
    if (activeDataTab === "hydration" || activeDataTab === "gfr") {
      // Higher is better for hydration and GFR
      return difference > 0 
        ? { text: "Improving", color: "text-success" }
        : { text: "Declining", color: "text-error" };
    } else {
      // Lower is better for BP, pain, stress, and fatigue
      return difference < 0 
        ? { text: "Improving", color: "text-success" }
        : { text: "Worsening", color: "text-error" };
    }
  };

  const trend = getTrend();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Health Tracking" />
      
      <main className="flex-grow pt-20 pb-20">
        <div className="px-4 py-4">
          {/* Main tabs for different views */}
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1">Calendar</TabsTrigger>
              <TabsTrigger value="log" className="flex-1">Log Health</TabsTrigger>
            </TabsList>
            
            {/* Analytics tab content */}
            <TabsContent value="analytics">
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-display font-bold text-lg">Health Analytics</h2>
                  
                  <div className="flex rounded-lg overflow-hidden border border-neutral-200">
                    <button 
                      className={`text-xs px-3 py-1.5 ${dateRange === "7d" ? "bg-primary text-white" : "bg-white text-neutral-600"}`}
                      onClick={() => setDateRange("7d")}
                    >
                      7D
                    </button>
                    <button 
                      className={`text-xs px-3 py-1.5 ${dateRange === "30d" ? "bg-primary text-white" : "bg-white text-neutral-600"}`}
                      onClick={() => setDateRange("30d")}
                    >
                      30D
                    </button>
                    <button 
                      className={`text-xs px-3 py-1.5 ${dateRange === "90d" ? "bg-primary text-white" : "bg-white text-neutral-600"}`}
                      onClick={() => setDateRange("90d")}
                    >
                      90D
                    </button>
                  </div>
                </div>
                
                <Tabs defaultValue="hydration" onValueChange={(value) => setActiveDataTab(value as any)}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="hydration" className="flex-1">Hydration</TabsTrigger>
                    <TabsTrigger value="bp" className="flex-1">BP</TabsTrigger>
                    <TabsTrigger value="gfr" className="flex-1">GFR</TabsTrigger>
                    <TabsTrigger value="pain" className="flex-1">Pain</TabsTrigger>
                    <TabsTrigger value="stress" className="flex-1">Stress</TabsTrigger>
                    <TabsTrigger value="fatigue" className="flex-1">Fatigue</TabsTrigger>
                  </TabsList>
                  
                  <div className="chart-container mb-4" style={{ height: '300px' }}>
                    {isLoadingWeekly ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <canvas ref={chartRef} id="healthDetailChart"></canvas>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-neutral-100 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 mb-1">Average</p>
                      <p className="font-bold text-lg">{calculateAverage()}</p>
                    </div>
                    <div className="bg-neutral-100 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 mb-1">Trend</p>
                      <p className={`font-bold text-lg ${trend.color}`}>{trend.text}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-medium text-sm mb-2">Insights</h3>
                    <div className="bg-neutral-100 rounded-lg p-4">
                      <p className="text-sm text-neutral-600">
                        {activeDataTab === "hydration" && "Maintaining proper hydration is crucial for kidney health. Aim for a consistent daily water intake."}
                        {activeDataTab === "bp" && "Keeping your blood pressure under control helps protect your kidneys from further damage."}
                        {activeDataTab === "gfr" && "Your GFR (Glomerular Filtration Rate) is an important indicator of kidney function. Monitor changes over time."}
                        {activeDataTab === "pain" && "Tracking pain levels can help your healthcare provider adjust your treatment plan."}
                        {activeDataTab === "stress" && "Reducing stress may help improve your overall health and potentially your kidney function."}
                        {activeDataTab === "fatigue" && "Monitoring fatigue levels is important for kidney patients. Rest when needed and discuss persistent fatigue with your healthcare provider."}
                      </p>
                    </div>
                  </div>
                </Tabs>
              </div>
            </TabsContent>
            
            {/* Calendar tab content */}
            <TabsContent value="calendar" className="space-y-6">
              {/* Medical Appointments Section */}
              <AppointmentScheduler className="w-full" />
              
              {/* Health Calendar Section */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="font-display font-bold text-lg mb-4">Health Calendar</h2>
                {/* Health Calendar Component */}
                {isLoadingWeekly ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    <span className="ml-2">Loading health data...</span>
                  </div>
                ) : weeklyMetrics && weeklyMetrics.length > 0 ? (
                  <HealthCalendar 
                    healthData={weeklyMetrics} 
                    userId={user?.id} 
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg font-medium">No health data available</p>
                    <p className="text-muted-foreground mt-2">Log your first health entry to see it on the calendar</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Log Health tab content */}
            <TabsContent value="log">
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h2 className="font-display font-bold text-lg mb-4">Log Health Data</h2>
                
                <div className="space-y-6">
                  {/* Hydration */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Droplets className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Water Intake</h3>
                    </div>
                    <SliderWithLabel
                      value={hydration}
                      onChange={setHydration}
                      min={0}
                      max={3}
                      step={0.1}
                      label={`${hydration.toFixed(1)} L`}
                    />
                  </div>
                  
                  {/* Blood Pressure */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Heart className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Blood Pressure</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        placeholder="Systolic" 
                        value={systolicBP} 
                        onChange={(e) => setSystolicBP(e.target.value)}
                        className="w-20" 
                      />
                      <span>/</span>
                      <Input 
                        type="number" 
                        placeholder="Diastolic" 
                        value={diastolicBP} 
                        onChange={(e) => setDiastolicBP(e.target.value)}
                        className="w-20" 
                      />
                      <span className="text-neutral-500 text-sm">mmHg</span>
                    </div>
                  </div>
                  
                  {/* Stress Level */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Activity className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Stress Level</h3>
                    </div>
                    <SliderWithLabel
                      value={stressLevel}
                      onChange={setStressLevel}
                      min={1}
                      max={10}
                      step={1}
                      label={`${stressLevel}/10`}
                    />
                  </div>
                  
                  {/* Pain Level */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Wind className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Pain Level</h3>
                    </div>
                    <SliderWithLabel
                      value={painLevel}
                      onChange={setPainLevel}
                      min={1}
                      max={10}
                      step={1}
                      label={`${painLevel}/10`}
                    />
                  </div>
                  
                  {/* Fatigue Level */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Battery className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Fatigue Level</h3>
                    </div>
                    <SliderWithLabel
                      value={fatigueLevel}
                      onChange={setFatigueLevel}
                      min={1}
                      max={10}
                      step={1}
                      label={`${fatigueLevel}/10`}
                    />
                  </div>
                  
                  {/* Medications */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Pill className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Medications</h3>
                    </div>
                    <div className="space-y-2">
                      {medications.map((med, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border border-neutral-200 rounded-lg">
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-sm text-neutral-500">{med.dosage} - {med.frequency}</p>
                          </div>
                          <Button 
                            variant={med.taken ? "default" : "outline"}
                            onClick={() => toggleMedication(index)}
                            className="text-xs"
                          >
                            {med.taken ? "Taken" : "Mark as Taken"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes" className="block mb-2">Notes</Label>
                    <textarea
                      id="notes"
                      className="w-full p-2 border border-neutral-200 rounded-lg"
                      rows={3}
                      placeholder="Any symptoms or notes for today..."
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                    ></textarea>
                  </div>
                  
                  {/* GFR Estimate */}
                  <div>
                    <div className="flex items-center mb-2">
                      <CalculatorIcon className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Estimated GFR</h3>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-neutral-100 px-3 py-2 rounded-lg text-lg font-bold">
                        {calculateEstimatedGFR()}
                      </div>
                      <span className="ml-2 text-neutral-500">mL/min/1.73m²</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      This is a simplified estimate based on your profile and current health metrics.
                    </p>
                  </div>
                  
                  {/* Save Button */}
                  <div className="pt-4">
                    <Button 
                      onClick={saveHealthData} 
                      className="w-full"
                      disabled={isLogging}
                    >
                      {isLogging ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></div>
                          Saving...
                        </>
                      ) : "Save Health Data"}
                    </Button>
                  </div>

                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}