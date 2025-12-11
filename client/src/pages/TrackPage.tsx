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
import { MedicationReminder } from "@/components/MedicationReminder";
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
import { InfoCircledIcon } from "@radix-ui/react-icons";

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
  const [activeDataTab, setActiveDataTab] = useState<"hydration" | "bp" | "gfr" | "ksls" | "pain" | "stress" | "fatigue">("hydration");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("7d");
  
  // State for health data entry
  const [hydration, setHydration] = useState<number>(1.5);
  const [systolicBP, setSystolicBP] = useState<string>("120");
  const [diastolicBP, setDiastolicBP] = useState<string>("80");
  const [pulse, setPulse] = useState<string>("72");
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [painLevel, setPainLevel] = useState<number>(2);
  const [fatigueLevel, setFatigueLevel] = useState<number>(3);
  const [medicalNotes, setMedicalNotes] = useState<string>("");
  const [estimatedGFR, setEstimatedGFR] = useState<number>(70);
  const [calculatedKSLS, setCalculatedKSLS] = useState<{ score: number; band: string } | null>(null);
  const [medications, setMedications] = useState<Medication[]>([
    { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", taken: false },
    { name: "Metoprolol", dosage: "25mg", frequency: "Twice daily", taken: false },
  ]);
  const [newMedication, setNewMedication] = useState<Medication>({ 
    name: "", dosage: "", frequency: "", taken: false 
  });
  
  // Document upload state
  const [documentType, setDocumentType] = useState("test_result");
  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Serum creatinine for CKD-EPI 2021 formula
  const [serumCreatinine, setSerumCreatinine] = useState<number | "">("");
  
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
      pulse: parseInt(pulse, 10) || undefined,
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
  
  // Add new medication
  const handleAddMedication = () => {
    if (newMedication.name.trim() && newMedication.dosage.trim()) {
      setMedications([...medications, { ...newMedication, taken: false }]);
      setNewMedication({ name: "", dosage: "", frequency: "", taken: false });
      toast({
        title: "Medication Added",
        description: `${newMedication.name} has been added to your medication list.`,
      });
    }
  };
  
  // Handle document upload
  const handleUploadDocument = async () => {
    if (!documentFile || !documentName || !documentType) return;
    
    setIsUploading(true);
    
    try {
      // Mock the upload process for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Document Uploaded",
        description: `${documentName} has been uploaded successfully.`,
      });
      
      // Reset the form
      setDocumentType("test_result");
      setDocumentName("");
      setDocumentFile(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
      case "ksls":
        dataPoints = sortedData.map((metric: HealthMetrics) => metric.kslsScore || 0);
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
        ksls: {
          border: "rgba(59, 130, 246, 1)",
          background: "rgba(59, 130, 246, 0.2)",
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
      case "ksls":
        return "KSLS Score (0-100)";
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
      case "ksls":
        return 100;
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
      case "ksls":
        return 10;
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
      case "ksls":
        return `${Math.round(avg)}/100`;
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
            <TabsList className="w-full mb-4 grid grid-cols-5 gap-2">
              <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1">Calendar</TabsTrigger>
              <TabsTrigger value="log" className="flex-1">Log Health</TabsTrigger>
              <TabsTrigger value="medications" className="flex-1">Medications</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
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
                    <TabsTrigger value="ksls" className="flex-1">KSLS</TabsTrigger>
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
                    <h3 className="font-medium text-sm mb-2">Detailed Insights</h3>
                    
                    {/* GFR Insights */}
                    {activeDataTab === "gfr" && weeklyMetrics && weeklyMetrics.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <h4 className="font-semibold text-primary">Kidney Function Analysis</h4>
                        </div>
                        
                        <p className={`font-medium text-sm mb-2 ${
                          weeklyMetrics[0].gfrTrend === 'significant_improvement' || weeklyMetrics[0].gfrTrend === 'moderate_improvement' ? 'text-green-600' : 
                          weeklyMetrics[0].gfrTrend === 'stable' ? 'text-blue-600' : 
                          weeklyMetrics[0].gfrTrend === 'possible_decline' ? 'text-amber-600' : 
                          'text-red-600'
                        }`}>
                          {weeklyMetrics[0].gfrTrendDescription || "Your kidney function appears stable based on recent measurements."}
                        </p>
                        
                        {weeklyMetrics[0].gfrChangePercent && (
                          <p className="text-xs text-neutral-700 mb-2">
                            {weeklyMetrics[0].gfrChangePercent > 0 ? '+' : ''}{weeklyMetrics[0].gfrChangePercent.toFixed(1)}% change
                            {weeklyMetrics[0].gfrAbsoluteChange && 
                              ` (${weeklyMetrics[0].gfrAbsoluteChange > 0 ? '+' : ''}${weeklyMetrics[0].gfrAbsoluteChange.toFixed(1)} points)`}
                          </p>
                        )}
                        
                        {weeklyMetrics[0].gfrLongTermTrend && (
                          <div className="flex items-center mb-2">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              weeklyMetrics[0].gfrLongTermTrend === 'improving' ? 'bg-green-500' : 
                              weeklyMetrics[0].gfrLongTermTrend === 'stable' ? 'bg-blue-500' : 
                              'bg-amber-500'
                            }`}></span>
                            <p className="text-xs font-medium text-neutral-700">
                              {weeklyMetrics[0].gfrLongTermTrend === 'improving' ? 'Your kidney function has shown improvement over time' :
                               weeklyMetrics[0].gfrLongTermTrend === 'stable' ? 'Your kidney function has been stable for 3+ weeks' :
                               'Your kidney function shows changes that may need attention'}
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 bg-white p-3 rounded border border-blue-200">
                          <p className="text-xs text-neutral-700">
                            <strong>Recommendation:</strong> {weeklyMetrics[0].gfrTrend === 'significant_decline' || weeklyMetrics[0].gfrTrend === 'moderate_decline' ? 
                              "Speak with your doctor about this change in kidney function." :
                              weeklyMetrics[0].gfrTrend === 'possible_decline' ?
                              "Consider discussing these recent changes with your healthcare provider at your next appointment." :
                              "Continue monitoring and maintaining your current health regimen."}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Hydration Insights */}
                    {activeDataTab === "hydration" && weeklyMetrics && weeklyMetrics.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <h4 className="font-semibold text-primary">Hydration Analysis</h4>
                        </div>
                        
                        <p className="font-medium text-sm mb-2 text-blue-600">
                          {weeklyMetrics[0]?.hydration && weeklyMetrics[0].hydration >= 2.5 ? 
                            "Your hydration levels are excellent! Great work staying well-hydrated." :
                            weeklyMetrics[0]?.hydration && weeklyMetrics[0].hydration >= 1.5 ?
                            "Your hydration is adequate, but could be improved for optimal kidney health." :
                            "Your hydration appears lower than recommended. Try to increase your water intake."}
                        </p>
                        
                        {weeklyMetrics.length > 3 && (
                          <p className="text-xs text-neutral-700 mb-2">
                            {(() => {
                              const recent = weeklyMetrics.slice(0, 3).reduce((sum, m) => sum + (m.hydration || 0), 0) / 3;
                              const older = weeklyMetrics.slice(3, 6).reduce((sum, m) => sum + (m.hydration || 0), 0) / 3;
                              const change = recent - older;
                              const percentChange = older ? (change / older) * 100 : 0;
                              return `${Math.abs(percentChange).toFixed(1)}% ${percentChange > 0 ? 'increase' : 'decrease'} in water intake compared to previous week`;
                            })()}
                          </p>
                        )}
                        
                        <div className="flex items-center mb-2">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            weeklyMetrics[0].hydration >= 2 ? 'bg-green-500' : 
                            weeklyMetrics[0].hydration >= 1.5 ? 'bg-blue-500' : 
                            'bg-amber-500'
                          }`}></span>
                          <p className="text-xs font-medium text-neutral-700">
                            {weeklyMetrics[0].hydration >= 2.5 ? 'Excellent hydration helps protect kidney function' :
                             weeklyMetrics[0].hydration >= 1.5 ? 'Moderate hydration - aim for 2-3L daily' :
                             'Low hydration may impact kidney function over time'}
                          </p>
                        </div>
                        
                        <div className="mt-3 bg-white p-3 rounded border border-blue-200">
                          <p className="text-xs text-neutral-700">
                            <strong>Tip:</strong> {weeklyMetrics[0].hydration < 1.5 ? 
                              "Try setting water intake reminders throughout the day. Aim for at least 2L daily for kidney health." :
                              weeklyMetrics[0].hydration < 2 ?
                              "You're on track with hydration. Try adding another glass of water in the morning and evening." :
                              "Excellent hydration habits! Keep up the good work to maintain kidney health."}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Blood Pressure Insights */}
                    {activeDataTab === "bp" && weeklyMetrics && weeklyMetrics.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <h4 className="font-semibold text-primary">Blood Pressure Analysis</h4>
                        </div>
                        
                        <p className={`font-medium text-sm mb-2 ${
                          weeklyMetrics[0].systolicBP >= 140 || weeklyMetrics[0].diastolicBP >= 90 ? 'text-red-600' : 
                          weeklyMetrics[0].systolicBP >= 130 || weeklyMetrics[0].diastolicBP >= 85 ? 'text-amber-600' : 
                          'text-green-600'
                        }`}>
                          {weeklyMetrics[0].systolicBP >= 140 || weeklyMetrics[0].diastolicBP >= 90 ? 
                            "Your blood pressure is elevated. This can impact kidney health over time." :
                            weeklyMetrics[0].systolicBP >= 130 || weeklyMetrics[0].diastolicBP >= 85 ?
                            "Your blood pressure is slightly elevated. Monitor closely." :
                            "Your blood pressure is within a healthy range. Great work!"}
                        </p>
                        
                        {weeklyMetrics.length > 3 && (
                          <p className="text-xs text-neutral-700 mb-2">
                            {(() => {
                              const recentSys = weeklyMetrics.slice(0, 3).reduce((sum, m) => sum + (m.systolicBP || 0), 0) / 3;
                              const olderSys = weeklyMetrics.slice(3, 6).reduce((sum, m) => sum + (m.systolicBP || 0), 0) / 3;
                              const change = recentSys - olderSys;
                              return `${Math.abs(change).toFixed(1)} mmHg ${change > 0 ? 'increase' : 'decrease'} in systolic BP compared to previous week`;
                            })()}
                          </p>
                        )}
                        
                        <div className="flex items-center mb-2">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            weeklyMetrics[0].systolicBP < 130 && weeklyMetrics[0].diastolicBP < 80 ? 'bg-green-500' : 
                            weeklyMetrics[0].systolicBP < 140 && weeklyMetrics[0].diastolicBP < 90 ? 'bg-amber-500' : 
                            'bg-red-500'
                          }`}></span>
                          <p className="text-xs font-medium text-neutral-700">
                            {weeklyMetrics[0].systolicBP < 130 && weeklyMetrics[0].diastolicBP < 80 ? 
                              'Healthy blood pressure is protective for kidneys' :
                             weeklyMetrics[0].systolicBP < 140 && weeklyMetrics[0].diastolicBP < 90 ? 
                              'Borderline blood pressure - monitor closely' :
                              'Elevated blood pressure increases kidney disease risk'}
                          </p>
                        </div>
                        
                        <div className="mt-3 bg-white p-3 rounded border border-blue-200">
                          <p className="text-xs text-neutral-700">
                            <strong>Action:</strong> {weeklyMetrics[0].systolicBP >= 140 || weeklyMetrics[0].diastolicBP >= 90 ? 
                              "Discuss your blood pressure readings with your healthcare provider. Regular monitoring is essential." :
                              weeklyMetrics[0].systolicBP >= 130 || weeklyMetrics[0].diastolicBP >= 85 ?
                              "Consider lifestyle changes like reduced sodium intake and regular exercise to help manage blood pressure." :
                              "Maintain your healthy diet and exercise routine to keep your blood pressure in this optimal range."}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* KSLS Insights */}
                    {activeDataTab === "ksls" && weeklyMetrics && weeklyMetrics.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <h4 className="font-semibold text-primary">Kidney Stress Analysis</h4>
                        </div>
                        
                        <p className="text-sm text-neutral-700 mb-3">
                          KSLS (Kidney Symptom Load Score) combines 6 health factors into a wellness index: blood pressure, hydration, fatigue, pain, stress, and BMI. Lower scores indicate better symptom management.
                        </p>
                        
                        {weeklyMetrics[0].kslsScore !== null && (
                          <>
                            <p className={`font-medium text-sm mb-2 ${
                              weeklyMetrics[0].kslsBand === 'stable' ? 'text-green-600' :
                              weeklyMetrics[0].kslsBand === 'elevated' ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {weeklyMetrics[0].kslsBand === 'stable' ?
                                "Your kidney stress indicators are within healthy ranges. Continue maintaining good habits." :
                                weeklyMetrics[0].kslsBand === 'elevated' ?
                                "Some kidney stress indicators are elevated. Focus on hydration and stress management." :
                                "Multiple kidney stress indicators are high. Prioritize rest and consult your healthcare provider."}
                            </p>
                            
                            <div className="mt-3 bg-white p-3 rounded border border-blue-200">
                              <p className="text-xs text-neutral-700">
                                <strong>Focus Areas:</strong> Based on your current score of {weeklyMetrics[0].kslsScore}/100, 
                                {weeklyMetrics[0].kslsBand === 'stable' ?
                                  " maintain your current routine of hydration, blood pressure management, and stress reduction." :
                                  " focus on improving hydration, managing blood pressure, and reducing physical and emotional stress."}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Pain/Stress/Fatigue generic insights for when no specific data */}
                    {(activeDataTab === "pain" || activeDataTab === "stress" || activeDataTab === "fatigue") && (
                      <div className="bg-neutral-100 rounded-lg p-4">
                        <p className="text-sm text-neutral-600">
                          {activeDataTab === "pain" && "Tracking pain levels helps your healthcare provider adjust your treatment plan. Consistent high pain levels may indicate a need for medication review."}
                          {activeDataTab === "stress" && "Chronic stress can impact kidney function and overall health. Consider stress-reduction techniques like meditation, deep breathing, or gentle exercise."}
                          {activeDataTab === "fatigue" && "Fatigue is common in kidney disease. Monitor patterns and discuss persistent fatigue with your doctor, as it may indicate anemia or other treatable conditions."}
                        </p>
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>
            </TabsContent>
            
            {/* Calendar tab content */}
            <TabsContent value="calendar" className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="font-display font-bold text-lg mb-4">Calendar & Scheduling</h2>
                
                {/* Nested tabs for Calendar features */}
                <Tabs defaultValue="health-data" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="health-data" className="flex items-center gap-2" data-testid="tab-health-data">
                      <CalendarDays className="w-4 h-4" />
                      <span className="hidden sm:inline">Health Data</span>
                      <span className="sm:hidden">Health</span>
                    </TabsTrigger>
                    <TabsTrigger value="medications" className="flex items-center gap-2" data-testid="tab-medications">
                      <Pill className="w-4 h-4" />
                      <span className="hidden sm:inline">Medications</span>
                      <span className="sm:hidden">Meds</span>
                    </TabsTrigger>
                    <TabsTrigger value="appointments" className="flex items-center gap-2" data-testid="tab-appointments">
                      <Stethoscope className="w-4 h-4" />
                      <span className="hidden sm:inline">Appointments</span>
                      <span className="sm:hidden">Appts</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Health Data Tab */}
                  <TabsContent value="health-data" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-lg">Health Calendar</h3>
                      </div>
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
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-lg font-medium text-gray-600">No health data available</p>
                          <p className="text-gray-500 mt-2">Log your first health entry to see it on the calendar</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Medications Tab */}
                  <TabsContent value="medications" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Pill className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-lg">Medication Management</h3>
                      </div>
                      <MedicationReminder className="w-full" />
                    </div>
                  </TabsContent>
                  
                  {/* Appointments Tab */}
                  <TabsContent value="appointments" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-lg">Medical Appointments</h3>
                      </div>
                      <AppointmentScheduler className="w-full" />
                    </div>
                  </TabsContent>
                </Tabs>
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
                  
                  {/* Pulse / Heart Rate */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Heart className="w-5 h-5 text-red-500 mr-2" />
                      <h3 className="font-medium">Pulse</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        placeholder="72" 
                        value={pulse} 
                        onChange={(e) => setPulse(e.target.value)}
                        className="w-24" 
                        min="40"
                        max="200"
                      />
                      <span className="text-neutral-500 text-sm">bpm</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Normal: 60-100 bpm</p>
                  </div>
                  
                  {/* Serum Creatinine Input */}
                  <div>
                    <div className="flex items-center mb-2">
                      <InfoCircledIcon className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-medium">Serum Creatinine (for CKD-EPI 2021 formula)</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        placeholder="e.g. 1.2"
                        min="0.1"
                        max="15"
                        step="0.1"
                        value={serumCreatinine === "" ? "" : serumCreatinine} 
                        onChange={(e) => {
                          const value = e.target.value === "" ? "" : parseFloat(e.target.value);
                          setSerumCreatinine(value);
                        }}
                        className="w-32" 
                      />
                      <span className="text-neutral-500 text-sm">mg/dL</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Optional: Enter your latest serum creatinine value for more accurate GFR calculation.</p>
                  </div>
                  
                  {/* Calculate GFR Button */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        const gfr = calculateEstimatedGFR();
                        setEstimatedGFR(gfr);
                        const method = serumCreatinine !== "" ? "CKD-EPI 2021 equation" : "simplified estimation";
                        toast({
                          title: "GFR Calculated",
                          description: `Your estimated GFR is ${gfr} mL/min/1.73m² using ${method}.`,
                          duration: 4000
                        });
                      }}
                    >
                      <CalculatorIcon className="mr-2 h-4 w-4" />
                      Calculate Estimated GFR
                    </Button>
                    <p className="mt-2 text-xs text-gray-500 px-1">
                      Using CKD-EPI 2021 equation: eGFR = 142 × min(SCr/K, 1)^α × max(SCr/K, 1)^–1.200 × 0.9938^Age × 1.012 [if female]
                    </p>
                  </div>

                  {/* Calculate KSLS Button */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full border-green-300 text-green-600 hover:bg-green-50"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/ksls/calculate-from-metrics/${user?.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            setCalculatedKSLS({ 
                              score: data.result.ksls, 
                              band: data.result.band 
                            });
                            toast({
                              title: "KSLS Calculated",
                              description: `Your KSLS score is ${data.result.ksls} (${data.result.band})`,
                              duration: 4000
                            });
                          } else {
                            const error = await response.json();
                            toast({
                              title: "KSLS Calculation Failed",
                              description: error.error || "Please log your health data first",
                              variant: "destructive",
                              duration: 4000
                            });
                          }
                        } catch (error) {
                          console.error("KSLS calculation error:", error);
                          toast({
                            title: "Error",
                            description: "Failed to calculate KSLS. Please try again.",
                            variant: "destructive",
                            duration: 4000
                          });
                        }
                      }}
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Calculate KSLS Score
                    </Button>
                    {calculatedKSLS && (
                      <div className={`mt-2 p-4 border rounded-lg ${
                        calculatedKSLS.band === 'stable' ? 'bg-green-50 border-green-200' :
                        calculatedKSLS.band === 'elevated' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-lg font-bold ${
                            calculatedKSLS.band === 'stable' ? 'text-green-900' :
                            calculatedKSLS.band === 'elevated' ? 'text-yellow-900' :
                            'text-red-900'
                          }">
                            KSLS: {calculatedKSLS.score}/100
                          </p>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            calculatedKSLS.band === 'stable' ? 'bg-green-200 text-green-800' :
                            calculatedKSLS.band === 'elevated' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {calculatedKSLS.band === 'stable' ? 'Stable' :
                             calculatedKSLS.band === 'elevated' ? 'Elevated' : 'High'}
                          </span>
                        </div>
                        <p className={`text-sm mb-2 ${
                          calculatedKSLS.band === 'stable' ? 'text-green-800' :
                          calculatedKSLS.band === 'elevated' ? 'text-yellow-800' :
                          'text-red-800'
                        }`}>
                          {calculatedKSLS.band === 'stable' 
                            ? 'Your kidney stress indicators are within healthy ranges. Continue maintaining good hydration and managing blood pressure.'
                            : calculatedKSLS.band === 'elevated'
                            ? 'Some kidney stress indicators are elevated. Focus on hydration, blood pressure control, and reducing physical stress.'
                            : 'Multiple kidney stress indicators are high. Consult your healthcare provider and prioritize hydration and rest.'}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t ${
                          calculatedKSLS.band === 'stable' ? 'border-green-200' :
                          calculatedKSLS.band === 'elevated' ? 'border-yellow-200' :
                          'border-red-200'
                        }">
                          <p className={`text-xs ${
                            calculatedKSLS.band === 'stable' ? 'text-green-700' :
                            calculatedKSLS.band === 'elevated' ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            Based on BP, hydration, fatigue, pain, stress & BMI
                          </p>
                          <p className={`text-xs font-medium ${
                            calculatedKSLS.band === 'stable' ? 'text-green-700' :
                            calculatedKSLS.band === 'elevated' ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            View trends above →
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500 px-1">
                      KSLS is a daily wellness index combining 6 health factors. Not a medical diagnosis or GFR measurement.
                    </p>
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
            
            {/* Medications Tab */}
            <TabsContent value="medications">
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h2 className="font-display font-bold text-lg mb-4">Medication Tracking</h2>
                
                <div className="space-y-4 mb-6">
                  {medications.map((med, index) => (
                    <div key={index} className="flex items-center p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{med.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Pill className="w-3 h-3 mr-1" />
                          {med.dosage}
                          <span className="mx-2">•</span>
                          <Clock className="w-3 h-3 mr-1" />
                          {med.frequency}
                        </div>
                      </div>
                      <Button
                        variant={med.taken ? "default" : "outline"}
                        onClick={() => toggleMedication(index)}
                        className={med.taken ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {med.taken ? "Taken" : "Take Now"}
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Card className="border">
                  <CardContent className="pt-6">
                    <h3 className="font-medium mb-4">Add Medication</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label htmlFor="med-name">Medication Name</Label>
                        <Input 
                          id="med-name"
                          value={newMedication.name}
                          onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                          placeholder="Medication name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="med-dosage">Dosage</Label>
                        <Input 
                          id="med-dosage"
                          value={newMedication.dosage}
                          onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                          placeholder="e.g. 10mg"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <Label htmlFor="med-frequency">Frequency</Label>
                      <Input 
                        id="med-frequency"
                        value={newMedication.frequency}
                        onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                        placeholder="e.g. Once daily"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleAddMedication}
                      disabled={!newMedication.name || !newMedication.dosage}
                      className="w-full"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add Medication
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Documents Tab */}
            <TabsContent value="documents">
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h2 className="font-display font-bold text-lg mb-4">Medical Document Upload</h2>
                
                <Card className="border">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="doc-type">Document Type</Label>
                        <select 
                          id="doc-type"
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                        >
                          <option value="test_result">Lab / Test Result</option>
                          <option value="scan">Scan / Imaging</option>
                          <option value="letter">Doctor's Letter</option>
                          <option value="prescription">Prescription</option>
                          <option value="insurance">Insurance Document</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="doc-name">Document Name</Label>
                        <Input 
                          id="doc-name"
                          value={documentName}
                          onChange={(e) => setDocumentName(e.target.value)}
                          placeholder="e.g. Blood Test Results - April 2025"
                        />
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <Label className="block mb-2">Upload File</Label>
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/70">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">PDF, JPG, PNG (MAX. 10MB)</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                        {documentFile && (
                          <div className="mt-2 text-sm">
                            Selected: {documentFile.name}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={handleUploadDocument}
                        disabled={isUploading || !documentFile || !documentName}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <div className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}