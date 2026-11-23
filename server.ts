import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lehr-db.json');

interface TcReading {
  tc: string;
  pv: number | null;
  sv: number | null;
}

interface OperatorRecord {
  id: string;
  name: string;
  code: string;
  shift: 'Morning' | 'Evening' | 'Night';
  role: string;
}

interface LehrLogRecord {
  id: string;
  date: string;
  hour: number;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  recipe: string;
  mode: string;
  matSpeed: number | null;
  fan1Hz: number | null;
  fan2Hz: number | null;
  zones: TcReading[];
  notes: string;
  source: 'ai-camera' | 'manual';
  photoDataUrl?: string;
}

interface DatabaseSchema {
  operators: OperatorRecord[];
  logs: LehrLogRecord[];
}

const DEFAULT_OPERATORS: OperatorRecord[] = [
  { id: 'op-avishka', name: 'Avishka', code: 'OP-101', shift: 'Morning', role: 'Lehr Operator' },
  { id: 'op-kasun', name: 'Kasun Perera', code: 'OP-102', shift: 'Morning', role: 'Lehr Operator' },
  { id: 'op-nimal', name: 'Nimal Silva', code: 'OP-103', shift: 'Evening', role: 'Shift Technician' },
  { id: 'op-ruwan', name: 'Ruwan Kumara', code: 'OP-104', shift: 'Night', role: 'Night Operator' },
];

function ensureDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = {
      operators: DEFAULT_OPERATORS,
      logs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      operators: Array.isArray(parsed.operators) && parsed.operators.length > 0 ? parsed.operators : DEFAULT_OPERATORS,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return { operators: DEFAULT_OPERATORS, logs: [] };
  }
}

function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_FILE);
}

