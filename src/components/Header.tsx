import React from 'react';
import { Database, Plus, RefreshCw } from 'lucide-react';
import adminAvatar from '../assets/images/admin_avatar_1791854601669.jpg';

interface HeaderProps {
  currentTab: string;
  onNewPipeline: () => void;
  onRefreshAll: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNewPipeline,
  onRefreshAll,
  isRefreshing
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Tổng quan Hệ thống';
      case 'pipelines': return 'Quản lý Pipelines Thu thập';
      case 'data': return 'Kho Dữ liệu Thu thập';
      case 'inspector': return 'URL Inspector & Trình thử nghiệm';
      case 'logs': return 'Nhật ký Thực thi';
      case 'integrations': return 'Cổng Webhook & Tích hợp';
      default: return 'Bảng điều khiển';
    }
  };

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-8 sticky top-0 z-20">
      {/* Zone 1: Brand wordmark & breadcrumb trail */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Database className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-slate-900 tracking-tight text-base">DataCenter</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-medium">{getTabTitle(currentTab)}</span>
        </div>
      </div>

      {/* Zone 2: Navigation anchor links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <span className="text-xs text-slate-400">Web App Data Collection Hub</span>
        <span className="text-slate-200" aria-hidden="true">·</span>
        <span className="text-xs text-slate-500 font-mono tabular-nums">Auto-Harvester Engine v2.4</span>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          title="Làm mới dữ liệu từ server"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        <button
          onClick={onNewPipeline}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Pipeline Mới</span>
        </button>

        {/* User profile avatar with fallback */}
        <div className="relative pl-2 border-l border-slate-200">
          <img
            src={adminAvatar}
            alt="Data Center Administrator"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
            onError={(e) => {
              // Graceful SVG fallback
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    </header>
  );
};
