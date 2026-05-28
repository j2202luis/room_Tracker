import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { UserProfile, AccessRequest, Classroom, Subject, Schedule, InstructorAvailability, Enrollment } from "./src/types";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json());

// Seeds for the filesystem database
const SEED_USERS: UserProfile[] = [
  {
    id: "admin-1",
    email: "admin@ssct.edu.ph",
    fullName: "Admin Classroom Tracker",
    role: "admin",
    isApproved: true,
    mustChangePassword: true,
    passwordHash: "Admin@123",
    status: "active",
  },
  {
    id: "admin-2",
    email: "admin2@ssct.edu.ph",
    fullName: "System Admin (Immediate Access)",
    role: "admin",
    isApproved: true,
    mustChangePassword: false,
    passwordHash: "Admin@123",
    status: "active",
  },
  {
    id: "instructor-1",
    email: "instructor@ssct.edu.ph",
    fullName: "Dr. Evelyn Garcia",
    role: "instructor",
    isApproved: true,
    mustChangePassword: true,
    passwordHash: "Instructor@123",
    status: "active",
    approvedBy: "admin-1",
    approvedAt: new Date().toISOString(),
  },
  {
    id: "student-1",
    email: "student@ssct.edu.ph",
    fullName: "Marcus Aurelius",
    role: "student",
    isApproved: true,
    mustChangePassword: true,
    passwordHash: "Student@123",
    status: "active",
    approvedBy: "admin-1",
    approvedAt: new Date().toISOString(),
  }
];

const SEED_REQUESTS: AccessRequest[] = [
  {
    id: "req-1",
    fullName: "Prof. Roberto Ramos",
    email: "rramos@ssct.edu.ph",
    role: "instructor",
    reason: "Need access to arrange schedules for Advanced Mechatronics and Robotics laboratory classes.",
    status: "pending",
    requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "req-2",
    fullName: "Samantha Alcantara",
    email: "salcantara@ssct.edu.ph",
    role: "student",
    reason: "To check available computer laboratory schedules for IT students during self-study hours.",
    status: "pending",
    requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "req-3",
    fullName: "Rejected Applicant",
    email: "rejected@ssct.edu.ph",
    role: "student",
    reason: "Testing access request system rejections.",
    status: "rejected",
    requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    reviewedBy: "admin-1",
    reviewedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
  }
];

const SEED_CLASSROOMS: Classroom[] = [
  { id: "room-1", name: "Computer Lab 301", building: "COE Building", capacity: 40 },
  { id: "room-2", name: "Lecture Hall Room 102", building: "Main Building", capacity: 60 },
  { id: "room-3", name: "Drafting Lab 404", building: "Engineering Complex", capacity: 35 },
  { id: "room-4", name: "Chemistry Lab Room 205", building: "Science Wing", capacity: 30 }
];

const SEED_SUBJECTS: Subject[] = [
  { id: "sub-1", code: "IT-311", name: "Web Development Technologies", instructorId: "instructor-1" },
  { id: "sub-2", code: "CS-412", name: "Artificial Intelligence & Machine Learning", instructorId: "instructor-1" },
  { id: "sub-3", code: "ENG-101", name: "Technical Communications", instructorId: "instructor-1" }
];

const SEED_SCHEDULES: Schedule[] = [
  {
    id: "sched-1",
    subjectId: "sub-1",
    classroomId: "room-1",
    instructorId: "instructor-1",
    dayOfWeek: "Monday",
    startTime: "08:30",
    endTime: "11:30"
  },
  {
    id: "sched-2",
    subjectId: "sub-2",
    classroomId: "room-1",
    instructorId: "instructor-1",
    dayOfWeek: "Wednesday",
    startTime: "13:00",
    endTime: "16:00"
  },
  {
    id: "sched-3",
    subjectId: "sub-3",
    classroomId: "room-2",
    instructorId: "instructor-1",
    dayOfWeek: "Tuesday",
    startTime: "10:00",
    endTime: "12:00"
  }
];

