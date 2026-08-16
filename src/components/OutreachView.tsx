import React, { useState, useRef } from 'react';
import { Company } from '../types';
import { Send, FileText, Check, AlertCircle, RefreshCw, Play, Mail, ShieldAlert, Sparkles, UploadCloud, Trash2, OctagonX, Ban, Clock } from 'lucide-react';
import { validateRFC5322Email, isCompanyEmailBounced } from '../utils/emailLegitimacy';
import { CountdownTimer } from './CountdownTimer';

interface OutreachViewProps {
  accessToken: string | null;
  spreadsheetId: string;
  companies: Company[];
  onSendBulkEmails: (
    log: (msg: string) => void,
    customSubject?: string,
    customBody?: string,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure?: boolean,
    attachLetter?: boolean,
    shouldStop?: () => boolean,
    onProgress?: (completed: number, total: number) => void,
    targetStatusFilter?: string
  ) => Promise<void>;
  onSendTestEmail: (
    log: (msg: string) => void,
    targetEmail?: string,
    customSubject?: string,
    customBody?: string,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure?: boolean,
    attachLetter?: boolean
  ) => Promise<void>;
  testingMode: boolean;
  setTestingMode: (val: boolean) => void;
  autoStatus: string;
  onRunAutoCampaign: () => Promise<void>;
  onSendSingleFollowUp?: (company: Company, customBody?: string) => Promise<void>;
  onCreateFollowUpDraft?: (company: Company, customBody?: string) => Promise<void>;
}

interface UploadedAttachment {
  name: string;
  base64: string;
  type: string;
  size: number;
}

