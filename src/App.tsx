/*
THESIS: A compact desktop utility follows KeepR's proven information density instead of the earlier paper-ledger metaphor.
OWN-WORLD: Monospace type, grayscale surfaces, hairline dividers, muted blue actions, small radii, and equal-quality light and dark palettes.
STORY: Unlock one private workspace, scan its state immediately, and move among passwords, notes, plans, and income without visual ceremony.
FIRST VIEWPORT: A slim module rail anchors the left; the dashboard fills the remaining canvas with a dense overview and narrow status column.
FORM: Reference-faithful productivity shell, preserving Deskkeep identity while adopting KeepR's compact desktop grammar.
*/
import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCopy,
  Eye,
  EyeOff,
  FileText,
  Folder,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Lock,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
  Moon,
  Sun,
  Clock,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  LayoutGrid,
  List,
  Pause,
  Play,
  BookOpen,
  Tv,
  Download,
} from "lucide-react";
import { brandForRecord } from "./brands";
import { Markdown, markdownSnippet } from "./Markdown";
import PdfReader from "./PdfReader";
import type {
  Activity,
  Book,
  CalendarFeed,
  CalendarSyncResult,
  FeedEvent,
  Series,
  Credential,
  Entity,
  EntityType,
  Folder as FolderType,
  Income,
  Note,
  DeskkeepSettings,
  Subscription,
  Task,
  VaultState,
} from "./types";

type Page =
  | "dashboard"
  | "credential"
  | "note"
  | "task"
  | "calendar"
  | "income"
  | "subscriptions"
  | "books"
  | "series"
  | "folder"
  | "favorites"
  | "generator"
  | "activity"
  | "settings";
const today = () => new Date().toISOString().slice(0, 10);
const money = (minor = 0, currency = "PHP") =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(
    minor / 100,
  );
const blankCredential = {
  title: "",
  username: "",
  password: "",
  website: "",
  notes: "",
  tags: [] as string[],
  favorite: false,
};
const blankNote = {
  title: "",
  body: "",
  labels: [] as string[],
  favorite: false,
};
const blankTask = {
  title: "",
  description: "",
  dueDate: today(),
  priority: "Medium",
  status: "To Do",
  tags: [] as string[],
};
const blankIncome = {
  source: "",
  amountMinor: 0,
  currency: "PHP",
  date: today(),
  category: "Freelance",
  notes: "",
};

const blankSubscription = {
  name: "",
  provider: "",
  website: "",
  amountMinor: 0,
  currency: "PHP",
  billingCycle: "Monthly",
  nextPaymentDate: today(),
  category: "Software",
  paymentMethod: "",
  notes: "",
  active: true,
};
const blankBook = {
  title: "",
  authors: [] as string[],
  isbn: "",
  publisher: "",
  publishedYear: "",
  language: "",
  series: "",
  seriesIndex: "",
  tags: [] as string[],
  category: "",
  status: "To Read",
  pageCount: 0,
  currentPage: 0,
  startedDate: "",
  finishedDate: "",
  rating: 0,
  review: "",
  notes: "",
  source: "",
  favorite: false,
};
const blankSeries = {
  title: "",
  kind: "Series",
  year: "",
  platform: "Netflix",
  url: "",
  status: "Watching",
  totalSeasons: 0,
  currentSeason: 1,
  currentEpisode: 1,
  lastWatched: today(),
  rating: 0,
  tags: [] as string[],
  review: "",
  notes: "",
  favorite: false,
};
const cycleFactor: Record<Subscription["billingCycle"], number> = {
  Weekly: 52 / 12,
  Monthly: 1,
  Quarterly: 1 / 3,
  Yearly: 1 / 12,
};
const cycleMonths: Record<Exclude<Subscription["billingCycle"], "Weekly">, number> = {
  Monthly: 1,
  Quarterly: 3,
  Yearly: 12,
};
const cycleSuffix: Record<Subscription["billingCycle"], string> = {
  Weekly: "per week",
  Monthly: "per month",
  Quarterly: "per quarter",
  Yearly: "per year",
};
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysFromToday = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 864e5);
};
const stepCycle = (key: string, cycle: Subscription["billingCycle"]) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (cycle === "Weekly") date.setDate(date.getDate() + 7);
  else date.setMonth(date.getMonth() + cycleMonths[cycle]);
  return dayKey(date);
};
// Next payment date strictly after today, counted from the paid due date.
const nextAfterPayment = (key: string, cycle: Subscription["billingCycle"]) => {
  let next = key;
  for (let guard = 0; guard < 500 && daysFromToday(next) <= 0; guard++)
    next = stepCycle(next, cycle);
  return next === key ? stepCycle(key, cycle) : next;
};

// Per-viewer conveniences only (view mode, world clocks). Never used for vault data.
const readPref = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};
const writePref = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep the in-memory value only */
  }
};
const clockZones = [
  { label: "Manila", zone: "Asia/Manila" },
  { label: "Sydney", zone: "Australia/Sydney" },
  { label: "Los Angeles", zone: "America/Los_Angeles" },
  { label: "London", zone: "Europe/London" },
  { label: "Tokyo", zone: "Asia/Tokyo" },
  { label: "Dubai", zone: "Asia/Dubai" },
  { label: "New York", zone: "America/New_York" },
  { label: "Singapore", zone: "Asia/Singapore" },
];