const SEED_AVAILABILITY: InstructorAvailability[] = [
  { id: "avail-1", instructorId: "instructor-1", dayOfWeek: "Monday", startTime: "08:00", endTime: "12:00", isAvailable: true },
  { id: "avail-2", instructorId: "instructor-1", dayOfWeek: "Wednesday", startTime: "13:00", endTime: "17:00", isAvailable: true },
  { id: "avail-3", instructorId: "instructor-1", dayOfWeek: "Tuesday", startTime: "09:00", endTime: "15:00", isAvailable: true }
];

const SEED_ENROLLMENTS: Enrollment[] = [
  { id: "enr-1", studentId: "student-1", subjectId: "sub-1" },
  { id: "enr-2", studentId: "student-1", subjectId: "sub-2" }
];

interface LockoutRecord {
  email: string;
  failedCount: number;
  lockedUntil: string | null;
}

interface DatabaseSchema {
  users: UserProfile[];
  requests: AccessRequest[];
  classrooms: Classroom[];
  subjects: Subject[];
  schedules: Schedule[];
  availability: InstructorAvailability[];
  enrollments: Enrollment[];
  lockouts: LockoutRecord[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: SEED_USERS,
  requests: SEED_REQUESTS,
  classrooms: SEED_CLASSROOMS,
  subjects: SEED_SUBJECTS,
  schedules: SEED_SCHEDULES,
  availability: SEED_AVAILABILITY,
  enrollments: SEED_ENROLLMENTS,
  lockouts: []
};

// Database state managers (Django style model routing simulation)
function readDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
      return DEFAULT_DB;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content) as DatabaseSchema;
  } catch (err) {
    console.error("Critical error reading persistent storage schema:", err);
    return DEFAULT_DB;
  }
}

function writeDatabase(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Critical error persisting database tables:", err);
  }
}

// ----------------------------------------------------
// DB Endpoints (Emulating Django REST API serializers)
// ----------------------------------------------------

app.get("/api/db", (req, res) => {
  const db = readDatabase();
  res.json({
    status: "ok",
    message: "Django DB bootstrap state retrieved successfully.",
    data: db
  });
});

app.post("/api/sync", (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    res.status(400).json({ error: "Missing key for transactional commit." });
    return;
  }
  const db = readDatabase();
  
  if (key === "ssct_users") db.users = value;
  else if (key === "ssct_requests") db.requests = value;
  else if (key === "ssct_classrooms") db.classrooms = value;
  else if (key === "ssct_subjects") db.subjects = value;
  else if (key === "ssct_schedules") db.schedules = value;
  else if (key === "ssct_availability") db.availability = value;
  else if (key === "ssct_enrollments") db.enrollments = value;
  else if (key === "ssct_lockouts") db.lockouts = value;
  else {
    res.status(400).json({ error: "Unknown table relation mapping." });
    return;
  }

  writeDatabase(db);
  res.json({ status: "committed", table: key });
});

// Django Admin Mock Telemetry Console
app.get("/api/django/diagnostics", (req, res) => {
  const db = readDatabase();
  const disk = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0;
  
  res.json({
    framework: "Django (emulated on Express API Route Engine)",
    version: "Django v5.0.3 (Simulated)",
    database: {
      engine: "django.db.backends.sqlite3",
      source_file: "db.json",
      file_size_bytes: disk,
    },
    tables: {
      auth_user: db.users.length,
      access_requests: db.requests.length,
      academic_classrooms: db.classrooms.length,
      academic_subjects: db.subjects.length,
      academic_schedules: db.schedules.length,
      faculty_availabilities: db.availability.length,
      academic_enrollments: db.enrollments.length,
    },
    system: {
      uptime_seconds: process.uptime(),
      node_version: process.version,
      platform: process.platform,
    }
  });
});

// Vite frontend integration setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`--------------------------------------------------`);
    console.log(`DJANGO DEV SERVER EMBEDDED ENGINE ONLINE`);
    console.log(`Active URL: http://0.0.0.0:${PORT}`);
    console.log(`Database engine loaded. Model schemas initialized.`);
    console.log(`--------------------------------------------------`);
  });
}

startServer();
