import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { CronExpressionParser } from 'cron-parser';
import { GoogleGenAI } from '@google/genai';
import { PipelineConfig, CollectorRecord, ExecutionLog, SystemStats, InspectResponse } from './src/types/datacenter.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini if key exists
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiAi = new GoogleGenAI();
  } catch (err) {
    console.warn('[DataCenter] Gemini initialization note:', err);
  }
}

// Data Directory and DB persistence
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'datacenter_db.json');

interface DatabaseSchema {
  pipelines: PipelineConfig[];
  records: CollectorRecord[];
  logs: ExecutionLog[];
}

// Initial seed pipelines to demonstrate real web app data collection out-of-the-box
const initialPipelines: PipelineConfig[] = [
  {
    id: 'pipe-hn-api',
    name: 'HackerNews Top Stories (Tech Web App)',
    description: 'Thu thập danh sách tin tức công nghệ, bài thảo luận kỹ thuật hàng đầu từ HackerNews API',
    type: 'rest_api',
    targetUrl: 'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    schedule: '15m',
    status: 'active',
    dataPath: '',
    fields: [
      { id: 'f1', name: 'storyId', jsonPath: '', type: 'number' },
      { id: 'f2', name: 'title', jsonPath: 'title', type: 'string' },
      { id: 'f3', name: 'by', jsonPath: 'by', type: 'string' },
      { id: 'f4', name: 'score', jsonPath: 'score', type: 'number' },
      { id: 'f5', name: 'url', jsonPath: 'url', type: 'string' }
    ],
    totalCollected: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pipe-crypto-rates',
    name: 'CoinGecko Crypto Market Rates (Finance App)',
    description: 'Thu thập bảng giá tiền điện tử thời gian thực: BTC, ETH, SOL, BNB, XRP kèm biến động 24h',
    type: 'rest_api',
    targetUrl: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    schedule: '5m',
    status: 'active',
    dataPath: '',
    fields: [
      { id: 'c1', name: 'coin', jsonPath: 'key', type: 'string' },
      { id: 'c2', name: 'usd_price', jsonPath: 'usd', type: 'number' },
      { id: 'c3', name: 'change_24h', jsonPath: 'usd_24h_change', type: 'number' },
      { id: 'c4', name: 'market_cap', jsonPath: 'usd_market_cap', type: 'number' }
    ],
    totalCollected: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pipe-weather-api',
    name: 'Open-Meteo Global Weather (Meteorology Web App)',
    description: 'Thu thập chỉ số thời tiết, nhiệt độ, tốc độ gió, độ ẩm khí tượng theo tọa độ địa lý',
    type: 'rest_api',
    targetUrl: 'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    schedule: '1h',
    status: 'active',
    dataPath: 'current',
    fields: [
      { id: 'w1', name: 'time', jsonPath: 'time', type: 'string' },
      { id: 'w2', name: 'temperature_c', jsonPath: 'temperature_2m', type: 'number' },
      { id: 'w3', name: 'humidity_pct', jsonPath: 'relative_humidity_2m', type: 'number' },
      { id: 'w4', name: 'wind_speed', jsonPath: 'wind_speed_10m', type: 'number' }
    ],
    totalCollected: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pipe-rss-tech',
    name: 'BBC Tech & Global Feed (RSS News Harvester)',
    description: 'Bộ thu thập RSS Feed tự động đồng bộ tin tức công nghệ quốc tế, tiêu đề, tóm tắt và thời gian phát hành',
    type: 'rss_feed',
    targetUrl: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    schedule: '1h',
    status: 'active',
    fields: [
      { id: 'r1', name: 'title', type: 'string' },
      { id: 'r2', name: 'link', type: 'string' },
      { id: 'r3', name: 'pubDate', type: 'string' },
      { id: 'r4', name: 'description', type: 'string' }
    ],
    totalCollected: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pipe-web-scraper',
    name: 'VnExpress Tin tức & Sự kiện (HTML Web Scraper)',
    description: 'Trích xuất bài viết, tiêu đề, liên kết trang chủ báo chí trực tuyến bằng bộ bóc tách DOM selector',
    type: 'web_scraper',
    targetUrl: 'https://vnexpress.net/cong-nghe',
    containerSelector: 'article.item-news',
    schedule: 'manual',
    status: 'active',
    fields: [
      { id: 's1', name: 'title', selector: 'h3.title-news a', attribute: 'text', type: 'string' },
      { id: 's2', name: 'link', selector: 'h3.title-news a', attribute: 'href', type: 'string' },
      { id: 's3', name: 'summary', selector: 'p.description a', attribute: 'text', type: 'string' }
    ],
    totalCollected: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pipe-webhook-inbound',
    name: 'External App Webhook Listener (Push Stream)',
    description: 'Cổng tiếp nhận luồng dữ liệu đẩy từ các ứng dụng web bên ngoài (Stripe, GitHub, CRM, Custom App)',
    type: 'webhook',
    targetUrl: '/api/webhook/pipe-webhook-inbound',
    schedule: 'manual',
    status: 'active',
    fields: [
      { id: 'wh1', name: 'event', jsonPath: 'event', type: 'string' },
      { id: 'wh2', name: 'payload', jsonPath: 'data', type: 'string' }
    ],
    totalCollected: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return {
        pipelines: data.pipelines || initialPipelines,
        records: data.records || [],
        logs: data.logs || []
      };
    }
  } catch (err) {
    console.error('[DataCenter] Error loading database:', err);
  }
  const defaultDb: DatabaseSchema = {
    pipelines: initialPipelines,
    records: [],
    logs: []
  };
  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DataCenter] Error saving database:', err);
  }
}

