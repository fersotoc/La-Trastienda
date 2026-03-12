
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs-extra";
import crypto from "crypto";
import * as XLSX from "xlsx";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const INBOX_DIR = path.join(process.cwd(), "INBOX");
const INBOX_MENTIDERO = path.join(INBOX_DIR, "mentidero");
const INBOX_QUIETECITA = path.join(INBOX_DIR, "quietecita");
const PROCESADOS_DIR = path.join(process.cwd(), "procesados");
const ERRORES_DIR = path.join(process.cwd(), "errores");
const DB_FILE = path.join(process.cwd(), "boletopolis_db.json");
const APP_DB_FILE = path.join(process.cwd(), "app_db.json");

// Ensure directories exist
async function ensureDirs() {
  await fs.ensureDir(INBOX_DIR);
  await fs.ensureDir(INBOX_MENTIDERO);
  await fs.ensureDir(INBOX_QUIETECITA);
  await fs.ensureDir(PROCESADOS_DIR);
  await fs.ensureDir(ERRORES_DIR);
  if (!(await fs.pathExists(DB_FILE))) {
    await fs.writeJson(DB_FILE, { processedChecksums: [], processedTransactionIds: [] });
  }
  if (!(await fs.pathExists(APP_DB_FILE))) {
    await fs.writeJson(APP_DB_FILE, { 
      users: [
        { id: "admin", name: "Admin", email: "admin@latrastienda.com", role: "Administrador", status: "Activo" }
      ], 
      loadLogs: [], 
      cuts: [],
      transactions: []
    });
  }
}

// Helper to calculate checksum
function getChecksum(filePath: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

// Helper to parse date from filename
function parseDateFromFilename(filename: string) {
  // Pattern: boletopolis_YYYYMMDD.xlsx or boletopolis_YYYYMMDD_HHMM.xlsx
  const match = filename.match(/boletopolis_(\d{8})(?:_(\d{4}))?/i);
  if (match) {
    const dateStr = match[1];
    const timeStr = match[2] || "0000";
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = timeStr.substring(0, 2);
    const minute = timeStr.substring(2, 4);
    return {
      year,
      month,
      day,
      hour,
      minute,
      fullDate: `${year}-${month}-${day}`,
      fullTime: `${hour}:${minute}`,
      formatted: `${year}${month}${day}_${hour}${minute}`
    };
  }
  return null;
}

// API Routes
app.get("/api/ping", (req, res) => res.json("pong"));

app.get("/api/users", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  res.json(db.users);
});

app.post("/api/users", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  const newUser = { ...req.body, id: crypto.randomUUID() };
  db.users.push(newUser);
  await fs.writeJson(APP_DB_FILE, db);
  res.json(newUser);
});

app.get("/api/loadLogs", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  res.json(db.loadLogs);
});

app.post("/api/loadLogs", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  db.loadLogs.push(req.body);
  await fs.writeJson(APP_DB_FILE, db);
  res.json({ success: true });
});

app.post("/api/updateLoadLog", async (req, res) => {
  const { id } = req.query;
  const db = await fs.readJson(APP_DB_FILE);
  const index = db.loadLogs.findIndex((l: any) => l.id_carga === id);
  if (index !== -1) {
    db.loadLogs[index] = { ...db.loadLogs[index], ...req.body };
    await fs.writeJson(APP_DB_FILE, db);
  }
  res.json({ success: true });
});

app.get("/api/cuts", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  res.json(db.cuts);
});

app.post("/api/cuts", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  db.cuts.push(req.body);
  await fs.writeJson(APP_DB_FILE, db);
  res.json({ success: true });
});

app.get("/api/transactions", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  res.json(db.transactions);
});

app.post("/api/transactions", async (req, res) => {
  const db = await fs.readJson(APP_DB_FILE);
  const newTransactions = req.body.transactions || [];
  db.transactions.push(...newTransactions);
  await fs.writeJson(APP_DB_FILE, db);
  res.json({ success: true });
});

