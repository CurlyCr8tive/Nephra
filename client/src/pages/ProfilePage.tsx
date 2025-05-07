import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CalendarIcon, 
  PlusCircle, 
  X, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileCheck,
  Info 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { UnitToggle, UnitSystem } from "@/components/UnitToggle";

export default function ProfilePage() {
  // Use userId state to dynamically fetch profile data
  const [userId, setUserId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Helper functions to safely handle form values with proper typing
  
  // Safely get array values from the form
  function getSafeFormArray<T>(fieldValue: unknown): T[] {
    if (Array.isArray(fieldValue)) return fieldValue as T[];
    if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
      // Handle comma-separated string
      return fieldValue.split(',').filter(item => item.trim() !== '') as unknown as T[];
    }
    return [] as T[];
  }
  
  const getHealthConditions = (): string[] => {
    const conditions = form.getValues("otherHealthConditions");
    return getSafeFormArray<string>(conditions);
  };
  
  interface Specialist {
    name: string;
    specialty: string;
    phone: string;
  }
  
  const getSpecialists = (): Specialist[] => {
    const specialists = form.getValues("otherSpecialists");
    return getSafeFormArray<Specialist>(specialists);
  };
  
  // Get real user data from auth context
  const { user: authUser } = useAuth();
  
  // Get user data from UserContext for gender and unit system operations
  const { user: userContext, forceUpdateGender, refreshUserData, unitSystem, setUnitSystem } = useUser();
  
  // Update userId and user state when authUser changes
  useEffect(() => {
    if (authUser) {
      setUserId(authUser.id);
    }
  }, [authUser]);
  
  // No longer need error toast since we're using auth context

  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [otherCondition, setOtherCondition] = useState("");
  const [otherSpecialist, setOtherSpecialist] = useState({
    name: "",
    specialty: "",
    phone: ""
  });
  
  // State for medication form
  const [medication, setMedication] = useState<Medication>({
    name: "",
    dosage: "",
    frequency: "",
    time: "",
    notes: ""
  });

  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("insurance");
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Medication interface
  interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    time: string; // e.g., "morning", "evening", or specific time
    notes: string;
  }
  
  // Document interface
  interface DocumentInfo {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: string;
    url: string;
  }

  // Define user profile interface matching the API response
  interface UserProfile {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    age: number | null;
    gender: string | null;
    weight: number | null;
    height: number | null; // Height in cm
    race: string | null;
    kidneyDiseaseType: string | null;
    kidneyDiseaseStage: number | null;
    diagnosisDate: string | null;
    otherHealthConditions: string[] | null;
    primaryCareProvider: string | null;
    nephrologist: string | null;
    otherSpecialists: Array<{name: string, specialty: string, phone: string}> | null;
    medications: Medication[] | null; // Added medications array
    insuranceProvider: string | null;
    insurancePolicyNumber: string | null;
    transplantCenter: string | null;
    transplantCoordinator: string | null;
    transplantCoordinatorPhone: string | null;
    // Health preference settings
    recommendedDailyHydration: number | null; // in liters
    targetBloodPressureSystolic: number | null;
    targetBloodPressureDiastolic: number | null;
    preferredHydrationUnit: string | null; // 'liters' or 'cups'
    createdAt: string | null;
  }

  // Fetch user profile data
  const { data: profileData, isLoading } = useQuery<UserProfile>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  // Define the form schema
  const formSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    age: z.number().min(0).max(120).optional().nullable(),
    gender: z.string().optional(),
    weight: z.number().min(0).optional().nullable(), 
    height: z.number().min(0).max(300).optional().nullable(), // Height in cm (max 300 cm)
    race: z.string().optional(),
    kidneyDiseaseType: z.string().optional(),
    kidneyDiseaseStage: z.number().min(1).max(5).optional().nullable(),
    diagnosisDate: z.date().optional().nullable(),
    otherHealthConditions: z.array(z.string()).optional().nullable(),
    primaryCareProvider: z.string().optional(),
    nephrologist: z.string().optional(),
    otherSpecialists: z.array(z.object({
      name: z.string(),
      specialty: z.string(),
      phone: z.string()
    })).optional().nullable(),
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      time: z.string(),
      notes: z.string().optional()
    })).optional().nullable(),
    insuranceProvider: z.string().optional(),
    insurancePolicyNumber: z.string().optional(),
    transplantCenter: z.string().optional(),
    transplantCoordinator: z.string().optional(),
    transplantCoordinatorPhone: z.string().optional(),
    // Health preference settings
    recommendedDailyHydration: z.number().min(0).max(10).optional().nullable(),
    targetBloodPressureSystolic: z.number().min(90).max(200).optional().nullable(),
    targetBloodPressureDiastolic: z.number().min(60).max(120).optional().nullable(),
    preferredHydrationUnit: z.string().optional().nullable(),
  });

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      age: null,
      gender: "",
      weight: null,
      height: null,
      race: "",
      kidneyDiseaseType: "",
      kidneyDiseaseStage: null,
      diagnosisDate: null,
      otherHealthConditions: [],
      primaryCareProvider: "",
      nephrologist: "",
      otherSpecialists: [],
      medications: [], // Empty medications array
      insuranceProvider: "",
      insurancePolicyNumber: "",
      transplantCenter: "",
      transplantCoordinator: "",
      transplantCoordinatorPhone: "",
      // Health preference settings with defaults
      recommendedDailyHydration: 2.5, // Default 2.5 liters
      targetBloodPressureSystolic: 120, // Default healthy systolic
      targetBloodPressureDiastolic: 80, // Default healthy diastolic
      preferredHydrationUnit: "liters", // Default unit
    }
  });

  // Update form values when profile data is loaded
  useEffect(() => {
    if (profileData) {
      form.reset({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        age: profileData.age || null,
        gender: profileData.gender || "",
        weight: profileData.weight || null,
        height: profileData.height || null,
        race: profileData.race || "",
        kidneyDiseaseType: profileData.kidneyDiseaseType || "",
        kidneyDiseaseStage: profileData.kidneyDiseaseStage || null,
        diagnosisDate: profileData.diagnosisDate ? new Date(profileData.diagnosisDate) : null,
        otherHealthConditions: profileData.otherHealthConditions || [],
        primaryCareProvider: profileData.primaryCareProvider || "",
        nephrologist: profileData.nephrologist || "",
        otherSpecialists: profileData.otherSpecialists || [],
        medications: profileData.medications || [],
        insuranceProvider: profileData.insuranceProvider || "",
        insurancePolicyNumber: profileData.insurancePolicyNumber || "",
        transplantCenter: profileData.transplantCenter || "",
        transplantCoordinator: profileData.transplantCoordinator || "",
        transplantCoordinatorPhone: profileData.transplantCoordinatorPhone || "",
        // Health preference settings
        recommendedDailyHydration: profileData.recommendedDailyHydration || 2.5,
        targetBloodPressureSystolic: profileData.targetBloodPressureSystolic || 120,
        targetBloodPressureDiastolic: profileData.targetBloodPressureDiastolic || 80,
        preferredHydrationUnit: profileData.preferredHydrationUnit || "liters",
      });
    }
  }, [profileData, form]);

  // Update profile mutation
  // Function to manually fetch user profile data after an update
  const fetchUserProfile = async () => {
    console.log("Manually fetching fresh user profile data...");
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }
      
      const freshUserData = await response.json();
      console.log("Fresh user profile data retrieved:", freshUserData);
      return freshUserData;
    } catch (err) {
      console.error("Error fetching fresh user profile:", err);
      return null;
    }
  };

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (data: any) => {
      console.log("Updating profile with data:", data);
      console.log("User ID:", userId);
      
      try {
        // Try using fetch directly with more logging
        const url = `/api/users/${userId}`;
        console.log("Making request to:", url);
        
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        console.log("Response status:", response.status);
        const responseData = await response.text();
        console.log("Response body:", responseData);
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}: ${responseData}`);
        }
        
        return responseData ? JSON.parse(responseData) : {};
      } catch (err) {
        console.error("Profile update error:", err);
        throw err;
      }
    },
    onSuccess: async (data) => {
      console.log("Profile update success:", data);
      
      // Immediately fetch fresh user data after update
      const freshUserData = await fetchUserProfile();
      
      if (freshUserData) {
        // Update query cache
        queryClient.setQueryData(["/api/user"], freshUserData);
        queryClient.setQueryData([`/api/users/${userId}`], freshUserData);
        
        console.log("User cache updated with fresh profile data:", freshUserData);
      }
      
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${userId}`]
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/user"]
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error("Profile update error details:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Form submitted with values:", values);
    
    // Explicitly log gender for debugging
    console.log("Gender value from form:", values.gender);
    
    // CRITICAL: Ensure gender is explicitly saved as a string to avoid type issues
    const dataToSave = {
      ...values,
      gender: values.gender || "" // Ensure gender is always a string, never null
    };
    
    console.log("Submitting profile data with gender:", dataToSave.gender);
    updateProfile(dataToSave);
    
    // Force a global user context refresh and explicitly update the gender
    console.log("Forcing user context refresh after profile update");
    
    // First explicitly update gender in our UserContext
    if (dataToSave.gender) {
      console.log("Explicitly forcing gender update to:", dataToSave.gender);
      forceUpdateGender(dataToSave.gender);
    }
    
    // Always refresh user data in both contexts
    refreshUserData();
    
    // Refresh the user data through the query client
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };

  // Handle adding other health condition
  const addHealthCondition = () => {
    if (otherCondition.trim()) {
      const currentConditions = form.getValues("otherHealthConditions") || [];
      form.setValue("otherHealthConditions", [...currentConditions, otherCondition.trim()]);
      setOtherCondition("");
    }
  };

  // Handle removing health condition
  const removeHealthCondition = (condition: string) => {
    const currentConditions = form.getValues("otherHealthConditions") || [];
    form.setValue("otherHealthConditions", currentConditions.filter(c => c !== condition));
  };
  
  // Document handling functions
  useEffect(() => {
    if (userId) {
      fetchUserDocuments();
    }
  }, [userId]);
  
  const fetchUserDocuments = async () => {
    if (!userId || !supabase) {
      toast({
        title: "Storage not available",
        description: "Document storage is currently unavailable. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data: docData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
        
      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }
      
      if (docData) {
        const processedDocs = await Promise.all(docData.map(async (doc) => {
          // Get signed URL for each document
          const { data: urlData } = await supabase
            .storage
            .from('documents')
            .createSignedUrl(`${userId}/${doc.filename}`, 3600);
            
          return {
            id: doc.id,
            name: doc.originalName || doc.filename,
            type: doc.documentType || 'other',
            size: doc.fileSize || 0,
            createdAt: doc.createdAt,
            url: urlData?.signedUrl || ''
          };
        }));
        
        setDocuments(processedDocs);
      }
    } catch (err) {
      console.error('Error processing documents:', err);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const uploadDocument = async () => {
    if (!selectedFile || !userId || !supabase) {
      toast({
        title: "Upload error",
        description: !selectedFile 
          ? "Please select a file to upload" 
          : "Document storage is unavailable. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Create a unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      // Upload file to Supabase Storage with custom progress tracking
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      
      // Set progress to complete after successful upload
      setUploadProgress(100);
      
      // Save document metadata to Supabase DB
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          userId: userId,
          filename: fileName,
          originalName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          documentType: documentType,
          createdAt: new Date().toISOString()
        });
        
      if (dbError) {
        throw new Error(dbError.message);
      }
      
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
      
      // Reset state and refresh documents
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchUserDocuments();
      
    } catch (error: any) {
      setUploadError(error.message);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const deleteDocument = async (documentId: string) => {
    if (!userId || !supabase) {
      toast({
        title: "Error",
        description: "Document storage is unavailable. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // First get the document to get the filename
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('filename')
        .eq('id', documentId)
        .single();
        
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([`${userId}/${document.filename}`]);
        
      if (storageError) {
        throw new Error(storageError.message);
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
        
      if (dbError) {
        throw new Error(dbError.message);
      }
      
      // Update local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle adding other specialist
  const addSpecialist = () => {
    if (otherSpecialist.name.trim() && otherSpecialist.specialty.trim()) {
      const currentSpecialists = form.getValues("otherSpecialists") || [];
      form.setValue("otherSpecialists", [...currentSpecialists, { 
        name: otherSpecialist.name.trim(), 
        specialty: otherSpecialist.specialty.trim(), 
        phone: otherSpecialist.phone.trim() 
      }]);
      setOtherSpecialist({ name: "", specialty: "", phone: "" });
    }
  };

  // Handle removing specialist
  const removeSpecialist = (specialist: { name: string, specialty: string, phone: string }) => {
    const currentSpecialists = form.getValues("otherSpecialists") || [];
    form.setValue("otherSpecialists", currentSpecialists.filter(s => 
      s.name !== specialist.name || s.specialty !== specialist.specialty));
  };
  
  // Helper function to get current medications
  const getMedications = (): Medication[] => {
    const meds = form.getValues("medications");
    return getSafeFormArray<Medication>(meds);
  };
  
  // Handle adding medication
  const addMedication = () => {
    if (medication.name.trim() && medication.dosage.trim() && medication.frequency.trim()) {
      const currentMedications = form.getValues("medications") || [];
      form.setValue("medications", [...currentMedications, { 
        name: medication.name.trim(), 
        dosage: medication.dosage.trim(), 
        frequency: medication.frequency.trim(),
        time: medication.time.trim(),
        notes: medication.notes.trim()
      }]);
      setMedication({ name: "", dosage: "", frequency: "", time: "", notes: "" });
    }
  };
  
  // Handle removing medication
  const removeMedication = (medToRemove: Medication) => {
    const currentMedications = form.getValues("medications") || [];
    form.setValue("medications", currentMedications.filter(med => 
      med.name !== medToRemove.name || med.dosage !== medToRemove.dosage));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Profile" />
      
      <main className="flex-grow pt-20 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profile Information</CardTitle>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(false)} variant="outline">
                  Cancel
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="personal" className="w-full" onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="medical">Medical</TabsTrigger>
                        <TabsTrigger value="care">Care Team</TabsTrigger>
                        <TabsTrigger value="preferences">Health Preferences</TabsTrigger>
                      </TabsList>
                      
                      {/* Personal Information Tab */}
                      <TabsContent value="personal" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="First name" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Last name" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Email address" 
                                  {...field} 
                                  disabled={!isEditing} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="age"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Age</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="Age" 
                                    {...field} 
                                    disabled={!isEditing}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    // Regular form update
                                    field.onChange(value);
                                    
                                    // CRITICAL FIX: Also immediately update gender via ProfileUpdate component
                                    // This ensures gender is saved in multiple ways for redundancy
                                    if (isEditing && value) {
                                      console.log("🔄 Gender selected, immediately updating context:", value);
                                      
                                      // Force update in UserContext for immediate GFR calculations
                                      forceUpdateGender(value);
                                      
                                      // Also immediately save to server via PATCH endpoint
                                      // for maximum redundancy in persistence
                                      if (userId) {
                                        console.log("⚡ Gender immediate PATCH update:", value);
                                        fetch(`/api/users/${userId}`, {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({ gender: value }),
                                        })
                                        .then(response => {
                                          if (response.ok) {
                                            console.log("✅ Gender PATCH success");
                                          } else {
                                            console.error("❌ Gender PATCH failed");
                                          }
                                          return response.json();
                                        })
                                        .catch(err => console.error("❌ Gender PATCH error:", err));
                                      }
                                    }
                                  }}
                                  defaultValue={field.value}
                                  disabled={!isEditing}
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="weight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight (kg)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="Weight" 
                                    {...field} 
                                    disabled={!isEditing}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="height"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Height (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="Height" 
                                    {...field} 
                                    disabled={!isEditing}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="race"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Race/Ethnicity</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Race/Ethnicity" 
                                  {...field} 
                                  disabled={!isEditing} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      {/* Medical Information Tab */}
                      <TabsContent value="medical" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="kidneyDiseaseType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kidney Disease Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={!isEditing}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select kidney disease type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="chronic_kidney_disease">Chronic Kidney Disease (CKD)</SelectItem>
                                  <SelectItem value="polycystic_kidney_disease">Polycystic Kidney Disease (PKD)</SelectItem>
                                  <SelectItem value="glomerulonephritis">Glomerulonephritis</SelectItem>
                                  <SelectItem value="diabetic_nephropathy">Diabetic Nephropathy</SelectItem>
                                  <SelectItem value="hypertensive_nephropathy">Hypertensive Nephropathy</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="kidneyDiseaseStage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kidney Disease Stage</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                                disabled={!isEditing}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">Stage 1</SelectItem>
                                  <SelectItem value="2">Stage 2</SelectItem>
                                  <SelectItem value="3">Stage 3</SelectItem>
                                  <SelectItem value="4">Stage 4</SelectItem>
                                  <SelectItem value="5">Stage 5 (ESRD)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="diagnosisDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Diagnosis Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      disabled={!isEditing}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-2">
                          <FormLabel>Other Health Conditions</FormLabel>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {getHealthConditions().map((condition: string, index: number) => (
                              <Badge 
                                key={index} 
                                variant="outline"
                                className="py-1 flex items-center gap-1"
                              >
                                {condition}
                                {isEditing && (
                                  <X 
                                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive" 
                                    onClick={() => removeHealthCondition(condition)}
                                  />
                                )}
                              </Badge>
                            ))}
                          </div>
                          
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add health condition"
                                value={otherCondition}
                                onChange={(e) => setOtherCondition(e.target.value)}
                                className="flex-1"
                              />
                              <Button 
                                type="button" 
                                size="sm"
                                onClick={addHealthCondition}
                                disabled={!otherCondition.trim()}
                              >
                                <PlusCircle className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      {/* Care Team Tab */}
                      <TabsContent value="care" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="primaryCareProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Care Provider</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Primary care doctor" 
                                  {...field} 
                                  disabled={!isEditing} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="nephrologist"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nephrologist</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Kidney doctor" 
                                  {...field} 
                                  disabled={!isEditing} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-2">
                          <FormLabel>Other Specialists</FormLabel>
                          <div className="space-y-3">
                            {getSpecialists().map((specialist: Specialist, index: number) => (
                              <div 
                                key={index} 
                                className="p-3 border rounded-md relative"
                              >
                                {isEditing && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => removeSpecialist(specialist)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                <div className="font-medium">{specialist.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Specialty:</span> {specialist.specialty}
                                </div>
                                {specialist.phone && (
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Phone:</span> {specialist.phone}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {isEditing && (
                            <div className="border rounded-md p-3 space-y-3 mt-3">
                              <div>
                                <FormLabel htmlFor="specialist-name">Name</FormLabel>
                                <Input
                                  id="specialist-name"
                                  placeholder="Specialist name"
                                  value={otherSpecialist.name}
                                  onChange={(e) => setOtherSpecialist({...otherSpecialist, name: e.target.value})}
                                />
                              </div>
                              <div>
                                <FormLabel htmlFor="specialist-specialty">Specialty</FormLabel>
                                <Input
                                  id="specialist-specialty"
                                  placeholder="Specialty"
                                  value={otherSpecialist.specialty}
                                  onChange={(e) => setOtherSpecialist({...otherSpecialist, specialty: e.target.value})}
                                />
                              </div>
                              <div>
                                <FormLabel htmlFor="specialist-phone">Phone (optional)</FormLabel>
                                <Input
                                  id="specialist-phone"
                                  placeholder="Phone number"
                                  value={otherSpecialist.phone}
                                  onChange={(e) => setOtherSpecialist({...otherSpecialist, phone: e.target.value})}
                                />
                              </div>
                              <Button 
                                type="button" 
                                className="w-full"
                                onClick={addSpecialist}
                                disabled={!otherSpecialist.name.trim() || !otherSpecialist.specialty.trim()}
                              >
                                <PlusCircle className="h-4 w-4 mr-1" />
                                Add Specialist
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="font-medium text-lg">Transplant Information</h3>
                          
                          <FormField
                            control={form.control}
                            name="transplantCenter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transplant Center</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Transplant center name" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="transplantCoordinator"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transplant Coordinator</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Coordinator name" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="transplantCoordinatorPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Coordinator Phone</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Phone number" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Insurance Document Upload Section */}
                        <div className="border rounded-lg p-4 mt-6">
                          <h3 className="text-lg font-medium mb-4 flex items-center">
                            <FileText className="mr-2" size={18} />
                            Insurance Documents
                          </h3>
                          
                          {/* Document Upload Form */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Document Type</label>
                                <Select 
                                  value={documentType} 
                                  onValueChange={setDocumentType}
                                  disabled={isUploading || !isEditing}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="insurance">Insurance Card</SelectItem>
                                    <SelectItem value="insurance_policy">Insurance Policy</SelectItem>
                                    <SelectItem value="authorization">Prior Authorization</SelectItem>
                                    <SelectItem value="explanation">Explanation of Benefits</SelectItem>
                                    <SelectItem value="claim">Insurance Claim</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">File</label>
                                <Input
                                  type="file"
                                  onChange={handleFileChange}
                                  disabled={isUploading || !isEditing}
                                  ref={fileInputRef}
                                  className="text-sm"
                                />
                              </div>
                              
                              <div className="flex items-end">
                                <Button 
                                  type="button" 
                                  onClick={uploadDocument}
                                  disabled={isUploading || !selectedFile || !isEditing}
                                  className="flex items-center"
                                >
                                  {isUploading ? (
                                    <span className="flex items-center">
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Uploading...
                                    </span>
                                  ) : (
                                    <span className="flex items-center">
                                      <Upload className="mr-2" size={16} />
                                      Upload
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Upload Progress Indicator */}
                            {isUploading && (
                              <div className="mt-2">
                                <Progress value={uploadProgress} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Uploading: {uploadProgress}%
                                </p>
                              </div>
                            )}
                            
                            {/* Upload Error Message */}
                            {uploadError && (
                              <div className="bg-destructive/10 text-destructive p-2 rounded-md mt-2 flex items-center text-sm">
                                <AlertCircle className="mr-2" size={16} />
                                {uploadError}
                              </div>
                            )}
                          </div>
                          
                          {/* Document List */}
                          <div className="mt-6">
                            <h4 className="text-sm font-medium mb-2">Uploaded Documents</h4>
                            {documents.length === 0 ? (
                              <p className="text-muted-foreground text-sm italic">No documents uploaded yet.</p>
                            ) : (
                              <ScrollArea className="max-h-64">
                                <div className="space-y-2">
                                  {documents
                                    .filter(doc => ['insurance', 'insurance_policy', 'authorization', 'explanation', 'claim'].includes(doc.type))
                                    .map(doc => (
                                      <Card key={doc.id} className="p-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center">
                                            <FileCheck className="mr-2 text-primary" size={18} />
                                            <div>
                                              <p className="font-medium text-sm">{doc.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {new Date(doc.createdAt).toLocaleDateString()} · {(doc.size / 1024).toFixed(1)} KB
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              asChild
                                              className="h-8 w-8 p-0"
                                            >
                                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                <Info size={16} />
                                                <span className="sr-only">View</span>
                                              </a>
                                            </Button>
                                            {isEditing && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteDocument(doc.id)}
                                                className="h-8 w-8 p-0 text-destructive"
                                              >
                                                <X size={16} />
                                                <span className="sr-only">Delete</span>
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </Card>
                                    ))}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      
                      {/* Health Preferences Tab */}
                      <TabsContent value="preferences" className="space-y-4">
                        <div className="space-y-6">
                          {/* Unit System Preference */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Measurement System</h3>
                            <div className="mb-6">
                              <UnitToggle
                                value={unitSystem}
                                onChange={setUnitSystem}
                                label="Preferred Measurement System"
                                tooltipText="Choose your preferred measurement system for weight, height, and other values across the application"
                                className="mb-2"
                              />
                              <p className="text-sm text-muted-foreground mt-2">
                                This setting affects all measurements throughout the application.
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Water Intake Goals</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="recommendedDailyHydration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Daily Water Intake Goal</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1"
                                        placeholder="Water intake" 
                                        {...field} 
                                        disabled={!isEditing}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="preferredHydrationUnit"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Preferred Unit</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      disabled={!isEditing}
                                      value={field.value || undefined}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select unit" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="liters">Liters</SelectItem>
                                        <SelectItem value="cups">Cups</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-500">
                              {form.watch("recommendedDailyHydration") && form.watch("preferredHydrationUnit") && (
                                <p>
                                  {form.watch("preferredHydrationUnit") === "liters" ? (
                                    <>Your goal: {form.watch("recommendedDailyHydration")} liters (~{Math.round(form.watch("recommendedDailyHydration") * 4.2)} cups) per day</>
                                  ) : (
                                    <>Your goal: {form.watch("recommendedDailyHydration")} cups (~{(form.watch("recommendedDailyHydration") / 4.2).toFixed(1)} liters) per day</>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Blood Pressure Goals</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="targetBloodPressureSystolic"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Target Systolic</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Target systolic" 
                                        {...field} 
                                        disabled={!isEditing}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="targetBloodPressureDiastolic"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Target Diastolic</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Target diastolic" 
                                        {...field} 
                                        disabled={!isEditing}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-500">
                              {form.watch("targetBloodPressureSystolic") && form.watch("targetBloodPressureDiastolic") && (
                                <p>Your target blood pressure: {form.watch("targetBloodPressureSystolic")}/{form.watch("targetBloodPressureDiastolic")} mmHg</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Medications Section */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Medications</h3>
                            
                            {isEditing && (
                              <div className="space-y-4 mb-4 p-4 border rounded-md">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Medication Name</label>
                                    <Input 
                                      placeholder="Medication name"
                                      value={medication.name}
                                      onChange={(e) => setMedication({...medication, name: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Dosage</label>
                                    <Input 
                                      placeholder="e.g., 50mg"
                                      value={medication.dosage}
                                      onChange={(e) => setMedication({...medication, dosage: e.target.value})}
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Frequency</label>
                                    <Select
                                      value={medication.frequency}
                                      onValueChange={(value) => setMedication({...medication, frequency: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="once_daily">Once daily</SelectItem>
                                        <SelectItem value="twice_daily">Twice daily</SelectItem>
                                        <SelectItem value="three_times_daily">Three times daily</SelectItem>
                                        <SelectItem value="four_times_daily">Four times daily</SelectItem>
                                        <SelectItem value="every_other_day">Every other day</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="as_needed">As needed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Time of Day</label>
                                    <Select
                                      value={medication.time}
                                      onValueChange={(value) => setMedication({...medication, time: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="morning">Morning</SelectItem>
                                        <SelectItem value="afternoon">Afternoon</SelectItem>
                                        <SelectItem value="evening">Evening</SelectItem>
                                        <SelectItem value="bedtime">Bedtime</SelectItem>
                                        <SelectItem value="with_meals">With meals</SelectItem>
                                        <SelectItem value="before_meals">Before meals</SelectItem>
                                        <SelectItem value="after_meals">After meals</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-1">Notes</label>
                                  <Input 
                                    placeholder="Additional notes"
                                    value={medication.notes}
                                    onChange={(e) => setMedication({...medication, notes: e.target.value})}
                                  />
                                </div>
                                
                                <Button 
                                  type="button" 
                                  onClick={addMedication}
                                  disabled={!medication.name || !medication.dosage || !medication.frequency}
                                  className="w-full"
                                >
                                  <PlusCircle className="h-4 w-4 mr-2" />
                                  Add Medication
                                </Button>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              {getMedications().length > 0 ? (
                                getMedications().map((med, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 border rounded-md">
                                    <div className="flex-1">
                                      <p className="font-medium">{med.name} ({med.dosage})</p>
                                      <p className="text-sm text-gray-500">
                                        {med.frequency.replace(/_/g, ' ')} 
                                        {med.time && ` • ${med.time.replace(/_/g, ' ')}`}
                                      </p>
                                      {med.notes && <p className="text-sm text-gray-500 mt-1">{med.notes}</p>}
                                    </div>
                                    {isEditing && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeMedication(med)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 italic">No medications added</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    {isEditing && (
                      <div className="flex justify-between pt-6">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={isUpdating}
                        >
                          {isUpdating ? "Saving..." : "Save Profile Info"}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}