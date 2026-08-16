export interface Company {
  name: string;
  hrName: string;
  email: string;
  industry: string;
  status: 'Pending' | 'Invited' | 'Replied' | 'Interested' | 'Not Interested' | 'Follow Up 1' | 'Follow Up 2' | 'Follow Up 3' | 'No Response' | 'Drive Scheduled';
  sentDate: string;
  lastActionDate: string;
  followUpCount: number;
  replyReceived: 'Yes' | 'No';
  replyDate: string;
  threadId: string;
  aiClassification: string;
  nextAction: string;
  remarks: string;
  emailDeliveryStatus?: 'Delivered' | 'Bounced / Failed' | 'Valid' | 'Invalid / Fake' | 'Unknown' | 'Checking...';
  isEmailBounced?: boolean;
  mailSuiteNote?: string;
}

export interface CommLog {
  timestamp: string;
  company: string;
  email: string;
  action: string;
  details: string;
}

export interface DashboardStats {
  totalCompanies: number;
  emailsSent: number;
  repliesReceived: number;
  interestedCompanies: number;
  pendingReplies: number;
  followUpsSent: number;
  campusDrivesScheduled: number;
  internshipsOffered: number;
  closedCompanies: number;
  noResponseCompanies: number;
}

export interface ClassroomStep {
  id: number;
  title: string;
  objective: string;
  explanation: string;
  appsScriptCode?: string;
  codeExplanation?: { line: string; desc: string }[];
  visualSteps: string[];
}
