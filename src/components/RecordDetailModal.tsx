import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Calendar, Database, ShieldCheck } from 'lucide-react';
import { CollectorRecord } from '../types/datacenter.ts';

interface RecordDetailModalProps {
  record: CollectorRecord | null;
  onClose: () => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Chi Tiết Bản Ghi Dữ Liệu</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{record.pipelineName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] uppercase">{record.pipelineType}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Metadata Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 font-sans uppercase text-[10px] block">Mã Bản Ghi (ID)</span>
              <span className="text-slate-800 select-all">{record.id}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans uppercase text-[10px] block">Thời Điểm Thu Thập</span>
              <span className="text-slate-800">{new Date(record.collectedAt).toLocaleString('vi-VN')}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans uppercase text-[10px] block">Tích Hợp Ngoài</span>
              {record.synced ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{record.syncDestination || 'Đã đồng bộ'}</span>
                </span>
              ) : (
                <span className="text-slate-400 font-sans font-medium">Chưa đồng bộ</span>
              )}
            </div>
          </div>

          {/* Formatted Key-Value Fields */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase mb-2">
              Các Trường Thu Thập Được:
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {Object.entries(record.data).map(([key, value]) => {
                const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                return (
                  <div key={key} className="p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-slate-50/50">
                    <span className="font-mono text-slate-500 font-medium sm:w-1/3 truncate" title={key}>
                      {key}
                    </span>
                    <div className="sm:w-2/3 text-slate-900 break-words">
                      {isUrl ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span className="truncate max-w-sm">{value}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : typeof value === 'object' && value !== null ? (
                        <pre className="text-[11px] font-mono bg-slate-100 p-2 rounded max-h-36 overflow-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw JSON viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase">
                Mã Nguồn JSON Toàn Phần:
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép JSON'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