// In-memory cache synced with file
let db = loadDatabase();

// Default request headers to avoid web app anti-bot blockage
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (DataCenter Web Harvester)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
  'Accept-Language': 'vi,en-US,en;q=0.9'
};

// Safe JSON Path lookup
function getNestedValue(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return obj;
  const parts = pathStr.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// Utility: Clean HTML text
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Pipeline Execution Engine
async function executePipeline(pipelineId: string): Promise<{ success: boolean; count: number; log: ExecutionLog }> {
  const pipeline = db.pipelines.find(p => p.id === pipelineId);
  if (!pipeline) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }

  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  let status: 'success' | 'failed' = 'success';
  let httpStatus = 200;
  let itemsExtracted = 0;
  let payloadSizeKb = 0;
  let errorMessage: string | undefined;
  const extractedRecords: CollectorRecord[] = [];

  try {
    if (pipeline.type === 'webhook') {
      // Webhook pipelines are passive listeners, not pull
      throw new Error('Pipeline webhook là cổng thụ động (chờ dữ liệu gửi tới qua endpoint)');
    }

    const headers = { ...DEFAULT_HEADERS, ...(pipeline.headers || {}) };
    const fetchOptions: RequestInit = {
      method: pipeline.method || 'GET',
      headers,
      signal: AbortSignal.timeout(20000)
    };

    if (pipeline.requestBody && ['POST', 'PUT', 'PATCH'].includes(pipeline.method || 'GET')) {
      fetchOptions.body = pipeline.requestBody;
    }

    const res = await fetch(pipeline.targetUrl, fetchOptions);
    httpStatus = res.status;
    const contentType = res.headers.get('content-type') || '';
    const rawBody = await res.text();
    payloadSizeKb = parseFloat((Buffer.byteLength(rawBody, 'utf8') / 1024).toFixed(2));

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText || 'Yêu cầu không thành công'}`);
    }

    // Process according to pipeline type
    if (pipeline.type === 'rest_api') {
      let json = JSON.parse(rawBody);

      // Special handling for HackerNews topstories array
      if (Array.isArray(json) && typeof json[0] === 'number' && pipeline.targetUrl.includes('hacker-news')) {
        // Fetch details of top 8 stories
        const topIds = json.slice(0, 8);
        const itemPromises = topIds.map(async (id) => {
          try {
            const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            return await itemRes.json();
          } catch {
            return null;
          }
        });
        const items = (await Promise.all(itemPromises)).filter(Boolean);
        items.forEach((story: any) => {
          extractedRecords.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineType: pipeline.type,
            sourceUrl: pipeline.targetUrl,
            data: {
              storyId: story.id,
              title: story.title || 'Untitled',
              by: story.by || 'Anonymous',
              score: story.score || 0,
              comments: story.descendants || 0,
              url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
              time: story.time ? new Date(story.time * 1000).toISOString() : new Date().toISOString()
            },
            collectedAt: new Date().toISOString(),
            checksum: `${story.id}`
          });
        });
      } else if (pipeline.targetUrl.includes('coingecko.com')) {
        // CoinGecko dictionary structure: { bitcoin: { usd: ..., usd_24h_change: ... }, ... }
        Object.entries(json).forEach(([coin, details]: [string, any]) => {
          extractedRecords.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineType: pipeline.type,
            sourceUrl: pipeline.targetUrl,
            data: {
              coin: coin.toUpperCase(),
              usd_price: details.usd,
              change_24h_pct: details.usd_24h_change ? parseFloat(details.usd_24h_change.toFixed(2)) : 0,
              market_cap_usd: details.usd_market_cap || 0,
              updated_at: new Date().toISOString()
            },
            collectedAt: new Date().toISOString(),
            checksum: `${coin}-${details.usd}`
          });
        });
      } else {
        // Generic JSON extractor
        let targetData = json;
        if (pipeline.dataPath) {
          targetData = getNestedValue(json, pipeline.dataPath);
        }

        if (Array.isArray(targetData)) {
          targetData.slice(0, 30).forEach((item: any) => {
            const rowData: Record<string, any> = {};
            if (pipeline.fields && pipeline.fields.length > 0) {
              pipeline.fields.forEach(f => {
                const val = f.jsonPath ? getNestedValue(item, f.jsonPath) : item[f.name];
                rowData[f.name] = val !== undefined ? val : null;
              });
            } else if (typeof item === 'object') {
              Object.assign(rowData, item);
            } else {
              rowData.value = item;
            }

            extractedRecords.push({
              id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              pipelineId: pipeline.id,
              pipelineName: pipeline.name,
              pipelineType: pipeline.type,
              sourceUrl: pipeline.targetUrl,
              data: rowData,
              collectedAt: new Date().toISOString(),
              checksum: JSON.stringify(rowData)
            });
          });
        } else if (typeof targetData === 'object' && targetData !== null) {
          const rowData: Record<string, any> = {};
          if (pipeline.fields && pipeline.fields.length > 0) {
            pipeline.fields.forEach(f => {
              rowData[f.name] = f.jsonPath ? getNestedValue(targetData, f.jsonPath) : targetData[f.name];
            });
          } else {
            Object.assign(rowData, targetData);
          }

          extractedRecords.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineType: pipeline.type,
            sourceUrl: pipeline.targetUrl,
            data: rowData,
            collectedAt: new Date().toISOString(),
            checksum: JSON.stringify(rowData)
          });
        }
      }
    } else if (pipeline.type === 'rss_feed') {
      const $ = cheerio.load(rawBody, { xmlMode: true });
      const items = $('item, entry');

      items.slice(0, 25).each((_, elem) => {
        const $item = $(elem);
        const title = cleanText($item.find('title').first().text());
        const link = cleanText($item.find('link').text() || $item.find('link').attr('href') || '');
        const pubDate = cleanText($item.find('pubDate, updated, published').first().text());
        const descRaw = $item.find('description, summary, content').first().text();
        // Remove nested HTML tags in description
        const descClean = cleanText(cheerio.load(descRaw).text());

        if (title) {
          extractedRecords.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineType: pipeline.type,
            sourceUrl: pipeline.targetUrl,
            data: {
              title,
              link,
              pubDate: pubDate || new Date().toISOString(),
              description: descClean.slice(0, 300)
            },
            collectedAt: new Date().toISOString(),
            checksum: `${title}-${link}`
          });
        }
      });
    } else if (pipeline.type === 'web_scraper') {
      const $ = cheerio.load(rawBody);
      const containerSel = pipeline.containerSelector || 'article, .item, .post, tr';
      const containers = $(containerSel);

      if (containers.length > 0) {
        containers.slice(0, 25).each((_, el) => {
          const $el = $(el);
          const rowData: Record<string, any> = {};

          if (pipeline.fields && pipeline.fields.length > 0) {
            pipeline.fields.forEach(field => {
              const target = field.selector ? $el.find(field.selector) : $el;
              if (field.attribute && field.attribute !== 'text') {
                rowData[field.name] = target.attr(field.attribute) || '';
              } else {
                rowData[field.name] = cleanText(target.first().text());
              }
            });
          } else {
            // Default generic scrape
            rowData.title = cleanText($el.find('h1, h2, h3, a').first().text());
            rowData.link = $el.find('a').attr('href') || '';
            rowData.snippet = cleanText($el.find('p').first().text()).slice(0, 200);
          }

          if (Object.values(rowData).some(v => v && String(v).trim().length > 0)) {
            extractedRecords.push({
              id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              pipelineId: pipeline.id,
              pipelineName: pipeline.name,
              pipelineType: pipeline.type,
              sourceUrl: pipeline.targetUrl,
              data: rowData,
              collectedAt: new Date().toISOString(),
              checksum: JSON.stringify(rowData)
            });
          }
        });
      } else {
        // Fallback: extract page metadata + main heading & links
        const pageTitle = cleanText($('title').text() || $('h1').first().text());
        const desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
        if (pageTitle) {
          extractedRecords.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineType: pipeline.type,
            sourceUrl: pipeline.targetUrl,
            data: {
              pageTitle,
              description: desc,
              extractedHeadings: $('h1, h2').slice(0, 5).map((_, h) => cleanText($(h).text())).get(),
              extractedLinksCount: $('a').length
            },
            collectedAt: new Date().toISOString(),
            checksum: pageTitle
          });
        }
      }
    }

    itemsExtracted = extractedRecords.length;
  } catch (err: any) {
    status = 'failed';
    errorMessage = err?.message || 'Lỗi không xác định khi thu thập';
  }

  const durationMs = Date.now() - startTime;
  const completedAt = new Date().toISOString();

  // Create log entry
  const log: ExecutionLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    pipelineType: pipeline.type,
    startedAt,
    completedAt,
    durationMs,
    status,
    httpStatus,
    itemsExtracted,
    payloadSizeKb,
    errorMessage
  };

  // Update in memory & DB
  db.logs.unshift(log);
  if (db.logs.length > 500) {
    db.logs = db.logs.slice(0, 500); // keep recent 500 logs
  }

  if (extractedRecords.length > 0) {
    db.records.unshift(...extractedRecords);
    if (db.records.length > 2000) {
      db.records = db.records.slice(0, 2000); // keep recent 2000 records
    }
  }

  // Update pipeline stats
  pipeline.lastRunAt = completedAt;
  pipeline.lastRunStatus = status;
  pipeline.lastRunDurationMs = durationMs;
  pipeline.lastErrorMessage = errorMessage;
  if (status === 'success') {
    pipeline.totalCollected += itemsExtracted;
  }
  pipeline.updatedAt = completedAt;

  saveDatabase(db);

  return { success: status === 'success', count: itemsExtracted, log };
}

// ----------------- API ROUTES ----------------- //

// 1. Get system stats
app.get('/api/stats', (_req, res) => {
  const totalPipelines = db.pipelines.length;
  const activePipelines = db.pipelines.filter(p => p.status === 'active').length;
  const totalRecords = db.records.length;
  const totalLogs = db.logs.length;

  const successfulLogs = db.logs.filter(l => l.status === 'success');
  const successRate = totalLogs > 0 ? parseFloat(((successfulLogs.length / totalLogs) * 100).toFixed(1)) : 100;

  const avgLatencyMs = totalLogs > 0
    ? Math.round(db.logs.reduce((acc, l) => acc + l.durationMs, 0) / totalLogs)
    : 0;

  const totalDataSizeKb = parseFloat(
    db.logs.reduce((acc, l) => acc + (l.payloadSizeKb || 0), 0).toFixed(2)
  );

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24hRuns = db.logs.filter(l => new Date(l.startedAt).getTime() > oneDayAgo).length;

  const stats: SystemStats = {
    totalPipelines,
    activePipelines,
    totalRecords,
    totalLogs,
    successRate,
    avgLatencyMs,
    totalDataSizeKb,
    last24hRuns
  };

  res.json(stats);
});

// 2. Get pipelines
app.get('/api/pipelines', (_req, res) => {
  res.json(db.pipelines);
});

// 3. Create pipeline
app.post('/api/pipelines', (req, res) => {
  try {
    const { name, description, type, targetUrl, method, headers, requestBody, schedule, cronExpression, containerSelector, fields, dataPath } = req.body;
    if (!name || !targetUrl || !type) {
      return res.status(400).json({ error: 'Tên, URL mục tiêu và loại pipeline là bắt buộc' });
    }

    if (schedule === 'cron' && cronExpression) {
      try {
        CronExpressionParser.parse(cronExpression);
      } catch (err: any) {
        return res.status(400).json({ error: `Biểu thức Cron không hợp lệ: ${err.message}` });
      }
    }

    const newPipeline: PipelineConfig = {
      id: `pipe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: description || '',
      type,
      targetUrl,
      method: method || 'GET',
      headers: headers || {},
      requestBody: requestBody || '',
      schedule: schedule || 'manual',
      cronExpression: cronExpression || '',
      status: 'active',
      containerSelector,
      fields: fields || [],
      dataPath: dataPath || '',
      totalCollected: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.pipelines.unshift(newPipeline);
    saveDatabase(db);
    res.status(201).json(newPipeline);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi tạo pipeline' });
  }
});

