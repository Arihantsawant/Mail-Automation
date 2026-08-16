import React, { useState, useEffect } from 'react';
import { Company, CommLog } from './types';
import { initAuth, googleSignIn, logout, getAccessToken, clearCachedToken } from './lib/firebase';
import { getGecaBrochureBase64, getGecaInvitationLetterBase64 } from './lib/pdfGenerator';
import { validateRFC5322Email, isEmailAddressLegit } from './utils/emailLegitimacy';
import Navigation from './components/Navigation';
import DashboardView from './components/DashboardView';
import CRMView from './components/CRMView';
import OutreachView from './components/OutreachView';
import FollowUpView from './components/FollowUpView';
import AIDraftsView from './components/AIDraftsView';
import CommLogView from './components/CommLogView';
import ClassroomView from './components/ClassroomView';
import { Database, LogIn, LogOut, CheckCircle, RefreshCw, FileSpreadsheet, Send, Mail, Play, AlertTriangle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('geca_tpo_spreadsheet_id') || '';
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classroom'); // Default to Classroom for best first-year learning
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [testingMode, setTestingMode] = useState<boolean>(() => {
    return localStorage.getItem('geca_tpo_testing_mode') === 'true';
  });
  const [autoStatus, setAutoStatus] = useState<string>('Standby');

  const autoRunningRef = React.useRef(false);

  // Sync Google Auth Token on page refresh / load
  useEffect(() => {
    initAuth(
      (currentUser, activeToken) => {
        setUser(currentUser);
        setToken(activeToken);
        if (spreadsheetId) {
          syncData(activeToken, spreadsheetId);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        if (spreadsheetId) {
          await syncData(result.accessToken, spreadsheetId);
        }
        alert(`Successfully signed in as ${result.user.email}! Welcome back to GECA TPO Automation.`);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' || 
        err?.message?.includes('popup-closed-by-user') || 
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup-blocked')
      ) {
        console.info('Google Sign-In popup closed, cancelled, or blocked.');
        return;
      }
      console.error(err);
      alert('Sign-in failed: ' + (err.message || String(err)));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setCompanies([]);
    setLogs([]);
    alert('Logged out safely. Spreadsheets are kept secure in your Google Account.');
  };

  const updateSpreadsheetId = (id: string) => {
    setSpreadsheetId(id);
    localStorage.setItem('geca_tpo_spreadsheet_id', id);
    if (token && id) {
      syncData(token, id);
    }
  };

  // 1. Core API call: Read Data from Google Spreadsheet (Module 3)
  const syncData = async (activeToken: string, activeSId: string) => {
    if (!activeToken || !activeSId) return;
    setLoading(true);
    setSyncError(null);
    try {
      // Fetch Companies A2:N (unlimited rows)
      const companiesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSId}/values/${encodeURIComponent('Companies!A2:N')}`;
      const resCompanies = await fetch(companiesUrl, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      if (!resCompanies.ok) {
        const errObj = await resCompanies.json().catch(() => ({}));
        const msg = errObj?.error?.message || `HTTP ${resCompanies.status}`;
        if (
          resCompanies.status === 401 ||
          msg.includes('invalid authentication credentials') ||
          msg.includes('Expected OAuth 2 access token') ||
          msg.includes('UNAUTHENTICATED')
        ) {
          clearCachedToken();
          setToken(null);
          throw new Error('Your Google session has expired or credentials are invalid. Please click "Sign In with Google Account" to re-authenticate.');
        }
        throw new Error(`Companies Sync Failed: ${msg}`);
      }

      const dataCompanies = await resCompanies.json();

      if (dataCompanies.values && Array.isArray(dataCompanies.values)) {
        const mappedCompanies: Company[] = dataCompanies.values.map((row: any) => {
          let statusVal = (row[4] || '').toString().trim();
          let normalizedStatus: Company['status'] = 'Pending';
          if (!statusVal) {
            normalizedStatus = 'Pending';
          } else {
            const lowerStatus = statusVal.toLowerCase();
            if (lowerStatus === 'pending') normalizedStatus = 'Pending';
            else if (lowerStatus === 'invited' || lowerStatus === 'sent' || lowerStatus.includes('invite') || lowerStatus.includes('sent')) normalizedStatus = 'Invited';
            else if (lowerStatus === 'replied' || lowerStatus.includes('reply') || lowerStatus.includes('replied')) normalizedStatus = 'Replied';
            else if (lowerStatus === 'interested' || lowerStatus.includes('interest')) normalizedStatus = 'Interested';
            else if (lowerStatus === 'not interested' || lowerStatus.includes('not interested') || lowerStatus.includes('reject')) normalizedStatus = 'Not Interested';
            else if (lowerStatus === 'no response' || lowerStatus.includes('no response')) normalizedStatus = 'No Response';
            else if (lowerStatus === 'drive scheduled' || lowerStatus.includes('drive') || lowerStatus.includes('schedule')) normalizedStatus = 'Drive Scheduled';
            else if (lowerStatus.includes('follow up 1') || lowerStatus.includes('followup 1') || lowerStatus === 'followup1') normalizedStatus = 'Follow Up 1';
            else if (lowerStatus.includes('follow up 2') || lowerStatus.includes('followup 2') || lowerStatus === 'followup2') normalizedStatus = 'Follow Up 2';
            else if (lowerStatus.includes('follow up 3') || lowerStatus.includes('followup 3') || lowerStatus === 'followup3') normalizedStatus = 'Follow Up 3';
            else if (lowerStatus.startsWith('follow')) {
              if (lowerStatus.includes('1')) normalizedStatus = 'Follow Up 1';
              else if (lowerStatus.includes('2')) normalizedStatus = 'Follow Up 2';
              else if (lowerStatus.includes('3')) normalizedStatus = 'Follow Up 3';
              else normalizedStatus = 'Follow Up 1';
            } else {
              normalizedStatus = 'Pending';
            }
          }

          const rawReply = (row[8] || '').toString().trim().toLowerCase();
          const normalizedReply: 'Yes' | 'No' = (rawReply === 'yes' || rawReply === 'y' || rawReply === 'true' || normalizedStatus === 'Replied' || normalizedStatus === 'Interested' || normalizedStatus === 'Not Interested' || normalizedStatus === 'Drive Scheduled') ? 'Yes' : 'No';

          return {
            name: row[0] || '',
            hrName: row[1] || '',
            email: row[2] || '',
            industry: row[3] || '',
            status: normalizedStatus,
            sentDate: row[5] || '',
            lastActionDate: row[6] || '',
            followUpCount: Number(row[7]) || 0,
            replyReceived: normalizedReply,
            replyDate: row[9] || '',
            threadId: row[10] || '',
            aiClassification: row[11] || '',
            nextAction: row[12] || '',
            remarks: row[13] || ''
          };
        });
        setCompanies(mappedCompanies);
      } else {
        setCompanies([]);
      }

      // Fetch Communication Log A2:E (unlimited rows)
      const logsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSId}/values/${encodeURIComponent("'Communication Log'!A2:E")}`;
      const resLogs = await fetch(logsUrl, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      if (!resLogs.ok) {
        const errObj = await resLogs.json().catch(() => ({}));
        const msg = errObj?.error?.message || `HTTP ${resLogs.status}`;
        if (
          resLogs.status === 401 ||
          msg.includes('invalid authentication credentials') ||
          msg.includes('Expected OAuth 2 access token') ||
          msg.includes('UNAUTHENTICATED')
        ) {
          clearCachedToken();
          setToken(null);
          throw new Error('Your Google session has expired or credentials are invalid. Please click "Sign In with Google Account" to re-authenticate.');
        }
        throw new Error(`Communication Log Sync Failed: ${msg}`);
      }

      const dataLogs = await resLogs.json();

      if (dataLogs.values && Array.isArray(dataLogs.values)) {
        const mappedLogs: CommLog[] = dataLogs.values.map((row: any) => ({
          timestamp: row[0] || '',
          company: row[1] || '',
          email: row[2] || '',
          action: row[3] || '',
          details: row[4] || ''
        }));
        // Sort newest logs first
        setLogs(mappedLogs.reverse());
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      let errMsg = err.message || String(err);
      if (
        errMsg.includes('invalid authentication credentials') ||
        errMsg.includes('Expected OAuth 2 access token') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('HTTP 401') ||
        errMsg.includes('401') ||
        errMsg.includes('session has expired')
      ) {
        console.warn('Google session expired or credentials required:', errMsg);
        clearCachedToken();
        setToken(null);
        errMsg = 'Your Google session has expired or credentials are invalid. Please click "Sign In with Google Account" to re-authenticate.';
      } else if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch')) {
        console.warn('Google API connection failed:', errMsg);
        errMsg = 'Google API connection failed (Failed to fetch). This usually means your login session has expired or Google is blocking the connection in the sandbox. Please click "Sign In with Google Account" to refresh your session.';
      } else {
        console.error('Spreadsheet sync error:', err);
      }
      setSyncError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Automated RPA check routine (Module 10 & 11)
  const runAutomaticOutreachChecks = async (activeToken: string, activeSId: string) => {
    if (!activeToken || !activeSId || autoRunningRef.current) return;
    autoRunningRef.current = true;
    setAutoStatus('Scanning for replies...');
    console.log('[AUTO-CAMPAIGN] Starting automatic reply check (offline classification)...');
    
    try {
      // Step 1: Read latest rows from sheet to get fresh state and prevent data loss
      const companiesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSId}/values/${encodeURIComponent('Companies!A2:N')}`;
      let resCompanies: Response;
      try {
        resCompanies = await fetch(companiesUrl, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
      } catch (netErr: any) {
        console.warn('[AUTO-CAMPAIGN] Soft network failure connecting to Google Sheets API:', netErr?.message || netErr);
        setAutoStatus('Standby (Network Issue)');
        return;
      }
      
      if (!resCompanies.ok) {
        console.warn('[AUTO-CAMPAIGN] Failed to fetch fresh companies data (HTTP ' + resCompanies.status + ').');
        if (resCompanies.status === 401) {
          clearCachedToken();
          setToken(null);
          setSyncError('Your Google session has expired. Please click "Sign In with Google Account" to re-authenticate.');
        }
        setAutoStatus('Standby (Sync error)');
        return;
      }
      
      const dataCompanies = await resCompanies.json();
      if (!dataCompanies.values || !Array.isArray(dataCompanies.values)) {
        autoRunningRef.current = false;
        setAutoStatus('Standby (No companies)');
        return;
      }
      
      const today = new Date();
      let updatedAny = false;
      
      for (let i = 0; i < dataCompanies.values.length; i++) {
        const row = dataCompanies.values[i];
        if (!row || row.length === 0) continue;
        
        const name = (row[0] || '').toString().trim();
        const hrName = (row[1] || '').toString().trim();
        const email = (row[2] || '').toString().trim();
        if (!name && !hrName && !email) continue;
        
        const rawStatus = row[4];
        const statusVal = (rawStatus || '').toString().trim();
        
        // Normalize status in place for checking
        let status = 'Pending';
        const lowerStatus = statusVal.toLowerCase();
        if (lowerStatus === 'pending') status = 'Pending';
        else if (lowerStatus === 'invited' || lowerStatus === 'sent' || lowerStatus.includes('invite') || lowerStatus.includes('sent')) status = 'Invited';
        else if (lowerStatus === 'replied' || lowerStatus.includes('reply') || lowerStatus.includes('replied')) status = 'Replied';
        else if (lowerStatus === 'interested' || lowerStatus.includes('interest')) status = 'Interested';
        else if (lowerStatus === 'not interested' || lowerStatus.includes('not interested') || lowerStatus.includes('reject')) status = 'Not Interested';
        else if (lowerStatus === 'no response' || lowerStatus.includes('no response')) status = 'No Response';
        else if (lowerStatus === 'drive scheduled' || lowerStatus.includes('drive') || lowerStatus.includes('schedule')) status = 'Drive Scheduled';
        else if (lowerStatus.includes('follow up 1') || lowerStatus.includes('followup 1') || lowerStatus === 'followup1') status = 'Follow Up 1';
        else if (lowerStatus.includes('follow up 2') || lowerStatus.includes('followup 2') || lowerStatus === 'followup2') status = 'Follow Up 2';
        else if (lowerStatus.includes('follow up 3') || lowerStatus.includes('followup 3') || lowerStatus === 'followup3') status = 'Follow Up 3';
        else if (lowerStatus.startsWith('follow')) {
          if (lowerStatus.includes('1')) status = 'Follow Up 1';
          else if (lowerStatus.includes('2')) status = 'Follow Up 2';
          else if (lowerStatus.includes('3')) status = 'Follow Up 3';
          else status = 'Follow Up 1';
        }
        
        const lastActionDateStr = row[6] || row[5] || '';
        const followUpCount = Number(row[7]) || 0;
        const threadId = (row[10] || '').toString().trim();
        const replyReceived = (row[8] || 'No').toString().trim().toLowerCase() === 'yes' ? 'Yes' : 'No';
        
        // Validate threadId format (non-empty, hex or alphanumeric thread ID string)
        const isValidThreadId = Boolean(threadId && /^[a-zA-Z0-9_-]+$/.test(threadId) && threadId.length > 5);

        // Check for new incoming replies in active Gmail thread
        if ((status === 'Invited' || status.startsWith('Follow Up')) && isValidThreadId && replyReceived === 'No') {
          try {
            setAutoStatus(`Checking replies for ${name}...`);
            // Add a tiny delay to avoid bursting API calls on large datasets
            await new Promise(r => setTimeout(r, 40));

            let resThread: Response | null = null;
            try {
              resThread = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
                headers: { Authorization: `Bearer ${activeToken}` }
              });
            } catch (netErr: any) {
              console.warn(`[AUTO-CAMPAIGN] Soft network failure checking replies for row ${i + 2} (${name}):`, netErr?.message || netErr);
              continue;
            }

            if (resThread && resThread.status === 401) {
              console.warn('[AUTO-CAMPAIGN] OAuth access token expired or invalid during reply check.');
              setAutoStatus('Standby (Auth Required)');
              break;
            }

            if (resThread && resThread.ok) {
              const dataThread = await resThread.json();
              const messages = dataThread.messages || [];
              
              if (messages.length > 1) {
                // Reply detected! Confirm sender isn't us
                const lastMessage = messages[messages.length - 1];
                const msgHeaders = lastMessage.payload?.headers || [];
                const fromHeader = msgHeaders.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
                
                const isFromMe = fromHeader.toLowerCase().includes(user?.email?.toLowerCase() || 'tpo@geca.ac.in');
                
                if (!isFromMe) {
                  const replySnippet = lastMessage.snippet || 'Replied to placement outreach.';
                  const replyDate = new Date(Number(lastMessage.internalDate || Date.now()));
                  
                  console.log(`[AUTO-CAMPAIGN] Reply detected from ${fromHeader} for ${name}!`);
                  setAutoStatus(`Analyzing reply from ${name}...`);
                  
                  let replyContent = replySnippet;
                  const getBody = (payload: any): string => {
                    if (!payload) return '';
                    if (payload.body?.data) {
                      try {
                        return decodeURIComponent(escape(atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))));
                      } catch (e) {
                        return payload.body.data;
                      }
                    }
                    if (payload.parts) {
                      for (const part of payload.parts) {
                        const b = getBody(part);
                        if (b) return b;
                      }
                    }
                    return '';
                  };
                  const decodedBody = getBody(lastMessage.payload);
                  if (decodedBody) {
                    replyContent = decodedBody.substring(0, 500);
                  }
                  
                  // Clean local offline keyword classification to protect user's Gemini free-tier quota (5 RPM)
                  const text = replyContent.toLowerCase();
                  const interestedKeywords = [
                    'interested', 'yes', 'confirm', 'sure', 'would love', 'glad to', 'happy to', 'pleased to',
                    'dates', 'schedule', 'slot', 'meeting', 'discussion', 'discuss', 'interview', 'hiring',
                    'ppt', 'placement', 'recruiting', 'drive', 'host', 'conduct', 'resume', 'cvs', 'participate',
                    'august', 'september', 'october', 'november', 'december', 'january', 'february', 'share syllabus'
                  ];
                  const notInterestedKeywords = [
                    'not hiring', 'no hiring', 'freeze', 'no req', 'no vacancy', 'no requirement',
                    'sorry', 'unfortunately', 'unable to', 'cannot participate', 'decline', 'reject',
                    'busy', 'not interested', 'no opening', 'out of scope'
                  ];

                  let notInterestedCount = 0;
                  for (const kw of notInterestedKeywords) {
                    if (text.includes(kw)) notInterestedCount++;
                  }
                  let interestedCount = 0;
                  for (const kw of interestedKeywords) {
                    if (text.includes(kw)) interestedCount++;
                  }

                  let aiClass = 'Interested';
                  let aiNextAction = 'Schedule introductory discussion and share placement brochure';
                  let aiRemarks = 'HR expressed interest. Inferred via local analysis.';

                  if (notInterestedCount > interestedCount) {
                    aiClass = 'Not Interested';
                    aiNextAction = 'Thank HR recruiter and request future consideration';
                    aiRemarks = 'HR indicated they are unable to participate. Inferred via local analysis.';
                  }
                  
                  // Update spreadsheet Columns E to N targets directly to protect data and preserve existing rows
                  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSId}/values/${encodeURIComponent(`Companies!E${i + 2}:N${i + 2}`)}?valueInputOption=USER_ENTERED`;
                  
                  const sentDate = row[5] || '';
                  const currentFollowUps = row[7] || 0;
                  const currentThreadId = row[10] || '';
                  
                  const updatedRowSlice = [
                    'Replied',                 // E: Status
                    sentDate,                  // F: Sent Date
                    today.toLocaleString(),    // G: Last Action Date
                    currentFollowUps,          // H: Follow Up Count
                    'Yes',                     // I: Reply Received
                    replyDate.toLocaleString(),// J: Reply Date
                    currentThreadId,           // K: Thread ID
                    aiClass,                   // L: AI Classification
                    aiNextAction,              // M: Next Action
                    aiRemarks                  // N: Remarks
                  ];
                  
                  try {
                    await fetch(updateUrl, {
                      method: 'PUT',
                      headers: {
                        Authorization: `Bearer ${activeToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ values: [updatedRowSlice] })
                    });
                    
                    // Append audit entry to communication log sheet
                    const logUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSId}/values/${encodeURIComponent("'Communication Log'!A2:E2")}:append?valueInputOption=USER_ENTERED`;
                    await fetch(logUrl, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${activeToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        values: [[today.toLocaleString(), name, email, 'Reply Detected', `Automatic check detected HR reply. Classified as "${aiClass}". Draft reply can be generated manually in AI Drafts.`]]
                      })
                    });
                  } catch (sheetErr) {
                    console.warn(`[AUTO-CAMPAIGN] Sheet update failed for row ${i + 2}:`, sheetErr);
                  }
                  
                  updatedAny = true;
                  continue; // Skip follow-ups since they replied!
                }
              }
            }
          } catch (replyErr: any) {
            console.warn(`[AUTO-CAMPAIGN] Handled reply check exception for row ${i + 2}:`, replyErr?.message || replyErr);
          }
        }
      }
      
      if (updatedAny) {
        await syncData(activeToken, activeSId);
      }
      
      setAutoStatus('Standby (Active)');
    } catch (gErr: any) {
      const msg = gErr?.message || String(gErr);
      if (msg.includes('Failed to fetch') || msg.includes('fetch') || msg.includes('NetworkError')) {
        console.warn('[AUTO-CAMPAIGN] Network connection paused during automated campaign checks:', msg);
        setAutoStatus('Standby (Connection required)');
      } else {
        console.warn('[AUTO-CAMPAIGN] Automated campaign check notice:', msg);
        setAutoStatus('Standby (Notice)');
      }
    } finally {
      autoRunningRef.current = false;
    }
  };

  // Toggle testing mode
  const handleToggleTestingMode = (val: boolean) => {
    setTestingMode(val);
    localStorage.setItem('geca_tpo_testing_mode', val ? 'true' : 'false');
  };

  // Manual trigger for background RPA campaign
  const handleManualRunAutoCampaign = async () => {
    if (!token || !spreadsheetId) return;
    setAutoStatus('Running manual check...');
    try {
      await runAutomaticOutreachChecks(token, spreadsheetId);
    } catch (err: any) {
      setAutoStatus(`Error: ${err.message}`);
    }
  };

  // Automatic routine interval trigger
  useEffect(() => {
    if (!token || !spreadsheetId) return;

    // Run once immediately on sign-in / connect
    runAutomaticOutreachChecks(token, spreadsheetId);

    // Set up 60-second automatic polling interval
    const interval = setInterval(() => {
      runAutomaticOutreachChecks(token, spreadsheetId);
    }, 60000);

    return () => clearInterval(interval);
  }, [token, spreadsheetId, testingMode]);

  const handleManualSync = async () => {
    if (!token) {
      alert('Please login first.');
      return;
    }
    if (!spreadsheetId) {
      alert('Please connect a Spreadsheet first.');
      return;
    }
    await syncData(token, spreadsheetId);
    alert('Synchronization complete! Table and charts updated successfully.');
  };

  // 2. Core API call: Provision New Spreadsheet database in Drive (Module 1)
  const handleCreateNewSheet = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Step A: Create the spreadsheet with three tabs
      const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
      const resCreate = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'GECA Placement Outreach CRM 2026-27'
          },
          sheets: [
            { properties: { title: 'Companies' } },
            { properties: { title: 'Communication Log' } },
            { properties: { title: 'Dashboard' } }
          ]
        })
      });
      const dataCreate = await resCreate.json();
      const newSId = dataCreate.spreadsheetId;

      if (!newSId) {
        throw new Error('Spreadsheet creation failed, no ID returned.');
      }

      // Step B: Write Column Headers to 'Companies' Sheet
      const headersCompanies = [
        [
          'Company Name',
          'HR Name',
          'Email',
          'Industry',
          'Status',
          'Sent Date',
          'Last Action Date',
          'Follow Up Count',
          'Reply Received',
          'Reply Date',
          'Thread ID',
          'AI Classification',
          'Next Action',
          'Remarks'
        ]
      ];

      const writeCompaniesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${newSId}/values/${encodeURIComponent('Companies!A1:N1')}?valueInputOption=USER_ENTERED`;
      await fetch(writeCompaniesUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: headersCompanies
        })
      });

      // Step C: Write Column Headers to 'Communication Log' Sheet
      const headersLogs = [['Timestamp', 'Company', 'Email', 'Action', 'Details']];
      const writeLogsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${newSId}/values/${encodeURIComponent("'Communication Log'!A1:E1")}?valueInputOption=USER_ENTERED`;
      await fetch(writeLogsUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: headersLogs
        })
      });

      // Step D: Initialize Spreadsheet ID
      updateSpreadsheetId(newSId);
      alert('Success! Created a clean, empty spreadsheet: "GECA Placement Outreach CRM 2026-27" inside your Google Drive! Preloaded with correct database headers.');
    } catch (err: any) {
      console.error(err);
      alert('Error creating sheet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Core API: Add Company Row (Module 3 / CRM)
  const handleAddCompany = async (company: any) => {
    if (!token || !spreadsheetId) return;
    try {
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Companies!A2:E2')}:append?valueInputOption=USER_ENTERED`;
      const row = [company.name, company.hrName, company.email, company.industry, company.status];
      await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      });
      await syncData(token, spreadsheetId);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // 3b. Core API: Bulk Add Company Rows (CSV Import)
  const handleAddCompanies = async (newCompanies: any[]) => {
    if (!token || !spreadsheetId) return;
    setLoading(true);
    try {
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Companies!A2:E2')}:append?valueInputOption=USER_ENTERED`;
      const rows = newCompanies.map(c => [
        c.name,
        c.hrName,
        c.email,
        c.industry,
        c.status || 'Pending'
      ]);
      const res = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      });
      if (!res.ok) {
        throw new Error(`Sheets API Append failure: ${await res.text()}`);
      }
      await syncData(token, spreadsheetId);
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Bulk update spreadsheet rows when filling in names with Gemini AI
  const handleBulkUpdateCompanies = async (updatedCompanies: Company[]) => {
    if (!token || !spreadsheetId) return;
    setLoading(true);
    try {
      // We overwrite Companies!A2:N with the updated array matching original schema
      const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Companies!A2:N')}?valueInputOption=USER_ENTERED`;
      const values = updatedCompanies.map(c => [
        c.name || '',
        c.hrName || '',
        c.email || '',
        c.industry || '',
        c.status || 'Pending',
        c.sentDate || '',
        c.lastActionDate || '',
        c.followUpCount || 0,
        c.replyReceived || 'No',
        c.replyDate || '',
        c.threadId || '',
        c.aiClassification || '',
        c.nextAction || '',
        c.remarks || ''
      ]);
      const res = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values
        })
      });
      if (!res.ok) {
        throw new Error(`Sheets API PUT write-back failed: ${await res.text()}`);
      }
      await syncData(token, spreadsheetId);
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert any raw text string or UTF-8 MIME packet into RFC 4648 Base64URL string safely
  const stringToBase64Url = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  // Helper: Compile raw MIME formatted email with files attached (Module 4/5/6)
  const buildMimeMessage = (
    from: string,
    to: string,
    subject: string,
    bodyText: string,
    attachBrochure: boolean = true,
    attachLetter: boolean = true,
    companyName: string = '',
    hrName: string = '',
    log?: (msg: string) => void,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null
  ) => {
    const boundary = 'GECA_TPO_OUTREACH_BOUNDARY_MARKER';
    
    // Chunk base64 to 76 character lines per RFC 2045/MIME standards for stable SMTP carriage
    const wrapBase64 = (base64: string): string => {
      const clean = base64.includes(',') ? base64.split(',')[1] : base64;
      const stripped = clean.replace(/\s+/g, '');
      const matches = stripped.match(/.{1,76}/g);
      return matches ? matches.join('\r\n') : stripped;
    };

    const convertToHtml = (text: string): string => {
      // Normalize line breaks
      let content = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Trim leading/trailing spaces
      content = content.trim();

      // Collapse triple or more newlines to avoid massive gaps ("many spaces")
      content = content.replace(/\n{3,}/g, '\n\n');

      // Convert Markdown-style bold (**text** or __text__) to HTML <strong>
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/__(.*?)__/g, '<strong>$1</strong>');

      // Convert Markdown-style italic (*text* or _text_) to HTML <em>
      content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
      content = content.replace(/_(.*?)_/g, '<em>$1</em>');

      // Split by double newlines into logical paragraphs
      const blocks = content.split('\n\n');
      const htmlBlocks = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        // Convert single internal newlines to HTML line breaks to maintain clean manual wrapping
        const lineWithBreaks = trimmed.replace(/\n/g, '<br />');
        return `<p style="margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #1e293b;">${lineWithBreaks}</p>`;
      }).filter(Boolean);

      return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="margin: 0; padding: 0; background-color: #ffffff; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #1e293b; padding: 10px 0;">
      ${htmlBlocks.join('')}
    </div>
  </body>
