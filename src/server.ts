import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { runPipeline } from './core/scheduler.ts';
import { parseCV } from './core/profileParser.ts';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Solo archivos PDF'));
  },
});

const app = express();
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();

let scanning = false;
let lastScanResult: { total: number; bySource: Record<string, number>; errors: number } | null = null;

app.get('/api/profile', async (req, res) => {
  const profile = await prisma.profile.findFirst();
  if (!profile) return res.json(null);
  res.json({
    ...profile,
    skills: JSON.parse(profile.skills),
    targetRoles: JSON.parse(profile.targetRoles || '[]'),
    preferredLocations: JSON.parse(profile.preferredLocations || '[]'),
    avoidKeywords: JSON.parse(profile.avoidKeywords || '[]'),
  });
});

app.post('/api/profile/upload', upload.single('cv'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const result = await parseCV(file.path);
    // Return preview without saving yet
    res.json({
      preview: {
        name: result.name,
        seniority: result.seniority,
        skills: result.skills,
        experience: result.experience,
        targetRoles: result.targetRoles,
        education: result.education,
        preferredLocations: result.preferredLocations,
        avoidKeywords: result.avoidKeywords,
      },
      filePath: file.path,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/profile/save', async (req, res) => {
  const { name, seniority, skills, experience, targetRoles, education, preferredLocations, avoidKeywords, cvPath, searchMode } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const existing = await prisma.profile.findFirst();
  const data = {
    name,
    seniority: seniority ?? 'junior',
    skills: JSON.stringify(skills ?? []),
    experience: experience ?? 0,
    targetRoles: JSON.stringify(targetRoles ?? []),
    preferredLocations: JSON.stringify(preferredLocations ?? []),
    avoidKeywords: JSON.stringify(avoidKeywords ?? []),
    education: education ?? null,
    cvPath: cvPath ?? null,
    searchMode: searchMode ?? 'busqueda_activa',
  };
  if (existing) {
    await prisma.profile.update({ where: { id: existing.id }, data });
  } else {
    await prisma.profile.create({ data });
  }
  const updated = await prisma.profile.findFirst();
  res.json(updated);
});

app.get('/api/vacancies', async (req, res) => {
  const vacancies = await prisma.vacancy.findMany({
    orderBy: { score: 'desc' },
  });
  res.json(vacancies);
});

app.get('/api/vacancies/:id', async (req, res) => {
  const id = Number(req.params.id);
  const vacancy = await prisma.vacancy.findUnique({
    where: { id },
    include: { feedbacks: true },
  });
  if (!vacancy) {
    return res.status(404).json({ error: 'Vacancy not found' });
  }
  res.json(vacancy);
});

app.post('/api/scan', async (req, res) => {
  if (scanning) return res.json({ status: 'scanning' });
  scanning = true;
  try {
    lastScanResult = await runPipeline();
    res.json({ status: 'ok', result: lastScanResult });
  } catch (e) {
    res.status(500).json({ status: 'error', error: String(e) });
  } finally {
    scanning = false;
  }
});

app.get('/api/scan/status', (req, res) => {
  res.json({ scanning, lastResult: lastScanResult });
});

app.get('/api/feedback/:vacancyId', async (req, res) => {
  const vacancyId = Number(req.params.vacancyId);
  const feedback = await prisma.feedback.findFirst({ where: { vacancyId } });
  res.json(feedback);
});

app.patch('/api/feedback/:vacancyId', async (req, res) => {
  const vacancyId = Number(req.params.vacancyId);
  const { status, notes } = req.body;
  const existing = await prisma.feedback.findFirst({ where: { vacancyId } });
  if (existing) {
    const updated = await prisma.feedback.update({
      where: { id: existing.id },
      data: { status, notes },
    });
    res.json(updated);
  } else {
    const created = await prisma.feedback.create({
      data: { vacancyId, status: status ?? 'PENDING', notes },
    });
    res.json(created);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

// Auto-scan cada 4 horas
const SCAN_INTERVAL = 4 * 60 * 60 * 1000;
setInterval(async () => {
  if (scanning) return;
  scanning = true;
  try {
    lastScanResult = await runPipeline();
    console.log(`[auto] Scan completado: ${lastScanResult.total} vacantes`);
  } catch (e) {
    console.error('[auto] Scan error:', e);
  } finally {
    scanning = false;
  }
}, SCAN_INTERVAL);
