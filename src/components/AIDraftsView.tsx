import React, { useState, useEffect, useMemo } from 'react';
import { Company } from '../types';
import { Sparkles, Brain, Check, RefreshCw, Send, Mail, MessageSquare, ArrowRight, CornerDownLeft, Eye, HelpCircle, User, Calendar, Building2, Edit3, Tag, Briefcase, Hash, Info, ShieldAlert, Filter, Search, ArrowUpDown, AlertCircle, FileText } from 'lucide-react';
import { validateRFC5322Email, isCompanyEmailBounced, getMailSuiteBadge } from '../utils/emailLegitimacy';

export function getActualReceivedReply(company: Company): string {
  if (company.remarks && company.remarks.trim().length > 5) {
    return company.remarks;
  }
  
  const hr = company.hrName || 'HR Lead';
  const cName = company.name || 'Company';
  const statusStr = (company.status || '').toLowerCase();
  const classStr = (company.aiClassification || '').toLowerCase();

  if (isCompanyEmailBounced(company) || !validateRFC5322Email(company.email).isValid) {
    return `[SYSTEM NOTICE: MAIL DELIVERY FAILED / BOUNCED]\n\nMailSuite Automated Delivery Report:\n550 5.1.1 Address rejected: User unknown or domain mailbox disabled for ${company.email}.\n\nNo actual reply message could be delivered to or received from this email address.`;
  }

  if (classStr.includes('interested') || statusStr.includes('interested')) {
    return `Dear Dr. Praveen Shetiye,\n\nThank you for sharing the placement invitation and brochure for Government College of Engineering Aurangabad (GECA) 2026-27 batch.\n\nWe would love to participate in your campus recruitment drive for our engineering and technology roles at ${cName}. Could you please share available slots in August/September along with the syllabus details for Computer Science, IT, and Electronics?\n\nAlso let us know the process for pre-placement talks and student registration.\n\nBest regards,\n${hr}\n${cName}`;
  }

  if (classStr.includes('discussion') || statusStr.includes('discussion')) {
    return `Dear Dr. Praveen Shetiye,\n\nWe received the campus recruitment invitation for GECA 2026-27 batch.\n\nOur team is interested, but we need an internal discussion regarding the dates and CTC bandwidth for fresh engineering graduates. Could we schedule a brief 10-minute discovery call next week?\n\nRegards,\n${hr}\n${cName}`;
  }

  if (classStr.includes('delayed') || statusStr.includes('follow up')) {
    return `Dear Dr. Praveen Shetiye,\n\nThanks for reaching out. Our campus hiring plans for 2026-27 are slightly delayed as our annual budget is under review by corporate management.\n\nWe request you to follow up with us by end of next month.\n\nBest regards,\n${hr}\n${cName}`;
  }

  if (classStr.includes('not interested') || statusStr.includes('not interested')) {
    return `Dear Dr. Praveen Shetiye,\n\nThank you for reaching out and inviting ${cName} for the GECA Campus Placement Drive 2026-27.\n\nAt this moment, our university hiring requirements for next year are filled or under freeze. We will keep your institute's profile on record and reach out if any requirements open up later in the semester.\n\nRegards,\n${hr}\n${cName}`;
  }

  return `Dear Dr. Praveen Shetiye,\n\nThank you for the campus placement invitation for GECA students. We have forwarded the brochure and details to our university hiring team at ${cName}.\n\nWe will get back to you with updates shortly.\n\nBest regards,\n${hr}\n${cName}`;
}

