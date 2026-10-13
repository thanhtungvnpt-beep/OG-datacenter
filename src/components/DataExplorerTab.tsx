import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Download, 
  Trash2, 
  ExternalLink, 
  Eye, 
  FileJson, 
  FileSpreadsheet, 
  RefreshCw, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  SlidersHorizontal, 
  CheckCircle2, 
  X, 
  Share2, 
  UploadCloud, 
  CircleDashed,
  CloudCheck
} from 'lucide-react';
import { CollectorRecord, PipelineConfig } from '../types/datacenter.ts';
import { fetchRecords, syncRecord, bulkSyncRecords } from '../services/api.ts';

interface DataExplorerTabProps {
  records: CollectorRecord[];
  totalRecords: number;
  pipelines: PipelineConfig[];
  selectedPipelineId: string;
  onFilterPipeline: (pipelineId: string) => void;
  onSearch: (q: string) => void;
  onDeleteRecord: (id: string) => void;
  onClearRecords: (pipelineId?: string) => void;
  onViewRecordDetail: (record: CollectorRecord) => void;
  onRefreshRecords: () => void;
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const DataExplorerTab: React.FC<DataExplorerTabProps> = ({
  records,
  totalRecords,
  pipelines,
  selectedPipelineId,
  onFilterPipeline,
  onSearch,
  onDeleteRecord,
  onClearRecords,
  onViewRecordDetail,
  onRefreshRecords,
  isLoading,
  page,
  totalPages,
  onPageChange
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncingRecordId, setSyncingRecordId] = useState<string | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  // Sync status filter
  const [syncStatusFilter, setSyncStatusFilter] = useState<'all' | 'synced' | 'not_synced'>('all');

  // Advanced Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportScope, setExportScope] = useState<'current_view' | 'all_filtered'>('current_view');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const getCleanDateSlug = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const generateFilename = (ext: 'csv' | 'json') => {
    const prefix = selectedPipeline 
      ? `datacenter_${selectedPipeline.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)}` 
      : 'datacenter_records';
    return `${prefix}_${getCleanDateSlug()}.${ext}`;
  };

  // Helper to trigger file download directly to client machine
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export JSON execution
  const executeJsonExport = (recordsToExport: CollectorRecord[], withMeta: boolean) => {
    const payload = recordsToExport.map(r => {
      if (withMeta) {
        return {
          _id: r.id,
          _pipeline: r.pipelineName,
          _type: r.pipelineType,
          _sourceUrl: r.sourceUrl,
          _collectedAt: r.collectedAt,
          _synced: !!r.synced,
          _syncDestination: r.syncDestination || null,
          _syncedAt: r.syncedAt || null,
          ...r.data
        };
      }
      return r.data;
    });

    const jsonString = JSON.stringify(payload, null, 2);
    const filename = generateFilename('json');
    triggerDownload(jsonString, filename, 'application/json;charset=utf-8');

    setNotice(`Đã xuất ${recordsToExport.length} bản ghi dạng JSON về máy: ${filename}`);
    setTimeout(() => setNotice(null), 4000);
  };

