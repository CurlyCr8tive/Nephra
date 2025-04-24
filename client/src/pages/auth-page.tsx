import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertCircle, Mail, User, Lock, EyeIcon, EyeOffIcon, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Define schemas
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  // We're using the loginMutation and registerMutation from useAuth() directly

  // CRITICAL: Add a useEffect to redirect immediately when authenticated
  useEffect(() => {
    if (user) {
      console.log("User authenticated, redirecting to dashboard");
      setLocation("/dashboard");
    } else {
      console.log("No user detected, staying on auth page");
    }
  }, [user, setLocation]);

  // Handle form submissions
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData as any);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 flex">
        <div className="grid grid-cols-1 md:grid-cols-2 w-full">
          {/* Auth Form */}
          <div className="flex flex-col justify-center p-4 md:p-8">
            <div className="mx-auto w-full max-w-md space-y-6">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="bg-primary-light p-3 rounded-full inline-flex mb-4">
                  <Activity className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Nephra</h1>
                <p className="text-muted-foreground mt-2">Your personal kidney health companion</p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login">Log In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <Card>
                    <CardHeader>
                      <CardTitle>Welcome Back</CardTitle>
                      <CardDescription>
                        Sign in to your Nephra account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Enter your username"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="••••••••"
                                      className="pl-10"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-2 top-2"
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                      ) : (
                                        <EyeIcon className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Signing in...
                              </>
                            ) : (
                              "Sign In"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Account</CardTitle>
                      <CardDescription>
                        Sign up for a new Nephra account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={registerForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="First name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={registerForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Last name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Choose a username"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type="email"
                                      placeholder="Enter your email"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="Create a password"
                                      className="pl-10"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-2 top-2"
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                      ) : (
                                        <EyeIcon className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type={showConfirmPassword ? "text" : "password"}
                                      placeholder="Confirm your password"
                                      className="pl-10"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-2 top-2"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                      {showConfirmPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                      ) : (
                                        <EyeIcon className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Creating Account...
                              </>
                            ) : (
                              "Create Account"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="text-center text-sm text-muted-foreground">
                <p className="flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Your information is securely stored and private
                </p>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="hidden md:flex bg-gradient-to-br from-primary to-primary-dark text-white">
            <div className="flex flex-col justify-center px-12 space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Your Kidney Health Journey</h1>
                <p className="text-xl text-white/80">
                  Track, manage, and understand your kidney health with personalized tools and AI-powered insights.
                </p>
              </div>

              <div className="space-y-6 mt-8">
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Comprehensive Health Tracking</h3>
                    <p className="text-white/70 mt-1">Track medication, symptoms, blood pressure, and key health metrics all in one place.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Intelligent Health Insights</h3>
                    <p className="text-white/70 mt-1">Get personalized recommendations and understand your health trends with AI analysis.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Transplant Journey Guide</h3>
                    <p className="text-white/70 mt-1">Navigate the kidney transplant process with a structured roadmap and expert guidance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}