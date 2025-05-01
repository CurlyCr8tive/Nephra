import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SliderWithLabel } from "@/components/SliderWithLabel";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { RouteComponentProps } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// No FileUpload component yet
import { Upload, PlusCircle, CalendarDays, Clock, Pill, Calculator as CalculatorIcon } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { HealthCalendar } from "@/components/HealthCalendar";
import { UnitToggle } from "@/components/UnitToggle";
import { FeetInchesInput } from "@/components/FeetInchesInput";
import { lbsToKg, kgToLbs, feetInchesToCm, cmToFeetInches } from "@/lib/unit-conversions";

// Define UnitSystem type
type UnitSystem = "metric" | "imperial";

interface HealthLoggingProps extends Partial<RouteComponentProps> {
  onClose?: () => void;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  taken: boolean;
}

export default function HealthLogging(props: HealthLoggingProps) {
  const { onClose } = props;
  // Use state to explicitly control active tab to prevent reset issues
  const [activeTab, setActiveTab] = useState("health");
  const { toast } = useToast();
  
  // Get user context
  const { user, unitSystem: contextUnitSystem, setUnitSystem: setContextUnitSystem } = useUser();
  
  // Log a warning if user is null and attempt to get it from API
  useEffect(() => {
    if (!user) {
      console.warn("No user data available in HealthLogging component, checking API...");
      
      // Try to fetch directly from API
      fetch('/api/user', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Unable to fetch user');
      })
      .then(userData => {
        console.log("Retrieved user data from API:", userData?.username);
      })
      .catch(error => {
        console.error("Error fetching user from API:", error);
      });
    } else {
      console.log("User data available in HealthLogging:", user.username);
    }
  }, [user]);
  
  // Use the health data hook with the current user ID
  const healthDataHook = useHealthData();
  
  const isLogging = healthDataHook.isLogging;
  
  // Health metrics state
  const [hydration, setHydration] = useState(1.2);
  const [systolicBP, setSystolicBP] = useState<number | "">("");
  const [diastolicBP, setDiastolicBP] = useState<number | "">("");
  const [painLevel, setPainLevel] = useState(4);
  const [stressLevel, setStressLevel] = useState(6);
  const [fatigueLevel, setFatigueLevel] = useState(5);

  // Medication tracking state
  const [medications, setMedications] = useState<Medication[]>([
    { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", taken: false },
    { name: "Vitamin D", dosage: "2000 IU", frequency: "Once daily", taken: false }
  ]);
  const [newMedication, setNewMedication] = useState<Medication>({ 
    name: "", dosage: "", frequency: "", taken: false 
  });
  
  // Document upload state
  const [documentType, setDocumentType] = useState("test_result");
  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State to track save success and GFR estimation
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [estimatedGFR, setEstimatedGFR] = useState<number | null>(null);
  
  // State for serum creatinine input (for CKD-EPI formula)
  const [serumCreatinine, setSerumCreatinine] = useState<number | "">("");
  
  // Unit system and measurements - use context unit system
  const [weight, setWeight] = useState<number | "">("");
  const [weightLbs, setWeightLbs] = useState<number | "">("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(8);

  // Weight conversion handlers
  const handleWeightChange = (newValue: number | "") => {
    if (newValue === "") {
      setWeight("");
      setWeightLbs("");
      return;
    }
    
    if (contextUnitSystem === "metric") {
      setWeight(newValue);
      setWeightLbs(kgToLbs(newValue));
    } else {
      setWeightLbs(newValue);
      setWeight(lbsToKg(newValue));
    }
  };

  // Height conversion handlers
  const handleHeightChange = (heightCmValue: number) => {
    setHeightCm(heightCmValue);
    const { feet, inches } = cmToFeetInches(heightCmValue);
    setHeightFeet(feet);
    setHeightInches(inches);
  };

  // Handle form submission
  const handleSave = async () => {
    if (isLogging) return;
    
    try {
      // Prepare health metrics data
      const healthData = {
        userId: user?.id || 3, // Fallback to demo user ID if not logged in
        timestamp: new Date().toISOString(),
        hydration,
        systolicBP: systolicBP === "" ? null : systolicBP,
        diastolicBP: diastolicBP === "" ? null : diastolicBP,
        painLevel,
        stressLevel,
        fatigueLevel,
        weight: weight === "" ? null : weight,
        height: heightCm === "" ? null : heightCm,
        serumCreatinine: serumCreatinine === "" ? null : serumCreatinine,
        estimatedGFR,
        medications: medications.filter(med => med.taken).map(med => med.name),
      };
      
      // Send data to backend
      await healthDataHook.logHealthMetrics(healthData);
      
      // Show success message
      setSaveSuccess(true);
      
      // Reset success message after a delay
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error saving health data:", error);
      toast({
        title: "Error",
        description: "Failed to save health data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header title="Track Health" hasBackButton onBackClick={onClose} />
      
      <main className="flex-1 container py-6 space-y-6 mb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="health">
              Health
            </TabsTrigger>
            <TabsTrigger value="medications">
              Medications
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents
            </TabsTrigger>
          </TabsList>
          
          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Log Health Metrics</CardTitle>
                <CardDescription>Track your daily health measurements</CardDescription>
                
                {/* Unit System Toggle */}
                <div className="flex items-center justify-end mt-2">
                  <UnitToggle 
                    showLabels
                    compact
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Pain Level Slider */}
                <SliderWithLabel
                  label="Pain Level"
                  min={1}
                  max={10}
                  step={1}
                  value={painLevel}
                  onChange={setPainLevel}
                  description="Rate your pain from 1 (none) to 10 (severe)"
                  showValue={true}
                />
                
                {/* Stress Level Slider */}
                <SliderWithLabel
                  label="Stress Level"
                  min={1}
                  max={10}
                  step={1}
                  value={stressLevel}
                  onChange={setStressLevel}
                  description="Rate your stress from 1 (none) to 10 (severe)"
                  showValue={true}
                />
                
                {/* Fatigue Level Slider */}
                <SliderWithLabel
                  label="Fatigue Level"
                  min={1}
                  max={10}
                  step={1}
                  value={fatigueLevel}
                  onChange={setFatigueLevel}
                  description="How tired are you feeling today? (1-10)"
                  showValue={true}
                />
                
                {/* Hydration Slider */}
                <SliderWithLabel
                  label={`Daily Water Intake (${contextUnitSystem === "metric" ? "liters" : "fl oz"})`}
                  min={0}
                  max={contextUnitSystem === "metric" ? 4 : 135}
                  step={contextUnitSystem === "metric" ? 0.1 : 1}
                  value={contextUnitSystem === "metric" ? hydration : hydration * 33.814}
                  onChange={(val) => setHydration(contextUnitSystem === "metric" ? val : val / 33.814)}
                  description="Track your daily water consumption"
                  showValue={true}
                  valueFormat={(val) => contextUnitSystem === "metric" ? 
                    `${val.toFixed(1)} L` : 
                    `${Math.round(val)} fl oz`
                  }
                />
                
                {/* Blood Pressure Input */}
                <div className="space-y-2">
                  <Label htmlFor="blood-pressure" className="font-medium">Blood Pressure</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        id="systolic"
                        type="number"
                        placeholder="Systolic"
                        min="70"
                        max="200"
                        value={systolicBP === "" ? "" : systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value === "" ? "" : parseInt(e.target.value))}
                      />
                      <span className="text-xs text-muted-foreground mt-1 block">Systolic</span>
                    </div>
                    <span className="text-xl font-medium">/</span>
                    <div className="flex-1">
                      <Input
                        id="diastolic"
                        type="number"
                        placeholder="Diastolic"
                        min="40"
                        max="120"
                        value={diastolicBP === "" ? "" : diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value === "" ? "" : parseInt(e.target.value))}
                      />
                      <span className="text-xs text-muted-foreground mt-1 block">Diastolic</span>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">mmHg</span>
                  </div>
                </div>
                
                {/* Weight Input with Unit Conversion */}
                <div className="mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <InfoCircledIcon className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="weight" className="font-medium text-sm">
                        Weight {contextUnitSystem === "metric" ? "(kg)" : "(lb)"}
                      </Label>
                    </div>
                    <Input
                      id="weight"
                      type="number"
                      placeholder={contextUnitSystem === "metric" ? "Enter weight in kg" : "Enter weight in pounds"}
                      min="1"
                      max={contextUnitSystem === "metric" ? "200" : "440"}
                      step={contextUnitSystem === "metric" ? "0.1" : "1"}
                      value={contextUnitSystem === "metric" ? (weight === "" ? "" : weight) : (weightLbs === "" ? "" : weightLbs)}
                      onChange={(e) => {
                        const value = e.target.value === "" ? "" : Number(e.target.value);
                        handleWeightChange(value);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                {/* Height Input with Unit Conversion */}
                <div className="mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <InfoCircledIcon className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="height" className="font-medium text-sm">
                        Height {contextUnitSystem === "metric" ? "(cm)" : "(ft/in)"}
                      </Label>
                    </div>
                    
                    {contextUnitSystem === "metric" ? (
                      <Input
                        id="height"
                        type="number"
                        placeholder="Enter height in cm"
                        min="50"
                        max="250"
                        step="1"
                        value={heightCm === "" ? "" : heightCm}
                        onChange={(e) => {
                          const value = e.target.value === "" ? "" : Number(e.target.value);
                          setHeightCm(value);
                          
                          if (value !== "") {
                            const { feet, inches } = cmToFeetInches(Number(value));
                            setHeightFeet(feet);
                            setHeightInches(inches);
                          }
                        }}
                        className="w-full"
                      />
                    ) : (
                      <FeetInchesInput
                        value={heightCm === "" ? null : Number(heightCm)}
                        onChange={handleHeightChange}
                      />
                    )}
                  </div>
                </div>
                
                {/* Serum Creatinine Input for CKD-EPI Formula */}
                <div className="mb-4">
                  <div className="flex flex-col mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <InfoCircledIcon className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="creatinine" className="font-medium text-sm">
                        Serum Creatinine (for CKD-EPI 2021 formula)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="creatinine"
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
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">mg/dL</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional: Enter your latest serum creatinine value for more accurate calculation.
                    </p>
                  </div>
                </div>
                
                {/* GFR Calculation Button */}
                <div className="mb-4">
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      // Calculate GFR using CKD-EPI 2021 equation
                      if (!user || !user.age || !user.gender) {
                        toast({
                          title: "Missing Information",
                          description: "Please update your profile with age and gender to calculate GFR.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Check if we have serum creatinine
                      if (serumCreatinine === "") {
                        toast({
                          title: "Missing Information",
                          description: "Please enter your serum creatinine value for an accurate GFR calculation.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Prepare values for calculation
                      const age = user.age;
                      const gender = user.gender.toLowerCase();
                      const scr = typeof serumCreatinine === 'string' ? parseFloat(serumCreatinine) : serumCreatinine;
                      
                      // Constants based on gender
                      const k = gender === 'female' ? 0.7 : 0.9;
                      const alpha = gender === 'female' ? -0.241 : -0.302;
                      
                      // Calculate GFR using CKD-EPI 2021 equation
                      const min_scr_k = Math.min(scr / k, 1);
                      const max_scr_k = Math.max(scr / k, 1);
                      
                      const gfr = 142 * 
                        Math.pow(min_scr_k, alpha) * 
                        Math.pow(max_scr_k, -1.200) * 
                        Math.pow(0.9938, age) * 
                        (gender === 'female' ? 1.012 : 1);
                      
                      setEstimatedGFR(gfr);
                      
                      // Show success message
                      toast({
                        title: "GFR Calculated",
                        description: `Your estimated GFR is ${gfr.toFixed(1)} mL/min/1.73m² using the CKD-EPI 2021 equation.`,
                        duration: 4000
                      });
                    }}
                  >
                    <CalculatorIcon className="mr-2 h-4 w-4" />
                    Calculate Estimated GFR
                  </Button>
                  <p className="mt-1 text-xs text-gray-500 px-1">
                    Using CKD-EPI 2021 equation: eGFR = 142 × min(SCr/K, 1)^α × max(SCr/K, 1)^–1.200 × 0.9938^Age × 1.012 [if female]
                  </p>
                </div>
                
                {/* Estimated GFR Display */}
                {estimatedGFR !== null && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">Estimated GFR</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-3xl font-bold text-blue-700">{estimatedGFR.toFixed(1)}</div>
                        <div className="ml-2 text-sm text-blue-600">mL/min/1.73m²</div>
                      </div>
                      <div className="text-sm text-blue-600 max-w-[60%]">
                        {estimatedGFR >= 90 ? (
                          <span>Normal kidney function</span>
                        ) : estimatedGFR >= 60 ? (
                          <span>Mildly reduced kidney function</span>
                        ) : estimatedGFR >= 45 ? (
                          <span>Mild to moderate reduction in kidney function</span>
                        ) : estimatedGFR >= 30 ? (
                          <span>Moderate to severe reduction in kidney function</span>
                        ) : estimatedGFR >= 15 ? (
                          <span>Severely reduced kidney function</span>
                        ) : (
                          <span>Kidney failure</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-600">
                      <strong>Note:</strong> This is an estimate based on your current health data. For clinical purposes, please consult your healthcare provider.
                    </div>
                  </div>
                )}
                
                <Button
                  className={`w-full ${saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={handleSave}
                  disabled={isLogging}
                >
                  {isLogging ? "Saving..." : saveSuccess ? "Data Saved Successfully! ✓" : "Save Health Data"}
                </Button>
                
                {/* Success message that appears when data is saved */}
                {saveSuccess && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your health data has been successfully recorded
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Health Log Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Health Log Calendar</CardTitle>
                <CardDescription>View and track your health metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Improved HealthCalendar rendering to handle load state and 
                    consistent display even when no data is available yet */}
                <div className="health-calendar-container">
                  {healthDataHook.isLoadingWeekly ? (
                    <div className="text-center p-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-3"></div>
                      <p className="text-muted-foreground">Loading health data...</p>
                    </div>
                  ) : healthDataHook.weeklyMetrics && healthDataHook.weeklyMetrics.length > 0 ? (
                    <HealthCalendar 
                      healthData={healthDataHook.weeklyMetrics} 
                      userId={user?.id}
                    />
                  ) : (
                    <div>
                      <p className="text-muted-foreground text-center mb-4">No health data yet. Start logging to see your health calendar!</p>
                      <HealthCalendar 
                        healthData={[]} 
                        userId={user?.id}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-4">Medication Tracking</h3>
                
                <div className="space-y-4 mb-6">
                  {medications.map((med, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-md flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{med.name}</div>
                        <div className="text-sm text-muted-foreground">{med.dosage} - {med.frequency}</div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant={med.taken ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const updatedMeds = [...medications];
                            updatedMeds[index].taken = !updatedMeds[index].taken;
                            setMedications(updatedMeds);
                          }}
                          className={med.taken ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {med.taken ? "Taken ✓" : "Mark as Taken"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Add New Medication</h4>
                  <div className="space-y-3 mb-4">
                    <Input
                      placeholder="Medication Name"
                      value={newMedication.name}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          name: e.target.value,
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Dosage (e.g. 10mg)"
                        value={newMedication.dosage}
                        onChange={(e) =>
                          setNewMedication({
                            ...newMedication,
                            dosage: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Frequency (e.g. Once daily)"
                        value={newMedication.frequency}
                        onChange={(e) =>
                          setNewMedication({
                            ...newMedication,
                            frequency: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (newMedication.name && newMedication.dosage && newMedication.frequency) {
                        setMedications([...medications, newMedication]);
                        setNewMedication({
                          name: "",
                          dosage: "",
                          frequency: "",
                          taken: false,
                        });
                      } else {
                        toast({
                          title: "Missing Information",
                          description: "Please complete all fields to add a medication.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-4">Upload Medical Documents</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document-type">Document Type</Label>
                      <select
                        id="document-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                      >
                        <option value="test_result">Test Result</option>
                        <option value="prescription">Prescription</option>
                        <option value="appointment">Appointment</option>
                        <option value="discharge">Discharge Summary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="document-name">Document Name</Label>
                      <Input
                        id="document-name"
                        placeholder="e.g. Blood Test June 2025"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="document-file">Select File</Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="document-file"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (max. 10MB)</p>
                        </div>
                        <input
                          id="document-file"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDocumentFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {documentFile && (
                      <p className="text-sm text-blue-600">
                        Selected: {documentFile.name} ({(documentFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                  
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!documentName || !documentFile) {
                        toast({
                          title: "Missing Information",
                          description: "Please provide a name and select a file to upload.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      setIsUploading(true);
                      
                      // Simulate upload
                      setTimeout(() => {
                        setIsUploading(false);
                        setDocumentName("");
                        setDocumentFile(null);
                        
                        toast({
                          title: "Document Uploaded",
                          description: "Your document has been uploaded successfully.",
                        });
                      }, 2000);
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
                
                <div className="mt-8">
                  <h4 className="font-medium mb-4">Recent Documents</h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 border rounded-md flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded mr-3">
                          <CalendarDays className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">Nephrologist Appointment</div>
                          <div className="text-xs text-muted-foreground">Uploaded: April 15, 2025</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                    
                    <div className="p-3 border rounded-md flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded mr-3">
                          <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">Blood Test Results</div>
                          <div className="text-xs text-muted-foreground">Uploaded: April 10, 2025</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                    
                    <div className="p-3 border rounded-md flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-2 rounded mr-3">
                          <Pill className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium">Prescription Renewal</div>
                          <div className="text-xs text-muted-foreground">Uploaded: April 5, 2025</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation />
    </div>
  );
}