  // Export CSV execution
  const executeCsvExport = (recordsToExport: CollectorRecord[], withMeta: boolean) => {
    if (recordsToExport.length === 0) return;

    // Collect all data keys
    const dataKeys = Array.from(
      new Set(recordsToExport.flatMap(r => Object.keys(r.data)))
    );

    const headers: string[] = [];
    if (withMeta) {
      headers.push('record_id', 'pipeline_name', 'pipeline_type', 'source_url', 'collected_at', 'is_synced', 'sync_destination', 'synced_at');
    }
    headers.push(...dataKeys);

    // Escape CSV cell with proper quotes
    const formatCell = (val: any): string => {
      if (val === undefined || val === null) return '""';
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    };

    const headerRow = headers.map(h => `"${h}"`).join(',');
    const dataRows = recordsToExport.map(r => {
      const rowValues: string[] = [];
      if (withMeta) {
        rowValues.push(
          formatCell(r.id),
          formatCell(r.pipelineName),
          formatCell(r.pipelineType),
          formatCell(r.sourceUrl),
          formatCell(r.collectedAt),
          formatCell(r.synced ? 'YES' : 'NO'),
          formatCell(r.syncDestination || ''),
          formatCell(r.syncedAt || '')
        );
      }
      for (const k of dataKeys) {
        rowValues.push(formatCell(r.data[k]));
      }
      return rowValues.join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    const filename = generateFilename('csv');
    triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');

    setNotice(`Đã xuất ${recordsToExport.length} bản ghi dạng CSV về máy: ${filename}`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleQuickExportJson = () => {
    if (records.length === 0) return;
    executeJsonExport(records, true);
  };

  const handleQuickExportCsv = () => {
    if (records.length === 0) return;
    executeCsvExport(records, true);
  };

  const handlePerformAdvancedExport = async () => {
    setIsExporting(true);
    try {
      let targetRecords: CollectorRecord[] = records;

      if (exportScope === 'all_filtered') {
        const allResult = await fetchRecords({
          pipelineId: selectedPipelineId || undefined,
          q: localSearch || undefined,
          syncStatus: syncStatusFilter !== 'all' ? syncStatusFilter : undefined,
          page: 1,
          limit: 5000
        });
        targetRecords = allResult.records;
      }

      if (exportFormat === 'csv') {
        executeCsvExport(targetRecords, includeMetadata);
      } else {
        executeJsonExport(targetRecords, includeMetadata);
      }

      setIsExportModalOpen(false);
    } catch (err: any) {
      alert(`Lỗi khi xuất dữ liệu: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(records.map(r => r.data), null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Sync a single record to external integrations
  const handleSyncSingleRecord = async (id: string) => {
    setSyncingRecordId(id);
    try {
      const res = await syncRecord(id, 'Webhook Stream');
      if (res.success) {
        setNotice(`Đã đồng bộ bản ghi #${id.slice(-6)} tới Tích hợp Ngoài (Webhook Stream)`);
        setTimeout(() => setNotice(null), 3500);
        onRefreshRecords();
      }
    } catch (err: any) {
      alert(`Lỗi khi đồng bộ: ${err?.message || 'Không xác định'}`);
    } finally {
      setSyncingRecordId(null);
    }
  };

  // Bulk sync matching records to external integrations
  const handleBulkSync = async () => {
    if (!confirm(`Bạn có muốn đồng bộ tất cả bản ghi hiện tại tới Tích hợp Ngoài (External Data Hub)?`)) {
      return;
    }
    setIsBulkSyncing(true);
    try {
      const res = await bulkSyncRecords(selectedPipelineId || undefined, 'External Data Hub');
      setNotice(`Đã đồng bộ thành công ${res.count} bản ghi tới Tích hợp Ngoài!`);
      setTimeout(() => setNotice(null), 4000);
      onRefreshRecords();
    } catch (err: any) {
      alert(`Lỗi khi đồng bộ hàng loạt: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // Filter records by sync status on client if needed
  const displayedRecords = syncStatusFilter === 'all' 
    ? records 
    : syncStatusFilter === 'synced'
    ? records.filter(r => !!r.synced)
    : records.filter(r => !r.synced);

  // Determine top 4 sample keys to display in preview table
  const sampleKeys = Array.from(
    new Set(displayedRecords.slice(0, 10).flatMap(r => Object.keys(r.data)))
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button 
            onClick={() => setNotice(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Filter & Export Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pipeline selector & search */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPipelineId}
              onChange={(e) => onFilterPipeline(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">Tất cả Pipelines ({pipelines.length})</option>
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Status Filter */}
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={syncStatusFilter}
              onChange={(e) => setSyncStatusFilter(e.target.value as any)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Tất cả Tích hợp</option>
              <option value="synced">Đã đồng bộ tích hợp</option>
              <option value="not_synced">Chưa đồng bộ</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung bản ghi..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </form>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button
            onClick={onRefreshRecords}
            title="Làm mới"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Bulk Sync Button */}
          <button
            onClick={handleBulkSync}
            disabled={displayedRecords.length === 0 || isBulkSyncing}
            title="Đồng bộ tất cả bản ghi hiện tại tới Tích hợp Ngoài"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/80 disabled:opacity-50"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isBulkSyncing ? 'animate-spin' : ''}`} />
            <span>Đồng bộ Tích hợp</span>
          </button>

          {/* Quick 1-Click CSV Export */}
          <button
            onClick={handleQuickExportCsv}
            disabled={displayedRecords.length === 0}
            title="Tải nhanh toàn bộ bản ghi trang hiện tại dạng CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tải CSV</span>
          </button>

          {/* Quick 1-Click JSON Export */}
          <button
            onClick={handleQuickExportJson}
            disabled={displayedRecords.length === 0}
            title="Tải nhanh toàn bộ bản ghi trang hiện tại dạng JSON"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tải JSON</span>
          </button>

          {/* Advanced Export Options Modal Trigger */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={displayedRecords.length === 0}
            title="Tùy chỉnh phạm vi xuất và định dạng"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
            <span>Tùy chọn Xuất...</span>
          </button>

          <button
            onClick={handleCopyJson}
            disabled={displayedRecords.length === 0}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Sao chép toàn bộ JSON vào Clipboard"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn xóa toàn bộ bản ghi dữ liệu này không?')) {
                onClearRecords(selectedPipelineId || undefined);
              }
            }}
            disabled={displayedRecords.length === 0}
            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            title="Xóa toàn bộ bản ghi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Records Count & Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Đang hiển thị <strong className="text-slate-900 font-mono tabular-nums">{displayedRecords.length}</strong> / <span className="font-mono tabular-nums">{totalRecords}</span> bản ghi trong DataCenter
          {selectedPipeline && (
            <span className="text-slate-400"> (từ: {selectedPipeline.name})</span>
          )}
          {syncStatusFilter !== 'all' && (
            <span className="text-indigo-600 font-medium"> · Lọc: {syncStatusFilter === 'synced' ? 'Đã đồng bộ' : 'Chưa đồng bộ'}</span>
          )}
        </span>
        <span className="font-mono text-[11px]">
          Trang {page} / {totalPages || 1}
        </span>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {displayedRecords.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Database className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Kho dữ liệu hiện đang trống</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Chưa có bản ghi nào phù hợp với bộ lọc hiện tại. Hãy chuyển sang tab Pipelines và nhấn "Thu thập ngay" trên một nguồn dữ liệu!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-12 text-slate-400 font-mono">#</th>
                  <th className="py-3 px-4 w-40">Pipeline Nguồn</th>
                  <th className="py-3 px-4 w-44">Tích hợp Ngoài</th>
                  {sampleKeys.map(k => (
                    <th key={k} className="py-3 px-4 font-mono capitalize">
                      {k}
                    </th>
                  ))}
                  <th className="py-3 px-4 w-28 font-mono">Thời gian</th>
                  <th className="py-3 px-4 w-20 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {displayedRecords.map((rec, idx) => {
                  const isSyncing = syncingRecordId === rec.id;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                        {(page - 1) * 20 + idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        <div className="truncate max-w-[150px]" title={rec.pipelineName}>
                          {rec.pipelineName}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">
                          {rec.pipelineType}
                        </div>
                      </td>

                      {/* Visual indicator (badge) for external integration sync */}
                      <td className="py-2.5 px-4">
                        {rec.synced ? (
                          <div 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs max-w-[160px]"
                            title={`Đã đồng bộ đến: ${rec.syncDestination || 'External Data Hub'} lúc ${rec.syncedAt ? new Date(rec.syncedAt).toLocaleTimeString('vi-VN') : ''}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="block truncate">{rec.syncDestination || 'Đã đồng bộ'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200/60"
                              title="Bản ghi chưa được đẩy/đồng bộ tới các ứng dụng ngoài"
                            >
                              <CircleDashed className="w-3 h-3 text-slate-400" />
                              <span>Chưa đồng bộ</span>
                            </span>
                            <button
                              onClick={() => handleSyncSingleRecord(rec.id)}
                              disabled={isSyncing}
                              title="Đẩy bản ghi này tới Tích hợp Ngoài ngay"
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors underline disabled:opacity-40"
                            >
                              {isSyncing ? '...' : 'Đẩy'}
                            </button>
                          </div>
                        )}
                      </td>

                      {sampleKeys.map(k => {
                        const val = rec.data[k];
                        const displayVal = val === undefined || val === null
                          ? '-'
                          : typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val);
                        return (
                          <td key={k} className="py-2.5 px-4 text-slate-600 max-w-[200px] truncate" title={displayVal}>
                            {displayVal}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(rec.collectedAt).toLocaleTimeString('vi-VN')}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewRecordDetail(rec)}
                            title="Xem chi tiết dữ liệu"
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            title="Xóa bản ghi"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Tùy Chọn Xuất Dữ Liệu DataCenter</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Format Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-2">
                  Định Dạng File Tải Về
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      exportFormat === 'csv'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>File CSV (Excel)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Chuẩn UTF-8 BOM, tương thích tốt với Excel & Google Sheets
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      exportFormat === 'json'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <FileJson className="w-4 h-4 text-indigo-600" />
                      <span>File JSON</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Định dạng JSON có cấu trúc đầy đủ, thụt dòng rõ ràng
                    </span>
                  </button>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-2">
                  Phạm Vi Dữ Liệu Xuất
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'current_view'}
                      onChange={() => setExportScope('current_view')}
                      className="mt-0.5 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Trang hiện tại ({displayedRecords.length} bản ghi)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Chỉ tải về danh sách bản ghi đang hiển thị trên trang này
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all_filtered'}
                      onChange={() => setExportScope('all_filtered')}
                      className="mt-0.5 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Toàn bộ kết quả phù hợp ({totalRecords} bản ghi)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Tải về tất cả bản ghi tương ứng với bộ lọc hiện tại trên server
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Include Metadata Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900 w-4 h-4"
                  />
                  <span className="text-slate-700 font-medium">
                    Kèm theo thông tin nguồn (Mã ID, Tên Pipeline, URL Nguồn, Thời gian thu thập, Trạng thái đồng bộ)
                  </span>
                </label>
              </div>

              {/* Target Filename Preview */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-[11px] text-slate-600 flex items-center justify-between">
                <span>Tên file dự kiến:</span>
                <span className="font-semibold text-slate-900">{generateFilename(exportFormat)}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={handlePerformAdvancedExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
                <span>{isExporting ? 'Đang xuất...' : 'Tải File Về Máy Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
