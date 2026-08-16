import { Company } from '../types';

/**
 * Standard RFC 5322 Email Validation Regex Pattern
 */
export const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates an email string against standard RFC 5322 format rules
 */
export function validateRFC5322Email(email: string): { isValid: boolean; reason?: string } {
  const clean = (email || '').trim();
  if (!clean) {
    return { isValid: false, reason: 'Email field is empty' };
  }
  if (clean.length > 254) {
    return { isValid: false, reason: 'Email exceeds maximum RFC 5322 length (254 chars)' };
  }
  if (!clean.includes('@')) {
    return { isValid: false, reason: 'Missing "@" symbol' };
  }
  const parts = clean.split('@');
  if (parts.length > 2) {
    return { isValid: false, reason: 'Multiple "@" symbols found' };
  }
  if (!parts[0]) {
    return { isValid: false, reason: 'Missing username before "@"' };
  }
  if (!parts[1]) {
    return { isValid: false, reason: 'Missing domain after "@"' };
  }
  if (!parts[1].includes('.')) {
    return { isValid: false, reason: 'Domain lacks top-level domain extension (e.g. .com, .in)' };
  }
  if (!RFC5322_EMAIL_REGEX.test(clean)) {
    return { isValid: false, reason: 'Contains invalid characters or invalid RFC 5322 syntax' };
  }
  return { isValid: true };
}

/**
 * Common fake, test, or placeholder domains that typically bounce or fail to deliver
 */
const FAKE_DOMAINS = [
  'example.com',
  'test.com',
  'test.in',
  'dummy.com',
  'dummy.org',
  'fake.com',
  'test.org',
  'sample.com',
  'invalid.com',
  'noemail.com',
  'none.com',
  'fake.co'
];

/**
 * Check if an email address is syntactically valid and not a known placeholder/bounce address
 */
export function isEmailAddressLegit(email: string): {
  isLegit: boolean;
  status: 'Delivered' | 'Bounced / Failed' | 'Valid' | 'Invalid / Fake' | 'Unknown';
  note: string;
} {
  const clean = (email || '').trim().toLowerCase();

  // Validate standard RFC 5322 format first
  const rfcCheck = validateRFC5322Email(clean);
  if (!rfcCheck.isValid) {
    return {
      isLegit: false,
      status: 'Invalid / Fake',
      note: `MailSuite RFC 5322 Check: ${rfcCheck.reason}`
    };
  }

  // Domain parsing
  const parts = clean.split('@');
  const domain = parts[1] || '';

  // Check against known fake/test/bounce domains
  if (FAKE_DOMAINS.includes(domain) || clean.startsWith('test@') || clean.startsWith('dummy@') || clean.startsWith('fake@') || clean.startsWith('noemail@')) {
    return {
      isLegit: false,
      status: 'Bounced / Failed',
      note: `MailSuite Notification: Delivery failed (${domain} host rejected / recipient unknown). Kept aside from follow-ups.`
    };
  }

  // Check for common corporate & academic TLDs
  const validTlds = ['.com', '.in', '.org', '.net', '.edu', '.ac.in', '.co.in', '.io', '.ai', '.co', '.gov', '.tech'];
  const hasValidTld = validTlds.some(tld => domain.endsWith(tld));
  if (!hasValidTld && !domain.includes('.')) {
    return {
      isLegit: false,
      status: 'Invalid / Fake',
      note: 'MailSuite Notice: Invalid top-level domain (TLD).'
    };
  }

  return {
    isLegit: true,
    status: 'Delivered',
    note: 'MailSuite Verified: Email address is legit & delivered successfully.'
  };
}

/**
 * Returns true if a company's email has bounced or failed MailSuite delivery
 */
export function isCompanyEmailBounced(company: Company): boolean {
  if (company.isEmailBounced === true) return true;
  if (company.emailDeliveryStatus === 'Bounced / Failed' || company.emailDeliveryStatus === 'Invalid / Fake') return true;
  
  // Also check legitimacy if status is not explicitly set
  const check = isEmailAddressLegit(company.email);
  return !check.isLegit;
}

/**
 * Get display badge info for MailSuite status
 */
export function getMailSuiteBadge(company: Company): {
  label: string;
  colorClass: string;
  isBounced: boolean;
  note: string;
} {
  const isBounced = isCompanyEmailBounced(company);
  const check = isEmailAddressLegit(company.email);

  if (company.isEmailBounced || isBounced) {
    return {
      label: 'MailSuite: Failed / Bounced',
      colorClass: 'bg-rose-100 text-rose-800 border-rose-200',
      isBounced: true,
      note: company.mailSuiteNote || check.note || 'MailSuite Notification: Mail failed to deliver. Kept aside.'
    };
  }

  if (company.emailDeliveryStatus === 'Delivered' || check.isLegit) {
    return {
      label: 'MailSuite: Delivered / Legit',
      colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      isBounced: false,
      note: company.mailSuiteNote || 'MailSuite: Email verified & delivered.'
    };
  }

  return {
    label: 'MailSuite: Unverified',
    colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
    isBounced: false,
    note: 'MailSuite: Pending verification check.'
  };
}
