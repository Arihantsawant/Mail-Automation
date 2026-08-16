import React from 'react';
import { BookOpen, BarChart3, Database, Send, Repeat, Brain, History } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  spreadsheetConnected: boolean;
}

export default function Navigation({ activeTab, setActiveTab, spreadsheetConnected }: NavigationProps) {
  const tabs = [
    { id: 'classroom', label: 'T&P Classroom', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'crm', label: 'Placement CRM', icon: <Database className="w-4 h-4" /> },
    { id: 'outreach', label: 'Outreach Campaign', icon: <Send className="w-4 h-4" /> },
    { id: 'followup', label: 'Follow-Up Campaign', icon: <Repeat className="w-4 h-4" /> },
    { id: 'aidrafts', label: 'AI Reply Assistant', icon: <Brain className="w-4 h-4" /> },
    { id: 'commlog', label: 'Communication Log', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div id="navigation_tabs_bar" className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const needsSheet = ['dashboard', 'outreach', 'followup', 'aidrafts', 'commlog'].includes(tab.id);

        return (
          <button
            key={tab.id}
            id={`nav_tab_${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg text-xs font-semibold tracking-tight transition-all focus:outline-none border-b-2 font-sans relative ${
              isActive
                ? 'bg-white border-b-2 border-blue-600 text-blue-600 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-100 hover:bg-slate-50/50'
            }`}
          >
            {tab.icon}
            {tab.label}

            {/* Micro visual indicator for database-dependent tabs */}
            {needsSheet && !spreadsheetConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-2 right-2" title="Simulation data active" />
            )}
          </button>
        );
      })}
    </div>
  );
}