</html>`;
    };

    const htmlBody = convertToHtml(bodyText);
    const cleanSubject = subject.replace(/[\r\n]+/g, ' ').trim();

    const emailParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${cleanSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
      ''
    ];

    if (attachBrochure) {
      const rawBrochureBase64 = getGecaBrochureBase64();
      const formattedBrochureBase64 = wrapBase64(rawBrochureBase64);
      
      const logMsg = `[MIME ENCODER] Successfully encoded "GECA CSN TNP Brochure 26-27.pdf" (Base64 size: ${rawBrochureBase64.length} bytes, formatted to RFC-compliant 76-char rows).`;
      console.log(logMsg);
      if (log) log(logMsg);

      emailParts.push(
        `--${boundary}`,
        'Content-Type: application/pdf; name="GECA CSN TNP Brochure 26-27.pdf"',
        'Content-Disposition: attachment; filename="GECA CSN TNP Brochure 26-27.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        formattedBrochureBase64,
        ''
      );
    }

    if (attachLetter) {
      const rawLetterBase64 = getGecaInvitationLetterBase64(companyName, hrName);
      const formattedLetterBase64 = wrapBase64(rawLetterBase64);

      const logMsg = `[MIME ENCODER] Successfully encoded "Invitation Letter 26-27.pdf" for "${companyName || 'Corporate Partner'}" (Base64 size: ${rawLetterBase64.length} bytes, formatted to RFC-compliant 76-char rows).`;
      console.log(logMsg);
      if (log) log(logMsg);

      emailParts.push(
        `--${boundary}`,
        'Content-Type: application/pdf; name="Invitation Letter 26-27.pdf"',
        'Content-Disposition: attachment; filename="Invitation Letter 26-27.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        formattedLetterBase64,
        ''
      );
    }

    if (uploadedAttachments && uploadedAttachments.length > 0) {
      uploadedAttachments.forEach((attachment) => {
        const formattedUploadedBase64 = wrapBase64(attachment.base64);
        const safeName = (attachment.name || 'attachment.bin').replace(/["\r\n]/g, '_');
        const mimeType = attachment.type || 'application/octet-stream';
        const rawLen = attachment.base64.includes(',') ? attachment.base64.split(',')[1].length : attachment.base64.length;

        const logMsg = `[MIME ENCODER] Successfully encoded custom uploaded attachment "${safeName}" (Base64 size: ${rawLen} bytes, formatted to RFC-compliant 76-char rows).`;
        console.log(logMsg);
        if (log) log(logMsg);

        emailParts.push(
          `--${boundary}`,
          `Content-Type: ${mimeType}; name="${safeName}"`,
          `Content-Disposition: attachment; filename="${safeName}"`,
          'Content-Transfer-Encoding: base64',
          '',
          formattedUploadedBase64,
          ''
        );
      });
    }

    emailParts.push(`--${boundary}--`);

    const rawMsg = emailParts.join('\r\n');
    return stringToBase64Url(rawMsg);
  };

  // 4. Core API: Send Test Email to Target (Module 4)
  const handleSendTestEmail = async (
    log: (msg: string) => void,
    targetEmail?: string,
    customSubject?: string,
    customBody?: string,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure: boolean = false,
    attachLetter: boolean = false
  ) => {
    if (!token || !user) return;
    const recipient = targetEmail || user.email;
    log('Authenticating Gmail SMTP engine...');
    log(`Target: ${recipient}`);
    if (attachBrochure) {
      log('Preparing formal brochure: "GECA CSN TNP Brochure 26-27.pdf"');
    }
    if (attachLetter) {
      log('Preparing formal letter: "Invitation Letter 26-27.pdf"');
    }
    if (uploadedAttachments && uploadedAttachments.length > 0) {
      log(`Preparing custom uploaded attachments:`);
      uploadedAttachments.forEach((att) => {
        log(`  -> "${att.name}" (${Math.round(att.base64.length * 0.75 / 1024)} KB)`);
      });
    }

    const subject = customSubject || 'Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar';
    const bodyText = customBody || `Dear Team,
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
Website:  www.geca.ac.in`;

    const base64UrlMsg = buildMimeMessage(user.email, recipient, subject, bodyText, attachBrochure, attachLetter, 'Test Company', 'HR Lead', log, uploadedAttachments);

    log('Dispatching Gmail API send request...');
    const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64UrlMsg
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gmail API failure: ${errorText}`);
    }

    const sendData = await res.json();
    log(`Email successfully routed! Message ID: ${sendData.id}`);
  };

  // 5. Core API: Run Bulk Campaign (Module 5)
  const handleSendBulkEmails = async (
    log: (msg: string) => void,
    customSubject?: string,
    customBody?: string,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure: boolean = false,
    attachLetter: boolean = false,
    shouldStop?: () => boolean,
    onProgress?: (completed: number, total: number) => void,
    targetStatusFilter?: string
  ) => {
    if (!token || !spreadsheetId) {
      log('[ERROR] Gmail API Token or connected Google Spreadsheet is missing.');
      return;
    }

    if (!user) {
      log('[ERROR] User details not found. Please log in first.');
      return;
    }

    const filterChoice = (targetStatusFilter || 'Pending').trim();
    log(`Loading corporate contacts from Google Spreadsheet for Bulk Emailing (Status Filter: "${filterChoice}")...`);
    // Fetch A2:N dynamically (all rows in spreadsheet)
    const companiesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Companies!A2:N')}`;
    
    let resCompanies;
    try {
      resCompanies = await fetch(companiesUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      log(`[ERROR] Network failure when accessing spreadsheet: ${err.message}`);
      return;
    }

    if (!resCompanies.ok) {
      const errorResponse = await resCompanies.text();
      log(`[ERROR] Google Sheets API fetch failed: ${errorResponse}`);
      log('Please ensure that the connected Spreadsheet has a sheet tab named exactly "Companies" and that your Google Account has permission to access it.');
      return;
    }

    const dataCompanies = await resCompanies.json();

    if (!dataCompanies.values || !Array.isArray(dataCompanies.values)) {
      log('No data rows found in "Companies" sheet. Please add some corporate contacts first.');
      return;
    }

    const subjectTemplate = customSubject || 'Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar';
    const now = new Date();

    // Helper matcher
    const matchesFilter = (statusVal: string): boolean => {
      const s = statusVal.toLowerCase();
      const f = filterChoice.toLowerCase();
      if (f === 'all') return true;
      if (f === 'pending') return s === 'pending';
      return s.includes(f) || f.includes(s);
    };

    // Remove empty rows before analyzing
    const validRows = dataCompanies.values.filter((row: any) => {
      if (!row || row.length === 0) return false;
      const name = (row[0] || '').toString().trim();
      const hrName = (row[1] || '').toString().trim();
      const email = (row[2] || '').toString().trim();
      return name !== '' || hrName !== '' || email !== '';
    });

    const targetTotal = validRows.filter((row: any) => {
      const email = (row[2] || '').toString().trim();
      const rawStatus = row[4];
      const status = (rawStatus && rawStatus.toString().trim()) ? rawStatus.toString().trim() : 'Pending';
      return email && matchesFilter(status);
    }).length;

    const estTotalSec = targetTotal * 2;
    const estTimeStr = estTotalSec < 60 ? `~${estTotalSec} seconds` : `~${Math.floor(estTotalSec / 60)} min ${estTotalSec % 60} sec`;

    log(`Retrieved ${validRows.length} corporate records. Found ${targetTotal} matching status filter "${filterChoice}".`);
    if (targetTotal > 0) {
      log(`⏱️ [ESTIMATED PROCESS DURATION] Approx. ${estTimeStr} required to complete dispatch to ${targetTotal} contacts (~2s per email).`);
    }
    let processCount = 0;
    if (onProgress) {
      onProgress(0, targetTotal);
    }

    for (let i = 0; i < dataCompanies.values.length; i++) {
      if (shouldStop && shouldStop()) {
        log('🛑 [EMERGENCY STOP] Mail sending process was halted by user request.');
        break;
      }
      const row = dataCompanies.values[i];
      if (!row || row.length === 0) continue;

      const name = (row[0] || '').toString().trim();
      const hrName = (row[1] || '').toString().trim();
      const email = (row[2] || '').toString().trim();
      
      // Silently skip completely blank rows
      if (!name && !hrName && !email) continue;

      const rawStatus = row[4];
      const status = (rawStatus && rawStatus.toString().trim()) ? rawStatus.toString().trim() : 'Pending';

      log(`Analyzing row ${i + 2}: [${name || 'Corporate Partner'}] | Email: ${email || '(None)'} | Status: "${status}"`);

      if (matchesFilter(status)) {
        if (!email) {
          log(`  -> Skipping Row ${i + 2} (${name || 'Corporate Partner'}): Email address is missing.`);
          continue;
        }

        const rfcCheck = validateRFC5322Email(email);
        if (!rfcCheck.isValid) {
          log(`  -> MailSuite / RFC 5322 Guard: Skipping Row ${i + 2} (${name || 'Corporate Partner'} - ${email}): ${rfcCheck.reason}. Kept aside.`);
          continue;
        }

        const legitimacy = isEmailAddressLegit(email);
        if (!legitimacy.isLegit || legitimacy.status === 'Bounced / Failed') {
          log(`  -> MailSuite Guard: Skipping Row ${i + 2} (${name || 'Corporate Partner'} - ${email}): Delivery failed / host rejected (${legitimacy.note}). Kept aside.`);
          continue;
        }

        try {
          processCount++;
          if (onProgress) {
            onProgress(processCount, targetTotal);
          }
          const remSec = (targetTotal - processCount) * 2;
          const remStr = remSec < 60 ? `${remSec}s` : `${Math.floor(remSec / 60)}m ${remSec % 60}s`;
          log(`  -> [MATCHED (${processCount}/${targetTotal})] Initiating outreach sequence to: ${email} (Est. time remaining: ~${remStr})`);
          log(`  -> Compiling attachments & building multi-part MIME packet...`);
          if (uploadedAttachments && uploadedAttachments.length > 0) {
            log(`  -> Injecting ${uploadedAttachments.length} custom uploaded attachment(s):`);
            uploadedAttachments.forEach(att => {
              log(`     * "${att.name}"`);
            });
          }

          const defaultBody = `Dear Team,
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
Website:  www.geca.ac.in`;

          const bodyTemplate = customBody || defaultBody;

          // Custom template replacement logic
          let bodyText = bodyTemplate;
          bodyText = bodyText.replace(/{HR Name}/gi, hrName || 'HR Partner');
          bodyText = bodyText.replace(/{HR_Name}/gi, hrName || 'HR Partner');
          bodyText = bodyText.replace(/{HRName}/gi, hrName || 'HR Partner');
          bodyText = bodyText.replace(/{Company Name}/gi, name || 'your prestigious organization');
          bodyText = bodyText.replace(/{Company_Name}/gi, name || 'your prestigious organization');
          bodyText = bodyText.replace(/{CompanyName}/gi, name || 'your prestigious organization');
          bodyText = bodyText.replace(/{Company}/gi, name || 'your prestigious organization');

          const base64UrlMsg = buildMimeMessage(user?.email || 'me', email, subjectTemplate, bodyText, attachBrochure, attachLetter, name, hrName, log, uploadedAttachments);

          log(`  -> Dispatching via Gmail Send API...`);
          const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
          const resSend = await fetch(sendUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              raw: base64UrlMsg
            })
          });

          if (!resSend.ok) {
            const errorDetails = await resSend.text();
            throw new Error(`Gmail API transmission failed: ${errorDetails}`);
          }

          const sendData = await resSend.json();
          const threadId = sendData.threadId || '';
          log(`  -> [SUCCESS] Dispatched to ${email}! Thread ID: ${threadId}`);

          // Update spreadsheet columns E, F, G (Status, Sent Date, Last Action Date)
          log(`  -> Updating status to "Invited" in Spreadsheet Row ${i + 2}...`);
          const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Companies!E${i + 2}:G${i + 2}`)}?valueInputOption=USER_ENTERED`;
          const resUpdate = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [['Invited', now.toLocaleString(), now.toLocaleDateString()]]
            })
          });
          if (!resUpdate.ok) {
            log(`  -> [WARNING] Sheets status update returned status ${resUpdate.status}: ${await resUpdate.text()}`);
          }

          // Write Thread ID in Column K (Thread ID)
          log(`  -> Writing Thread ID to column K...`);
          const updateThreadUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Companies!K${i + 2}`)}?valueInputOption=USER_ENTERED`;
          const resThread = await fetch(updateThreadUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [[threadId]]
            })
          });
          if (!resThread.ok) {
            log(`  -> [WARNING] Sheets Thread ID update returned status ${resThread.status}: ${await resThread.text()}`);
          }

          // Append to Communication Log sheet
          log(`  -> Appending audit history entry to "Communication Log" sheet...`);
          const logUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Communication Log'!A2:E2")}:append?valueInputOption=USER_ENTERED`;
          const resLog = await fetch(logUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [[now.toLocaleString(), name || 'Corporate Partner', email, 'Sent Invitation', `Formal placement invitation email sent directly to HR ${hrName || 'HR Partner'}.`]]
            })
          });
          if (!resLog.ok) {
            log(`  -> [WARNING] Communication Log sheet append returned status ${resLog.status}: ${await resLog.text()}`);
          }

        } catch (itemError: any) {
          log(`  -> [ERROR] Failed processing row ${i + 2} (${name || 'Corporate Partner'}): ${itemError.message}`);
        }
      } else {
        log(`  -> Skipping Row ${i + 2} (${name || 'Corporate Partner'}): Status is "${status}" (Not "Pending")`);
      }
    }

    if (processCount === 0) {
      log('Execution completed. No candidate rows were found with "Pending" status in the spreadsheet.');
    } else {
      log(`Campaign finished! Dispatched ${processCount} personalized invitation emails.`);
    }

    // Refresh rows
    await syncData(token, spreadsheetId);
  };

  // 6. Server-Side AI: Call backend proxy for drafting responses (Module 11)
  const handleGenerateDraft = async (companyName: string, incomingBody: string, statusType: string) => {
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        incomingEmailBody: incomingBody,
        statusType
      })
    });
    if (!res.ok) {
      throw new Error(`Server failed to generate draft: ${await res.text()}`);
    }
    return res.json();
  };

  // 7. Core API: Create Gmail Draft inside Thread (Module 11)
  const handleCreateDraftInGmail = async (threadId: string, bodyText: string) => {
    if (!token) return;
    const boundary = 'GECA_TPO_DRAFT_BOUNDARY_MARKER';
    const emailParts = [
      `Subject: Re: Invitation for Campus Placement & Internship Drive 2026-27 | GECA`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      bodyText,
      '',
      `--${boundary}--`
    ];

    const rawMsg = emailParts.join('\r\n');
    const base64UrlMsg = stringToBase64Url(rawMsg);

    const draftUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';
    const res = await fetch(draftUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          threadId: threadId,
          raw: base64UrlMsg
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gmail Draft creation failed: ${await res.text()}`);
    }
  };

  // 8. Core API: Update status manually inside sheet
  const handleUpdateStatus = async (companyName: string, newStatus: string, remarks: string) => {
    if (!token || !spreadsheetId) return;
    const rowIdx = companies.findIndex(c => c.name === companyName);
    if (rowIdx === -1) return;

    const cellIdx = rowIdx + 2;
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Companies!E${cellIdx}?valueInputOption=USER_ENTERED`;
    await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[newStatus]]
      })
    });

    // Write remarks to column N
    const updateRemarksUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Companies!N${cellIdx}?valueInputOption=USER_ENTERED`;
    await fetch(updateRemarksUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[remarks]]
      })
    });

    await syncData(token, spreadsheetId);
  };

  // Helper to retrieve Gmail thread details (Message-ID headers, original subject, threadId) for threading follow-ups
  const fetchThreadInfo = async (companyEmail: string, existingThreadId?: string) => {
    let threadId = existingThreadId || '';
    let originalSubject = 'Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar';
    let lastMessageId = '';
    const allMsgIds: string[] = [];

    // Step 1: If threadId is missing, query Gmail API to locate active thread for this recipient
    if (!threadId && token) {
      try {
        const searchRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(companyEmail)}&maxResults=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.messages && searchData.messages.length > 0) {
            threadId = searchData.messages[0].threadId;
          }
        }
      } catch (err) {
        console.warn('Gmail search by email failed:', err);
      }
    }

    // Step 2: Fetch full thread details if threadId is available
    if (threadId && token) {
      try {
        const resThreadDetail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (resThreadDetail.ok) {
          const threadData = await resThreadDetail.json();
          const threadMessages = threadData.messages || [];
          if (threadMessages.length > 0) {
            const firstMsg = threadMessages[0];
            const firstHeaders = firstMsg.payload?.headers || [];
            const subHeader = firstHeaders.find((h: any) => h.name.toLowerCase() === 'subject')?.value;
            if (subHeader) {
              originalSubject = subHeader;
            }

            threadMessages.forEach((msg: any) => {
              const headers = msg.payload?.headers || [];
              let msgId = headers.find((h: any) => h.name.toLowerCase() === 'message-id')?.value;
              if (!msgId && msg.id) {
                msgId = `<${msg.id}@mail.gmail.com>`;
              }
              if (msgId) {
                const formattedId = msgId.trim().startsWith('<') ? msgId.trim() : `<${msgId.trim()}>`;
                if (!allMsgIds.includes(formattedId)) {
                  allMsgIds.push(formattedId);
                }
                lastMessageId = formattedId;
              }
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch thread detail:', err);
      }
    }

    return {
      threadId,
      originalSubject,
      lastMessageId,
      references: allMsgIds.join(' ')
    };
  };

  // Manually send a polite follow-up reminder inside active thread with user's explicit permission
  const handleSendSingleFollowUp = async (
    company: Company, 
    customBody?: string,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure: boolean = false,
    attachLetter: boolean = false
  ) => {
    if (!token || !spreadsheetId) {
      throw new Error('Please ensure you are signed in with Google and have connected a Spreadsheet.');
    }

    const today = new Date();
    const followUpCount = company.followUpCount || 0;
    const nextCount = followUpCount + 1;
    const newStatus = `Follow Up ${nextCount}`;

    const rowIndex = companies.findIndex(c => c.email.toLowerCase() === company.email.toLowerCase());
    const rowNum = rowIndex !== -1 ? rowIndex + 2 : null;

    const hrName = company.hrName || 'HR Lead';
    const name = company.name || 'Corporate Partner';

    const followUpBody = customBody || `Dear Team,
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
Website:  www.geca.ac.in`;

    const { threadId: foundThreadId, originalSubject, lastMessageId, references } = await fetchThreadInfo(company.email, company.threadId);

    const cleanSubject = originalSubject.replace(/^(Re|RE|re):\s*/i, '');
    const fSubject = `Re: ${cleanSubject}`;
    const boundary = 'GECA_TPO_MANUAL_FOLLOWUP_BOUNDARY';

    const wrapHtmlBody = (txt: string) => {
      const paras = txt.split('\n\n').map(p => `<p style="margin:0 0 14px 0; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; font-size:14px; line-height:1.6; color:#1e293b;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
      return `<!DOCTYPE html><html><body>${paras}</body></html>`;
    };

    const wrapBase64 = (b64: string) => {
      const clean = b64.includes(',') ? b64.split(',')[1] : b64;
      const stripped = clean.replace(/\s+/g, '');
      const matches = stripped.match(/.{1,76}/g);
      return matches ? matches.join('\r\n') : stripped;
    };

    const emailParts = [
      `From: me`,
      `To: ${company.email}`,
      `Subject: ${fSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ''
    ];

    if (lastMessageId) {
      emailParts.splice(3, 0, `In-Reply-To: ${lastMessageId}`, `References: ${references || lastMessageId}`);
    }

    emailParts.push(
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      wrapHtmlBody(followUpBody),
      ''
    );

    if (attachBrochure) {
      const rawBrochureBase64 = getGecaBrochureBase64();
      emailParts.push(
        `--${boundary}`,
        'Content-Type: application/pdf; name="GECA CSN TNP Brochure 26-27.pdf"',
        'Content-Disposition: attachment; filename="GECA CSN TNP Brochure 26-27.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(rawBrochureBase64),
        ''
      );
    }

    if (attachLetter) {
      const rawLetterBase64 = getGecaInvitationLetterBase64(name, hrName);
      emailParts.push(
        `--${boundary}`,
        'Content-Type: application/pdf; name="Invitation Letter 26-27.pdf"',
        'Content-Disposition: attachment; filename="Invitation Letter 26-27.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(rawLetterBase64),
        ''
      );
    }

    if (uploadedAttachments && uploadedAttachments.length > 0) {
      uploadedAttachments.forEach((att) => {
        const safeName = (att.name || 'attachment.bin').replace(/["\r\n]/g, '_');
        const mimeType = att.type || 'application/octet-stream';
        emailParts.push(
          `--${boundary}`,
          `Content-Type: ${mimeType}; name="${safeName}"`,
          `Content-Disposition: attachment; filename="${safeName}"`,
          'Content-Transfer-Encoding: base64',
          '',
          wrapBase64(att.base64),
          ''
        );
      });
    }

    emailParts.push(`--${boundary}--`);

    const rawMsg = emailParts.join('\r\n');
    const base64UrlMsg = stringToBase64Url(rawMsg);

    const sendPayload: any = { raw: base64UrlMsg };
    if (foundThreadId) {
      sendPayload.threadId = foundThreadId;
    }

    const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const resSend = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendPayload)
    });

    if (!resSend.ok) {
      throw new Error(`Gmail API failed to send follow-up: ${await resSend.text()}`);
    }

    const sentData = await resSend.json();
    const finalThreadId = sentData.threadId || foundThreadId;

    if (rowNum) {
      // Update Spreadsheet Row: Status (E), Sent Date (F), Last Action Date (G), Follow Up Count (H)
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Companies!E${rowNum}:H${rowNum}`)}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[newStatus, company.sentDate || '', today.toLocaleString(), nextCount]]
        })
      });

      // Also persist threadId in Column K if available
      if (finalThreadId) {
        const threadUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Companies!K${rowNum}`)}?valueInputOption=USER_ENTERED`;
        await fetch(threadUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[finalThreadId]]
          })
        });
      }
    }

    // Log communication audit
    const logUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Communication Log'!A2:E2")}:append?valueInputOption=USER_ENTERED`;
    await fetch(logUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[today.toLocaleString(), name, company.email, `Sent Follow-Up ${nextCount}`, `Sent follow-up reminder #${nextCount} inside active Gmail thread (Thread ID: ${finalThreadId || 'N/A'}).`]]
      })
    });

    await syncData(token, spreadsheetId);
  };

  // Manually create a polite follow-up draft inside active thread with user's explicit permission
  const handleCreateFollowUpDraft = async (
    company: Company, 
    customBody?: string,
    uploadedAttachments?: { name: string; base64: string; type: string }[] | null,
    attachBrochure: boolean = false,
    attachLetter: boolean = false
  ) => {
    if (!token || !spreadsheetId) {
      throw new Error('Please ensure you are signed in with Google and have connected a Spreadsheet.');
    }

    const today = new Date();
    const followUpCount = company.followUpCount || 0;
    const nextCount = followUpCount + 1;
    const newStatus = `Follow Up ${nextCount} (Drafted)`;

    const rowIndex = companies.findIndex(c => c.email.toLowerCase() === company.email.toLowerCase());
    const rowNum = rowIndex !== -1 ? rowIndex + 2 : null;

    const hrName = company.hrName || 'HR Lead';
    const name = company.name || 'Corporate Partner';

    const followUpBody = customBody || `Dear Team,
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
Website:  www.geca.ac.in`;

    const { threadId: foundThreadId, originalSubject, lastMessageId, references } = await fetchThreadInfo(company.email, company.threadId);

    const cleanSubject = originalSubject.replace(/^(Re|RE|re):\s*/i, '');
    const fSubject = `Re: ${cleanSubject}`;
    const boundary = 'GECA_TPO_MANUAL_FOLLOWUP_DRAFT_BOUNDARY';

    const wrapHtmlBody = (txt: string) => {
      const paras = txt.split('\n\n').map(p => `<p style="margin:0 0 14px 0; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; font-size:14px; line-height:1.6; color:#1e293b;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
      return `<!DOCTYPE html><html><body>${paras}</body></html>`;
    };

    const wrapBase64 = (b64: string) => {
      const clean = b64.includes(',') ? b64.split(',')[1] : b64;
      const stripped = clean.replace(/\s+/g, '');
      const matches = stripped.match(/.{1,76}/g);
      return matches ? matches.join('\r\n') : stripped;
    };

    const emailParts = [
      `From: me`,
      `To: ${company.email}`,
      `Subject: ${fSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ''
    ];

    if (lastMessageId) {
      emailParts.splice(3, 0, `In-Reply-To: ${lastMessageId}`, `References: ${references || lastMessageId}`);
    }

    emailParts.push(
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      wrapHtmlBody(followUpBody),
      ''
    );

    if (attachBrochure) {
      const rawBrochureBase64 = getGecaBrochureBase64();
      emailParts.push(
        `--${boundary}`,
        'Content-Type: application/pdf; name="GECA CSN TNP Brochure 26-27.pdf"',
        'Content-Disposition: attachment; filename="GECA CSN TNP Brochure 26-27.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(rawBrochureBase64),
        ''
      );
    }

    if (attachLetter) {
      const rawLetterBase64 = getGecaInvitationLetterBase64(name, hrName);
      emailParts.push(
        `--${boundary}`,
        'Content-Type: application/pdf; name="Invitation Letter 26-27.pdf"',
        'Content-Disposition: attachment; filename="Invitation Letter 26-27.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(rawLetterBase64),
        ''
      );
    }

    if (uploadedAttachments && uploadedAttachments.length > 0) {
      uploadedAttachments.forEach((att) => {
        const safeName = (att.name || 'attachment.bin').replace(/["\r\n]/g, '_');
        const mimeType = att.type || 'application/octet-stream';
        emailParts.push(
          `--${boundary}`,
          `Content-Type: ${mimeType}; name="${safeName}"`,
          `Content-Disposition: attachment; filename="${safeName}"`,
          'Content-Transfer-Encoding: base64',
          '',
          wrapBase64(att.base64),
          ''
        );
      });
    }

    emailParts.push(`--${boundary}--`);

    const rawMsg = emailParts.join('\r\n');
    const base64UrlMsg = stringToBase64Url(rawMsg);

    const draftMsgObj: any = { raw: base64UrlMsg };
    if (foundThreadId) {
      draftMsgObj.threadId = foundThreadId;
    }

    const draftUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';
    const resDraft = await fetch(draftUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        draft: {
          message: draftMsgObj
        }
      })
    });

    if (!resDraft.ok) {
      throw new Error(`Gmail API failed to create draft follow-up: ${await resDraft.text()}`);
    }

    if (rowNum) {
      // Update Spreadsheet Row: Status (E), Sent Date (F), Last Action Date (G), Follow Up Count (H)
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Companies!E${rowNum}:H${rowNum}`)}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[newStatus, company.sentDate || '', today.toLocaleString(), nextCount]]
        })
      });
    }

    // Log communication audit
    const logUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Communication Log'!A2:E2")}:append?valueInputOption=USER_ENTERED`;
    await fetch(logUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[today.toLocaleString(), name, company.email, `Drafted Follow-Up ${nextCount}`, `Manually created a Gmail draft for follow-up reminder #${nextCount} inside active Gmail thread.`]]
      })
    });

    await syncData(token, spreadsheetId);
  };

  return (
    <div id="app_root" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Professional TPO Institutional Header */}
      <header id="main_header" className="bg-white border-b border-slate-200 py-4 px-8 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 id="app_main_title" className="text-lg font-bold text-slate-900 tracking-tight font-sans">GECA TNP Outreach Automation</h1>
            <span id="app_main_subtitle" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">
              Government College of Engineering Aurangabad (Autonomous)
            </span>
          </div>
        </div>

        {/* User Auth Indicators */}
        <div id="user_auth_section" className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 block font-sans">Dr. Praveen C. Shetiye (TPO)</span>
                <span className="text-[10px] text-slate-400 block font-mono">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs font-medium transition-colors font-sans shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-xs font-semibold transition-all shadow-xs focus:outline-none disabled:opacity-50"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              Sign In with Google Account
            </button>
          )}
        </div>
      </header>

      {/* Main Tabbed Layout Grid */}
      <div id="main_layout_body" className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-6">
        {/* Navigation Selector Tabs */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} spreadsheetConnected={!!spreadsheetId} />

        {syncError && (
          <div id="sync_error_banner" className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 shadow-2xs items-start md:items-center justify-between">
            <div className="flex gap-3 items-start flex-1">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="text-xs text-rose-900 block font-sans">Google Workspace API Status</strong>
                <p className="text-xs text-rose-800 leading-relaxed font-sans mt-0.5">{syncError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(!token || syncError.includes('Sign In') || syncError.includes('expired') || syncError.includes('credentials')) && (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer font-sans"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  Sign In with Google Account
                </button>
              )}
              <button 
                onClick={() => setSyncError(null)}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-100 transition-colors font-sans cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Content Pane Switch */}
        <main id="tab_contents_container" className="flex-1">
          {activeTab === 'classroom' && <ClassroomView />}
          {activeTab === 'dashboard' && <DashboardView companies={companies} onSaveRemarks={(cName, remarks) => handleUpdateStatus(cName, 'Replied', remarks)} />}
          {activeTab === 'crm' && (
            <CRMView
              accessToken={token}
              spreadsheetId={spreadsheetId}
              setSpreadsheetId={updateSpreadsheetId}
              companies={companies}
              loading={loading}
              onSync={handleManualSync}
              onCreateNewSheet={handleCreateNewSheet}
              onAddCompany={handleAddCompany}
              onAddCompanies={handleAddCompanies}
              onBulkUpdateCompanies={handleBulkUpdateCompanies}
            />
          )}
          {activeTab === 'outreach' && (
            <OutreachView
              accessToken={token}
              spreadsheetId={spreadsheetId}
              companies={companies}
              onSendBulkEmails={handleSendBulkEmails}
              onSendTestEmail={handleSendTestEmail}
              testingMode={testingMode}
              setTestingMode={handleToggleTestingMode}
              autoStatus={autoStatus}
              onRunAutoCampaign={handleManualRunAutoCampaign}
              onSendSingleFollowUp={handleSendSingleFollowUp}
              onCreateFollowUpDraft={handleCreateFollowUpDraft}
            />
          )}
          {activeTab === 'followup' && (
            <FollowUpView
              accessToken={token}
              spreadsheetId={spreadsheetId}
              companies={companies}
              onSendSingleFollowUp={handleSendSingleFollowUp}
              onCreateFollowUpDraft={handleCreateFollowUpDraft}
              onSaveRemarks={(cName, remarks) => handleUpdateStatus(cName, 'Replied', remarks)}
              testingMode={testingMode}
              setTestingMode={handleToggleTestingMode}
            />
          )}
          {activeTab === 'aidrafts' && (
            <AIDraftsView
              accessToken={token}
              spreadsheetId={spreadsheetId}
              companies={companies}
              onGenerateDraft={handleGenerateDraft}
              onCreateDraftInGmail={handleCreateDraftInGmail}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
          {activeTab === 'commlog' && (
            <CommLogView
              logs={logs}
              loading={loading}
              onSync={handleManualSync}
              spreadsheetId={spreadsheetId}
            />
          )}
        </main>
      </div>
    </div>
  );
}
