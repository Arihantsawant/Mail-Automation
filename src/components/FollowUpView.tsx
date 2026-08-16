import React, { useState, useRef } from 'react';
import { Company } from '../types';
import { Mail, Repeat, Send, FileText, Check, AlertCircle, Sparkles, RefreshCw, Play, ShieldAlert, Edit3, MessageSquare, Clock, Filter, ArrowRight, OctagonX, Ban, Bot, UserCheck, Eye, Paperclip, FileUp, Trash2, Plus, Upload } from 'lucide-react';
import { validateRFC5322Email, isCompanyEmailBounced } from '../utils/emailLegitimacy';
import { CountdownTimer } from './CountdownTimer';
import ActualReplyModal, { detectReplyCategory } from './ActualReplyModal';

interface FollowUpViewProps {
  accessToken: string | null;
  spreadsheetId: string;
  companies: Company[];
  onSendSingleFollowUp?: (
    company: Company, 
    customBody?: string, 
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure?: boolean,
    attachLetter?: boolean
  ) => Promise<void>;
  onCreateFollowUpDraft?: (
    company: Company, 
    customBody?: string, 
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure?: boolean,
    attachLetter?: boolean
  ) => Promise<void>;
  onSaveRemarks?: (companyName: string, newRemarks: string) => Promise<void>;
  testingMode: boolean;
  setTestingMode: (val: boolean) => void;
}

