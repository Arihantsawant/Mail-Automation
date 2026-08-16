import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Company } from '../types';
import { Sparkles, Users, Send, MessageSquare, Heart, Clock, Calendar, CheckSquare, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, MailCheck, MailX, Search, Filter, AlertOctagon, CheckCircle2, Eye, Bot, UserCheck } from 'lucide-react';
import { validateRFC5322Email, isCompanyEmailBounced, getMailSuiteBadge } from '../utils/emailLegitimacy';
import ActualReplyModal, { detectReplyCategory } from './ActualReplyModal';

interface DashboardViewProps {
  companies: Company[];
  onSaveRemarks?: (companyName: string, newRemarks: string) => Promise<void>;
}

export default function DashboardView({ companies, onSaveRemarks }: DashboardViewProps) {
  const [emailFilter, setEmailFilter] = useState<'All' | 'Legit' | 'Bounced'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReplyCompany, setSelectedReplyCompany] = useState<Company | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  const hasData = companies.length > 0;
  
  const displayCompanies = companies;

  // 1. Calculate Summary Counts
  const totalCompanies = displayCompanies.length;
  const emailsSent = displayCompanies.filter(c => c.status !== 'Pending').length;
  const repliesReceived = displayCompanies.filter(c => c.replyReceived === 'Yes' || c.status === 'Replied' || c.status === 'Interested' || c.status === 'Not Interested' || c.status === 'Drive Scheduled').length;
  const interestedCompanies = displayCompanies.filter(c => c.status === 'Interested' || c.status === 'Drive Scheduled').length;
  const pendingReplies = displayCompanies.filter(c => c.status === 'Invited' || c.status.startsWith('Follow Up')).length;
  const followUpsSent = displayCompanies.reduce((acc, c) => acc + (c.followUpCount || 0), 0);
  const campusDrivesScheduled = displayCompanies.filter(c => c.status === 'Drive Scheduled').length;
  const noResponseCompanies = displayCompanies.filter(c => c.status === 'No Response').length;
  const rejectedCompanies = displayCompanies.filter(c => c.status === 'Not Interested').length;

  // 1b. Calculate Mail Legitimacy & Bounced Stats
  const legitCompanies = displayCompanies.filter(c => validateRFC5322Email(c.email).isValid && !isCompanyEmailBounced(c));
  const bouncedCompanies = displayCompanies.filter(c => !validateRFC5322Email(c.email).isValid || isCompanyEmailBounced(c));
  const legitCount = legitCompanies.length;
  const bouncedCount = bouncedCompanies.length;
  const deliverabilityRate = totalCompanies > 0 ? Math.round((legitCount / totalCompanies) * 100) : 0;

  // Filtered Email Audit List
  const filteredAuditCompanies = displayCompanies.filter(c => {
    const isBounced = !validateRFC5322Email(c.email).isValid || isCompanyEmailBounced(c);
    if (emailFilter === 'Legit' && isBounced) return false;
    if (emailFilter === 'Bounced' && !isBounced) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchHr = c.hrName.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchHr) return false;
    }
    return true;
  });

  // 2. Prepare Data for Status Pie Chart
  const statusCounts = displayCompanies.reduce((acc: { [key: string]: number }, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  const COLORS = {
    'Pending': '#94a3b8',        // slate
    'Invited': '#60a5fa',        // blue
    'Replied': '#c084fc',        // purple
    'Interested': '#34d399',     // green
    'Not Interested': '#f87171',  // red
    'Follow Up 1': '#fbbf24',    // yellow
    'Follow Up 2': '#f59e0b',    // orange
    'Follow Up 3': '#ea580c',    // dark orange
    'No Response': '#475569',    // charcoal
    'Drive Scheduled': '#06b6d4' // cyan
  } as any;

  // 3. Prepare Data for Industry Bar Chart
  const industryStats = displayCompanies.reduce((acc: { [key: string]: { sent: number, replies: number } }, c) => {
    const ind = c.industry || 'Unknown';
    if (!acc[ind]) acc[ind] = { sent: 0, replies: 0 };
    if (c.status !== 'Pending') acc[ind].sent += 1;
    if (c.replyReceived === 'Yes' || ['Replied', 'Interested', 'Drive Scheduled', 'Not Interested'].includes(c.status)) {
      acc[ind].replies += 1;
    }
    return acc;
  }, {});

  const barData = Object.keys(industryStats).map(ind => ({
    name: ind,
    'Sent Invitations': industryStats[ind].sent,
    'Replies': industryStats[ind].replies
  }));

  return (
    <div id="dashboard_container" className="space-y-6 bg-slate-50 py-2 rounded-xl">
      {/* Empty State Onboarding Info Bar */}
      {!hasData && (
        <div id="sim_info_bar" className="flex items-center gap-3 p-5 bg-blue-50/70 border border-blue-100 rounded-xl max-w-4xl mx-auto shadow-2xs">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <strong className="text-xs text-blue-900 block font-sans">Google Sheets CRM Connection Required</strong>
            <p className="text-xs text-blue-800 leading-relaxed font-sans mt-0.5">
              Welcome to your live placement analytics. To begin tracking placement invitations and AI-analyzed recruiter responses, please go to the <strong>"Placement CRM"</strong> tab to connect or create a Google Sheet, and add or import your corporate contacts.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div id="metric_cards_grid" className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Metric 1 */}
        <div id="card_total_companies" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative overflow-hidden flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">Total Companies</span>
            <span className="text-xl font-bold text-slate-800 block mt-1 font-sans">{totalCompanies}</span>
          </div>
          <div className="p-2 rounded bg-slate-50 text-slate-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2 */}
        <div id="card_emails_sent" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative overflow-hidden flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">Invitations Sent</span>
            <span className="text-xl font-bold text-blue-600 block mt-1 font-sans">{emailsSent}</span>
          </div>
          <div className="p-2 rounded bg-blue-50 text-blue-500">
            <Send className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3 */}
        <div id="card_replies_received" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative overflow-hidden flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">Replies Captured</span>
            <span className="text-xl font-bold text-purple-600 block mt-1 font-sans">{repliesReceived}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium font-sans">
              Response Rate: {emailsSent > 0 ? Math.round((repliesReceived / emailsSent) * 100) : 0}%
            </span>
          </div>
          <div className="p-2 rounded bg-purple-50 text-purple-500">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 4 */}
        <div id="card_interested" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative overflow-hidden flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">Interested Partners</span>
            <span className="text-xl font-bold text-emerald-600 block mt-1 font-sans">{interestedCompanies}</span>
          </div>
          <div className="p-2 rounded bg-emerald-50 text-emerald-500">
            <Heart className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 5: Legit / Verified Email Accounts */}
        <div id="card_legit_emails" className="bg-white border border-emerald-200/90 rounded-xl p-4 shadow-xs relative overflow-hidden flex items-start justify-between bg-emerald-50/20">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider font-sans">Legit / Working Emails</span>
            <span className="text-xl font-bold text-emerald-700 block mt-1 font-sans">{legitCount}</span>
            <span className="text-[9px] text-emerald-600 block mt-0.5 font-bold font-sans">
              Deliverability: {deliverabilityRate}%
            </span>
          </div>
          <div className="p-2 rounded bg-emerald-100 text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 6: Bounced / Not Working Emails */}
        <div id="card_bounced_emails" className="bg-white border border-rose-200/90 rounded-xl p-4 shadow-xs relative overflow-hidden flex items-start justify-between bg-rose-50/20">
          <div>
            <span className="text-[10px] font-bold text-rose-700 block uppercase tracking-wider font-sans">Bounced / Undeliverable</span>
            <span className="text-xl font-bold text-rose-700 block mt-1 font-sans">{bouncedCount}</span>
            <span className="text-[9px] text-rose-600 block mt-0.5 font-bold font-sans">
              {totalCompanies > 0 ? Math.round((bouncedCount / totalCompanies) * 100) : 0}% of Total
            </span>
          </div>
          <div className="p-2 rounded bg-rose-100 text-rose-700">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Auxiliary Mini Cards */}
      <div id="auxiliary_metrics_grid" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Pending Replies</span>
            <span className="text-base font-bold text-slate-700 block leading-tight font-sans">{pendingReplies}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <Send className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Followups Dispatched</span>
            <span className="text-base font-bold text-slate-700 block leading-tight font-sans">{followUpsSent}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Drives Scheduled</span>
            <span className="text-base font-bold text-slate-700 block leading-tight font-sans">{campusDrivesScheduled}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Declined / Not Interested</span>
            <span className="text-base font-bold text-slate-700 block leading-tight font-sans">{rejectedCompanies}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">No Response</span>
            <span className="text-base font-bold text-slate-700 block leading-tight font-sans">{noResponseCompanies}</span>
          </div>
        </div>
      </div>

      {/* Real-Time Email Legitimacy Audit Section */}
      {hasData && (
        <div id="email_legitimacy_dashboard_section" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 font-sans">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <MailCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight flex items-center gap-2">
                  MailSuite Email Legitimacy & Bounce Status Audit
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Status Audit
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time RFC 5322 validation and bounce status audit across all corporate recruiter email accounts.
                </p>
              </div>
            </div>

            {/* Filter Pills and Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search company or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setEmailFilter('All')}
                  className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${
                    emailFilter === 'All' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({totalCompanies})
                </button>
                <button
                  type="button"
                  onClick={() => setEmailFilter('Legit')}
                  className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1 ${
                    emailFilter === 'Legit' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  Legit ({legitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEmailFilter('Bounced')}
                  className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1 ${
                    emailFilter === 'Bounced' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  Bounced ({bouncedCount})
                </button>
              </div>
            </div>
          </div>

          {/* Audit List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Company & Recruiter</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">MailSuite Delivery Badge</th>
                  <th className="py-2.5 px-3">Actual Recruiter Reply</th>
                  <th className="py-2.5 px-3 text-right">Dispatch Safeguard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditCompanies.length > 0 ? (
                  filteredAuditCompanies.map((comp, idx) => {
                    const rfcCheck = validateRFC5322Email(comp.email);
                    const isBounced = !rfcCheck.isValid || isCompanyEmailBounced(comp);
                    const badge = getMailSuiteBadge(comp);
                    const category = detectReplyCategory(comp);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{comp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{comp.hrName || 'HR Lead'}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-800 font-medium">
                          {comp.email}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.colorClass}`}>
                            {badge.isBounced ? (
                              <MailX className="w-3 h-3 text-rose-600" />
                            ) : (
                              <MailCheck className="w-3 h-3 text-emerald-600" />
                            )}
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${category.badgeClass}`}>
                              {category.icon === 'bot' && <Bot className="w-3 h-3" />}
                              {category.icon === 'human' && <UserCheck className="w-3 h-3" />}
                              {category.type}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReplyCompany(comp);
                                setIsReplyModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-purple-600" />
                              Inspect Actual Reply
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isBounced ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertOctagon className="w-3 h-3 text-amber-600" /> Auto-Excluded from Dispatches
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active in Campaign Queue
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No email records matched the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

      {/* Charts Panels / Empty State */}
      {hasData ? (
        <div id="charts_layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Chart: Status Distribution */}
          <div id="panel_pie_chart" className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
            <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider font-sans">Pipeline Funnel Distribution</h3>
            <div className="flex-1 h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Companies`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend Grid */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              {pieData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[entry.name] }} />
                  <span className="text-slate-500 truncate text-[11px] font-sans">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Chart: Industry Metrics */}
          <div id="panel_bar_chart" className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
            <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider font-sans">Outreach & Replies by Industry</h3>
            <div className="flex-1 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" fontSize={11} />
                  <Bar dataKey="Sent Invitations" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Replies" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div id="empty_dashboard_instructions" className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400">
            <Users className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 font-sans">No Corporate Partners Tracked Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed font-sans">
              To view real-time pipeline funnels and reply ratios, your database needs company contacts. You can add them in the CRM.
            </p>
          </div>
          <div className="w-full text-left bg-slate-50 border border-slate-250 p-4 rounded-lg space-y-2.5 text-xs font-sans text-slate-600">
            <strong className="text-slate-700 block text-[11px] uppercase tracking-wider">Follow these 3 simple steps to start:</strong>
            <div className="flex gap-2.5 items-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <p className="leading-relaxed">Go to <strong>Placement CRM</strong>, make sure you are <strong>Signed In with Google</strong>, and click <strong>Create Spreadsheet Database</strong> to auto-provision a correct schema sheet.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <p className="leading-relaxed">Add individual corporate contacts using the <strong>Add Company</strong> form, or import a list of contacts via <strong>CSV Bulk Import</strong>.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] shrink-0 mt-0.5">3</span>
              <p className="leading-relaxed">Go to <strong>Outreach Campaign</strong> to launch standard invitation templates to all your newly added contacts.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