export default function App() {
  const [vault, setVault] = useState<VaultState>({
    exists: false,
    locked: true,
  });
  const [page, setPage] = useState<Page>("dashboard");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{
    type: EntityType;
    value: Record<string, unknown>;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [reader, setReader] = useState<Book | null>(null);
  const [calFeeds, setCalFeeds] = useState<CalendarFeed[]>([]);
  const [calEvents, setCalEvents] = useState<FeedEvent[]>([]);
  const [calSynced, setCalSynced] = useState<string | null>(null);
  const [calErrors, setCalErrors] = useState<CalendarSyncResult["errors"]>([]);
  const [calSyncing, setCalSyncing] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<DeskkeepSettings>({
    theme: "light",
    accent: "blue",
    fontSize: "compact",
    websiteIcons: true,
    autoLockMinutes: 5,
    clipboardSeconds: 30,
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("deskkeep-theme");
    return saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    const first = !root.dataset.theme;
    root.classList.toggle("theme-switching", !first);
    root.dataset.theme = theme;
    localStorage.setItem("deskkeep-theme", theme);
    const done = window.setTimeout(
      () => root.classList.remove("theme-switching"),
      380,
    );
    return () => window.clearTimeout(done);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.accent = settings.accent;
    document.documentElement.dataset.fontSize = settings.fontSize;
  }, [settings.accent, settings.fontSize]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Calendar links and the last synced events (decrypted locally by the main process).
  const loadCalendar = async () => {
    const [feeds, cache] = await Promise.all([
      window.deskkeep.calendarFeeds(),
      window.deskkeep.calendarEvents(),
    ]);
    setCalFeeds(feeds);
    setCalEvents(cache.events);
    setCalSynced(cache.syncedAt);
  };
  // Fetches every connected calendar. A failing calendar keeps its last good events.
  const syncCalendar = async () => {
    setCalSyncing(true);
    try {
      const result = await window.deskkeep.syncCalendars();
      setCalErrors(result.errors);
      await loadCalendar();
    } catch (e) {
      setCalErrors([{ feedId: "", label: "Calendar", message: String((e as Error).message) }]);
    } finally {
      setCalSyncing(false);
    }
  };
  const refresh = async () => {
    const state = await window.deskkeep.state();
    setVault(state);
    if (!state.locked) {
      setEntities(await window.deskkeep.list());
      const next = await window.deskkeep.getSettings();
      setSettings(next);
      setTheme(next.theme);
      await loadCalendar();
    }
  };
  const changeSettings = async (next: Partial<DeskkeepSettings>) => {
    const value = await window.deskkeep.updateSettings(next);
    setSettings(value);
    setTheme(value.theme);
    setNotice("Settings updated.");
  };
  useEffect(() => {
    refresh();
    return window.deskkeep.onLocked(() => {
      setVault((v) => ({ ...v, locked: true }));
      setEntities([]);
    });
  }, []);
  // Sync when the vault unlocks, then every 15 minutes while it stays open.
  useEffect(() => {
    if (!vault.exists || vault.locked) return;
    syncCalendar();
    const id = window.setInterval(syncCalendar, 15 * 60 * 1000);
    return () => window.clearInterval(id);
    // syncCalendar only uses state setters, so it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.exists, vault.locked]);
  const save = async (type: EntityType, value: Record<string, unknown>) => {
    try {
      await window.deskkeep.save(type, value);
      setEditor(null);
      setNotice("Saved locally and encrypted.");
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  const importMarkdownNote = async () => {
    try {
      const file = await window.deskkeep.importMarkdown();
      if (file.canceled || !file.title || file.body === undefined) return;
      await window.deskkeep.save("note", {
        ...blankNote,
        title: file.title,
        body: file.body,
      });
      setNotice(`Imported “${file.title}” as an encrypted note.`);
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  const remove = async (type: EntityType, id: string) => {
    if (!confirm("Delete this item permanently from the local vault?")) return;
    await window.deskkeep.remove(type, id);
    await refresh();
  };

  if (!vault.exists) return <Setup onDone={async()=>{setPage("dashboard");await refresh();}} />;
  if (vault.locked) return <Unlock onDone={async()=>{setPage("dashboard");await refresh();}} />;

  const credentials = entities.filter(
    (e): e is Credential => e.type === "credential",
  );
  const notes = entities.filter((e): e is Note => e.type === "note");
  const tasks = entities.filter((e): e is Task => e.type === "task");
  const incomes = entities.filter((e): e is Income => e.type === "income");
  const subscriptions = entities.filter(
    (e): e is Subscription => e.type === "subscription",
  );
  const books = entities.filter((e): e is Book => e.type === "book");
  const series = entities.filter((e): e is Series => e.type === "series");
  const folders = entities.filter((e): e is FolderType => e.type === "folder");
  const activities = entities.filter(
    (e): e is Activity => e.type === "activity",
  );
  const removeFolder = async (folder: FolderType) => {
    const affected = (
      folder.kind === "credential" ? credentials : notes
    ).filter((item) => item.folderId === folder.id);
    if (affected.length) {
      const alternatives = folders.filter(
        (f) => f.kind === folder.kind && f.id !== folder.id,
      );
      const answer = prompt(
        `${folder.name} contains ${affected.length} item(s). Enter another ${folder.kind} folder name to move them, or leave blank to remove the folder assignment. Available: ${alternatives.map((f) => f.name).join(", ") || "none"}. Cancel keeps everything.`,
      );
      if (answer === null) return;
      const target = answer.trim()
        ? alternatives.find(
            (f) => f.name.toLowerCase() === answer.trim().toLowerCase(),
          )
        : undefined;
      if (answer.trim() && !target) {
        alert("That destination folder was not found.");
        return;
      }
      for (const item of affected)
        await window.deskkeep.save(item.type, { ...item, folderId: target?.id });
    }
    if (
      !confirm(
        `Delete the folder “${folder.name}”? Its items will remain in the vault.`,
      )
    )
      return;
    await window.deskkeep.remove("folder", folder.id);
    await refresh();
  };
  const filtered = <T extends Entity>(items: T[]) =>
    items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
    );
  const openNew = (type: EntityType) =>
    setEditor({
      type,
      value:
        type === "credential"
          ? blankCredential
          : type === "note"
            ? blankNote
            : type === "task"
              ? blankTask
              : type === "income"
                ? blankIncome
                : type === "subscription"
                  ? blankSubscription
                  : type === "book"
                    ? blankBook
                    : type === "series"
                      ? blankSeries
                      : {
                        name: "",
                        color: "#6d8f84",
                        kind: "credential",
                        favorite: false,
                      },
    });
  const importBook = async () => {
    try {
      const result = await window.deskkeep.importBook();
      if (result.canceled || !result.book) return;
      setNotice(`Imported “${String(result.book.title)}” into the encrypted vault.`);
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  // Closing the reader saves the page you stopped on, and moves a new book to Reading.
  const closeReader = async (page: number) => {
    const book = reader;
    setReader(null);
    if (!book || page === book.currentPage) return;
    await save("book", {
      ...book,
      currentPage: page,
      status: book.status === "To Read" ? "Reading" : book.status,
      startedDate: book.startedDate || today(),
    });
  };
  const exportBook = async (id: string) => {
    try {
      const result = await window.deskkeep.exportBook(id);
      if (!result.canceled) setNotice("PDF exported. Note: the exported copy is not encrypted.");
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  const pageTitle: Record<Page, string> = {
    dashboard: "Today in your Deskkeep",
    credential: "Credential vault",
    note: "Notes",
    task: "Tasks",
    calendar: "Calendar",
    income: "Income",
    subscriptions: "Subscriptions & licenses",
    books: "Books",
    series: "Series",
    folder: "Folders",
    favorites: "Favorites",
    generator: "Password generator",
    activity: "Activity log",
    settings: "Settings",
  };
  const addable = [
    "credential",
    "note",
    "task",
    "income",
    "subscriptions",
    "books",
    "series",
    "folder",
  ].includes(page);
  const addTarget: Record<string, EntityType> = {
    subscriptions: "subscription",
    books: "book",
    series: "series",
  };
  const addLabel: Record<string, string> = {
    credential: "login",
    books: "book",
    series: "series",
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={(next) => {
          setPage(next);
          setQuery("");
        }}
        name={vault.displayName || "Local user"}
        avatar={settings.profileAvatar}
        theme={theme}
        onTheme={async () => {
          const next = theme === "light" ? "dark" : "light";
          setTheme(next);
          try {
            setSettings(await window.deskkeep.updateSettings({ theme: next }));
          } catch {
            /* the vault is still open; keep the on-screen choice */
          }
        }}
        onLock={async () => {
          await window.deskkeep.lock();
          await refresh();
        }}
      />
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="section-label">
              DESKKEEP / {page.toUpperCase()}
            </span>
            <h1>{pageTitle[page]}</h1>
          </div>
          <div className="top-actions">
            <button
              className="palette-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open global search"
            >
              <Search size={15} />
              <span>Search everything</span>
              <kbd>Ctrl K</kbd>
            </button>
            {page !== "dashboard" && (
              <label className="search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${pageTitle[page].toLowerCase()}`}
                />
              </label>
            )}
            {addable && (
              <button
                className="primary"
                onClick={() =>
                  openNew(addTarget[page] ?? (page as EntityType))
                }
              >
                <Plus size={17} /> Add {addLabel[page] ?? page}
              </button>
            )}
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            <Check size={16} />
            {notice}
            <button onClick={() => setNotice("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="page-enter">
          {page === "dashboard" && (
            <Dashboard
              name={vault.displayName || ""}
              subscriptions={subscriptions}
              credentials={credentials}
              notes={notes}
              tasks={tasks}
              incomes={incomes}
              settings={settings}
              go={setPage}
            />
          )}
          {page === "credential" && (
            <Credentials
              items={filtered(credentials)}
              folders={folders.filter((f) => f.kind === "credential")}
              clipboardSeconds={settings.clipboardSeconds}
              websiteIcons={settings.websiteIcons}
              edit={async (v) =>
                setEditor({
                  type: "credential",
                  value: (await window.deskkeep.get(
                    "credential",
                    v.id,
                  )) as unknown as Record<string, unknown>,
                })
              }
              remove={remove}
            />
          )}
          {page === "note" && (
            <Notes
              items={filtered(notes)}
              folders={folders.filter((f) => f.kind === "note")}
              edit={(v) => setEditor({ type: "note", value: v })}
              importFile={importMarkdownNote}
              duplicate={(v) =>
                save("note", { ...v, id: undefined, title: `${v.title} copy` })
              }
              remove={remove}
            />
          )}
          {page === "task" && (
            <Tasks
              items={filtered(tasks)}
              edit={(v) => setEditor({ type: "task", value: v })}
              save={save}
              remove={remove}
            />
          )}
          {page === "calendar" && (
            <Calendar
              tasks={filtered(tasks)}
              incomes={filtered(incomes)}
              feeds={calFeeds}
              feedEvents={calEvents.filter((e) =>
                JSON.stringify(e).toLowerCase().includes(query.toLowerCase()),
              )}
              syncedAt={calSynced}
              syncing={calSyncing}
              syncErrors={calErrors}
              onSync={syncCalendar}
              edit={(type, value) => setEditor({ type, value })}
              remove={remove}
              addTask={(date) =>
                setEditor({
                  type: "task",
                  value: { ...blankTask, dueDate: date },
                })
              }
            />
          )}
          {page === "income" && (
            <IncomeList
              items={filtered(incomes)}
              edit={(v) => setEditor({ type: "income", value: v })}
              remove={remove}
            />
          )}
          {page === "folder" && (
            <Folders
              items={filtered(folders)}
              edit={(v) => setEditor({ type: "folder", value: v })}
              remove={removeFolder}
            />
          )}
          {page === "subscriptions" && (
            <Subscriptions
              websiteIcons={settings.websiteIcons}
              items={filtered(subscriptions)}
              edit={(v) => setEditor({ type: "subscription", value: v })}
              save={save}
              remove={remove}
            />
          )}
          {page === "books" && (
            <Books
              items={filtered(books)}
              importPdf={importBook}
              readPdf={(b) => setReader(b)}
              exportPdf={exportBook}
              edit={(v) => setEditor({ type: "book", value: v })}
              save={save}
              remove={remove}
            />
          )}
          {page === "series" && (
            <SeriesList
              items={filtered(series)}
              edit={(v) => setEditor({ type: "series", value: v })}
              save={save}
              remove={remove}
            />
          )}
          {page === "favorites" && (
            <Favorites
              credentials={credentials}
              notes={notes}
              folders={folders}
            />
          )}
          {page === "generator" && (
            <Generator
              clipboardSeconds={settings.clipboardSeconds}
              onUse={(password) => {
                setEditor({
                  type: "credential",
                  value: { ...blankCredential, password },
                });
              }}
            />
          )}
          {page === "activity" && (
            <ActivityLog
              items={activities}
              clear={async () => {
                if (
                  confirm(
                    "Clear the local activity log? A new entry will record that it was cleared.",
                  )
                ) {
                  await window.deskkeep.clearActivity();
                  await refresh();
                }
              }}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              settings={settings}
              update={changeSettings}
              onRefresh={refresh}
              onMessage={setNotice}
              calFeeds={calFeeds}
              calSynced={calSynced}
              calErrors={calErrors}
              calSyncing={calSyncing}
              onSync={syncCalendar}
            />
          )}
        </div>
      </main>
      {paletteOpen && (
        <CommandPalette
          pages={pageTitle}
          credentials={credentials}
          notes={notes}
          tasks={tasks}
          incomes={incomes}
          books={books}
          series={series}
          onClose={() => setPaletteOpen(false)}
          onPick={(target, term) => {
            setPaletteOpen(false);
            setPage(target);
            setQuery(term);
          }}
        />
      )}
      {reader && (
        <PdfReader
          bookId={reader.id}
          title={reader.title}
          startPage={Number(reader.currentPage) || 1}
          onClose={closeReader}
        />
      )}
      {editor && (
        <Editor
          type={editor.type}
          initial={editor.value}
          folders={folders}
          onClose={() => setEditor(null)}
          onSave={(value) => save(editor.type, value)}
        />
      )}
    </div>
  );
}

type PaletteItem = {
  key: string;
  label: string;
  sub: string;
  target: Page;
  term: string;
};

function CommandPalette({
  pages,
  credentials,
  notes,
  tasks,
  incomes,
  books,
  series,
  onClose,
  onPick,
}: {
  pages: Record<Page, string>;
  credentials: Credential[];
  notes: Note[];
  tasks: Task[];
  incomes: Income[];
  books: Book[];
  series: Series[];
  onClose: () => void;
  onPick: (target: Page, term: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const items = useMemo<PaletteItem[]>(
    () => [
      ...(Object.entries(pages) as [Page, string][]).map(([target, label]) => ({
        key: `page-${target}`,
        label,
        sub: "Go to page",
        target,
        term: "",
      })),
      ...credentials.map((c) => ({
        key: c.id,
        label: c.title,
        sub: `Login · ${c.username || c.website || "no username"}`,
        target: "credential" as Page,
        term: c.title,
      })),
      ...notes.map((n) => ({
        key: n.id,
        label: n.title,
        sub: "Note",
        target: "note" as Page,
        term: n.title,
      })),
      ...tasks.map((t) => ({
        key: t.id,
        label: t.title,
        sub: `Task · due ${t.dueDate}`,
        target: "task" as Page,
        term: t.title,
      })),
      ...incomes.map((i) => ({
        key: i.id,
        label: i.source,
        sub: `Income · ${i.date}`,
        target: "income" as Page,
        term: i.source,
      })),
      ...books.map((b) => ({
        key: b.id,
        label: b.title,
        sub: `Book · ${b.status}`,
        target: "books" as Page,
        term: b.title,
      })),
      ...series.map((s) => ({
        key: s.id,
        label: s.title,
        sub: `Series · ${s.platform || "No platform"}`,
        target: "series" as Page,
        term: s.title,
      })),
    ],
    [pages, credentials, notes, tasks, incomes, books, series],
  );
  const q = term.trim().toLowerCase();
  const shown = items
    .filter((item) =>
      q ? `${item.label} ${item.sub}`.toLowerCase().includes(q) : true,
    )
    .slice(0, 30);
  const choose = (item?: PaletteItem) => item && onPick(item.target, item.term);
  return (
    <div className="modal-backdrop palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search everything"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette-input">
          <Search size={16} />
          <input
            autoFocus
            placeholder="Search logins, notes, tasks, income, books, series, or pages"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, shown.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") choose(shown[active]);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={shown[active] ? `pal-${active}` : undefined}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-results" id="palette-results" role="listbox">
          {shown.map((item, i) => (
            <li
              key={item.key}
              id={`pal-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
            >
              <strong>{item.label}</strong>
              <span>{item.sub}</span>
            </li>
          ))}
          {!shown.length && <li className="palette-empty">No matches.</li>}
        </ul>
      </div>
    </div>
  );
}

function WorldClocks() {
  const [zones, setZones] = useState<{ label: string; zone: string }[]>(() =>
    readPref("deskkeep-world-clocks", clockZones.slice(0, 3)),
  );
  const [now, setNow] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const save = (next: { label: string; zone: string }[]) => {
    setZones(next);
    writePref("deskkeep-world-clocks", next);
  };
  const time = (zone: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
  const day = (zone: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now);
  const available = clockZones.filter(
    (c) => !zones.some((z) => z.zone === c.zone),
  );
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">
          <Clock size={15} /> World clocks
        </span>
        <span className="pill">Live</span>
      </div>
      <div className="clock-list">
        {zones.map((z) => (
          <div className="clock-row" key={z.zone}>
            <div>
              <strong>{z.label}</strong>
              <span>{day(z.zone)}</span>
            </div>
            <time>{time(z.zone)}</time>
            <button
              className="icon-button"
              aria-label={`Remove ${z.label} clock`}
              onClick={() => save(zones.filter((x) => x.zone !== z.zone))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {adding ? (
        <select
          autoFocus
          aria-label="Choose a city"
          defaultValue=""
          onBlur={() => setAdding(false)}
          onChange={(e) => {
            const picked = clockZones.find((c) => c.zone === e.target.value);
            if (picked) save([...zones, picked]);
            setAdding(false);
          }}
        >
          <option value="" disabled>
            Choose a city
          </option>
          {available.map((c) => (
            <option key={c.zone} value={c.zone}>
              {c.label}
            </option>
          ))}
        </select>
      ) : (
        available.length > 0 && (
          <button className="link-button" onClick={() => setAdding(true)}>
            + Add city
          </button>
        )
      )}
    </section>
  );
}

function Sidebar({
  page,
  setPage,
  name,
  avatar,
  theme,
  onTheme,
  onLock,
}: {
  page: Page;
  setPage: (p: Page) => void;
  name: string;
  avatar?: string;
  theme: "light" | "dark";
  onTheme: () => void;
  onLock: () => void;
}) {
  const primary: [Page, string, typeof Gauge][] = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["credential", "Vault", KeyRound],
    ["note", "Notes", NotebookPen],
    ["task", "Tasks", Check],
    ["calendar", "Calendar", CalendarDays],
    ["income", "Income", CircleDollarSign],
    ["books", "Books", BookOpen],
    ["series", "Series", Tv],
  ];
  const tools: [Page, string, typeof Gauge][] = [
    ["folder", "Folders", Folder],
    ["favorites", "Favorites", Star],
    ["subscriptions", "Subscriptions", CreditCard],
    ["generator", "Generate password", Sparkles],
  ];
  const Row = ({ item }: { item: [Page, string, typeof Gauge] }) => {
    const [id, label, Icon] = item;
    return (
      <button
        className={`nav-row ${page === id ? "active" : ""}`}
        onClick={() => setPage(id)}
      >
        <Icon size={17} />
        <span>{label}</span>
        {page === id && <ChevronRight size={14} />}
      </button>
    );
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img src="./deskkeep-icon.svg" alt="" />
        </div>
        <div>
          <strong>Deskkeep</strong>
          <span>Your private workspace, kept local.</span>
        </div>
      </div>
      <div className="profile">
        <div className="avatar">
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <strong>{name}</strong>
          <span>Local vault</span>
        </div>
        <button
          className="theme-button"
          onClick={onTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
      <nav>
        <p>Modules</p>
        {primary.map((x) => (
          <Row key={x[0]} item={x} />
        ))}
        <p>Tools</p>
        {tools.map((x) => (
          <Row key={x[0]} item={x} />
        ))}
      </nav>
      <div className="sidebar-foot">
        <Row item={["activity", "Activity log", ActivityIcon]} />
        <Row item={["settings", "Settings", Settings]} />
        <button className="nav-row" onClick={onLock}>
          <Lock size={17} />
          Lock Deskkeep
        </button>
      </div>
    </aside>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  if (code)
    return (
      <AuthFrame>
        <div className="auth-step">
          <div className="seal">
            <ShieldCheck />
          </div>
          <span className="section-label">RECOVERY / ONE-TIME VIEW</span>
          <h1>Keep this code somewhere safe.</h1>
          <p>
            It is the only way back in if you forget your master password. Nicko
            Deskkeep cannot recover it for you.
          </p>
          <code className="recovery-code">{code}</code>
          <button className="primary full" onClick={onDone}>
            I saved it — enter my Deskkeep
          </button>
        </div>
      </AuthFrame>
    );
  const submit = async () => {
    try {
      if (password !== confirmPassword)
        throw new Error("The passwords do not match.");
      const result = await window.deskkeep.setup({
        masterPassword: password,
        displayName: name,
      });
      setCode(result.recoveryCode);
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  return (
    <AuthFrame>
      <div className="auth-step">
        <div className="seal">
          <img src="./deskkeep-icon.svg" alt="" />
        </div>
        <span className="section-label">WELCOME TO DESKKEEP</span>
        <h1>Set up your private workspace.</h1>
        <p>
          Your data stays encrypted on this device. Start with the key only you
          know.
        </p>
        <Field label="Display name">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Master password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 10 characters"
          />
        </Field>
        <Field label="Confirm master password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" onClick={submit}>
          Create encrypted Deskkeep
        </button>
      </div>
    </AuthFrame>
  );
}

function Unlock({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    try {
      recovery
        ? await window.deskkeep.recover({
            recoveryCode: code,
            newMasterPassword: next,
          })
        : await window.deskkeep.unlock(password);
      onDone();
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  return (
    <AuthFrame>
      <div className="auth-step">
        <div className="seal">
          <img src="./deskkeep-icon.svg" alt="" />
        </div>
        <span className="section-label">LOCAL VAULT / LOCKED</span>
        <h1>{recovery ? "Recover your Deskkeep." : "Welcome back."}</h1>
        <p>
          {recovery
            ? "Use your one-time recovery code and choose a new master password."
            : "Unlock the private workspace stored on this device."}
        </p>
        {recovery ? (
          <>
            <Field label="Recovery code">
              <input value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Field label="New master password">
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <Field label="Master password">
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </Field>
        )}
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" onClick={submit}>
          {recovery ? "Recover and unlock" : "Unlock Deskkeep"}
        </button>
        <button
          className="text-button"
          onClick={() => {
            setRecovery(!recovery);
            setError("");
          }}
        >
          {recovery ? "Use master password" : "I forgot my master password"}
        </button>
      </div>
    </AuthFrame>
  );
}

const AuthFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="auth-shell">
    <div className="auth-atmosphere">
      <div className="index-card one">PASSWORDS</div>
      <div className="index-card two">PLANS</div>
      <div className="index-card three">NOTES</div>
    </div>
    {children}
  </div>
);
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

function Dashboard({
  name,
  subscriptions,
  credentials,
  notes,
  tasks,
  incomes,
  settings,
  go,
}: {
  name: string;
  subscriptions: Subscription[];
  credentials: Credential[];
  notes: Note[];
  tasks: Task[];
  incomes: Income[];
  settings: DeskkeepSettings;
  go: (p: Page) => void;
}) {
  const open = tasks.filter((t) => t.status !== "Completed");
  const overdue = open.filter((t) => t.dueDate < today());
  const currentMonth = today().slice(0, 7);
  const total = incomes
    .filter((item) => item.date.startsWith(currentMonth))
    .reduce((s, i) => s + i.amountMinor, 0);
  const allTimeIncome = incomes.reduce((s, i) => s + i.amountMinor, 0);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning."
      : hour < 18
        ? "Good afternoon."
        : "Good evening.";
  const trend = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return incomes
      .filter((item) => item.date === key)
      .reduce((sum, item) => sum + item.amountMinor, 0);
  });
  const maxTrend = Math.max(1, ...trend);
  const upcoming = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const renewals = subscriptions
    .filter((s) => s.active)
    .sort((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate));
  const protectionChecks = [
    { label: "Encrypted local vault", value: "AES-256-GCM", ok: true },
    {
      label: "Auto-lock",
      value: `after ${settings.autoLockMinutes} min`,
      ok: settings.autoLockMinutes > 0,
    },
    {
      label: "Clipboard clearing",
      value: `${settings.clipboardSeconds}s`,
      ok: settings.clipboardSeconds > 0,
    },
  ];
  const readyChecks = protectionChecks.filter((c) => c.ok).length;
  return (
    <div className="dashboard-grid">
      <section className="overview panel">
        <div className="greeting">
          <h2>
            {greeting} {name ? name.toUpperCase() : ""}
          </h2>
          <span>Here&apos;s everything across your Deskkeep.</span>
        </div>
        <div className="tally">
          <button onClick={() => go("credential")} className="stat-tile">
            <span className="stat-label">
              <KeyRound size={15} /> Credentials
            </span>
            <strong>{credentials.length}</strong>
          </button>
          <button onClick={() => go("note")} className="stat-tile">
            <span className="stat-label">
              <FileText size={15} /> Notes
            </span>
            <strong>{notes.length}</strong>
          </button>
          <button onClick={() => go("task")} className="stat-tile">
            <span className="stat-label">
              <Check size={15} /> Tasks
            </span>
            <strong>{open.length}</strong>
          </button>
        </div>
        {overdue.length > 0 && (
          <button className="attention-row" onClick={() => go("task")}>
            <span className="dot" />
            <span>
              {overdue.length} task{overdue.length === 1 ? "" : "s"} overdue
            </span>
            <strong>
              View tasks <ChevronRight size={14} />
            </strong>
          </button>
        )}
        <section className="income-panel panel-inset">
          <div className="panel-head">
            <span className="panel-title">
              <Gauge size={15} /> Income Activity
            </span>
            <span className="pill">Active</span>
          </div>
          <div className="income-figures">
            <div>
              <span>This month</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>All-time</span>
              <strong>{money(allTimeIncome)}</strong>
            </div>
          </div>
          <div className="bars">
            {trend.map((value, i) => (
              <i
                key={i}
                style={{ height: `${Math.max(4, (value / maxTrend) * 100)}%` }}
                title={money(value)}
              />
            ))}
          </div>
          <button className="link-button" onClick={() => go("income")}>
            Open income ledger <ChevronRight size={14} />
          </button>
        </section>
        <div className="ledger-head">
          <h3>Recent credentials</h3>
          <button onClick={() => go("credential")}>View all</button>
        </div>
        <div className="ruled-list">
          {credentials.slice(0, 4).map((c) => (
            <div className="ledger-row" key={c.id}>
              <WebsiteMark
                title={c.title}
                website={c.website}
                enabled={settings.websiteIcons}
              />
              <div className="grow">
                <strong>{c.title}</strong>
                <span>{c.username || "No username"}</span>
              </div>
              <button
                className="icon-button"
                aria-label={`Copy password for ${c.title}`}
                onClick={() =>
                  window.deskkeep.copyCredential(c.id, settings.clipboardSeconds)
                }
              >
                <ClipboardCopy size={16} />
              </button>
            </div>
          ))}
          {!credentials.length && (
            <Empty
              compact
              title="Your vault is ready"
              copy="Add a first login to see it here."
            />
          )}
        </div>
      </section>
      <aside className="dashboard-side">
        <WorldClocks />
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">
              <CreditCard size={15} /> Renewals
            </span>
            <button className="link-button" onClick={() => go("subscriptions")}>
              View all
            </button>
          </div>
          <div className="mini-list">
            {renewals.slice(0, 4).map((s) => (
              <div key={s.id}>
                <span className="mini-logo">
                  <WebsiteMark
                    title={s.name}
                    website={s.website || s.provider}
                    enabled={settings.websiteIcons}
                  />
                </span>
                <span>{s.name}</span>
                <time>
                  {money(s.amountMinor, s.currency)} ·{" "}
                  {dueLabel(daysFromToday(s.nextPaymentDate))}
                </time>
              </div>
            ))}
            {!renewals.length && (
              <p className="quiet">No active subscriptions.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">
              <CalendarDays size={15} /> Upcoming tasks
            </span>
            <button className="link-button" onClick={() => go("calendar")}>
              View all
            </button>
          </div>
          <div className="mini-list">
            {upcoming.slice(0, 4).map((t) => (
              <div key={t.id}>
                <i className={`priority ${t.priority.toLowerCase()}`} />
                <span>{t.title}</span>
                <time>{t.dueDate.slice(5)}</time>
              </div>
            ))}
            {!open.length && <p className="quiet">No open tasks.</p>}
          </div>
        </section>
        <section className="panel protection">
          <div className="panel-head">
            <span className="panel-title">
              <ShieldCheck size={15} /> Vault protection
            </span>
            <span className="pill">
              {readyChecks === protectionChecks.length ? "Ready" : "Review"}
            </span>
          </div>
          <div className="protection-meter">
            <strong>
              {readyChecks}/{protectionChecks.length}
            </strong>
            <span>checks ready</span>
            <div className="meter-track">
              <i
                style={{
                  width: `${(readyChecks / protectionChecks.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="check-list">
            {protectionChecks.map((c) => (
              <div key={c.label}>
                <i className={c.ok ? "ok" : ""} />
                <span>{c.label}</span>
                <time>{c.value}</time>
              </div>
            ))}
          </div>
          <button className="primary full" onClick={() => go("settings")}>
            Create backup
          </button>
        </section>
      </aside>
    </div>
  );
}

function Credentials({
  items,
  folders,
  clipboardSeconds,
  websiteIcons,
  edit,
  remove,
}: {
  items: Credential[];
  folders: FolderType[];
  clipboardSeconds: number;
  websiteIcons: boolean;
  edit: (v: Credential) => void;
  remove: (t: EntityType, id: string) => void;
}) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [folderId, setFolderId] = useState("");
  const [tag, setTag] = useState("");
  const [view, setView] = useState<"list" | "grid">(() =>
    readPref<"list" | "grid">("deskkeep-vault-view", "list"),
  );
  const chooseView = (next: "list" | "grid") => {
    setView(next);
    writePref("deskkeep-vault-view", next);
  };
  const shown = items.filter(
    (item) =>
      (!folderId || item.folderId === folderId) &&
      (!tag || item.tags?.includes(tag)),
  );
  const tags = [...new Set(items.flatMap((item) => item.tags || []))].sort();
  const reveal = async (id: string) => {
    if (secrets[id]) {
      const next = { ...secrets };
      delete next[id];
      setSecrets(next);
    } else
      setSecrets({ ...secrets, [id]: await window.deskkeep.revealCredential(id) });
  };
  return (
    <>
      <div className="filter-bar">
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
          <option value="">All folders</option>
          {folders.map((folder) => (
            <option value={folder.id} key={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <div className="segmented view-toggle" role="group" aria-label="Vault view">
          <button
            className={view === "grid" ? "active" : ""}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            onClick={() => chooseView("grid")}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={view === "list" ? "active" : ""}
            aria-pressed={view === "list"}
            aria-label="List view"
            onClick={() => chooseView("list")}
          >
            <List size={15} />
          </button>
        </div>
        <span>{shown.length} logins</span>
      </div>
      <div className={view === "grid" ? "credential-grid" : "ruled-list wide"}>
        {shown.map((c) => (
          <div className="ledger-row credential-row" key={c.id}>
            <WebsiteMark
              title={c.title}
              website={c.website}
              enabled={websiteIcons}
            />
            <div className="grow">
              <strong>{c.title}</strong>
              <span>{c.username || c.website || "No username"}</span>
            </div>
            <div className="secret-cell">
              <code>{secrets[c.id] || "••••••••••"}</code>
              <button aria-label="Reveal password" onClick={() => reveal(c.id)}>
                {secrets[c.id] ? <EyeOff /> : <Eye />}
              </button>
              <button
                aria-label="Copy password"
                onClick={() =>
                  window.deskkeep.copyCredential(c.id, clipboardSeconds)
                }
              >
                <ClipboardCopy />
              </button>
            </div>
            {c.favorite && <Star className="starred" />}
            <button className="icon-button" onClick={() => edit(c)}>
              <MoreHorizontal />
            </button>
            <button
              className="icon-button danger-icon"
              onClick={() => remove("credential", c.id)}
            >
              <Trash2 />
            </button>
          </div>
        ))}
        {!shown.length && (
          <Empty
            title="No credentials on this sheet"
            copy="Add a login, generated password, website, tags, and a private note."
          />
        )}
      </div>
    </>
  );
}

function WebsiteMark({
  title,
  website,
  enabled,
}: {
  title: string;
  website: string;
  enabled: boolean;
}) {
  const [icon, setIcon] = useState<string | null>(null);
  useEffect(() => {
    if (enabled && website)
      window.deskkeep
        .websiteIcon(website)
        .then(setIcon)
        .catch(() => setIcon(null));
    else setIcon(null);
  }, [website, enabled]);
  const brand = brandForRecord(title, website);
  if (icon)
    return (
      <div className="site-dot">
        <img src={icon} alt="" />
      </div>
    );
  if (brand)
    return (
      <div className="site-dot brand-tile" title={brand.title}>
        <svg viewBox="0 0 24 24" role="img" aria-label={brand.title}>
          <path d={brand.path} fill={`#${brand.hex}`} />
        </svg>
      </div>
    );
  return (
    <div className="site-dot">
      {icon ? <img src={icon} alt="" /> : title[0]?.toUpperCase()}
    </div>
  );
}

function Notes({
  items,
  folders,
  edit,
  duplicate,
  remove,
  importFile,
}: {
  items: Note[];
  folders: FolderType[];
  edit: (v: Note) => void;
  duplicate: (v: Note) => void;
  remove: (t: EntityType, id: string) => void;
  importFile: () => void;
}) {
  const [selected, setSelected] = useState<string>("");
  const [folderId, setFolderId] = useState("");
  const [preview, setPreview] = useState(true);
  const shown = items.filter((item) => !folderId || item.folderId === folderId);
  const current = shown.find((n) => n.id === (selected || shown[0]?.id));
  return (
    <>
      <div className="filter-bar">
        <select
          value={folderId}
          onChange={(e) => {
            setFolderId(e.target.value);
            setSelected("");
          }}
        >
          <option value="">All note folders</option>
          {folders.map((folder) => (
            <option value={folder.id} key={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <button className="pill-action" onClick={importFile}>
          Import .md file
        </button>
        <span>{shown.length} notes</span>
      </div>
      <div className="split-view">
        <div className="note-index">
          {shown.map((n) => (
            <button
              key={n.id}
              className={current?.id === n.id ? "selected" : ""}
              onClick={() => setSelected(n.id)}
            >
              <strong>{n.title}</strong>
              <span>{markdownSnippet(n.body) || "Empty note"}</span>
              {n.favorite && <Star size={13} />}
            </button>
          ))}
          {!items.length && (
            <Empty
              compact
              title="A blank notebook"
              copy="Create a note to begin."
            />
          )}
        </div>
        <article className="note-paper">
          {current ? (
            <>
              <div className="note-meta">
                <span>
                  NOTE / {new Date(current.updatedAt).toLocaleDateString()}
                </span>
                <div>
                  <button onClick={() => edit(current)}>Edit</button>
                  <button onClick={() => duplicate(current)}>Duplicate</button>
                  <button onClick={() => setPreview(!preview)}>
                    {preview ? "Plain text" : "Preview"}
                  </button>
                  <button onClick={() => remove("note", current.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <h2>{current.title}</h2>
              <div className="note-body">
                {preview ? (
                  <Markdown source={current.body} />
                ) : (
                  <pre>{current.body}</pre>
                )}
              </div>
            </>
          ) : (
            <Empty
              title="Select or create a note"
              copy="Your writing remains encrypted with the rest of the Deskkeep."
            />
          )}
        </article>
      </div>
    </>
  );
}

function Tasks({
  items,
  edit,
  save,
  remove,
}: {
  items: Task[];
  edit: (v: Task) => void;
  save: (t: EntityType, v: Record<string, unknown>) => void;
  remove: (t: EntityType, id: string) => void;
}) {
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("due");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropLane, setDropLane] = useState<string | null>(null);
  const shown = items
    .filter((t) => !priority || t.priority === priority)
    .sort((a, b) =>
      sort === "priority"
        ? ["High", "Medium", "Low"].indexOf(a.priority) -
          ["High", "Medium", "Low"].indexOf(b.priority)
        : a.dueDate.localeCompare(b.dueDate),
    );
  return (
    <>
      <div className="filter-bar">
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {["High", "Medium", "Low"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
        </select>
        <span>{shown.length} tasks</span>
      </div>
      <div className="task-board">
        {(["To Do", "In Progress", "Completed"] as const).map((status) => (
          <section
            key={status}
            className={`lane ${dropLane === status ? "drop-target" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dropLane !== status) setDropLane(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setDropLane(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropLane(null);
              setDragging(null);
              const moving = items.find(
                (t) => t.id === e.dataTransfer.getData("text/plain"),
              );
              if (moving && moving.status !== status)
                save("task", { ...moving, status });
            }}
          >
            <div className="lane-head">
              <h3>{status}</h3>
              <span>{shown.filter((t) => t.status === status).length}</span>
            </div>
            <div className="lane-items">
            {shown
              .filter((t) => t.status === status)
              .map((t) => (
                <div
                  className={`task-row ${dragging === t.id ? "dragging" : ""}`}
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", t.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(t.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setDropLane(null);
                  }}
                >
                  <button
                    className={`check ${status === "Completed" ? "done" : ""}`}
                    onClick={() =>
                      save("task", {
                        ...t,
                        status: status === "Completed" ? "To Do" : "Completed",
                      })
                    }
                  >
                    {status === "Completed" && <Check />}
                  </button>
                  <div className="grow" onClick={() => edit(t)}>
                    <strong>{t.title}</strong>
                    <span>{t.description || "No description"}</span>
                  </div>
                  <time
                    className={
                      t.dueDate < today() && status !== "Completed"
                        ? "late"
                        : ""
                    }
                  >
                    {t.dueDate}
                  </time>
                  <span className={`stamp ${t.priority.toLowerCase()}`}>
                    {t.priority}
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => remove("task", t.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            {!shown.some((t) => t.status === status) && (
              <p className="empty-lane">Nothing here.</p>
            )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

type CalItem =
  | { kind: "task"; task: Task }
  | { kind: "income"; income: Income }
  | { kind: "feed"; event: FeedEvent; color: string };
// One colour per connected calendar, so you can tell them apart at a glance.
const FEED_COLORS = ["#3d746d", "#4a6fa5", "#b0793a", "#7b5ea7", "#a4505a", "#5b8c4a"];
const calLabel = (item: CalItem) =>
  item.kind === "task"
    ? item.task.title
    : item.kind === "income"
      ? money(item.income.amountMinor, item.income.currency)
      : `${item.event.time ? `${item.event.time} ` : ""}${item.event.title}`;
const longDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// Lists the items for one day, opened from "+N more". Clicking an item opens its details.
function DayDialog({
  date,
  items,
  onOpen,
  onAdd,
  onClose,
}: {
  date: string;
  items: CalItem[];
  onOpen: (item: CalItem) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="cal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Items on ${longDate(date)}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-label">{longDate(date)}</span>
            <h2>{items.length} items</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="cal-dialog-list">
          {items.map((item) => (
            <button
              key={calItemKey(item)}
              className={`cal-dialog-row ${item.kind}`}
              onClick={() => onOpen(item)}
            >
              <i style={item.kind === "feed" ? { background: item.color } : undefined} />
              <strong>{calLabel(item)}</strong>
              <span>
                {item.kind === "task"
                  ? `Task · ${item.task.priority} · ${item.task.status}`
                  : item.kind === "income"
                    ? `Income · ${item.income.category}`
                    : `Calendar · ${item.event.feedLabel} · read-only`}
              </span>
            </button>
          ))}
        </div>
        <footer>
          <span />
          <button className="primary" onClick={onAdd}>
            Add task on this day
          </button>
        </footer>
      </div>
    </div>
  );
}

// Details for one task or income entry, with Edit and Delete. Calendar events are read-only.
function EventDialog({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: CalItem;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="cal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={calLabel(item)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-label">
              {item.kind === "task" ? "Task" : item.kind === "income" ? "Income" : "Calendar · read-only"}
            </span>
            <h2>{calLabel(item)}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {item.kind === "task" ? (
          <dl className="cal-facts">
            <div>
              <dt>Due</dt>
              <dd>{longDate(item.task.dueDate)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{item.task.status}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{item.task.priority}</dd>
            </div>
            {item.task.description && (
              <div className="wide">
                <dt>Description</dt>
                <dd>{item.task.description}</dd>
              </div>
            )}
          </dl>
        ) : item.kind === "feed" ? (
          <dl className="cal-facts">
            <div>
              <dt>Date</dt>
              <dd>
                {longDate(item.event.date)}
                {item.event.time ? ` · ${item.event.time}` : " · all day"}
              </dd>
            </div>
            <div>
              <dt>Calendar</dt>
              <dd>{item.event.feedLabel}</dd>
            </div>
            {item.event.location && (
              <div>
                <dt>Location</dt>
                <dd>{item.event.location}</dd>
              </div>
            )}
            {item.event.description && (
              <div className="wide">
                <dt>Notes</dt>
                <dd>{item.event.description}</dd>
              </div>
            )}
          </dl>
        ) : (
          <dl className="cal-facts">
            <div>
              <dt>Date</dt>
              <dd>{longDate(item.income.date)}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{money(item.income.amountMinor, item.income.currency)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{item.income.category}</dd>
            </div>
            {item.income.notes && (
              <div className="wide">
                <dt>Remarks</dt>
                <dd>{item.income.notes}</dd>
              </div>
            )}
          </dl>
        )}
        <footer>
          {onDelete ? (
            <button className="danger" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div>
            {onEdit && <button onClick={onEdit}>Edit</button>}
            <button className="primary" onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function calItemKey(item: CalItem) {
  return item.kind === "task"
    ? `t-${item.task.id}`
    : item.kind === "income"
      ? `i-${item.income.id}`
      : `f-${item.event.id}`;
}

function Calendar({
  tasks,
  incomes,
  feeds,
  feedEvents,
  syncedAt,
  syncing,
  syncErrors,
  onSync,
  addTask,
  edit,
  remove,
}: {
  tasks: Task[];
  incomes: Income[];
  feeds: CalendarFeed[];
  feedEvents: FeedEvent[];
  syncedAt: string | null;
  syncing: boolean;
  syncErrors: CalendarSyncResult["errors"];
  onSync: () => void;
  addTask: (date: string) => void;
  edit: (type: EntityType, value: Record<string, unknown>) => void;
  remove: (type: EntityType, id: string) => void;
}) {
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState<CalItem | null>(null);
  const colorOf = (feedId: string) => {
    const index = feeds.findIndex((feed) => feed.id === feedId);
    return FEED_COLORS[(index < 0 ? 0 : index) % FEED_COLORS.length];
  };
  const feedItems = (date: string): Extract<CalItem, { kind: "feed" }>[] =>
    feedEvents
      .filter((event) => event.date === date)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((event) => ({ kind: "feed" as const, event, color: colorOf(event.feedId) }));
  const itemsOn = (date: string): CalItem[] => [
    ...tasks
      .filter((t) => t.dueDate === date)
      .map((task) => ({ kind: "task" as const, task })),
    ...incomes
      .filter((v) => v.date === date)
      .map((income) => ({ kind: "income" as const, income })),
    ...feedItems(date),
  ];
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"week" | "month" | "year">("month");
  // Direction of the last move: "prev" slides the month in from above, "next" from below.
  const [direction, setDirection] = useState<"prev" | "next">("next");
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() + days }, (_, i) =>
    i < first.getDay() ? null : i - first.getDay() + 1,
  );
  const shift = (amount: number) => {
    setDirection(amount < 0 ? "prev" : "next");
    setCursor(
      view === "year"
        ? new Date(year + amount, month, 1)
        : view === "week"
          ? new Date(year, month, cursor.getDate() + amount * 7)
          : new Date(year, month + amount, 1),
    );
  };
  const goToday = () => {
    const now = new Date();
    setDirection(now < cursor ? "prev" : "next");
    setCursor(now);
  };
  const weekStart = new Date(cursor);
  weekStart.setDate(cursor.getDate() - cursor.getDay());
  const dateKey = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return (
    <div className="calendar-sheet">
      <div className="calendar-tools">
        <div className="cal-nav">
          <button className="cal-today" onClick={goToday}>
            Today
          </button>
          <button
            className="cal-arrow"
            aria-label="Previous"
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="cal-arrow"
            aria-label="Next"
            onClick={() => shift(1)}
          >
            <ChevronRight size={18} />
          </button>
          <h2 aria-live="polite">
            {view === "year"
              ? year
              : cursor.toLocaleString("en", { month: "long", year: "numeric" })}
          </h2>
        </div>
        <div className="calendar-actions">
          {feeds.length > 0 && (
            <span
              className={`cal-sync ${syncErrors.length ? "warn" : ""}`}
              title={syncErrors.map((e) => `${e.label}: ${e.message}`).join("\n")}
            >
              {syncErrors.length
                ? `${syncErrors.length} calendar${syncErrors.length > 1 ? "s" : ""} could not sync`
                : syncedAt
                  ? `Synced ${new Date(syncedAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`
                  : "Not synced yet"}
            </span>
          )}
          {feeds.length > 0 && (
            <button onClick={onSync} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
          <label className="view-select">
            <span className="sr-only">Calendar view</span>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
            <ChevronDown size={15} />
          </label>
          <button className="primary" onClick={() => addTask(dateKey(cursor))}>
            Add task
          </button>
        </div>
      </div>
      {view === "week" && (
        <div className="week-grid">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const key = dateKey(date);
            return (
              <section key={key}>
                <header>
                  <b>{date.toLocaleString("en", { weekday: "short" })}</b>
                  <span>{date.getDate()}</span>
                </header>
                {tasks
                  .filter((t) => t.dueDate === key)
                  .map((t) => (
                    <i className="event task" key={t.id}>
                      {t.title}
                    </i>
                  ))}
                {incomes
                  .filter((v) => v.date === key)
                  .map((v) => (
                    <i className="event cash" key={v.id}>
                      {money(v.amountMinor, v.currency)}
                    </i>
                  ))}
                {feedItems(key).map((item) => (
                  <button
                    type="button"
                    className="event feed"
                    style={{ borderLeftColor: item.color }}
                    key={calItemKey(item)}
                    onClick={() => setEventOpen(item)}
                  >
                    {calLabel(item)}
                  </button>
                ))}
                <button onClick={() => addTask(key)}>+ task</button>
              </section>
            );
          })}
        </div>
      )}
      {view === "year" && (
        <div className="year-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                setCursor(new Date(year, i, 1));
                setView("month");
              }}
            >
              <strong>
                {new Date(year, i, 1).toLocaleString("en", { month: "long" })}
              </strong>
              <span>
                {
                  tasks.filter((t) =>
                    t.dueDate.startsWith(
                      `${year}-${String(i + 1).padStart(2, "0")}`,
                    ),
                  ).length
                }{" "}
                tasks
              </span>
              <span>
                {
                  incomes.filter((v) =>
                    v.date.startsWith(
                      `${year}-${String(i + 1).padStart(2, "0")}`,
                    ),
                  ).length
                }{" "}
                income entries
              </span>
              {feedEvents.length > 0 && (
                <span>
                  {
                    feedEvents.filter((e) =>
                      e.date.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`),
                    ).length
                  }{" "}
                  calendar events
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {view === "month" && (
        <div
          key={`${year}-${month}`}
          className={`calendar-grid cal-slide-${direction}`}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <b key={d}>{d}</b>
          ))}
          {cells.map((day, i) => {
            const date = day
              ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              : "";
            const dayItems = day ? itemsOn(date) : [];
            // Up to three items fit; more collapse into "+N more" so every day cell keeps its size.
            const visible = dayItems.length > 3 ? dayItems.slice(0, 2) : dayItems;
            const hidden = dayItems.length - visible.length;
            return (
              <div
                className={!day ? "outside" : ""}
                key={i}
                onDoubleClick={() => day && addTask(date)}
              >
                {day && (
                  <>
                    <span
                      className={`cal-daynum ${date === dateKey(new Date()) ? "today" : ""}`}
                    >
                      {day}
                    </span>
                    {visible.map((item) => (
                      <button
                        type="button"
                        key={calItemKey(item)}
                        className={`event ${item.kind === "task" ? "task" : item.kind === "income" ? "cash" : "feed"}`}
                        style={item.kind === "feed" ? { borderLeftColor: item.color } : undefined}
                        onClick={() => setEventOpen(item)}
                      >
                        {calLabel(item)}
                      </button>
                    ))}
                    {hidden > 0 && (
                      <button
                        type="button"
                        className="cal-more"
                        onClick={() => setDayOpen(date)}
                      >
                        +{hidden} more
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {dayOpen && (
        <DayDialog
          date={dayOpen}
          items={itemsOn(dayOpen)}
          onOpen={(item) => {
            setDayOpen(null);
            setEventOpen(item);
          }}
          onAdd={() => {
            setDayOpen(null);
            addTask(dayOpen);
          }}
          onClose={() => setDayOpen(null)}
        />
      )}
      {eventOpen && (
        <EventDialog
          item={eventOpen}
          onClose={() => setEventOpen(null)}
          onEdit={
            eventOpen.kind === "feed"
              ? undefined
              : () => {
                  const target = eventOpen;
                  setEventOpen(null);
                  if (target.kind === "task")
                    edit("task", target.task as unknown as Record<string, unknown>);
                  else if (target.kind === "income")
                    edit("income", target.income as unknown as Record<string, unknown>);
                }
          }
          onDelete={
            eventOpen.kind === "feed"
              ? undefined
              : async () => {
                  const target = eventOpen;
                  setEventOpen(null);
                  if (target.kind === "task") await remove("task", target.task.id);
                  else if (target.kind === "income") await remove("income", target.income.id);
                }
          }
        />
      )}
    </div>
  );
}

function IncomeList({
  items,
  edit,
  remove,
}: {
  items: Income[];
  edit: (v: Income) => void;
  remove: (t: EntityType, id: string) => void;
}) {
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const shown = items
    .filter((i) => !category || i.category === category)
    .sort((a, b) =>
      sort === "amount"
        ? b.amountMinor - a.amountMinor
        : sort === "oldest"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
    );
  const total = shown.reduce((s, i) => s + i.amountMinor, 0);
  const monthPrefix = today().slice(0, 7);
  const monthTotal = shown
    .filter((i) => i.date.startsWith(monthPrefix))
    .reduce((s, i) => s + i.amountMinor, 0);
  const topCategory =
    Object.entries(
      shown.reduce<Record<string, number>>(
        (acc, i) => ({
          ...acc,
          [i.category]: (acc[i.category] || 0) + i.amountMinor,
        }),
        {},
      ),
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const trend = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - offset));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: date.toLocaleString("en", { month: "short" }),
      value: shown
        .filter((item) => item.date.startsWith(key))
        .reduce((sum, item) => sum + item.amountMinor, 0),
    };
  });
  const maxTrend = Math.max(1, ...trend.map((point) => point.value));
  return (
    <>
      <div className="filter-bar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount">Highest amount</option>
        </select>
        <button onClick={() => window.deskkeep.exportIncomeCsv()}>
          Export CSV
        </button>
      </div>
      <div className="summary-strip">
        <div>
          <span>All-time recorded</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>This month</span>
          <strong>{money(monthTotal)}</strong>
        </div>
        <div>
          <span>Top category</span>
          <strong>{topCategory}</strong>
        </div>
      </div>
      <div className="income-trend" aria-label="Six month income trend">
        {trend.map((point) => (
          <div key={point.label}>
            <i
              style={{
                height: `${Math.max(3, (point.value / maxTrend) * 100)}%`,
              }}
            />
            <span>{point.label}</span>
            <small>{money(point.value)}</small>
          </div>
        ))}
      </div>
      <div className="data-table">
        <div className="table-head">
          <span>Date</span>
          <span>Source</span>
          <span>Category</span>
          <span>Amount</span>
          <span />
        </div>
        {shown.map((i) => (
          <div className="table-row" key={i.id}>
            <time>{i.date}</time>
            <strong>{i.source}</strong>
            <span className="stamp">{i.category}</span>
            <b>{money(i.amountMinor, i.currency)}</b>
            <div>
              <button onClick={() => edit(i)}>Edit</button>
              <button onClick={() => remove("income", i.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!shown.length && (
          <Empty
            title="No income recorded"
            copy="Log freelance, salary, or other income without connecting a bank."
          />
        )}
      </div>
    </>
  );
}

function Folders({
  items,
  edit,
  remove,
}: {
  items: FolderType[];
  edit: (v: FolderType) => void;
  remove: (folder: FolderType) => void;
}) {
  const [kind, setKind] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("name");
  const shown = items
    .filter((item) => !kind || item.kind === kind)
    .sort((a, b) =>
      sort === "updated"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.name.localeCompare(b.name),
    );
  return (
    <>
      <div className="filter-bar">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All folder types</option>
          <option value="credential">Credentials</option>
          <option value="note">Notes</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Name</option>
          <option value="updated">Recently updated</option>
        </select>
        <div className="segmented">
          <button
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
          >
            Grid
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>
      <div className={`folder-shelf ${view}`}>
        {shown.map((f) => (
          <button
            className="folder-tab"
            key={f.id}
            onClick={() => edit(f)}
            style={{ "--folder": f.color } as React.CSSProperties}
          >
            <Folder />
            <span>
              <strong>{f.name}</strong>
              <small>{f.kind} folder</small>
            </span>
            {f.favorite && <Star />}
            <span
              className="folder-delete"
              onClick={(e) => {
                e.stopPropagation();
                remove(f);
              }}
            >
              <Trash2 />
            </span>
          </button>
        ))}
        {!shown.length && (
          <Empty
            title="No folders yet"
            copy="Create separate folders for credentials or notes."
          />
        )}
      </div>
    </>
  );
}
function Favorites({
  credentials,
  notes,
  folders,
}: {
  credentials: Credential[];
  notes: Note[];
  folders: FolderType[];
}) {
  const [kind, setKind] = useState("all");
  const all = [...credentials, ...notes, ...folders].filter((i) => i.favorite);
  const items = all.filter((item) => kind === "all" || item.type === kind);
  return (
    <>
      <div className="filter-bar">
        <div className="segmented">
          {[
            ["all", "All"],
            ["folder", "Folders"],
            ["credential", "Passwords"],
            ["note", "Notes"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={kind === value ? "active" : ""}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span>{items.length} favorites</span>
      </div>
      <div className="favorites-list">
        {items.map((i) => (
          <div className="ledger-row" key={i.id}>
            <Star className="starred" />
            <div>
              <strong>{String(i.title || i.name)}</strong>
              <span>{i.type}</span>
            </div>
          </div>
        ))}
        {!items.length && (
          <Empty
            title="Nothing starred yet"
            copy="Favorite a login, note, or folder and it will stay close by."
          />
        )}
      </div>
    </>
  );
}

function Generator({
  onUse,
  clipboardSeconds,
}: {
  onUse: (p: string) => void;
  clipboardSeconds: number;
}) {
  const [length, setLength] = useState(20);
  const [opts, setOpts] = useState({
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  });
  const [value, setValue] = useState("");
  useEffect(() => {
    window.deskkeep.generate({ length, ...opts }).then(setValue);
  }, [length, opts]);
  return (
    <div className="generator">
      <div className="generated">
        <code>{value}</code>
        <button onClick={() => window.deskkeep.copy(value, clipboardSeconds)}>
          <ClipboardCopy />
        </button>
      </div>
      <div className="strength">
        <i style={{ width: `${Math.min(100, length * 4)}%` }} />
        <span>
          {length >= 20 ? "Excellent" : length >= 14 ? "Strong" : "Fair"}
        </span>
      </div>
      <Field label={`Length — ${length}`}>
        <input
          type="range"
          min="8"
          max="48"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
        />
      </Field>
      {Object.entries(opts).map(([key, enabled]) => (
        <label className="toggle" key={key}>
          <span>{key[0].toUpperCase() + key.slice(1)}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })}
          />
          <i />
        </label>
      ))}
      <button className="primary full" onClick={() => onUse(value)}>
        <Plus />
        Use in new credential
      </button>
    </div>
  );
}
function ActivityLog({
  items,
  clear,
}: {
  items: Activity[];
  clear: () => void;
}) {
  return (
    <>
      <div className="filter-bar">
        <span>{items.length} local event{items.length === 1 ? "" : "s"}</span>
        <button className="danger" onClick={clear}>
          Clear activity
        </button>
      </div>
      <div className="timeline">
        {items.map((a) => (
          <div key={a.id}>
            <span className="timeline-dot" />
            <div>
              <strong>{a.action}</strong>
              <p>{a.detail}</p>
            </div>
            <time>{new Date(a.createdAt).toLocaleString()}</time>
          </div>
        ))}
        {!items.length && (
          <Empty
            title="No activity yet"
            copy="Security and important data actions appear here locally."
          />
        )}
      </div>
    </>
  );
}

function SettingsPage({
  settings,
  update,
  onRefresh,
  onMessage,
  calFeeds,
  calSynced,
  calErrors,
  calSyncing,
  onSync,
}: {
  settings: DeskkeepSettings;
  update: (next: Partial<DeskkeepSettings>) => void;
  onRefresh: () => void;
  onMessage: (m: string) => void;
  calFeeds: CalendarFeed[];
  calSynced: string | null;
  calErrors: CalendarSyncResult["errors"];
  calSyncing: boolean;
  onSync: () => void;
}) {
  const [tab, setTab] = useState("appearance");
  const [phrase, setPhrase] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [feedLabel, setFeedLabel] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedError, setFeedError] = useState("");
  const addFeed = async () => {
    try {
      await window.deskkeep.addCalendarFeed({ label: feedLabel.trim(), url: feedUrl.trim() });
      setFeedLabel("");
      setFeedUrl("");
      setFeedError("");
      onMessage("Calendar connected. Syncing now.");
      await onRefresh();
      await onSync();
    } catch (e) {
      setFeedError(String((e as Error).message));
    }
  };
  // Imports one exported .ics file. It is a snapshot: import it again to update it.
  const importFile = async () => {
    try {
      const result = await window.deskkeep.importCalendarFile(feedLabel.trim());
      if (result.canceled) return;
      setFeedLabel("");
      setFeedError("");
      onMessage(`Imported ${result.count ?? 0} events. Import again to update them.`);
      await onRefresh();
    } catch (e) {
      setFeedError(String((e as Error).message));
    }
  };
  const removeFeed = async (feed: CalendarFeed) => {
    if (!confirm(`Disconnect “${feed.label}”? Its events will be removed from the calendar.`)) return;
    await window.deskkeep.removeCalendarFeed(feed.id);
    onMessage(`${feed.label} disconnected.`);
    await onRefresh();
  };
  const importCsv = async () => {
    const result = await window.deskkeep.inspectCsv();
    if (result.canceled) return;
    if (result.errors?.length) {
      alert(result.errors.join("\n"));
      return;
    }
    if (
      confirm(
        `Import ${result.count} credentials?\n\nDetected mapping:\n${Object.entries(
          result.mapping || {},
        )
          .map(([field, column]) => `${field} ← ${column || "not supplied"}`)
          .join("\n")}\n\nExisting records will not be overwritten.`,
      )
    ) {
      const done = await window.deskkeep.commitCsv();
      onMessage(`${done.count} credentials imported.`);
      await onRefresh();
    }
  };
  return (
    <div className="settings-layout">
      <nav>
        {["account", "appearance", "security", "data", "calendar", "about"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      <section>
        {tab === "account" && (
          <>
            <h2>Account</h2>
            <Setting
              label="Display name"
              copy="Stored inside the encrypted local profile."
            >
              <div className="inline-form">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New display name"
                />
                <button
                  onClick={async () => {
                    await window.deskkeep.updateProfile(name);
                    setName("");
                    onMessage("Profile updated.");
                    await onRefresh();
                  }}
                >
                  Save
                </button>
              </div>
            </Setting>
            <Setting
              label="Profile avatar"
              copy="Choose a local image under 500 KB. It is encrypted with the rest of your settings."
            >
              <div>
                <button
                  onClick={async () => {
                    const result = await window.deskkeep.chooseAvatar();
                    if (result.avatar) {
                      onMessage("Profile avatar updated.");
                      await onRefresh();
                    }
                  }}
                >
                  Choose image
                </button>
                {settings.profileAvatar && (
                  <button onClick={() => update({ profileAvatar: "" })}>
                    Remove
                  </button>
                )}
              </div>
            </Setting>
          </>
        )}
        {tab === "calendar" && (
          <>
            <h2>Google Calendar</h2>
            <Setting
              label="Connect a calendar"
              copy="One link per calendar. In Google Calendar, open each calendar's settings and copy its Secret address in iCal format. Deskkeep reads events only, and nothing you add here is sent back to Google. Each link is stored encrypted in your vault."
            >
              <div className="cal-connect">
                <input
                  value={feedLabel}
                  onChange={(e) => {
                    setFeedLabel(e.target.value);
                    setFeedError("");
                  }}
                  placeholder="Name, e.g. Nicko Balmes"
                  aria-label="Calendar name"
                  maxLength={60}
                />
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={feedUrl}
                  onChange={(e) => {
                    setFeedUrl(e.target.value);
                    setFeedError("");
                  }}
                  placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                  aria-label="Secret iCal address"
                />
                <button
                  className="primary"
                  disabled={!feedUrl.trim() || !feedLabel.trim()}
                  onClick={addFeed}
                >
                  Add calendar
                </button>
                <button disabled={!feedLabel.trim()} onClick={importFile}>
                  Import .ics file
                </button>
              </div>
              {feedError && (
                <p className="error" role="alert">
                  {feedError}
                </p>
              )}
            </Setting>
            <Setting
              label={`Connected calendars (${calFeeds.length})`}
              copy={
                calSynced
                  ? `Last synced ${new Date(calSynced).toLocaleString("en")}. Deskkeep refreshes every 15 minutes while the vault is open.`
                  : "Not synced yet."
              }
            >
              {calFeeds.length === 0 ? (
                <p className="quiet">No calendars connected.</p>
              ) : (
                <div className="cal-feed-list">
                  {calFeeds.map((feed, index) => (
                    <div className="cal-feed-row" key={feed.id}>
                      <i style={{ background: FEED_COLORS[index % FEED_COLORS.length] }} />
                      <div>
                        <strong>{feed.label}</strong>
                        <span>{feed.host}</span>
                        {calErrors
                          .filter((e) => e.feedId === feed.id)
                          .map((e) => (
                            <span className="cal-feed-error" key={e.message}>
                              Could not sync: {e.message}
                            </span>
                          ))}
                      </div>
                      <button
                        className="icon-button danger-icon"
                        aria-label={`Disconnect ${feed.label}`}
                        onClick={() => removeFeed(feed)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button onClick={onSync} disabled={calSyncing}>
                    {calSyncing ? "Syncing…" : "Sync now"}
                  </button>
                </div>
              )}
            </Setting>
          </>
        )}
        {tab === "appearance" && (
          <>
            <h2>Appearance</h2>
            <Setting
              label="Theme"
              copy="Choose the interface that fits your room and working hours."
            >
              <div className="segmented">
                <button
                  className={settings.theme === "light" ? "active" : ""}
                  onClick={() => update({ theme: "light" })}
                >
                  <Sun size={14} />
                  Light
                </button>
                <button
                  className={settings.theme === "dark" ? "active" : ""}
                  onClick={() => update({ theme: "dark" })}
                >
                  <Moon size={14} />
                  Dark
                </button>
              </div>
            </Setting>
            <Setting
              label="Typography"
              copy="Deskkeep uses one compact monospace rhythm across every screen."
            >
              <select
                value={settings.fontSize}
                onChange={(e) =>
                  update({
                    fontSize: e.target.value as DeskkeepSettings["fontSize"],
                  })
                }
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="large">Large</option>
              </select>
            </Setting>
            <Setting
              label="Accent"
              copy="Choose the action color used throughout Deskkeep."
            >
              <select
                value={settings.accent}
                onChange={(e) =>
                  update({ accent: e.target.value as DeskkeepSettings["accent"] })
                }
              >
                <option value="blue">Steel blue</option>
                <option value="green">Calm green</option>
                <option value="violet">Violet</option>
              </select>
            </Setting>
            <Setting
              label="Website icons"
              copy="Shows each site's own icon. Deskkeep fetches it directly from that site, with no third-party icon service."
            >
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.websiteIcons}
                  onChange={(e) => update({ websiteIcons: e.target.checked })}
                />
                <i />
              </label>
            </Setting>
          </>
        )}
        {tab === "security" && (
          <>
            <h2>Security</h2>
            <Setting
              label="Auto-lock"
              copy="Lock automatically after inactivity."
            >
              <select
                aria-label="Auto-lock"
                value={settings.autoLockMinutes}
                onChange={(e) =>
                  update({ autoLockMinutes: Number(e.target.value) })
                }
              >
                {[1, 5, 10, 15, 30, 60].map((value) => (
                  <option value={value} key={value}>
                    {value} minutes
                  </option>
                ))}
              </select>
            </Setting>
            <Setting
              label="Clipboard clearing"
              copy="Clear passwords when the clipboard still contains the copied value."
            >
              <select
                aria-label="Clipboard clearing"
                value={settings.clipboardSeconds}
                onChange={(e) =>
                  update({ clipboardSeconds: Number(e.target.value) })
                }
              >
                {[10, 15, 30, 60, 120].map((value) => (
                  <option value={value} key={value}>
                    {value} seconds
                  </option>
                ))}
              </select>
            </Setting>
            <Setting
              label="Master password"
              copy="Re-wrap the vault key without re-encrypting every record."
            >
              <div className="stacked-form">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (10+ characters)"
                />
                <button
                  onClick={async () => {
                    await window.deskkeep.changeMasterPassword({
                      currentPassword,
                      newPassword,
                    });
                    setCurrentPassword("");
                    setNewPassword("");
                    onMessage("Master password changed.");
                  }}
                >
                  Change password
                </button>
              </div>
            </Setting>
            <Setting
              label="Recovery"
              copy="Your recovery code is never stored in readable form."
            >
              <div>
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        "Generate a new recovery code? The previous code will stop working.",
                      )
                    )
                      setRecoveryCode(await window.deskkeep.rotateRecovery());
                  }}
                >
                  Rotate code
                </button>
                {recoveryCode && (
                  <code className="inline-code">{recoveryCode}</code>
                )}
              </div>
            </Setting>
          </>
        )}
        {tab === "data" && (
          <>
            <h2>Data and recovery</h2>
            <Setting
              label="Encrypted backup"
              copy="A .dkbackup file remains encrypted and requires your master password."
            >
              <div>
                <button
                  onClick={async () => {
                    const r = await window.deskkeep.exportBackup();
                    if (r.path) onMessage("Encrypted backup created.");
                  }}
                >
                  Export backup
                </button>
                <button
                  onClick={async () => {
                    const password = prompt(
                      "Enter the backup master password to verify it before restore.",
                    );
                    if (!password) return;
                    const r = await window.deskkeep.restoreBackup(password);
                    if (r.restored)
                      onMessage(
                        "Backup verified and restored. Unlock to continue.",
                      );
                  }}
                >
                  Restore backup
                </button>
              </div>
            </Setting>
            <Setting
              label="Credential CSV import"
              copy="Inspect and validate required columns before adding new credentials. Imports never overwrite existing records."
            >
              <div>
                <button onClick={importCsv}>Inspect and import</button>
                <button onClick={() => window.deskkeep.csvTemplate()}>
                  Save template
                </button>
              </div>
            </Setting>
            <Setting
              label="Plaintext CSV"
              copy="For interoperability only. The exported file contains readable passwords."
            >
              <button
                onClick={async () => {
                  if (
                    confirm(
                      "Export readable credential passwords to CSV? Anyone with the file can read them.",
                    )
                  ) {
                    const r = await window.deskkeep.exportCsv();
                    if (r.path) onMessage("Plaintext CSV exported.");
                  }
                }}
              >
                Export credential CSV
              </button>
            </Setting>
            <Setting
              label="Reset local vault"
              copy="Deletes the current vault from this device. Existing backup files are not removed."
            >
              <div className="reset">
                <input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="Type RESET DESKKEEP"
                />
                <button
                  className="danger"
                  onClick={() => window.deskkeep.reset(phrase)}
                >
                  Reset vault
                </button>
              </div>
            </Setting>
          </>
        )}
        {tab === "about" && (
          <>
            <h2>About Deskkeep</h2>
            <p className="about-copy">
              A private, local-first desktop vault and life OS. Your data
              belongs on your desk, under your key.
            </p>
            <dl>
              <div>
                <dt>Version</dt>
                <dd>0.1.0 foundation</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>Encrypted local SQLite</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>Not required</dd>
              </div>
            </dl>
          </>
        )}
      </section>
    </div>
  );
}
const Setting = ({
  label,
  copy,
  children,
}: {
  label: string;
  copy: string;
  children: React.ReactNode;
}) => (
  <div className="setting-row">
    <div>
      <strong>{label}</strong>
      <p>{copy}</p>
    </div>
    <div>{children}</div>
  </div>
);

function Editor({
  type,
  initial,
  folders,
  onClose,
  onSave,
}: {
  type: EntityType;
  initial: Record<string, unknown>;
  folders: FolderType[];
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => void;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const input =(key: string, label: string, kind = "text") => (
    <Field label={label}>
      {kind === "textarea" ? (
        <textarea
          value={String(v[key] || "")}
          onChange={(e) => setV({ ...v, [key]: e.target.value })}
        />
      ) : kind === "int" ? (
        <input
          type="number"
          min={0}
          value={v[key] === undefined || v[key] === null ? "" : String(v[key])}
          onChange={(e) =>
            setV({
              ...v,
              [key]: e.target.value === "" ? 0 : Math.max(0, Math.round(Number(e.target.value))),
            })
          }
        />
      ) : (
        <input
          type={kind}
          value={String(
            kind === "number" && key === "amountMinor"
              ? Number(v[key] || 0) / 100
              : (v[key] ?? ""),
          )}
          onChange={(e) =>
            setV({
              ...v,
              [key]:
                kind === "number"
                  ? Math.round(Number(e.target.value) * 100)
                  : e.target.value,
            })
          }
        />
      )}
    </Field>
  );
  const listInput = (key: string, label: string) => (
    <Field label={label}>
      <input
        value={Array.isArray(v[key]) ? (v[key] as string[]).join(", ") : ""}
        onChange={(e) =>
          setV({
            ...v,
            [key]: e.target.value
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 30),
          })
        }
      />
    </Field>
  );
  const selectInput = (key: string, label: string, options: (string | number)[], fallback: string | number) => (
    <Field label={label}>
      <select
        value={String(v[key] ?? fallback)}
        onChange={(e) =>
          setV({ ...v, [key]: typeof fallback === "number" ? Number(e.target.value) : e.target.value })
        }
      >
        {options.map((x) => (
          <option key={String(x)} value={String(x)}>
            {typeof x === "number" && x === 0 ? "Unrated" : String(x)}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="editor">
        <header>
          <div>
            <span className="section-label">LOCAL / ENCRYPTED</span>
            <h2>
              {v.id ? "Edit" : "New"} {type}
            </h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="editor-fields">
          {type === "credential" && (
            <>
              {input("title", "Name")}
              {input("username", "Username or email")}
              {input("password", "Password", "password")}
              {input("website", "Website")}
              {input("notes", "Private notes", "textarea")}
              <Field label="Tags">
                <input
                  value={Array.isArray(v.tags) ? v.tags.join(", ") : ""}
                  onChange={(e) =>
                    setV({
                      ...v,
                      tags: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .slice(0, 5),
                    })
                  }
                />
              </Field>
              <Field label="Folder">
                <select
                  value={String(v.folderId || "")}
                  onChange={(e) =>
                    setV({ ...v, folderId: e.target.value || undefined })
                  }
                >
                  <option value="">No folder</option>
                  {folders
                    .filter((f) => f.kind === "credential")
                    .map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          )}
          {type === "note" && (
            <>
              {input("title", "Title")}
              {input("body", "Note", "textarea")}
              <Field label="Labels">
                <input
                  value={Array.isArray(v.labels) ? v.labels.join(", ") : ""}
                  onChange={(e) =>
                    setV({
                      ...v,
                      labels: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .slice(0, 5),
                    })
                  }
                />
              </Field>
              <Field label="Folder">
                <select
                  value={String(v.folderId || "")}
                  onChange={(e) =>
                    setV({ ...v, folderId: e.target.value || undefined })
                  }
                >
                  <option value="">No folder</option>
                  {folders
                    .filter((f) => f.kind === "note")
                    .map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          )}
          {type === "task" && (
            <>
              {input("title", "Title")}
              {input("description", "Description", "textarea")}
              {input("dueDate", "Due date", "date")}
              <Field label="Priority">
                <select
                  value={String(v.priority)}
                  onChange={(e) => setV({ ...v, priority: e.target.value })}
                >
                  {["Low", "Medium", "High"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={String(v.status)}
                  onChange={(e) => setV({ ...v, status: e.target.value })}
                >
                  {["To Do", "In Progress", "Completed"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tags">
                <input
                  value={Array.isArray(v.tags) ? v.tags.join(", ") : ""}
                  onChange={(e) =>
                    setV({
                      ...v,
                      tags: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .slice(0, 5),
                    })
                  }
                />
              </Field>
            </>
          )}
          {type === "income" && (
            <>
              {input("source", "Source")}
              {input("amountMinor", "Amount", "number")}
              {input("date", "Date", "date")}
              <Field label="Currency">
                <select
                  value={String(v.currency || "PHP")}
                  onChange={(e) => setV({ ...v, currency: e.target.value })}
                >
                  {["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"].map(
                    (code) => (
                      <option key={code}>{code}</option>
                    ),
                  )}
                </select>
              </Field>
              {input("category", "Category")}
              {input("notes", "Remarks", "textarea")}
            </>
          )}
          {type === "subscription" && (
            <>
              {input("name", "Name")}
              {input("provider", "Provider")}
              {input("website", "Website (for its logo)")}
              {input("amountMinor", "Amount per cycle", "number")}
              <Field label="Currency">
                <select
                  value={String(v.currency || "PHP")}
                  onChange={(e) => setV({ ...v, currency: e.target.value })}
                >
                  {["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"].map(
                    (code) => (
                      <option key={code}>{code}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Billing cycle">
                <select
                  value={String(v.billingCycle || "Monthly")}
                  onChange={(e) => setV({ ...v, billingCycle: e.target.value })}
                >
                  {["Weekly", "Monthly", "Quarterly", "Yearly"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              {input("nextPaymentDate", "Next payment date", "date")}
              {input("category", "Category")}
              {input("paymentMethod", "Payment method")}
              <Field label="Status">
                <select
                  value={v.active === false ? "Paused" : "Active"}
                  onChange={(e) =>
                    setV({ ...v, active: e.target.value === "Active" })
                  }
                >
                  <option>Active</option>
                  <option>Paused</option>
                </select>
              </Field>
              {input("notes", "Notes or license key reference", "textarea")}
            </>
          )}
          {type === "book" && (
            <>
              {input("title", "Title")}
              {listInput("authors", "Authors (comma separated)")}
              {input("isbn", "ISBN")}
              {input("publisher", "Publisher")}
              {input("publishedYear", "Year published")}
              {input("language", "Language")}
              {input("category", "Genre or category")}
              {input("series", "Book series")}
              {input("seriesIndex", "Position in series")}
              {selectInput("status", "Reading status", ["To Read", "Reading", "Finished", "Dropped"], "To Read")}
              {input("pageCount", "Total pages", "int")}
              {input("currentPage", "Current page", "int")}
              {input("startedDate", "Started", "date")}
              {input("finishedDate", "Finished", "date")}
              {selectInput("rating", "Rating", [0, 1, 2, 3, 4, 5], 0)}
              {input("source", "Where it came from")}
              {listInput("tags", "Tags (comma separated)")}
              {input("review", "Review", "textarea")}
              {input("notes", "Notes", "textarea")}
              {v.fileName ? (
                <Field label="Stored PDF">
                  <span className="quiet">
                    {String(v.fileName)} ·{" "}
                    {v.fileSize ? `${(Number(v.fileSize) / 1048576).toFixed(1)} MB` : ""} (encrypted in vault)
                  </span>
                </Field>
              ) : null}
            </>
          )}
          {type === "series" && (
            <>
              {input("title", "Show title")}
              {selectInput("kind", "Kind", ["Series", "Limited Series", "Anime", "Documentary", "Movie"], "Series")}
              {input("year", "Year")}
              {input("platform", "Platform")}
              {input("url", "Link")}
              {selectInput("status", "Status", ["Watching", "Up Next", "Completed", "On Hold", "Dropped", "Plan to Watch"], "Watching")}
              {input("currentSeason", "Current season", "int")}
              {input("currentEpisode", "Current episode", "int")}
              {input("totalSeasons", "Total seasons", "int")}
              {input("lastWatched", "Last watched", "date")}
              {selectInput("rating", "Rating", [0, 1, 2, 3, 4, 5], 0)}
              {listInput("tags", "Tags (comma separated)")}
              {input("review", "Review", "textarea")}
              {input("notes", "Notes", "textarea")}
            </>
          )}
          {type === "folder" && (
            <>
              {input("name", "Folder name")}
              <Field label="Type">
                <select
                  value={String(v.kind)}
                  onChange={(e) => setV({ ...v, kind: e.target.value })}
                >
                  <option value="credential">Credentials</option>
                  <option value="note">Notes</option>
                </select>
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  value={String(v.color)}
                  onChange={(e) => setV({ ...v, color: e.target.value })}
                />
              </Field>
            </>
          )}
        </div>
        <footer>
          {type !== "subscription" && (
          <label className="favorite-check">
            <input
              type="checkbox"
              checked={Boolean(v.favorite)}
              onChange={(e) => setV({ ...v, favorite: e.target.checked })}
            />
            <Star />
            Favorite
          </label>
          )}
          <div>
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={() => onSave(v)}>
              Save encrypted
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
const dueLabel = (days: number) =>
  days < 0
    ? `${-days}d overdue`
    : days === 0
      ? "due today"
      : `in ${days}d`;

function Subscriptions({
  items,
  edit,
  save,
  remove,
  websiteIcons,
}: {
  items: Subscription[];
  websiteIcons: boolean;
  edit: (v: Subscription) => void;
  save: (t: EntityType, v: Record<string, unknown>) => void;
  remove: (t: EntityType, id: string) => void;
}) {
  const [status, setStatus] = useState<"all" | "active" | "paused">("all");
  const [sort, setSort] = useState<"date" | "cost">("date");
  const monthlyOf = (s: Subscription) =>
    Math.round(s.amountMinor * cycleFactor[s.billingCycle]);
  const active = items.filter((s) => s.active);
  const totals = (list: Subscription[], scale: number) =>
    list.reduce<Record<string, number>>((acc, s) => {
      acc[s.currency] = (acc[s.currency] || 0) + monthlyOf(s) * scale;
      return acc;
    }, {});
  const monthly = totals(active, 1);
  const yearly = totals(active, 12);
  const byDate = (a: Subscription, b: Subscription) =>
    a.nextPaymentDate.localeCompare(b.nextPaymentDate);
  const nextUp = [...active].sort(byDate)[0];
  const shown = items
    .filter(
      (s) =>
        status === "all" || (status === "active" ? s.active : !s.active),
    )
    .sort((a, b) => (sort === "cost" ? monthlyOf(b) - monthlyOf(a) : byDate(a, b)));
  const fmtTotals = (map: Record<string, number>) =>
    Object.keys(map).length
      ? Object.entries(map)
          .map(([code, minor]) => money(minor, code))
          .join(" · ")
      : money(0);
  const markPaid = (s: Subscription) =>
    save("subscription", {
      ...s,
      nextPaymentDate: nextAfterPayment(s.nextPaymentDate, s.billingCycle),
    });
  return (
    <>
      <div className="tally sub-summary">
        <div className="stat-tile">
          <span className="stat-label">Monthly cost</span>
          <strong className="stat-money">{fmtTotals(monthly)}</strong>
          <span className="stat-note">{active.length} active</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Yearly cost</span>
          <strong className="stat-money">{fmtTotals(yearly)}</strong>
          <span className="stat-note">at current prices</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Next payment</span>
          <strong className="stat-money">
            {nextUp ? nextUp.name : "None"}
          </strong>
          <span className="stat-note">
            {nextUp
              ? `${money(nextUp.amountMinor, nextUp.currency)} · ${dueLabel(
                  daysFromToday(nextUp.nextPaymentDate),
                )}`
              : "Add one to start tracking"}
          </span>
        </div>
      </div>
      <div className="filter-bar">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All subscriptions</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="date">Next payment</option>
          <option value="cost">Highest monthly cost</option>
        </select>
        <span>{shown.length} records</span>
      </div>
      <div className="ruled-list wide">
        {shown.map((s) => {
          const days = daysFromToday(s.nextPaymentDate);
          const badge = !s.active
            ? "paused"
            : days < 0
              ? "overdue"
              : days <= 7
                ? "soon"
                : "";
          return (
            <div
              className={`ledger-row sub-row ${s.active ? "" : "is-paused"}`}
              key={s.id}
            >
              <WebsiteMark
                title={s.name}
                website={s.website || s.provider}
                enabled={websiteIcons}
              />
              <div className="grow">
                <strong>{s.name}</strong>
                <span>
                  {s.provider || "No provider"} · {s.billingCycle} ·{" "}
                  {s.category || "Uncategorized"}
                  {s.paymentMethod ? ` · ${s.paymentMethod}` : ""}
                </span>
              </div>
              <div className="sub-amount">
                <strong>{money(s.amountMinor, s.currency)}</strong>
                <span>{cycleSuffix[s.billingCycle]}</span>
              </div>
              <div className="sub-due">
                <time>{s.nextPaymentDate}</time>
                <span className={`due-badge ${badge}`}>
                  {s.active ? dueLabel(days) : "paused"}
                </span>
              </div>
              <button
                className="pill-action"
                disabled={!s.active}
                onClick={() => markPaid(s)}
              >
                Mark paid
              </button>
              <button
                className="icon-button"
                aria-label={s.active ? `Pause ${s.name}` : `Resume ${s.name}`}
                onClick={() => save("subscription", { ...s, active: !s.active })}
              >
                {s.active ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                className="icon-button"
                aria-label={`Edit ${s.name}`}
                onClick={() => edit(s)}
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                className="icon-button danger-icon"
                aria-label={`Delete ${s.name}`}
                onClick={() => remove("subscription", s.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        {!shown.length && (
          <Empty
            title="No subscriptions tracked"
            copy="Add a plan, software license, or domain with its price and next payment date."
          />
        )}
      </div>
    </>
  );
}

const bookStatusClass = (status: Book["status"]) =>
  status === "Finished" ? "done" : status === "Reading" ? "soon" : status === "Dropped" ? "paused" : "";
const stars = (n: number) => (n > 0 ? "★".repeat(n) + "☆".repeat(5 - n) : "Not rated");

function Books({
  items,
  importPdf,
  readPdf,
  exportPdf,
  edit,
  save,
  remove,
}: {
  items: Book[];
  importPdf: () => void;
  readPdf: (b: Book) => void;
  exportPdf: (id: string) => void;
  edit: (v: Book) => void;
  save: (t: EntityType, v: Record<string, unknown>) => void;
  remove: (t: EntityType, id: string) => void;
}) {
  const [status, setStatus] = useState<"all" | Book["status"]>("all");
  const [sort, setSort] = useState<"recent" | "title" | "progress">("recent");
  const shown = items
    .filter((b) => status === "all" || b.status === status)
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "progress"
          ? progressOf(b) - progressOf(a)
          : String(b.updatedAt).localeCompare(String(a.updatedAt)),
    );
  const reading = items.filter((b) => b.status === "Reading").length;
  const finished = items.filter((b) => b.status === "Finished").length;
  const storedBytes = items.reduce((s, b) => s + Number(b.fileSize || 0), 0);
  return (
    <>
      <div className="tally sub-summary">
        <div className="stat-tile">
          <span className="stat-label">Library</span>
          <strong className="stat-money">{items.length} {items.length === 1 ? "book" : "books"}</strong>
          <span className="stat-note">{items.filter((b) => b.fileId).length} with PDF</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Reading now</span>
          <strong className="stat-money">{reading}</strong>
          <span className="stat-note">{finished} finished</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Stored PDFs</span>
          <strong className="stat-money">{(storedBytes / 1048576).toFixed(1)} MB</strong>
          <span className="stat-note">encrypted in the vault</span>
        </div>
      </div>
      <div className="filter-bar">
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All books</option>
          <option>To Read</option>
          <option>Reading</option>
          <option>Finished</option>
          <option>Dropped</option>
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="recent">Recently updated</option>
          <option value="title">Title A–Z</option>
          <option value="progress">Most progress</option>
        </select>
        <button onClick={importPdf}>
          <Plus size={15} /> Import PDF
        </button>
        <span>{shown.length} records</span>
      </div>
      <div className="ruled-list wide">
        {shown.map((b) => (
          <div className="ledger-row media-row" key={b.id}>
            <div className="media-mark" aria-hidden="true"><BookOpen size={18} /></div>
            <div className="grow">
              <strong>{b.title}</strong>
              <span>
                {(b.authors || []).join(", ") || "Unknown author"}
                {b.series ? ` · ${b.series}${b.seriesIndex ? ` #${b.seriesIndex}` : ""}` : ""}
                {b.publisher ? ` · ${b.publisher}` : ""}
              </span>
              {b.pageCount > 0 && (
                <div className="progress-track" aria-label={`${progressOf(b)}% read`}>
                  <i style={{ width: `${progressOf(b)}%` }} />
                </div>
              )}
            </div>
            <div className="media-side">
              <span className={`due-badge ${bookStatusClass(b.status)}`}>{b.status}</span>
              <small>
                {b.pageCount > 0 ? `p. ${b.currentPage || 0} / ${b.pageCount}` : b.fileName ? "PDF" : "No file"}
              </small>
              <small>{stars(Number(b.rating || 0))}</small>
            </div>
            <button
              className="pill-action"
              onClick={() => save("book", { ...b, favorite: !b.favorite })}
              aria-label={b.favorite ? `Unfavorite ${b.title}` : `Favorite ${b.title}`}
            >
              <Star size={14} /> {b.favorite ? "Pinned" : "Pin"}
            </button>
            {b.fileId && (
              <button className="pill-action" onClick={() => readPdf(b)} aria-label={`Read ${b.title}`}>
                <BookOpen size={14} /> Read
              </button>
            )}
            {b.fileId && (
              <button className="icon-button" aria-label={`Export PDF of ${b.title}`} onClick={() => exportPdf(b.id)}>
                <Download size={16} />
              </button>
            )}
            <button className="icon-button" aria-label={`Edit ${b.title}`} onClick={() => edit(b)}>
              <MoreHorizontal size={16} />
            </button>
            <button className="icon-button danger-icon" aria-label={`Delete ${b.title}`} onClick={() => remove("book", b.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!shown.length && (
          <Empty
            title="No books yet"
            copy="Import a PDF to store it encrypted in your vault, or add a book by hand."
          />
        )}
      </div>
    </>
  );
}

const progressOf = (b: Book) =>
  b.pageCount > 0 ? Math.min(100, Math.round(((b.currentPage || 0) / b.pageCount) * 100)) : 0;

function SeriesList({
  items,
  edit,
  save,
  remove,
}: {
  items: Series[];
  edit: (v: Series) => void;
  save: (t: EntityType, v: Record<string, unknown>) => void;
  remove: (t: EntityType, id: string) => void;
}) {
  const [status, setStatus] = useState<"all" | Series["status"]>("all");
  const shown = items
    .filter((s) => status === "all" || s.status === status)
    .sort((a, b) => String(b.lastWatched || "").localeCompare(String(a.lastWatched || "")));
  const watching = items.filter((s) => s.status === "Watching").length;
  const completed = items.filter((s) => s.status === "Completed").length;
  const upNext = items.filter((s) => s.status === "Up Next").length;
  const nextUp = items.find((s) => s.status === "Watching") || items.find((s) => s.status === "Up Next");
  const nextLabel = (s: Series) => `S${s.currentSeason || 1} · E${s.currentEpisode || 1}`;
  const seasonsOf = (s: Series) =>
    s.totalSeasons ? `of ${s.totalSeasons} ${s.totalSeasons === 1 ? "season" : "seasons"}` : "";
  const nextEpisode = (s: Series) =>
    save("series", {
      ...s,
      currentEpisode: (Number(s.currentEpisode) || 0) + 1,
      status: s.status === "Up Next" || s.status === "Plan to Watch" ? "Watching" : s.status,
      lastWatched: today(),
    });
  return (
    <>
      <div className="tally sub-summary">
        <div className="stat-tile">
          <span className="stat-label">Watching</span>
          <strong className="stat-money">{watching}</strong>
          <span className="stat-note">{upNext} up next</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Completed</span>
          <strong className="stat-money">{completed}</strong>
          <span className="stat-note">of {items.length} tracked</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Continue with</span>
          <strong className="stat-money">{nextUp ? nextUp.title : "None"}</strong>
          <span className="stat-note">
            {nextUp ? [nextLabel(nextUp), seasonsOf(nextUp)].filter(Boolean).join(" ") : "Add a show to start"}
          </span>
        </div>
      </div>
      <div className="filter-bar">
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All shows</option>
          <option>Watching</option>
          <option>Up Next</option>
          <option>Completed</option>
          <option>On Hold</option>
          <option>Dropped</option>
          <option>Plan to Watch</option>
        </select>
        <span>{shown.length} records</span>
      </div>
      <div className="ruled-list wide">
        {shown.map((s) => (
          <div className="ledger-row media-row" key={s.id}>
            <div className="media-mark" aria-hidden="true"><Tv size={18} /></div>
            <div className="grow">
              <div className="title-line">
                <strong>{s.title}</strong>
                <span className={`due-badge ${s.status === "Completed" ? "done" : s.status === "Watching" ? "soon" : s.status === "Dropped" ? "paused" : ""}`}>
                  {s.status}
                </span>
              </div>
              <span>
                {s.kind || "Series"} · {s.platform || "No platform"}
                {s.year ? ` · ${s.year}` : ""}
                {s.tags?.length ? ` · ${s.tags.join(", ")}` : ""}
              </span>
            </div>
            <div className="media-side">
              <strong>{nextLabel(s)}</strong>
              {seasonsOf(s) && <small>{seasonsOf(s)}</small>}
              <small>{s.lastWatched ? `Last watched ${s.lastWatched}` : "Not started"}</small>
            </div>
            <button
              className="pill-action"
              disabled={s.status === "Completed" || s.status === "Dropped"}
              onClick={() => nextEpisode(s)}
            >
              +1 episode
            </button>
            <button className="icon-button" aria-label={`Edit ${s.title}`} onClick={() => edit(s)}>
              <MoreHorizontal size={16} />
            </button>
            <button className="icon-button danger-icon" aria-label={`Delete ${s.title}`} onClick={() => remove("series", s.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!shown.length && (
          <Empty
            title="No series tracked"
            copy="Add a show you are watching on Netflix or elsewhere, with the season and episode you are on."
          />
        )}
      </div>
    </>
  );
}

function Empty({
  title,
  copy,
  compact = false,
}: {
  title: string;
  copy: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty ${compact ? "compact" : ""}`}>
      <FileText />
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}