export default function FollowUpView({
  accessToken,
  spreadsheetId,
  companies,
  onSendSingleFollowUp,
  onCreateFollowUpDraft,
  onSaveRemarks,
  testingMode,
  setTestingMode
}: FollowUpViewProps) {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Follow-Up Campaign Console initialized.',
    'Thread-looping engine active: Gmail API MIME In-Reply-To headers ready.'
  ]);

  const [customSubject, setCustomSubject] = useState('Re: Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar');
  const [customBody, setCustomBody] = useState(`Dear Team,
Greetings from Government College of Engineering, Chhatrapati Sambhajinagar!

We are writing to follow up on my previous email regarding the Campus Recruitment Drive for the 2026–27 graduating batch. In our earlier communication, we had shared the recruitment brochure along with the formal invitation to participate in our campus hiring process.

We understand that you may be managing multiple priorities; however, We would appreciate it if you could let us know whether you have had an opportunity to review the details. We would be grateful if you could share your interest in participating or provide any updates regarding the recruitment process.

If you require any additional information, such as the placement brochure, student profiles, recruitment process details, or preferred hiring timelines, We would be happy to provide them.

We look forward to the opportunity to collaborate with your organization and welcome your participation in our campus recruitment drive.

Thank you for your time and consideration. We look forward to your response.

With regards

Dr. Praveen Shetiye, 
Training & Placement Officer
Asso. Professor (MCA)
Government College of Engineering, Chhatrapati Sambhajinagar-431005 (MS)
Mobile No.: 8275034234, 9823297784, Landline: 91-240-2366357 
Email: tpo@geca.ac.in
Website:  www.geca.ac.in`);

  // Attachment states for follow-up campaign
  const [uploadedAttachments, setUploadedAttachments] = useState<{ name: string; type: string; base64: string; size: number }[]>([]);
  const [attachBrochure, setAttachBrochure] = useState(false);
  const [attachLetter, setAttachLetter] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all'); // 'all', 'fu1', 'fu2', 'fu3'
  const [inlineAlert, setInlineAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  
  // Modal State for Inspecting Reply
  const [selectedReplyCompany, setSelectedReplyCompany] = useState<Company | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  // Single Company Edit Modal State
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [modalBody, setModalBody] = useState<string>('');

  // Batch Confirmation Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

  // Live Countdown Timer State
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
    title: 'Batch Follow-up Campaign'
  });

  // Test Follow-up recipient
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const appendLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    files.forEach((file: File) => {
      if (file.size > 15 * 1024 * 1024) {
        setInlineAlert({
          type: 'error',
          message: `File "${file.name}" exceeds 15MB limit for attachments.`
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setUploadedAttachments(prev => [
            ...prev,
            {
              name: file.name,
              type: file.type || 'application/octet-stream',
              base64,
              size: file.size
            }
          ]);
          setInlineAlert({
            type: 'success',
            message: `Attached "${file.name}" (${Math.round(file.size / 1024)} KB) for follow-up campaign!`
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setUploadedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const today = new Date();

  // Helper to determine eligible pending follow-up companies (including auto-replies)
  const eligibleFollowUpCompanies = companies.filter(c => {
    // MailSuite & RFC 5322 Guard: Exclude bounced, failed delivery, or malformed email addresses
    const isRfcValid = validateRFC5322Email(c.email).isValid;
    const isBounced = isCompanyEmailBounced(c);
    if (!isRfcValid || isBounced) {
      return false;
    }

    const category = detectReplyCategory(c);
    const isAutoReply = category.isAutoReply;

    const statusVal = (c.status || '').toString().trim().toLowerCase();
    
    // Auto-reply exception: If the received email is an out-of-office / automatic reply,
    // do NOT treat it as a real human recruiter response — re-queue it for follow-up!
    const isRealHumanReplied = !isAutoReply && (statusVal === 'replied' || statusVal === 'interested' || statusVal === 'not interested' || statusVal === 'drive scheduled');
    const isEligibleStatus = statusVal === 'invited' || statusVal.startsWith('follow up') || isAutoReply || statusVal === 'replied';
    const isExcluded = isRealHumanReplied || statusVal === 'no response' || statusVal.includes('drafted');
    
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

  const bouncedOrInvalidFollowUpCount = companies.filter(c => {
    const statusVal = (c.status || '').toString().trim().toLowerCase();
    const isEligibleStatus = statusVal === 'invited' || statusVal.startsWith('follow up');
    if (!isEligibleStatus) return false;
    const isRfcValid = validateRFC5322Email(c.email).isValid;
    const isBounced = isCompanyEmailBounced(c);
    return !isRfcValid || isBounced;
  }).length;

  // Search and Level Filtered Companies
  const filteredCompanies = eligibleFollowUpCompanies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.hrName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const nextCount = (c.followUpCount || 0) + 1;
    if (filterLevel === 'fu1' && nextCount !== 1) return false;
    if (filterLevel === 'fu2' && nextCount !== 2) return false;
    if (filterLevel === 'fu3' && nextCount !== 3) return false;
    if (filterLevel === 'auto_reply' && !detectReplyCategory(c).isAutoReply) return false;

    return matchesSearch;
  });

  const totalInvitedCount = companies.filter(c => {
    const st = (c.status || '').toLowerCase();
    return st === 'invited' || st.startsWith('follow') || st === 'replied' || st === 'interested' || st === 'drive scheduled';
  }).length;

  const totalRepliedCount = companies.filter(c => {
    const st = (c.status || '').toLowerCase();
    return st === 'replied' || st === 'interested' || st === 'drive scheduled';
  }).length;

  const resetTemplateToDefault = () => {
    setCustomBody(`Dear Team,
Greetings from Government College of Engineering, Chhatrapati Sambhajinagar!

We are writing to follow up on my previous email regarding the Campus Recruitment Drive for the 2026–27 graduating batch. In our earlier communication, we had shared the recruitment brochure along with the formal invitation to participate in our campus hiring process.

We understand that you may be managing multiple priorities; however, We would appreciate it if you could let us know whether you have had an opportunity to review the details. We would be grateful if you could share your interest in participating or provide any updates regarding the recruitment process.

If you require any additional information, such as the placement brochure, student profiles, recruitment process details, or preferred hiring timelines, We would be happy to provide them.

We look forward to the opportunity to collaborate with your organization and welcome your participation in our campus recruitment drive.

Thank you for your time and consideration. We look forward to your response.

With regards

Dr. Praveen Shetiye, 
Training & Placement Officer
Asso. Professor (MCA)
Government College of Engineering, Chhatrapati Sambhajinagar-431005 (MS)
Mobile No.: 8275034234, 9823297784, Landline: 91-240-2366357 
Email: tpo@geca.ac.in
Website:  www.geca.ac.in`);
    setInlineAlert({ type: 'info', message: 'Follow-up template reset to official GECA TPO standard.' });
  };

  const handleTestFollowUp = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setInlineAlert({ type: 'error', message: 'Please enter a valid test recipient email address.' });
      return;
    }
    setIsSendingTest(true);
    appendLog(`[TEST] Sending test follow-up preview email to ${testEmail}...`);
    try {
      // Mock company object for test
      const dummyCompany: Company = {
        name: 'Demo Technology Pvt Ltd',
        hrName: 'Test Recruiter',
        email: testEmail,
        industry: 'IT Services',
        status: 'Invited',
        sentDate: new Date().toLocaleDateString(),
        lastActionDate: new Date().toLocaleDateString(),
        followUpCount: 0,
        replyReceived: 'No',
        threadId: '',
        replyDate: '',
        aiClassification: '',
        nextAction: '',
        remarks: ''
      };

      if (onSendSingleFollowUp) {
        await onSendSingleFollowUp(dummyCompany, customBody, uploadedAttachments, attachBrochure, attachLetter);
      }
      appendLog(`[SUCCESS] Test follow-up email dispatched to ${testEmail}!`);
      setInlineAlert({ type: 'success', message: `Test follow-up successfully sent to ${testEmail}!` });
    } catch (err: any) {
      appendLog(`[ERROR] Test follow-up failed: ${err.message}`);
      setInlineAlert({ type: 'error', message: `Test follow-up failed: ${err.message}` });
    } finally {
      setIsSendingTest(false);
    }
  };

  const stopRequestedRef = useRef(false);

  const confirmStopBatch = () => {
    stopRequestedRef.current = true;
    appendLog('🛑 [USER ACTION] Stop signal confirmed! Aborting batch follow-up process immediately...');
    setIsProcessingBatch(false);
    setShowBatchModal(false);
    setShowStopModal(false);
    setInlineAlert({
      type: 'warning',
      message: 'Batch follow-up campaign stopped by user request.'
    });
  };

  const handleProcessBatchFollowUps = async () => {
    if (!onSendSingleFollowUp) return;
    setIsProcessingBatch(true);
    stopRequestedRef.current = false;
    const startTime = Date.now();
    setProgressState({
      isRunning: true,
      totalItems: filteredCompanies.length,
      completedItems: 0,
      startTime,
      title: 'Batch Follow-up Campaign'
    });
    appendLog(`[BATCH ACTION] Starting user-confirmed batch dispatch for ${filteredCompanies.length} pending companies...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const comp of filteredCompanies) {
      if (stopRequestedRef.current) {
        appendLog('🛑 [EMERGENCY STOP] Follow-up batch campaign halted by user command!');
        break;
      }
      const nextCount = (comp.followUpCount || 0) + 1;
      appendLog(`[DISPATCH ${successCount + failCount + 1}/${filteredCompanies.length}] Processing Follow-up #${nextCount} to ${comp.name} (${comp.email})...`);
      try {
        await onSendSingleFollowUp(comp, customBody, uploadedAttachments, attachBrochure, attachLetter);
        successCount++;
        setProgressState(prev => ({ ...prev, completedItems: successCount }));
        appendLog(`[SUCCESS] Follow-up #${nextCount} sent to ${comp.name}!`);
      } catch (err: any) {
        failCount++;
        appendLog(`[ERROR] Failed follow-up for ${comp.name}: ${err.message}`);
      }
    }

    setIsProcessingBatch(false);
    setProgressState(prev => ({ ...prev, isRunning: false }));
    if (!stopRequestedRef.current) {
      setShowBatchModal(false);
      setInlineAlert({
        type: failCount === 0 ? 'success' : 'warning',
        message: `Batch complete: ${successCount} follow-ups sent successfully, ${failCount} failed.`
      });
    }
  };

  return (
    <div id="followup_view_root" className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
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

      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-700/50">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
              <Repeat className="w-3 h-3 text-indigo-300" />
              Invitation Follow-Up Campaign Center
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Thread Reply Loop Active
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Invitation Follow-Up Campaign Center
          </h2>
          <p className="text-xs text-indigo-200/90 leading-relaxed max-w-2xl">
            Manage, customize, and manually confirm polite follow-up reminders to corporate recruiters. Follow-ups automatically loop back into original invitation Gmail threads with complete MIME header compliance.
          </p>
        </div>

        {/* Quick Mode Toggle & Summary Stats */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          {isProcessingBatch && (
            <button
              onClick={() => setShowStopModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 cursor-pointer animate-pulse border border-rose-400/50"
            >
              <OctagonX className="w-4 h-4" />
              STOP MAIL SENDING PROCESS NOW
            </button>
          )}
          <div className="flex items-center gap-2 bg-indigo-950/60 backdrop-blur-xs p-2 rounded-xl border border-indigo-700/40">
            <span className="text-xs text-indigo-200 font-semibold px-2">Testing Mode (2-min cycle)</span>
            <button
              onClick={() => {
                const next = !testingMode;
                setTestingMode(next);
                localStorage.setItem('geca_tpo_testing_mode', String(next));
                setInlineAlert({
                  type: 'info',
                  message: next ? 'Testing Mode Enabled: Follow-ups qualify after 2 minutes.' : 'Production Mode Active: Follow-ups qualify after 7 days.'
                });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                testingMode ? 'bg-amber-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  testingMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <span className="text-[10px] text-indigo-300 italic font-mono">
            {testingMode ? '⚡ Fast 2-min follow-up qualification active' : '📅 Standard 7-day follow-up qualification active'}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Invitations Sent</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5 block">{totalInvitedCount}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Active recruiting outreach threads</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Follow-Ups Pending Approval</span>
            <span className="text-2xl font-black text-indigo-600 font-mono mt-0.5 block">{eligibleFollowUpCompanies.length}</span>
            <span className="text-[10px] text-indigo-500 mt-1 block font-semibold">Requires manual user confirmation</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Responses Received</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">{totalRepliedCount}</span>
            <span className="text-[10px] text-emerald-600 mt-1 block font-medium">Interested / Drives Scheduled</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Safety Gate Status</span>
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1.5 block flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
              100% Manual Gate
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">No unapproved automatic dispatches</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Inline Banner Alert */}
      {inlineAlert && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-3xs transition-all ${
          inlineAlert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          inlineAlert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          inlineAlert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{inlineAlert.message}</span>
          </div>
          <button onClick={() => setInlineAlert(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
        </div>
      )}

      {/* Main Grid: Left Template Editor, Right Pending Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Follow-Up Template Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Invitation Follow-Up Template Editor
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Customize default text used for thread replies</p>
              </div>
              <button
                type="button"
                onClick={resetTemplateToDefault}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
              >
                Reset Default
              </button>
            </div>

            {/* Subject Line Display */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Thread Reply Subject Pattern
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[9px] text-slate-400 italic block">
                Automatically prepends "Re:" and matches active Gmail thread subject.
              </span>
            </div>

            {/* Editable Template Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center justify-between">
                <span>Follow-Up Email Body</span>
                <span className="text-[9px] text-indigo-600 font-normal">Exact GECA TPO Official Format</span>
              </label>
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full h-96 p-3 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            {/* Follow-Up File & Document Attachments Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Follow-Up File & Document Attachments</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono">
                  {uploadedAttachments.length + (attachBrochure ? 1 : 0) + (attachLetter ? 1 : 0)} Attached
                </span>
              </div>

              {/* Standard GECA Document Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={attachBrochure}
                    onChange={(e) => setAttachBrochure(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700 block truncate text-[11px]">GECA Placement Brochure PDF</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Brochure 26-27.pdf</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={attachLetter}
                    onChange={(e) => setAttachLetter(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700 block truncate text-[11px]">Invitation Letter PDF</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Invitation Letter 26-27.pdf</span>
                  </div>
                </label>
              </div>

              {/* Custom File Upload Input */}
              <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors rounded-xl p-3 text-center cursor-pointer group">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.txt"
                />
                <div className="flex flex-col items-center justify-center gap-1 py-1">
                  <FileUp className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-indigo-950">Upload Custom Documents / Files for Follow-Up</span>
                  <span className="text-[10px] text-slate-500">Supports PDF, Word, Excel, Images, ZIP (Included in Bulk System)</span>
                </div>
              </div>

              {/* List of Custom Uploaded Attachments */}
              {uploadedAttachments.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {uploadedAttachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg shadow-3xs text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 block truncate text-[11px]">{att.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block">{Math.round(att.size / 1024)} KB</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Send Box */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Send Test Follow-Up Email
              </span>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter test recipient email (e.g. tpo@geca.ac.in)..."
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleTestFollowUp}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingTest ? 'Sending...' : 'Test Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pending Follow-up Queue & Detailed Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs space-y-4">
            {/* Table Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Pending Invitation Follow-Ups Queue ({filteredCompanies.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Companies requiring manual approval for follow-up reminders</p>
              </div>

              {filteredCompanies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-3xs transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Batch Process ({filteredCompanies.length})
                </button>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Filter queue by company name, HR name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-sans text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Follow-Up Candidates ({eligibleFollowUpCompanies.length})</option>
                  <option value="fu1">Follow-Up #1 Only</option>
                  <option value="fu2">Follow-Up #2 Only</option>
                  <option value="fu3">Follow-Up #3 Only</option>
                  <option value="auto_reply">Auto-Replies Only ({eligibleFollowUpCompanies.filter(c => detectReplyCategory(c).isAutoReply).length})</option>
                </select>
              </div>
            </div>

            {/* Pending Companies Queue List */}
            {filteredCompanies.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-700 text-xs font-sans">No Follow-Ups Pending Approval</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  All invited recruiters have either received their scheduled follow-up reminders or replied to your campus invitation.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredCompanies.map((c, idx) => {
                  const lastDateStr = c.lastActionDate || c.sentDate || '';
                  const nextCount = (c.followUpCount || 0) + 1;
                  const replyCat = detectReplyCategory(c);

                  return (
                    <div
                      key={`${c.name}-${c.email}-${idx}`}
                      className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-all shadow-3xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs block truncate leading-snug">{c.name}</span>
                            {replyCat.isAutoReply && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0">
                                <Bot className="w-3 h-3 text-amber-700" />
                                Auto-Reply (Re-queued)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate font-mono mt-0.5">
                            {c.hrName || 'HR Lead'} &bull; {c.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Follow-Up #{nextCount} Due
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {c.industry || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-sans">
                        <div>
                          <span className="text-slate-400 block font-medium">Original Sent Date:</span>
                          <span className="font-semibold text-slate-700 font-mono">{c.sentDate || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Last Activity Date:</span>
                          <span className="font-semibold text-slate-700 font-mono">{lastDateStr || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Action Buttons for this specific company */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        {c.replyReceived === 'Yes' || c.remarks ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReplyCompany(c);
                              setIsReplyModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                            Inspect Received Reply
                          </button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCompany(c);
                              const hrName = c.hrName || 'HR Lead';
                              const compName = c.name || 'Corporate Partner';
                              setModalBody(customBody.replace(/\{HR Name\}/g, hrName).replace(/\{Company Name\}/g, compName));
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-3xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Review & Send
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!onCreateFollowUpDraft) return;
                              appendLog(`[ACTION] User confirmed drafting Follow-up #${nextCount} for ${c.name}...`);
                              try {
                                await onCreateFollowUpDraft(c, customBody);
                                appendLog(`[SUCCESS] Draft created in Gmail thread for ${c.name}!`);
                                setInlineAlert({ type: 'success', message: `Follow-up #${nextCount} draft created in Gmail for ${c.name}!` });
                              } catch (err: any) {
                                appendLog(`[ERROR] Failed to draft follow-up: ${err.message}`);
                                setInlineAlert({ type: 'error', message: `Failed to draft for ${c.name}: ${err.message}` });
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Create Draft
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Real-Time Logging Console */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2 font-mono">
        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
          <span className="text-indigo-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            GECA TPO Follow-Up Execution Console
          </span>
          <button
            onClick={() => setTerminalLogs(['Console cleared. Awaiting next command...'])}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            Clear Console
          </button>
        </div>
        <div className="h-32 overflow-y-auto space-y-1 text-[11px] text-slate-300 leading-relaxed scrollbar-thin">
          {terminalLogs.map((log, idx) => (
            <div key={idx} className="font-mono">{log}</div>
          ))}
        </div>
      </div>

      {/* Single Review & Confirmation Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 font-sans text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Manual Follow-Up Review & Confirmation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Replying directly to active Gmail thread for <strong className="text-slate-800">{editingCompany.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block">Recipient HR Email</span>
                  <span className="font-semibold text-slate-800 font-mono">{editingCompany.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Follow-up Level</span>
                  <span className="font-semibold text-indigo-600 font-mono">
                    Follow-up #{(editingCompany.followUpCount || 0) + 1} (Thread Loop)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                  Edit Follow-Up Message Content
                </label>
                <textarea
                  value={modalBody}
                  onChange={(e) => setModalBody(e.target.value)}
                  className="w-full h-80 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-800 font-sans leading-relaxed resize-none focus:outline-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs font-sans rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!onSendSingleFollowUp}
                onClick={async () => {
                  if (!onSendSingleFollowUp) return;
                  const company = editingCompany;
                  setEditingCompany(null);
                  appendLog(`[ACTION] User confirmed and authorized manual dispatch of Follow-up to ${company.name}...`);
                  try {
                    await onSendSingleFollowUp(company, modalBody, uploadedAttachments, attachBrochure, attachLetter);
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
                  const company = editingCompany;
                  setEditingCompany(null);
                  appendLog(`[ACTION] User confirmed and authorized drafting Follow-up for ${company.name}...`);
                  try {
                    await onCreateFollowUpDraft(company, modalBody, uploadedAttachments, attachBrochure, attachLetter);
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

      {/* Batch Processing Review & Confirmation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base font-sans">
                Confirm Batch Follow-Up Campaign Dispatch
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to dispatch polite follow-up emails to <strong className="text-slate-900">{filteredCompanies.length} companies</strong> currently pending in your follow-up queue.
            </p>

            {/* Live Ticking Countdown Timer inside Batch Modal */}
            {isProcessingBatch && (
              <CountdownTimer
                isRunning={progressState.isRunning}
                totalItems={progressState.totalItems}
                completedItems={progressState.completedItems}
                startTime={progressState.startTime}
                secPerItem={2}
                title={progressState.title}
                onStop={() => setShowStopModal(true)}
              />
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 max-h-40 overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipients List:</span>
              {filteredCompanies.map((comp, idx) => (
                <div key={`${comp.name}-${comp.email}-${idx}`} className="text-xs text-slate-700 flex items-center justify-between font-mono">
                  <span>{comp.name} ({comp.email})</span>
                  <span className="text-[10px] text-indigo-600 font-bold">Follow-Up #{(comp.followUpCount || 0) + 1}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 italic">
              All messages will be sent directly inside their original invitation Gmail threads with complete MIME header threading.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {isProcessingBatch ? (
                <button
                  type="button"
                  onClick={() => setShowStopModal(true)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse"
                >
                  <OctagonX className="w-4 h-4" />
                  STOP MAIL SENDING NOW
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBatchFollowUps}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-3xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Confirm & Send All Batch Follow-Ups
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stop Follow-Ups Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <OctagonX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-sans">Stop Follow-Up Dispatch?</h3>
                <p className="text-xs text-slate-500 font-sans">Confirm follow-up campaign interruption</p>
              </div>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5 font-sans">
              <p className="font-semibold">Are you sure you want to stop the follow-up batch process?</p>
              <p className="text-rose-700 leading-relaxed">
                The current follow-up email being processed will finalize, but all remaining queued follow-ups will be cancelled immediately.
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
                onClick={confirmStopBatch}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs font-sans rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <OctagonX className="w-3.5 h-3.5" />
                Yes, Stop Follow-Ups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Reply Modal Viewer */}
      <ActualReplyModal
        company={selectedReplyCompany}
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        onSaveRemarks={onSaveRemarks}
      />
    </div>
  );
}
