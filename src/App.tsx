import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { PipelinesTab } from './components/PipelinesTab.tsx';
import { DataExplorerTab } from './components/DataExplorerTab.tsx';
import { InspectorTab } from './components/InspectorTab.tsx';
import { LogsTab } from './components/LogsTab.tsx';
import { IntegrationsTab } from './components/IntegrationsTab.tsx';
import { PipelineModal } from './components/PipelineModal.tsx';
import { RecordDetailModal } from './components/RecordDetailModal.tsx';
import { 
  fetchStats, 
  fetchPipelines, 
  fetchRecords, 
  fetchLogs, 
  runPipeline, 
  togglePipeline, 
  deletePipeline, 
  createPipeline, 
  updatePipeline,
  deleteRecord,
  clearRecords,
  clearLogs
} from './services/api.ts';
import { SystemStats, PipelineConfig, CollectorRecord, ExecutionLog } from './types/datacenter.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [records, setRecords] = useState<CollectorRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  
  // Data Explorer states
  const [selectedPipelineFilter, setSelectedPipelineFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recordsPage, setRecordsPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Loading & Action states
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [runningPipelineId, setRunningPipelineId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);
  const [pipelineToEdit, setPipelineToEdit] = useState<Partial<PipelineConfig> | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<CollectorRecord | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load all foundational data
  const loadInitialData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [s, p, r, l] = await Promise.all([
        fetchStats().catch(() => null),
        fetchPipelines().catch(() => []),
        fetchRecords({
          pipelineId: selectedPipelineFilter || undefined,
          q: searchQuery || undefined,
          page: recordsPage,
          limit: 20
        }).catch(() => ({ records: [], total: 0, page: 1, limit: 20, totalPages: 1 })),
        fetchLogs().catch(() => [])
      ]);

      if (s) setStats(s);
      setPipelines(p);
      setRecords(r.records);
      setTotalRecords(r.total);
      setTotalPages(r.totalPages);
      setLogs(l);
    } catch (err) {
      console.error('[DataCenter] Error loading data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPipelineFilter, searchQuery, recordsPage]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load records specifically when filter/page/search changes
  const loadRecordsOnly = async () => {
    try {
      const res = await fetchRecords({
        pipelineId: selectedPipelineFilter || undefined,
        q: searchQuery || undefined,
        page: recordsPage,
        limit: 20
      });
      setRecords(res.records);
      setTotalRecords(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    }
  };

  // Run pipeline trigger
  const handleRunPipeline = async (id: string) => {
    setRunningPipelineId(id);
    try {
      const res = await runPipeline(id);
      if (res.success) {
        showNotification(`Đã thu thập thành công +${res.count} bản ghi dữ liệu!`, 'success');
      } else {
        showNotification(`Lỗi thu thập: ${res.log.errorMessage || 'Không xác định'}`, 'error');
      }
      // Refresh system data
      await loadInitialData();
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi kích hoạt thu thập', 'error');
    } finally {
      setRunningPipelineId(null);
    }
  };

  // Toggle active/paused
  const handleTogglePipeline = async (id: string) => {
    try {
      const res = await togglePipeline(id);
      setPipelines(prev => prev.map(p => p.id === id ? { ...p, status: res.status as any } : p));
      showNotification(`Trạng thái pipeline đã chuyển sang: ${res.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}`);
      const s = await fetchStats().catch(() => null);
      if (s) setStats(s);
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi cập nhật', 'error');
    }
  };

  // Delete pipeline
  const handleDeletePipeline = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa pipeline này?')) return;
    try {
      await deletePipeline(id);
      setPipelines(prev => prev.filter(p => p.id !== id));
      showNotification('Đã xóa pipeline thành công');
      const s = await fetchStats().catch(() => null);
      if (s) setStats(s);
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi xóa', 'error');
    }
  };

  // Save Pipeline (Create or Edit)
  const handleSavePipeline = async (data: Partial<PipelineConfig>) => {
    if (data.id) {
      await updatePipeline(data.id, data);
      showNotification('Cập nhật pipeline thành công');
    } else {
      await createPipeline(data);
      showNotification('Tạo pipeline thu thập mới thành công');
    }
    await loadInitialData();
  };

  // Delete single record
  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setTotalRecords(prev => Math.max(0, prev - 1));
      showNotification('Đã xóa bản ghi');
      const s = await fetchStats().catch(() => null);
      if (s) setStats(s);
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi xóa bản ghi', 'error');
    }
  };

  // Clear records
  const handleClearRecords = async (pipelineId?: string) => {
    try {
      await clearRecords(pipelineId);
      await loadInitialData();
      showNotification('Đã làm trống kho bản ghi dữ liệu');
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi xóa', 'error');
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    try {
      await clearLogs();
      setLogs([]);
      showNotification('Đã xóa toàn bộ nhật ký');
      const s = await fetchStats().catch(() => null);
      if (s) setStats(s);
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi xóa nhật ký', 'error');
    }
  };

  // Webhook test sender
  const handleTriggerWebhookTest = async (webhookId: string, payload: any) => {
    const res = await fetch(`/api/webhook/${webhookId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Không thể gửi webhook');
    showNotification('Webhook payload đã được gửi thành công!', 'success');
    await loadInitialData();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNewPipeline={() => {
          setPipelineToEdit(null);
          setIsPipelineModalOpen(true);
        }}
        onRefreshAll={loadInitialData}
        isRefreshing={isRefreshing}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          stats={stats}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* Notification Toast */}
          {notification && (
            <div
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                notification.type === 'success'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-rose-900 text-white border-rose-800'
              }`}
            >
              <span>{notification.message}</span>
            </div>
          )}

          {currentTab === 'overview' && (
            <OverviewTab
              stats={stats}
              pipelines={pipelines}
              recentLogs={logs}
              onRunPipeline={handleRunPipeline}
              onSelectTab={setCurrentTab}
              runningPipelineId={runningPipelineId}
              onOpenNewPipeline={() => {
                setPipelineToEdit(null);
                setIsPipelineModalOpen(true);
              }}
            />
          )}

          {currentTab === 'pipelines' && (
            <PipelinesTab
              pipelines={pipelines}
              onRunPipeline={handleRunPipeline}
              onToggleStatus={handleTogglePipeline}
              onDeletePipeline={handleDeletePipeline}
              onEditPipeline={(pipe) => {
                setPipelineToEdit(pipe);
                setIsPipelineModalOpen(true);
              }}
              onOpenNewPipeline={() => {
                setPipelineToEdit(null);
                setIsPipelineModalOpen(true);
              }}
              onViewRecordsForPipeline={(id) => {
                setSelectedPipelineFilter(id);
                setCurrentTab('data');
              }}
              runningPipelineId={runningPipelineId}
            />
          )}

          {currentTab === 'data' && (
            <DataExplorerTab
              records={records}
              totalRecords={totalRecords}
              pipelines={pipelines}
              selectedPipelineId={selectedPipelineFilter}
              onFilterPipeline={(id) => {
                setSelectedPipelineFilter(id);
                setRecordsPage(1);
              }}
              onSearch={(q) => {
                setSearchQuery(q);
                setRecordsPage(1);
              }}
              onDeleteRecord={handleDeleteRecord}
              onClearRecords={handleClearRecords}
              onViewRecordDetail={(rec) => setSelectedRecordForDetail(rec)}
              onRefreshRecords={loadRecordsOnly}
              isLoading={isRefreshing}
              page={recordsPage}
              totalPages={totalPages}
              onPageChange={(p) => setRecordsPage(p)}
            />
          )}

          {currentTab === 'inspector' && (
            <InspectorTab
              onSaveAsPipeline={(preset) => {
                setPipelineToEdit(preset);
                setIsPipelineModalOpen(true);
              }}
            />
          )}

          {currentTab === 'logs' && (
            <LogsTab
              logs={logs}
              pipelines={pipelines}
              onClearLogs={handleClearLogs}
              onRefreshLogs={loadInitialData}
              isLoading={isRefreshing}
            />
          )}

          {currentTab === 'integrations' && (
            <IntegrationsTab
              pipelines={pipelines}
              onTriggerWebhookTest={handleTriggerWebhookTest}
            />
          )}
        </main>
      </div>

      {/* Modal: Create/Edit Pipeline */}
      <PipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => {
          setIsPipelineModalOpen(false);
          setPipelineToEdit(null);
        }}
        onSave={handleSavePipeline}
        initialData={pipelineToEdit}
      />

      {/* Modal: Record Detail */}
      <RecordDetailModal
        record={selectedRecordForDetail}
        onClose={() => setSelectedRecordForDetail(null)}
      />
    </div>
  );
}
