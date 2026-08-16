import React from 'react';
import { CommLog } from '../types';
import { History, Search, RefreshCw, FileText, CheckCircle, Info } from 'lucide-react';

interface CommLogViewProps {
  logs: CommLog[];
  loading: boolean;
  onSync: () => Promise<void>;
  spreadsheetId: string;
}

export default function CommLogView({ logs, loading, onSync, spreadsheetId }: CommLogViewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const displayLogs = logs;

  const filteredLogs = displayLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.company.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.email.toLowerCase().includes(term)
    );
  });

  return (
    <div id="commlog_view_container" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col max-h-[80vh] overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
        <div>
          <h2 id="commlog_title" className="text-base font-bold text-slate-900 font-sans flex items-center gap-2 uppercase tracking-tight">
            <History className="w-5 h-5 text-slate-500" />
            Outreach Communication Log
          </h2>
          <span className="text-xs text-slate-400 block font-sans mt-0.5">
            Audit history of invitations, auto follow-ups, reply captures, and AI analysis.
          </span>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none w-48 md:w-64 font-sans"
            />
          </div>

          {spreadsheetId && (
            <button
              onClick={onSync}
              disabled={loading}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 disabled:opacity-50 transition-colors"
              title="Synchronize logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Sheet disconnected alert */}
      {logs.length === 0 && (
        <div className="mb-6 p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed font-sans">
            <strong>Mentor Note:</strong> Displaying pre-loaded simulation log files. Once your campaign executes, real-time action reports will write directly to your <strong>"Communication Log"</strong> spreadsheet sheet and render here.
          </p>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-slate-150">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-wider border-b border-slate-150">
              <th className="p-3 pl-4 font-sans">Timestamp</th>
              <th className="p-3 font-sans">Company</th>
              <th className="p-3 font-sans">Target Email</th>
              <th className="p-3 font-sans">Operation</th>
              <th className="p-3 pr-4 font-sans">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-sans">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                let opBg = 'bg-slate-100 text-slate-600';
                if (log.action.includes('Sent')) opBg = 'bg-blue-50 text-blue-700 border border-blue-100';
                else if (log.action.includes('Reply')) opBg = 'bg-purple-50 text-purple-700 border border-purple-100';
                else if (log.action.includes('Draft')) opBg = 'bg-purple-100 text-purple-900 border border-purple-200';
                else if (log.action.includes('Follow-Up')) opBg = 'bg-amber-50 text-amber-700 border border-amber-100';

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 pl-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {log.company}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">
                      {log.email}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${opBg}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-slate-500 max-w-[280px] truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                  No log entries matched your current search parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
