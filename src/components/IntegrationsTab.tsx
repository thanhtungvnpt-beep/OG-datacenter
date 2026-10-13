import React, { useState } from 'react';
import { 
  Webhook, 
  Copy, 
  Check, 
  Send, 
  Terminal, 
  ExternalLink, 
  Code2, 
  CheckCircle2, 
  Database 
} from 'lucide-react';
import { PipelineConfig } from '../types/datacenter.ts';

interface IntegrationsTabProps {
  pipelines: PipelineConfig[];
  onTriggerWebhookTest: (webhookId: string, payload: any) => Promise<void>;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  pipelines,
  onTriggerWebhookTest
}) => {
  const webhookPipelines = pipelines.filter(p => p.type === 'webhook');
  const defaultWebhook = webhookPipelines[0] || null;

  const [selectedWebhookId, setSelectedWebhookId] = useState(defaultWebhook ? defaultWebhook.id : '');
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        event: 'user.signup',
        sourceApp: 'Shopify-Store-VN',
        data: {
          customerName: 'Nguyễn Văn A',
          email: 'customer@example.com',
          orderTotal: 1250000,
          currency: 'VND',
          timestamp: new Date().toISOString()
        }
      },
      null,
      2
    )
  );

  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const webhookUrl = `${window.location.origin}/api/webhook/${selectedWebhookId || 'pipe-webhook-inbound'}`;

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${testPayload.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;

  const handleSendTest = async () => {
    setIsSending(true);
    setSendSuccess(false);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(testPayload);
      } catch {
        parsed = { raw: testPayload };
      }
      await onTriggerWebhookTest(selectedWebhookId || 'pipe-webhook-inbound', parsed);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Cổng Tiếp Nhận Webhook & Tích hợp Luồng Dữ liệu</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Cho phép các ứng dụng web bên ngoài (Shopify, Stripe, GitHub, CRM, form khảo sát, hoặc microservices) tự động gửi dữ liệu trực tiếp vào DataCenter qua phương thức HTTP POST.
        </p>
      </div>

      {/* Grid: Webhook Endpoint Config + Interactive Payload Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Endpoint Information & Integration Guide */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-600" />
              <span>Cấu hình Endpoint Tiếp Nhận</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              URL lắng nghe dành cho các web app khác
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Chọn Pipeline Webhook
            </label>
            <select
              value={selectedWebhookId}
              onChange={(e) => setSelectedWebhookId(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              {webhookPipelines.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              URL Tiếp nhận Trực tiếp (Webhook URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 shrink-0"
                title="Sao chép Webhook URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Code snippet */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase mb-1">
              <span>Lệnh gửi mẫu (cURL CLI)</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(curlCommand);
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-sans lowercase flex items-center gap-1"
              >
                {copiedCurl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl ? 'Đã sao chép' : 'Sao chép lệnh'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto">
              <pre>{curlCommand}</pre>
            </div>
          </div>
        </div>

        {/* Right: Interactive Payload Tester */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <span>Mô phỏng Gửi Dữ liệu từ Ứng dụng khác</span>
            </h3>
            <p className="text-xs text-slate-500">
              Nhập JSON payload mô phỏng sự kiện từ web app bên ngoài và gửi để kiểm tra luồng ghi nhận vào kho DataCenter.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Nội dung Payload (JSON)
              </label>
              <textarea
                rows={9}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {sendSuccess ? (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã nạp thành công vào Kho Dữ liệu!</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Sẽ tạo bản ghi mới trong Kho Dữ liệu
              </span>
            )}

            <button
              onClick={handleSendTest}
              disabled={isSending}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              <span>{isSending ? 'Đang gửi...' : 'Gửi Thử Nghiệm Ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
