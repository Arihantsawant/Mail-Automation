import React, { useState } from 'react';
import { Company, CommLog } from '../types';
import { Database, Plus, RefreshCw, FileSpreadsheet, Eye, ExternalLink, HelpCircle, AlertCircle, Info, Sparkles, Check, ShieldAlert, Download } from 'lucide-react';
import { validateRFC5322Email, getMailSuiteBadge, isCompanyEmailBounced } from '../utils/emailLegitimacy';

interface CRMViewProps {
  accessToken: string | null;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  companies: Company[];
  loading: boolean;
  onSync: () => Promise<void>;
  onCreateNewSheet: () => Promise<void>;
  onAddCompany: (company: Omit<Company, 'sentDate' | 'lastActionDate' | 'followUpCount' | 'replyReceived' | 'replyDate' | 'threadId' | 'aiClassification' | 'nextAction' | 'remarks'>) => Promise<void>;
  onAddCompanies: (companies: Omit<Company, 'sentDate' | 'lastActionDate' | 'followUpCount' | 'replyReceived' | 'replyDate' | 'threadId' | 'aiClassification' | 'nextAction' | 'remarks'>[]) => Promise<void>;
  onBulkUpdateCompanies?: (companies: Company[]) => Promise<void>;
}

export default function CRMView({
  accessToken,
  spreadsheetId,
  setSpreadsheetId,
  companies,
  loading,
  onSync,
  onCreateNewSheet,
  onAddCompany,
  onAddCompanies,
  onBulkUpdateCompanies
}: CRMViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputSId, setInputSId] = useState('');
  const [showReconnect, setShowReconnect] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    hrName: '',
    email: '',
    industry: '',
    status: 'Pending' as any
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const rows: string[][] = [];
        let currentRow: string[] = [''];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              currentRow[currentRow.length - 1] += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            currentRow.push('');
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            rows.push(currentRow);
            currentRow = [''];
          } else {
            currentRow[currentRow.length - 1] += char;
          }
        }
        if (currentRow.length > 1 || currentRow[0] !== '') {
          rows.push(currentRow);
        }

        const cleanRows = rows.map(r => r.map(cell => cell.trim())).filter(r => r.some(cell => cell !== ''));
        if (cleanRows.length < 2) {
          alert('CSV file appears to be empty or has no data rows.');
          return;
        }

        const headers = cleanRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const dataRows = cleanRows.slice(1);

        const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('name') || h.includes('firm') || h.includes('organization'));
        const hrNameIdx = headers.findIndex(h => h.includes('hr') || h.includes('contact') || h.includes('recruiter') || h.includes('representative'));
        let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('address'));
        const industryIdx = headers.findIndex(h => h.includes('industry') || h.includes('sector') || h.includes('category') || h.includes('domain'));

        // Fallback email detection: search row cells for values containing '@'
        if (emailIdx === -1) {
          for (let colIdx = 0; colIdx < cleanRows[0].length; colIdx++) {
            const hasEmailPattern = dataRows.some(row => row[colIdx] && row[colIdx].includes('@') && row[colIdx].includes('.'));
            if (hasEmailPattern) {
              emailIdx = colIdx;
              break;
            }
          }
        }

        if (emailIdx === -1) {
          alert('Could not auto-detect an Email column in your CSV. Please ensure you have a column with email addresses.');
          return;
        }

        const parsedList = dataRows.map((row, idx) => {
          const emailVal = (row[emailIdx] || '').trim();
          const nameVal = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : '';
          const hrVal = hrNameIdx !== -1 && row[hrNameIdx] ? row[hrNameIdx].trim() : '';
          const indVal = industryIdx !== -1 && row[industryIdx] ? row[industryIdx].trim() : '';

          return {
            name: nameVal || 'Corporate Partner',
            hrName: hrVal || 'HR Partner',
            email: emailVal,
            industry: indVal || 'Other',
            status: 'Pending'
          };
        }).filter(item => item.email && item.email.includes('@'));

        if (parsedList.length === 0) {
          alert('No valid rows with email addresses found in the CSV.');
          return;
        }

        setCsvPreview(parsedList);
      } catch (err: any) {
        alert('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handlePushCSVToSheet = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    if (!spreadsheetId) {
      alert('Please connect a spreadsheet first.');
      return;
    }
    setActionLoading(true);
    try {
      await onAddCompanies(csvPreview);
      alert(`Successfully imported ${csvPreview.length} companies to your spreadsheet!`);
      setCsvPreview(null);
      setCsvFileName('');
    } catch (err: any) {
      alert('Failed to import CSV: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = inputSId.trim();
    if (!rawInput) return;

    let targetId = rawInput;
    // Extract ID from full URL if applicable
    if (rawInput.includes('docs.google.com/spreadsheets')) {
      const match = rawInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        targetId = match[1];
      } else {
        alert('Could not parse a valid Spreadsheet ID from this URL. Please verify the link.');
        return;
      }
    }

    setSpreadsheetId(targetId);
    setInputSId('');
    setShowReconnect(false);
    alert('Spreadsheet connected successfully! Click Sync to load data.');
  };

  const handleCreateSheet = async () => {
    setActionLoading(true);
    try {
      await onCreateNewSheet();
    } catch (err: any) {
      alert('Failed to create sheet: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.email) {
      alert('Please fill out the required Email field.');
      return;
    }
    const sanitizedCompany = {
      name: newCompany.name.trim() || 'Corporate Partner',
      hrName: newCompany.hrName.trim() || 'HR Partner',
      email: newCompany.email.trim(),
      industry: newCompany.industry.trim() || 'Other',
      status: newCompany.status
    };
    setActionLoading(true);
    try {
      await onAddCompany(sanitizedCompany);
      setShowAddForm(false);
      setNewCompany({ name: '', hrName: '', email: '', industry: '', status: 'Pending' });
      alert('Company added successfully!');
    } catch (err: any) {
      alert('Failed to add company: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAISmartFillSingle = async () => {
    if (!newCompany.email || !newCompany.email.includes('@')) {
      alert('Please enter a valid email address with @ domain to auto-fill.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/parse-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [newCompany.email.trim()] })
      });
      if (!res.ok) {
        throw new Error('Failed to analyze email with Gemini AI.');
      }
      const data = await res.json();
      if (data && data.results && data.results[0]) {
        const info = data.results[0];
        setNewCompany(prev => ({
          ...prev,
          name: info.name !== 'Corporate Partner' ? info.name : prev.name || info.name,
          hrName: info.hrName !== 'TPO Coordinator' ? info.hrName : prev.hrName || info.hrName,
          industry: info.industry !== 'Other' ? info.industry : prev.industry || info.industry,
        }));
      }
    } catch (err: any) {
      alert(err.message || 'AI Auto-Fill failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAISmartFillCSV = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    setActionLoading(true);
    try {
      const emails = csvPreview.map(row => row.email);
      const res = await fetch('/api/parse-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      });
      if (!res.ok) {
        throw new Error('Failed to auto-complete records with Gemini.');
      }
      const data = await res.json();
      if (data && data.results && Array.isArray(data.results)) {
        const updatedList = csvPreview.map((row) => {
          const found = data.results.find((r: any) => r.email.toLowerCase() === row.email.toLowerCase());
          if (found) {
            return {
              ...row,
              name: found.name || row.name,
              hrName: found.hrName || row.hrName,
              industry: found.industry || row.industry
            };
          }
          return row;
        });
        setCsvPreview(updatedList);
        alert('AI successfully analyzed and auto-completed the CSV fields!');
      }
    } catch (err: any) {
      alert('AI Parse Failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAIAutoCompleteSheet = async () => {
    if (!accessToken || !spreadsheetId) {
      alert('Please sign in and connect your Google Sheet first.');
      return;
    }
    if (companies.length === 0) {
      alert('No companies found in your active spreadsheet to analyze.');
      return;
    }

    // Identify rows that need smart-fill or let user analyze all
    const candidates = companies.filter(c => 
      !c.name || c.name === 'Corporate Partner' || 
      !c.hrName || c.hrName === 'HR Partner' ||
      !c.industry || c.industry === 'Other' || c.industry === '-'
    );

    const useAll = candidates.length === 0;
    const targetCompanies = useAll ? companies : candidates;

    const message = useAll 
      ? `All ${companies.length} rows look complete. Would you like to run Gemini AI analysis on all emails to verify/update their names, HR contacts, and industries?`
      : `Found ${candidates.length} rows with default/missing info (e.g. "Corporate Partner"). Would you like to use Gemini AI to automatically deduce their company names, HR contacts, and industries?`;

    if (!window.confirm(message)) return;

    setActionLoading(true);
    try {
      const emails = targetCompanies.map(c => c.email).filter(Boolean);
      if (emails.length === 0) {
        alert('No email addresses found to analyze.');
        return;
      }

      const res = await fetch('/api/parse-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      });

      if (!res.ok) {
        throw new Error(`AI Parse server error: ${await res.text()}`);
      }

      const data = await res.json();
      if (data && data.results && Array.isArray(data.results)) {
        // Build the updated list of companies
        const updatedCompanies = companies.map(c => {
          const found = data.results.find((r: any) => r.email.toLowerCase() === c.email.toLowerCase());
          if (found) {
            return {
              ...c,
              name: found.name && found.name !== 'Corporate Partner' ? found.name : c.name,
              hrName: found.hrName && found.hrName !== 'TPO Coordinator' ? found.hrName : c.hrName,
              industry: found.industry && found.industry !== 'Other' ? found.industry : c.industry
            };
          }
          return c;
        });

        // Write back to sheet using prop
        if (onBulkUpdateCompanies) {
          await onBulkUpdateCompanies(updatedCompanies);
          alert(`Success! Updated ${targetCompanies.length} rows in your Google Sheet with AI-deduced corporate details.`);
        } else {
          alert('Error: Bulk update handler is not configured.');
        }
      }
    } catch (err: any) {
      alert('AI Sheet Auto-Complete failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (companies.length === 0) {
      alert('No company records available to export.');
      return;
    }

    const headers = [
      'Company Name',
      'HR Contact Name',
      'Email Address',
      'Status',
      'Industry Category',
      'Follow-Up Count',
      'Initial Sent Date',
      'Last Action Date',
      'Reply Received',
      'Reply Date',
      'Remarks'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = companies.map(c => [
      escapeCSV(c.name || ''),
      escapeCSV(c.hrName || ''),
      escapeCSV(c.email || ''),
      escapeCSV(c.status || ''),
      escapeCSV(c.industry || ''),
      escapeCSV(c.followUpCount || 0),
      escapeCSV(c.sentDate || ''),
      escapeCSV(c.lastActionDate || ''),
      escapeCSV(c.replyReceived || ''),
      escapeCSV(c.replyDate || ''),
      escapeCSV(c.remarks || '')
    ]);

    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `geca_tpo_companies_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="crm_view_container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50 py-2 rounded-xl">
      {/* Left side: Spreadsheet connection & manual addition */}
      <div id="crm_config_sidebar" className="lg:col-span-4 space-y-6">
        {/* Spreadsheet Link Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 font-sans text-sm tracking-tight">Spreadsheet Source</h3>
          </div>

          {spreadsheetId ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-start gap-2.5">
                <div className="p-1.5 rounded bg-emerald-500 text-white mt-0.5">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block">Connected Sheet ID</span>
                  <span className="text-xs font-mono font-medium block truncate text-slate-700">{spreadsheetId}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-xs font-semibold transition-colors font-sans bg-white shadow-2xs"
                >
                  Open in Sheets
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <button
                  onClick={onSync}
                  disabled={loading}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReconnect(!showReconnect)}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider block"
                >
                  {showReconnect ? 'Cancel Change' : 'Connect a different spreadsheet'}
                </button>
              </div>

              {showReconnect && (
                <form onSubmit={handleConnectSheet} className="space-y-2 pt-2 animate-fade-in">
                  <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Paste Spreadsheet Link or ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. https://docs.google.com/spreadsheets/d/... or ID"
                      value={inputSId}
                      onChange={(e) => setInputSId(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors font-sans"
                    >
                      Connect
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 font-sans block mt-1">
                    You can copy and paste the entire browser URL of your Google Sheet directly.
                  </span>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                You do not have a placement database connected yet. Connect your spreadsheet or let us provision a standard one for you.
              </p>

              {accessToken ? (
                <button
                  onClick={handleCreateSheet}
                  disabled={actionLoading}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Create & Format New Sheet
                </button>
              ) : (
                <div className="p-3 bg-amber-50/50 rounded-lg text-xs text-amber-800 border border-amber-200">
                  Please sign in with Google using the button at the top of the screen to unlock Sheet creation features!
                </div>
              )}

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[9px] text-slate-300 font-bold uppercase tracking-wider font-sans">OR</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <form onSubmit={handleConnectSheet} className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Paste Spreadsheet Link or ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. https://docs.google.com/spreadsheets/d/... or ID"
                    value={inputSId}
                    onChange={(e) => setInputSId(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors font-sans"
                  >
                    Connect
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-sans block mt-1">
                  You can copy and paste the entire browser URL of your Google Sheet directly.
                </span>
              </form>
            </div>
          )}
        </div>

        {/* Add New Company Row Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full flex items-center justify-between font-bold text-slate-800 font-sans text-xs focus:outline-none"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Company Row
            </span>
            <span className="text-xs text-slate-400 font-medium">{showAddForm ? 'Collapse' : 'Expand'}</span>
          </button>

          {showAddForm && (
            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Atlas Copco"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">HR Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shri. Shrikant"
                  value={newCompany.hrName}
                  onChange={(e) => setNewCompany({ ...newCompany, hrName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">HR Email Address *</label>
                  <button
                    type="button"
                    disabled={actionLoading || !newCompany.email || !newCompany.email.includes('@')}
                    onClick={handleAISmartFillSingle}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    title="Let Gemini AI analyze the email domain and name to fill other fields"
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    AI Smart-Fill
                  </button>
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. hr@company.com"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:outline-none ${
                    newCompany.email && !validateRFC5322Email(newCompany.email).isValid
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
                {newCompany.email ? (
                  (() => {
                    const check = validateRFC5322Email(newCompany.email);
                    if (!check.isValid) {
                      return (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-600 font-medium">
                          <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>RFC 5322 Invalid: {check.reason}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Valid RFC 5322 format</span>
                        </div>
                      );
                    }
                  })()
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Industry Category</label>
                <input
                  type="text"
                  placeholder="e.g. Software Services"
                  value={newCompany.industry}
                  onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Initial Status</label>
                <select
                  value={newCompany.status}
                  onChange={(e) => setNewCompany({ ...newCompany, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Pending">Pending (Needs Invitation)</option>
                  <option value="Invited">Invited (Skipped in next bulk)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading || !spreadsheetId}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                Add to Spreadsheet Row
              </button>
            </form>
          )}
        </div>

        {/* CSV Bulk Import Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 font-sans text-xs uppercase tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              CSV Bulk Import
            </h3>
            {csvPreview && (
              <button
                onClick={() => { setCsvPreview(null); setCsvFileName(''); }}
                className="text-[10px] text-red-500 hover:underline font-semibold font-sans cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
            Upload a list of corporate recruiters to populate your CRM pipeline in one click.
          </p>

          <div className="relative border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 transition-all bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
            <span className="font-bold text-xs font-sans text-slate-700 block">
              {csvFileName || 'Choose CSV file'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Drag-and-drop or click to browse
            </span>
          </div>

          {csvPreview && (
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-800">
                Parsed <strong>{csvPreview.length}</strong> valid records! See preview grid.
              </span>
            </div>
          )}
        </div>

        {/* Informational Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-500">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="font-sans text-[11px]">
            <strong>Mentor Note:</strong> Sheets are strict with capitalization and spelling! When updating rows manually, our Apps Script checks the <strong>Status</strong> column. Keep them formatted correctly (Pending, Invited, Replied, Interested).
          </p>
        </div>
      </div>

      {/* Right side: Database Grid Table */}
      <div id="crm_database_table" className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs overflow-hidden flex flex-col max-h-[80vh]">
        {csvPreview ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="crm_table_title" className="text-base font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
                  <span className="p-1 rounded bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  CSV Import Preview ({csvPreview.length} rows)
                </h2>
                <span id="crm_table_subtitle" className="text-xs text-slate-400 block font-sans">
                  Review parsed corporate records. Click "Push to Google Sheet" to save.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCsvPreview(null); setCsvFileName(''); }}
                  className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-xs font-semibold font-sans bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAISmartFillCSV}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold font-sans flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                  AI Smart-Fill ({csvPreview?.length})
                </button>
                <button
                  onClick={handlePushCSVToSheet}
                  disabled={actionLoading || !spreadsheetId}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-sans flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Push to Google Sheet
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3 pl-4 font-sans">Company Name</th>
                    <th className="p-3 font-sans">HR Name</th>
                    <th className="p-3 font-sans">Email Address</th>
                    <th className="p-3 font-sans">Industry</th>
                    <th className="p-3 pr-4 font-sans text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {csvPreview.map((item, idx) => {
                    const rfcCheck = validateRFC5322Email(item.email);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-slate-800">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.hrName}</td>
                        <td className="p-3 font-mono text-slate-600">
                          <div>{item.email}</div>
                          {!rfcCheck.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 mt-0.5" title={rfcCheck.reason}>
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                              Invalid RFC 5322
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 mt-0.5">
                              <Check className="w-2.5 h-2.5" /> RFC 5322 Valid
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">{item.industry}</td>
                        <td className="p-3 pr-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="crm_table_title" className="text-base font-bold text-slate-900 font-sans tracking-tight">Companies Directory</h2>
                <span id="crm_table_subtitle" className="text-xs text-slate-400 block font-sans">
                  Showing {companies.length} corporate partner records.
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {companies.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Download current company directory as a CSV file"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Export CSV
                  </button>
                )}
                {spreadsheetId && (
                  <>
                    <button
                      onClick={handleAIAutoCompleteSheet}
                      disabled={loading || actionLoading || companies.length === 0}
                      className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg text-[10px] font-sans flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                      title="Let Gemini AI scan the sheet and guess missing HR names and company names from emails"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                      AI Smart-Fill Sheet
                    </button>
                    <button
                      onClick={onSync}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:underline font-semibold font-sans flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      Refresh Grid
                    </button>
                  </>
                )}
              </div>
            </div>

            {companies.length > 0 ? (
              <div className="flex-1 overflow-auto rounded-lg border border-slate-150">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-3 pl-4 font-sans">Company</th>
                      <th className="p-3 font-sans">HR Name</th>
                      <th className="p-3 font-sans">Email</th>
                      <th className="p-3 font-sans">Status</th>
                      <th className="p-3 font-sans">Industry</th>
                      <th className="p-3 font-sans text-center">Follow-up</th>
                      <th className="p-3 pr-4 font-sans text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {companies.map((company, idx) => {
                      let statusBg = 'bg-slate-100 text-slate-600';
                      if (company.status === 'Pending') statusBg = 'bg-slate-100 text-slate-600';
                      else if (company.status === 'Invited') statusBg = 'bg-blue-50 text-blue-600 border border-blue-100';
                      else if (company.status === 'Replied') statusBg = 'bg-purple-50 text-purple-600 border border-purple-100';
                      else if (company.status === 'Interested' || company.status === 'Drive Scheduled') statusBg = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                      else if (company.status === 'Not Interested') statusBg = 'bg-red-50 text-red-600 border border-red-100';
                      else if (company.status.startsWith('Follow Up')) statusBg = 'bg-amber-50 text-amber-600 border border-amber-100';

                      const rfcCheck = validateRFC5322Email(company.email);
                      const mailBadge = getMailSuiteBadge(company);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 pl-4 font-medium text-slate-800 font-sans">{company.name}</td>
                          <td className="p-3.5 text-slate-500 font-sans">{company.hrName}</td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-600">
                            <div>{company.email}</div>
                            {mailBadge.isBounced || !rfcCheck.isValid ? (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 mt-0.5 shadow-2xs cursor-help"
                                title={mailBadge.note || rfcCheck.reason}
                              >
                                <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                                {!rfcCheck.isValid ? `RFC 5322: ${rfcCheck.reason}` : mailBadge.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 mt-0.5">
                                <Check className="w-2.5 h-2.5" /> Delivered & Legit
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBg} font-sans`}>
                              {company.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-sans">{company.industry || '-'}</td>
                          <td className="p-3.5 text-center font-mono text-slate-500">{company.followUpCount || 0}</td>
                          <td className="p-3.5 pr-4 text-right text-slate-400 truncate max-w-[120px] font-sans" title={company.remarks}>
                            {company.remarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <Database className="w-8 h-8 text-slate-300 mb-3 animate-pulse" />
                <h4 className="font-bold text-slate-700 font-sans text-sm">No Connection Established</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed font-sans">
                  To browse records, please sign in at the top of the page, then create or link a Google Spreadsheet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
