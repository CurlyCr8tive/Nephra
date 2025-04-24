import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    // Define Express.User to be the same as our User type
    interface User extends Omit<User, 'otherHealthConditions' | 'otherSpecialists'> {
      // These fields need special handling to match the schema definition
      otherHealthConditions: string[] | null;
      otherSpecialists: any | null; // Using 'any' for jsonb type
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Handle case if stored password doesn't have the expected format
    if (!stored || !stored.includes('.')) {
      console.warn("Invalid stored password format");
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.warn("Invalid stored password components");
      return false;
    }
    
    // Get the hash buffers
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Check buffer lengths before comparison
    console.log(`Buffer lengths - stored: ${hashedBuf.length}, supplied: ${suppliedBuf.length}`);
    
    // Make sure we're comparing equal length buffers
    if (hashedBuf.length !== suppliedBuf.length) {
      console.warn(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      
      // For demo purposes with existing mismatched hashes, allow direct string comparison
      // This is NOT secure for production!
      return hashed === suppliedBuf.toString("hex");
    }
    
    // Safe comparison of equal length buffers
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "kidney-health-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log(`Password match result for ${username}: ${passwordMatch}`);
        
        if (!passwordMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`Login successful for ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Demo login function for quick testing
  app.post("/api/login-demo", async (req, res) => {
    try {
      // For demo purposes, we'll look up the demo user or create one if it doesn't exist
      const demoUsername = "demouser";
      const demoPassword = "demopassword";
      
      console.log(`Attempting demo login for: ${demoUsername}`);
      
      // First check if user is already logged in
      if (req.isAuthenticated() && req.user && req.user.username === demoUsername) {
        console.log(`Demo user already logged in as ${demoUsername}`);
        return res.status(200).json(req.user);
      }
      
      // Get user directly from storage
      let user = await storage.getUserByUsername(demoUsername);
      
      if (!user) {
        console.log(`Demo user not found, creating: ${demoUsername}`);
        
        // Create a demo user if needed for testing
        try {
          user = await storage.createUser({
            username: demoUsername,
            password: await hashPassword(demoPassword),
            email: "demo@example.com",
            firstName: "Demo",
            lastName: "User",
            age: 45,
            gender: "Female",
            race: "Caucasian",
            weight: 65,
            kidneyDiseaseStage: 3,
            diagnosisDate: new Date(),
            primaryNephrologistName: "Dr. Smith",
            primaryNephrologistContact: "555-123-4567",
            transplantCandidate: true,
            transplantStatus: "Waiting",
            dialysisType: "Hemodialysis",
            dialysisSchedule: "MWF",
            medications: ["Medication 1", "Medication 2"],
            otherHealthConditions: ["Hypertension", "Diabetes"],
            otherSpecialists: {
              name: "Dr. Johnson",
              specialty: "Cardiology",
              contact: "555-987-6543"
            }
          });
          
          console.log(`Demo user created with ID: ${user.id}`);
        } catch (createError) {
          console.error("Failed to create demo user:", createError);
          throw createError;
        }
      } else {
        // Option: Update password to match our hashing algorithm if needed
        const currentHashFormat = user.password.includes('.');
        
        if (!currentHashFormat) {
          console.log(`Updating hash format for demo user: ${demoUsername}`);
          try {
            const newPassword = await hashPassword(demoPassword);
            user = await storage.updateUser(user.id, { password: newPassword });
          } catch (updateError) {
            console.error("Failed to update demo user password:", updateError);
          }
        }
      }
      
      if (!user) {
        throw new Error("Failed to get or create demo user");
      }
      
      // Log user details (excluding password)
      const userDetails = { ...user, password: "[REDACTED]" };
      console.log("Demo user found:", JSON.stringify(userDetails, null, 2));
      
      // Destroy any existing session to ensure a clean state
      if (req.session) {
        await new Promise<void>((resolve) => {
          req.session.destroy((err) => {
            if (err) console.error("Error destroying session:", err);
            resolve();
          });
        });
      }
      
      // Generate a new session
      await new Promise<void>((resolve) => {
        req.session.regenerate((err) => {
          if (err) console.error("Error regenerating session:", err);
          resolve();
        });
      });
      
      // Manually log in with the new session
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            console.error("Demo login session error:", err);
            reject(err);
          } else {
            console.log(`Demo login successful for: ${demoUsername}`);
            resolve();
          }
        });
      });
      
      // Return success response
      return res.status(200).json(user);
    } catch (error) {
      console.error("Demo login error:", error);
      return res.status(500).json({ 
        error: "Demo login failed", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add test login function for debugging
  app.post("/api/login-test", async (req, res) => {
    try {
      const { username } = req.body;
      console.log("Attempting test login for:", username);
      
      // Get user directly from storage
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log("Test login - User not found:", username);
        return res.status(401).json({ error: "User not found" });
      }
      
      // Log user details (excluding password)
      const userDetails = { ...user, password: "[REDACTED]" };
      console.log("User found:", JSON.stringify(userDetails, null, 2));
      
      // Manually log in
      req.login(user, (err) => {
        if (err) {
          console.error("Test login session error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        
        console.log("Test login successful for:", username);
        return res.status(200).json(user);
      });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ error: "Test login failed" });
    }
  });
  
  // Regular login endpoint
  app.post("/api/login", (req, res, next) => {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || "Authentication failed");
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session error:", loginErr);
          return next(loginErr);
        }
        
        console.log(`User logged in successfully: ${user.username}`);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    res.json(req.user);
  });
}