import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Globe, 
  Radio, 
  Rss, 
  Webhook, 
  HelpCircle,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PipelineConfig, PipelineType, ScheduleInterval, ExtractionField } from '../types/datacenter.ts';
import { CRON_PRESETS, validateCronExpression, explainCronExpression } from '../utils/cronHelper.ts';

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pipeline: Partial<PipelineConfig>) => Promise<void>;
  initialData?: Partial<PipelineConfig> | null;
}

export const PipelineModal: React.FC<PipelineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PipelineType>('rest_api');
  const [targetUrl, setTargetUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT'>('GET');
  const [schedule, setSchedule] = useState<ScheduleInterval>('15m');
  const [cronExpression, setCronExpression] = useState('*/15 * * * *');
  const [containerSelector, setContainerSelector] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [fields, setFields] = useState<ExtractionField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setType(initialData.type || 'rest_api');
      setTargetUrl(initialData.targetUrl || '');
      setMethod(initialData.method || 'GET');
      setSchedule(initialData.schedule || '15m');
      setCronExpression(initialData.cronExpression || '*/15 * * * *');
      setContainerSelector(initialData.containerSelector || '');
      setDataPath(initialData.dataPath || '');
      setFields(initialData.fields || []);
    } else {
      setName('');
      setDescription('');
      setType('rest_api');
      setTargetUrl('');
      setMethod('GET');
      setSchedule('15m');
      setCronExpression('*/15 * * * *');
      setContainerSelector('');
      setDataPath('');
      setFields([
        { id: '1', name: 'title', selector: 'h2 a', attribute: 'text', type: 'string' },
        { id: '2', name: 'link', selector: 'h2 a', attribute: 'href', type: 'string' }
      ]);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const cronValidation = schedule === 'cron' ? validateCronExpression(cronExpression) : { valid: true };
  const cronDescription = schedule === 'cron' ? explainCronExpression(cronExpression) : '';

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        id: String(Date.now()),
        name: `field_${fields.length + 1}`,
        selector: '',
        attribute: 'text',
        jsonPath: '',
        type: 'string'
      }
    ]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof ExtractionField, val: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetUrl.trim()) {
      setError('Vui lòng nhập tên và URL của pipeline');
      return;
    }

    if (schedule === 'cron') {
      const check = validateCronExpression(cronExpression);
      if (!check.valid) {
        setError(check.error || 'Biểu thức Cron không hợp lệ');
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData?.id,
        name,
        description,
        type,
        targetUrl,
        method,
        schedule,
        cronExpression: schedule === 'cron' ? cronExpression.trim() : undefined,
        containerSelector: type === 'web_scraper' ? containerSelector : undefined,
        dataPath: type === 'rest_api' ? dataPath : undefined,
        fields
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi lưu pipeline');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {initialData?.id ? 'Chỉnh Sửa Pipeline Thu Thập' : 'Tạo Pipeline Thu Thập Dữ Liệu Mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Tên Pipeline
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Cào giá sản phẩm sàn Thương mại"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Loại Bộ Thu Thập
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PipelineType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
              >
                <option value="rest_api">REST API</option>
                <option value="web_scraper">Web Scraper</option>
                <option value="rss_feed">RSS Feed</option>
                <option value="webhook">Webhook Receiver</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Mô tả Chiến dịch
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục đích thu thập, loại web app nguồn..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white"
            />
          </div>

          {/* URL + Method + Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Target URL (Địa chỉ Web App / Endpoint)
              </label>
              <input
                type="text"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://target-app.com/api hoặc https://news.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono focus:outline-none focus:bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Chế Độ Lập Lịch
              </label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as ScheduleInterval)}
                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
              >
                <option value="manual">Thủ công (Chạy khi bấm)</option>
                <option value="1m">Mỗi 1 phút</option>
                <option value="5m">Mỗi 5 phút</option>
                <option value="15m">Mỗi 15 phút</option>
                <option value="1h">Mỗi 1 giờ</option>
                <option value="6h">Mỗi 6 giờ</option>
                <option value="24h">Mỗi ngày (24h)</option>
                <option value="cron">Lịch Cron tùy chỉnh (Cron Expression)</option>
              </select>
            </div>
          </div>

          {/* Dedicated Cron Expression Section when schedule === 'cron' */}
          {schedule === 'cron' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Cấu hình Lịch trình Cron (Cron Expression)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Chuẩn 5 trường (UNIX Cron)</span>
              </div>

              {/* Cron Expression Input */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="*/15 * * * *"
                  className={`w-full px-3 py-2 border rounded-lg font-mono text-sm tracking-wider font-semibold bg-white focus:outline-none focus:ring-1 ${
                    cronValidation.valid
                      ? 'border-slate-300 focus:ring-indigo-600 text-slate-900'
                      : 'border-rose-400 focus:ring-rose-500 text-rose-700'
                  }`}
                />

                {/* 5-Field Breakdown Guide */}
                <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-mono text-slate-400 pt-1">
                  <div className="p-1 bg-white rounded border border-slate-200/80">
                    <span className="block text-slate-700 font-bold">Phút</span>
                    <span>0-59</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-slate-200/80">
                    <span className="block text-slate-700 font-bold">Giờ</span>
                    <span>0-23</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-slate-200/80">
                    <span className="block text-slate-700 font-bold">Ngày</span>
                    <span>1-31</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-slate-200/80">
                    <span className="block text-slate-700 font-bold">Tháng</span>
                    <span>1-12</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-slate-200/80">
                    <span className="block text-slate-700 font-bold">Thứ</span>
                    <span>0-6 (0=CN)</span>
                  </div>
                </div>
              </div>

              {/* Live Cron Explanation & Validation Banner */}
              <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs ${
                cronValidation.valid 
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {cronValidation.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div className="flex-1">
                  {cronValidation.valid ? (
                    <div>
                      <span className="font-semibold">Ý nghĩa lịch trình: </span>
                      <span>{cronDescription}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold">Lỗi cú pháp: </span>
                      <span>{cronValidation.error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Presets Selection */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
                  Mẫu Cron thông dụng (nhấp để chọn nhanh):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CRON_PRESETS.map((preset) => {
                    const isSelected = cronExpression.trim() === preset.expression;
                    return (
                      <button
                        key={preset.expression}
                        type="button"
                        onClick={() => setCronExpression(preset.expression)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                        title={preset.description}
                      >
                        <span>{preset.label}</span>
                        <span className="font-mono text-[10px] ml-1.5 opacity-70">({preset.expression})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Scraper details */}
          {type === 'web_scraper' && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Container Selector (CSS lặp lại từng bài/sản phẩm)
                </label>
                <input
                  type="text"
                  value={containerSelector}
                  onChange={(e) => setContainerSelector(e.target.value)}
                  placeholder="Ví dụ: article.item-news, div.product-box, tr"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">Các trường bóc tách (Field Mappings):</span>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm trường</span>
                </button>
              </div>

              <div className="space-y-2">
                {fields.map(f => (
                  <div key={f.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Tên trường"
                      value={f.name}
                      onChange={(e) => handleFieldChange(f.id, 'name', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-200 rounded font-mono"
                    />
                    <input
                      type="text"
                      placeholder="CSS selector"
                      value={f.selector || ''}
                      onChange={(e) => handleFieldChange(f.id, 'selector', e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded font-mono"
                    />
                    <select
                      value={f.attribute || 'text'}
                      onChange={(e) => handleFieldChange(f.id, 'attribute', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded bg-white"
                    >
                      <option value="text">text</option>
                      <option value="href">href</option>
                      <option value="src">src</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API details */}
          {type === 'rest_api' && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                Data Path (Đường dẫn mảng danh sách JSON)
              </label>
              <input
                type="text"
                value={dataPath}
                onChange={(e) => setDataPath(e.target.value)}
                placeholder="Ví dụ: items hoặc data.articles (Để trống nếu root là danh sách)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono bg-white"
              />
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || (schedule === 'cron' && !cronValidation.valid)}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : initialData?.id ? 'Lưu Thay Đổi' : 'Tạo Pipeline Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