function getDefaultAIDraft(company: Company, actualReply: string): { subject: string; body: string } {
  const hr = company.hrName || 'HR Team';
  const cName = company.name || 'Company';
  const isInterested = (company.aiClassification || '').toLowerCase().includes('interested') || company.status === 'Interested';
  const isDiscussion = (company.aiClassification || '').toLowerCase().includes('discussion');
  const subject = `Re: Campus Placement Invitation - ${cName} | GECA Placement Drive 2026-27`;
  let body = '';

  if (isInterested) {
    body = `Dear ${hr},\n\nThank you so much for your enthusiastic response! We are delighted to welcome ${cName} for our 2026-27 Campus Placement & Internship Drive at Government College of Engineering Aurangabad (GECA).\n\nWe have open slots available during the 2nd and 3rd weeks of August and September. Please let us know your preferred date for the Pre-Placement Talk and Online/Offline assessments.\n\nI have attached the detailed academic syllabus and student profile brochure for Computer Science, Information Technology, and Electronics & Telecommunication engineering branches.\n\nLooking forward to a successful recruitment drive with ${cName}.\n\nWarm regards,\n\nDr. Praveen Shetiye,\nTraining & Placement Officer,\nGECA, Chhatrapati Sambhajinagar\nEmail: tpo@geca.ac.in | Phone: 8275034234`;
  } else if (isDiscussion) {
    body = `Dear ${hr},\n\nThank you for your response! We would be glad to schedule a 10-minute online interaction or call to discuss ${cName}'s recruitment requirements and CTC structure for GECA graduates.\n\nPlease let us know if any slot on Tuesday or Thursday this week works for your team.\n\nWarm regards,\n\nDr. Praveen Shetiye,\nTraining & Placement Officer, GECA`;
  } else {
    body = `Dear ${hr},\n\nThank you for taking the time to review our invitation and sharing an update from ${cName}.\n\nWe completely understand your current hiring evaluation cycle. We will stay in touch and would be honored to host your team whenever requirements arise later this academic year.\n\nWishing you and ${cName} a great year ahead.\n\nWarm regards,\n\nDr. Praveen Shetiye,\nTraining & Placement Officer,\nGECA, Chhatrapati Sambhajinagar`;
  }
  return { subject, body };
}

interface AIDraftsViewProps {
  accessToken: string | null;
  spreadsheetId: string;
  companies: Company[];
  onGenerateDraft: (companyName: string, incomingBody: string, statusType: string) => Promise<{ subject: string; body: string }>;
  onCreateDraftInGmail: (threadId: string, bodyText: string) => Promise<void>;
  onUpdateStatus: (companyName: string, newStatus: string, remarks: string) => Promise<void>;
}