export default function OutreachView({
  accessToken,
  spreadsheetId,
  companies,
  onSendBulkEmails,
  onSendTestEmail,
  testingMode,
  setTestingMode,
  autoStatus,
  onRunAutoCampaign,
  onSendSingleFollowUp,
  onCreateFollowUpDraft
}: OutreachViewProps) {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'System standby. Awaiting outreach trigger command...',
    'T&P Email SMTP service connected: geca.ac.in port 465'
  ]);
  const [running, setRunning] = useState(false);
  const [selectedBrochure, setSelectedBrochure] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [customSubject, setCustomSubject] = useState('Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar');
  const [customBody, setCustomBody] = useState(`Dear Team,
Greetings from the Training & Placement Office, Government College of Engineering Aurangabad (GECA), Chhatrapati Sambhajinagar!

Government College of Engineering Aurangabad (GECA) has started the Campus Placement and Internship activities for the graduating students of the 2027 batch. Our institute is accredited with NAAC B++ and the National Board of Accreditation (NBA) and has been selected for TEQIP III, a World Bank assisted project. It comes under the category of TIER 2 college as per AICTE norms.

We request you to consider the possibility of conducting your internship and recruitment drive for our students of the 2026-27 Batch.

Our Offered Courses:

B.Tech. – Computer Science & Engineering, Information Technology, Mechanical, Civil, Electrical, Electronics & Telecommunication
Master in Computer Application (MCA)
M.Tech.
Full-Time Placement: We cordially invite your esteemed organization to participate in our campus placement program starting in July 2026. Selected students can join your organization in July 2027.

Internship & Internship with PPO: Final-year students are available for semester-long internships. We also request you to consider Summer Interns from the Pre-Final year batch (Third Year B.Tech, First Year MCA) preferably with a stipend, starting from July 2026.

Please find attached our Placement Brochure and Invitation Letter for your reference.

We look forward to a mutually beneficial and long-lasting relationship with your esteemed organization. We hope for a positive response and request early slot booking confirmation.

Thanking You,

With regards
Dr. Praveen Shetiye, 
Training & Placement Officer
 Asso. Professor (MCA)
Government College of Engineering, Chhatrapati Sambhajinagar-431005 (MS)
Mobile No.: 8275034234, 9823297784, Landline: 91-240-2366357 
Email: tpo@geca.ac.in
Website:  www.geca.ac.in`);

  const [inlineAlert, setInlineAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('Pending');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

  const targetCount = companies.filter(c => {
    const s = (c.status || '').toString().trim().toLowerCase();
    const filter = bulkTargetStatus.toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'pending') return s === 'pending';
    return s.includes(filter) || filter.includes(s);
  }).length;
  const [editingFollowUp, setEditingFollowUp] = useState<Company | null>(null);
  const [editableBody, setEditableBody] = useState<string>('');
  
  // Custom uploaded attachments list
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Bulk Send Follow-up state
  const [bulkFollowUpStatus, setBulkFollowUpStatus] = useState<string>('Invited');
  const [bulkFollowUpChecked, setBulkFollowUpChecked] = useState<boolean>(false);
  const [bulkFollowUpLoading, setBulkFollowUpLoading] = useState<boolean>(false);

  // Live Countdown Timer state
  const [progressState, setProgressState] = useState<{
    isRunning: boolean;
    totalItems: number;
    completedItems: number;
    startTime: number | null;
    title: string;
  }>({
    isRunning: false,
    totalItems: 0,
    completedItems: 0,
    startTime: null,
    title: 'Outreach Campaign Dispatch'
  });

  const validAndLegitCompanies = companies.filter(c => {
    const isRfcValid = validateRFC5322Email(c.email).isValid;
    const isBounced = isCompanyEmailBounced(c);
    return isRfcValid && !isBounced;
  });

  const matchingFollowUpCompanies = validAndLegitCompanies.filter(c => {
    const s = (c.status || '').toString().trim().toLowerCase();
    return s === bulkFollowUpStatus.toLowerCase();
  });

  const bouncedOrInvalidCount = companies.length - validAndLegitCompanies.length;

  const handleBulkSendFollowUp = async () => {
    if (!bulkFollowUpChecked) {
      alert('Please check the confirmation checkbox to enable Bulk Send Follow-up.');
      return;
    }
    if (matchingFollowUpCompanies.length === 0) {
      alert(`No valid companies found with status "${bulkFollowUpStatus}". (Note: Bounced or RFC 5322 invalid emails are kept aside).`);
      return;
    }
    setBulkFollowUpLoading(true);
    stopRequestedRef.current = false;
    const startTime = Date.now();
    setProgressState({
      isRunning: true,
      totalItems: matchingFollowUpCompanies.length,
      completedItems: 0,
      startTime,
      title: `Bulk Follow-up (${bulkFollowUpStatus})`
    });
    appendLog(`[START] Bulk Send Follow-up initiated for ${matchingFollowUpCompanies.length} valid company(ies) with status "${bulkFollowUpStatus}"...`);
    if (bouncedOrInvalidCount > 0) {
      appendLog(`[MAILSUTE NOTICE] ${bouncedOrInvalidCount} company email(s) flagged as bounced or invalid format are being automatically kept aside.`);
    }
    let sentCount = 0;
    try {
      for (const c of matchingFollowUpCompanies) {
        if (stopRequestedRef.current) {
          appendLog('🛑 [STOP] Bulk follow-up campaign halted by user.');
          break;
        }
        if (onSendSingleFollowUp) {
          const hrName = c.hrName || 'HR Lead';
          const companyName = c.name || 'Corporate Partner';
          const defaultBody = `Dear ${hrName},\n\nI hope you are having a wonderful week.\n\nI am writing to gently follow up on our previous campus invitation regarding recruiting our exceptional graduates from Government College of Engineering, Aurangabad (GECA) for the 2026-27 graduating batch. We would be absolutely thrilled to establish a recruitment partnership with ${companyName}.\n\nOur training and placement cell is fully prepared to facilitate standard virtual or offline campus placement drives at your convenience. Please let us know if we can coordinate a brief 5-minute introductory discussion this week.\n\nLooking forward to your favorable response.\n\nWarm regards,\n\nDr. Praveen C. Shetiye,\nTraining and Placement Officer,\nGovernment College of Engineering, Aurangabad.`;
          await onSendSingleFollowUp(c, defaultBody);
          sentCount++;
          setProgressState(prev => ({ ...prev, completedItems: sentCount }));
          appendLog(`[SUCCESS] Follow-up sent to ${c.name} (${c.email})`);
        }
      }
      setInlineAlert({
        type: 'success',
        message: `Successfully sent bulk follow-up emails to ${sentCount} companies with status "${bulkFollowUpStatus}"!`
      });
    } catch (err: any) {
      appendLog(`[ERROR] Bulk follow-up stopped: ${err.message}`);
      setInlineAlert({
        type: 'error',
        message: `Bulk follow-up encountered an error: ${err.message}`
      });
    } finally {
      setBulkFollowUpLoading(false);
      setBulkFollowUpChecked(false);
      setProgressState(prev => ({ ...prev, isRunning: false }));
    }
  };

  const pendingCount = companies.filter(c => c.status && c.status.toString().trim().toLowerCase() === 'pending').length;

  const formatApproxTime = (count: number): string => {
    if (count <= 0) return '0 secs';
    const totalSeconds = count * 2; // ~2 seconds per email for PDF attachment generation, Gmail dispatch, and Google Sheets sync
    if (totalSeconds < 60) {
      return `~${totalSeconds} sec${totalSeconds === 1 ? '' : 's'}`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (secs === 0) {
      return `~${mins} min${mins === 1 ? '' : 's'}`;
    }
    return `~${mins} min${mins === 1 ? '' : 's'} ${secs} sec${secs === 1 ? '' : 's'}`;
  };

  const appendLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const MAX_COMBINED_SIZE = 18 * 1024 * 1024; // 18 MB in bytes

  const processFiles = (files: FileList | File[]) => {
    setInlineAlert(null);
    let currentCombinedSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Prevent duplicate filenames
      if (uploadedFiles.some(f => f.name === file.name)) {
        appendLog(`[INFO] Duplicate file skipped: "${file.name}"`);
        continue;
      }

      // Check if this file triggers overall overflow
      if (currentCombinedSize + file.size > MAX_COMBINED_SIZE) {
        appendLog(`[ERROR] Cannot add "${file.name}". Cumulative size of custom attachments would exceed the 18 MB Gmail-safe limit.`);
        setInlineAlert({ 
          type: 'error', 
          message: `Cannot add "${file.name}". The cumulative size of custom attachments would exceed 18 MB.` 
        });
        continue;
      }

      currentCombinedSize += file.size;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx !== -1 ? result.substring(commaIdx + 1) : result;
        
        setUploadedFiles(prev => {
          if (prev.some(f => f.name === file.name)) return prev;
          return [...prev, {
            name: file.name,
            base64,
            type: file.type || 'application/octet-stream',
            size: file.size
          }];
        });
        appendLog(`Custom attachment added: "${file.name}" (${Math.round(file.size / 1024)} KB)`);
      };
      reader.onerror = () => {
        appendLog(`[ERROR] Failed to read uploaded file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.name !== fileName);
      appendLog(`Removed custom attachment: "${fileName}"`);
      return filtered;
    });
  };

  const handleSendTest = async () => {
    setInlineAlert(null);
    if (!accessToken) {
      setInlineAlert({ type: 'error', message: 'Please sign in with Google to send emails.' });
      return;
    }
    setRunning(true);
    setTerminalLogs([]);
    appendLog('Starting Single Test Email Sequence (Module 4)...');
    try {
      await onSendTestEmail(appendLog, testRecipient.trim() || undefined, customSubject, customBody, uploadedFiles, selectedBrochure, selectedLetter);
      appendLog('Test Outreach Complete! Check your Gmail inbox.');
      setInlineAlert({ type: 'success', message: 'Test Email sent successfully! Check your Gmail inbox.' });
    } catch (err: any) {
      appendLog(`FATAL ERROR: ${err.message}`);
      setInlineAlert({ type: 'error', message: `Failed to send test email: ${err.message}` });
    } finally {
      setRunning(false);
    }
  };

  const handleSendBulk = () => {
    setInlineAlert(null);
    if (!accessToken) {
      setInlineAlert({ type: 'error', message: 'Please sign in with Google to run bulk campaigns.' });
      return;
    }
    if (!spreadsheetId) {
      setInlineAlert({ type: 'error', message: 'Please connect a Google Spreadsheet in the "Placement CRM" tab first.' });
      return;
    }
    if (targetCount === 0) {
      setInlineAlert({ type: 'warning', message: `There are no companies with status "${bulkTargetStatus}" in your sheet to email.` });
      return;
    }

    // Instead of window.confirm, open our clean in-app confirmation modal state
    setShowBulkConfirm(true);
  };

  const stopRequestedRef = useRef(false);

  const confirmStopCampaign = () => {
    stopRequestedRef.current = true;
    appendLog('🛑 [EMERGENCY STOP] Stop command confirmed by user. Aborting mail dispatch process...');
    setInlineAlert({
      type: 'warning',
      message: 'Mail sending process has been stopped by user request.'
    });
    setRunning(false);
    setShowStopModal(false);
  };

  const executeBulkCampaign = async () => {
    setShowBulkConfirm(false);
    setInlineAlert(null);
    setRunning(true);
    stopRequestedRef.current = false;
    setTerminalLogs([]);
    const startTime = Date.now();
    setProgressState({
      isRunning: true,
      totalItems: targetCount,
      completedItems: 0,
      startTime,
      title: `Bulk Campaign (${bulkTargetStatus})`
    });
    appendLog(`Starting Bulk Outreach Campaign Sequence for status "${bulkTargetStatus}"...`);
    try {
      await onSendBulkEmails(
        appendLog, 
        customSubject, 
        customBody, 
        uploadedFiles, 
        selectedBrochure, 
        selectedLetter,
        () => stopRequestedRef.current,
        (completed, total) => {
          setProgressState(prev => ({
            ...prev,
            completedItems: completed,
            totalItems: total
          }));
        },
        bulkTargetStatus
      );
      if (stopRequestedRef.current) {
        appendLog('Campaign halted by user.');
        setInlineAlert({ type: 'warning', message: 'Mail campaign process stopped immediately by user.' });
      } else {
        appendLog('Campaign Completed Successfully! All columns synchronized.');
        setInlineAlert({ type: 'success', message: `Bulk Campaign completed successfully! Dispatched to ${targetCount} corporate contacts with status "${bulkTargetStatus}".` });
      }
    } catch (err: any) {
      appendLog(`CAMPAIGN CRASHED: ${err.message}`);
      setInlineAlert({ type: 'error', message: `Campaign failed: ${err.message}` });
    } finally {
      setRunning(false);
      setProgressState(prev => ({ ...prev, isRunning: false }));
    }
  };

  return (
    <div id="outreach_view_container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50 py-2 rounded-xl">
      {/* Left Column: Email Configuration and Actions */}
      <div id="outreach_config_panel" className="lg:col-span-6 space-y-6">
        {/* Real-Time Ticking Countdown Timer Banner */}
        <CountdownTimer
          isRunning={progressState.isRunning}
          totalItems={progressState.totalItems}
          completedItems={progressState.completedItems}
          startTime={progressState.startTime}
          secPerItem={2}
          title={progressState.title}
          onStop={() => setShowStopModal(true)}
        />

        {/* Inline Alerts Notification Banner */}
        {inlineAlert && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed font-sans ${
            inlineAlert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            inlineAlert.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            inlineAlert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {inlineAlert.type === 'success' && <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {inlineAlert.type === 'error' && <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {inlineAlert.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {inlineAlert.type === 'info' && <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wide text-[10px] block mb-0.5">
                {inlineAlert.type === 'success' ? 'Task Succeeded' :
                 inlineAlert.type === 'error' ? 'System Warning / Failure' :
                 inlineAlert.type === 'warning' ? 'Action Required' :
                 'System Notification'}
              </span>
              {inlineAlert.message}
            </div>
            <button 
              onClick={() => setInlineAlert(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Email Template Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 font-sans text-xs flex items-center gap-2 uppercase tracking-tight">
              <Mail className="w-4 h-4 text-blue-600" />
              Standard Placement Template
            </h3>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded font-sans uppercase tracking-wider">
              Customizable Template
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Subject */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans block">Subject Line</label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50 hover:bg-slate-50/50"
              />
            </div>
            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans block">Official Attachments (Optional)</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedBrochure}
                    onChange={(e) => setSelectedBrochure(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-700 block truncate text-xs">GECA CSN TNP Brochure 26-27.pdf</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Official Placement Brochure - Click to include</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedLetter}
                    onChange={(e) => setSelectedLetter(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-700 block truncate text-xs">Invitation Letter 26-27.pdf</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Formal Invitation Letter - Click to include</span>
                  </div>
                </label>
              </div>
            </div>
            {/* Custom Uploaded Attachments */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans block">
                  Custom Additional Attachments
                </label>
                {uploadedFiles.length > 0 && (
                  <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded font-sans">
                    {uploadedFiles.length} ACTIVE
                  </span>
                )}
              </div>

              {/* Total Size Indicator / Progress Bar */}
              {uploadedFiles.length > 0 && (() => {
                const totalBytes = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
                const totalMB = totalBytes / (1024 * 1024);
                const percentage = Math.min((totalBytes / MAX_COMBINED_SIZE) * 100, 100);
                const isHigh = percentage > 80;
                
                return (
                  <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 font-sans">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        Cumulative Upload Size
                      </span>
                      <span className={isHigh ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                        {totalMB.toFixed(2)} MB / 18.00 MB
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          isHigh ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-sans leading-tight">
                      Gmail max raw file limit is ~18 MB safely (due to MIME base64 1.33x overhead).
                    </p>
                  </div>
                );
              })()}

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {uploadedFiles.map((file, idx) => (
                    <div 
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-3 p-2 bg-blue-50/30 border border-blue-100 rounded-lg relative hover:bg-blue-50/50 transition-colors animate-fade-in"
                    >
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-700 block truncate text-[11px] leading-tight" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          {Math.round(file.size / 1024)} KB | {file.type || 'unknown'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.name)}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('custom_attachment_file')?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/50 text-blue-600'
                    : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 text-slate-400 hover:border-slate-300'
                }`}
              >
                <input
                  type="file"
                  id="custom_attachment_file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
                <UploadCloud className={`w-6 h-6 transition-transform ${dragActive ? 'scale-110 text-blue-500' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-600 block">
                    {uploadedFiles.length > 0 ? 'Add more files' : 'Click to upload or drag & drop files'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Select one or more PDFs, DOCX, Images, etc. (Max 18MB total)
                  </span>
                </div>
              </div>
            </div>

            {/* Email Body Preview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans block">Email Body Template</label>
                <span className="text-[9px] text-slate-400 font-sans italic">Placeholders: {"{HR Name}"}, {"{Company Name}"}</span>
              </div>
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={10}
                className="w-full p-4 bg-slate-50 border border-slate-150 rounded-lg text-slate-600 font-sans leading-relaxed text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Controls Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 font-sans text-xs uppercase tracking-tight">Outreach Commands</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Trigger high-precision placement campaigns directly.
            </p>
          </div>

          {/* Robotic Process Automation (RPA) Control Center */}
          <div className="border border-slate-200/80 rounded-xl p-5 bg-blue-50/25 space-y-4 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 animate-pulse" />
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-xs font-sans flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  RPA Automated Agent Center
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                  The system scans Gmail automatically in the background to handle replies and follow-ups.
                </p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                autoStatus.includes('Error') ? 'bg-rose-50 text-rose-700 animate-pulse' :
                autoStatus.includes('Scanning') || autoStatus.includes('Analyzing') || autoStatus.includes('Sending') ? 'bg-amber-50 text-amber-700 animate-bounce' :
                'bg-emerald-50 text-emerald-700'
              }`}>
                ● {autoStatus}
              </span>
            </div>

            {/* Config & Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Toggle switch for Testing Mode */}
              <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-3xs">
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-slate-700 block font-sans">Testing Mode</label>
                  <span className="text-[9px] text-slate-400 font-sans block mt-0.5">2-min follow-up interval</span>
                </div>
                <button
                  onClick={() => setTestingMode(!testingMode)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${testingMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${testingMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Action Button */}
              <button
                onClick={onRunAutoCampaign}
                disabled={!spreadsheetId}
                className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold font-sans transition-all shadow-3xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoStatus.includes('Scanning') ? 'animate-spin' : ''}`} />
                Trigger Auto-check Now
              </button>
            </div>
          </div>

          {/* Manual Follow-up Reminders Queue */}
          <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-700 text-xs font-sans flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                Pending Follow-up Approvals ({(() => {
                  const today = new Date();
                  return companies.filter(c => {
                    const statusVal = (c.status || '').toString().trim().toLowerCase();
                    const isEligibleStatus = statusVal === 'invited' || statusVal.startsWith('follow up');
                    const isExcluded = statusVal === 'replied' || statusVal === 'interested' || statusVal === 'not interested' || statusVal === 'no response' || statusVal === 'drive scheduled' || statusVal.includes('drafted');
                    
                    if (!isEligibleStatus || isExcluded || (c.followUpCount || 0) >= 3 || !c.threadId) {
                      return false;
                    }
                    
                    const lastDateStr = c.lastActionDate || c.sentDate;
                    if (!lastDateStr) return false;
                    
                    try {
                      const lastDate = new Date(lastDateStr);
                      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const diffMinutes = Math.ceil(diffTime / (1000 * 60));
                      
                      return testingMode ? (diffMinutes >= 2) : (diffDays >= 7);
                    } catch {
                      return false;
                    }
                  }).length;
                })()})
              </h4>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded font-sans uppercase tracking-wider">
                User Permission Gated
              </span>
            </div>

            {(() => {
              const today = new Date();
              const pendingFollowUps = companies.filter(c => {
                const statusVal = (c.status || '').toString().trim().toLowerCase();
                const isEligibleStatus = statusVal === 'invited' || statusVal.startsWith('follow up');
                const isExcluded = statusVal === 'replied' || statusVal === 'interested' || statusVal === 'not interested' || statusVal === 'no response' || statusVal === 'drive scheduled' || statusVal.includes('drafted');
                
                if (!isEligibleStatus || isExcluded || (c.followUpCount || 0) >= 3 || !c.threadId) {
                  return false;
                }
                
                const lastDateStr = c.lastActionDate || c.sentDate;
                if (!lastDateStr) return false;
                
                try {
                  const lastDate = new Date(lastDateStr);
                  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
                  
                  return testingMode ? (diffMinutes >= 2) : (diffDays >= 7);
                } catch {
                  return false;
                }
              });

              if (pendingFollowUps.length === 0) {
                return (
                  <p className="text-[11px] text-slate-400 font-sans italic text-center py-2">
                    No follow-up reminders are currently due (0 companies pending follow-up).
                  </p>
                );
              }

              return (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {pendingFollowUps.map((c, idx) => {
                    const lastDateStr = c.lastActionDate || c.sentDate || '';
                    const nextCount = (c.followUpCount || 0) + 1;
                    return (
                      <div 
                        key={`${c.name}-${c.email}-${idx}`}
                        className="p-3 bg-white border border-slate-150 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-xs block truncate leading-snug">{c.name}</span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">{c.email}</span>
                          <span className="text-[9px] text-indigo-600 font-semibold font-sans block mt-1">
                            Queue: Follow-up #{nextCount} (Last active: {lastDateStr})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setEditingFollowUp(c);
                              const hrName = c.hrName || 'HR Lead';
                              const companyName = c.name || 'Corporate Partner';
                              setEditableBody(`Dear ${hrName},

I hope you are having a wonderful week.

I am writing to gently follow up on our previous campus invitation regarding recruiting our exceptional graduates from **Government College of Engineering, Aurangabad (GECA)** for the **2026-27 graduating batch**. We would be absolutely thrilled to establish a recruitment partnership with **${companyName}**.

Our training and placement cell is fully prepared to facilitate standard virtual or offline campus placement drives at your convenience. Please let us know if we can coordinate a brief 5-minute introductory discussion this week.

Looking forward to your favorable response.

Warm regards,

**Dr. Praveen C. Shetiye**,
Training and Placement Officer,
**Government College of Engineering, Aurangabad**.`);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] font-sans rounded transition-colors cursor-pointer shadow-3xs"
                          >
                            Review & Send
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Bulk Send Follow-up by Status Section */}
          <div className="border border-purple-200/80 rounded-xl p-4 bg-purple-50/30 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs font-sans flex items-center gap-1.5">
                <Send className="w-4 h-4 text-purple-600 shrink-0" />
                Bulk Send Follow-up by Status
              </h4>
              <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded font-sans uppercase tracking-wider">
                Batch Follow-up
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              Send follow-up emails in one operation to all companies that match a specific status.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block mb-1">Target Status</label>
                <select
                  value={bulkFollowUpStatus}
                  onChange={(e) => {
                    setBulkFollowUpStatus(e.target.value);
                    setBulkFollowUpChecked(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none font-sans bg-white font-semibold text-slate-700"
                >
                  <option value="Invited">Invited ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'invited').length})</option>
                  <option value="Follow Up 1">Follow Up 1 ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'follow up 1').length})</option>
                  <option value="Follow Up 2">Follow Up 2 ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'follow up 2').length})</option>
                  <option value="Pending">Pending ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'pending').length})</option>
                  <option value="No Response">No Response ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'no response').length})</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg w-full text-center">
                  {matchingFollowUpCompanies.length} Company(ies) Ready
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="bulkFollowUpConfirm"
                checked={bulkFollowUpChecked}
                onChange={(e) => setBulkFollowUpChecked(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="bulkFollowUpConfirm" className="text-xs text-slate-700 font-medium cursor-pointer">
                Confirm sending bulk follow-up emails to <strong>{matchingFollowUpCompanies.length}</strong> company(ies) with status "{bulkFollowUpStatus}"
              </label>
            </div>
            <button
              onClick={handleBulkSendFollowUp}
              disabled={bulkFollowUpLoading || !bulkFollowUpChecked || matchingFollowUpCompanies.length === 0}
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {bulkFollowUpLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sending Bulk Follow-ups...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Bulk Follow-up ({matchingFollowUpCompanies.length})
                </>
              )}
            </button>
          </div>

          {/* Test Email Section */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-700 text-xs font-sans flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-500" />
              Send Single Test Email
            </h4>
            <div className="space-y-1.5">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Recipient Email Address</label>
              <input
                type="email"
                placeholder="Enter recipient email (defaults to self)"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans bg-white"
              />
            </div>
            <button
              onClick={handleSendTest}
              disabled={running}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs font-sans rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Single Test Email
            </button>
          </div>

          {/* Bulk Sender */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-700 text-xs font-sans flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-600" />
                Execute Bulk Campaign
              </h4>
              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                Est. {formatApproxTime(targetCount)}
              </span>
            </div>
            
            {/* Target Status Selector */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Select Target Status / Filter</label>
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">ALL Companies ({companies.length})</option>
                <option value="Pending">Pending ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'pending').length})</option>
                <option value="Invited">Invited ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'invited').length})</option>
                <option value="Replied">Replied ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'replied').length})</option>
                <option value="Interested">Interested ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'interested').length})</option>
                <option value="Not Interested">Not Interested ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'not interested').length})</option>
                <option value="Follow Up 1">Follow Up 1 ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'follow up 1').length})</option>
                <option value="Follow Up 2">Follow Up 2 ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'follow up 2').length})</option>
                <option value="Follow Up 3">Follow Up 3 ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'follow up 3').length})</option>
                <option value="No Response">No Response ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'no response').length})</option>
                <option value="Drive Scheduled">Drive Scheduled ({companies.filter(c => (c.status||'').toString().trim().toLowerCase() === 'drive scheduled').length})</option>
              </select>
            </div>

            {/* Execution time summary banner */}
            <div className="flex items-center justify-between text-[11px] font-sans bg-slate-100/80 px-3 py-2 rounded-lg text-slate-600 border border-slate-200/60">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Approx. Completion Time:
              </span>
              <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-3xs">
                {formatApproxTime(targetCount)} <span className="font-normal text-slate-400 text-[10px]">({targetCount} rows @ ~2s/email)</span>
              </span>
            </div>

            {showBulkConfirm ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-900 leading-relaxed font-sans flex-1">
                    <div><strong>Are you sure?</strong> This will dispatch <strong>{targetCount} real emails</strong> for status "<strong>{bulkTargetStatus}</strong>" from your signed-in Gmail account (<code>{accessToken ? 'Connected' : 'Not Connected'}</code>).</div>
                    <div className="mt-2 p-2 bg-amber-100/70 rounded border border-amber-200 flex items-center justify-between text-[10px] text-amber-950 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        Estimated Process Duration:
                      </span>
                      <strong className="text-amber-900 font-sans">{formatApproxTime(targetCount)}</strong>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={executeBulkCampaign}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-sans rounded-md transition-all cursor-pointer text-center"
                  >
                    Yes, Send {targetCount} Emails ({formatApproxTime(targetCount)})
                  </button>
                  <button
                    onClick={() => setShowBulkConfirm(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold font-sans rounded-md transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : running ? (
              <button
                onClick={() => setShowStopModal(true)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer animate-pulse"
              >
                <OctagonX className="w-4 h-4" />
                STOP MAIL SENDING / CANCEL PROCESS NOW
              </button>
            ) : (
              <button
                onClick={handleSendBulk}
                disabled={running || !spreadsheetId || targetCount === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Dispatch Bulk Emails ({targetCount})
              </button>
            )}
          </div>

          {!spreadsheetId && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600 text-center flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Please link or create a Google Spreadsheet to unlock the Bulk Campaign tool.
            </p>
          )}
        </div>
      </div>

      {/* Right Column: Execution Console Terminal Log */}
      <div id="outreach_execution_log" className="lg:col-span-6 flex flex-col h-full bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 font-sans text-xs uppercase tracking-tight">Execution Console</h3>
            <span className="text-xs text-slate-400 block font-sans">Live server automation telemetry</span>
          </div>
          {running && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-blue-600 font-bold font-sans">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                SENDING IN PROGRESS...
              </span>
              <button
                onClick={() => setShowStopModal(true)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer animate-pulse"
              >
                <OctagonX className="w-3.5 h-3.5" />
                Stop Mail Sending
              </button>
            </div>
          )}
        </div>

        {/* Live Countdown Clock Widget above Terminal */}
        {progressState.isRunning && (
          <div className="mb-3">
            <CountdownTimer
              isRunning={progressState.isRunning}
              totalItems={progressState.totalItems}
              completedItems={progressState.completedItems}
              startTime={progressState.startTime}
              secPerItem={2}
              title={progressState.title}
              onStop={() => setShowStopModal(true)}
            />
          </div>
        )}

        {/* Dark Terminal Window */}
        <div className="flex-1 bg-slate-950 text-emerald-400 font-mono text-xs p-5 rounded-lg overflow-y-auto min-h-[300px] max-h-[400px] leading-relaxed shadow-inner">
          <div className="space-y-1.5">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap">
                <span className="text-slate-600 select-none font-sans font-bold mr-1.5">&gt;</span>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Sync Reminder */}
        <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100/60 rounded-lg flex items-center gap-2.5 text-xs text-blue-700 leading-tight">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="font-sans text-[11px]">
            Campaign actions update the spreadsheet in real-time. Make sure to check the <strong>"Placement Dashboard"</strong> to view visual pipeline adjustments after sending!
          </p>
        </div>
      </div>

      {/* Review & Manual Confirmation Follow-Up Modal */}
      {editingFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 font-sans text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Manual Follow-up Review & Confirmation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Replying directly to previous invitation thread for <strong className="text-slate-800">{editingFollowUp.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setEditingFollowUp(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block">Recipient HR Email</span>
                  <span className="font-semibold text-slate-800 font-mono">{editingFollowUp.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Follow-up Level</span>
                  <span className="font-semibold text-indigo-600 font-mono">
                    Follow-up #{ (editingFollowUp.followUpCount || 0) + 1 } (Thread reply)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                  Edit Email Body Content (HTML or Plain Text)
                </label>
                <textarea
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  className="w-full h-80 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-800 font-sans leading-relaxed resize-none focus:outline-none"
                  placeholder="Enter custom follow-up message..."
                />
                <p className="text-[10px] text-slate-400 italic">
                  Note: Paragraphs split by empty lines are automatically converted into styled HTML paragraphs for Gmail compatibility.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFollowUp(null)}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs font-sans rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!onSendSingleFollowUp}
                onClick={async () => {
                  if (!onSendSingleFollowUp) return;
                  const company = editingFollowUp;
                  setEditingFollowUp(null);
                  appendLog(`[ACTION] User confirmed and authorized manual dispatch of Follow-up to ${company.name}...`);
                  try {
                    await onSendSingleFollowUp(company, editableBody);
                    appendLog(`[SUCCESS] Follow-up sent successfully to ${company.name}!`);
                    setInlineAlert({ type: 'success', message: `Follow-up dispatched directly to ${company.name}!` });
                  } catch (err: any) {
                    appendLog(`[ERROR] Failed to send follow-up: ${err.message}`);
                    setInlineAlert({ type: 'error', message: `Failed to send follow-up: ${err.message}` });
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs font-sans rounded-lg shadow-3xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Confirm & Send Mail
              </button>

              <button
                type="button"
                disabled={!onCreateFollowUpDraft}
                onClick={async () => {
                  if (!onCreateFollowUpDraft) return;
                  const company = editingFollowUp;
                  setEditingFollowUp(null);
                  appendLog(`[ACTION] User confirmed and authorized drafting Follow-up for ${company.name}...`);
                  try {
                    await onCreateFollowUpDraft(company, editableBody);
                    appendLog(`[SUCCESS] Draft created successfully in Gmail for ${company.name}!`);
                    setInlineAlert({ type: 'success', message: `Follow-up draft created in Gmail for ${company.name}!` });
                  } catch (err: any) {
                    appendLog(`[ERROR] Failed to create draft: ${err.message}`);
                    setInlineAlert({ type: 'error', message: `Failed to create draft: ${err.message}` });
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-sans rounded-lg shadow-3xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Confirm & Create Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Campaign Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <OctagonX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-sans">Stop Mail Sending Process?</h3>
                <p className="text-xs text-slate-500 font-sans">Confirm active campaign interruption</p>
              </div>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5 font-sans">
              <p className="font-semibold">Are you sure you want to stop the active mail campaign?</p>
              <p className="text-rose-700 leading-relaxed">
                Any email currently being sent will finalize, but all remaining queued recipient messages will be cancelled immediately to prevent unscheduled dispatches.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs font-sans rounded-xl transition-colors cursor-pointer"
              >
                Keep Sending
              </button>
              <button
                type="button"
                onClick={confirmStopCampaign}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs font-sans rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <OctagonX className="w-3.5 h-3.5" />
                Yes, Stop Campaign Immediately
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
