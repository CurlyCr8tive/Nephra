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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
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