const EXPECTED_TCS = [
  'TC-3',
  'TC-4',
  'TC-5',
  'TC-6',
  'TC-7',
  'TC-8',
  'TC-9',
  'TC-10',
  'TC-11',
  'TC-12',
  'TC-13',
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Operators CRUD
  app.get('/api/operators', (_req, res) => {
    const db = ensureDb();
    res.json({ operators: db.operators });
  });

  app.post('/api/operators', (req, res) => {
    const { name, code, shift, role } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Operator name is required.' });
      return;
    }
    const db = ensureDb();
    const newOp: OperatorRecord = {
      id: `op-${Date.now()}`,
      name: name.trim(),
      code: typeof code === 'string' && code.trim() ? code.trim() : `OP-${100 + db.operators.length + 1}`,
      shift: shift === 'Evening' || shift === 'Night' ? shift : 'Morning',
      role: typeof role === 'string' && role.trim() ? role.trim() : 'Lehr Operator',
    };
    db.operators.push(newOp);
    saveDb(db);
    res.status(201).json({ operator: newOp });
  });

  app.delete('/api/operators/:id', (req, res) => {
    const db = ensureDb();
    if (db.operators.length <= 1) {
      res.status(400).json({ error: 'Cannot delete the last remaining operator.' });
      return;
    }
    db.operators = db.operators.filter((op) => op.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Logs CRUD
  app.get('/api/logs', (req, res) => {
    const db = ensureDb();
    const dateFilter = typeof req.query.date === 'string' ? req.query.date : '';
    const operatorFilter = typeof req.query.operatorId === 'string' ? req.query.operatorId : '';

    let logs = [...db.logs];
    if (dateFilter) {
      logs = logs.filter((l) => l.date === dateFilter);
    }
    if (operatorFilter) {
      logs = logs.filter((l) => l.operatorId === operatorFilter);
    }
    logs.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.hour - a.hour;
    });
    res.json({ logs });
  });

  app.post('/api/logs', (req, res) => {
    const body = req.body ?? {};
    const { date, hour, operatorId, operatorName, recipe, mode, matSpeed, fan1Hz, fan2Hz, zones, notes, source, photoDataUrl } = body;

    if (!date || typeof hour !== 'number' || hour < 0 || hour > 23) {
      res.status(400).json({ error: 'Valid date (YYYY-MM-DD) and hour (0–23) are required.' });
      return;
    }
    if (!operatorName) {
      res.status(400).json({ error: 'Operator selection is required.' });
      return;
    }

    const db = ensureDb();
    const existingIdx = db.logs.findIndex((l) => l.date === date && l.hour === hour);
    const normalizedZones: TcReading[] = EXPECTED_TCS.map((tc) => {
      const found = Array.isArray(zones) ? zones.find((z: TcReading) => z?.tc === tc) : undefined;
      return {
        tc,
        pv: typeof found?.pv === 'number' && !Number.isNaN(found.pv) ? found.pv : null,
        sv: typeof found?.sv === 'number' && !Number.isNaN(found.sv) ? found.sv : null,
      };
    });

    const record: LehrLogRecord = {
      id: existingIdx >= 0 ? db.logs[existingIdx].id : `log-${date}-h${String(hour).padStart(2, '0')}-${Date.now()}`,
      date,
      hour,
      timestamp: new Date().toISOString(),
      operatorId: operatorId || 'unknown',
      operatorName,
      recipe: typeof recipe === 'string' ? recipe.trim() : '',
      mode: typeof mode === 'string' ? mode.trim() : '',
      matSpeed: typeof matSpeed === 'number' && !Number.isNaN(matSpeed) ? matSpeed : null,
      fan1Hz: typeof fan1Hz === 'number' && !Number.isNaN(fan1Hz) ? fan1Hz : null,
      fan2Hz: typeof fan2Hz === 'number' && !Number.isNaN(fan2Hz) ? fan2Hz : null,
      zones: normalizedZones,
      notes: typeof notes === 'string' ? notes.trim() : '',
      source: source === 'ai-camera' ? 'ai-camera' : 'manual',
      photoDataUrl: typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:image/') ? photoDataUrl : undefined,
    };

    if (existingIdx >= 0) {
      db.logs[existingIdx] = record;
    } else {
      db.logs.push(record);
    }

    saveDb(db);
    res.status(201).json({ log: record, updated: existingIdx >= 0 });
  });

  app.delete('/api/logs/:id', (req, res) => {
    const db = ensureDb();
    const before = db.logs.length;
    db.logs = db.logs.filter((l) => l.id !== req.params.id);
    if (db.logs.length === before) {
      res.status(404).json({ error: 'Log not found.' });
      return;
    }
    saveDb(db);
    res.json({ ok: true });
  });

  // Gemini AI HMI Photo Extraction
  app.post('/api/extract-hmi', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body ?? {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'imageBase64 is required.' });
        return;
      }

      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const ai = getGeminiClient();

      const systemInstruction = `You are an industrial OCR & vision specialist reading a Siemens SIMATIC HMI "Line Overview" screen for the Amcept Annealing Lehr (Amcept Lehr).
Carefully inspect every temperature box and motor readout in the photo:
1. Thermocouple boxes are arranged in two rows:
   - Top row typically shows: TC-17, TC-18, TC-3, TC-5, TC-7, TC-8, TC-10, TC-12.
   - Bottom row typically shows: TC-1, TC-2, TC-4, TC-6, TC-9, TC-11, TC-13, TC-14, TC-15, TC-16.
2. Each TC box has two fields inside it:
   - Top white box = PV (Process Value, °C)
   - Bottom light-blue/gray box = SV (Setpoint Value, °C)
3. You MUST extract ONLY TC-3, TC-4, TC-5, TC-6, TC-7, TC-8, TC-9, TC-10, TC-11, TC-12, and TC-13 in exact order (11 items). Do NOT confuse top-row and bottom-row TC labels! Read the label directly above each box carefully.
4. Read the orange "Drive Motor" speed value in MM/Min at the bottom right (this is matSpeed, e.g. 217.5).
5. Also read "Current Recipe" (e.g. _DATA_92), "Mode Selection" (e.g. Auto), "Mass Cooling Fan 1" (Hz), "Mass Cooling Fan 2" (Hz), and any visible alarm indicator (e.g. "EMERGENCY PRESSED").
6. If any specific number is illegible or occluded, return null for that number instead of guessing.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: 'Extract TC-3 through TC-13 PV and SV values (°C), Drive Motor Mat Speed (MM/Min), Current Recipe, Mode Selection, Mass Cooling Fan 1 & 2 (Hz), and any HMI alarm notes.',
            },
          ],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              zones: {
                type: Type.ARRAY,
                description: 'Ordered list of thermocouples TC-3 through TC-13.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tc: { type: Type.STRING, description: 'Thermocouple ID, e.g. TC-3' },
                    pv: { type: Type.NUMBER, nullable: true, description: 'Process Value in °C' },
                    sv: { type: Type.NUMBER, nullable: true, description: 'Setpoint Value in °C' },
                  },
                  required: ['tc', 'pv', 'sv'],
                },
              },
              matSpeed: { type: Type.NUMBER, nullable: true, description: 'Drive Motor Mat Speed in MM/Min' },
              recipe: { type: Type.STRING, description: 'Current Recipe name shown on HMI' },
              mode: { type: Type.STRING, description: 'Mode Selection shown on HMI' },
              fan1Hz: { type: Type.NUMBER, nullable: true, description: 'Mass Cooling Fan 1 frequency in Hz' },
              fan2Hz: { type: Type.NUMBER, nullable: true, description: 'Mass Cooling Fan 2 frequency in Hz' },
              notes: { type: Type.STRING, description: 'Any visible alarms or warnings like EMERGENCY PRESSED' },
            },
            required: ['zones', 'matSpeed', 'recipe', 'mode', 'fan1Hz', 'fan2Hz', 'notes'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        zones?: Array<{ tc?: string; pv?: number | null; sv?: number | null }>;
        matSpeed?: number | null;
        recipe?: string;
        mode?: string;
        fan1Hz?: number | null;
        fan2Hz?: number | null;
        notes?: string;
      };

      const normalizedZones: TcReading[] = EXPECTED_TCS.map((tcCode) => {
        const match = parsed.zones?.find(
          (item) => item.tc?.toUpperCase().replace(/\s+/g, '') === tcCode
        );
        return {
          tc: tcCode,
          pv: typeof match?.pv === 'number' && Number.isFinite(match.pv) ? match.pv : null,
          sv: typeof match?.sv === 'number' && Number.isFinite(match.sv) ? match.sv : null,
        };
      });

      res.json({
        zones: normalizedZones,
        matSpeed: typeof parsed.matSpeed === 'number' && Number.isFinite(parsed.matSpeed) ? parsed.matSpeed : null,
        recipe: typeof parsed.recipe === 'string' ? parsed.recipe : '',
        mode: typeof parsed.mode === 'string' ? parsed.mode : '',
        fan1Hz: typeof parsed.fan1Hz === 'number' && Number.isFinite(parsed.fan1Hz) ? parsed.fan1Hz : null,
        fan2Hz: typeof parsed.fan2Hz === 'number' && Number.isFinite(parsed.fan2Hz) ? parsed.fan2Hz : null,
        notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      });
    } catch (error: unknown) {
      console.error('Gemini HMI extraction failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze HMI panel image.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amcept Lehr server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