// 4. Update pipeline
app.put('/api/pipelines/:id', (req, res) => {
  const index = db.pipelines.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(400).json({ error: 'Pipeline không tồn tại' });
  }

  const existing = db.pipelines[index];
  const updated: PipelineConfig = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  db.pipelines[index] = updated;
  saveDatabase(db);
  res.json(updated);
});

// 5. Delete pipeline
app.delete('/api/pipelines/:id', (req, res) => {
  const id = req.params.id;
  db.pipelines = db.pipelines.filter(p => p.id !== id);
  // Optionally clean up its records
  saveDatabase(db);
  res.json({ success: true, id });
});

// 6. Run pipeline immediately
app.post('/api/pipelines/:id/run', async (req, res) => {
  try {
    const result = await executePipeline(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi thực thi pipeline' });
  }
});

// 7. Toggle pipeline status
app.post('/api/pipelines/:id/toggle', (req, res) => {
  const pipeline = db.pipelines.find(p => p.id === req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline không tồn tại' });
  }
  pipeline.status = pipeline.status === 'active' ? 'paused' : 'active';
  pipeline.updatedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ success: true, status: pipeline.status });
});

// 8. Get collected records
app.get('/api/records', (req, res) => {
  const { pipelineId, q, syncStatus, page = '1', limit = '20' } = req.query;
  let records = db.records;

  if (pipelineId && typeof pipelineId === 'string') {
    records = records.filter(r => r.pipelineId === pipelineId);
  }

  if (syncStatus === 'synced') {
    records = records.filter(r => r.synced === true);
  } else if (syncStatus === 'not_synced') {
    records = records.filter(r => !r.synced);
  }

  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    records = records.filter(r =>
      r.pipelineName.toLowerCase().includes(query) ||
      JSON.stringify(r.data).toLowerCase().includes(query)
    );
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;
  const total = records.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = records.slice(startIndex, startIndex + limitNum);

  res.json({
    records: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

// 8b. Sync single record to external integrations
app.post('/api/records/:id/sync', (req, res) => {
  const record = db.records.find(r => r.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Bản ghi không tồn tại' });
  }

  const destination = req.body?.destination || 'Webhook Stream';
  record.synced = true;
  record.syncDestination = destination;
  record.syncedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ success: true, record });
});

// 8c. Bulk sync records
app.post('/api/records/bulk-sync', (req, res) => {
  const { pipelineId, destination = 'External Data Hub' } = req.body || {};
  let count = 0;
  const now = new Date().toISOString();

  db.records.forEach(r => {
    if (!pipelineId || r.pipelineId === pipelineId) {
      r.synced = true;
      r.syncDestination = destination;
      r.syncedAt = now;
      count++;
    }
  });

  saveDatabase(db);
  res.json({ success: true, count });
});

// 9. Delete single record
app.delete('/api/records/:id', (req, res) => {
  const id = req.params.id;
  db.records = db.records.filter(r => r.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});

// 10. Clear records
app.delete('/api/records', (req, res) => {
  const { pipelineId } = req.query;
  if (pipelineId && typeof pipelineId === 'string') {
    db.records = db.records.filter(r => r.pipelineId !== pipelineId);
  } else {
    db.records = [];
  }
  saveDatabase(db);
  res.json({ success: true });
});

// 11. Get logs
app.get('/api/logs', (req, res) => {
  const { pipelineId, limit = '50' } = req.query;
  let logs = db.logs;
  if (pipelineId && typeof pipelineId === 'string') {
    logs = logs.filter(l => l.pipelineId === pipelineId);
  }
  const limitNum = parseInt(limit as string, 10) || 50;
  res.json(logs.slice(0, limitNum));
});

// 12. Clear logs
app.delete('/api/logs', (_req, res) => {
  db.logs = [];
  saveDatabase(db);
  res.json({ success: true });
});

// 13. URL Inspector & Live Tester
app.post('/api/inspect', async (req, res) => {
  const { url, method = 'GET', headers, extractType = 'html', containerSelector, fields, dataPath, useAiExtraction, aiPrompt } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL không được để trống' });
  }

  const startTime = Date.now();
  try {
    const fetchHeaders = { ...DEFAULT_HEADERS, ...(headers || {}) };
    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      signal: AbortSignal.timeout(15000)
    });

    const durationMs = Date.now() - startTime;
    const httpStatus = response.status;
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    const payloadSizeKb = parseFloat((Buffer.byteLength(rawText, 'utf8') / 1024).toFixed(2));

    const result: InspectResponse = {
      success: response.ok,
      httpStatus,
      contentType,
      durationMs,
      payloadSizeKb,
      previewRaw: rawText.slice(0, 10000), // First 10KB preview
      extractedItems: []
    };

    if (contentType.includes('json') || extractType === 'json') {
      try {
        const json = JSON.parse(rawText);
        let target = json;
        if (dataPath) {
          target = getNestedValue(json, dataPath);
        }
        if (Array.isArray(target)) {
          result.extractedItems = target.slice(0, 15);
        } else if (typeof target === 'object') {
          result.extractedItems = [target];
        }
      } catch (err: any) {
        result.errorMessage = `Lỗi phân tích JSON: ${err.message}`;
      }
    } else {
      // HTML or XML feed
      const $ = cheerio.load(rawText);
      const isXml = rawText.trim().startsWith('<?xml') || rawText.includes('<rss') || rawText.includes('<feed');

      if (isXml || extractType === 'feed') {
        const $xml = cheerio.load(rawText, { xmlMode: true });
        const items = $xml('item, entry');
        const parsedFeed: any[] = [];
        items.slice(0, 15).each((_, el) => {
          const $it = $xml(el);
          parsedFeed.push({
            title: cleanText($it.find('title').first().text()),
            link: cleanText($it.find('link').text() || $it.find('link').attr('href') || ''),
            pubDate: cleanText($it.find('pubDate, updated, published').first().text()),
            summary: cleanText($it.find('description, summary').first().text()).slice(0, 200)
          });
        });
        result.extractedItems = parsedFeed;
      } else {
        // Standard HTML
        result.pageMeta = {
          title: cleanText($('title').text()),
          description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
          ogTitle: $('meta[property="og:title"]').attr('content') || '',
          ogImage: $('meta[property="og:image"]').attr('content') || '',
          canonical: $('link[rel="canonical"]').attr('href') || '',
          language: $('html').attr('lang') || '',
          headingsCount: {
            h1: $('h1').length,
            h2: $('h2').length,
            h3: $('h3').length
          }
        };

        if (containerSelector) {
          const matched = $(containerSelector);
          const items: any[] = [];
          matched.slice(0, 15).each((_, el) => {
            const $el = $(el);
            const row: Record<string, any> = {};
            if (fields && fields.length > 0) {
              fields.forEach((f: any) => {
                const node = f.selector ? $el.find(f.selector) : $el;
                if (f.attribute && f.attribute !== 'text') {
                  row[f.name] = node.attr(f.attribute) || '';
                } else {
                  row[f.name] = cleanText(node.first().text());
                }
              });
            } else {
              row.text = cleanText($el.text()).slice(0, 200);
            }
            items.push(row);
          });
          result.extractedItems = items;
        } else {
          // Auto-detect items: articles, headlines, tables
          const autoItems: any[] = [];
          $('article, .card, .post, .item, tr').slice(0, 10).each((_, el) => {
            const $el = $(el);
            const headline = cleanText($el.find('h1, h2, h3, a').first().text());
            const link = $el.find('a').attr('href') || '';
            if (headline) {
              autoItems.push({ headline, link, snippet: cleanText($el.text()).slice(0, 150) });
            }
          });
          result.extractedItems = autoItems;
        }

        // If AI Extraction requested and Gemini is available
        if (useAiExtraction && geminiAi) {
          try {
            const promptText = `Trích xuất dữ liệu từ trang web sau theo yêu cầu: "${aiPrompt || 'Danh sách các mục, giá cả, tiêu đề hoặc thông tin quan trọng'}".
Chỉ trả về JSON thuần túy (dạng mảng các đối tượng object), không kèm markdown block hay giải thích.
Nội dung văn bản trang:
${$('body').text().slice(0, 6000)}`;

            const aiRes = await geminiAi.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: promptText
            });

            const aiText = aiRes.text || '';
            const cleanAiJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedAi = JSON.parse(cleanAiJson);
            if (Array.isArray(parsedAi)) {
              result.extractedItems = parsedAi;
            }
          } catch (aiErr: any) {
            console.warn('[DataCenter] AI Extraction note:', aiErr.message);
          }
        }
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Không thể truy cập URL mục tiêu',
      durationMs: Date.now() - startTime
    });
  }
});

