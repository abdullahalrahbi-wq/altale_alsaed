import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || "quran_competition.db";
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    registration_code TEXT,
    judging_code TEXT
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    rank INTEGER DEFAULT 0,
    juz_count INTEGER DEFAULT 1,
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
  db.prepare("ALTER TABLE levels ADD COLUMN juz_count INTEGER DEFAULT 1").run();
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

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // --- API Routes ---

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
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get contestants for judging
  app.get("/api/contestants", (req, res) => {
    const judgeId = req.query.judge_id || 0;
    const contestants = db.prepare(`
      SELECT c.*, l.name as level_name, l.juz_count,
        (SELECT COUNT(DISTINCT judge_id) FROM evaluations WHERE contestant_id = c.id) as judge_count,
        (SELECT COUNT(*) FROM evaluations WHERE contestant_id = c.id AND judge_id = ?) as already_judged_by_me
      FROM contestants c 
      JOIN levels l ON c.level_id = l.id
      WHERE already_judged_by_me = 0
    `).all(judgeId);
    res.json(contestants);
  });

  // Get evaluation criteria for a level
  app.get("/api/criteria/:levelId", (req, res) => {
    const criteria = db.prepare("SELECT * FROM criteria WHERE level_id = ?").all(req.params.levelId);
    res.json(criteria);
  });

  // Submit evaluation
  app.post("/api/evaluate", (req, res) => {
    const { contestant_id, judge_id, judge_name, judge_phone, scores } = req.body; // scores: [ { juz_index, criteria_id, score } ]

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
    // Complex calculation: Detailed scores per judge and juz
    const contestants = db.prepare(`
      SELECT c.*, l.name as level_name, l.juz_count
      FROM contestants c
      JOIN levels l ON c.level_id = l.id
    `).all() as any[];

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
    const registrations = db.prepare(`
      SELECT c.*, l.name as level_name
      FROM contestants c
      JOIN levels l ON c.level_id = l.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all();
    res.json(registrations);
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
        const levelResult = db.prepare("INSERT INTO levels (competition_id, name, description, rank, juz_count) VALUES (?, ?, ?, ?, ?)").run(compId, level.name, level.description, level.rank || 0, level.juz_count || 1);
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
    const { id, name, year } = req.body;
    try {
      db.prepare("UPDATE competitions SET name = ?, year = ? WHERE id = ?").run(name, year, id);
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
