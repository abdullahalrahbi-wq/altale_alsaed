import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || "quran_competition.db";
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('site_logo', null);
  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('site_name', 'مدرسة الطالع السعيد لتدريس القرآن الكريم');

  CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    registration_code TEXT,
    judging_code TEXT,
    logo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    rank INTEGER DEFAULT 0,
    juz_count INTEGER DEFAULT 1,
    positions_count INTEGER DEFAULT 5,
    pass_threshold REAL DEFAULT 70.0,
    FOREIGN KEY(competition_id) REFERENCES competitions(id)
  );

  CREATE TABLE IF NOT EXISTS criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER,
    name TEXT NOT NULL,
    max_score REAL NOT NULL,
    FOREIGN KEY(level_id) REFERENCES levels(id)
  );

  CREATE TABLE IF NOT EXISTS contestants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    civil_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    town TEXT NOT NULL,
    gender TEXT, -- 'male' or 'female'
    competition_id INTEGER,
    level_id INTEGER,
    status TEXT DEFAULT 'registered',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(competition_id) REFERENCES competitions(id),
    FOREIGN KEY(level_id) REFERENCES levels(id)
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contestant_id INTEGER,
    judge_id INTEGER,
    criteria_id INTEGER,
    juz_index INTEGER DEFAULT 0,
    score REAL NOT NULL,
    judge_name TEXT,
    judge_phone TEXT,
    FOREIGN KEY(contestant_id) REFERENCES contestants(id),
    FOREIGN KEY(criteria_id) REFERENCES criteria(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL -- 'admin' or 'judge'
  );

  CREATE TABLE IF NOT EXISTS imported_contestants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    civil_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    town TEXT NOT NULL,
    gender TEXT, -- 'male' or 'female'
    level_name TEXT,
    competition_id INTEGER,
    registered INTEGER DEFAULT 0,
    FOREIGN KEY(competition_id) REFERENCES competitions(id)
  );
`);

// Migrations for existing databases
try {
  db.prepare("ALTER TABLE contestants ADD COLUMN gender TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE competitions ADD COLUMN registration_code TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE competitions ADD COLUMN judging_code TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE competitions ADD COLUMN logo_url TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE levels ADD COLUMN juz_count INTEGER DEFAULT 1").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE levels ADD COLUMN positions_count INTEGER DEFAULT 5").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE evaluations ADD COLUMN juz_index INTEGER DEFAULT 0").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE evaluations ADD COLUMN judge_name TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE evaluations ADD COLUMN judge_phone TEXT").run();
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_contestants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      civil_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      town TEXT NOT NULL,
      gender TEXT,
      level_name TEXT,
      competition_id INTEGER,
      registered INTEGER DEFAULT 0,
      FOREIGN KEY(competition_id) REFERENCES competitions(id)
    );
  `);
} catch (e) {}

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

