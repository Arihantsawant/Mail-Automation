import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize the Gemini API client server-side only
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

app.use(express.json());

// API route: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', apiConfigured: !!ai });
});

// High-fidelity fallback rule engines for resilient offline/quota operations
function fallbackAnalyzeReply(subject: string, body: string) {
  const text = ((body || '') + ' ' + (subject || '')).toLowerCase();
  
  let classification = 'Pending';
  let confidence = 0.7;
  let nextAction = 'Review reply manually in Gmail';
  let remarks = 'Awaiting manual verification of response.';

  // Interested keywords
  const interestedKeywords = [
    'interested', 'yes', 'confirm', 'sure', 'would love', 'glad to', 'happy to', 'pleased to',
    'dates', 'schedule', 'slot', 'meeting', 'discussion', 'discuss', 'interview', 'hiring',
    'ppt', 'placement', 'recruiting', 'drive', 'host', 'conduct', 'resume', 'cvs', 'participate',
    'august', 'september', 'october', 'november', 'december', 'january', 'february', 'share syllabus'
  ];

  // Not Interested keywords
  const notInterestedKeywords = [
    'not hiring', 'no hiring', 'freeze', 'no req', 'no vacancy', 'no requirement',
    'sorry', 'unfortunately', 'unable to', 'cannot participate', 'decline', 'reject',
    'busy', 'not interested', 'no opening', 'out of scope'
  ];

  // Check not interested first to be conservative
  let notInterestedCount = 0;
  for (const kw of notInterestedKeywords) {
    if (text.includes(kw)) {
      notInterestedCount++;
    }
  }

  let interestedCount = 0;
  for (const kw of interestedKeywords) {
    if (text.includes(kw)) {
      interestedCount++;
    }
  }

  if (notInterestedCount > interestedCount) {
    classification = 'Not Interested';
    confidence = 0.85;
    nextAction = 'Thank HR recruiter and request future consideration';
    remarks = 'HR recruiter indicated they are unable to participate in campus recruitment at this time.';
  } else if (interestedCount > 0) {
    classification = 'Interested';
    confidence = 0.9;
    nextAction = 'Schedule introductory discussion and share placement brochure';
    remarks = 'HR recruiter expressed positive interest in recruiting from GECA.';
  }

  return {
    classification,
    confidence,
    nextAction,
    remarks
  };
}

function fallbackGenerateDraft(companyName: string, incomingEmailBody: string, statusType: string) {
  const normStatus = (statusType || '').toLowerCase();
  const name = companyName || 'Corporate Partner';

  let subject = `Re: Campus Placement & Internship Drive 2026-27 | GECA`;
  let body = '';

  if (normStatus.includes('interested') || normStatus === 'replied') {
    subject = `Re: Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar`;
    body = `Dear HR Lead at ${name},

Thank you for your favorable response and interest in collaborating with the Government College of Engineering, Aurangabad (GECA) for the 2026-27 recruiting season. We are delighted to hear of your interest.

To coordinate the recruitment process, we would be happy to host a brief 10-minute introductory Zoom or MS Teams meeting. Alternatively, please let us know of any preferred dates and slot times for your campus presentations or interviews so we can book our auditorium and laboratory infrastructure.

We have also prepared and attached our comprehensive placement brochure and branch-wise curriculum sheets for your team's reference.

We look forward to partnering with ${name} to welcome your recruitment teams to our campus.

Warm regards,

Dr. Praveen C. Shetiye,
Training and Placement Officer,
Government College of Engineering, Aurangabad.`;
  } else if (normStatus.includes('not interested')) {
    subject = `Re: Campus Placement Invitation 2026-27 | GECA`;
    body = `Dear HR Lead at ${name},

Thank you for taking the time to respond to our invitation and letting us know your current recruitment plans. We completely understand and respect your decision.

We will keep your contact details in our records and would love to reconnect with your team during future hiring seasons when opportunities open up. Wishing ${name} continued success in all your business endeavors.

Warm regards,

Dr. Praveen C. Shetiye,
Training and Placement Officer,
Government College of Engineering, Aurangabad.`;
  } else {
    // Default or Follow Up
    subject = `Gentle Reminder: Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar`;
    body = `Dear HR Lead at ${name},

I hope you are having a wonderful week.

I am writing to gently follow up on our previous campus invitation regarding recruiting our exceptional graduates from Government College of Engineering, Aurangabad (GECA) for the 2026-27 graduating batch.

We would be thrilled to establish a recruitment partnership with ${name}. Please let us know if we can schedule a brief 5-minute introductory call to discuss how we can facilitate your talent needs.

Warm regards,

Dr. Praveen C. Shetiye,
Training and Placement Officer,
Government College of Engineering, Aurangabad.`;
  }

  return {
    subject,
    body
  };
}

