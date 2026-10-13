import { PipelineConfig, CollectorRecord, ExecutionLog, SystemStats, InspectRequest, InspectResponse } from '../types/datacenter.ts';

export async function fetchStats(): Promise<SystemStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Không thể tải thống kê hệ thống');
  return res.json();
}

export async function fetchPipelines(): Promise<PipelineConfig[]> {
  const res = await fetch('/api/pipelines');
  if (!res.ok) throw new Error('Không thể tải danh sách pipeline');
  return res.json();
}

export async function createPipeline(data: Partial<PipelineConfig>): Promise<PipelineConfig> {
  const res = await fetch('/api/pipelines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Lỗi khi tạo pipeline');
  }
  return res.json();
}

export async function updatePipeline(id: string, data: Partial<PipelineConfig>): Promise<PipelineConfig> {
  const res = await fetch(`/api/pipelines/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Lỗi khi cập nhật pipeline');
  }
  return res.json();
}

export async function deletePipeline(id: string): Promise<void> {
  const res = await fetch(`/api/pipelines/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Lỗi khi xóa pipeline');
}

export async function runPipeline(id: string): Promise<{ success: boolean; count: number; log: ExecutionLog }> {
  const res = await fetch(`/api/pipelines/${id}/run`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Lỗi khi thực thi pipeline');
  }
  return res.json();
}

export async function togglePipeline(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/pipelines/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Lỗi khi thay đổi trạng thái');
  return res.json();
}

export interface RecordsResult {
  records: CollectorRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchRecords(params?: { 
  pipelineId?: string; 
  q?: string; 
  syncStatus?: 'all' | 'synced' | 'not_synced';
  page?: number; 
  limit?: number 
}): Promise<RecordsResult> {
  const url = new URL('/api/records', window.location.origin);
  if (params?.pipelineId) url.searchParams.set('pipelineId', params.pipelineId);
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.syncStatus && params.syncStatus !== 'all') url.searchParams.set('syncStatus', params.syncStatus);
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.limit) url.searchParams.set('limit', String(params.limit));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Không thể tải bản ghi dữ liệu');
  return res.json();
}

export async function syncRecord(id: string, destination?: string): Promise<{ success: boolean; record: CollectorRecord }> {
  const res = await fetch(`/api/records/${id}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination })
  });
  if (!res.ok) throw new Error('Không thể đồng bộ bản ghi');
  return res.json();
}

export async function bulkSyncRecords(pipelineId?: string, destination?: string): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/records/bulk-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipelineId, destination })
  });
  if (!res.ok) throw new Error('Không thể đồng bộ hàng loạt');
  return res.json();
}

export async function deleteRecord(id: string): Promise<void> {
  const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Lỗi khi xóa bản ghi');
}

export async function clearRecords(pipelineId?: string): Promise<void> {
  const url = pipelineId ? `/api/records?pipelineId=${pipelineId}` : '/api/records';
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error('Lỗi khi xóa sạch bản ghi');
}

export async function fetchLogs(pipelineId?: string): Promise<ExecutionLog[]> {
  const url = pipelineId ? `/api/logs?pipelineId=${pipelineId}` : '/api/logs';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể tải nhật ký');
  return res.json();
}

export async function clearLogs(): Promise<void> {
  const res = await fetch('/api/logs', { method: 'DELETE' });
  if (!res.ok) throw new Error('Lỗi khi xóa nhật ký');
}

export async function inspectUrl(payload: InspectRequest): Promise<InspectResponse> {
  const res = await fetch('/api/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể kiểm tra URL');
  }
  return data;
}

export async function smartAiExtract(rawText: string, targetSchemaPrompt?: string): Promise<{ success: boolean; data: any }> {
  const res = await fetch('/api/smart-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, targetSchemaPrompt })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi trích xuất AI');
  }
  return data;
}
