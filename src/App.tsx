
import React, { useMemo, useState, useEffect } from "react";
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Search, MoreHorizontal, Pin, PinOff, ArrowRightLeft, X, Users, Eye, Pencil, Trash2, LayoutList, LayoutGrid, ChevronDown, ChevronUp, Sun, Moon, Monitor } from "lucide-react";

// ---------------- THEME HANDLER ----------------
type ThemeMode = "light" | "dark" | "system";
const THEME_KEY = "zotok_theme";

function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || "system");
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const apply = () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = theme === "dark" || (theme === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", isDark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => theme === "system" && apply();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  return { theme, setTheme };
}

// ---------- Types ----------
export type Status = "Open" | "Assigned" | "In Progress" | "Closed" | "Urgent" | "Custom" | "Order Received" | "Order Intent" | "Support Request" | "Campaign Engaged";

export type Card = {
  id: string;
  name: string;
  company?: string;
  summary?: string;
  minutesAgo?: number;
  assignee?: string;
  statuses: Status[];
  pinned?: boolean;
  tags?: string[];
};

export type Group = {
  id: string;
  name: string;
  color?: string;
  description?: string;
  mode?: 'manual' | 'auto';
  cards: Card[];
  visibleCount?: number;
};

export type Funnel = {
  id: string;
  name: string;
  groups: Group[];
};

