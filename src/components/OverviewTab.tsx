import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Layers, 
  CheckCircle2, 
  HardDrive, 
  Play, 
  SearchCode, 
  ArrowUpRight, 
  Clock, 
  XCircle,
  Calendar,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { SystemStats, PipelineConfig, ExecutionLog } from '../types/datacenter.ts';

interface OverviewTabProps {
  stats: SystemStats | null;
  pipelines: PipelineConfig[];
  recentLogs: ExecutionLog[];
  onRunPipeline: (id: string) => void;
  onSelectTab: (tab: string) => void;
  runningPipelineId?: string | null;
  onOpenNewPipeline: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  pipelines,
  recentLogs,
  onRunPipeline,
  onSelectTab,
  runningPipelineId,
  onOpenNewPipeline
}) => {
  const [timeRange, setTimeRange] = useState<'30d' | '7d'>('30d');
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');

  const getPipelineTypeLabel = (type: string) => {
    switch (type) {
      case 'rest_api': return 'REST API';
      case 'web_scraper': return 'Web Scraper';
      case 'rss_feed': return 'RSS Feed';
      case 'webhook': return 'Webhook';
      default: return type;
    }
  };

  const daysToShow = timeRange === '30d' ? 30 : 7;

  // Process and aggregate execution logs for the last 30 (or 7) days
  const { chartData, totalRunsInPeriod, totalSuccessInPeriod, totalFailedInPeriod, periodSuccessRate } = useMemo(() => {
    const now = new Date();
    const dateCounts: Record<string, { success: number; failed: number }> = {};

    recentLogs.forEach((log) => {
      const logDate = new Date(log.startedAt || log.completedAt);
      const key = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      if (!dateCounts[key]) {
        dateCounts[key] = { success: 0, failed: 0 };
      }
      if (log.status === 'success') {
        dateCounts[key].success += 1;
      } else {
        dateCounts[key].failed += 1;
      }
    });

    const list: Array<{
      date: string;
      fullDate: string;
      success: number;
      failed: number;
      total: number;
      ratio: number;
    }> = [];

    let sumSuccess = 0;
    let sumFailed = 0;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const counts = dateCounts[key] || { success: 0, failed: 0 };
      const total = counts.success + counts.failed;
      const ratio = total > 0 ? Math.round((counts.success / total) * 100) : 100;

      sumSuccess += counts.success;
      sumFailed += counts.failed;

      list.push({
        date: dayLabel,
        fullDate: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
        success: counts.success,
        failed: counts.failed,
        total,
        ratio
      });
    }

    const totalRuns = sumSuccess + sumFailed;
    const rate = totalRuns > 0 ? parseFloat(((sumSuccess / totalRuns) * 100).toFixed(1)) : 100;

    return {
      chartData: list,
      totalRunsInPeriod: totalRuns,
      totalSuccessInPeriod: sumSuccess,
      totalFailedInPeriod: sumFailed,
      periodSuccessRate: rate
    };
  }, [recentLogs, daysToShow]);

  // Custom refined Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans space-y-1.5 min-w-[190px]">
          <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{data?.fullDate || label}</span>
            <span className="font-mono tabular-nums text-slate-400">
              {data?.total} lượt
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] pt-0.5">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Thành công:
              </span>
              <span className="font-bold tabular-nums">
                {data?.success} ({data?.total > 0 ? Math.round((data.success / data.total) * 100) : 100}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Thất bại:
              </span>
              <span className="font-bold tabular-nums">
                {data?.failed} ({data?.total > 0 ? Math.round((data.failed / data.total) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-indigo-300 pt-1 border-t border-slate-800">
              <span>Tỉ lệ thành công:</span>
              <span className="font-bold tabular-nums text-white">
                {data?.ratio}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Overview intro */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Trung tâm Thu thập & Quản trị Dữ liệu (DataCenter)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Thu thập tự động dữ liệu từ các ứng dụng web bên ngoài qua REST API, Web Scraping DOM, RSS Feed và Webhook luồng đẩy.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectTab('inspector')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <SearchCode className="w-4 h-4 text-slate-600" />
            <span>Thử nghiệm URL</span>
          </button>
          <button
            onClick={onOpenNewPipeline}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>Thêm Pipeline Mới</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Tổng Bản ghi Dữ liệu</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats ? stats.totalRecords.toLocaleString('vi-VN') : '0'}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Sẵn sàng tìm kiếm và xuất file</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Pipelines Đang chạy</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats ? `${stats.activePipelines} / ${stats.totalPipelines}` : '0 / 0'}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Được lập lịch tự động</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Tỉ lệ Thu thập Thành công</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats ? `${stats.successRate}%` : '100%'}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>{stats ? `${stats.totalLogs} lần thực thi gần nhất` : '0 lượt chạy'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Dung lượng Dữ liệu Nạp</span>
            <HardDrive className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats ? `${(stats.totalDataSizeKb / 1024).toFixed(2)} MB` : '0 MB'}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Độ trễ trung bình: {stats ? `${stats.avgLatencyMs}ms` : '0ms'}</span>
          </div>
        </div>
      </div>

      {/* Visual Recharts Bar Chart: Ratio of Successful vs. Failed Executions in the Last 30 Days */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {/* Header of Chart with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Tỉ Lệ Thực Thi Thành Công vs. Thất Bại</span>
                <span className="text-xs font-normal text-slate-400">· {timeRange === '30d' ? '30 ngày qua' : '7 ngày qua'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Biểu đồ thống kê số lượt và tỷ lệ thu thập hoàn tất bình thường so với các lượt phát sinh lỗi
              </p>
            </div>
          </div>

          {/* Range and Mode controls */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Stacking mode */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setChartMode('stacked')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'stacked'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chồng cột (Stacked)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('grouped')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'grouped'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Song song (Grouped)
              </button>
            </div>

            {/* Time span selector */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === '30d'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === '7d'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Ngày
              </button>
            </div>
          </div>
        </div>

        {/* 30-Day Period Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 font-mono text-xs">
          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Tổng lượt chạy trong kỳ:</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {totalRunsInPeriod} lượt
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Thực thi Thành công:</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{totalSuccessInPeriod} lượt</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Thực thi Thất bại:</span>
            <span className="text-base font-bold text-rose-600 tabular-nums flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>{totalFailedInPeriod} lượt</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Tỉ lệ Thành công kỳ này:</span>
            <span className="text-base font-bold text-indigo-600 tabular-nums flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{periodSuccessRate}%</span>
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                formatter={(value) => {
                  return value === 'success' ? 'Thành công (Success)' : 'Thất bại (Failed)';
                }}
              />
              <Bar 
                dataKey="success" 
                name="success"
                fill="#10b981" 
                stackId={chartMode === 'stacked' ? 'a' : undefined} 
                radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                maxBarSize={timeRange === '30d' ? 18 : 36}
              />
              <Bar 
                dataKey="failed" 
                name="failed"
                fill="#f43f5e" 
                stackId={chartMode === 'stacked' ? 'a' : undefined} 
                radius={chartMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                maxBarSize={timeRange === '30d' ? 18 : 36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Grid: Pipelines list + Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Active Pipelines */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Chiến dịch Thu thập Đang cấu hình</h2>
              <p className="text-xs text-slate-500">Các nguồn dữ liệu web app và trang web đang kết nối</p>
            </div>
            <button
              onClick={() => onSelectTab('pipelines')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {pipelines.slice(0, 5).map((pipe) => {
              const isRunning = runningPipelineId === pipe.id;
              return (
                <div key={pipe.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        [{getPipelineTypeLabel(pipe.type)}]
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {pipe.name}
                      </h3>
                      {pipe.status === 'active' ? (
                        <span className="text-[11px] text-emerald-700 font-medium">· Hoạt động</span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">· Tạm dừng</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="truncate max-w-xs font-mono text-[11px] text-slate-400">{pipe.targetUrl}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums font-mono">Đã thu: {pipe.totalCollected} mục</span>
                      <span aria-hidden="true">·</span>
                      <span>Lịch: {pipe.schedule === 'cron' ? `Cron (${pipe.cronExpression || 'tùy chỉnh'})` : pipe.schedule === 'manual' ? 'Thủ công' : `Mỗi ${pipe.schedule}`}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {pipe.type !== 'webhook' ? (
                      <button
                        onClick={() => onRunPipeline(pipe.id)}
                        disabled={isRunning}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>{isRunning ? 'Đang chạy...' : 'Thu thập ngay'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Cổng nghe Push</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Execution Logs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Lịch sử Thực thi</h2>
              <p className="text-xs text-slate-500">Lượt chạy thu thập gần đây nhất</p>
            </div>
            <button
              onClick={() => onSelectTab('logs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Xem nhật ký</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Chưa có lượt chạy nào. Nhấn "Thu thập ngay" trên một pipeline để bắt đầu!
              </div>
            ) : (
              recentLogs.slice(0, 6).map((log) => {
                const isSuccess = log.status === 'success';
                return (
                  <div key={log.id} className="p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                        {log.pipelineName}
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          isSuccess ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isSuccess ? `+${log.itemsExtracted} bản ghi` : 'Thất bại'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-mono tabular-nums">
                        {log.durationMs}ms · {log.payloadSizeKb} KB
                      </span>
                      <span className="font-mono tabular-nums">
                        {new Date(log.completedAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    {log.errorMessage && (
                      <p className="text-[11px] text-rose-600 line-clamp-1">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