// Initialize Memorization System Database Tables
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memo_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin', 'teacher', 'supervisor', 'parent'
      code TEXT UNIQUE NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memo_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      village TEXT,
      parent_phone TEXT,
      parent_code TEXT UNIQUE,
      parent_id INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memo_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      created_by INTEGER
    );

    CREATE TABLE IF NOT EXISTS memo_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      program_id INTEGER,
      teacher_id INTEGER,
      village TEXT,
      level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(program_id) REFERENCES memo_programs(id),
      FOREIGN KEY(teacher_id) REFERENCES memo_users(id)
    );

    CREATE TABLE IF NOT EXISTS memo_group_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      student_id INTEGER,
      FOREIGN KEY(group_id) REFERENCES memo_groups(id),
      FOREIGN KEY(student_id) REFERENCES memo_students(id)
    );

    CREATE TABLE IF NOT EXISTS memo_supervisors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS memo_teacher_supervisor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER,
      supervisor_id INTEGER,
      FOREIGN KEY(teacher_id) REFERENCES memo_users(id),
      FOREIGN KEY(supervisor_id) REFERENCES memo_supervisors(id)
    );

    CREATE TABLE IF NOT EXISTS memo_quran_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_name TEXT NOT NULL,
      surah_number INTEGER,
      section_name TEXT,
      from_ayah INTEGER,
      to_ayah INTEGER,
      juz INTEGER,
      order_number INTEGER
    );

    CREATE TABLE IF NOT EXISTS memo_program_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER,
      section_id INTEGER,
      FOREIGN KEY(program_id) REFERENCES memo_programs(id),
      FOREIGN KEY(section_id) REFERENCES memo_quran_sections(id)
    );

    CREATE TABLE IF NOT EXISTS memo_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      group_id INTEGER,
      teacher_id INTEGER,
      program_id INTEGER,
      section_id INTEGER,
      status TEXT DEFAULT 'لم يبدأ', -- 'لم يبدأ', 'جاري الحفظ', 'تم الحفظ', 'تم التسميع الأول', 'تم التسميع الثاني / مراجعة وتثبيت'
      first_recitation_done INTEGER DEFAULT 0,
      first_recitation_date TEXT,
      second_recitation_done INTEGER DEFAULT 0,
      second_recitation_date TEXT,
      mastery_level TEXT, -- 'ممتاز', 'جيد جداً', 'جيد', 'يحتاج متابعة'
      teacher_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES memo_students(id),
      FOREIGN KEY(group_id) REFERENCES memo_groups(id),
      FOREIGN KEY(teacher_id) REFERENCES memo_users(id),
      FOREIGN KEY(program_id) REFERENCES memo_programs(id),
      FOREIGN KEY(section_id) REFERENCES memo_quran_sections(id)
    );

    CREATE TABLE IF NOT EXISTS memo_supervisor_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supervisor_id INTEGER,
      teacher_id INTEGER,
      group_id INTEGER,
      message TEXT NOT NULL,
      rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0,
      FOREIGN KEY(supervisor_id) REFERENCES memo_supervisors(id),
      FOREIGN KEY(teacher_id) REFERENCES memo_users(id),
      FOREIGN KEY(group_id) REFERENCES memo_groups(id)
    );

    CREATE TABLE IF NOT EXISTS memo_parent_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      student_id INTEGER,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin for Memorization System
  const memoAdminExists = db.prepare("SELECT * FROM memo_users WHERE role = 'admin'").get();
  if (!memoAdminExists) {
    db.prepare("INSERT INTO memo_users (name, role, code, phone, status) VALUES (?, ?, ?, ?, ?)")
      .run("إدارة التحفيظ والمتابعة", "admin", "admin2026", "99998888", "active");
  } else {
    // If admin already exists but with the old code, update it to admin2026
    try {
      db.prepare("UPDATE memo_users SET code = 'admin2026' WHERE role = 'admin' AND code = 'admin77'").run();
    } catch (e) {
      console.error("Failed to migrate admin77 to admin2026:", e);
    }
  }

  // Pre-seed Quran sections with Juz 30 and Fatihah if table is empty
  const sectionCount = db.prepare("SELECT COUNT(*) as count FROM memo_quran_sections").get() as { count: number };
  if (sectionCount.count === 0) {
    const defaultSections = [
      { num: 1, name: "سورة الفاتحة", juz: 1 },
      { num: 78, name: "سورة النبأ", juz: 30 },
      { num: 79, name: "سورة النازعات", juz: 30 },
      { num: 80, name: "سورة عبس", juz: 30 },
      { num: 81, name: "سورة التكوير", juz: 30 },
      { num: 82, name: "سورة الانفطار", juz: 30 },
      { num: 83, name: "سورة المطففين", juz: 30 },
      { num: 84, name: "سورة الانشقاق", juz: 30 },
      { num: 85, name: "سورة البروج", juz: 30 },
      { num: 86, name: "سورة الطارق", juz: 30 },
      { num: 87, name: "سورة الأعلى", juz: 30 },
      { num: 88, name: "سورة الغاشية", juz: 30 },
      { num: 89, name: "سورة الفجر", juz: 30 },
      { num: 90, name: "سورة البلد", juz: 30 },
      { num: 91, name: "سورة الشمس", juz: 30 },
      { num: 92, name: "سورة الليل", juz: 30 },
      { num: 93, name: "سورة الضحى", juz: 30 },
      { num: 94, name: "سورة الشرح", juz: 30 },
      { num: 95, name: "سورة التين", juz: 30 },
      { num: 96, name: "سورة العلق", juz: 30 },
      { num: 97, name: "سورة القدر", juz: 30 },
      { num: 98, name: "سورة البينة", juz: 30 },
      { num: 99, name: "سورة الزلزلة", juz: 30 },
      { num: 100, name: "سورة العاديات", juz: 30 },
      { num: 101, name: "سورة القارعة", juz: 30 },
      { num: 102, name: "سورة التكاثر", juz: 30 },
      { num: 103, name: "سورة العصر", juz: 30 },
      { num: 104, name: "سورة الهمزة", juz: 30 },
      { num: 105, name: "سورة الفيل", juz: 30 },
      { num: 106, name: "سورة قريش", juz: 30 },
      { num: 107, name: "سورة الماعون", juz: 30 },
      { num: 108, name: "سورة الكوثر", juz: 30 },
      { num: 109, name: "سورة الكافرون", juz: 30 },
      { num: 110, name: "سورة النصر", juz: 30 },
      { num: 111, name: "سورة المسد", juz: 30 },
      { num: 112, name: "سورة الإخلاص", juz: 30 },
      { num: 113, name: "سورة الفلق", juz: 30 },
      { num: 114, name: "سورة الناس", juz: 30 }
    ];

    const insertSection = db.prepare(`
      INSERT INTO memo_quran_sections (surah_name, surah_number, section_name, from_ayah, to_ayah, juz, order_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      defaultSections.forEach((s, idx) => {
        insertSection.run(s.name, s.num, "كامل السورة", 1, null, s.juz, idx + 1);
      });
    })();
  }
} catch (e) {
  console.error("Error creating/seeding memo_ tables:", e);
}

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Logo upload setup
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `logo_${Date.now()}${ext}`);
    }
  });

  const upload = multer({ storage });

  // Serve uploads as static files
  app.use("/uploads", express.static(uploadDir));

  // --- API Routes ---

  // Global settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM global_settings").all() as any[];
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/admin/settings/logo", upload.single("logo"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    db.prepare("UPDATE global_settings SET value = ? WHERE key = ?").run(logoUrl, "site_logo");
    res.json({ success: true, logoUrl });
  });

  // Update logo url
  app.post("/api/competition/logo", (req, res) => {
    const { id, logo_url } = req.body;
    db.prepare("UPDATE competitions SET logo_url = ? WHERE id = ?").run(logo_url, id);
    res.json({ success: true });
  });

  // Get active competition
  app.get("/api/competition/active", (req, res) => {
    const competition = db.prepare("SELECT * FROM competitions WHERE active = 1 ORDER BY year DESC LIMIT 1").get() as any;
    if (!competition) return res.json(null);
    const levels = db.prepare("SELECT * FROM levels WHERE competition_id = ?").all(competition.id);
    res.json({ ...competition, levels });
  });

  // Get all competitions (admin)
  app.get("/api/admin/competitions", (req, res) => {
    const competitions = db.prepare("SELECT * FROM competitions ORDER BY year DESC, id DESC").all();
    res.json(competitions);
  });

  // Activate competition
  app.post("/api/admin/competition/activate", (req, res) => {
    const { id } = req.body;
    try {
      db.transaction(() => {
        db.prepare("UPDATE competitions SET active = 0").run();
        db.prepare("UPDATE competitions SET active = 1 WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register contestant
  app.post("/api/register", (req, res) => {
    const { name, civil_id, phone, town, gender, competition_id, level_id } = req.body;

    // Check if contestant already passed this level or higher in previous years
    const currentLevel = db.prepare("SELECT rank, juz_count FROM levels WHERE id = ?").get(level_id) as any;
    
    const previousPass = db.prepare(`
      SELECT l.rank, l.juz_count, l.pass_threshold, AVG(e.score) as avg_score
      FROM contestants c
      JOIN levels l ON c.level_id = l.id
      JOIN evaluations e ON c.id = e.contestant_id
      WHERE c.civil_id = ? AND c.competition_id != ?
      GROUP BY c.id
      HAVING avg_score >= l.pass_threshold
    `).all(civil_id, competition_id);

    // Progression rule: must be higher rank OR higher juz_count
    const alreadyPassedHigherOrSame = previousPass.some((p: any) => 
      p.rank >= currentLevel.rank || p.juz_count >= currentLevel.juz_count
    );

    if (alreadyPassedHigherOrSame) {
      return res.status(400).json({ error: "لقد اجتزت هذا المستوى أو مستوى أعلى سابقاً بنجاح، يرجى التسجيل في مستوى أعلى من حيث عدد الأجزاء أو الرتبة." });
    }

    try {
      const result = db.prepare(`
        INSERT INTO contestants (name, civil_id, phone, town, gender, competition_id, level_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, civil_id, phone, town, gender, competition_id, level_id);
      
      // Also mark as registered in imported_contestants if exists
      try {
        db.prepare(`
          UPDATE imported_contestants
          SET registered = 1
          WHERE civil_id = ? AND competition_id = ?
        `).run(String(civil_id), competition_id);
      } catch (e) {}

      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get contestants for judging
  app.get("/api/contestants", (req, res) => {
    const judgeId = req.query.judge_id || 0;
    
    // Fetch active competition ID
    const activeComp = db.prepare("SELECT id FROM competitions WHERE active = 1 ORDER BY year DESC LIMIT 1").get() as any;
    const activeCompId = activeComp?.id || 0;

    const contestants = db.prepare(`
      SELECT c.*, l.name as level_name, l.description as level_description, l.juz_count, l.positions_count,
        (SELECT COUNT(DISTINCT judge_id) FROM evaluations WHERE contestant_id = c.id) as judge_count,
        (SELECT COUNT(*) FROM evaluations WHERE contestant_id = c.id AND judge_id = ?) as already_judged_by_me
      FROM contestants c 
      JOIN levels l ON c.level_id = l.id
      WHERE c.competition_id = ? AND already_judged_by_me = 0
    `).all(judgeId, activeCompId);
    res.json(contestants);
  });

  // Get evaluation criteria for a level
  app.get("/api/criteria/:levelId", (req, res) => {
    const criteria = db.prepare("SELECT * FROM criteria WHERE level_id = ?").all(req.params.levelId);
    res.json(criteria);
  });

  // Get completed judge ids for a contestant
  app.get("/api/contestants/:id/completed-judges", (req, res) => {
    const { id } = req.params;
    try {
      const evaluations = db.prepare("SELECT DISTINCT judge_id FROM evaluations WHERE contestant_id = ?").all(id) as { judge_id: number }[];
      res.json(evaluations.map(e => Number(e.judge_id)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit evaluation
  app.post("/api/evaluate", (req, res) => {
    const { contestant_id, judge_id, judge_name, judge_phone, scores } = req.body; // scores: [ { juz_index, criteria_id, score } ]

    // Security check: Verify if this judge has already evaluated this contestant
    try {
      const existing = db.prepare("SELECT COUNT(*) as count FROM evaluations WHERE contestant_id = ? AND judge_id = ?").get(contestant_id, judge_id) as { count: number };
      if (existing && existing.count > 0) {
        return res.status(400).json({ error: "⚠️ لقد قام هذا المقيم برصد درجات هذا المتسابق مسبقاً! يرجى اختيار رقم المقيم الآخر لمتابعة رصد الدرجات." });
      }
    } catch (dbError) {
      console.error("Database check error:", dbError);
    }

    const insert = db.prepare("INSERT INTO evaluations (contestant_id, judge_id, criteria_id, juz_index, score, judge_name, judge_phone) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    const transaction = db.transaction((evals) => {
      for (const item of evals) {
        insert.run(contestant_id, judge_id, item.criteria_id, item.juz_index, item.score, judge_name, judge_phone);
      }
    });

    try {
      transaction(scores);
      
      // Check if we have 2 judges now
      const judgeCount = db.prepare("SELECT COUNT(DISTINCT judge_id) as count FROM evaluations WHERE contestant_id = ?").get(contestant_id) as { count: number };
      if (judgeCount.count >= 2) {
        db.prepare("UPDATE contestants SET status = 'evaluated' WHERE id = ?").run(contestant_id);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get results for admin
  app.get("/api/results", (req, res) => {
    let competitionId = req.query.competition_id;
    if (!competitionId) {
      const activeComp = db.prepare("SELECT id FROM competitions WHERE active = 1 ORDER BY year DESC LIMIT 1").get() as any;
      competitionId = activeComp?.id || 0;
    }

    // Complex calculation: Detailed scores per judge and juz
    const contestants = db.prepare(`
      SELECT c.*, l.name as level_name, l.juz_count, l.positions_count
      FROM contestants c
      JOIN levels l ON c.level_id = l.id
      WHERE c.competition_id = ?
    `).all(competitionId) as any[];

    const results = contestants.map(c => {
      const evaluations = db.prepare(`
        SELECT judge_id, juz_index, SUM(score) as total_score, MAX(judge_name) as judge_name, MAX(judge_phone) as judge_phone
        FROM evaluations
        WHERE contestant_id = ?
        GROUP BY judge_id, juz_index
      `).all(c.id) as any[];

      const judgeIds = [...new Set(evaluations.map(e => e.judge_id))];
      const judgeInfo = judgeIds.map(id => {
        const ev = evaluations.find(e => e.judge_id === id);
        return {
          id,
          name: ev?.judge_name || `مقيم ${id}`,
          phone: ev?.judge_phone || "-"
        };
      });

      const juzDetails = [];
      let totalSumOfAverages = 0;

      for (let i = 0; i < c.juz_count; i++) {
        const judge1Score = evaluations.find(e => e.juz_index === i && e.judge_id === judgeIds[0])?.total_score || null;
        const judge2Score = evaluations.find(e => e.juz_index === i && e.judge_id === judgeIds[1])?.total_score || null;
        
        let juzAvg = 0;
        if (judge1Score !== null && judge2Score !== null) {
          juzAvg = (judge1Score + judge2Score) / 2;
        } else if (judge1Score !== null) {
          juzAvg = judge1Score;
        } else if (judge2Score !== null) {
          juzAvg = judge2Score;
        }

        juzDetails.push({
          juz_index: i,
          judge1: judge1Score,
          judge2: judge2Score,
          average: juzAvg
        });
        totalSumOfAverages += juzAvg;
      }

      return {
        ...c,
        judge_count: judgeIds.length,
        judge_info: judgeInfo,
        juz_details: juzDetails,
        average_score: c.juz_count > 0 ? totalSumOfAverages / c.juz_count : 0
      };
    });

    res.json(results);
  });

  // Get my registrations (recent)
  app.get("/api/my-registrations", (req, res) => {
    const activeComp = db.prepare("SELECT id FROM competitions WHERE active = 1 ORDER BY year DESC LIMIT 1").get() as any;
    const activeCompId = activeComp?.id || 0;

    const registrations = db.prepare(`
      SELECT c.*, l.name as level_name, l.positions_count
      FROM contestants c
      JOIN levels l ON c.level_id = l.id
      WHERE c.competition_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all(activeCompId);
    res.json(registrations);
  });

  // Search imported contestants
  app.get("/api/imported-contestants/search", (req, res) => {
    const q = req.query.q as string;
    const competition_id = req.query.competition_id as string;
    if (!q) {
      return res.json([]);
    }
    try {
      const results = db.prepare(`
        SELECT * FROM imported_contestants
        WHERE competition_id = ? AND registered = 0 AND (name LIKE ? OR civil_id LIKE ?)
        LIMIT 15
      `).all(competition_id, `%${q}%`, `%${q}%`);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import contestants to a competition
  app.post("/api/admin/competitions/:id/import", (req, res) => {
    const { id } = req.params;
    const contestantsList = req.body; // array of { name, civil_id, phone, town, gender, level_name }
    
    if (!Array.isArray(contestantsList)) {
      return res.status(400).json({ error: "بيانات الاستيراد يجب أن تكون مصفوفة" });
    }

    try {
      const insert = db.prepare(`
        INSERT INTO imported_contestants (name, civil_id, phone, town, gender, level_name, competition_id, registered)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `);

      const transaction = db.transaction((rows) => {
        for (const row of rows) {
          let gender = "";
          const gStr = String(row.gender || "").trim();
          if (gStr === "أنثى" || gStr === "female") {
            gender = "female";
          } else if (gStr === "ذكر" || gStr === "male") {
            gender = "male";
          } else {
            gender = gStr;
          }
          
          insert.run(
            String(row.name || "").trim(),
            String(row.civil_id || "").trim(),
            String(row.phone || "").trim(),
            String(row.town || "").trim(),
            gender,
            String(row.level_name || "").trim(),
            id
          );
        }
      });

      transaction(contestantsList);
      res.json({ success: true, count: contestantsList.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get stats for imported contestants
  app.get("/api/admin/competitions/:id/imported-stats", (req, res) => {
    const { id } = req.params;
    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(case when registered = 1 then 1 else 0 end) as registered_count
        FROM imported_contestants
        WHERE competition_id = ?
      `).get(id) as { total: number; registered_count: number };
      res.json(stats || { total: 0, registered_count: 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete all imported contestants for a competition
  app.delete("/api/admin/competitions/:id/imported", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM imported_contestants WHERE competition_id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Create competition
  app.post("/api/admin/competition", (req, res) => {
    const { name, year, levels } = req.body; 
    
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    const regCode = generateCode();
    const judgeCode = generateCode();

    const transaction = db.transaction(() => {
      // Deactivate others
      db.prepare("UPDATE competitions SET active = 0").run();
      
      const compResult = db.prepare("INSERT INTO competitions (name, year, active, registration_code, judging_code) VALUES (?, ?, 1, ?, ?)").run(name, year, regCode, judgeCode);
      const compId = compResult.lastInsertRowid;

      for (const level of levels) {
        const levelResult = db.prepare("INSERT INTO levels (competition_id, name, description, rank, juz_count, positions_count) VALUES (?, ?, ?, ?, ?, ?)").run(compId, level.name, level.description, level.rank || 0, level.juz_count || 1, level.positions_count || 5);
        const levelId = levelResult.lastInsertRowid;

        for (const crit of level.criteria) {
          db.prepare("INSERT INTO criteria (level_id, name, max_score) VALUES (?, ?, ?)").run(levelId, crit.name, crit.max_score);
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete competition
  app.delete("/api/admin/competition/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.transaction(() => {
        // Correct order of deletion to respect foreign key constraints
        // 1. Delete evaluations (depend on contestants and criteria)
        db.prepare("DELETE FROM evaluations WHERE contestant_id IN (SELECT id FROM contestants WHERE competition_id = ?)").run(id);
        
        // 2. Delete contestants (depend on levels and competitions)
        db.prepare("DELETE FROM contestants WHERE competition_id = ?").run(id);
        
        // 3. Delete criteria (depend on levels)
        db.prepare("DELETE FROM criteria WHERE level_id IN (SELECT id FROM levels WHERE competition_id = ?)").run(id);
        
        // 4. Delete levels (depend on competitions)
        db.prepare("DELETE FROM levels WHERE competition_id = ?").run(id);
        
        // 5. Finally delete the competition
        db.prepare("DELETE FROM competitions WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete competition error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update competition
  app.post("/api/admin/competition/update", (req, res) => {
    const { id, name, year, logo_url } = req.body;
    try {
      db.prepare("UPDATE competitions SET name = ?, year = ?, logo_url = ? WHERE id = ?").run(name, year, logo_url, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete contestant
  app.delete("/api/admin/contestant/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM evaluations WHERE contestant_id = ?").run(id);
        db.prepare("DELETE FROM contestants WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update contestant
  app.post("/api/admin/contestant/update", (req, res) => {
    const { id, name, civil_id, phone, town, gender, level_id } = req.body;
    try {
      db.prepare(`
        UPDATE contestants 
        SET name = ?, civil_id = ?, phone = ?, town = ?, gender = ?, level_id = ? 
        WHERE id = ?
      `).run(name, civil_id, phone, town, gender, level_id, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Memorization System API ---

  // Auth: Login via single Access Code
  app.post("/api/memorization/auth/login", (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "الرجاء إدخال كود الدخول" });
    }

    try {
      // 1. Check memo_users (Admin, Teacher)
      const user = db.prepare("SELECT * FROM memo_users WHERE code = ? AND status = 'active'").get(code) as any;
      if (user) {
        return res.json({
          success: true,
          role: user.role,
          user: { id: user.id, name: user.name, role: user.role, code: user.code, phone: user.phone }
        });
      }

      // 2. Check memo_supervisors (Supervisor)
      const supervisor = db.prepare("SELECT * FROM memo_supervisors WHERE code = ? AND status = 'active'").get(code) as any;
      if (supervisor) {
        return res.json({
          success: true,
          role: "supervisor",
          user: { id: supervisor.id, name: supervisor.name, role: "supervisor", code: supervisor.code, phone: supervisor.phone }
        });
      }

      // 3. Check memo_students for Parent Code
      const student = db.prepare("SELECT * FROM memo_students WHERE parent_code = ? AND status = 'active'").get(code) as any;
      if (student) {
        return res.json({
          success: true,
          role: "parent",
          user: { id: student.id, name: `ولي أمر الطالب: ${student.name}`, role: "parent", code: student.parent_code, phone: student.parent_phone },
          student: student
        });
      }

      return res.status(404).json({ error: "كود الدخول غير صحيح أو غير مفعل" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Stats
  app.get("/api/memorization/admin/stats", (req, res) => {
    try {
      const studentCount = db.prepare("SELECT COUNT(*) as c FROM memo_students WHERE status = 'active'").get() as any;
      const teacherCount = db.prepare("SELECT COUNT(*) as c FROM memo_users WHERE role = 'teacher' AND status = 'active'").get() as any;
      const supervisorCount = db.prepare("SELECT COUNT(*) as c FROM memo_supervisors WHERE status = 'active'").get() as any;
      const programCount = db.prepare("SELECT COUNT(*) as c FROM memo_programs WHERE status = 'active'").get() as any;
      const groupCount = db.prepare("SELECT COUNT(*) as c FROM memo_groups").get() as any;

      const recordStats = db.prepare(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN status IN ('تم الحفظ', 'تم التسميع الأول', 'تم التسميع الثاني / مراجعة وتثبيت') THEN 1 ELSE 0 END) as completed
        FROM memo_records
      `).get() as any;

      let avgCompletion = 0;
      if (recordStats && recordStats.total > 0) {
        avgCompletion = Math.round((recordStats.completed / recordStats.total) * 100);
      }

      res.json({
        students: studentCount?.c || 0,
        teachers: teacherCount?.c || 0,
        supervisors: supervisorCount?.c || 0,
        programs: programCount?.c || 0,
        groups: groupCount?.c || 0,
        avgCompletion: avgCompletion
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Programs
  app.get("/api/memorization/admin/programs", (req, res) => {
    try {
      const programs = db.prepare("SELECT * FROM memo_programs ORDER BY id DESC").all();
      res.json(programs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/programs", (req, res) => {
    const { name, description, start_date, end_date, status } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_programs (name, description, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, description, start_date, end_date, status || "active");
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/memorization/admin/programs/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, start_date, end_date, status } = req.body;
    try {
      db.prepare(`
        UPDATE memo_programs
        SET name = ?, description = ?, start_date = ?, end_date = ?, status = ?
        WHERE id = ?
      `).run(name, description, start_date, end_date, status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/programs/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM memo_program_sections WHERE program_id = ?").run(id);
        db.prepare("DELETE FROM memo_programs WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Students
  app.get("/api/memorization/admin/students", (req, res) => {
    try {
      const students = db.prepare("SELECT * FROM memo_students ORDER BY id DESC").all();
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/students", (req, res) => {
    const { name, village, parent_phone, parent_code } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_students (name, village, parent_phone, parent_code)
        VALUES (?, ?, ?, ?)
      `).run(name, village, parent_phone, parent_code);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/memorization/admin/students/:id", (req, res) => {
    const { id } = req.params;
    const { name, village, parent_phone, parent_code, status } = req.body;
    try {
      db.prepare(`
        UPDATE memo_students
        SET name = ?, village = ?, parent_phone = ?, parent_code = ?, status = ?
        WHERE id = ?
      `).run(name, village, parent_phone, parent_code, status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/students/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM memo_group_students WHERE student_id = ?").run(id);
        db.prepare("DELETE FROM memo_records WHERE student_id = ?").run(id);
        db.prepare("DELETE FROM memo_students WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Teachers
  app.get("/api/memorization/admin/teachers", (req, res) => {
    try {
      const teachers = db.prepare("SELECT * FROM memo_users WHERE role = 'teacher' ORDER BY id DESC").all();
      res.json(teachers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/teachers", (req, res) => {
    const { name, code, phone } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_users (name, role, code, phone, status)
        VALUES (?, 'teacher', ?, ?, 'active')
      `).run(name, code, phone);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/memorization/admin/teachers/:id", (req, res) => {
    const { id } = req.params;
    const { name, code, phone, status } = req.body;
    try {
      db.prepare(`
        UPDATE memo_users
        SET name = ?, code = ?, phone = ?, status = ?
        WHERE id = ? AND role = 'teacher'
      `).run(name, code, phone, status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/teachers/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM memo_users WHERE id = ? AND role = 'teacher'").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Supervisors
  app.get("/api/memorization/admin/supervisors", (req, res) => {
    try {
      const supervisors = db.prepare("SELECT * FROM memo_supervisors ORDER BY id DESC").all();
      res.json(supervisors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/supervisors", (req, res) => {
    const { name, code, phone } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_supervisors (name, code, phone, status)
        VALUES (?, ?, ?, 'active')
      `).run(name, code, phone);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/memorization/admin/supervisors/:id", (req, res) => {
    const { id } = req.params;
    const { name, code, phone, status } = req.body;
    try {
      db.prepare(`
        UPDATE memo_supervisors
        SET name = ?, code = ?, phone = ?, status = ?
        WHERE id = ?
      `).run(name, code, phone, status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/supervisors/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM memo_supervisors WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Sorahs & Sections
  app.get("/api/memorization/admin/sections", (req, res) => {
    try {
      const sections = db.prepare("SELECT * FROM memo_quran_sections ORDER BY surah_number ASC, order_number ASC").all();
      res.json(sections);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/sections", (req, res) => {
    const { surah_name, surah_number, section_name, from_ayah, to_ayah, juz, order_number } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_quran_sections (surah_name, surah_number, section_name, from_ayah, to_ayah, juz, order_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(surah_name, surah_number, section_name, from_ayah, to_ayah, juz, order_number);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/memorization/admin/sections/:id", (req, res) => {
    const { id } = req.params;
    const { surah_name, surah_number, section_name, from_ayah, to_ayah, juz, order_number } = req.body;
    try {
      db.prepare(`
        UPDATE memo_quran_sections
        SET surah_name = ?, surah_number = ?, section_name = ?, from_ayah = ?, to_ayah = ?, juz = ?, order_number = ?
        WHERE id = ?
      `).run(surah_name, surah_number, section_name, from_ayah, to_ayah, juz, order_number, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/sections/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM memo_quran_sections WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Program Sections Mapping
  app.get("/api/memorization/admin/programs/:id/sections", (req, res) => {
    const { id } = req.params;
    try {
      const sections = db.prepare(`
        SELECT qs.*, (CASE WHEN ps.id IS NOT NULL THEN 1 ELSE 0 END) as selected
        FROM memo_quran_sections qs
        LEFT JOIN memo_program_sections ps ON ps.section_id = qs.id AND ps.program_id = ?
        ORDER BY qs.surah_number ASC, qs.order_number ASC
      `).all(id);
      res.json(sections);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/programs/:id/sections", (req, res) => {
    const { id } = req.params;
    const { section_ids } = req.body;
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM memo_program_sections WHERE program_id = ?").run(id);
        const insert = db.prepare("INSERT INTO memo_program_sections (program_id, section_id) VALUES (?, ?)");
        if (Array.isArray(section_ids)) {
          section_ids.forEach(sid => insert.run(id, sid));
        }
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Groups Setup
  app.get("/api/memorization/admin/groups", (req, res) => {
    try {
      const groups = db.prepare(`
        SELECT g.*, p.name as program_name, t.name as teacher_name,
          (SELECT COUNT(*) FROM memo_group_students WHERE group_id = g.id) as student_count
        FROM memo_groups g
        JOIN memo_programs p ON g.program_id = p.id
        JOIN memo_users t ON g.teacher_id = t.id
        ORDER BY g.id DESC
      `).all();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/groups", (req, res) => {
    const { name, program_id, teacher_id, village, level } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_groups (name, program_id, teacher_id, village, level)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, program_id, teacher_id, village, level);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/groups/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM memo_group_students WHERE group_id = ?").run(id);
        db.prepare("DELETE FROM memo_records WHERE group_id = ?").run(id);
        db.prepare("DELETE FROM memo_groups WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin/Teacher: Group Students
  app.get("/api/memorization/admin/groups/:id/students", (req, res) => {
    const { id } = req.params;
    try {
      const students = db.prepare(`
        SELECT s.*, gs.id as mapping_id
        FROM memo_students s
        JOIN memo_group_students gs ON gs.student_id = s.id
        WHERE gs.group_id = ?
      `).all(id);
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/admin/groups/:id/students", (req, res) => {
    const { id } = req.params;
    const { student_ids } = req.body;
    try {
      db.transaction(() => {
        const insert = db.prepare("INSERT OR IGNORE INTO memo_group_students (group_id, student_id) VALUES (?, ?)");
        if (Array.isArray(student_ids)) {
          student_ids.forEach(sid => insert.run(id, sid));
        }
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memorization/admin/groups/:id/students/:student_id", (req, res) => {
    const { id, student_id } = req.params;
    try {
      db.prepare("DELETE FROM memo_group_students WHERE group_id = ? AND student_id = ?").run(id, student_id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Teacher specific endpoints
  app.get("/api/memorization/teacher/:teacher_id/groups", (req, res) => {
    const { teacher_id } = req.params;
    try {
      const groups = db.prepare(`
        SELECT g.*, p.name as program_name,
          (SELECT COUNT(*) FROM memo_group_students WHERE group_id = g.id) as student_count
        FROM memo_groups g
        JOIN memo_programs p ON g.program_id = p.id
        WHERE g.teacher_id = ?
        ORDER BY g.id DESC
      `).all(teacher_id);
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memorization/teacher/available-students", (req, res) => {
    try {
      const students = db.prepare("SELECT * FROM memo_students WHERE status = 'active' ORDER BY name ASC").all();
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get student memorization records & program sections
  app.get("/api/memorization/teacher/students/:student_id/records", (req, res) => {
    const { student_id } = req.params;
    const { program_id } = req.query;
    try {
      const records = db.prepare(`
        SELECT qs.*, 
          r.id as record_id,
          r.status as record_status,
          r.first_recitation_done,
          r.first_recitation_date,
          r.second_recitation_done,
          r.second_recitation_date,
          r.mastery_level,
          r.teacher_notes
        FROM memo_program_sections ps
        JOIN memo_quran_sections qs ON ps.section_id = qs.id
        LEFT JOIN memo_records r ON r.section_id = qs.id AND r.student_id = ? AND r.program_id = ?
        WHERE ps.program_id = ?
        ORDER BY qs.surah_number ASC, qs.order_number ASC
      `).all(student_id, program_id, program_id);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Post or Update evaluation record
  app.post("/api/memorization/teacher/records", (req, res) => {
    const { 
      student_id, group_id, teacher_id, program_id, section_id, 
      status, first_recitation_done, first_recitation_date, 
      second_recitation_done, second_recitation_date, mastery_level, teacher_notes 
    } = req.body;

    try {
      const existing = db.prepare(`
        SELECT id FROM memo_records 
        WHERE student_id = ? AND program_id = ? AND section_id = ?
      `).get(student_id, program_id, section_id) as any;

      if (existing) {
        db.prepare(`
          UPDATE memo_records
          SET status = ?, 
              first_recitation_done = ?, first_recitation_date = ?,
              second_recitation_done = ?, second_recitation_date = ?,
              mastery_level = ?, teacher_notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          status, 
          first_recitation_done ? 1 : 0, first_recitation_date,
          second_recitation_done ? 1 : 0, second_recitation_date,
          mastery_level, teacher_notes, existing.id
        );
        res.json({ id: existing.id, updated: true });
      } else {
        const result = db.prepare(`
          INSERT INTO memo_records (
            student_id, group_id, teacher_id, program_id, section_id,
            status, first_recitation_done, first_recitation_date,
            second_recitation_done, second_recitation_date, mastery_level, teacher_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          student_id, group_id, teacher_id, program_id, section_id,
          status, first_recitation_done ? 1 : 0, first_recitation_date,
          second_recitation_done ? 1 : 0, second_recitation_date,
          mastery_level, teacher_notes
        );
        res.json({ id: result.lastInsertRowid, created: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supervisor APIs
  app.get("/api/memorization/supervisor/teachers", (req, res) => {
    try {
      const teachers = db.prepare(`
        SELECT u.id, u.name, u.phone, u.status,
          (SELECT COUNT(*) FROM memo_groups WHERE teacher_id = u.id) as group_count,
          (SELECT COUNT(DISTINCT gs.student_id) 
           FROM memo_groups g 
           JOIN memo_group_students gs ON gs.group_id = g.id 
           WHERE g.teacher_id = u.id) as student_count
        FROM memo_users u
        WHERE u.role = 'teacher'
        ORDER BY u.name ASC
      `).all();
      res.json(teachers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memorization/supervisor/groups", (req, res) => {
    try {
      const groups = db.prepare(`
        SELECT g.*, p.name as program_name, t.name as teacher_name,
          (SELECT COUNT(*) FROM memo_group_students WHERE group_id = g.id) as student_count
        FROM memo_groups g
        JOIN memo_programs p ON g.program_id = p.id
        JOIN memo_users t ON g.teacher_id = t.id
        ORDER BY g.id DESC
      `).all();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memorization/supervisor/program/:program_id/performance", (req, res) => {
    const { program_id } = req.params;
    try {
      const students = db.prepare(`
        SELECT s.id, s.name, s.village, s.parent_phone,
               g.id as group_id, g.name as group_name,
               t.name as teacher_name
        FROM memo_group_students gs
        JOIN memo_students s ON gs.student_id = s.id
        JOIN memo_groups g ON gs.group_id = g.id
        JOIN memo_users t ON g.teacher_id = t.id
        WHERE g.program_id = ?
        ORDER BY s.name ASC
      `).all(program_id) as any[];

      const totalSections = db.prepare(`
        SELECT COUNT(*) as count 
        FROM memo_program_sections 
        WHERE program_id = ?
      `).get(program_id) as any;

      const totalCount = totalSections?.count || 0;

      const result = students.map((student) => {
        const records = db.prepare(`
          SELECT qs.surah_name, qs.section_name, qs.juz, qs.surah_number,
                 r.status as record_status,
                 r.first_recitation_done,
                 r.first_recitation_date,
                 r.second_recitation_done,
                 r.second_recitation_date,
                 r.mastery_level,
                 r.teacher_notes,
                 r.updated_at
          FROM memo_program_sections ps
          JOIN memo_quran_sections qs ON ps.section_id = qs.id
          LEFT JOIN memo_records r ON r.section_id = qs.id AND r.student_id = ? AND r.program_id = ?
          WHERE ps.program_id = ?
          ORDER BY qs.surah_number ASC, qs.order_number ASC
        `).all(student.id, program_id, program_id) as any[];

        const completedCount = records.filter(r => 
          ["تم التسميع الثاني / مراجعة وتثبيت", "تم التسميع الأول", "تم الحفظ"].includes(r.record_status)
        ).length;

        return {
          ...student,
          total_sections: totalCount,
          completed_sections: completedCount,
          records
        };
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/supervisor/notes", (req, res) => {
    const { supervisor_id, teacher_id, group_id, message, rating } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO memo_supervisor_notes (supervisor_id, teacher_id, group_id, message, rating, is_read)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(supervisor_id, teacher_id, group_id, message, rating);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memorization/teacher/:teacher_id/messages", (req, res) => {
    const { teacher_id } = req.params;
    try {
      const messages = db.prepare(`
        SELECT sn.*, s.name as supervisor_name, g.name as group_name
        FROM memo_supervisor_notes sn
        JOIN memo_supervisors s ON sn.supervisor_id = s.id
        LEFT JOIN memo_groups g ON sn.group_id = g.id
        WHERE sn.teacher_id = ?
        ORDER BY sn.id DESC
      `).all(teacher_id);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memorization/teacher/messages/:id/read", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE memo_supervisor_notes SET is_read = 1 WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Parent API: Student Progress details
  app.get("/api/memorization/parent/student/:student_id", (req, res) => {
    const { student_id } = req.params;
    try {
      const student = db.prepare("SELECT * FROM memo_students WHERE id = ?").get(student_id) as any;
      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود" });
      }

      db.prepare("INSERT INTO memo_parent_views (student_id, last_login) VALUES (?, CURRENT_TIMESTAMP)").run(student_id);

      const groupInfo = db.prepare(`
        SELECT g.*, p.name as program_name, t.name as teacher_name, t.phone as teacher_phone
        FROM memo_group_students gs
        JOIN memo_groups g ON gs.group_id = g.id
        JOIN memo_programs p ON g.program_id = p.id
        JOIN memo_users t ON g.teacher_id = t.id
        WHERE gs.student_id = ?
        LIMIT 1
      `).get(student_id) as any;

      let records = [];
      if (groupInfo) {
        records = db.prepare(`
          SELECT qs.*, 
            r.status as record_status,
            r.first_recitation_done,
            r.first_recitation_date,
            r.second_recitation_done,
            r.second_recitation_date,
            r.mastery_level,
            r.teacher_notes,
            r.updated_at
          FROM memo_program_sections ps
          JOIN memo_quran_sections qs ON ps.section_id = qs.id
          LEFT JOIN memo_records r ON r.section_id = qs.id AND r.student_id = ? AND r.program_id = ?
          WHERE ps.program_id = ?
          ORDER BY qs.surah_number ASC, qs.order_number ASC
        `).all(student_id, groupInfo.program_id, groupInfo.program_id);
      }

      res.json({
        student,
        group: groupInfo || null,
        records: records
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Database initialized and ready.");
  });

  // Graceful shutdown for Railway
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      db.close();
      process.exit(0);
    });
  });
}

startServer();
