/**
 * Programmatically generates a standard, valid PDF document in pure TypeScript without any heavy dependencies.
 * Returns a Base64-encoded string representing the generated PDF file.
 */
export function generateSimplePDF(title: string, subtitle: string, lines: string[]): string {
  // Setup stream with simple PDF drawing commands
  let contentStream = `BT\n/F1 18 Tf\n50 720 Td\n(${escapePdfText(title)}) Tj\nET\n`;
  contentStream += `BT\n/F1 12 Tf\n50 685 Td\n(${escapePdfText(subtitle)}) Tj\nET\n`;
  
  // Draw a visual separator line (using PDF vector graphics operators)
  contentStream += `0.5 w\n50 670 m\n562 670 l\nS\n`;
  
  let currentY = 640;
  for (const line of lines) {
    if (!line) {
      currentY -= 12; // Empty space for paragraphs
      continue;
    }
    const escapedLine = escapePdfText(line);
    contentStream += `BT\n/F1 10 Tf\n50 ${currentY} Td\n(${escapedLine}) Tj\nET\n`;
    currentY -= 18;
  }
  
  // Footer credit
  contentStream += `0.5 w\n50 70 m\n562 70 l\nS\n`;
  contentStream += `BT\n/F1 8 Tf\n50 55 Td\n(${escapePdfText('Government College of Engineering, Aurangabad (Autonomous) | Training & Placement Office')}) Tj\nET\n`;

  const streamData = `stream\n${contentStream}endstream`;
  const streamLength = contentStream.length;
  
  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n";
  const obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  
  const obj5Header = `5 0 obj\n<< /Length ${streamLength} >>\n`;
  const obj5Footer = "\nendobj\n";
  
  const part1 = header;
  const offset1 = part1.length;
  const part2 = obj1;
  const offset2 = offset1 + part2.length;
  const part3 = obj2;
  const offset3 = offset2 + part3.length;
  const part4 = obj3;
  const offset4 = offset3 + part4.length;
  const part5 = obj4;
  const offset5 = offset4 + part5.length;
  
  const part6 = obj5Header + streamData + obj5Footer;
  const offsetXref = offset5 + part6.length;
  
  // Build xref table
  const xref = `xref\n` +
    `0 6\n` +
    `0000000000 65535 f \n` +
    `${offset1.toString().padStart(10, '0')} 00000 n \n` +
    `${offset2.toString().padStart(10, '0')} 00000 n \n` +
    `${offset3.toString().padStart(10, '0')} 00000 n \n` +
    `${offset4.toString().padStart(10, '0')} 00000 n \n` +
    `${offset5.toString().padStart(10, '0')} 00000 n \n`;
    
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offsetXref}\n%%EOF\n`;
  
  const fullPdf = part1 + part2 + part3 + part4 + part5 + part6 + xref + trailer;
  
  // Return base64 encoded binary safe PDF
  return btoa(unescape(encodeURIComponent(fullPdf)));
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Generates the standardized Placement Brochure for GECA.
 */
export function getGecaBrochureBase64(): string {
  return generateSimplePDF(
    "GOVERNMENT COLLEGE OF ENGINEERING, AURANGABAD",
    "Training & Placement Brochure - Academic Year 2026-2027",
    [
      "Established: 1960 (An Autonomous Institute of Government of Maharashtra)",
      "Affiliation: Dr. Babasaheb Ambedkar Marathwada University",
      "NBA Accredited Programs | NIRF Ranked State Engineering Institute",
      "",
      "--- ACADEMIC PROGRAMS OFFERED ---",
      "1. Under-Graduate (B.Tech):",
      "   - Computer Science & Engineering",
      "   - Information Technology",
      "   - Electronics & Telecommunication Engineering",
      "   - Electrical Engineering",
      "   - Mechanical Engineering",
      "   - Civil Engineering",
      "",
      "2. Post-Graduate (M.Tech & MCA):",
      "   - Master of Computer Applications (MCA)",
      "   - Specialized M.Tech streams across all disciplines",
      "",
      "--- HIGHLIGHTS & RECRUITING CREDENTIALS ---",
      "- Strong focus on Practical Labs, Industry Projects, and Internships",
      "- High-caliber technical talent trained on modern paradigms (AI/ML, VLSI, CAD)",
      "- Vibrant campus with over 15+ student technical clubs and chapters",
      "- Active alumni network representing leading global engineering and consulting firms",
      "",
      "Contact Details:",
      "Training & Placement Officer, GECA",
      "Email: tpo@geca.ac.in | Phone: +91 240 2366180",
      "Address: Station Road, Chhatrapati Sambhajinagar - 431005, Maharashtra, India"
    ]
  );
}

/**
 * Generates the formal Campus Placement Invitation Letter for GECA.
 */
export function getGecaInvitationLetterBase64(companyName: string, hrName: string): string {
  return generateSimplePDF(
    "GOVERNMENT COLLEGE OF ENGINEERING, AURANGABAD",
    "Formal Campus Placement & Internship Invitation",
    [
      "Ref No: GECA/TPO/INV/2026-27/O-104",
      `Date: ${new Date().toLocaleDateString()}`,
      "",
      "To,",
      `The Human Resources Team / Campus Recruiting Lead`,
      `${companyName || 'Corporate Partner'}`,
      "",
      "Subject: Invitation for Campus Placement and Internship Drive for 2026-27 Batch",
      "",
      `Dear ${hrName || 'HR Partner'},`,
      "",
      "Greetings from Government College of Engineering, Aurangabad!",
      "",
      "We take great pride in inviting your esteemed organization to participate in our",
      "Campus Placement and Internship Recruitment program for our upcoming graduating batch.",
      "GECA (estd. 1960) has been an anchor of premium technical talent in Western India,",
      "fostering academic rigour, research excellence, and strong industrial orientation.",
      "",
      "We request you to share your recruitment timeline, job descriptions, and eligibility criteria.",
      "Our Training & Placement cell is equipped with excellent infrastructure for holding virtual",
      "and physical interviews, group discussions, and technical pre-placement talks.",
      "",
      "Please refer to the attached T&P Brochure for student statistics and course structures.",
      "We look forward to hosting your recruitment team on campus.",
      "",
      "Sincerely yours,",
      "",
      "Dr. Praveen C. Shetiye",
      "Training and Placement Officer",
      "Government College of Engineering, Aurangabad"
    ]
  );
}
