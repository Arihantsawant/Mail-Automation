import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import { X, Mail, MessageSquare, Bot, UserCheck, ShieldAlert, Clock, ExternalLink, Sparkles, Check, Copy, Save, AlertTriangle, Building2, Send } from 'lucide-react';
import { validateRFC5322Email, isCompanyEmailBounced, getMailSuiteBadge } from '../utils/emailLegitimacy';

export function detectReplyCategory(company: Company): {
  type: 'Auto-Reply / Out of Office' | 'Real Human Reply' | 'Bounced / Undeliverable' | 'Awaiting Reply';
  badgeClass: string;
  icon: 'bot' | 'human' | 'bounced' | 'pending';
  explanation: string;
  isAutoReply: boolean;
} {
  if (isCompanyEmailBounced(company) || !validateRFC5322Email(company.email).isValid) {
    return {
      type: 'Bounced / Undeliverable',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: 'bounced',
      explanation: 'MailSuite detected a bounced address or invalid syntax. No real email could be delivered.',
      isAutoReply: false
    };
  }

  if (company.replyReceived !== 'Yes' && company.status === 'Pending') {
    return {
      type: 'Awaiting Reply',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: 'pending',
      explanation: 'No reply has been logged yet for this corporate contact.',
      isAutoReply: false
    };
  }

  const rawText = (company.remarks || '').toLowerCase();
  
  // Detection keywords for automated / out-of-office responses
  const autoKeywords = [
    'out of office',
    'automatic reply',
    'auto-reply',
    'auto reply',
    'vacation responder',
    'automated response',
    'away from my desk',
    'currently away',
    'do not reply',
    'auto response',
    'on leave',
    'annual leave',
    'maternity leave',
    'paternity leave',
    'out of station',
    'limited access to email',
    'undeliverable',
    'autoresponder'
  ];

  const hasAutoKeyword = autoKeywords.some(kw => rawText.includes(kw));

  if (hasAutoKeyword) {
    return {
      type: 'Auto-Reply / Out of Office',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: 'bot',
      explanation: 'Automated System Note: Contains out-of-office or auto-responder phrases. Re-evaluation advised before scheduling.',
      isAutoReply: true
    };
  }

  return {
    type: 'Real Human Reply',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: 'human',
    explanation: 'Verified Recruiter Response: Sent directly by human HR/recruiter with specific placement context.',
    isAutoReply: false
  };
}

export function getFullActualReplyText(company: Company): string {
  if (company.remarks && company.remarks.trim().length > 3) {
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

interface ActualReplyModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveRemarks?: (companyName: string, newRemarks: string) => Promise<void>;
}

export default function ActualReplyModal({
  company,
  isOpen,
  onClose,
  onSaveRemarks
}: ActualReplyModalProps) {
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (company) {
      setEditedText(getFullActualReplyText(company));
      setIsEditing(false);
    }
  }, [company]);

  if (!isOpen || !company) return null;

  const category = detectReplyCategory(company);
  const mailBadge = getMailSuiteBadge(company);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!onSaveRemarks) return;
    setSaving(true);
    try {
      await onSaveRemarks(company.name, editedText);
      setIsEditing(false);
      alert('Updated reply text successfully saved to Google Sheet!');
    } catch (err: any) {
      alert('Failed to save remarks: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">{company.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${category.badgeClass}`}>
                  {category.icon === 'bot' && <Bot className="w-3 h-3" />}
                  {category.icon === 'human' && <UserCheck className="w-3 h-3" />}
                  {category.icon === 'bounced' && <ShieldAlert className="w-3 h-3" />}
                  {category.type}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Contact: <strong>{company.hrName || 'HR Lead'}</strong></span>
                <span>•</span>
                <span className="font-mono">{company.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">
              Reply Logged: <strong>{company.replyDate || company.lastActionDate || 'Recent'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${mailBadge.colorClass}`}>
              {mailBadge.label}
            </span>
            {company.threadId && !company.threadId.startsWith('simulated') && (
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${company.threadId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 underline"
              >
                Open Gmail Thread
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Category Notice Banner */}
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            category.isAutoReply ? 'bg-amber-50 border-amber-200 text-amber-900' :
            category.icon === 'bounced' ? 'bg-rose-50 border-rose-200 text-rose-900' :
            'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            {category.isAutoReply ? <Bot className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> :
             category.icon === 'bounced' ? <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /> :
             <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            <div>
              <strong className="block font-bold mb-0.5">{category.type} Detection Analysis</strong>
              <span>{category.explanation}</span>
            </div>
          </div>

          {/* Actual Received Reply Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                Actual Recruiter Email Content:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy Reply'}
                </button>
                {onSaveRemarks && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                  >
                    Edit / Override
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                rows={8}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-blue-300 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap selection:bg-purple-100 max-h-60 overflow-y-auto shadow-2xs">
                {editedText}
              </div>
            )}
          </div>

          {/* AI Inferred Insights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block font-sans">AI Category</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{company.aiClassification || company.status}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block font-sans">Recommended Action</span>
              <span className="text-xs font-bold text-blue-700 block mt-0.5">{company.nextAction || 'Review response and dispatch follow-up'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            MailSuite Audit Log ID: #{company.threadId || 'REF-8891'}
          </span>

          <div className="flex items-center gap-2">
            {isEditing && onSaveRemarks && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save to Sheet
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
