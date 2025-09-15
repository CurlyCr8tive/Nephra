import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, Pill, Plus, Trash2, Edit3, CheckCircle, AlertCircle } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { insertMedicationReminderSchema, type MedicationReminder, type InsertMedicationReminder } from "@shared/schema";
import { cn } from "@/lib/utils";

// Form schema with additional validation
const medicationFormSchema = insertMedicationReminderSchema.extend({
  times: z.array(z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")).min(1, "At least one time is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

interface MedicationReminderProps {
  className?: string;
}

export function MedicationReminder({ className }: MedicationReminderProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [editingMedication, setEditingMedication] = useState<MedicationReminder | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form setup
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      userId: user?.id || 0,
      medicationName: "",
      dosage: "",
      frequency: "daily",
      times: ["08:00"],
      startDate: new Date(),
      endDate: undefined,
      isActive: true,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "times",
  });

  // Fetch medication reminders
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["/api/medication-reminders", user?.id],
    enabled: !!user?.id,
  });

  // Create medication mutation
  const createMutation = useMutation({
    mutationFn: async (data: MedicationFormValues) => {
      const { startDate, endDate, ...rest } = data;
      const medicationData = {
        ...rest,
        userId: user?.id || 0,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || null,
      };
      
      return apiRequest("/api/medication-reminders", {
        method: "POST",
        body: JSON.stringify(medicationData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-reminders"] });
      toast({
        title: "Success",
        description: "Medication reminder added successfully",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add medication reminder",
        variant: "destructive",
      });
    },
  });

  // Update medication mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<MedicationFormValues> }) => {
      const { startDate, endDate, ...rest } = data;
      const medicationData = {
        ...rest,
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
      };
      
      return apiRequest(`/api/medication-reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(medicationData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-reminders"] });
      toast({
        title: "Success", 
        description: "Medication reminder updated successfully",
      });
      setEditingMedication(null);
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update medication reminder",
        variant: "destructive",
      });
    },
  });

  // Delete medication mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/medication-reminders/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-reminders"] });
      toast({
        title: "Success",
        description: "Medication reminder deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete medication reminder",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      return apiRequest(`/api/medication-reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-reminders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update medication status",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: MedicationFormValues) => {
    if (editingMedication) {
      updateMutation.mutate({ id: editingMedication.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle edit medication
  const handleEdit = (medication: MedicationReminder) => {
    setEditingMedication(medication);
    setShowForm(true);
    form.reset({
      userId: medication.userId,
      medicationName: medication.medicationName,
      dosage: medication.dosage,
      frequency: medication.frequency,
      times: medication.times,
      startDate: new Date(medication.startDate),
      endDate: medication.endDate ? new Date(medication.endDate) : undefined,
      isActive: medication.isActive,
      notes: medication.notes || "",
    });
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditingMedication(null);
    setShowForm(false);
    form.reset();
  };

  // Add new time slot
  const addTimeSlot = () => {
    append("08:00");
  };

  // Remove time slot
  const removeTimeSlot = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    const frequencyMap: { [key: string]: string } = {
      daily: "Daily",
      twice_daily: "Twice Daily", 
      three_times_daily: "3 Times Daily",
      four_times_daily: "4 Times Daily",
      weekly: "Weekly",
      as_needed: "As Needed",
    };
    return frequencyMap[frequency] || frequency;
  };

  // Format times for display
  const formatTimes = (times: string[]) => {
    return times.map(time => {
      const [hours, minutes] = time.split(':');
      const hour12 = parseInt(hours) % 12 || 12;
      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    }).join(', ');
  };

  if (!user) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground" data-testid="auth-required-message">
            Please log in to manage medication reminders.
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
          <h2 className="text-2xl font-semibold text-foreground">Medication Reminders</h2>
          <p className="text-sm text-muted-foreground">
            Manage your daily medication schedule and reminders
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-medication"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Medication
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card data-testid="card-medication-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              {editingMedication ? "Edit Medication" : "Add New Medication"}
            </CardTitle>
            <CardDescription>
              {editingMedication 
                ? "Update your medication reminder details" 
                : "Set up a new medication reminder with schedule"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Medication Name */}
                  <FormField
                    control={form.control}
                    name="medicationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medication Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Lisinopril" 
                            data-testid="input-medication-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dosage */}
                  <FormField
                    control={form.control}
                    name="dosage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosage *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 10mg" 
                            data-testid="input-dosage"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Frequency */}
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-frequency">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="twice_daily">Twice Daily</SelectItem>
                          <SelectItem value="three_times_daily">3 Times Daily</SelectItem>
                          <SelectItem value="four_times_daily">4 Times Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="as_needed">As Needed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Times */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Reminder Times *</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeSlot}
                      data-testid="button-add-time"
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Time
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`times.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="time"
                                  data-testid={`input-time-${index}`}
                                  {...field}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(index)}
                            data-testid={`button-remove-time-${index}`}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                data-testid="button-start-date"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
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
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* End Date */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                data-testid="button-end-date"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick end date</span>
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
                              disabled={(date) => {
                                const startDate = form.getValues("startDate");
                                return date < startDate;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special instructions or notes about this medication..."
                          data-testid="textarea-notes"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    data-testid="button-cancel"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="button-save-medication"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      "Saving..."
                    ) : editingMedication ? (
                      "Update Medication"
                    ) : (
                      "Add Medication"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Medications List */}
      <Card data-testid="card-medications-list">
        <CardHeader>
          <CardTitle>Your Medications</CardTitle>
          <CardDescription>
            {medications.length === 0 
              ? "No medications added yet. Add your first medication above."
              : `${medications.length} medication${medications.length !== 1 ? 's' : ''} scheduled`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8" data-testid="loading-medications">
              <div className="text-muted-foreground">Loading medications...</div>
            </div>
          ) : medications.length === 0 ? (
            <div className="text-center py-8" data-testid="empty-medications">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No medications scheduled yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first medication to get started with reminders
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {medications.map((medication: MedicationReminder) => (
                <Card key={medication.id} className="bg-card" data-testid={`card-medication-${medication.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-foreground" data-testid={`text-medication-name-${medication.id}`}>
                              {medication.medicationName}
                            </h3>
                          </div>
                          <Badge variant={medication.isActive ? "default" : "secondary"} data-testid={`badge-status-${medication.id}`}>
                            {medication.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Dosage:</span>
                            <span data-testid={`text-dosage-${medication.id}`}>{medication.dosage}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Frequency:</span>
                            <span data-testid={`text-frequency-${medication.id}`}>{formatFrequency(medication.frequency)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span data-testid={`text-times-${medication.id}`}>{formatTimes(medication.times)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3" />
                            <span data-testid={`text-dates-${medication.id}`}>
                              {format(new Date(medication.startDate), "MMM d, yyyy")}
                              {medication.endDate && ` - ${format(new Date(medication.endDate), "MMM d, yyyy")}`}
                            </span>
                          </div>
                          {medication.notes && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs" data-testid={`text-notes-${medication.id}`}>
                              {medication.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Active Toggle */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={medication.isActive}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: medication.id, isActive: checked })
                            }
                            data-testid={`switch-active-${medication.id}`}
                            disabled={toggleActiveMutation.isPending}
                          />
                          <span className="text-xs text-muted-foreground">
                            {medication.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        
                        <Separator orientation="vertical" className="h-8" />
                        
                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(medication)}
                          data-testid={`button-edit-${medication.id}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${medication.medicationName}?`)) {
                              deleteMutation.mutate(medication.id);
                            }
                          }}
                          data-testid={`button-delete-${medication.id}`}
                          className="text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MedicationReminder;