// Helpers
function cn(...s: (string | false | undefined)[]) { return s.filter(Boolean).join(" "); }
function makeId(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2,8)}`; }

// Seed data
const seedCards = (n: number, seed: Partial<Card> = {}): Card[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: makeId("card"),
    name: ["Adani Wilmar Limited","VIP Industries Ltd","Voltas Limited","Kamdhenu Limited","Hero Motors Ltd","Eureka Forbes Ltd","Cadbury India Ltd"][i % 7],
    summary: "Lorem Ipsum is simply dummy text of the printing and typesetting ind…",
    minutesAgo: (i + 1) * 4,
    assignee: ["Barkha Barad","Shaan Luthra","Aalap Bhatnagar","Ravi Rege","Leela Magadum"][i % 5],
    statuses: ((): Status[] => {
      const list: Status[] = ["Open","Assigned","In Progress","Urgent","Support Request","Order Intent","Order Received","Campaign Engaged","Custom"];
      return [list[i % list.length], ...(i % 3 === 0 ? ["Urgent"] : [])];
    })(),
    tags: ["bulk","upload","engaged","custom","support","intent"].slice(0, (i % 5) + 1),
    ...seed,
  }));

const initialFunnels: Funnel[] = [
  { id: "f_marketing", name: "Marketing", groups: [
    { id: makeId("g"), name: "New Lead", color: "#5b9cf3", cards: seedCards(6), visibleCount: 3 },
    { id: makeId("g"), name: "Warm", color: "#f59f00", cards: seedCards(4), visibleCount: 3 },
    { id: makeId("g"), name: "Activated", color: "#22c55e", cards: seedCards(2), visibleCount: 3 },
    { id: makeId("g"), name: "Cold", color: "#94a3b8", cards: seedCards(2), visibleCount: 3 },
  ]},
  { id: "f_sales", name: "Sales", groups: [
    { id: makeId("g"), name: "Prospecting", color: "#6366f1", cards: seedCards(5), visibleCount: 3 },
    { id: makeId("g"), name: "Negotiation", color: "#eab308", cards: seedCards(4), visibleCount: 3 },
  ]},
  { id: "f_conversations", name: "Conversations", groups: [
    { id: makeId("g"), name: "Open", color: "#0ea5e9", cards: seedCards(4), visibleCount: 3 },
    { id: makeId("g"), name: "Closed", color: "#10b981", cards: seedCards(2), visibleCount: 3 },
  ]},
];

// ---------- Main Component ----------
export default function App() {
  const { theme, setTheme } = useTheme();
  // Persisted state (localStorage)
  type PersistedState = { funnels: Funnel[]; activeFunnelId: string };
  const STATE_KEY = 'kanban_pwa_state_v1';
  const loadState = (): PersistedState | null => {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.funnels) && typeof parsed.activeFunnelId === 'string') return parsed;
      return null;
    } catch {
      return null;
    }
  };
  const persisted = typeof window !== 'undefined' ? loadState() : null;

  const [funnels, setFunnels] = useState<Funnel[]>(persisted?.funnels || initialFunnels);
  const [activeFunnelId, setActiveFunnelId] = useState<string>(persisted?.activeFunnelId || initialFunnels[0].id);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [detailsCard, setDetailsCard] = useState<Card | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeFunnel = funnels.find(f => f.id === activeFunnelId)!;

  // Search + filter
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (c: Card) => {
      const combined = [c.name, c.company, c.summary, ...(c.tags || [])].join(" ").toLowerCase();
      const byStatus = statusFilter ? c.statuses.includes(statusFilter) : true;
      return (!q || combined.includes(q)) && byStatus;
    };
    return activeFunnel.groups.map(g => ({
      ...g,
      cards: [...g.cards]
        .filter(match)
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))),
    }));
  }, [activeFunnel, query, statusFilter]);

  // Save to localStorage whenever funnels or active funnel changes
  useEffect(() => {
    try {
      const state: PersistedState = { funnels, activeFunnelId };
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {}
  }, [funnels, activeFunnelId]);

  // Using local seed data (no backend)

  function onDragStart(e: any) { setDraggingId(e.active.id); }
  function onDragEnd(e: any) {
    const { active, over } = e;
    setDraggingId(null);
    if (!over || active.id === over.id) return;

    // Reorder funnels
    if (active.id.startsWith("f_") && over.id.startsWith("f_")) {
      const oldIndex = funnels.findIndex(f => f.id === active.id);
      const newIndex = funnels.findIndex(f => f.id === over.id);
      setFunnels(arrayMove(funnels, oldIndex, newIndex));
      return;
    }
    // Reorder groups
    if (active.id.startsWith("g_") && over.id.startsWith("g_")) {
      const fIndex = funnels.findIndex(f => f.id === activeFunnelId);
      const ids = funnels[fIndex].groups.map(g => g.id);
      const oldIndex = ids.indexOf(active.id);
      const newIndex = ids.indexOf(over.id);
      const next = [...funnels];
      next[fIndex] = { ...next[fIndex], groups: arrayMove(next[fIndex].groups, oldIndex, newIndex) };
      setFunnels(next);
      return;
    }
    // Move cards between groups
    if (active.id.startsWith("card_") && over.id?.startsWith("card_")) {
      const fIndex = funnels.findIndex(f => f.id === activeFunnelId);
      const groups = funnels[fIndex].groups;
      const sIndex = groups.findIndex(g => g.cards.some(c => c.id === active.id));
      const dIndex = groups.findIndex(g => g.cards.some(c => c.id === over.id));
      if (sIndex === -1 || dIndex === -1) return;

      // Reorder within the same group
      if (sIndex === dIndex) {
        const ids = groups[sIndex].cards.map(c => c.id);
        const oldIndex = ids.indexOf(active.id);
        const newIndex = ids.indexOf(over.id);
        const next = [...funnels];
        next[fIndex] = {
          ...next[fIndex],
          groups: groups.map((g, i) => i === sIndex ? { ...g, cards: arrayMove(g.cards, oldIndex, newIndex) } : g)
        };
        setFunnels(next);
        return;
      }

      // Move across groups
      const sourceCards = [...groups[sIndex].cards];
      const destCards = [...groups[dIndex].cards];
      const moving = sourceCards.find(c => c.id === active.id)!;
      const overIdx = destCards.findIndex(c => c.id === over.id);
      sourceCards.splice(sourceCards.findIndex(c => c.id === active.id), 1);
      destCards.splice(overIdx, 0, moving);
      const next = [...funnels];
      next[fIndex] = {
        ...next[fIndex],
        groups: groups.map((g, i) => i === sIndex ? { ...g, cards: sourceCards } : i === dIndex ? { ...g, cards: destCards } : g)
      };
      setFunnels(next);
      return;
    }

    // Drop card into a group (empty column or below last card)
    if (active.id.startsWith("card_") && over.id?.startsWith("g_")) {
      const fIndex = funnels.findIndex(f => f.id === activeFunnelId);
      const groups = funnels[fIndex].groups;
      const sIndex = groups.findIndex(g => g.cards.some(c => c.id === active.id));
      const dIndex = groups.findIndex(g => g.id === over.id);
      if (sIndex === -1 || dIndex === -1) return;
      if (sIndex === dIndex) return; // no-op

      const sourceCards = [...groups[sIndex].cards];
      const movingIdx = sourceCards.findIndex(c => c.id === active.id);
      const [moving] = sourceCards.splice(movingIdx, 1);
      const destCards = [...groups[dIndex].cards];
      destCards.push(moving); // append to end

      const next = [...funnels];
      next[fIndex] = {
        ...next[fIndex],
        groups: groups.map((g, i) => i === sIndex ? { ...g, cards: sourceCards } : i === dIndex ? { ...g, cards: destCards } : g)
      };
      setFunnels(next);
      return;
    }
  }

  function moveGroupToFunnel(groupId: string, targetFunnelId: string) {
    if (targetFunnelId === activeFunnelId) return;
    const fIndex = funnels.findIndex(f => f.id === activeFunnelId);
    const gIndex = funnels[fIndex].groups.findIndex(g => g.id === groupId);
    const group = funnels[fIndex].groups[gIndex];
    const next = [...funnels];
    next[fIndex] = { ...next[fIndex], groups: next[fIndex].groups.filter(g => g.id !== groupId) };
    const tIndex = next.findIndex(f => f.id === targetFunnelId);
    next[tIndex] = { ...next[tIndex], groups: [...next[tIndex].groups, group] };
    setFunnels(next);
  }
  function renameGroup(groupId: string) {
    const name = prompt("Rename group to:");
    if (!name) return;
    setFunnels(prev => prev.map(f => f.id !== activeFunnelId ? f : ({ ...f, groups: f.groups.map(g => g.id === groupId ? { ...g, name } : g) })));
  }
  function deleteGroup(groupId: string) {
    if (!confirm("Delete this group? This is a demo; cards will be lost.")) return;
    setFunnels(prev => prev.map(f => f.id !== activeFunnelId ? f : ({ ...f, groups: f.groups.filter(g => g.id !== groupId) })));
  }
  function togglePin(cardId: string) {
    setFunnels(prev => prev.map(f => f.id !== activeFunnelId ? f : ({ ...f, groups: f.groups.map(g => ({ ...g, cards: g.cards.map(c => c.id === cardId ? { ...c, pinned: !c.pinned } : c) })) })));
  }
  function loadMore(groupId: string) {
    setFunnels(prev => prev.map(f => f.id !== activeFunnelId ? f : ({ ...f, groups: f.groups.map(g => g.id === groupId ? { ...g, visibleCount: (g.visibleCount || 3) + 3 } : g) })));
  }

  // addGroup header action removed; Add New Group tile opens the drawer

  function createGroup(params: { name: string; description?: string; mode: 'manual' | 'auto' }) {
    const name = params.name.trim();
    if (!name) return;
    const palette = ["#5b9cf3","#f59f00","#22c55e","#94a3b8","#6366f1","#eab308","#0ea5e9","#10b981"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const newGroup: Group = { id: makeId("g"), name, description: params.description?.trim(), mode: params.mode, color, cards: [], visibleCount: 3 };
    setFunnels(prev => prev.map(f => f.id === activeFunnelId ? { ...f, groups: [...f.groups, newGroup] } : f));
    setAddOpen(false);
  }

  const tableRows: Array<{ group: string; card: Card }> = useMemo(() => {
    const rows: Array<{ group: string; card: Card }> = [];
    filteredGroups.forEach(g => g.cards.forEach(c => rows.push({ group: g.name, card: c })));
    return rows;
  }, [filteredGroups]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="font-semibold">Grow</span>

          {/* Funnels (sortable tabs) */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <SortableContext items={funnels.map(f => f.id)} strategy={horizontalListSortingStrategy}>
              <nav className="flex gap-2">
                {funnels.map(f => (
                  <SortableItem key={f.id} id={f.id}>
                    <button
                      onClick={() => setActiveFunnelId(f.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-sm flex items-center gap-2",
                        activeFunnelId === f.id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                      title="Drag to reorder funnels"
                    >
                      <GripVertical className="h-4 w-4 opacity-60" /> {f.name}
                    </button>
                  </SortableItem>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <div className="relative w-full sm:w-auto">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-slate-400" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by customer or keyword…"
                    className="pl-8 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-200/50"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="absolute right-2 top-2.5">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Status filter pills */}
                <div className="flex items-center gap-1">
                  {(["Open","Assigned","In Progress","Closed","Urgent"] as Status[]).map(s => (
                    <Pill key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)} title={`Filter by ${s}`} />
                  ))}
                  <button onClick={() => setStatusFilter(null)} className="text-xs underline ml-1 text-slate-500">Clear</button>
                </div>

                {/* Theme toggle */}
                <div className="ml-2 flex items-center gap-1">
                  <ThemeButton active={theme === "light"} onClick={() => setTheme("light")} title="Light"><Sun className="h-4 w-4"/></ThemeButton>
                  <ThemeButton active={theme === "dark"} onClick={() => setTheme("dark")} title="Dark"><Moon className="h-4 w-4"/></ThemeButton>
                  <ThemeButton active={theme === "system"} onClick={() => setTheme("system")} title="System"><Monitor className="h-4 w-4"/></ThemeButton>
                </div>

                <button
                  onClick={() => setView(v => v === "kanban" ? "table" : "kanban")}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm hover:border-slate-300 dark:hover:border-slate-600"
                  title="Switch view"
                >
                  {view === "kanban" ? <><LayoutList className="h-4 w-4"/> Table</> : <><LayoutGrid className="h-4 w-4"/> Kanban</>}
                </button>

              </div>

              <DragOverlay>
                {draggingId?.startsWith("f_") && (<div className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm shadow">Moving…</div>)}
              </DragOverlay>
            </SortableContext>
          </DndContext>
        </div>
      </header>

      <main className="p-4">
        {view === "kanban" ? (
          <section className="flex gap-4 items-start overflow-x-auto pb-6">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <SortableContext items={filteredGroups.map(g => g.id)} strategy={horizontalListSortingStrategy}>
                {filteredGroups.map(group => (
                  <SortableItem key={group.id} id={group.id}>
                    <GroupColumn
                      group={group}
                      funnels={funnels}
                      activeFunnelId={activeFunnelId}
                      onLoadMore={() => loadMore(group.id)}
                      onMoveGroup={(toId) => moveGroupToFunnel(group.id, toId)}
                      onRename={() => renameGroup(group.id)}
                      onDelete={() => deleteGroup(group.id)}
                      onOpenCard={(c) => setDetailsCard(c)}
                      onTogglePin={togglePin}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
              {/* Add New Group tile */}
              <button
                onClick={() => setAddOpen(true)}
                className="w-[360px] shrink-0 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 p-4 flex flex-col items-center justify-center gap-2"
                title="Add a new column"
              >
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><span className="text-xl">＋</span></div>
                <div className="font-medium">Add New Group</div>
                <div className="text-xs text-slate-500">Create a column like Cold, Warm…</div>
              </button>
              <DragOverlay>
                {draggingId?.startsWith("g_") && (<div className="rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm">Moving group…</div>)}
                {draggingId?.startsWith("card_") && (<div className="rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm">Moving card…</div>)}
              </DragOverlay>
            </DndContext>
          </section>
        ) : (
          <TableView rows={tableRows} onOpenCard={setDetailsCard} />
        )}
      </main>

      {detailsCard && (<DetailsDrawer card={detailsCard} onClose={() => setDetailsCard(null)} />)}
      {addOpen && (
        <AddGroupDrawer
          onClose={() => setAddOpen(false)}
          onCreate={createGroup}
        />
      )}
    </div>
  );
}

// ---------- UI Bits ----------
const Pill: React.FC<{ label: string; active?: boolean; onClick?: () => void; title?: string }> = ({ label, active, onClick, title }) => (
  <button
    className={cn("text-xs rounded-full border px-2 py-0.5 transition",
      active ? "bg-sky-100 border-sky-300" : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
    )}
    onClick={onClick}
    title={title || label}
  >
    {label}
  </button>
);

const ThemeButton: React.FC<{ active?: boolean; onClick?: () => void; title?: string; children: React.ReactNode }> = ({ active, onClick, title, children }) => (
  <button onClick={onClick} title={title}
    className={cn("p-2 rounded border transition",
      active ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800")}>
    {children}
  </button>
);

// Sortable wrapper
const SortableItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
};

// Group Column
const GroupColumn: React.FC<{
  group: Group;
  funnels: Funnel[];
  activeFunnelId: string;
  onMoveGroup: (toId: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onOpenCard: (c: Card) => void;
  onTogglePin: (id: string) => void;
  onLoadMore: () => void;
}> = ({ group, funnels, activeFunnelId, onMoveGroup, onRename, onDelete, onOpenCard, onTogglePin, onLoadMore }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const showCount = group.visibleCount || 3;
  const visible = group.cards.slice(0, showCount);

  return (
    <div className="w-[360px] shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 relative">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: group.color }} />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex-1">{group.name}</h3>
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{group.cards.length}</span>
          <button className="p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800" title="Group actions" onClick={() => setMenuOpen(v => !v)}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        {menuOpen && (
          <div className="absolute right-3 mt-2 z-10 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <button className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2" onClick={onRename}><Pencil className="h-4 w-4"/>Rename</button>
            <div className="px-3 py-1 text-xs text-slate-500">Move to funnel</div>
            {funnels.filter(f => f.id !== activeFunnelId).map(f => (
              <button key={f.id} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2" onClick={() => onMoveGroup(f.id)}>
                <ArrowRightLeft className="h-4 w-4" />{f.name}
              </button>
            ))}
            <button className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 flex items-center gap-2" onClick={onDelete}><Trash2 className="h-4 w-4"/>Delete</button>
          </div>
        )}
      </div>

      <SortableContext items={group.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="p-3 space-y-3">
          {visible.map(card => (
            <CardItem key={card.id} card={card} onTogglePin={() => onTogglePin(card.id)} onOpen={() => onOpenCard(card)} />
          ))}

          {visible.length === 0 && (<EmptyState />)}

          {group.cards.length > showCount && (
            <button onClick={onLoadMore} className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">Load more</button>
          )}
        </ul>
      </SortableContext>
    </div>
  );
};

// Card Item
const CardItem: React.FC<{ card: Card; onTogglePin: () => void; onOpen: () => void }> = ({ card, onTogglePin, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow transition cursor-grab active:cursor-grabbing">
        <div className="flex items-start gap-2">
          <button className={cn("p-1 rounded", card.pinned ? "text-amber-600" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }} title={card.pinned ? "Unpin" : "Pin to top"}>
            {card.pinned ? <Pin className="h-4 w-4"/> : <PinOff className="h-4 w-4"/>}
          </button>
          <div className="flex-1" onClick={onOpen}>
            <div className="font-medium text-slate-800 dark:text-slate-100">{card.name}</div>
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{card.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Users className="h-3.5 w-3.5 text-slate-400"/>
              <span className="text-xs text-slate-500">{card.minutesAgo}m</span>
              {card.assignee && <span className="text-xs text-slate-700 dark:text-slate-300">• {card.assignee}</span>}
              {card.statuses.map(s => (
                <span key={s} title={`Status: ${s}`} className="text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button className="p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800" title="View details" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <Eye className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </li>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-slate-500 dark:text-slate-400">
    <Search className="h-6 w-6 mb-2" />
    <div className="text-sm font-medium">No results</div>
    <div className="text-xs">Try a different name, keyword, or clear filters.</div>
  </div>
);

const TableView: React.FC<{ rows: Array<{ group: string; card: Card }>; onOpenCard: (c: Card) => void }>
  = ({ rows, onOpenCard }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Group</th>
              <th className="text-left px-4 py-3">Assignee</th>
              <th className="text-left px-4 py-3">Statuses</th>
              <th className="text-left px-4 py-3">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ group, card }) => (
              <tr key={card.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => onOpenCard(card)}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{card.name}</td>
                <td className="px-4 py-3">{group}</td>
                <td className="px-4 py-3">{card.assignee || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {card.statuses.map(s => (<span key={s} className="text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5">{s}</span>))}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{card.minutesAgo}m ago</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No rows match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DetailsDrawer: React.FC<{ card: Card; onClose: () => void }> = ({ card, onClose }) => {
  const [openExtra, setOpenExtra] = useState(true);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <aside className="w-[520px] bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{card.name}</div>
          <button className="p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onClose}><X className="h-5 w-5"/></button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          <InfoTile label="Credit Limit" value="₹ 10,000.00" />
          <InfoTile label="Opening Balance" value="₹ 8,000.33" />
          <InfoTile label="To Receive" value={<span className="text-emerald-600 font-semibold">₹ 9,234.46</span>} />
        </div>

        <div className="px-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="grid grid-cols-2 gap-6 p-4">
              <Field label="Contact Name" value="Gupta Raj" />
              <Field label="Phone No." value="+91 8345678901" />
              <Field label="Email ID" value="guptadistributors@yahoo.com" />
              <Field label="Segments" value="—" />
              <Field label="Routes" value="—" />
              <Field label="Groups" value="—" />
              <Field label="Team Member" value="—" />
              <Field label="CFA's" value="—" />
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800">
              <button className="w-full flex items-center justify-between px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setOpenExtra(v => !v)}>
                <span className="font-medium">Extra Information</span>
                {openExtra ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
              </button>
              {openExtra && (
                <div className="grid grid-cols-2 gap-6 p-4">
                  <Field label="Cust. Code" value="CUS-002" />
                  <Field label="Language" value="English" />
                  <Field label="Source" value="Bulk Upload" />
                  <Field label="WhatsApp Enabled" value="Yes" />
                  <div className="col-span-2 grid grid-cols-2 gap-6">
                    <Field label="Physical Address" value="1234 MG Road, 2nd Floor, Near Central Mall, Ashok Nagar, Bengaluru, Karnataka - 560001 India" />
                    <Field label="Shipping Address" value="1234 MG Road, 2nd Floor, Near Central Mall, Ashok Nagar, Bengaluru, Karnataka - 560001 India" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <span className="font-medium">All Conversations</span>
                <div className="ml-auto flex gap-1">
                  {["All","Open","Assigned","In Progress"].map(s => (<Pill key={s} label={s as any} />))}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="text-sm text-slate-700 dark:text-slate-300">Lorem Ipsum is simply dummy text of the printing and typesetting industry.</div>
                    <div className="mt-2 flex gap-1">
                      {["Open","Urgent"].map(s => (<span key={s} className="text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5">{s}</span>))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

const InfoTile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
    <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-1 text-lg">{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
    <div className="text-sm text-slate-800 dark:text-slate-200">{value}</div>
  </div>
);

// Add Group Drawer
const AddGroupDrawer: React.FC<{ onClose: () => void; onCreate: (p: { name: string; description?: string; mode: 'manual' | 'auto' }) => void }>
  = ({ onClose, onCreate }) => {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [mode, setMode] = React.useState<'manual' | 'auto'>('manual');
  const canCreate = name.trim().length > 0;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <aside className="w-[420px] bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">Add New Group</div>
          <button className="p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onClose}><X className="h-5 w-5"/></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Group Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Cold, Warm"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200/50"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description for this group"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200/50"
            />
          </div>

          <div>
            <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">How are customers added?</div>
            <div className="flex gap-2">
              <label className="flex-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="group-mode"
                  className="accent-blue-600"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                />
                <span className="text-sm">Manually add customers</span>
              </label>
              <label className="flex-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="group-mode"
                  className="accent-blue-600"
                  checked={mode === 'auto'}
                  onChange={() => setMode('auto')}
                />
                <span className="text-sm">Automatically add customers</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button
              disabled={!canCreate}
              onClick={() => canCreate && onCreate({ name, description, mode })}
              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