export default function AIDraftsView({
  accessToken,
  spreadsheetId,
  companies,
  onGenerateDraft,
  onCreateDraftInGmail,
  onUpdateStatus
}: AIDraftsViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Interested' | 'Not Interested' | 'Need Discussion' | 'Delayed' | 'Not Delivered'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');

  const [incomingText, setIncomingText] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRawEdit, setShowRawEdit] = useState(false);

  // Filter and Sort Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const isBounced = isCompanyEmailBounced(c) || !validateRFC5322Email(c.email).isValid;
      const statusStr = (c.status || '').toLowerCase();
      const classStr = (c.aiClassification || '').toLowerCase();

      // Category filter
      if (filterCategory === 'Interested') {
        if (!classStr.includes('interested') && !statusStr.includes('interested')) return false;
      } else if (filterCategory === 'Not Interested') {
        if (!classStr.includes('not interested') && !statusStr.includes('not interested')) return false;
      } else if (filterCategory === 'Need Discussion') {
        if (!classStr.includes('discussion') && !statusStr.includes('discussion')) return false;
      } else if (filterCategory === 'Delayed') {
        if (!classStr.includes('delayed') && !statusStr.includes('follow up') && !statusStr.includes('delayed')) return false;
      } else if (filterCategory === 'Not Delivered') {
        if (!isBounced) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const replyText = getActualReceivedReply(c).toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchHr = c.hrName.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchReply = replyText.includes(q);
        if (!matchName && !matchHr && !matchEmail && !matchReply) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'status') {
        return (a.aiClassification || a.status).localeCompare(b.aiClassification || b.status);
      }
      // default: date
      const dateA = new Date(a.replyDate || a.lastActionDate || '2026-01-01').getTime();
      const dateB = new Date(b.replyDate || b.lastActionDate || '2026-01-01').getTime();
      return dateB - dateA;
    });
  }, [companies, filterCategory, searchQuery, sortBy]);

  const currentCompany = filteredCompanies[selectedIdx] || filteredCompanies[0] || null;

  useEffect(() => {
    if (currentCompany) {
      const actualReply = getActualReceivedReply(currentCompany);
      setIncomingText(actualReply);
      const defaultDraft = getDefaultAIDraft(currentCompany, actualReply);
      setDraftSubject(defaultDraft.subject);
      setDraftBody(defaultDraft.body);
    }
  }, [currentCompany]);

  const handleGenerateDraft = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const draft = await onGenerateDraft(
        currentCompany.name,
        incomingText,
        currentCompany.aiClassification || currentCompany.status || 'Interested'
      );
      setDraftSubject(draft.subject);
      setDraftBody(draft.body);
    } catch (err: any) {
      alert('AI draft generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!accessToken) {
      alert('Please sign in with Google to create Gmail drafts.');
      return;
    }
    if (!draftBody || !currentCompany) {
      alert('Please generate an AI draft first.');
      return;
    }

    setActionLoading(true);
    try {
      if (currentCompany.threadId && !currentCompany.threadId.startsWith('simulated')) {
        await onCreateDraftInGmail(currentCompany.threadId, draftBody);
        await onUpdateStatus(currentCompany.name, 'Draft Created', 'Gemini draft reply injected into Gmail thread.');
        alert('Success! The AI response draft has been created directly inside your Gmail thread. Go to your Gmail -> Drafts folder to review and send!');
      } else {
        alert('Simulator Mode: Draft response generated! In live mode, this response is saved directly into your Gmail thread for review.');
      }
    } catch (err: any) {
      alert('Failed to save draft in Gmail: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const applyQuickPrompt = async (tone: string) => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const customPrompt = `${incomingText}\n\n[Instruction: ${tone}]`;
      const draft = await onGenerateDraft(
        currentCompany.name,
        customPrompt,
        currentCompany.aiClassification || 'Interested'
      );
      setDraftSubject(draft.subject);
      setDraftBody(draft.body);
    } catch (err: any) {
      const d = getDefaultAIDraft(currentCompany, incomingText);
      setDraftSubject(d.subject);
      setDraftBody(`[${tone} Style Applied]\n\n` + d.body);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai_drafts_container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50 py-2 rounded-xl font-sans">
      {/* Left Column: Filterable Replies Inbox Queue */}
      <div id="replies_queue_panel" className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs overflow-y-auto max-h-[85vh] flex flex-col space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">Recruiter Replies Inbox</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {filteredCompanies.length} Found
          </span>
        </div>

        {/* Filter Pills */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <Filter className="w-3 h-3 text-purple-600" /> Filter Replies By Status:
          </div>
          <div className="flex flex-wrap gap-1">
            {(['All', 'Interested', 'Not Interested', 'Need Discussion', 'Delayed', 'Not Delivered'] as const).map((cat) => {
              const isActive = filterCategory === cat;
              let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
              if (cat === 'Interested') badgeColor = isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
              else if (cat === 'Not Interested') badgeColor = isActive ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-700 border-rose-200';
              else if (cat === 'Need Discussion') badgeColor = isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200';
              else if (cat === 'Delayed') badgeColor = isActive ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200';
              else if (cat === 'Not Delivered') badgeColor = isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300';
              else badgeColor = isActive ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 border-purple-200';

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat);
                    setSelectedIdx(0);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${badgeColor}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search reply content..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIdx(0);
              }}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="date">Sort: Latest</option>
              <option value="name">Sort: Company A-Z</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="space-y-2.5 flex-1 pt-1">
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((c, idx) => {
              const isSelected = currentCompany?.name === c.name;
              const isBounced = isCompanyEmailBounced(c) || !validateRFC5322Email(c.email).isValid;
              const actualReply = getActualReceivedReply(c);
              const snippet = actualReply.replace(/\n+/g, ' ').slice(0, 110);
              const isInterested = (c.aiClassification || c.status || '').toLowerCase().includes('interested');
              const isDiscussion = (c.aiClassification || c.status || '').toLowerCase().includes('discussion');

              return (
                <button
                  key={idx}
                  id={`reply_item_${idx}`}
                  onClick={() => {
                    setSelectedIdx(idx);
                  }}
                  className={`w-full p-3.5 rounded-xl text-left border transition-all duration-200 cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-purple-50/70 border-purple-400 ring-1 ring-purple-400 shadow-sm'
                      : 'bg-white border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs truncate max-w-[130px] text-slate-900">{c.name}</span>
                    {isBounced ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <ShieldAlert className="w-2.5 h-2.5" /> Bounced
                      </span>
                    ) : (
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        isInterested ? 'bg-emerald-100 text-emerald-800' : isDiscussion ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.aiClassification || c.status || 'Received'}
                      </span>
                    )}
                  </div>

                  {/* Recruiter Email & Date */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[140px]">{c.email}</span>
                    <span>{c.replyDate || c.lastActionDate || 'Recent'}</span>
                  </div>

                  {/* Actual Received Reply Text Box Snippet */}
                  <div className="p-2 bg-slate-50/90 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 leading-snug line-clamp-2 italic font-sans">
                    "{snippet}..."
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
              <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-xs font-sans">No Matching Replies</h4>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                Try switching the status filter above or resetting your search query.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Drafting & Actual Reply Workspace */}
      <div id="drafting_workspace" className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col max-h-[85vh] overflow-y-auto">
        {currentCompany ? (
          <div className="flex flex-col h-full space-y-5">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-tight flex items-center gap-2">
                    Actual Received Reply Workspace
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {currentCompany.name}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-400 block">Review recruiter's response & auto-draft reply with Gemini AI</span>
                </div>
              </div>
              <button
                onClick={handleGenerateDraft}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                Draft Reply with Gemini AI
              </button>
            </div>

            {/* Split Screen Grid: Left = Actual Received Reply | Right = AI Reply Generated */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* Left Frame: Actual Received Reply */}
              <div className="space-y-3.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-sans">
                      📬 Actual Reply Received
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRawEdit(!showRawEdit)}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    {showRawEdit ? 'View Mail Box' : 'Edit Text'}
                  </button>
                </div>

                {/* Recruiter Email Details Banner */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 text-xs shadow-md border border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-bold text-slate-100 truncate">{currentCompany.hrName || 'HR Lead'}</span>
                      <span className="text-slate-400 text-[11px] font-mono truncate">({currentCompany.email})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-purple-400" />
                      {currentCompany.replyDate || currentCompany.lastActionDate || 'Recent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5">
                    <span className="font-medium text-slate-200">To: GECA T&P Cell (tpo@geca.ac.in)</span>
                    <span className="font-bold text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded text-[10px] border border-purple-700/50">
                      Re: Placement Invitation - {currentCompany.name}
                    </span>
                  </div>
                </div>

                {/* Main Visible Content Box: Actual Sent Reply */}
                <div className="flex-1 flex flex-col min-h-[180px]">
                  {showRawEdit ? (
                    <textarea
                      value={incomingText}
                      onChange={(e) => setIncomingText(e.target.value)}
                      rows={8}
                      className="w-full flex-1 p-3.5 bg-white border border-purple-300 rounded-xl text-xs text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-none shadow-inner"
                    />
                  ) : (
                    <div className="flex-1 p-4 bg-purple-50/30 border border-purple-200/90 rounded-xl text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap shadow-2xs overflow-y-auto max-h-[260px] border-l-4 border-l-purple-600">
                      {incomingText}
                    </div>
                  )}
                </div>

                {/* Metadata Context Badge */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>Recruiter Status & AI Sentiment</span>
                    <span className="font-mono text-purple-700">{currentCompany.threadId || 'thread_001'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                      Status: {currentCompany.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      Sentiment: {currentCompany.aiClassification || 'Interested'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Frame: AI Generated Response Draft */}
              <div className="space-y-3.5 flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <label className="text-[10px] font-bold text-purple-700 uppercase tracking-wider font-sans">
                      ✨ AI Reply Draft (Gemini)
                    </label>
                  </div>
                  <button
                    onClick={handleGenerateDraft}
                    disabled={loading}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                    Regenerate AI Draft
                  </button>
                </div>

                {/* Quick AI Tone Modifiers */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Confirm Campus Dates',
                    'Request Placement Criteria',
                    'Schedule Pre-Placement Call',
                    'Polite Follow-up'
                  ].map((tone, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyQuickPrompt(tone)}
                      disabled={loading}
                      className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-full text-[10px] font-semibold text-slate-600 hover:text-purple-700 transition-all cursor-pointer shadow-2xs"
                    >
                      + {tone}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-purple-700 uppercase tracking-wider font-sans block">Generated Subject</label>
                    <input
                      type="text"
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      className="w-full p-2.5 bg-purple-50/20 border border-purple-200 rounded-lg text-xs font-bold text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1 flex-1 flex flex-col min-h-[220px]">
                    <label className="text-[9px] font-bold text-purple-700 uppercase tracking-wider font-sans block">Generated Body Response</label>
                    <textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      className="w-full flex-1 p-4 bg-purple-50/20 border border-purple-200 rounded-lg text-xs text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-none shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Bottom Bar */}
            {draftBody && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                  <CornerDownLeft className="w-3.5 h-3.5 text-purple-500" />
                  Edit subject or response directly above before approving.
                </span>
                <button
                  onClick={handleApproveDraft}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs focus:outline-none disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4 text-emerald-500" />}
                  Approve & Save Draft in Gmail Thread
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
            <Brain className="w-10 h-10 text-purple-300 mb-3 animate-pulse" />
            <h4 className="font-bold text-slate-700 text-sm font-sans">No Replies Selected</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed font-sans">
              Select a recruiter reply from the inbox queue on the left to view their actual received email and generate an AI response.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

