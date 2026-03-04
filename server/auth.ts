import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
// csurf import removed - using origin-based CSRF protection instead
import cookieParser from "cookie-parser";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import {
  PORTFOLIO_DEMO_USERNAME,
  portfolioDemoProfile,
  seedPortfolioDemoData,
} from "./utils/portfolioDemo";

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
      // Base allowed origins
      const allowedOrigins = [
        'http://localhost:5000',
        'https://localhost:5000',
        'http://127.0.0.1:5000',
        'https://127.0.0.1:5000',
        // Add production domain when deployed
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
      ];
      
      // Get the current origin to check
      const origin = req.get('Origin');
      const referer = req.get('Referer');
      
      console.log(`🔍 CSRF Check: Method ${method}, Origin: ${origin}, Referer: ${referer}`);
      
      // SECURITY FIX: Enhanced Replit domain support for development environment
      if (process.env.NODE_ENV !== 'production') {
        // Add comprehensive Replit domain patterns
        if (origin) {
          // More comprehensive Replit domain matching
          if (origin.includes('replit.dev') || 
              origin.includes('repl.co') ||
              origin.includes('janeway.replit.dev') ||
              origin.includes('repl.it') ||
              origin.match(/https?:\/\/[a-f0-9-]+-[a-f0-9-]+\.[\w-]+\.replit(\.dev|\.co)/)) {
            allowedOrigins.push(origin);
            console.log(`✅ Added Replit origin: ${origin}`);
          }
        }
        
        // Also check referer for Replit patterns
        if (referer && !origin) {
          if (referer.includes('replit.dev') || 
              referer.includes('repl.co') ||
              referer.includes('janeway.replit.dev') ||
              referer.includes('repl.it')) {
            // Extract origin from referer
            try {
              const refererUrl = new URL(referer);
              const refererOrigin = refererUrl.origin;
              allowedOrigins.push(refererOrigin);
              console.log(`✅ Added Replit origin from referer: ${refererOrigin}`);
            } catch (e) {
              console.warn(`Could not parse referer as URL: ${referer}`);
            }
          }
        }
      }
      
      console.log(`🔍 Final allowed origins: ${allowedOrigins.join(', ')}`);
      
      // Check Origin header first (preferred)
      if (origin) {
        if (!allowedOrigins.includes(origin)) {
          console.warn(`🚨 CSRF BLOCKED: Origin ${origin} not in allowed list`);
          return res.status(403).json({ error: 'CSRF: Invalid origin' });
        } else {
          console.log(`✅ Origin ${origin} allowed`);
        }
      } else if (referer) {
        // Fallback to Referer check if Origin not present
        const refererIsAllowed = allowedOrigins.some(allowedOrigin => referer.startsWith(allowedOrigin));
        if (!refererIsAllowed) {
          console.warn(`🚨 CSRF BLOCKED: Invalid referer ${referer}`);
          return res.status(403).json({ error: 'CSRF: Invalid referer' });
        } else {
          console.log(`✅ Referer ${referer} allowed`);
        }
      } else {
        console.warn(`🚨 CSRF BLOCKED: No Origin or Referer header present`);
        return res.status(403).json({ error: 'CSRF: No origin header' });
      }
      
      // Require JSON content-type for API endpoints to block form CSRF (handle charset variations)
      const contentType = req.get('Content-Type');
      if (req.path.startsWith('/api/') && (!contentType || !contentType.startsWith('application/json'))) {
        console.warn(`🚨 CSRF BLOCKED: Non-JSON content-type '${contentType}' on ${req.path}`);
        return res.status(403).json({ error: 'CSRF: JSON required' });
      }
      
      console.log(`✅ CSRF validation passed for ${method} ${req.path}`);
    }
    
    // Legacy cookie attribute fix (kept for completeness)
    if (req.session && req.session.cookie) {
      req.session.cookie.sameSite = process.env.NODE_ENV === "production" ? 'strict' : 'lax';
      req.session.cookie.secure = process.env.NODE_ENV === "production";
      req.session.cookie.httpOnly = true;
    }
    
    next();
  });
  
  // CSRF Protection Note: Token-based csurf is DISABLED
  // We use origin/referer-based CSRF protection above (lines 111-209) which is sufficient
  // for modern browsers when combined with JSON content-type requirements.
  // The origin-based approach is simpler and doesn't require token management on the frontend.
  
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

  // Public portfolio demo login.
  app.post("/api/login-demo", async (req, res) => {
    try {
      let user = await storage.getUserByUsername(PORTFOLIO_DEMO_USERNAME);

      if (!user) {
        user = await storage.createUser({
          ...portfolioDemoProfile,
          password: await hashPassword(`demo-${randomBytes(12).toString("hex")}`),
        });
      } else {
        user = await storage.updateUser(user.id, portfolioDemoProfile) ?? user;

        if (!user.password || !user.password.includes(".")) {
          user = (await storage.updateUser(user.id, {
            password: await hashPassword(`demo-${randomBytes(12).toString("hex")}`),
          })) ?? user;
        }
      }

      if (!user) {
        throw new Error("Failed to provision the portfolio demo account");
      }

      await seedPortfolioDemoData(user.id);

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Session creation failed", details: loginErr.message });
        }

        return res.status(200).json({
          ...toPublicUser(user),
          demoLogin: true,
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
