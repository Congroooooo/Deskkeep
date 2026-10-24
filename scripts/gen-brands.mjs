// Generates src/brandCatalog.json from the Simple Icons package (run: node scripts/gen-brands.mjs).
import { writeFileSync } from 'node:fs';
import * as icons from 'simple-icons';

const wanted = [
  'Netflix','Spotify','YouTube','Disney+','Amazon','Amazon Web Services','Apple','Apple Music','Apple TV','iCloud',
  'Google','Google Drive','Google Cloud','Gmail','Google Calendar','Google Maps','Microsoft','Microsoft Azure','Microsoft 365','Outlook','OneDrive','Xbox','Steam','PlayStation','Twitch','Discord','Slack','Zoom','Teams','Skype','WhatsApp','Telegram','Messenger','Instagram','Facebook','X','TikTok','Snapchat','Reddit','LinkedIn','Pinterest','Threads',
  'GitHub','GitLab','Bitbucket','Docker','Kubernetes','Vercel','Netlify','Cloudflare','DigitalOcean','Heroku','Linode','Render','Railway','Supabase','Firebase','MongoDB','PostgreSQL','MySQL','Redis','Figma','Notion','Trello','Asana','Jira','Confluence','Linear','Miro','Canva','Adobe','Dropbox','Box','Evernote','Obsidian','1Password','Bitwarden','LastPass','Dashlane','Keeper','NordVPN','ExpressVPN','Proton','ProtonMail','Tutanota',
  'OpenAI','Anthropic','Claude','ChatGPT','Perplexity','Midjourney','Hugging Face','Mistral AI','Gemini','Copilot','Replicate','Ollama',
  'Stripe','PayPal','Wise','Payoneer','Revolut','Monzo','Wix','Shopify','WordPress','Squarespace','Webflow','Mailchimp','SendGrid','Twilio','Postman','Insomnia','Sentry','Datadog','New Relic','Grafana','Auth0','Okta','Namecheap','GoDaddy','Hostinger','Bluehost','Cpanel','Plesk','Let\'s Encrypt',
  'Duolingo','Coursera','Udemy','Skillshare','Medium','Substack','Patreon','Ko-fi','Crunchyroll','Hulu','HBO Max','Max','Prime Video','Apple TV+','Paramount+','Peacock','Crunchyroll','Deezer','SoundCloud','Tidal','Audible','Kindle','Goodreads','IMDb','Letterboxd','Last.fm',
  'Uber','Lyft','Grab','Airbnb','Booking.com','Expedia','Agoda','Klook','Trivago','Foodpanda','DoorDash','Deliveroo','Uber Eats','Shopee','Lazada','Etsy','eBay','AliExpress','Temu',
  'Smart','Globe','PLDT','Converge','Meralco','Maxis','T-Mobile','Verizon','AT&T','Comcast','Xfinity','Spectrum','Starlink','Canva Pro','Setapp','JetBrains','Visual Studio Code','Sublime Text','Notepad++','Atlassian','Tailwind CSS','Next.js','React','Angular','Node.js','npm','Python','Rust','Go','Java','Kotlin','Swift','Unity','Unreal Engine','Blender','Autodesk','Affinity','Procreate','Sketch','InVision','Zapier','Make','IFTTT','Airtable','Calendly','Typeform','Hotjar','Intercom','Zendesk','HubSpot','Salesforce','Pipedrive','QuickBooks','Xero','Wave','FreshBooks','Gusto','Dropbox Sign','DocuSign','Lastpass'
];
const byTitle = new Map(Object.values(icons).filter(v => v && typeof v === 'object' && v.title && v.path).map(v => [v.title.toLowerCase(), v]));
const out = {};
const missing = [];
for (const name of [...new Set(wanted)]) {
  const icon = byTitle.get(name.toLowerCase());
  if (icon) out[icon.title] = { title: icon.title, hex: icon.hex, path: icon.path };
  else missing.push(name);
}
writeFileSync('src/brandCatalog.json', JSON.stringify(Object.values(out)));
console.log(`catalog: ${Object.keys(out).length} brands; not in Simple Icons: ${missing.join(', ')}`);
