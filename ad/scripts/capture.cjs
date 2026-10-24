// Captures each app page at 1920x1080 with demo data, for use in the ad.
const path = require("path");
const { chromium } = require(require("path").join(__dirname, "..", "..", "node_modules", "playwright", "index.js"));
const out = path.join(__dirname, "..", "public", "shots");
const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const now = new Date().toISOString();
const rows = [
  { id: "c1", type: "credential", title: "GitHub", username: "maya@studio.dev", password: "x", website: "github.com", notes: "", tags: ["dev"], favorite: true, createdAt: now, updatedAt: now },
  { id: "c2", type: "credential", title: "Vercel Deployment Team", username: "deploy@studio.dev", password: "x", website: "vercel.com", notes: "", tags: ["ops"], favorite: false, createdAt: now, updatedAt: now },
  { id: "c3", type: "credential", title: "Gmail", username: "maya@studio.dev", password: "x", website: "gmail.com", notes: "", tags: [], favorite: false, createdAt: now, updatedAt: now },
  { id: "c4", type: "credential", title: "Figma", username: "maya", password: "x", website: "figma.com", notes: "", tags: ["design"], favorite: false, createdAt: now, updatedAt: now },
  { id: "n1", type: "note", title: "Launch checklist", body: "# Launch checklist\n\n- [x] Ship the vault\n- [ ] Write the onboarding copy\n- [ ] Tag the release\n\n> Keep it local. Keep it simple.", labels: ["ops"], favorite: true, createdAt: now, updatedAt: now },
  { id: "n2", type: "note", title: "Meeting notes", body: "Short summary of the weekly sync.", labels: [], favorite: false, createdAt: now, updatedAt: now },
  { id: "t1", type: "task", title: "Design the onboarding flow", description: "Three steps, no account", dueDate: d(-1), priority: "High", status: "To Do", tags: [], createdAt: now, updatedAt: now },
  { id: "t2", type: "task", title: "Review the pricing page", description: "", dueDate: d(3), priority: "Medium", status: "In Progress", tags: [], createdAt: now, updatedAt: now },
  { id: "t3", type: "task", title: "Publish the release notes", description: "", dueDate: d(6), priority: "Low", status: "Completed", tags: [], createdAt: now, updatedAt: now },
  { id: "t4", type: "task", title: "Book the user interviews", description: "", dueDate: d(2), priority: "High", status: "To Do", tags: [], createdAt: now, updatedAt: now },
  { id: "i1", type: "income", source: "Client: Northwind", amountMinor: 18500000, currency: "PHP", date: d(0), category: "Freelance", notes: "", createdAt: now, updatedAt: now },
  { id: "i2", type: "income", source: "Client: Acme Labs", amountMinor: 9200000, currency: "PHP", date: d(-9), category: "Freelance", notes: "", createdAt: now, updatedAt: now },
  { id: "i3", type: "income", source: "Workshop fee", amountMinor: 4500000, currency: "PHP", date: d(-20), category: "Teaching", notes: "", createdAt: now, updatedAt: now },
  { id: "s1", type: "subscription", name: "Netflix", provider: "Netflix", website: "netflix.com", amountMinor: 64900, currency: "PHP", billingCycle: "Monthly", nextPaymentDate: d(2), category: "Streaming", paymentMethod: "", notes: "", active: true, createdAt: now, updatedAt: now },
  { id: "s2", type: "subscription", name: "Claude", provider: "Anthropic", website: "claude.ai", amountMinor: 700000, currency: "PHP", billingCycle: "Monthly", nextPaymentDate: d(10), category: "AI", paymentMethod: "", notes: "", active: true, createdAt: now, updatedAt: now },
  { id: "s3", type: "subscription", name: "Domain renewal", provider: "Namecheap", website: "namecheap.com", amountMinor: 120000, currency: "PHP", billingCycle: "Yearly", nextPaymentDate: d(18), category: "Domains", paymentMethod: "", notes: "", active: true, createdAt: now, updatedAt: now },
  { id: "a1", type: "activity", action: "Vault unlocked", detail: "Master password verified.", createdAt: now, updatedAt: now },
];
for (let i = 0; i < 6; i++) rows.push({ id: "e" + i, type: "task", title: "Team sync " + i, description: "", dueDate: d(i % 3 === 0 ? 12 : 4), priority: "Medium", status: "To Do", tags: [], createdAt: now, updatedAt: now });
const store = { exists: true, locked: false, displayName: "Maya", masterPassword: "", recoveryCode: "", settings: { theme: "dark", accent: "blue", fontSize: "compact", websiteIcons: false, autoLockMinutes: 5, clipboardSeconds: 30 }, rows };
const pages = [["Dashboard", "dashboard"], ["Vault", "vault"], ["Notes", "notes"], ["Tasks", "tasks"], ["Calendar", "calendar"], ["Income", "income"], ["Subscriptions", "subscriptions"], ["Generate password", "generator"], ["Settings", "settings"]];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://127.0.0.1:5173/");
  await page.evaluate((s) => localStorage.setItem("deskkeep-preview-v2", JSON.stringify(s)), store);
  for (const [label, file] of pages) {
    await page.reload(); await page.waitForTimeout(400);
    await page.locator(".nav-row", { hasText: label }).first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, file + ".png") });
    console.log("captured", file);
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
