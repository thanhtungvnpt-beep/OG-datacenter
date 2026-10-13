import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  Database, 
  Plus, 
  Search,
  Globe,
  Radio,
  Rss,
  Webhook
} from 'lucide-react';
import { PipelineConfig, PipelineType } from '../types/datacenter.ts';

interface PipelinesTabProps {
  pipelines: PipelineConfig[];
  onRunPipeline: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onDeletePipeline: (id: string) => void;
  onEditPipeline: (pipe: PipelineConfig) => void;
  onOpenNewPipeline: () => void;
  onViewRecordsForPipeline: (id: string) => void;
  runningPipelineId?: string | null;
}

export const PipelinesTab: React.FC<PipelinesTabProps> = ({
  pipelines,
  onRunPipeline,
  onToggleStatus,
  onDeletePipeline,
  onEditPipeline,
  onOpenNewPipeline,
  onViewRecordsForPipeline,
  runningPipelineId
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPipelines = pipelines.filter((pipe) => {
    const matchesType = filterType === 'all' || pipe.type === filterType;
    const matchesSearch =
      pipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pipe.targetUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeIcon = (type: PipelineType) => {
    switch (type) {
      case 'rest_api': return <Radio className="w-4 h-4 text-blue-600" />;
      case 'web_scraper': return <Globe className="w-4 h-4 text-emerald-600" />;
      case 'rss_feed': return <Rss className="w-4 h-4 text-amber-600" />;
      case 'webhook': return <Webhook className="w-4 h-4 text-purple-600" />;
    }
  };

  const getTypeLabel = (type: PipelineType) => {
    switch (type) {
      case 'rest_api': return 'REST API';
      case 'web_scraper': return 'Web Scraper';
      case 'rss_feed': return 'RSS Feed';
      case 'webhook': return 'Inbound Webhook';
    }
  };

  const getScheduleLabel = (pipe: PipelineConfig) => {
    if (pipe.schedule === 'cron') {
      return pipe.cronExpression ? `Cron: ${pipe.cronExpression}` : 'Cron';
    }
    switch (pipe.schedule) {
      case 'manual': return 'Thủ công';
      case '1m': return 'Mỗi 1 phút';
      case '5m': return 'Mỗi 5 phút';
      case '15m': return 'Mỗi 15 phút';
      case '1h': return 'Mỗi 1 giờ';
      case '6h': return 'Mỗi 6 giờ';
      case '24h': return 'Mỗi ngày (24h)';
      default: return pipe.schedule;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Interactive segmented controls for filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'rest_api', label: 'REST API' },
            { id: 'web_scraper', label: 'Web Scraper' },
            { id: 'rss_feed', label: 'RSS Feed' },
            { id: 'webhook', label: 'Webhook' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filterType === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input & New Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm pipeline, URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            onClick={onOpenNewPipeline}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Pipeline</span>
          </button>
        </div>
      </div>

      {/* Pipelines List Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPipelines.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Database className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Không tìm thấy pipeline phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có pipeline thu thập nào tương ứng với bộ lọc hiện tại. Bạn có thể tạo mới hoặc đổi từ khóa tìm kiếm.
            </p>
            <button
              onClick={onOpenNewPipeline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Pipeline Mới</span>
            </button>
          </div>
        ) : (
          filteredPipelines.map((pipe) => {
            const isRunning = runningPipelineId === pipe.id;
            const isWebhook = pipe.type === 'webhook';

            return (
              <div
                key={pipe.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {getTypeIcon(pipe.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{pipe.name}</h3>
                        <span className="text-xs text-slate-500">· {getTypeLabel(pipe.type)}</span>
                        {pipe.status === 'active' ? (
                          <span className="text-xs font-medium text-emerald-700">· Đang hoạt động</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">· Đã tạm dừng</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{pipe.description}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isWebhook && (
                      <button
                        onClick={() => onRunPipeline(pipe.id)}
                        disabled={isRunning || pipe.status !== 'active'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                      >
                        <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                        <span>{isRunning ? 'Đang cào...' : 'Thu thập ngay'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onToggleStatus(pipe.id)}
                      title={pipe.status === 'active' ? 'Tạm dừng pipeline' : 'Kích hoạt pipeline'}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      {pipe.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onEditPipeline(pipe)}
                      title="Chỉnh sửa cấu hình"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeletePipeline(pipe.id)}
                      title="Xóa pipeline"
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Target URL & metadata bar */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-semibold text-slate-500 uppercase text-[10px] shrink-0">
                      {isWebhook ? 'Webhook Path' : 'URL Nguồn'}
                    </span>
                    <span className="font-mono text-slate-700 truncate">{pipe.targetUrl}</span>
                    <button
                      onClick={() => handleCopyUrl(pipe.targetUrl, pipe.id)}
                      title="Sao chép URL"
                      className="text-slate-400 hover:text-slate-700 shrink-0"
                    >
                      {copiedId === pipe.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {!isWebhook && (
                      <a
                        href={pipe.targetUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-slate-400 hover:text-indigo-600 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 shrink-0">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{getScheduleLabel(pipe)}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <button
                      onClick={() => onViewRecordsForPipeline(pipe.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold font-mono tabular-nums"
                    >
                      {pipe.totalCollected} bản ghi
                    </button>
                  </div>
                </div>

                {/* Extraction Fields preview */}
                {pipe.fields && pipe.fields.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="font-semibold text-slate-400 text-[11px]">Trường trích xuất:</span>
                    {pipe.fields.map((f) => (
                      <span key={f.id} className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {f.name} {f.selector ? `(${f.selector})` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Last run state info */}
                {pipe.lastRunAt && (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
                    <span>
                      Lần chạy gần nhất: {new Date(pipe.lastRunAt).toLocaleString('vi-VN')}
                      {pipe.lastRunDurationMs ? ` (${pipe.lastRunDurationMs}ms)` : ''}
                    </span>
                    {pipe.lastErrorMessage ? (
                      <span className="text-rose-600 font-sans font-medium line-clamp-1 max-w-sm">
                        Lỗi: {pipe.lastErrorMessage}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-sans font-medium">Thu thập thành công</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
