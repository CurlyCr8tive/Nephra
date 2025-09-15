import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, addHours, isBefore, isAfter, startOfDay } from "date-fns";
import { CalendarIcon, Clock, MapPin, User, Plus, Trash2, Edit3, CheckCircle, AlertCircle, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { insertMedicalAppointmentSchema, type MedicalAppointment, type InsertMedicalAppointment } from "@shared/schema";
import { cn } from "@/lib/utils";

// Form schema with enhanced validation
const appointmentFormSchema = insertMedicalAppointmentSchema.extend({
  appointmentDate: z.date({
    required_error: "Appointment date is required",
  }),
  duration: z.number().min(5, "Duration must be at least 5 minutes").max(480, "Duration cannot exceed 8 hours"),
  reminderTime: z.number().min(1, "Reminder time must be at least 1 hour").max(168, "Reminder time cannot exceed 1 week"),
}).refine((data) => {
  if (data.appointmentDate) {
    return isAfter(data.appointmentDate, new Date());
  }
  return true;
}, {
  message: "Appointment date must be in the future",
  path: ["appointmentDate"],
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentSchedulerProps {
  className?: string;
}

// Appointment type options
const appointmentTypes = [
  { value: "checkup", label: "Regular Checkup" },
  { value: "specialist", label: "Specialist Visit" },
  { value: "lab", label: "Lab Work" },
  { value: "dialysis", label: "Dialysis" },
  { value: "surgery", label: "Surgery" },
  { value: "follow-up", label: "Follow-up" },
  { value: "consultation", label: "Consultation" },
  { value: "therapy", label: "Therapy" },
  { value: "screening", label: "Screening" },
  { value: "emergency", label: "Emergency" },
];

// Duration preset options
const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];

// Reminder time options
const reminderOptions = [
  { value: 1, label: "1 hour before" },
  { value: 4, label: "4 hours before" },
  { value: 8, label: "8 hours before" },
  { value: 24, label: "1 day before" },
  { value: 48, label: "2 days before" },
  { value: 72, label: "3 days before" },
  { value: 168, label: "1 week before" },
];

export function AppointmentScheduler({ className }: AppointmentSchedulerProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [editingAppointment, setEditingAppointment] = useState<MedicalAppointment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form setup
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      userId: user?.id || 0,
      title: "",
      appointmentType: "checkup",
      doctorName: "",
      location: "",
      appointmentDate: new Date(),
      duration: 60,
      notes: "",
      reminderSet: true,
      reminderTime: 24,
      isCompleted: false,
    },
  });

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery<MedicalAppointment[]>({
    queryKey: ["/api/medical-appointments", user?.id],
    enabled: !!user?.id,
  });

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      const appointmentData = {
        ...data,
        userId: user?.id || 0,
        appointmentDate: data.appointmentDate.toISOString(),
      };
      
      return apiRequest("/api/medical-appointments", {
        method: "POST",
        body: JSON.stringify(appointmentData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments"] });
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment",
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<AppointmentFormValues> }) => {
      const appointmentData = {
        ...data,
        ...(data.appointmentDate && { appointmentDate: data.appointmentDate.toISOString() }),
      };
      
      return apiRequest(`/api/medical-appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(appointmentData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments"] });
      toast({
        title: "Success", 
        description: "Appointment updated successfully",
      });
      setEditingAppointment(null);
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/medical-appointments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments"] });
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete appointment",
        variant: "destructive",
      });
    },
  });

  // Mark appointment as completed mutation
  const completeMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number, isCompleted: boolean }) => {
      return apiRequest(`/api/medical-appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments"] });
      toast({
        title: "Success",
        description: "Appointment status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment status",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: AppointmentFormValues) => {
    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle edit appointment
  const handleEdit = (appointment: MedicalAppointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
    form.reset({
      userId: appointment.userId,
      title: appointment.title,
      appointmentType: appointment.appointmentType,
      doctorName: appointment.doctorName || "",
      location: appointment.location || "",
      appointmentDate: new Date(appointment.appointmentDate),
      duration: appointment.duration || 60,
      notes: appointment.notes || "",
      reminderSet: appointment.reminderSet,
      reminderTime: appointment.reminderTime ?? 24,
      isCompleted: appointment.isCompleted,
    });
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditingAppointment(null);
    setShowForm(false);
    form.reset();
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appointment: MedicalAppointment) => {
    const typeMatch = filterType === "all" || appointment.appointmentType === filterType;
    const statusMatch = filterStatus === "all" || 
      (filterStatus === "completed" && appointment.isCompleted) ||
      (filterStatus === "upcoming" && !appointment.isCompleted && isAfter(new Date(appointment.appointmentDate), new Date())) ||
      (filterStatus === "past" && !appointment.isCompleted && isBefore(new Date(appointment.appointmentDate), new Date()));
    
    return typeMatch && statusMatch;
  }).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

  // Get appointment status
  const getAppointmentStatus = (appointment: MedicalAppointment) => {
    if (appointment.isCompleted) return "completed";
    if (isBefore(new Date(appointment.appointmentDate), new Date())) return "past";
    return "upcoming";
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "secondary";
      case "past": return "destructive";
      case "upcoming": return "default";
      default: return "default";
    }
  };

  // Format appointment type for display
  const formatAppointmentType = (type: string) => {
    const typeOption = appointmentTypes.find(option => option.value === type);
    return typeOption ? typeOption.label : type;
  };

  if (!user) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground" data-testid="auth-required-message">
            Please log in to manage medical appointments.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Medical Appointments</h2>
          <p className="text-sm text-muted-foreground">
            Schedule and manage your medical appointments
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-appointment"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card data-testid="card-appointment-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {editingAppointment ? "Edit Appointment" : "Schedule New Appointment"}
            </CardTitle>
            <CardDescription>
              {editingAppointment 
                ? "Update your appointment details" 
                : "Schedule a new medical appointment with all the details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Appointment Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Nephrology Checkup"
                            data-testid="input-appointment-title"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Appointment Type */}
                  <FormField
                    control={form.control}
                    name="appointmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Type *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          data-testid="select-appointment-type"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select appointment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {appointmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Doctor Name */}
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctor Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Dr. Smith"
                            data-testid="input-doctor-name"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location/Clinic</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Main Medical Center"
                            data-testid="input-location"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Appointment Date */}
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Appointment Date & Time *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-appointment-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP p")
                                ) : (
                                  <span>Pick a date and time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < startOfDay(new Date())
                              }
                              initialFocus
                            />
                            <div className="p-3 border-t">
                              <FormLabel className="text-sm font-medium">Time</FormLabel>
                              <Input
                                type="time"
                                value={field.value ? format(field.value, "HH:mm") : ""}
                                onChange={(e) => {
                                  if (field.value && e.target.value) {
                                    const [hours, minutes] = e.target.value.split(":");
                                    const newDate = new Date(field.value);
                                    newDate.setHours(parseInt(hours), parseInt(minutes));
                                    field.onChange(newDate);
                                  }
                                }}
                                className="mt-1"
                                data-testid="input-appointment-time"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Duration */}
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                          data-testid="select-duration"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {durationOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes about this appointment..."
                          className="min-h-[80px]"
                          data-testid="textarea-notes"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reminder Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Reminder Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reminderSet"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              data-testid="switch-reminder-enabled"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enable Reminder</FormLabel>
                            <FormDescription>
                              Get notified before your appointment
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reminderTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder Time</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value?.toString()}
                            disabled={!form.watch("reminderSet")}
                            data-testid="select-reminder-time"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reminder time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {reminderOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value.toString()}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-appointment"
                    className="flex-1"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      "Saving..."
                    ) : editingAppointment ? (
                      "Update Appointment"
                    ) : (
                      "Schedule Appointment"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    data-testid="button-cancel-appointment"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Filter and Appointment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Your Appointments
          </CardTitle>
          <CardDescription>
            View and manage your scheduled medical appointments
          </CardDescription>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Type:</label>
              <Select value={filterType} onValueChange={setFilterType} data-testid="select-filter-type">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="select-filter-status">
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8" data-testid="loading-appointments">
              Loading appointments...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-appointments">
              {appointments.length === 0 
                ? "No appointments scheduled yet. Click 'Schedule Appointment' to add your first one."
                : "No appointments match your current filters."
              }
            </div>
          ) : (
            <div className="space-y-4" data-testid="appointments-list">
              {filteredAppointments.map((appointment: MedicalAppointment) => {
                const status = getAppointmentStatus(appointment);
                return (
                  <div 
                    key={appointment.id} 
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    data-testid={`appointment-${appointment.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold" data-testid={`text-appointment-title-${appointment.id}`}>
                            {appointment.title}
                          </h3>
                          <Badge 
                            variant={getStatusBadgeVariant(status)}
                            data-testid={`badge-status-${appointment.id}`}
                          >
                            {status}
                          </Badge>
                          <Badge variant="outline" data-testid={`badge-type-${appointment.id}`}>
                            {formatAppointmentType(appointment.appointmentType)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span data-testid={`text-appointment-date-${appointment.id}`}>
                              {format(new Date(appointment.appointmentDate), "PPP p")}
                            </span>
                          </div>
                          
                          {appointment.doctorName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span data-testid={`text-doctor-name-${appointment.id}`}>
                                {appointment.doctorName}
                              </span>
                            </div>
                          )}
                          
                          {appointment.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span data-testid={`text-location-${appointment.id}`}>
                                {appointment.location}
                              </span>
                            </div>
                          )}
                          
                          {appointment.duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span data-testid={`text-duration-${appointment.id}`}>
                                {appointment.duration} minutes
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-notes-${appointment.id}`}>
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {!appointment.isCompleted && status === "upcoming" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeMutation.mutate({ id: appointment.id, isCompleted: true })}
                            data-testid={`button-complete-${appointment.id}`}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(appointment)}
                          data-testid={`button-edit-${appointment.id}`}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(appointment.id)}
                          data-testid={`button-delete-${appointment.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}