import { db, questionsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";

const questions = [
  // Phishing
  {
    mode: "phishing",
    scenario: `FROM: support@paypa1.com\nSUBJECT: Urgent: Your account has been suspended!\n\nDear valued customer,\n\nYour PayPal account has been limited due to suspicious activity. Click here immediately to restore access:\nhttp://paypa1-secure.net/restore?token=abc123\n\nFailure to verify within 24 hours will result in permanent account closure.\n\n- PayPal Security Team`,
    options: ["Legitimate PayPal email — click the link to restore access", "Phishing attempt — suspicious sender domain and urgency tactics", "Spam email — safe to ignore", "Security alert — follow the instructions carefully"],
    correctAnswer: 1,
    explanation: "This is a phishing email. Notice 'paypa1.com' (with a '1' instead of 'l'), the suspicious URL 'paypa1-secure.net', and the urgency tactics creating fear. Legitimate companies never ask you to click unverified links.",
    difficulty: "easy",
  },
  {
    mode: "phishing",
    scenario: `FROM: hr@yourcompany.com\nSUBJECT: Important: Salary Review Document\n\nHi,\n\nPlease review the attached salary review document before our meeting tomorrow.\n\n[Salary_Review_2024.exe]\n\nBest regards,\nHR Department`,
    options: ["Open the attachment — it's from HR", "Reply asking for confirmation first", "Suspicious — executable attachment from HR is a red flag", "Forward to colleagues for their review"],
    correctAnswer: 2,
    explanation: "HR departments never send .exe files. Executable attachments are a classic malware delivery method. Always verify unexpected attachments directly with the sender through a separate communication channel.",
    difficulty: "medium",
  },
  {
    mode: "phishing",
    scenario: `TEXT MESSAGE: Your bank has detected unauthorized access. Verify your identity now: +1-555-BANK-NOW or visit bank-secure-verify.com. Don't delay or account will be frozen.`,
    options: ["Call the number immediately — it's urgent", "Visit the website to verify", "Smishing attack — call your bank's official number instead", "Reply STOP to unsubscribe"],
    correctAnswer: 2,
    explanation: "This is smishing (SMS phishing). Real banks never contact you via unofficial numbers or non-bank domains. Always call the number on the back of your card or official bank website.",
    difficulty: "easy",
  },
  // Defense
  {
    mode: "defense",
    scenario: "Your company's web server is receiving 50,000 HTTP requests per second from thousands of different IP addresses. The server is becoming unresponsive. What type of attack is this and what's your first defense action?",
    options: ["SQL Injection — sanitize input fields", "DDoS attack — activate rate limiting and contact your CDN/ISP for traffic scrubbing", "Brute force — block the attacking IP", "Man-in-the-middle — enable HTTPS"],
    correctAnswer: 1,
    explanation: "This is a Distributed Denial of Service (DDoS) attack. With traffic from thousands of IPs, blocking a single IP won't help. Rate limiting and CDN-based traffic scrubbing are the appropriate defenses.",
    difficulty: "medium",
  },
  {
    mode: "defense",
    scenario: "You detect unusual database queries like: ' OR '1'='1 — being sent to your login form. Thousands of these requests are being made. What is happening and what should you do?",
    options: ["DDoS attack — block all traffic", "SQL Injection attempt — implement parameterized queries and Web Application Firewall", "XSS attack — sanitize HTML output", "Session hijacking — regenerate session tokens"],
    correctAnswer: 1,
    explanation: "This is a SQL injection attack. The payload ' OR '1'='1 attempts to bypass authentication. Fix: use parameterized queries/prepared statements, implement a WAF, and never concatenate user input into SQL strings.",
    difficulty: "medium",
  },
  {
    mode: "defense",
    scenario: "An employee reports their computer is running slowly and making unusual network connections to an unknown IP address at 3 AM. Your monitoring shows encrypted traffic. What is the likely threat and response?",
    options: ["Hardware failure — replace the computer", "Malware/C2 infection — isolate the machine, run forensics, block the IP", "VPN issue — reconfigure network settings", "Windows update — let it complete"],
    correctAnswer: 1,
    explanation: "This pattern — slow performance, unusual connections to unknown IPs at odd hours — indicates malware with a Command & Control (C2) server. Immediately isolate the machine to prevent spread, preserve forensic evidence, and investigate.",
    difficulty: "hard",
  },
  // Builder
  {
    mode: "builder",
    scenario: "You're designing the authentication system for a banking app. Which combination of security measures provides the strongest protection against unauthorized access?",
    options: ["Username + password only", "Password + security question", "Password + SMS OTP + biometric verification", "Complex password + email confirmation"],
    correctAnswer: 2,
    explanation: "Multi-factor authentication combining something you know (password), something you have (SMS OTP), and something you are (biometric) provides the strongest protection. Each factor compensates for the others' weaknesses.",
    difficulty: "medium",
  },
  {
    mode: "builder",
    scenario: "Your team is storing user passwords in the database. A security audit reveals they are stored as MD5 hashes. What is the critical security issue and how do you fix it?",
    options: ["MD5 is too slow — switch to SHA-1 for speed", "MD5 is cryptographically broken — migrate to bcrypt or Argon2 with salting", "The hashes should be encrypted, not hashed", "Add a SECRET prefix to each password before hashing"],
    correctAnswer: 1,
    explanation: "MD5 is cryptographically broken and rainbow table attacks can reverse it instantly. Modern password storage requires adaptive hashing algorithms like bcrypt or Argon2 that include built-in salting and are intentionally slow to resist brute force.",
    difficulty: "hard",
  },
  // Escape Room
  {
    mode: "escape",
    scenario: "You're locked in the server room. The door code is hidden in the system logs. Log entry: 'AUTH_FAILED user=admin ip=192.168.1.1 attempts=3 | next=base64:NDI=' — decode the clue to escape.",
    options: ["The code is 192", "The code is 42", "The code is admin", "The code is 168"],
    correctAnswer: 1,
    explanation: "base64:NDI= decodes to '42'. Base64 encoding is used to encode binary data as ASCII text. You can decode it with: atob('NDI=') = '42'. The admin's failed login attempts were a red herring!",
    difficulty: "medium",
  },
  {
    mode: "escape",
    scenario: "The firewall logs show traffic blocked from internal network 10.0.0.0/8. An insider threat has hidden a secret message in the subnet mask. What does /8 mean in CIDR notation and what's the hint?",
    options: ["8 ports are open — the code is 8", "8 bits are masked — the first octet is fixed, code is the last number: 255", "8 hosts on the network — the code is 8", "The subnet has 8 routers — code is 8"],
    correctAnswer: 1,
    explanation: "/8 means the first 8 bits of the IP are the network portion, giving a subnet mask of 255.0.0.0. This means 255 is in the subnet mask — pointing to the code! Understanding CIDR notation is fundamental to network security.",
    difficulty: "hard",
  },
];

export async function seedQuestions() {
  const [{ total }] = await db.select({ total: count() }).from(questionsTable);
  if (Number(total) > 0) {
    logger.info("Questions already seeded, skipping.");
    return;
  }

  await db.insert(questionsTable).values(questions);
  logger.info({ count: questions.length }, "Seeded questions");
}
