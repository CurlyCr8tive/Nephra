import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SliderWithLabel } from "@/components/SliderWithLabel";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { RouteComponentProps } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
// No FileUpload component yet
import { Upload, PlusCircle, CalendarDays, Clock, Pill } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";

interface HealthLoggingProps extends RouteComponentProps {
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
  const [activeTab, setActiveTab] = useState("health");
  const { toast } = useToast();
  
  // Get user context
  const { user } = useUser();
  
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
  
  // Use the health data hook only if we have a user ID
  // Default to ID 1 for demo purposes if user is null (for testing only)
  const userId = user?.id || 1;
  const healthDataHook = useHealthData({ userId });
  
  const isLogging = healthDataHook.isLogging;
  
  // Create a wrapper function for the mutation to handle the TypeScript error
  const logHealthMetrics = async (data: any) => {
    if (healthDataHook.logHealthMetrics) {
      console.log("Logging health metrics via hook:", data);
      return healthDataHook.logHealthMetrics(data);
    } else {
      // If hook is not available (likely due to user authentication issues),
      // attempt a direct API call as fallback
      console.warn("No health data hook available, trying direct API call");
      
      try {
        const response = await fetch("/api/health-metrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Health metrics API error:", errorText);
          throw new Error(errorText || "Failed to save health data");
        }
        
        console.log("Health metrics saved successfully via direct API");
        return await response.json();
      } catch (error) {
        console.error("Error saving health metrics:", error);
        throw error;
      }
    }
  };
  
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
  
  // Local function to estimate GFR (simplified version of server calculation)
  const calculateGFR = (): number | null => {
    if (!user || !user.age || !user.gender || !user.race || !user.weight || 
        !user.kidneyDiseaseStage || systolicBP === "" || !painLevel || !stressLevel) {
      return null;
    }
    
    // Base GFR range based on kidney disease stage (simplified)
    let baseGFR = 90;
    const diseaseStage = user.kidneyDiseaseStage;
    
    if (diseaseStage === 1) baseGFR = 90;
    else if (diseaseStage === 2) baseGFR = 75;
    else if (diseaseStage === 3) baseGFR = 45;
    else if (diseaseStage === 4) baseGFR = 25;
    else if (diseaseStage === 5) baseGFR = 15;
    
    // Adjustment factors (simplified for demo)
    const ageAdjustment = Math.max(0, (40 - user.age) / 100);
    const genderFactor = user.gender.toLowerCase() === 'female' ? 0.85 : 1.0;
    const raceFactor = user.race.toLowerCase() === 'black' ? 1.2 : 1.0;
    
    // Health metric adjustments (simplified for demo)
    const bpFactor = 1 - Math.max(0, (Number(systolicBP) - 120) / 400);
    const hydrationFactor = 1 + (hydration / 10);
    const stressFactor = 1 - (stressLevel / 20);
    const painFactor = 1 - (painLevel / 20);
    
    // Calculate adjusted GFR
    let adjustedGFR = baseGFR * (1 + ageAdjustment) * genderFactor * 
                      raceFactor * bpFactor * hydrationFactor * 
                      stressFactor * painFactor;
    
    // Ensure result is within reasonable bounds for the disease stage
    adjustedGFR = Math.min(adjustedGFR, 120);
    adjustedGFR = Math.max(adjustedGFR, 5);
    
    return Math.round(adjustedGFR);
  };
  
  // Update estimated GFR when health metrics change
  useEffect(() => {
    setEstimatedGFR(calculateGFR());
  }, [user, hydration, systolicBP, diastolicBP, painLevel, stressLevel]);
  
  const handleSave = async () => {
    try {
      // Reset save success state
      setSaveSuccess(false);
      
      // Calculate the estimated GFR client-side to show immediately
      const gfr = calculateGFR();
      setEstimatedGFR(gfr);
      
      // Check if we have a user, otherwise use userId from state
      if (!user && userId !== 1) {
        console.error("No user data available for saving health metrics");
        throw new Error("User data is missing");
      }
      
      console.log("Saving health metrics with userId:", userId);
      
      // Prepare the health metrics data to save
      const metricsData = {
        userId: user?.id || userId,
        date: new Date(),
        hydration,
        systolicBP: systolicBP !== "" ? Number(systolicBP) : undefined,
        diastolicBP: diastolicBP !== "" ? Number(diastolicBP) : undefined,
        painLevel,
        stressLevel,
        fatigueLevel,
        estimatedGFR: gfr || undefined
      };
      
      console.log("Health metrics data to save:", metricsData);
      
      // Save the health metrics
      const result = await logHealthMetrics(metricsData);
      console.log("Health metrics saved successfully:", result);
      
      // Show success state
      setSaveSuccess(true);
      
      // Show a toast confirmation
      toast({
        title: "Data saved successfully",
        description: "Your health metrics have been recorded and GFR estimated.",
        duration: 3000
      });
      
      // Reset success state after a delay
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (onClose) onClose();
    } catch (error) {
      console.error("Error logging health data:", error);
      
      // Show an error toast
      toast({
        title: "Unable to save data",
        description: "There was a problem saving your health metrics. Please try again.",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  const handleMedicationToggle = (index: number) => {
    const updatedMedications = [...medications];
    updatedMedications[index].taken = !updatedMedications[index].taken;
    setMedications(updatedMedications);
  };

  const handleAddMedication = () => {
    if (newMedication.name.trim() && newMedication.dosage.trim()) {
      setMedications([...medications, { ...newMedication, taken: false }]);
      setNewMedication({ name: "", dosage: "", frequency: "", taken: false });
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile || !documentName || !documentType) return;
    
    setIsUploading(true);
    
    try {
      // Mock the upload process for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset the form
      setDocumentType("test_result");
      setDocumentName("");
      setDocumentFile(null);
      
      // Success message would be shown here
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Health Tracking" />
      
      <main className="flex-grow pt-16 pb-20 px-4">
        <Tabs defaultValue="health" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="health">Health Data</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          {/* Health Data Tab */}
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {/* Hydration Input */}
                <div className="mb-6">
                  <h3 className="font-medium text-sm mb-3">Hydration Tracking</h3>
                  
                  <div className="mb-4">
                    <SliderWithLabel
                      label="Water Intake"
                      min={0}
                      max={2.5}
                      step={0.1}
                      value={hydration}
                      onChange={setHydration}
                      unit="L"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1 bg-primary-light bg-opacity-20 text-primary"
                      onClick={() => setHydration(Math.min(2.5, hydration + 0.25))}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">Add 250ml</span>
                    </Button>
                  </div>
                </div>
                
                {/* Blood Pressure Input */}
                <div className="mb-6">
                  <h3 className="font-medium text-sm mb-3">Blood Pressure</h3>
                  
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-sm text-neutral-600 block mb-1">Systolic</label>
                      <input 
                        type="number" 
                        placeholder="120" 
                        className="w-full border border-neutral-300 rounded-lg p-3 text-center text-lg"
                        value={systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-xs text-neutral-500 block text-center mt-1">mmHg</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xl font-light text-neutral-400">/</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-neutral-600 block mb-1">Diastolic</label>
                      <input 
                        type="number" 
                        placeholder="80" 
                        className="w-full border border-neutral-300 rounded-lg p-3 text-center text-lg"
                        value={diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-xs text-neutral-500 block text-center mt-1">mmHg</span>
                    </div>
                  </div>
                </div>
                
                {/* Pain Level Input */}
                <div className="mb-6">
                  <SliderWithLabel
                    label="Pain Level"
                    min={0}
                    max={10}
                    step={1}
                    value={painLevel}
                    onChange={setPainLevel}
                    unit="/10"
                    leftLabel="No pain"
                    centerLabel="Moderate"
                    rightLabel="Severe"
                    color="accent"
                  />
                </div>
                
                {/* Stress Level Input */}
                <div className="mb-6">
                  <SliderWithLabel
                    label="Stress Level"
                    min={0}
                    max={10}
                    step={1}
                    value={stressLevel}
                    onChange={setStressLevel}
                    unit="/10"
                    leftLabel="Relaxed"
                    centerLabel="Moderate"
                    rightLabel="Very stressed"
                    color="accent"
                  />
                </div>
                
                {/* Fatigue Level Input */}
                <div className="mb-6">
                  <SliderWithLabel
                    label="Fatigue Level"
                    min={0}
                    max={10}
                    step={1}
                    value={fatigueLevel}
                    onChange={setFatigueLevel}
                    unit="/10"
                    leftLabel="Energetic"
                    centerLabel="Moderate"
                    rightLabel="Exhausted"
                    color="accent"
                  />
                </div>
                
                {/* Estimated GFR Display */}
                {estimatedGFR !== null && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">Estimated GFR</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-3xl font-bold text-blue-700">{estimatedGFR}</div>
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
          </TabsContent>
          
          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-4">Medication Tracking</h3>
                
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
                        onClick={() => handleMedicationToggle(index)}
                        className={med.taken ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {med.taken ? "Taken" : "Take Now"}
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="border rounded-md p-4 space-y-3">
                  <h4 className="font-medium">Add Medication</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
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
                  
                  <div>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-4">Medical Document Upload</h3>
                
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
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
