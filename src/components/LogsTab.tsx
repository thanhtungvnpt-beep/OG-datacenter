import React, { useState } from 'react';
import { 
  ScrollText, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter,
  Layers
} from 'lucide-react';
import { ExecutionLog, PipelineConfig } from '../types/datacenter.ts';

interface LogsTabProps {
  logs: ExecutionLog[];
  pipelines: PipelineConfig[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
  isLoading?: boolean;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  pipelines,
  onClearLogs,
  onRefreshLogs,
  isLoading
}) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesPipe = !selectedPipelineId || log.pipelineId === selectedPipelineId;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesPipe && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">Tất cả Pipelines</option>
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tất cả ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'success' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Thành công
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'failed' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Lỗi / Thất bại
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={onRefreshLogs}
            title="Làm mới"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử nhật ký không?')) {
                onClearLogs();
              }
            }}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Nhật Ký</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ScrollText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Chưa có nhật ký thực thi nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Khi các pipeline chạy thu thập định kỳ hoặc chạy thủ công, nhật ký chi tiết sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-12 text-slate-400 font-mono">#</th>
                  <th className="py-3 px-4 w-28">Trạng thái</th>
                  <th className="py-3 px-4">Pipeline</th>
                  <th className="py-3 px-4 w-28 font-mono">Thời gian</th>
                  <th className="py-3 px-4 w-24 font-mono">Thời lượng</th>
                  <th className="py-3 px-4 w-24 font-mono">Mã HTTP</th>
                  <th className="py-3 px-4 w-28 font-mono">Số bản ghi</th>
                  <th className="py-3 px-4 w-24 font-mono">Payload</th>
                  <th className="py-3 px-4">Ghi chú / Chi tiết lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map((log, idx) => {
                  const isSuccess = log.status === 'success';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            isSuccess ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{isSuccess ? 'Thành công' : 'Thất bại'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 max-w-xs truncate" title={log.pipelineName}>
                        {log.pipelineName}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.startedAt).toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                        {log.durationMs}ms
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                        {log.httpStatus || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-900 font-medium">
                        +{log.itemsExtracted}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 text-[11px]">
                        {log.payloadSizeKb} KB
                      </td>
                      <td className="py-2.5 px-4 max-w-md truncate">
                        {log.errorMessage ? (
                          <span className="text-rose-600 font-medium" title={log.errorMessage}>
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-slate-400">Hoàn tất bình thường</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