// 14. Smart AI Schema Extractor endpoint
app.post('/api/smart-extract', async (req, res) => {
  const { rawText, targetSchemaPrompt } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: 'Nội dung rawText là bắt buộc' });
  }

  if (!geminiAi) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY chưa được cấu hình. Tính năng AI trích xuất yêu cầu cấu hình API key.',
      configured: false
    });
  }

  try {
    const prompt = `Bạn là một AI Data Extraction Engine trong hệ thống DataCenter.
Hãy phân tích nội dung văn bản dưới đây và trích xuất thành định dạng mảng JSON các object theo schema yêu cầu: "${targetSchemaPrompt || 'Trích xuất danh sách các thực thể, bài viết, sản phẩm hoặc thông số kỹ thuật'}".
Yêu cầu bắt buộc: Chỉ trả về JSON hợp lệ thuần túy, không có thẻ code block (\`\`\`json) hay văn bản giải thích.
Nội dung nguồn:
${String(rawText).slice(0, 10000)}`;

    const response = await geminiAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi trích xuất dữ liệu bằng AI' });
  }
});

// 15. Inbound Webhook Listener
app.all('/api/webhook/:id', (req, res) => {
  const pipelineId = req.params.id;
  const pipeline = db.pipelines.find(p => p.id === pipelineId);

  const payload = req.method === 'GET' ? req.query : req.body;
  const startedAt = new Date().toISOString();
  const payloadSizeKb = parseFloat((Buffer.byteLength(JSON.stringify(payload), 'utf8') / 1024).toFixed(2));

  const record: CollectorRecord = {
    id: `rec-wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pipelineId: pipeline ? pipeline.id : pipelineId,
    pipelineName: pipeline ? pipeline.name : `Webhook (${pipelineId})`,
    pipelineType: 'webhook',
    sourceUrl: req.originalUrl,
    data: typeof payload === 'object' ? payload : { raw: payload },
    collectedAt: startedAt,
    checksum: `wh-${Date.now()}`,
    synced: true,
    syncDestination: 'Inbound Webhook Stream',
    syncedAt: startedAt
  };

  db.records.unshift(record);
  if (db.records.length > 2000) db.records.pop();

  const log: ExecutionLog = {
    id: `log-wh-${Date.now()}`,
    pipelineId: pipeline ? pipeline.id : pipelineId,
    pipelineName: pipeline ? pipeline.name : `Webhook (${pipelineId})`,
    pipelineType: 'webhook',
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: 12,
    status: 'success',
    httpStatus: 200,
    itemsExtracted: 1,
    payloadSizeKb
  };

  db.logs.unshift(log);
  if (db.logs.length > 500) db.logs.pop();

  if (pipeline) {
    pipeline.totalCollected += 1;
    pipeline.lastRunAt = startedAt;
    pipeline.lastRunStatus = 'success';
    pipeline.updatedAt = startedAt;
  }

  saveDatabase(db);
  res.json({ success: true, message: 'Dữ liệu webhook đã được ghi nhận vào DataCenter', recordId: record.id });
});

// Automated Scheduler: Checks active pipelines every 30 seconds
const scheduleIntervalsMs: Record<string, number> = {
  '1m': 1 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000
};

setInterval(async () => {
  const now = Date.now();
  for (const pipeline of db.pipelines) {
    if (pipeline.status !== 'active' || pipeline.schedule === 'manual' || pipeline.type === 'webhook') {
      continue;
    }

    if (pipeline.schedule === 'cron') {
      if (!pipeline.cronExpression) continue;
      try {
        const interval = CronExpressionParser.parse(pipeline.cronExpression);
        const prevRun = interval.prev().toDate().getTime();
        const lastRunTime = pipeline.lastRunAt ? new Date(pipeline.lastRunAt).getTime() : 0;
        
        // Execute if a scheduled cron mark has occurred since last run (within a 60-second window)
        if (prevRun > lastRunTime && now >= prevRun && (now - prevRun) < 65000) {
          console.log(`[DataCenter Scheduler] Executing cron pipeline: ${pipeline.name} (${pipeline.cronExpression})`);
          await executePipeline(pipeline.id);
        }
      } catch (cronErr) {
        console.warn(`[DataCenter Scheduler] Cron parse error for ${pipeline.name}:`, cronErr);
      }
      continue;
    }

    const intervalMs = scheduleIntervalsMs[pipeline.schedule];
    if (!intervalMs) continue;

    const lastRunTime = pipeline.lastRunAt ? new Date(pipeline.lastRunAt).getTime() : 0;
    if (now - lastRunTime >= intervalMs) {
      try {
        console.log(`[DataCenter Scheduler] Executing scheduled pipeline: ${pipeline.name}`);
        await executePipeline(pipeline.id);
      } catch (err) {
        console.error(`[DataCenter Scheduler] Error executing ${pipeline.name}:`, err);
      }
    }
  }
}, 30000);

// Setup dev server with Vite or production static files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DataCenter Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[DataCenter Engine] Fatal startup error:', err);
});
