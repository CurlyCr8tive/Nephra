import { Router } from "express";
import { storage } from "./storage";
import { insertHealthAlertSchema } from "@shared/schema";

const router = Router();

// Get all health alerts for a user
router.get("/health-alerts", async (req, res) => {
  try {
    // Check authentication
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Access userId safely with type assertion
    const userId = (req.user as any).id;
    console.log(`Fetching health alerts for authenticated user ID: ${userId}`);
    
    const alerts = await storage.getHealthAlerts(userId);
    console.log(`Found ${alerts.length} health alerts for user ${userId}`);

    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error fetching health alerts:", error);
    res.status(500).json({ error: "Failed to fetch health alerts" });
  }
});

// Get health alerts by id
router.get("/health-alerts/:id", async (req, res) => {
  try {
    // Check authentication
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: "Invalid alert ID" });
    }

    const alert = await storage.getHealthAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({ error: "Health alert not found" });
    }

    // Verify the alert belongs to the authenticated user
    if (alert.userId !== (req.user as any).id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.status(200).json(alert);
  } catch (error) {
    console.error("Error fetching health alert:", error);
    res.status(500).json({ error: "Failed to fetch health alert" });
  }
});

// Create a new health alert
router.post("/health-alerts", async (req, res) => {
  try {
    console.log("Creating health alert:", req.body);
    
    // Check authentication
    if (!req.isAuthenticated() && !req.body.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Use either authenticated user ID or the one provided in the request
    const userId = req.isAuthenticated() ? (req.user as any).id : req.body.userId;
    
    // Validate request data
    const validationResult = insertHealthAlertSchema.safeParse({
      ...req.body,
      userId
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid health alert data", 
        details: validationResult.error.errors 
      });
    }

    const alertData = validationResult.data;
    const alert = await storage.createHealthAlert(alertData);

    res.status(201).json(alert);
  } catch (error) {
    console.error("Error creating health alert:", error);
    res.status(500).json({ error: "Failed to create health alert" });
  }
});

// Acknowledge a health alert
router.post("/health-alerts/:id/acknowledge", async (req, res) => {
  try {
    // Check authentication
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: "Invalid alert ID" });
    }

    const alert = await storage.getHealthAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({ error: "Health alert not found" });
    }

    // Verify the alert belongs to the authenticated user
    if (alert.userId !== (req.user as any).id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Acknowledge the alert
    const updatedAlert = await storage.acknowledgeHealthAlert(alertId);

    res.status(200).json(updatedAlert);
  } catch (error) {
    console.error("Error acknowledging health alert:", error);
    res.status(500).json({ error: "Failed to acknowledge health alert" });
  }
});

export default router;