import React, { useState } from 'react';
import { BookOpen, Code, Layers, FileText, Settings, Play, Mail, CheckCircle, Database, HelpCircle, ArrowRight } from 'lucide-react';

interface Module {
  id: number;
  title: string;
  badge: string;
  icon: React.ReactNode;
  objective: string;
  concept: string;
  whyColumnsExist?: { col: string; desc: string }[];
  appsScriptCode?: string;
  codeBreakdown?: { line: string; explanation: string }[];
  clicksAndMenus?: string[];
}

export default function ClassroomView() {
  const [activeModuleId, setActiveModuleId] = useState<number>(1);

  const modules: Module[] = [
    {
      id: 1,
      title: 'Google Sheets Setup',
      badge: 'Module 1',
      icon: <Database className="w-5 h-5" />,
      objective: 'Learn how to set up the foundation of our database inside Google Sheets, create the necessary sheets, and understand why each column is critical for placement automation.',
      concept: `A database is simply a place where we store our information in an organized way. For our placement automation, we use Google Sheets as our free, durable database. Instead of having just one giant list, we organize our database into three separate "Sheets" (tabs) at the bottom of our spreadsheet. This prevents clutter and keeps our communication records clean.`,
      whyColumnsExist: [
        { col: 'Company Name', desc: 'The official name of the recruiting organization (e.g., Tata Consultancy Services).' },
        { col: 'HR Name', desc: 'The name of the HR contact person. Personalizing emails with their name increases the reply rate by over 60%.' },
        { col: 'Email', desc: 'The HR professional\'s work email address. This is our primary communication channel.' },
        { col: 'Industry', desc: 'The sector (e.g., IT, Core, Manufacturing). Helps us filter and run industry-specific campus drives.' },
        { col: 'Status', desc: 'Crucial for automation. This tells our code what step the company is in (e.g., Pending, Invited, Replied, Interested, No Response). Our script skips anyone not marked correctly to avoid duplicate emails.' },
        { col: 'Sent Date', desc: 'The exact date and time the first invitation email was sent. We use this to calculate when to send follow-ups.' },
        { col: 'Last Action Date', desc: 'When the last interaction occurred (email sent, reply received, or status changed).' },
        { col: 'Follow Up Count', desc: 'Tracks how many follow-up reminders we have sent. We stop sending reminders after 3 follow-ups to maintain professionalism.' },
        { col: 'Reply Received', desc: 'A simple "Yes" or "No". Our code reads this. If "Yes", we stop sending automated follow-up reminders.' },
        { col: 'Reply Date', desc: 'The exact date the company responded, useful for placement records.' },
        { col: 'Thread ID', desc: 'The secret identifier that Google gives to a Gmail email thread. By saving this ID, our code can find the exact conversation later to check for new replies or attach follow-ups to the SAME email thread instead of starting a new one!' },
        { col: 'AI Classification', desc: 'The categorization of their reply (Interested, Not Interested, or Needs Discussion) determined automatically by our Gemini AI.' },
        { col: 'Next Action', desc: 'What our AI recommends the TPO Cell do next (e.g., "Schedule a call on Teams" or "Send syllabus documents").' },
        { col: 'Remarks', desc: 'Any additional notes or a short summary of our correspondence.' }
      ],
      clicksAndMenus: [
        'Open Google Sheets (sheets.google.com) on your computer.',
        'Click the "+" icon to create a brand new blank spreadsheet.',
        'Double-click the tab at the bottom left that says "Sheet1" and rename it to "Companies".',
        'In row 1 of your sheet, enter the column headers exactly as listed (Column A: Company Name, B: HR Name, etc.).',
        'Click the "+" button at the bottom left to add a second sheet. Rename this one to "Communication Log".',
        'Add columns to "Communication Log": Timestamp, Company, Email, Action, Details.',
        'Click "+" again to add a third sheet. Rename this to "Dashboard".'
      ]
    },
    {
      id: 2,
      title: 'Introduction to Apps Script',
      badge: 'Module 2',
      icon: <Code className="w-5 h-5" />,
      objective: 'Discover what Google Apps Script is, how it connects your Google Sheets with Gmail and Drive, and write your very first lines of automation code.',
      concept: `Google Apps Script is a free, modern programming language that runs inside Google's servers. It is based on JavaScript. Think of it as a magic remote control: it allows you to write instructions that tell Google Sheets to read cells, tell Gmail to write and send emails, and tell Google Drive to find files. Because it runs on Google's cloud, you don't need to install any software on your computer, and you can schedule it to run automatically even when your laptop is completely turned off!`,
      appsScriptCode: `// This is a comment. Google ignores lines starting with //
// It is just to explain the code in plain English!

function helloWorld() {
  // 1. Get our active Google Spreadsheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // 2. Get the sheet named "Companies"
  var sheet = spreadsheet.getSheetByName("Companies");
  
  // 3. Write "Hello World!" in the top-left cell (Row 1, Column 1)
  sheet.getRange(1, 1).setValue("Hello World!");
  
  // 4. Pop up a message box on the screen
  Browser.msgBox("Success! You wrote your first Google Apps Script line!");
}`,
      codeBreakdown: [
        { line: 'function helloWorld() { ... }', explanation: 'A "function" is a bundle of code that does a specific task. We give it a clear name (helloWorld) so we can click and run it later.' },
        { line: 'SpreadsheetApp.getActiveSpreadsheet()', explanation: 'SpreadsheetApp is Google\'s built-in tool manager for Sheets. This line grabs the exact spreadsheet window you currently have open.' },
        { line: 'var sheet = spreadsheet.getSheetByName("Companies")', explanation: 'We look inside our spreadsheet and grab the tab labeled "Companies". "var" creates a variable, which is like a labeled bucket where we store this sheet for later reference.' },
        { line: 'sheet.getRange(1, 1).setValue("Hello World!")', explanation: 'getRange(row, column) targets a specific coordinate. (1, 1) represents Cell A1. setValue writes text inside that targeted cell.' },
        { line: 'Browser.msgBox(...)', explanation: 'This creates a visual popup notification on your screen to announce that your code finished running!' }
      ],
      clicksAndMenus: [
        'Inside your Google Sheet, look at the top menu bar.',
        'Click on "Extensions" and then select "Apps Script" from the dropdown.',
        'A brand new editor window will open in your browser. This is your workspace!',
        'Erase any existing code (like "function myFunction() {}") and paste the Hello World script.',
        'Click the floppy disk icon or press Ctrl+S (Cmd+S on Mac) to save.',
        'In the top menu, select "helloWorld" in the dropdown list, and click the "Run" button (looks like a play icon).',
        'The first time you run it, Google will ask for Permissions. Click "Review Permissions", select your Google Account, click "Advanced", and then click "Go to Untitled project (unsafe)" to grant access. This is a standard safety check for your own scripts!'
      ]
    },
    {
      id: 3,
      title: 'Reading Company Data',
      badge: 'Module 3',
      icon: <Layers className="w-5 h-5" />,
      objective: 'Learn how our Apps Script program reads rows and columns from Google Sheets, understands Arrays, and processes multiple companies in a loop.',
      concept: `Before sending any emails, our program must "see" what companies we have written in our spreadsheet. In Apps Script, we read rows and columns as structured lists. To read data, we use "getValues()", which returns our spreadsheet rows as an "Array" (a list of items). We then use a "Loop" (specifically a "for loop") to go through our company list row-by-row, like a teacher reading down an attendance checklist.`,
      appsScriptCode: `function readCompanies() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Companies");
  
  // 1. Get all data starting from Row 2, Column 1 to the last row and column containing values
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  // Safety check: if sheet is empty, stop
  if (lastRow < 2) {
    Logger.log("No companies found in the spreadsheet!");
    return;
  }
  
  // 2. Read all values (Row 2, Column 1, Number of Rows, Number of Columns)
  var dataRange = sheet.getRange(2, 1, lastRow - 1, lastColumn);
  var values = dataRange.getValues();
  
  // 3. Loop through each row one-by-one
  for (var i = 0; i < values.length; i++) {
    var row = values[i]; // Get the current row
    
    // In computer programming, lists start counting at 0!
    var companyName = row[0]; // Column A (Company Name) is index 0
    var hrName = row[1];      // Column B (HR Name) is index 1
    var email = row[2];       // Column C (Email) is index 2
    var status = row[4];      // Column E (Status) is index 4
    
    // Print to the execution log
    Logger.log("Row " + (i + 2) + ": Company = " + companyName + ", HR = " + hrName + ", Status = " + status);
  }
}`,
      codeBreakdown: [
        { line: 'sheet.getLastRow()', explanation: 'Tells us the exact number of rows that have text in them. If we have 10 companies, this returns 11 (including the headers row).' },
        { line: 'sheet.getRange(2, 1, lastRow - 1, lastColumn)', explanation: 'We skip Row 1 (headers) and start at Row 2, Column 1. We read down to the last company row, covering all columns.' },
        { line: 'var values = dataRange.getValues()', explanation: 'This grabs the actual text inside all those cells at once. It returns a 2-dimensional grid: values[row_number][column_number].' },
        { line: 'for (var i = 0; i < values.length; i++)', explanation: 'A "for loop". It initializes a counter "i" at 0. It runs the code inside the brackets, increments "i" by 1, and repeats until it reaches the end of our company list!' },
        { line: 'Logger.log(...)', explanation: 'This is the developers diagnostic tool. It prints messages inside your script editor console so you can check if your code is reading the data correctly.' }
      ],
      clicksAndMenus: [
        'Paste the "readCompanies" function below your Hello World code in the Apps Script editor.',
        'Click Save (Floppy disk icon).',
        'In the dropdown at the top, select "readCompanies" and click "Run".',
        'Once finished, click the "Execution Log" or "Logs" tab at the bottom. You will see a printout of all the companies currently inside your Google Sheet!'
      ]
    },
    {
      id: 4,
      title: 'Send First Email',
      badge: 'Module 4',
      icon: <Mail className="w-5 h-5" />,
      objective: 'Discover GmailApp, the powerful built-in tool that allows Apps Script to draft and send emails on your behalf, and send a personalized test invitation to yourself.',
      concept: `GmailApp is the Apps Script service that manages your emails. The function "GmailApp.sendEmail()" is extremely powerful. It takes four primary parameters: recipient email, subject line, body text, and an options dictionary (where we can attach files, configure CC, or write beautiful HTML formatted emails). Let's practice by sending a single personalized email to our own email address.`,
      appsScriptCode: `function sendTestEmail() {
  // 1. Get your own Google Account email address automatically
  var myEmail = Session.getActiveUser().getEmail();
  
  var subject = "Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar";
  
  var body = "Dear HR Partner,\\n\\n" +
             "Greetings from Government College of Engineering Aurangabad (GECA)!\\n\\n" +
             "We take immense pride in inviting your prestigious organization to visit GECA, " +
             "an autonomous institute of the Government of Maharashtra, for our upcoming " +
             "Campus Recruitment and Internship Drive for the 2026-27 graduating batch.\\n\\n" +
             "Our students are selected through highly competitive merit lists and represent top technical talent.\\n\\n" +
             "We have attached our Placement Brochure and Formal Invitation Letter for your reference.\\n\\n" +
             "Looking forward to hosting your team.\\n\\n" +
             "Warm regards,\\n" +
             "Dr. Praveen C. Shetiye\\n" +
             "Training and Placement Officer\\n" +
             "GECA Aurangabad";
             
  // 2. Instruct Google to send this email via your account!
  GmailApp.sendEmail(myEmail, subject, body);
  
  Logger.log("Success! A test placement email has been sent to: " + myEmail);
}`,
      codeBreakdown: [
        { line: 'Session.getActiveUser().getEmail()', explanation: 'Grabs the email address of the person running the script. Perfect for testing so you don\'t accidentally email a real HR contact while practicing.' },
        { line: 'GmailApp.sendEmail(recipient, subject, body)', explanation: 'The core Gmail command. It sends a highly secure, instant email directly from your own Gmail account.' },
        { line: '"Dear HR Partner,\\n\\n..."', explanation: '\\n represents a "New Line". In JavaScript, we use \\n to break our text into neat, readable paragraphs instead of one long squished sentence.' }
      ],
      clicksAndMenus: [
        'Add the "sendTestEmail" code in Apps Script.',
        'Save and choose "sendTestEmail" from the run dropdown, then click Run.',
        'Go open your standard Gmail Inbox (gmail.com). You will see a formal campus placement invitation email sitting right there sent from yourself to yourself!'
      ]
    },
    {
      id: 5,
      title: 'Send Bulk Emails & Log Actions',
      badge: 'Module 5',
      icon: <Layers className="w-5 h-5" />,
      objective: 'Combine reading company data with Gmail automation. Implement safeguards to skip already-invited HRs, update their spreadsheet row status, and write records to the Communication Log.',
      concept: `Sending a single email is easy, but real productivity comes from bulk automation. We will loop through all companies in our Sheet, but add a critical check: is their "Status" set to "Pending"? If yes, we send them the email. If they have already been sent an email ("Invited" or "Replied"), our code will skip them! Once sent, our code will update their Status to "Invited", store the exact Sent Date, and write a confirmation entry inside our "Communication Log" tab so we have complete records.`,
      appsScriptCode: `function sendBulkEmails() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var companiesSheet = spreadsheet.getSheetByName("Companies");
  var logSheet = spreadsheet.getSheetByName("Communication Log");
  
  var lastRow = companiesSheet.getLastRow();
  if (lastRow < 2) return;
  
  var range = companiesSheet.getRange(2, 1, lastRow - 1, 14); // Read columns A to N
  var values = range.getValues();
  
  var subject = "Invitation for Campus Placement & Internship Drive 2026-27 | GECA, Chh. Sambhajinagar";
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var companyName = row[0];
    var hrName = row[1];
    var email = row[2];
    var status = row[4]; // Column E
    
    // CRITICAL SAFEGUARD: Only process companies marked as "Pending"
    if (status === "Pending") {
      try {
        var body = "Dear " + hrName + ",\\n\\n" +
                   "Greetings from Government College of Engineering Aurangabad (GECA)!\\n\\n" +
                   "We are pleased to invite " + companyName + " for our Campus Placement Drive 2026-27...\\n\\n" +
                   "Warm regards,\\n" +
                   "Training and Placement Cell, GECA";
                   
        // Send email and store the thread details
        var emailResult = GmailApp.sendEmail(email, subject, body);
        var threadId = emailResult.getThread().getId();
        var now = new Date();
        
        // Update Columns in "Companies" sheet:
        // Status is Column E (column number 5)
        // Row number on sheet is index "i + 2" (because we skipped headers and lists start at 0)
        companiesSheet.getRange(i + 2, 5).setValue("Invited"); // Status
        companiesSheet.getRange(i + 2, 6).setValue(now);       // Sent Date
        companiesSheet.getRange(i + 2, 7).setValue(now);       // Last Action Date
        companiesSheet.getRange(i + 2, 11).setValue(threadId); // Thread ID
        
        // Log to Communication Log sheet
        logSheet.appendRow([now, companyName, email, "Sent Invitation", "Initial placement outreach invitation sent to " + hrName]);
        
        Logger.log("Outreach sent successfully to: " + companyName);
      } catch (err) {
        Logger.log("Error sending to " + companyName + ": " + err.toString());
      }
    }
  }
}`,
      codeBreakdown: [
        { line: 'if (status === "Pending")', explanation: 'This is an "if statement". The code inside only runs if the status matches "Pending" exactly. This prevents spamming HR contacts multiple times.' },
        { line: 'var threadId = emailResult.getThread().getId()', explanation: 'When we send an email, Google returns the message object. We grab its thread, and fetch its secret alphanumeric ID. This ID allows us to group replies and follow-ups together!' },
        { line: 'companiesSheet.getRange(i + 2, 5).setValue("Invited")', explanation: 'Updates the spreadsheet row in real-time. This visual feedback shows you exactly which companies have been processed successfully.' },
        { line: 'logSheet.appendRow([now, companyName, ...])', explanation: 'Adds a brand new row at the very bottom of the Communication Log tab, recording the timestamp, company name, action type, and descriptions.' }
      ],
      clicksAndMenus: [
        'Paste the bulk script into Apps Script.',
        'Enter 2 test rows in your sheet with different emails (use your own emails or secondary accounts) and make sure to type "Pending" inside the Status column (Column E).',
        'Run "sendBulkEmails" and watch your spreadsheet values update automatically!',
        'Check your Communication Log sheet to verify the row additions.'
      ]
    },
    {
      id: 6,
      title: 'Google Drive Attachments',
      badge: 'Module 6',
      icon: <FileText className="w-5 h-5" />,
      objective: 'Learn how DriveApp locates PDF documents inside your Google Drive, converts them into file objects, and attaches them to outbound Gmail invitations automatically.',
      concept: `To run a professional outreach, we must attach the formal "GECA CSN TNP Brochure 26-27.pdf" and the "Invitation Letter 26-27.pdf". To do this in Apps Script, we use DriveApp. It allows us to locate files using their unique "File ID" (the long string of letters and numbers in the URL when you open a file in Drive). We fetch these files as "Blobs" (binary file objects) and pass them as an attachments list to GmailApp.`,
      appsScriptCode: `function sendEmailWithAttachments() {
  // 1. Replace these with your actual Google Drive File IDs!
  var brochureFileId = "YOUR_DRIVE_FILE_ID_1";
  var letterFileId = "YOUR_DRIVE_FILE_ID_2";
  
  try {
    // 2. Fetch the files from your Google Drive
    var brochureFile = DriveApp.getFileById(brochureFileId).getAs("application/pdf");
    var letterFile = DriveApp.getFileById(letterFileId).getAs("application/pdf");
    
    var recipient = Session.getActiveUser().getEmail();
    var subject = "Campus Placement Drive | Attached PDF Brochure Test";
    var body = "Please find the attached brochures and documents.";
    
    // 3. Send email with files attached in the options parameter!
    GmailApp.sendEmail(recipient, subject, body, {
      attachments: [brochureFile, letterFile]
    });
    
    Logger.log("Email sent successfully with PDF attachments!");
  } catch (error) {
    Logger.log("Error fetching or attaching files: " + error.toString());
  }
}`,
      codeBreakdown: [
        { line: 'DriveApp.getFileById(fileId)', explanation: 'Connects to Google Drive, locates the specific file matching that ID, and prepares it for retrieval.' },
        { line: '.getAs("application/pdf")', explanation: 'Ensures the file is fetched in the standard PDF document format, making it safe and clean to attach.' },
        { line: '{ attachments: [brochureFile, letterFile] }', explanation: 'The fourth parameter in sendEmail is an Options block (written inside { }). "attachments" takes a list of files to enclose inside the email.' }
      ],
      clicksAndMenus: [
        'Upload your "GECA CSN TNP Brochure 26-27.pdf" and "Invitation Letter 26-27.pdf" to your Google Drive.',
        'Right-click each uploaded PDF file, choose "Share" -> "Copy Link".',
        'Extract the long code in the middle of the copied link. For example, in "drive.google.com/file/d/1A2B3C.../view", the File ID is "1A2B3C...".',
        'Paste these two File IDs into your Apps Script code.',
        'Run the "sendEmailWithAttachments" script and verify the PDFs are attached in your received email!'
      ]
    },
    {
      id: 7,
      title: 'Automatic Daily Scheduler',
      badge: 'Module 7',
      icon: <Settings className="w-5 h-5" />,
      objective: 'Discover Triggers. Understand how to schedule your placement scripts to run automatically every day at 9:00 AM without you needing to press any buttons.',
      concept: `A "Trigger" is an automated scheduler in Google's cloud. In manual execution, a script only runs when you manually click the "Run" button. In automatic execution, you tell Google's servers: "Hey, run this function every morning at 9:00 AM," or "Run this search script once every hour." This is how follow-ups and reply-checking become completely hands-free!`,
      clicksAndMenus: [
        'On the left sidebar of your Apps Script editor, click on the Clock icon (labeled "Triggers").',
        'In the bottom right corner, click the blue button that says "+ Add Trigger".',
        'Under "Choose which function to run", select your bulk sender or reply detector function (e.g., "scanForReplies").',
        'Under "Select event source", choose "Time-driven".',
        'Under "Select type of time based trigger", select "Day timer".',
        'Under "Select time of day", choose "9 AM to 10 AM".',
        'Click "Save". Now Google will automatically execute your placement outreach routine every single morning!'
      ]
    },
    {
      id: 8,
      title: 'Gmail Reply Detection',
      badge: 'Module 8',
      icon: <CheckCircle className="w-5 h-5" />,
      objective: 'Learn how to retrieve existing email threads using saved Thread IDs, inspect messages, and determine if an HR representative has sent a reply.',
      concept: `When we sent the initial email, we saved their "Thread ID" in Column K of our sheet. Now, we want to know if they replied! Our script uses the stored Thread ID to fetch the thread. We count how many emails are in that thread. Since the initial invitation has 1 message (sent by us), if the message count is 2 or more, it means the HR contact has sent a reply! We then extract the text of their last message and update our Sheet.`,
      appsScriptCode: `function checkForReplies() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Companies");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Read spreadsheet grid
  var range = sheet.getRange(2, 1, lastRow - 1, 14);
  var values = range.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var companyName = row[0];
    var status = row[4];
    var threadId = row[10]; // Column K (index 10) holds our saved Thread ID
    
    // Only check companies we invited who haven't replied yet
    if (status === "Invited" && threadId) {
      try {
        // 1. Fetch the conversation thread from Gmail
        var thread = GmailApp.getThreadById(threadId);
        var messages = thread.getMessages();
        
        // 2. If message count is greater than 1, they replied!
        if (messages.length > 1) {
          var lastMessage = messages[messages.length - 1]; // Get the last message
          var sender = lastMessage.getFrom();
          
          // Double check: make sure the reply didn't come from ourselves!
          if (sender.indexOf("tpo@geca.ac.in") === -1) {
            var replyBody = lastMessage.getPlainBody();
            var replyDate = lastMessage.getDate();
            
            // 3. Update spreadsheet: Status, Reply Received, Reply Date, Remarks
            sheet.getRange(i + 2, 5).setValue("Replied"); // Status
            sheet.getRange(i + 2, 9).setValue("Yes");     // Reply Received
            sheet.getRange(i + 2, 10).setValue(replyDate);// Reply Date
            sheet.getRange(i + 2, 14).setValue("HR replied! Needs AI categorization."); // Remarks
            
            Logger.log("New reply detected from: " + companyName);
          }
        }
      } catch (err) {
        Logger.log("Error checking replies for " + companyName + ": " + err.toString());
      }
    }
  }
}`,
      codeBreakdown: [
        { line: 'GmailApp.getThreadById(threadId)', explanation: 'Finds the exact email conversation folder matching our stored ID, retrieving all messages nested inside.' },
        { line: 'messages.length > 1', explanation: 'Checks the message tally. Since we sent 1 initial invitation, any count larger than 1 confirms a new email has arrived in the thread.' },
        { line: 'messages[messages.length - 1]', explanation: 'Grabs the absolute newest message (the reply) situated at the bottom of the list.' },
        { line: 'sender.indexOf("tpo@geca") === -1', explanation: 'A safety condition. Makes sure the reply wasn\'t sent by the TPO cell themselves (which would trigger a false reply detection!).' }
      ],
      clicksAndMenus: [
        'Add the "checkForReplies" function inside Apps Script.',
        'To simulate a reply, send an email from a secondary account to your college email in response to your test invitation.',
        'Run "checkForReplies" in the editor.',
        'Watch your "Companies" sheet columns automatically flip to "Replied", "Yes", and display the reply timestamp!'
      ]
    },
    {
      id: 9,
      title: 'Gemini AI Integration',
      badge: 'Module 9',
      icon: <BookOpen className="w-5 h-5" />,
      objective: 'Connect your Apps Script directly with Gemini AI. Send received HR replies to the AI, and extract structured evaluations (Interested vs. Not Interested) automatically.',
      concept: `Reading replies is great, but we still have to read them manually to see if they are interested. We can connect Google Apps Script to the Gemini API using "UrlFetchApp.fetch", which makes an HTTP request (an API call) to Gemini in the cloud. We send Gemini the email text and ask it to respond with standard JSON containing their interest classification, recommended next steps, and a short summary.`,
      appsScriptCode: `function analyzeReplyWithGemini(replyText) {
  var apiKey = "YOUR_GEMINI_API_KEY"; // Set your Gemini API key from AI Studio
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey;
  
  var prompt = "Analyze this HR placement reply. Classify it as either 'Interested' or 'Not Interested'. " +
               "Explain why and suggest next steps. Return ONLY a JSON object with fields: " +
               "classification, confidence, nextAction, and remarks. \\n\\nReply: " + replyText;
               
  var payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }]
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    // Extract the text block returned by Gemini
    var aiText = json.candidates[0].content.parts[0].text;
    
    // Clean up any markdown code block formatting if present
    aiText = aiText.replace("\`\`\`json", "").replace("\`\`\`", "").trim();
    
    return JSON.parse(aiText);
  } catch (error) {
    Logger.log("AI analysis error: " + error.toString());
    return null;
  }
}`,
      codeBreakdown: [
        { line: 'UrlFetchApp.fetch(url, options)', explanation: 'Google\'s built-in tool for making internet requests. It sends our HR reply text out to Gemini\'s cloud server and waits for the AI\'s answer.' },
        { line: 'JSON.stringify(payload)', explanation: 'Converts our structured programming instructions list into a standard plain-text string so Gemini\'s server can read it.' },
        { line: 'JSON.parse(...)', explanation: 'The reverse of stringify. It takes the plain-text JSON response returned by the AI and converts it back into an active programming object we can pull fields from.' }
      ],
      clicksAndMenus: [
        'Get a free Gemini API key from Google AI Studio.',
        'Paste the "analyzeReplyWithGemini" helper script into your Apps Script.',
        'Inside your main checker function, pass the received HR body to this helper and write the returned JSON classifications to Columns L, M, and N of your spreadsheet row!'
      ]
    },
    {
      id: 10,
      title: 'Automatic Follow-Up Routine',
      badge: 'Module 10',
      icon: <ArrowRight className="w-5 h-5" />,
      objective: 'Implement time-difference checks in Apps Script. Program the system to automatically send up to 3 gentle follow-ups spaced 7 days apart if there is no reply.',
      concept: `HR contacts are busy. Often, a gentle reminder after 7 days will secure a drive. Our script will look at companies with "Invited" or "Follow Up" status, calculate how many days have passed since the "Last Action Date", and if it is 7 or more days, automatically dispatch a polite reminder! We attach the follow-up message to the *same* Gmail thread ID, so the HR contact sees our original invitation directly beneath it!`,
      appsScriptCode: `function runFollowUpCampaign() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Companies");
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Communication Log");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  var range = sheet.getRange(2, 1, lastRow - 1, 14);
  var values = range.getValues();
  var today = new Date();
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var companyName = row[0];
    var hrName = row[1];
    var email = row[2];
    var status = row[4];
    var lastActionDate = new Date(row[6]); // Column G
    var followUpCount = row[7] || 0;      // Column H
    var threadId = row[10];                // Column K
    
    // Check if company has been invited but hasn't replied yet
    if ((status === "Invited" || status.indexOf("Follow Up") > -1) && threadId) {
      // Calculate days difference:
      var diffTime = Math.abs(today.getTime() - lastActionDate.getTime());
      var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If 7 or more days have passed since our last outreach
      if (diffDays >= 7 && followUpCount < 3) {
        try {
          var thread = GmailApp.getThreadById(threadId);
          var nextCount = followUpCount + 1;
          var newStatus = "Follow Up " + nextCount;
          
          var followUpBody = "Dear " + hrName + ",\\n\\n" +
                             "I hope you are well.\\n\\n" +
                             "I am writing to gently follow up on our previous campus invitation regarding " +
                             "recruitment at GECA for the 2026-27 season. We would be absolutely thrilled to " +
                             "partner with " + companyName + ".\\n\\n" +
                             "Please let us know if we can schedule a quick introductory call.\\n\\n" +
                             "Warm regards,\\n" +
                             "TPO Cell, GECA";
          
          // Reply directly inside the existing Gmail conversation thread!
          thread.reply(followUpBody);
          
          // Update Spreadsheet Columns
          sheet.getRange(i + 2, 5).setValue(newStatus);         // Status
          sheet.getRange(i + 2, 7).setValue(today);             // Last Action Date
          sheet.getRange(i + 2, 8).setValue(nextCount);         // Follow Up Count
          
          // Log the follow up
          logSheet.appendRow([today, companyName, email, "Sent Follow-Up " + nextCount, "Gentle reminder sent in thread " + threadId]);
          
          Logger.log("Follow up " + nextCount + " dispatched to: " + companyName);
        } catch (err) {
          Logger.log("Error sending follow-up to " + companyName + ": " + err.toString());
        }
      } else if (diffDays >= 7 && followUpCount >= 3) {
        // If still no reply after 3 follow ups, mark as No Response and stop emailing
        sheet.getRange(i + 2, 5).setValue("No Response");
        sheet.getRange(i + 2, 7).setValue(today);
        logSheet.appendRow([today, companyName, email, "Marked No Response", "Outreach terminated after 3 unanswered follow-ups"]);
      }
    }
  }
}`,
      codeBreakdown: [
        { line: 'diffTime / (1000 * 60 * 60 * 24)', explanation: 'Converts millisecond differences into standard calendar days so our script can calculate if 7 days have ticked by.' },
        { line: 'thread.reply(followUpBody)', explanation: 'Instead of starting a new email with a different subject, this appends our polite reminder directly inside the existing thread, keeping it clean!' },
        { line: 'followUpCount < 3', explanation: 'A critical safety bracket. We stop automated outreach after 3 reminder attempts to remain respectful and avoid email blacklists.' }
      ],
      clicksAndMenus: [
        'Paste the follow-up loop into your script file.',
        'Test the date calculation by manually typing an older date (e.g., 10 days ago) into Column G of your sheet and running the script.',
        'Verify that a reply is appended to your active Gmail thread and your spreadsheet counters increment!'
      ]
    },
    {
      id: 11,
      title: 'AI Draft Responses',
      badge: 'Module 11',
      icon: <BookOpen className="w-5 h-5" />,
      objective: 'Discover how to draft custom responses to HR replies using Gemini. Create professional email drafts directly inside Gmail for your review before sending.',
      concept: `When an HR contact replies showing interest, our system shouldn't just send a generic answer. We can instruct Gemini to analyze their reply and write a bespoke, highly personalized response. However, we should never send AI-generated text blindly. Instead, our script will generate the response and create a "Draft" in Gmail. This allows the TPO officer to open their Gmail, review/tweak the draft, and hit "Send" manually with complete confidence!`,
      appsScriptCode: `function generateAIDrafts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Companies");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  var range = sheet.getRange(2, 1, lastRow - 1, 14);
  var values = range.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var companyName = row[0];
    var status = row[4];
    var threadId = row[10];
    var aiClassification = row[11];
    
    // Check if they replied and we haven't drafted a response yet
    if (status === "Replied" && threadId && aiClassification === "Interested") {
      try {
        var thread = GmailApp.getThreadById(threadId);
        var messages = thread.getMessages();
        var hrMessageText = messages[messages.length - 1].getPlainBody();
        
        // 1. Ask Gemini to write a perfect reply
        var aiDraftText = callGeminiDraftingService(companyName, hrMessageText);
        
        if (aiDraftText) {
          // 2. Create a standard pending draft directly inside the Gmail thread!
          thread.createDraftReply(aiDraftText);
          
          // 3. Update spreadsheet status so we don't duplicate drafts
          sheet.getRange(i + 2, 5).setValue("Draft Created");
          
          Logger.log("Draft successfully created for: " + companyName);
        }
      } catch (err) {
        Logger.log("Draft generation error for " + companyName + ": " + err.toString());
      }
    }
  }
}`,
      codeBreakdown: [
        { line: 'thread.createDraftReply(aiDraftText)', explanation: 'Creates a pending email inside your real Gmail drafts folder, perfectly attached to the ongoing placement conversation.' },
        { line: 'setValue("Draft Created")', explanation: 'Changes their status so our loop skips them next time, waiting for you to review and approve the draft in Gmail.' }
      ],
      clicksAndMenus: [
        'Paste the drafting script into Apps Script.',
        'Run the script and open your real Gmail Drafts folder (gmail.com -> Drafts).',
        'You will see an incredibly polished, custom campus scheduling response draft sitting in the thread, ready for review!'
      ]
    },
    {
      id: 12,
      title: 'Dashboard Calculations',
      badge: 'Module 12',
      icon: <Layers className="w-5 h-5" />,
      objective: 'Learn how to utilize standard spreadsheet formulas or automatic Apps Script computations to maintain a beautiful TPO Cell Dashboard.',
      concept: `The final piece is reporting. The Training and Placement Cell needs a visual dashboard to report success to the Principal. We can use standard Google Sheets formulas inside our "Dashboard" tab to calculate live counts, and draw beautiful visual charts that refresh in real-time as companies are emailed or replies are captured!`,
      appsScriptCode: `// Standard Google Sheet Formulas to type in your Dashboard sheet:

// Total Companies Registered:
// =COUNTA(Companies!A2:A100)

// Total Outreach Invitations Sent:
// =COUNTIF(Companies!E2:E100, "Invited") + COUNTIF(Companies!E2:E100, "Replied") + COUNTIF(Companies!E2:E100, "Draft Created")

// Total Replies Captured:
// =COUNTIF(Companies!I2:I100, "Yes")

// Total Interested Recruiters:
// =COUNTIF(Companies!L2:L100, "Interested")

// Active Campus Drives Scheduled:
// =COUNTIF(Companies!E2:E100, "Drive Scheduled")`,
      clicksAndMenus: [
        'Go to your "Dashboard" sheet tab.',
        'Type "Total Companies" in Cell A1, and paste "=COUNTA(Companies!A2:A100)" in Cell B1.',
        'Type "Invitations Sent" in Cell A2, and paste the COUNTIF formulas in Cell B2.',
        'Select cells A1:B5, click "Insert" in the top menu, and select "Chart".',
        'Choose "Pie Chart" or "Column Chart" to visualize your active placement outreach pipeline instantly!'
      ]
    }
  ];

  const currentModule = modules.find(m => m.id === activeModuleId) || modules[0];

  return (
    <div id="classroom_container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar - Modules List */}
      <div id="classroom_sidebar" className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs overflow-y-auto max-h-[80vh]">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 id="classroom_title" className="text-lg font-bold text-slate-900 tracking-tight font-sans">Apps Script Classroom</h2>
        </div>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Welcome, TPO partner! Learn Google Workspace automation step-by-step. Select a module below to start your professional engineering mentorship.
        </p>

        <div className="space-y-2">
          {modules.map((m) => {
            const isActive = m.id === activeModuleId;
            return (
              <button
                key={m.id}
                id={`module_btn_${m.id}`}
                onClick={() => setActiveModuleId(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 border ${
                  isActive
                    ? 'bg-blue-50/50 border-blue-200 text-blue-600 font-semibold'
                    : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className={`p-1.5 rounded ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block">{m.badge}</span>
                  <span className="text-xs block truncate font-sans">{m.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Pane */}
      <div id="classroom_content" className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-8 shadow-xs overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-sans">
              {currentModule.badge}
            </span>
            <h1 id="classroom_module_title" className="text-xl font-bold text-slate-900 mt-2 font-sans">{currentModule.title}</h1>
          </div>
        </div>

        {/* Section: Objective */}
        <div id="module_objective_box" className="bg-blue-50/40 rounded-xl p-5 border border-blue-100/60 mb-6">
          <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 font-sans">Learning Objective</h3>
          <p className="text-xs text-slate-700 leading-relaxed font-sans">{currentModule.objective}</p>
        </div>

        {/* Section: Concept */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 font-sans">Core Concept Explained Simply</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">{currentModule.concept}</p>
        </div>

        {/* Section-specific detailed lists */}
        {currentModule.whyColumnsExist && (
          <div className="mb-6 bg-slate-50 rounded-xl p-6 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-4 font-sans">Sheet Column Dictionary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentModule.whyColumnsExist.map((col, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="font-mono text-xs font-bold text-blue-600 block mb-1">{col.col}</span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block">{col.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Steps */}
        {currentModule.clicksAndMenus && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 font-sans">How-To: Exactly What to Click</h3>
            <div className="space-y-2.5">
              {currentModule.clicksAndMenus.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-blue-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5 font-sans">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Apps Script Code */}
        {currentModule.appsScriptCode && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 font-sans">Complete Apps Script Code</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentModule.appsScriptCode || '');
                  alert('Apps Script code copied to your clipboard!');
                }}
                className="text-xs text-blue-600 hover:underline font-semibold font-sans flex items-center gap-1"
              >
                Copy Code
              </button>
            </div>
            <pre className="bg-[#1e1e1e] text-green-400 font-mono text-xs p-5 rounded-lg overflow-x-auto shadow-inner leading-relaxed border border-slate-800 max-h-[300px]">
              <code>{currentModule.appsScriptCode}</code>
            </pre>
          </div>
        )}

        {/* Section: Code Breakdown */}
        {currentModule.codeBreakdown && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 font-sans">Code Breakdown: Line-By-Line</h3>
            <div className="space-y-3">
              {currentModule.codeBreakdown.map((line, idx) => (
                <div key={idx} className="border-l-2 border-slate-200 pl-4 py-1">
                  <code className="text-xs font-mono font-semibold text-pink-600 block mb-1">{line.line}</code>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">{line.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Testing Call to Action */}
        <div className="mt-8 pt-6 border-t border-slate-150 flex items-center justify-between bg-slate-50 -mx-8 -mb-8 p-8 rounded-b-xl">
          <div className="flex items-center gap-3">
            <Play className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-700 block font-sans">Ready to try?</span>
              <span className="text-xs text-slate-500 block font-sans">We built a live simulator for you under the other application tabs!</span>
            </div>
          </div>
          <button
            onClick={() => {
              alert('Simply use the navigation bar tabs above (Placement CRM, Campaign, Dashboard) to see these Google integrations run live with your connected sheet!');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors font-sans"
          >
            Launch Interactive CRM
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
