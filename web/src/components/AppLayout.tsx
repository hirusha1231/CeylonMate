import React from 'react';
import { Outlet } from 'react-router';
import { Navbar } from './layout/Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0B131F] text-slate-100 flex flex-col font-sans selection:bg-[#C5A880] selection:text-[#0B131F]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
