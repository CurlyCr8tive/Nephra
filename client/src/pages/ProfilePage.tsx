import { useState, useEffect } from "react";
import { format } from "date-fns";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, SaveIcon, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const ProfilePage = () => {
  // Safely access user context with fallback for error cases
  let userId = 1; // Default fallback userId
  let user = {
    id: 1,
    username: "testuser",
    firstName: "User"
  };
  
  try {
    // This will be replaced with actual user context when available
    // For now using hardcoded values
    userId = 1;
  } catch (error) {
    console.error("UserContext not available:", error);
    // Continue with default user
  }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [otherCondition, setOtherCondition] = useState("");
  const [otherSpecialist, setOtherSpecialist] = useState({
    name: "",
    specialty: "",
    phone: ""
  });

  // Fetch user profile data
  const { data: profileData, isLoading } = useQuery({
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
    insuranceProvider: z.string().optional(),
    insurancePolicyNumber: z.string().optional(),
    transplantCenter: z.string().optional(),
    transplantCoordinator: z.string().optional(),
    transplantCoordinatorPhone: z.string().optional(),
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
      race: "",
      kidneyDiseaseType: "",
      kidneyDiseaseStage: null,
      diagnosisDate: null,
      otherHealthConditions: [],
      primaryCareProvider: "",
      nephrologist: "",
      otherSpecialists: [],
      insuranceProvider: "",
      insurancePolicyNumber: "",
      transplantCenter: "",
      transplantCoordinator: "",
      transplantCoordinatorPhone: "",
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
        race: profileData.race || "",
        kidneyDiseaseType: profileData.kidneyDiseaseType || "",
        kidneyDiseaseStage: profileData.kidneyDiseaseStage || null,
        diagnosisDate: profileData.diagnosisDate ? new Date(profileData.diagnosisDate) : null,
        otherHealthConditions: profileData.otherHealthConditions || [],
        primaryCareProvider: profileData.primaryCareProvider || "",
        nephrologist: profileData.nephrologist || "",
        otherSpecialists: profileData.otherSpecialists || [],
        insuranceProvider: profileData.insuranceProvider || "",
        insurancePolicyNumber: profileData.insurancePolicyNumber || "",
        transplantCenter: profileData.transplantCenter || "",
        transplantCoordinator: profileData.transplantCoordinator || "",
        transplantCoordinatorPhone: profileData.transplantCoordinatorPhone || "",
      });
    }
  }, [profileData, form]);

  // Update profile mutation
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${userId}`]
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateProfile(values);
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
                      <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="medical">Medical</TabsTrigger>
                        <TabsTrigger value="care">Care Team</TabsTrigger>
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
                                  disabled={!isEditing} 
                                  onValueChange={field.onChange} 
                                  value={field.value}
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
                                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
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
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} 
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
                              <Select 
                                disabled={!isEditing} 
                                onValueChange={field.onChange} 
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select race/ethnicity" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="asian">Asian</SelectItem>
                                  <SelectItem value="black">Black or African American</SelectItem>
                                  <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                                  <SelectItem value="native-american">Native American</SelectItem>
                                  <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                                  <SelectItem value="white">White</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                </SelectContent>
                              </Select>
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
                              <FormLabel>Kidney Disease Diagnosis</FormLabel>
                              <Select 
                                disabled={!isEditing} 
                                onValueChange={field.onChange} 
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select diagnosis" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="diabetic-nephropathy">Diabetic Nephropathy</SelectItem>
                                  <SelectItem value="hypertensive-nephrosclerosis">Hypertensive Nephrosclerosis</SelectItem>
                                  <SelectItem value="glomerulonephritis">Glomerulonephritis</SelectItem>
                                  <SelectItem value="polycystic-kidney">Polycystic Kidney Disease</SelectItem>
                                  <SelectItem value="lupus-nephritis">Lupus Nephritis</SelectItem>
                                  <SelectItem value="iga-nephropathy">IgA Nephropathy</SelectItem>
                                  <SelectItem value="focal-segmental-glomerulosclerosis">Focal Segmental Glomerulosclerosis</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="kidneyDiseaseStage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Kidney Disease Stage (1-5)</FormLabel>
                                <Select 
                                  disabled={!isEditing} 
                                  onValueChange={(value) => field.onChange(parseInt(value))} 
                                  value={field.value?.toString() || ""}
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
                              <FormItem className="flex flex-col">
                                <FormLabel>Diagnosis Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
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
                                      disabled={(date) => date > new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Other Health Conditions</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {Array.isArray(form.getValues("otherHealthConditions")) 
                              ? form.getValues("otherHealthConditions").map((condition, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {condition}
                                  {isEditing && (
                                    <button 
                                      type="button"
                                      className="ml-1 text-xs"
                                      onClick={() => removeHealthCondition(condition)}
                                    >
                                      ×
                                    </button>
                                  )}
                                </Badge>
                              ))
                              : null}
                          </div>
                          
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input 
                                value={otherCondition}
                                onChange={(e) => setOtherCondition(e.target.value)}
                                placeholder="Add health condition"
                              />
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={addHealthCondition}
                              >
                                Add
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      {/* Care Team Tab */}
                      <TabsContent value="care" className="space-y-4">
                        <div className="space-y-4">
                          <h3 className="font-medium text-lg">Healthcare Providers</h3>
                          
                          <FormField
                            control={form.control}
                            name="primaryCareProvider"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Care Physician (PCP)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Dr. Name" 
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
                                    placeholder="Dr. Name" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="space-y-2">
                            <Label>Other Specialists</Label>
                            
                            {Array.isArray(form.getValues("otherSpecialists")) 
                              ? form.getValues("otherSpecialists").map((specialist, index) => (
                                <div 
                                  key={index} 
                                  className="bg-muted p-3 rounded-md mb-2 relative"
                                >
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Name</Label>
                                      <p>{specialist.name}</p>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Specialty</Label>
                                      <p>{specialist.specialty}</p>
                                    </div>
                                    {specialist.phone && (
                                      <div className="col-span-2">
                                        <Label className="text-xs">Phone</Label>
                                        <p>{specialist.phone}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {isEditing && (
                                    <button 
                                      type="button"
                                      className="absolute top-2 right-2 text-sm text-destructive"
                                      onClick={() => removeSpecialist(specialist)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))
                              : null}
                            
                            {isEditing && (
                              <div className="border rounded-md p-3 mt-2">
                                <h4 className="font-medium text-sm mb-2">Add Specialist</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                  <Input 
                                    value={otherSpecialist.name}
                                    onChange={(e) => setOtherSpecialist({...otherSpecialist, name: e.target.value})}
                                    placeholder="Specialist name"
                                  />
                                  <Input 
                                    value={otherSpecialist.specialty}
                                    onChange={(e) => setOtherSpecialist({...otherSpecialist, specialty: e.target.value})}
                                    placeholder="Specialty"
                                  />
                                </div>
                                <div className="mb-2">
                                  <Input 
                                    value={otherSpecialist.phone}
                                    onChange={(e) => setOtherSpecialist({...otherSpecialist, phone: e.target.value})}
                                    placeholder="Phone number (optional)"
                                  />
                                </div>
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={addSpecialist}
                                  className="w-full"
                                >
                                  Add Specialist
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <h3 className="font-medium text-lg">Insurance</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="insuranceProvider"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Insurance Provider</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Provider name" 
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
                              name="insurancePolicyNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Policy Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Policy number" 
                                      {...field} 
                                      disabled={!isEditing} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <h3 className="font-medium text-lg">Transplant Center</h3>
                          
                          <FormField
                            control={form.control}
                            name="transplantCenter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transplant Center</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Center name" 
                                    {...field} 
                                    disabled={!isEditing} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    {isEditing && (
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="submit" disabled={isUpdating} className="flex items-center gap-2">
                          {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>}
                          <SaveIcon className="w-4 h-4 mr-1" /> Save Profile
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
          
          <div className="text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Your information is securely stored and private
            </p>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;