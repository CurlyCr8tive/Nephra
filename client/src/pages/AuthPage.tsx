import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
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
  const { loginMutation, registerMutation } = useAuth();

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
    },
  });

  // We're using the loginMutation and registerMutation from useAuth() directly

  // Add a useEffect to redirect when authenticated
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      setLocation("/");
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

              <div className="space-y-4 text-center text-sm">
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    onClick={() => {
                      loginForm.setValue('username', 'demouser');
                      loginForm.setValue('password', 'password123');
                      setActiveTab('login');
                      setTimeout(() => {
                        loginForm.handleSubmit(onLoginSubmit)();
                      }, 100);
                    }}
                  >
                    Test Login (demouser)
                  </Button>
                  
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                    onClick={async () => {
                      try {
                        // Direct fetch logout - avoids any cached user data issues
                        await fetch("/api/logout", {
                          method: "POST",
                          credentials: "include",
                          headers: {
                            "Cache-Control": "no-cache"
                          }
                        });
                        
                        // Force a hard reload of the page
                        window.location.href = "/auth";
                        
                        toast({
                          title: "Logged out",
                          description: "You have been logged out successfully"
                        });
                      } catch (err) {
                        console.error("Direct logout error:", err);
                        toast({
                          title: "Logout failed",
                          description: "Please try again or refresh the page",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Force Logout (fixes stuck session)
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Clear all storage and reload
                      try {
                        if (typeof window !== 'undefined') {
                          // Don't clear gender data
                          const gender = window.localStorage.getItem('nephra_user_gender');
                          
                          // Clear session storage
                          window.sessionStorage.clear();
                          
                          // Clear specific localStorage items
                          window.localStorage.removeItem('nephra_user_id');
                          
                          // Restore gender if it existed
                          if (gender) {
                            window.localStorage.setItem('nephra_user_gender', gender);
                            window.sessionStorage.setItem('nephra_user_gender', gender);
                          }
                          
                          // Force a hard reload
                          window.location.href = "/auth";
                        }
                      } catch (e) {
                        console.error("Storage clearing error:", e);
                      }
                    }}
                  >
                    Reset Session & Reload Page
                  </Button>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800 mb-1">Demo Login Credentials:</p>
                  <p className="text-blue-700">Username: <strong>demouser</strong> | Password: <strong>demopass</strong></p>
                </div>
                
                <p className="flex items-center justify-center gap-1 text-muted-foreground">
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
                  Track, manage, and understand your kidney health with personalized insights and support.
                </p>
              </div>

              <div className="space-y-4 mt-8">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-1">Evidence-Based Insights</h3>
                  <p>Access reliable, AI-powered kidney health information from trusted medical sources.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-1">Comprehensive Tracking</h3>
                  <p>Monitor vitals, medications, symptoms, and lab results all in one secure place.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-1">Transplant Journey Support</h3>
                  <p>Navigate the transplant process with personalized roadmaps and guidance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}