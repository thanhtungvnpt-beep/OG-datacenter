export type PipelineType = 'rest_api' | 'web_scraper' | 'rss_feed' | 'webhook';

export type PipelineStatus = 'active' | 'paused' | 'error' | 'running';

export type ScheduleInterval = 'manual' | '1m' | '5m' | '15m' | '1h' | '6h' | '24h' | 'cron';

export interface ExtractionField {
  id: string;
  name: string;        // e.g. "title", "price", "url", "published_at"
  selector?: string;   // CSS selector for web scraper, e.g. "h2.title", ".price-value"
  attribute?: string;  // attribute to get: "text", "href", "src", or custom attr
  jsonPath?: string;   // e.g. "title", "user.name", "price.amount"
  type: 'string' | 'number' | 'boolean' | 'date';
}

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  type: PipelineType;
  targetUrl: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  requestBody?: string;
  schedule: ScheduleInterval;
  cronExpression?: string; // Standard 5-field cron e.g. "*/15 * * * *"
  status: PipelineStatus;
  
  // Scraper specific
  containerSelector?: string; // CSS selector for item list e.g. ".article-item", "tr.row"
  fields: ExtractionField[];
  
  // API specific
  dataPath?: string; // root JSON path for items e.g. "data.articles", "items"
  
  // Webhook specific
  webhookSecret?: string;
  
  // Stats
  totalCollected: number;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'pending';
  lastRunDurationMs?: number;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectorRecord {
  id: string;
  pipelineId: string;
  pipelineName: string;
  pipelineType: PipelineType;
  sourceUrl: string;
  data: Record<string, any>;
  collectedAt: string;
  checksum: string;
  synced?: boolean;
  syncDestination?: string; // e.g. "Webhook Stream", "Google Sheets", "Kafka", "Data Lake"
  syncedAt?: string;
}

export interface ExecutionLog {
  id: string;
  pipelineId: string;
  pipelineName: string;
  pipelineType: PipelineType;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: 'success' | 'failed';
  httpStatus?: number;
  itemsExtracted: number;
  payloadSizeKb: number;
  errorMessage?: string;
}

export interface InspectRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  extractType: 'html' | 'json' | 'feed';
  containerSelector?: string;
  fields?: ExtractionField[];
  dataPath?: string;
  useAiExtraction?: boolean;
  aiPrompt?: string;
}

export interface InspectResponse {
  success: boolean;
  httpStatus: number;
  contentType: string;
  durationMs: number;
  payloadSizeKb: number;
  previewRaw: string;
  pageMeta?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogImage?: string;
    canonical?: string;
    language?: string;
    headingsCount?: { h1: number; h2: number; h3: number };
  };
  extractedItems: Record<string, any>[];
  errorMessage?: string;
}

export interface SystemStats {
  totalPipelines: number;
  activePipelines: number;
  totalRecords: number;
  totalLogs: number;
  successRate: number;
  avgLatencyMs: number;
  totalDataSizeKb: number;
  last24hRuns: number;
}