function fallbackParseEmails(emails: string[]) {
  const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com', 'zoho.com', 'protonmail.com'];
  
  const results = emails.map(email => {
    const cleanEmail = (email || '').trim();
    if (!cleanEmail) {
      return {
        email: '',
        name: 'Corporate Partner',
        hrName: 'HR Recruiter',
        industry: 'Software Services'
      };
    }

    const parts = cleanEmail.split('@');
    const localPart = parts[0] || '';
    const domainPart = parts[1] || '';

    // Deduce Company Name
    let companyName = 'Corporate Partner';
    if (domainPart) {
      const domainName = domainPart.split('.')[0] || '';
      if (domainName && !commonProviders.includes(domainPart.toLowerCase())) {
        const lowerDomain = domainName.toLowerCase();
        if (lowerDomain === 'tcs') companyName = 'Tata Consultancy Services (TCS)';
        else if (lowerDomain === 'cognizant') companyName = 'Cognizant';
        else if (lowerDomain === 'infosys') companyName = 'Infosys';
        else if (lowerDomain === 'wipro') companyName = 'Wipro';
        else if (lowerDomain === 'ibm') companyName = 'IBM';
        else if (lowerDomain === 'hcl') companyName = 'HCL Tech';
        else if (lowerDomain === 'nvidia') companyName = 'NVIDIA';
        else if (lowerDomain === 'siemens') companyName = 'Siemens';
        else if (lowerDomain === 'larsentoubro' || lowerDomain === 'lnt') companyName = 'L&T';
        else if (lowerDomain === 'capgemini') companyName = 'Capgemini';
        else if (lowerDomain === 'accenture') companyName = 'Accenture';
        else {
          companyName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        }
      }
    }

    // Deduce HR Recruiter Name
    let hrName = 'HR Recruiter';
    if (localPart) {
      const cleanedLocal = localPart.replace(/[._-]/g, ' ').trim();
      const genericKeywords = ['hr', 'recruitment', 'recruit', 'placement', 'jobs', 'careers', 'info', 'support', 'contact', 'admin', 'tpo'];
      const isGeneric = genericKeywords.some(kw => cleanedLocal.toLowerCase().includes(kw));

      if (!isGeneric && cleanedLocal.length > 2) {
        hrName = cleanedLocal
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }

    // Deduce Industry
    let industry = 'Software Services';
    const lowerCompany = companyName.toLowerCase();
    if (lowerCompany.includes('siemens') || lowerCompany.includes('l&t') || lowerCompany.includes('tata') || lowerCompany.includes('mahindra') || lowerCompany.includes('bosch')) {
      industry = 'Engineering & Core';
    } else if (lowerCompany.includes('nvidia') || lowerCompany.includes('intel') || lowerCompany.includes('amd') || lowerCompany.includes('apple') || lowerCompany.includes('google') || lowerCompany.includes('microsoft')) {
      industry = 'Technology / Hardware';
    } else if (lowerCompany.includes('hcl') || lowerCompany.includes('tcs') || lowerCompany.includes('infosys') || lowerCompany.includes('wipro') || lowerCompany.includes('cognizant')) {
      industry = 'Software Services';
    } else if (lowerCompany.includes('finance') || lowerCompany.includes('bank') || lowerCompany.includes('goldman') || lowerCompany.includes('morgan')) {
      industry = 'Finance & Banking';
    }

    return {
      email: cleanEmail,
      name: companyName,
      hrName: hrName,
      industry: industry
    };
  });

  return { results };
}

// API route: Analyze reply with Gemini AI
app.post('/api/analyze-reply', async (req, res) => {
  const { subject, body } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'Email body is required for analysis.' });
  }

  // Handle fallback if Gemini is not configured
  if (!ai) {
    console.warn('[API] Gemini is not configured. Falling back to local rule-engine.');
    const analysis = fallbackAnalyzeReply(subject, body);
    return res.json({
      classification: analysis.classification,
      confidence: 0.7,
      nextAction: analysis.nextAction,
      remarks: `${analysis.remarks} (Local Fallback Mode)`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
        Analyze the following reply email from a corporate HR/recruiter regarding a campus placement invitation.
        Classify their response into one of the following statuses:
        - Interested (if they show interest in conducting campus drives, scheduling discussions, or request more information/dates to recruit)
        - Not Interested (if they explicitly decline, have no hiring plan, or state they cannot participate)
        - Pending (if the email is automatic, generic out-of-office, or doesn't have a clear decision yet)

        Subject: ${subject || '(No Subject)'}
        Body:
        ${body}
      `,
      config: {
        systemInstruction: 'You are an expert Training and Placement AI assistant at GECA. Your role is to accurately classify emails from company HRs and formulate recommended next actions.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: {
              type: Type.STRING,
              description: 'One of: "Interested", "Not Interested", "Pending"',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score from 0.0 to 1.0',
            },
            nextAction: {
              type: Type.STRING,
              description: 'Specific direct recommended next action for the GECA TPO cell',
            },
            remarks: {
              type: Type.STRING,
              description: 'A 1-sentence executive summary of the HR response',
            },
          },
          required: ['classification', 'confidence', 'nextAction', 'remarks'],
        },
      },
    });

    const resultText = response.text || '{}';
    const analysis = JSON.parse(resultText);
    res.json(analysis);
  } catch (error: any) {
    console.warn('[API] Gemini analysis failed, using fallback:', error.message || error);
    const analysis = fallbackAnalyzeReply(subject, body);
    res.json({
      classification: analysis.classification,
      confidence: 0.7,
      nextAction: analysis.nextAction,
      remarks: `${analysis.remarks} (Local Fallback Mode - Quota/Auth Exceeded)`
    });
  }
});

// API route: Generate professional draft response using Gemini AI
app.post('/api/generate-draft', async (req, res) => {
  const { companyName, previousEmailSubject, incomingEmailBody, statusType } = req.body;

  // Handle fallback if Gemini is not configured
  if (!ai) {
    console.warn('[API] Gemini is not configured. Falling back to local rule-engine.');
    const analysis = fallbackAnalyzeReply(previousEmailSubject || '', incomingEmailBody || '');
    const resolvedStatus = statusType === 'Replied' ? analysis.classification : statusType;
    const fallbackDraft = fallbackGenerateDraft(companyName, incomingEmailBody, resolvedStatus);
    return res.json({
      subject: fallbackDraft.subject,
      body: fallbackDraft.body,
      classification: resolvedStatus,
      confidence: 0.8,
      nextAction: analysis.nextAction,
      remarks: `${analysis.remarks} (Local Fallback Mode)`,
      draftText: fallbackDraft.body
    });
  }

  try {
    const prompt = `
      You are the Training and Placement Officer (TPO) at Government College of Engineering Aurangabad (GECA).
      We need to draft a professional follow-up or reply email to the HR team of "${companyName}".
      
      Context:
      - College: Government College of Engineering Aurangabad (GECA), Chhatrapati Sambhajinagar, Maharashtra
      - Contact Details: Dr. Praveen C. Shetiye (Training and Placement Officer), Email: tpo@geca.ac.in
      - HR Status Classification: This email response should be tailored for: "${statusType}"
      - Incoming Email received from HR:
        "${incomingEmailBody || '(No incoming email yet, drafting a manual message)'}"

      Guidelines:
      - If statusType is "Interested" or "Replied", write a warm, extremely professional reply thanking them, proposing a brief 10-minute MS Teams/Zoom call to coordinate, or suggesting next steps.
      - If statusType is "Not Interested", draft a polite "Thank you" note, acknowledging their response, wishing them the best, and asking them to keep GECA in mind for future hiring seasons.
      - If statusType is "Follow Up", draft a gentle, highly professional reminder requesting their response to our earlier placement drive invitation.
      
      Ensure the tone is helpful, highly institutional, and respectful. Do not include brackets like [Your Name], replace them with actual placeholders like "Dr. Praveen C. Shetiye, Training and Placement Officer, GECA" or "T&P Cell, GECA".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are the Training and Placement Officer at GECA Aurangabad. Your drafting is immaculate, polite, grammatically perfect, and represents the high standard of a premier government engineering institution.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: 'Appropriate professional subject line',
            },
            body: {
              type: Type.STRING,
              description: 'The complete email body to send, formatted with professional paragraph breaks.',
            },
            classification: {
              type: Type.STRING,
              description: 'Inferred status: "Interested", "Not Interested", or "Pending"',
            },
            nextAction: {
              type: Type.STRING,
              description: 'Next action, e.g. "Review draft response in Gmail" or "No further action"',
            },
            remarks: {
              type: Type.STRING,
              description: 'Short remark summarizing the reply',
            }
          },
          required: ['subject', 'body'],
        },
      },
    });

    const resultText = response.text || '{}';
    const draft = JSON.parse(resultText);

    // Harmonize response with automated campaign checker
    draft.classification = draft.classification || (statusType === 'Replied' ? 'Interested' : statusType);
    draft.nextAction = draft.nextAction || 'Review draft response in Gmail';
    draft.remarks = draft.remarks || 'AI analyzed HR reply and generated draft.';
    draft.draftText = draft.body;

    res.json(draft);
  } catch (error: any) {
    console.warn('[API] Gemini draft generation failed, using fallback:', error.message || error);
    const analysis = fallbackAnalyzeReply(previousEmailSubject || '', incomingEmailBody || '');
    const resolvedStatus = statusType === 'Replied' ? analysis.classification : statusType;
    const fallbackDraft = fallbackGenerateDraft(companyName, incomingEmailBody, resolvedStatus);
    
    res.json({
      subject: fallbackDraft.subject,
      body: fallbackDraft.body,
      classification: resolvedStatus,
      confidence: 0.8,
      nextAction: analysis.nextAction,
      remarks: `${analysis.remarks} (Local Fallback Mode - Quota/Auth Exceeded)`,
      draftText: fallbackDraft.body
    });
  }
});

