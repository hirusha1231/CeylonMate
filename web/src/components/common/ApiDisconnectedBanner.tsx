import React from 'react';
import { AlertTriangle, Server } from 'lucide-react';

interface ApiDisconnectedBannerProps {
  apiBaseUrl?: string;
}

export const ApiDisconnectedBanner: React.FC<ApiDisconnectedBannerProps> = ({
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
}) => {
  return (
    <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-bold text-[#C5A880]">Backend API Offline Mode:</span>{' '}
          <span>
            Target service at <code className="font-mono text-amber-300">{apiBaseUrl}</code> is disconnected. Operating in resilient offline evaluation mode.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400 shrink-0">
        <Server className="w-3.5 h-3.5 text-amber-400" />
        <span>Ensure ASP.NET Core service is running</span>
      </div>
    </div>
  );
};
