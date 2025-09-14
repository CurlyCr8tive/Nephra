import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import csrf from "csurf";
import cookieParser from "cookie-parser";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

// SECURITY: Helper function to strip password from User objects before sending to client
function toPublicUser(user: User): Omit<User, 'password'> {
  const { password, ...publicUser } = user;
  return publicUser;
}

declare global {
  namespace Express {
    // Define Express.User to be the same as our User type from schema
    interface User {
      id: number;
      username: string;
      password: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      age: number | null;
      gender: string | null;
      weight: number | null;
      height: number | null;
      race: string | null;
      kidneyDiseaseType: string | null;
      kidneyDiseaseStage: number | null;
      diagnosisDate: Date | null;
      otherHealthConditions: string[] | null;
      primaryCareProvider: string | null;
      nephrologist: string | null;
      otherSpecialists: any | null;
      insuranceProvider: string | null;
      insurancePolicyNumber: string | null;
      transplantCenter: string | null;
      transplantCoordinator: string | null;
      transplantCoordinatorPhone: string | null;
      createdAt: Date | null;
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
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      return false;
    }
    
    // Get the hash buffers
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // SECURITY: Only use constant-time comparison, no fallbacks
    // Make sure we're comparing equal length buffers
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    
    // Use timing-safe comparison only - no fallback to prevent timing attacks
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    // Don't log sensitive information
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "nephra-health-security-2024", // Rotated secret
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: "nephra_secure_session", // New name to invalidate old sessions
    rolling: true, // Force cookie reissue on each request
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure in production
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax'
    }
  };

  app.set("trust proxy", 1);
  
  // Add cookie parser (required for csurf)
  app.use(cookieParser());
  
  app.use(session(sessionSettings));
  
  // CRITICAL CSRF PROTECTION: Secure origin validation for mutating requests
  app.use((req: any, res: any, next: any) => {
    const method = req.method;
    
    // Apply CSRF protection to state-changing methods
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      // Use configured allowed origins (DO NOT trust X-Forwarded-* headers)
      const allowedOrigins = [
        'http://localhost:5000',
        'https://localhost:5000',
        'http://127.0.0.1:5000',
        'https://127.0.0.1:5000',
        // Add production domain when deployed
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
      ];
      
      // Check Origin header first (preferred)
      const origin = req.get('Origin');
      if (origin) {
        if (!allowedOrigins.includes(origin)) {
          console.warn(`🚨 CSRF BLOCKED: Origin ${origin} not in allowed list ${allowedOrigins.join(', ')}`);
          return res.status(403).json({ error: 'CSRF: Invalid origin' });
        }
      } else {
        // Fallback to Referer check if Origin not present
        const referer = req.get('Referer');
        const refererIsAllowed = referer && allowedOrigins.some(origin => referer.startsWith(origin));
        if (!refererIsAllowed) {
          console.warn(`🚨 CSRF BLOCKED: Invalid referer ${referer}, allowed origins: ${allowedOrigins.join(', ')}`);
          return res.status(403).json({ error: 'CSRF: Invalid referer' });
        }
      }
      
      // Require JSON content-type for API endpoints to block form CSRF (handle charset variations)
      const contentType = req.get('Content-Type');
      if (req.path.startsWith('/api/') && (!contentType || !contentType.startsWith('application/json'))) {
        console.warn(`🚨 CSRF BLOCKED: Non-JSON content-type '${contentType}' on ${req.path}`);
        return res.status(403).json({ error: 'CSRF: JSON required' });
      }
    }
    
    // Legacy cookie attribute fix (kept for completeness)
    if (req.session && req.session.cookie) {
      req.session.cookie.sameSite = process.env.NODE_ENV === "production" ? 'strict' : 'lax';
      req.session.cookie.secure = process.env.NODE_ENV === "production";
      req.session.cookie.httpOnly = true;
    }
    
    next();
  });
  
  // CSRF Token Protection - Re-enabled with proper configuration
  const csrfProtection = csrf({
    cookie: false, // Use session storage instead of cookies
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for safe methods
    sessionKey: 'session', // Use the session for storing tokens
    value: (req) => {
      // Allow CSRF token from multiple sources
      return req.body._csrf || req.query._csrf || req.headers['x-csrf-token'] || req.headers['csrf-token'];
    }
  });
  app.use(csrfProtection);
  
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
        res.status(201).json(toPublicUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Demo login function for development/testing ONLY
  app.post("/api/login-demo", async (req, res) => {
    // SECURITY: Only allow demo login in development
    if (process.env.NODE_ENV === 'production') {
      console.warn('🚨 SECURITY: Demo login attempted in production');
      return res.status(403).json({ error: 'Demo login not available in production' });
    }
    try {
      // For demo purposes, we'll look up the demo user or create one if it doesn't exist
      const demoUsername = "demouser";
      const demoPassword = "demopassword";
      
      console.log(`Attempting demo login for: ${demoUsername}`);
      
      // First check if user is already logged in
      if (req.isAuthenticated() && req.user && req.user.username === demoUsername) {
        console.log(`Demo user already logged in as ${demoUsername}`);
        return res.status(200).json(toPublicUser(req.user));
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
      
      // Actually log in the user with a proper session
      console.log("Creating proper session for demo user");
      
      // Use the passport login method to create a session
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Demo login session error:", loginErr);
          return res.status(500).json({ error: "Session creation failed", details: loginErr.message });
        }
        
        console.log(`Demo login successful for: ${demoUsername} with session ID: ${req.sessionID}`);
        
        // Return success response with user data (except password)
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json({
          ...userWithoutPassword,
          demoLogin: true
        });
      });
    } catch (error) {
      console.error("Demo login error:", error);
      return res.status(500).json({ 
        error: "Demo login failed", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // SECURITY: Removed login-test endpoint - it allowed passwordless authentication bypass
  
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
        return res.status(200).json(toPublicUser(user));
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
    res.json(toPublicUser(req.user));
  });
}