// API route: Parse emails using Gemini AI to extract Company and HR names
app.post('/api/parse-emails', async (req, res) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'An array of email addresses is required.' });
  }

  // Handle fallback if Gemini is not configured
  if (!ai) {
    console.warn('[API] Gemini is not configured. Falling back to local rule-engine.');
    const result = fallbackParseEmails(emails);
    return res.json(result);
  }

  try {
    const prompt = `
      You are an expert data curation AI. Analyze the following list of email addresses:
      ${JSON.stringify(emails)}

      For each email address, perform deep reasoning to deduce:
      1. Guessed Company Name from the domain. (e.g. "siemens.com" -> "Siemens", "tcs.com" -> "Tata Consultancy Services (TCS)", "gmail.com" -> "Corporate Partner"). Recognize brand names and standardize capitalization (e.g. "nvidia.com" -> "NVIDIA", "google.co.in" -> "Google").
      2. Guessed HR Contact Name from the local-part (before the @). Standardize it to be a proper Human Name. Capitalize first/last names. Replace punctuation (dots, underscores, hyphens) with spaces (e.g., "amit.sharma" -> "Amit Sharma", "deepika_p" -> "Deepika P", "hr.recruit" -> "HR Recruiter", "tpo" -> "TPO Coordinator").
      3. Guessed Industry sector. (e.g., "Software Services", "Automotive", "Engineering", "Finance", "Consulting", or "Other").

      Return a JSON array of objects representing the parsed results matching the input emails. Keep order preserved.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a precise data extractor. Deduce corporate details from email strings with standard institutional formatting.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              description: 'List of parsed email results in original order',
              items: {
                type: Type.OBJECT,
                properties: {
                  email: {
                    type: Type.STRING,
                    description: 'The input email address'
                  },
                  name: {
                    type: Type.STRING,
                    description: 'Inferred standardized company name'
                  },
                  hrName: {
                    type: Type.STRING,
                    description: 'Inferred standardized HR recruiter name'
                  },
                  industry: {
                    type: Type.STRING,
                    description: 'Inferred business sector/industry'
                  }
                },
                required: ['email', 'name', 'hrName', 'industry']
              }
            }
          },
          required: ['results']
        }
      }
    });

    const resultText = response.text || '{"results":[]}';
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.warn('[API] Gemini email parsing failed, using fallback:', error.message || error);
    const result = fallbackParseEmails(emails);
    res.json(result);
  }
});

// Start of Vite setup (development vs production)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GECA Placement Outreach server running on http://localhost:${PORT}`);
  });
}

startServer();
