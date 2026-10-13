import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Database, 
  SearchCode, 
  ScrollText, 
  Webhook, 
  Radio,
  Clock
} from 'lucide-react';
import { SystemStats } from '../types/datacenter.ts';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  stats: SystemStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  stats
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'pipelines',
      label: 'Pipelines Thu thập',
      icon: Layers,
      badge: stats ? `${stats.activePipelines}/${stats.totalPipelines}` : null
    },
    {
      id: 'data',
      label: 'Kho Dữ liệu',
      icon: Database,
      badge: stats ? `${stats.totalRecords}` : null
    },
    {
      id: 'inspector',
      label: 'URL Inspector',
      icon: SearchCode,
      badge: 'Live'
    },
    {
      id: 'logs',
      label: 'Nhật ký Thực thi',
      icon: ScrollText,
      badge: stats ? `${stats.totalLogs}` : null
    },
    {
      id: 'integrations',
      label: 'Webhook & Tích hợp',
      icon: Webhook,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3">
            Điều hướng dữ liệu
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Engine status indicator */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">Trạng thái Harvester</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sẵn sàng
            </span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Độ trễ trung bình:</span>
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {stats ? `${stats.avgLatencyMs}ms` : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tỉ lệ thành công:</span>
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {stats ? `${stats.successRate}%` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Lập lịch tự động: Bật</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Thu thập theo chu kỳ 1m, 5m, 15m, 1h, 24h
        </p>
      </div>
    </aside>
  );
};
