import React, { useState } from 'react';
import { 
  SearchCode, 
  Play, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  Globe, 
  Radio, 
  Rss,
  Code
} from 'lucide-react';
import { InspectRequest, InspectResponse, ExtractionField, PipelineConfig } from '../types/datacenter.ts';
import { inspectUrl } from '../services/api.ts';

interface InspectorTabProps {
  onSaveAsPipeline: (preset: Partial<PipelineConfig>) => void;
}

export const InspectorTab: React.FC<InspectorTabProps> = ({ onSaveAsPipeline }) => {
  const [url, setUrl] = useState('https://news.ycombinator.com');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [extractType, setExtractType] = useState<'html' | 'json' | 'feed'>('html');
  const [containerSelector, setContainerSelector] = useState('tr.athing');
  const [dataPath, setDataPath] = useState('');
  const [fields, setFields] = useState<ExtractionField[]>([
    { id: '1', name: 'title', selector: 'span.titleline a', attribute: 'text', type: 'string' },
    { id: '2', name: 'url', selector: 'span.titleline a', attribute: 'href', type: 'string' }
  ]);
  const [useAi, setUseAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Trích xuất danh sách tiêu đề, liên kết và điểm số');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InspectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'extracted' | 'meta' | 'raw'>('extracted');
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Quick preset loader
  const loadPreset = (presetType: 'hn' | 'vnexpress' | 'crypto' | 'feed') => {
    if (presetType === 'hn') {
      setUrl('https://news.ycombinator.com');
      setExtractType('html');
      setContainerSelector('tr.athing');
      setFields([
        { id: '1', name: 'title', selector: 'span.titleline a', attribute: 'text', type: 'string' },
        { id: '2', name: 'link', selector: 'span.titleline a', attribute: 'href', type: 'string' }
      ]);
    } else if (presetType === 'vnexpress') {
      setUrl('https://vnexpress.net/cong-nghe');
      setExtractType('html');
      setContainerSelector('article.item-news');
      setFields([
        { id: '1', name: 'title', selector: 'h3.title-news a', attribute: 'text', type: 'string' },
        { id: '2', name: 'url', selector: 'h3.title-news a', attribute: 'href', type: 'string' },
        { id: '3', name: 'summary', selector: 'p.description a', attribute: 'text', type: 'string' }
      ]);
    } else if (presetType === 'crypto') {
      setUrl('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
      setExtractType('json');
      setDataPath('');
      setContainerSelector('');
      setFields([]);
    } else if (presetType === 'feed') {
      setUrl('https://feeds.bbci.co.uk/news/technology/rss.xml');
      setExtractType('feed');
      setContainerSelector('');
      setFields([]);
    }
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        id: String(Date.now()),
        name: `field_${fields.length + 1}`,
        selector: '',
        attribute: 'text',
        type: 'string'
      }
    ]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof ExtractionField, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleRunInspect = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: InspectRequest = {
        url,
        method,
        extractType,
        containerSelector: extractType === 'html' ? containerSelector : undefined,
        fields: extractType === 'html' ? fields : undefined,
        dataPath: extractType === 'json' ? dataPath : undefined,
        useAiExtraction: useAi,
        aiPrompt: useAi ? aiPrompt : undefined
      };

      const res = await inspectUrl(payload);
      setResult(res);
      if (res.extractedItems && res.extractedItems.length > 0) {
        setActiveTab('extracted');
      } else if (res.pageMeta) {
        setActiveTab('meta');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể kiểm tra URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToPipeline = () => {
    const pipelineType = extractType === 'html' ? 'web_scraper' : extractType === 'json' ? 'rest_api' : 'rss_feed';
    onSaveAsPipeline({
      name: result?.pageMeta?.title || `Pipeline ${new URL(url).hostname}`,
      description: result?.pageMeta?.description || `Thu thập từ ${url}`,
      type: pipelineType,
      targetUrl: url,
      method,
      containerSelector: extractType === 'html' ? containerSelector : undefined,
      dataPath: extractType === 'json' ? dataPath : undefined,
      fields: extractType === 'html' ? fields : []
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">URL Inspector & Trình Thử nghiệm Thu thập</h2>
          <p className="text-xs text-slate-500 mt-1">
            Nhập bất kỳ URL của Web App hoặc API nào để kiểm tra bóc tách dữ liệu DOM HTML, phân tích JSON, hoặc dùng AI Schema Extractor trước khi lưu thành pipeline.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-semibold uppercase mr-1">Mẫu nhanh:</span>
          <button
            onClick={() => loadPreset('hn')}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            HackerNews (HTML)
          </button>
          <button
            onClick={() => loadPreset('vnexpress')}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            VnExpress (Tin tức)
          </button>
          <button
            onClick={() => loadPreset('crypto')}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            CoinGecko (JSON API)
          </button>
          <button
            onClick={() => loadPreset('feed')}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            BBC Tech (RSS)
          </button>
        </div>
      </div>

      {/* Configuration Form Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        {/* URL + Method + Type */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Phương thức
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          <div className="md:col-span-7">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              URL Ứng dụng Web Mục tiêu
            </label>
            <input
              type="url"
              placeholder="https://example.com/api/data hoặc https://web-app.com/items"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Định dạng Dữ liệu
            </label>
            <select
              value={extractType}
              onChange={(e) => setExtractType(e.target.value as any)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="html">HTML Web Scraping</option>
              <option value="json">REST JSON API</option>
              <option value="feed">RSS / Atom Feed</option>
            </select>
          </div>
        </div>

        {/* HTML Scraper specific options */}
        {extractType === 'html' && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Container Selector (CSS Selector của từng phần tử item lặp lại)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: article.news-item, tr.row, div.product-card"
                  value={containerSelector}
                  onChange={(e) => setContainerSelector(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleAddField}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm trường bóc tách</span>
                </button>
              </div>
            </div>

            {/* Fields list */}
            {fields.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Quy tắc trích xuất các trường:
                </span>
                <div className="space-y-2">
                  {fields.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <input
                        type="text"
                        placeholder="Tên trường (vd: title)"
                        value={f.name}
                        onChange={(e) => handleFieldChange(f.id, 'name', e.target.value)}
                        className="w-28 font-mono text-xs px-2 py-1 border border-slate-200 rounded"
                      />
                      <input
                        type="text"
                        placeholder="CSS Selector (vd: h2.title a)"
                        value={f.selector || ''}
                        onChange={(e) => handleFieldChange(f.id, 'selector', e.target.value)}
                        className="flex-1 font-mono text-xs px-2 py-1 border border-slate-200 rounded"
                      />
                      <select
                        value={f.attribute || 'text'}
                        onChange={(e) => handleFieldChange(f.id, 'attribute', e.target.value)}
                        className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700"
                      >
                        <option value="text">Nội dung text</option>
                        <option value="href">Thuộc tính href</option>
                        <option value="src">Thuộc tính src</option>
                        <option value="data-id">Thuộc tính data-id</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(f.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* JSON specific options */}
        {extractType === 'json' && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Data Path (Đường dẫn JSON gốc tới danh sách đối tượng, để trống nếu root là mảng)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: data.items hoặc records hoặc articles"
              value={dataPath}
              onChange={(e) => setDataPath(e.target.value)}
              className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
            />
          </div>
        )}

        {/* Optional AI Schema Extraction Toggle */}
        <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-indigo-950">AI Trích xuất Dữ liệu Thông minh</span>
              <p className="text-[11px] text-indigo-700">Tự động cấu trúc hóa nội dung HTML phức tạp thành các bản ghi JSON</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="aiToggle"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label htmlFor="aiToggle" className="text-xs font-medium text-indigo-900 cursor-pointer">
              Bật AI Gemini
            </label>
          </div>
        </div>

        {useAi && (
          <div className="p-3 bg-white rounded-lg border border-indigo-200">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Yêu cầu trích xuất cho AI (Prompt schema):
            </label>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ví dụ: Trích xuất danh sách các khóa học gồm: tên, giá, giảng viên, số sao"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
            />
          </div>
        )}

        {/* Submit Run Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Yêu cầu được thực thi qua máy chủ DataCenter proxy chống chặn CORS
          </span>
          <button
            onClick={handleRunInspect}
            disabled={isLoading || !url.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Đang kiểm tra & bóc tách...' : 'Chạy Thử Nghiệm Ngay'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Viewport */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4 p-5">
          {/* Status bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3 text-xs">
              <span className={`font-mono font-bold ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                HTTP {result.httpStatus}
              </span>
              <span aria-hidden="true" className="text-slate-200">·</span>
              <span className="font-mono text-slate-600 tabular-nums">{result.durationMs}ms</span>
              <span aria-hidden="true" className="text-slate-200">·</span>
              <span className="font-mono text-slate-600 tabular-nums">{result.payloadSizeKb} KB</span>
              <span aria-hidden="true" className="text-slate-200">·</span>
              <span className="text-slate-500 font-mono text-[11px] truncate max-w-xs">{result.contentType}</span>
            </div>

            <button
              onClick={handleSaveToPipeline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs self-end sm:self-center"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lưu thành Pipeline Thu thập</span>
            </button>
          </div>

          {/* Sub-tabs for Result: Extracted Items / Metadata / Raw Response */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('extracted')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'extracted'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dữ liệu Trích xuất ({result.extractedItems?.length || 0} mục)
            </button>

            {result.pageMeta && (
              <button
                onClick={() => setActiveTab('meta')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'meta'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Metadata Trang Web
              </button>
            )}

            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'raw'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mã nguồn Phản hồi Thô
            </button>
          </div>

          {/* Tab 1: Extracted items */}
          {activeTab === 'extracted' && (
            <div>
              {result.extractedItems && result.extractedItems.length > 0 ? (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-slate-400 font-mono">#</th>
                          {Object.keys(result.extractedItems[0] || {}).map(k => (
                            <th key={k} className="py-2.5 px-3 font-mono capitalize">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {result.extractedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            {Object.entries(item).map(([k, val]: any) => {
                              const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
                              return (
                                <td key={k} className="py-2 px-3 text-slate-700 max-w-xs truncate" title={display}>
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* JSON preview snippet */}
                  <div className="p-3 bg-slate-900 rounded-lg text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(result.extractedItems.slice(0, 3), null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Không trích xuất được mục nào theo selector này. Hãy thử kiểm tra lại Container Selector hoặc dùng mẫu nhanh!
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Page Metadata */}
          {activeTab === 'meta' && result.pageMeta && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500 uppercase text-[10px]">Tiêu đề trang (HTML Title)</span>
                <p className="font-semibold text-slate-900">{result.pageMeta.title || 'Không có'}</p>
                <span className="font-semibold text-slate-500 uppercase text-[10px] block pt-2">Mô tả Meta Description</span>
                <p className="text-slate-600">{result.pageMeta.description || 'Không có mô tả'}</p>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
                <span className="font-semibold text-slate-500 uppercase text-[10px] font-sans">Thông số Cấu trúc</span>
                <div className="flex justify-between">
                  <span>Thẻ H1:</span>
                  <span className="font-bold text-slate-800">{result.pageMeta.headingsCount?.h1}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thẻ H2:</span>
                  <span className="font-bold text-slate-800">{result.pageMeta.headingsCount?.h2}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thẻ H3:</span>
                  <span className="font-bold text-slate-800">{result.pageMeta.headingsCount?.h3}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngôn ngữ:</span>
                  <span className="text-slate-800">{result.pageMeta.language || 'en'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Raw response */}
          {activeTab === 'raw' && (
            <div className="relative">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.previewRaw);
                  setCopiedRaw(true);
                  setTimeout(() => setCopiedRaw(false), 2000);
                }}
                className="absolute top-2 right-2 px-2 py-1 bg-slate-800 text-slate-200 rounded text-[11px] font-mono flex items-center gap-1 hover:bg-slate-700"
              >
                {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRaw ? 'Đã chép' : 'Sao chép'}</span>
              </button>
              <div className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto max-h-72">
                <pre>{result.previewRaw}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