app.delete("/api/transactions", async (req, res) => {
  const { id } = req.query;
  const db = await fs.readJson(APP_DB_FILE);
  db.transactions = db.transactions.filter((t: any) => t.id_transaccion !== id);
  await fs.writeJson(APP_DB_FILE, db);
  res.json({ success: true });
});

app.get("/api/boletopolis/inbox", async (req, res) => {
  const { modulo } = req.query;
  try {
    await ensureDirs();
    const targetDir = modulo === 'La Quietecita' ? INBOX_QUIETECITA : INBOX_MENTIDERO;
    const files = await fs.readdir(targetDir);
    const fileDetails = await Promise.all(files.map(async (f) => {
      const stats = await fs.stat(path.join(targetDir, f));
      const dateInfo = parseDateFromFilename(f);
      return {
        name: f,
        size: stats.size,
        createdTime: stats.birthtime,
        isValidName: !!dateInfo,
        dateInfo
      };
    }));
    res.json(fileDetails);
  } catch (error) {
    res.status(500).json({ error: "Error listing inbox" });
  }
});

app.post("/api/boletopolis/process", async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename required" });

  const filePath = path.join(INBOX_DIR, filename);
  if (!(await fs.pathExists(filePath))) {
    return res.status(404).json({ error: "File not found in INBOX" });
  }

  try {
    const db = await fs.readJson(DB_FILE);
    const checksum = getChecksum(filePath);

    // 1. Check checksum duplicate
    if (db.processedChecksums.includes(checksum)) {
      const errorPath = path.join(ERRORES_DIR, `DUPLICADO_ARCHIVO_${filename}`);
      await fs.move(filePath, errorPath, { overwrite: true });
      return res.json({ status: "DUPLICADO", reason: "Checksum already processed", movedTo: "/errores" });
    }

    // 2. Extract date info
    let dateInfo = parseDateFromFilename(filename);
    const stats = await fs.stat(filePath);
    if (!dateInfo) {
      const cTime = stats.birthtime;
      const year = String(cTime.getFullYear());
      const month = String(cTime.getMonth() + 1).padStart(2, "0");
      const day = String(cTime.getDate()).padStart(2, "0");
      const hour = String(cTime.getHours()).padStart(2, "0");
      const minute = String(cTime.getMinutes()).padStart(2, "0");
      dateInfo = {
        year,
        month,
        day,
        hour,
        minute,
        fullDate: `${year}-${month}-${day}`,
        fullTime: `${hour}:${minute}`,
        formatted: `${year}${month}${day}_${hour}${minute}`
      };
    }

    // 3. Read Excel and check transaction IDs
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    const newTransactions: any[] = [];
    let omittedCount = 0;

    for (const row of rows) {
      const txId = String(row.id_transaccion || row["ID de transacción"] || "");
      if (txId && db.processedTransactionIds.includes(txId)) {
        omittedCount++;
      } else {
        newTransactions.push(row);
        if (txId) db.processedTransactionIds.push(txId);
      }
    }

    if (newTransactions.length === 0 && rows.length > 0) {
      // All were duplicates
      const errorPath = path.join(ERRORES_DIR, `DUPLICADO_TRANSACCIONES_${filename}`);
      await fs.move(filePath, errorPath, { overwrite: true });
      return res.json({ status: "DUPLICADO", reason: "All transactions already processed", omittedCount });
    }

    // 4. Move to processed folder
    const targetDir = path.join(PROCESADOS_DIR, dateInfo.year, dateInfo.month);
    await fs.ensureDir(targetDir);
    const newFilename = `boletopolis_${dateInfo.formatted}.xlsx`;
    const targetPath = path.join(targetDir, newFilename);
    
    await fs.move(filePath, targetPath, { overwrite: true });

    // 5. Update DB
    db.processedChecksums.push(checksum);
    await fs.writeJson(DB_FILE, db);

    res.json({
      status: "OK",
      newCount: newTransactions.length,
      omittedCount,
      processedFile: newFilename,
      destination: `/procesados/${dateInfo.year}/${dateInfo.month}`,
      transactions: newTransactions
    });

  } catch (error: any) {
    console.error("Process error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  await ensureDirs();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
