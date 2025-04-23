import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import roadmapData from "@/data/transplantRoadmap.json";

export default function TransplantRoadmap() {
  // Safely access user context with fallback for error cases
  let userId = 1; // Default fallback userId
  let user = {
    id: 1,
    username: "testuser",
    firstName: "User"
  };
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  try {
    const userContext = useUser();
    if (userContext && userContext.user) {
      // Create safe user object with only needed properties
      userId = userContext.user.id;
      user = {
        id: userContext.user.id,
        username: userContext.user.username,
        firstName: userContext.user.firstName || "User" // Handle potential null value
      };
    }
  } catch (error) {
    console.error("UserContext not available:", error);
    // Don't call toast in render phase
  }
  
  // Show error toast using useEffect
  useEffect(() => {
    const hasError = !user || user.id === 1; // Default user has id 1
    if (hasError) {
      toast({
        title: "Error accessing user data",
        description: "There was a problem accessing your user information. Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  }, [toast, user]);

  const [activeTab, setActiveTab] = useState("roadmap");

  // Fetch transplant steps
  const { data: steps, isLoading: isLoadingSteps } = useQuery({
    queryKey: ["/api/transplant-steps"],
    enabled: !!user,
  });

  // Fetch user's progress
  const { data: progress, isLoading: isLoadingProgress } = useQuery({
    queryKey: [`/api/transplant-progress/${user?.id}`],
    enabled: !!user,
  });

  // Mutation for updating progress
  const { mutate: updateProgress, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { id: number, status: string, completedDate?: Date }) => {
      const payload = {
        status: data.status,
        completedDate: data.status === "completed" ? new Date() : undefined
      };
      
      const response = await apiRequest("PUT", `/api/transplant-progress/${data.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/transplant-progress/${user?.id}`]
      });
      
      toast({
        title: "Progress updated",
        description: "Your transplant progress has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating progress",
        description: error.message || "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new progress entry
  const { mutate: createProgress, isPending: isCreating } = useMutation({
    mutationFn: async (data: { userId: number, stepId: number, status: string, completedDate?: Date }) => {
      const response = await apiRequest("POST", "/api/transplant-progress", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/transplant-progress/${user?.id}`]
      });
      
      toast({
        title: "Progress created",
        description: "Your transplant progress has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating progress",
        description: error.message || "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Combine steps with user progress
  const getStepsWithProgress = () => {
    if (!steps || !progress) return [];

    return steps.map(step => {
      const userProgress = progress.find(p => p.stepId === step.id);
      return {
        ...step,
        progressId: userProgress?.id,
        status: userProgress?.status || "pending",
        completedDate: userProgress?.completedDate
      };
    });
  };

  const stepsWithProgress = getStepsWithProgress();

  // Handle status change
  const handleStatusChange = (step: any, newStatus: string) => {
    if (!user) return;
    
    if (step.progressId) {
      // Update existing progress
      updateProgress({
        id: step.progressId,
        status: newStatus,
        completedDate: newStatus === "completed" ? new Date() : undefined
      });
    } else {
      // Create new progress entry
      createProgress({
        userId: user.id,
        stepId: step.id,
        status: newStatus,
        completedDate: newStatus === "completed" ? new Date() : undefined
      });
    }
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Completed", bgColor: "bg-success", textColor: "text-white" };
      case "in_progress":
        return { text: "In Progress", bgColor: "bg-primary", textColor: "text-white" };
      default:
        return { text: "Pending", bgColor: "bg-neutral-200", textColor: "text-neutral-500" };
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Transplant Roadmap" />
      
      <main className="flex-grow pt-20 pb-20">
        <div className="px-4 py-4">
          <Tabs defaultValue="roadmap" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            
            {/* Roadmap Tab - Original transplant journey timeline */}
            <TabsContent value="roadmap" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Kidney Transplant Journey</CardTitle>
                  <CardDescription>
                    Track your progress through each stage of the transplant process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSteps || isLoadingProgress ? (
                    <div className="py-8 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Enhanced roadmap steps using data from the JSON file */}
                      {roadmapData.roadmap_steps.map((roadStep, index) => (
                        <div key={index} className="border-l-2 border-primary pl-6 relative">
                          <div className="absolute top-0 left-0 w-4 h-4 rounded-full bg-primary transform -translate-x-1/2"></div>
                          <h3 className="font-medium">{roadStep.step}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{roadStep.details}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Source:</span>
                            <a 
                              href={roadStep.source} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-primary"
                            >
                              {new URL(roadStep.source).hostname.replace('www.', '')}
                            </a>
                          </div>
                        </div>
                      ))}
                      
                      {/* Original DB-powered steps with progress tracking */}
                      <h3 className="font-medium mt-8 mb-4">Your Personal Progress</h3>
                      {stepsWithProgress.map((step, index) => {
                        const statusInfo = getStatusInfo(step.status);
                        const isFirst = index === 0;
                        const isLast = index === stepsWithProgress.length - 1;
                        
                        return (
                          <div 
                            key={step.id} 
                            className={`relative pl-6 border-l-2 ${
                              step.status === "completed" || step.status === "in_progress" ? "border-primary" : "border-neutral-200"
                            } ${!isLast ? "mb-6" : ""}`}
                          >
                            <div 
                              className={`absolute top-0 left-0 w-4 h-4 rounded-full ${
                                step.status === "completed" || step.status === "in_progress" ? "bg-primary" : "bg-neutral-200"
                              } transform -translate-x-1/2`}
                            ></div>
                            <div className="mb-4">
                              <h4 className={`font-medium ${step.status === "pending" ? "text-neutral-500" : ""}`}>
                                {step.title}
                              </h4>
                              <p className={`text-sm ${step.status === "pending" ? "text-neutral-500" : "text-neutral-600"} mt-1`}>
                                {step.description}
                              </p>
                              <div className="flex flex-wrap items-center mt-2 gap-2">
                                <span className={`${statusInfo.bgColor} ${statusInfo.textColor} text-xs px-2 py-0.5 rounded`}>
                                  {statusInfo.text}
                                </span>
                                {step.completedDate && (
                                  <span className="text-xs text-neutral-500">
                                    {format(new Date(step.completedDate), "MMM d, yyyy")}
                                  </span>
                                )}
                                
                                <div className="ml-auto flex gap-2">
                                  {step.status !== "completed" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => handleStatusChange(step, "completed")}
                                      disabled={isUpdating || isCreating}
                                    >
                                      Mark completed
                                    </Button>
                                  )}
                                  {step.status !== "in_progress" && step.status !== "completed" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => handleStatusChange(step, "in_progress")}
                                      disabled={isUpdating || isCreating}
                                    >
                                      Mark in progress
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Eligibility Tab */}
            <TabsContent value="eligibility" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{roadmapData.eligibility.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 mb-4">
                    {roadmapData.eligibility.content}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Common Eligibility Factors</h3>
                      <ul className="text-sm space-y-2 list-disc pl-5">
                        <li>End-stage renal disease (ESRD) or Stage 5 kidney disease</li>
                        <li>GFR less than 20</li>
                        <li>General health good enough to undergo surgery</li>
                        <li>No active cancer or serious infections</li>
                        <li>Ability to follow post-transplant medication regimen</li>
                        <li>Emotional and financial readiness</li>
                      </ul>
                    </div>
                    
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Transplant Evaluation Process</h3>
                      <p className="text-sm mb-2">
                        The evaluation typically includes:
                      </p>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li>Comprehensive blood work and tissue typing</li>
                        <li>Heart testing (EKG, echocardiogram)</li>
                        <li>Cancer screenings appropriate for your age</li>
                        <li>Psychological evaluation</li>
                        <li>Financial counseling</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Source: </span>
                      <a 
                        href={roadmapData.eligibility.source} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary"
                      >
                        National Kidney Foundation
                      </a>
                    </div>
                    
                    <Button>
                      Take Eligibility Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{roadmapData.waitlist_comparison.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 mb-4">
                    {roadmapData.waitlist_comparison.action}
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h3 className="font-medium mb-2">Waitlist Facts</h3>
                    <ul className="text-sm space-y-2">
                      <li><span className="font-semibold">Blood Type:</span> Your blood type greatly impacts wait times. Type O patients typically wait longer.</li>
                      <li><span className="font-semibold">CPRA Score:</span> How sensitive your immune system is to potential donors.</li>
                      <li><span className="font-semibold">Region:</span> Wait times vary significantly by transplant center and geographic region.</li>
                      <li><span className="font-semibold">Multiple Listings:</span> You can be evaluated and listed at more than one transplant center.</li>
                    </ul>
                  </div>
                  
                  <Button variant="outline" className="w-full" asChild>
                    <a 
                      href={roadmapData.waitlist_comparison.source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Compare Wait Times by Region
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{roadmapData.coverage_and_rights.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 mb-4">
                    {roadmapData.coverage_and_rights.content}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Medicare Coverage</h3>
                      <ul className="text-sm space-y-2 list-disc pl-5">
                        <li>Most kidney transplant costs are covered under Medicare Part A (hospital) and Part B (medical)</li>
                        <li>Medicare Part B covers immunosuppressant drugs if Medicare helped pay for your transplant</li>
                        <li>Medicare coverage can start the first month you begin dialysis if you take part in home dialysis training</li>
                        <li>Medicare coverage typically lasts 36 months after a successful transplant</li>
                      </ul>
                    </div>
                    
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Patient Rights</h3>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li>Right to be informed about all treatment options</li>
                        <li>Right to receive information about your position on the waiting list</li>
                        <li>Right to refuse an organ offer</li>
                        <li>Right to transfer to another transplant center</li>
                        <li>Right to be listed at multiple centers (multiple listing)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <h3 className="font-medium mb-4">Education Resources</h3>
                  
                  {/* Display education resources by category */}
                  {roadmapData.education_resources && (
                    <div className="space-y-6">
                      {/* Disease Information */}
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">Disease Information</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapData.education_resources
                            .filter(resource => resource.category === "disease_info")
                            .map((resource, index) => (
                              <div 
                                key={index}
                                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                              >
                                <div className="flex items-start">
                                  <span className="material-icons text-primary mr-2">{resource.icon}</span>
                                  <div>
                                    <h5 className="font-medium text-sm">{resource.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    <span className="text-[10px] text-slate-500 block mt-1">Source: {resource.source}</span>
                                    <a 
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                                    >
                                      Read Article <span className="material-icons text-xs ml-1">open_in_new</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Surgery & Medical */}
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">Surgery & Medical</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapData.education_resources
                            .filter(resource => ["surgery", "medications"].includes(resource.category))
                            .map((resource, index) => (
                              <div 
                                key={index}
                                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                              >
                                <div className="flex items-start">
                                  <span className="material-icons text-primary mr-2">{resource.icon}</span>
                                  <div>
                                    <h5 className="font-medium text-sm">{resource.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    <span className="text-[10px] text-slate-500 block mt-1">Source: {resource.source}</span>
                                    <a 
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                                    >
                                      Read Article <span className="material-icons text-xs ml-1">open_in_new</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Lifestyle */}
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">Lifestyle & Wellness</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapData.education_resources
                            .filter(resource => resource.category === "lifestyle")
                            .map((resource, index) => (
                              <div 
                                key={index}
                                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                              >
                                <div className="flex items-start">
                                  <span className="material-icons text-primary mr-2">{resource.icon}</span>
                                  <div>
                                    <h5 className="font-medium text-sm">{resource.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    <span className="text-[10px] text-slate-500 block mt-1">Source: {resource.source}</span>
                                    <a 
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                                    >
                                      Read Article <span className="material-icons text-xs ml-1">open_in_new</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Living Donation */}
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">Living Donation</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapData.education_resources
                            .filter(resource => resource.category === "living_donation")
                            .map((resource, index) => (
                              <div 
                                key={index}
                                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                              >
                                <div className="flex items-start">
                                  <span className="material-icons text-primary mr-2">{resource.icon}</span>
                                  <div>
                                    <h5 className="font-medium text-sm">{resource.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    <span className="text-[10px] text-slate-500 block mt-1">Source: {resource.source}</span>
                                    <a 
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                                    >
                                      Read Article <span className="material-icons text-xs ml-1">open_in_new</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Support & Personal */}
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">Support & Personal Resources</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapData.education_resources
                            .filter(resource => ["support", "inspiration", "financial"].includes(resource.category))
                            .map((resource, index) => (
                              <div 
                                key={index}
                                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                              >
                                <div className="flex items-start">
                                  <span className="material-icons text-primary mr-2">{resource.icon}</span>
                                  <div>
                                    <h5 className="font-medium text-sm">{resource.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    <span className="text-[10px] text-slate-500 block mt-1">Source: {resource.source}</span>
                                    <a 
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                                    >
                                      Read Article <span className="material-icons text-xs ml-1">open_in_new</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Statistics & Data */}
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">Statistics & Data</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapData.education_resources
                            .filter(resource => resource.category === "statistics")
                            .map((resource, index) => (
                              <div 
                                key={index}
                                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                              >
                                <div className="flex items-start">
                                  <span className="material-icons text-primary mr-2">{resource.icon}</span>
                                  <div>
                                    <h5 className="font-medium text-sm">{resource.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                    <span className="text-[10px] text-slate-500 block mt-1">Source: {resource.source}</span>
                                    <a 
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                                    >
                                      Read Article <span className="material-icons text-xs ml-1">open_in_new</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Separator className="my-6" />
                  
                  <h3 className="font-medium mb-4">Additional Resources</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Button variant="outline" className="justify-start" asChild>
                      <a 
                        href="https://www.kidney.org/transplantation" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <span className="material-icons mr-2 text-sm">school</span>
                        National Kidney Foundation
                      </a>
                    </Button>
                    
                    <Button variant="outline" className="justify-start" asChild>
                      <a 
                        href="https://unos.org/transplant/living-donation/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <span className="material-icons mr-2 text-sm">people</span>
                        UNOS Living Donation
                      </a>
                    </Button>
                    
                    <Button variant="outline" className="justify-start" asChild>
                      <a 
                        href="https://www.srtr.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <span className="material-icons mr-2 text-sm">analytics</span>
                        Scientific Registry of Transplant Recipients
                      </a>
                    </Button>
                    
                    <Button variant="outline" className="justify-start" asChild>
                      <a 
                        href="https://optn.transplant.hrsa.gov/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <span className="material-icons mr-2 text-sm">map</span>
                        Organ Procurement and Transplantation Network
                      </a>
                    </Button>
                    
                    <Button variant="outline" className="justify-start" asChild>
                      <a 
                        href="https://www.cms.gov/medicare-coverage-database" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <span className="material-icons mr-2 text-sm">health_and_safety</span>
                        Medicare Coverage Database
                      </a>
                    </Button>
                    
                    <Button variant="outline" className="justify-start" asChild>
                      <a 
                        href="https://www.transplantliving.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <span className="material-icons mr-2 text-sm">favorite</span>
                        Transplant Living
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
