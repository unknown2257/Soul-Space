import { useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import {
  Archive,
  Bell,
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  Clipboard,
  Copy,
  Database,
  Download,
  File,
  Film,
  Gift,
  Heart,
  Image,
  LockKeyhole,
  LogOut,
  Mic,
  MicOff,
  MoreVertical,
  Phone,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Smile,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Video,
  VideoOff,
  Volume2,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Member = {
  id: string;
  name: string;
  secretCode: string;
  avatar: string;
  bio: string;
  online: boolean;
  lastSeen: string;
};

type MessageStatus = 'sent' | 'delivered' | 'read';
type MessageKind = 'text' | 'image' | 'video' | 'document' | 'voice' | 'gif' | 'sticker';

type Message = {
  id: string;
  spaceId: string;
  senderId: string;
  content: string;
  kind: MessageKind;
  createdAt: string;
  editedAt?: string;
  status: MessageStatus;
  replyTo?: string;
  pinned?: boolean;
  starred?: boolean;
  deletedForEveryone?: boolean;
  attachments?: Attachment[];
};

type Attachment = {
  id: string;
  name: string;
  type: MessageKind;
  url: string;
  size: string;
};

type CallLog = {
  id: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  startedAt: string;
  duration: string;
};

type Space = {
  id: string;
  name: string;
  ownerEmail: string;
  members: [Member, Member];
  status: 'active' | 'disabled';
  createdAt: string;
  lastLogin?: string;
  storageUsageMb: number;
};

type Session = {
  spaceId: string;
  memberId: string;
};

type AdminSession = {
  email: string;
};

type View = 'home' | 'chat' | 'profile' | 'settings' | 'admin';
type CallState = null | {
  type: 'voice' | 'video';
  phase: 'outgoing' | 'incoming' | 'connected' | 'reconnecting';
  muted: boolean;
  cameraOff: boolean;
  speaker: boolean;
  seconds: number;
};

const ADMIN_EMAIL = 'admin@soulspace.app';
const ADMIN_CODE = 'SOULSPACE-ADMIN';
const LOCAL_KEY = 'soulspace-demo-state-v1';
const SESSION_KEY = 'soulspace-session-v1';
const ADMIN_SESSION_KEY = 'soulspace-admin-session-v1';

const nowIso = () => new Date().toISOString();
const humanTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const humanDate = (iso: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

const defaultSpaces: Space[] = [
  {
    id: 'space_demo',
    name: 'Adrija ❤️ Ayyan',
    ownerEmail: 'example@gmail.com',
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(),
    lastLogin: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    storageUsageMb: 184,
    members: [
      {
        id: 'm_adrija',
        name: 'Adrija',
        secretCode: 'ADR458X',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
        bio: 'A quiet corner for memories, voice notes, plans, and little everyday magic.',
        online: true,
        lastSeen: 'Online now',
      },
      {
        id: 'm_ayyan',
        name: 'Ayyan',
        secretCode: 'AYN792K',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
        bio: 'Always one tap away inside our private SoulSpace.',
        online: false,
        lastSeen: 'Last seen today at 8:42 PM',
      },
    ],
  },
];

const defaultMessages: Message[] = [
  {
    id: 'msg_1',
    spaceId: 'space_demo',
    senderId: 'm_adrija',
    content: 'Welcome to our private SoulSpace ✨',
    kind: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: 'read',
    pinned: true,
  },
  {
    id: 'msg_2',
    spaceId: 'space_demo',
    senderId: 'm_ayyan',
    content: 'Everything here is just for us. No groups, no discovery, no noise.',
    kind: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3.8).toISOString(),
    status: 'read',
  },
  {
    id: 'msg_3',
    spaceId: 'space_demo',
    senderId: 'm_adrija',
    content: 'Shared a memory from the gallery',
    kind: 'image',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.2).toISOString(),
    status: 'delivered',
    attachments: [{ id: 'att_1', name: 'purple-evening.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80', size: '1.8 MB' }],
  },
  {
    id: 'msg_4',
    spaceId: 'space_demo',
    senderId: 'm_ayyan',
    content: 'Voice note · 0:18',
    kind: 'voice',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    status: 'read',
  },
];

const defaultCalls: CallLog[] = [
  { id: 'call_1', type: 'voice', direction: 'outgoing', startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), duration: '12:44' },
  { id: 'call_2', type: 'video', direction: 'missed', startedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), duration: '0:00' },
];

function readState() {
  const fallback = { spaces: defaultSpaces, messages: defaultMessages, calls: defaultCalls };
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? (JSON.parse(saved) as typeof fallback) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [spaces, setSpaces] = useState<Space[]>(() => readState().spaces);
  const [messages, setMessages] = useState<Message[]>(() => readState().messages);
  const [calls, setCalls] = useState<CallLog[]>(() => readState().calls);
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'));
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || 'null'));
  const [view, setView] = useState<View>(adminSession ? 'admin' : 'home');
  const [call, setCall] = useState<CallState>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ spaces, messages, calls }));
  }, [spaces, messages, calls]);

  useEffect(() => {
    if (!supabase || !session) return;
    const channel = supabase
      .channel(`space:${session.spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `space_id=eq.${session.spaceId}` }, () => undefined)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    if (!call || call.phase !== 'connected') return;
    const timer = window.setInterval(() => setCall((active) => (active ? { ...active, seconds: active.seconds + 1 } : active)), 1000);
    return () => window.clearInterval(timer);
  }, [call?.phase]);

  const activeSpace = useMemo(() => spaces.find((space) => space.id === session?.spaceId) ?? null, [spaces, session]);
  const currentMember = activeSpace?.members.find((member) => member.id === session?.memberId) ?? null;
  const partner = activeSpace?.members.find((member) => member.id !== session?.memberId) ?? null;

  const login = (name: string, secretCode: string) => {
    const normalizedName = name.trim().toLowerCase();
    const normalizedCode = secretCode.trim();
    const matched = spaces.flatMap((space) => space.members.map((member) => ({ space, member }))).find(({ space, member }) => space.status === 'active' && member.name.toLowerCase() === normalizedName && member.secretCode === normalizedCode);
    if (!matched) return false;
    const nextSession = { spaceId: matched.space.id, memberId: matched.member.id };
    setSession(nextSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setView('home');
    setSpaces((items) => items.map((space) => (space.id === matched.space.id ? { ...space, lastLogin: nowIso(), members: space.members.map((member) => (member.id === matched.member.id ? { ...member, online: true, lastSeen: 'Online now' } : member)) as [Member, Member] } : space)));
    return true;
  };

  const adminLogin = (email: string, code: string) => {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || code.trim() !== ADMIN_CODE) return false;
    const next = { email };
    setAdminSession(next);
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(next));
    setView('admin');
    return true;
  };

  const logout = () => {
    if (session) {
      setSpaces((items) => items.map((space) => (space.id === session.spaceId ? { ...space, members: space.members.map((member) => (member.id === session.memberId ? { ...member, online: false, lastSeen: `Last seen ${humanTime(nowIso())}` } : member)) as [Member, Member] } : space)));
    }
    setSession(null);
    setAdminSession(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setView('home');
  };

  const clearSpace = () => {
    if (!activeSpace) return;
    setMessages((items) => items.filter((message) => message.spaceId !== activeSpace.id));
    setCalls([]);
    setSpaces((items) => items.map((space) => (space.id === activeSpace.id ? { ...space, storageUsageMb: 0, members: space.members.map((member) => ({ ...member, bio: '', avatar: member.avatar })) as [Member, Member] } : space)));
  };

  const sendMessage = (content: string, kind: MessageKind = 'text', attachments?: Attachment[], replyTo?: string) => {
    if (!session || !content.trim()) return;
    const newMessage: Message = {
      id: uid('msg'),
      spaceId: session.spaceId,
      senderId: session.memberId,
      content,
      kind,
      attachments,
      replyTo,
      createdAt: nowIso(),
      status: 'sent',
    };
    setMessages((items) => [...items, newMessage]);
    window.setTimeout(() => setMessages((items) => items.map((message) => (message.id === newMessage.id ? { ...message, status: 'delivered' } : message))), 700);
    window.setTimeout(() => setMessages((items) => items.map((message) => (message.id === newMessage.id ? { ...message, status: 'read' } : message))), 1800);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SoulSpace', { body: `Message sent in ${activeSpace?.name ?? 'your private space'}` });
    }
  };

  const startCall = (type: 'voice' | 'video') => {
    setCall({ type, phase: 'outgoing', muted: false, cameraOff: false, speaker: true, seconds: 0 });
    setCalls((items) => [{ id: uid('call'), type, direction: 'outgoing', startedAt: nowIso(), duration: 'Ringing' }, ...items]);
    window.setTimeout(() => setCall((active) => (active ? { ...active, phase: 'connected' } : active)), 1400);
  };

  if (adminSession && view === 'admin') {
    return <AdminDashboard spaces={spaces} messages={messages} calls={calls} onLogout={logout} onSpacesChange={setSpaces} onMessagesChange={setMessages} />;
  }

  if (!session || !activeSpace || !currentMember || !partner) {
    return <LoginScreen onLogin={login} onAdminLogin={adminLogin} />;
  }

  return (
    <div className="min-h-screen bg-obsidian text-white">
      <Aurora />
      {view === 'home' && <HomeScreen space={activeSpace} currentMember={currentMember} partner={partner} onOpenChat={() => setView('chat')} onOpenSettings={() => setView('settings')} />}
      {view === 'chat' && <ChatScreen space={activeSpace} currentMember={currentMember} partner={partner} messages={messages.filter((message) => message.spaceId === activeSpace.id)} onBack={() => setView('home')} onProfile={() => setView('profile')} onSend={sendMessage} onMessagesChange={setMessages} onCall={startCall} />}
      {view === 'profile' && <ProfileScreen space={activeSpace} currentMember={currentMember} partner={partner} messages={messages.filter((message) => message.spaceId === activeSpace.id)} calls={calls} onBack={() => setView('chat')} onSpacesChange={setSpaces} />}
      {view === 'settings' && <SettingsScreen space={activeSpace} currentMember={currentMember} onBack={() => setView('home')} onLogout={logout} onClear={clearSpace} onSpacesChange={setSpaces} />}
      {call && <CallOverlay call={call} partner={partner} onChange={setCall} onEnd={() => setCall(null)} />}
    </div>
  );
}

function Aurora() {
  return <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-amethyst/30 blur-3xl" /><div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" /></div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="relative mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6">{children}</main>;
}

function LoginScreen({ onLogin, onAdminLogin }: { onLogin: (name: string, code: string) => boolean; onAdminLogin: (email: string, code: string) => boolean }) {
  const [name, setName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    const ok = adminMode ? onAdminLogin(name, secretCode) : onLogin(name, secretCode);
    setError(ok ? '' : adminMode ? 'Invalid administrator credentials.' : 'No active private space found for this name and secret code.');
  };

  return (
    <div className="min-h-screen bg-obsidian text-white">
      <Aurora />
      <Shell>
        <div className="flex min-h-[calc(100vh-3rem)] flex-col justify-center gap-8">
          <section className="glass mx-auto w-full max-w-md rounded-[2rem] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amethyst/25 shadow-glow"><Heart className="text-fuchsia-200" /></div>
              <p className="text-sm uppercase tracking-[0.42em] text-silver/70">SoulSpace</p>
              <h1 className="mt-3 text-4xl font-semibold">Enter your private space</h1>
              <p className="mt-3 text-sm text-silver">No signup. No registration. Only administrator-issued Name + Secret Code access.</p>
            </div>
            <div className="space-y-4">
              <label className="block text-sm text-silver">{adminMode ? 'Admin Email' : 'Name'}<input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none ring-amethyst/40 transition focus:ring-4" value={name} onChange={(event) => setName(event.target.value)} placeholder={adminMode ? ADMIN_EMAIL : 'Adrija'} /></label>
              <label className="block text-sm text-silver">Secret Code<input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none ring-amethyst/40 transition focus:ring-4" value={secretCode} onChange={(event) => setSecretCode(event.target.value)} placeholder={adminMode ? ADMIN_CODE : 'ADR458X'} type="password" onKeyDown={(event) => event.key === 'Enter' && submit()} /></label>
              {error && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
              <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amethyst to-fuchsia-500 px-5 py-3 font-semibold shadow-glow transition hover:scale-[1.01]"><LockKeyhole size={18} />{adminMode ? 'Enter Admin Dashboard' : 'Enter Space'}</button>
            </div>
            <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-4 text-center text-sm text-silver">
              <p className="font-medium text-white">Request Admin For Private Space</p>
              <p className="mt-2">Email: <a className="text-fuchsia-200" href="mailto:unknowntdevil@gmail.com">unknowntdevil@gmail.com</a></p>
              <p>Telegram: <a className="text-fuchsia-200" href="#telegram-placeholder">Add Telegram Link Placeholder</a></p>
            </div>
            <button className="mt-4 w-full text-xs uppercase tracking-[0.28em] text-silver/60" onClick={() => { setAdminMode((value) => !value); setError(''); }}>{adminMode ? 'Member Login' : 'Hidden Admin Access'}</button>
          </section>
          <p className="mx-auto max-w-xl text-center text-xs text-silver/60">Demo credentials: Adrija / ADR458X, Ayyan / AYN792K. Admin: {ADMIN_EMAIL} / {ADMIN_CODE}. {isSupabaseConfigured ? 'Supabase connected.' : 'Supabase env vars not configured; local persistence demo mode active.'}</p>
        </div>
      </Shell>
    </div>
  );
}

function HomeScreen({ space, currentMember, partner, onOpenChat, onOpenSettings }: { space: Space; currentMember: Member; partner: Member; onOpenChat: () => void; onOpenSettings: () => void }) {
  return <Shell><header className="flex items-center justify-between py-3"><div><p className="text-sm uppercase tracking-[0.35em] text-silver/60">Private Space</p><h1 className="text-2xl font-semibold">{space.name}</h1></div><button onClick={onOpenSettings} className="rounded-2xl border border-white/10 bg-white/5 p-3"><Settings /></button></header><section className="mt-10"><p className="mb-4 text-silver">Welcome back, {currentMember.name}. Only your partner is visible here.</p><button onClick={onOpenChat} className="glass float-soft w-full rounded-[2rem] p-5 text-left transition hover:scale-[1.01]"><div className="flex items-center gap-4"><img className="h-24 w-24 rounded-[2rem] object-cover ring-2 ring-fuchsia-200/40" src={partner.avatar} alt={partner.name} /><div className="min-w-0 flex-1"><h2 className="text-3xl font-semibold">{partner.name}</h2><p className={partner.online ? 'mt-1 text-emerald-300' : 'mt-1 text-silver'}>{partner.online ? 'Online' : partner.lastSeen}</p><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amethyst/20 px-4 py-2 text-sm text-fuchsia-100"><Sparkles size={16} />Tap To Chat</p></div></div></button></section></Shell>;
}

function ChatScreen({ space, currentMember, partner, messages, onBack, onProfile, onSend, onMessagesChange, onCall }: { space: Space; currentMember: Member; partner: Member; messages: Message[]; onBack: () => void; onProfile: () => void; onSend: (content: string, kind?: MessageKind, attachments?: Attachment[], replyTo?: string) => void; onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>; onCall: (type: 'voice' | 'video') => void }) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const filtered = messages.filter((message) => message.content.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length]);
  useEffect(() => { if (!draft) return setTyping(false); setTyping(true); const t = window.setTimeout(() => setTyping(false), 900); return () => window.clearTimeout(t); }, [draft]);

  const submit = () => { onSend(draft, 'text', undefined, replyTo?.id); setDraft(''); setReplyTo(null); };
  const attach = (kind: MessageKind) => {
    const attachment = { id: uid('att'), name: `${kind}-sample.${kind === 'document' ? 'pdf' : 'media'}`, type: kind, url: kind === 'image' ? 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=900&q=80' : '#', size: kind === 'document' ? '426 KB' : '2.4 MB' };
    onSend(kind === 'document' ? 'Shared a PDF document' : kind === 'voice' ? 'Voice note · 0:09' : `Shared ${kind}`, kind, [attachment]);
  };

  return <div className="relative flex h-screen flex-col bg-obsidian"><header className="glass z-10 rounded-b-[2rem] px-4 py-3"><div className="mx-auto flex max-w-5xl items-center gap-3"><button onClick={onBack} className="rounded-full p-2"><ChevronLeft /></button><button onClick={onProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left"><img src={partner.avatar} alt={partner.name} className="h-12 w-12 rounded-2xl object-cover" /><span className="min-w-0"><span className="block truncate font-semibold">{partner.name}</span><span className="block text-xs text-emerald-300">{typing ? 'Typing...' : partner.online ? 'Online' : partner.lastSeen}</span></span></button><button onClick={() => onCall('voice')} className="rounded-2xl bg-white/5 p-3"><Phone size={19} /></button><button onClick={() => onCall('video')} className="rounded-2xl bg-white/5 p-3"><Video size={19} /></button><button onClick={onProfile} className="rounded-2xl bg-white/5 p-3"><User size={19} /></button></div><div className="mx-auto mt-3 flex max-w-5xl items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"><Search size={16} className="text-silver" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" className="w-full bg-transparent text-sm outline-none" /></div></header><main className="no-scrollbar mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-5"><DateSeparator iso={messages[0]?.createdAt ?? nowIso()} />{filtered.map((message) => <MessageBubble key={message.id} message={message} mine={message.senderId === currentMember.id} original={messages.find((item) => item.id === message.replyTo)} onReply={() => setReplyTo(message)} onUpdate={(next) => onMessagesChange((items) => items.map((item) => (item.id === message.id ? next : item)))} />)}<div ref={bottomRef} /></main><footer className="glass rounded-t-[2rem] px-4 py-3"><div className="mx-auto max-w-5xl">{replyTo && <div className="mb-2 flex items-center justify-between rounded-2xl border border-amethyst/30 bg-amethyst/10 px-3 py-2 text-sm"><span>Replying to: {replyTo.content}</span><button onClick={() => setReplyTo(null)}><X size={16} /></button></div>}<div className="mb-2 flex gap-2 overflow-x-auto pb-1"><Tool icon={<Smile />} label="Emoji" onClick={() => setDraft((text) => `${text} 😊`)} /><Tool icon={<Gift />} label="GIF" onClick={() => attach('gif')} /><Tool icon={<Image />} label="Image" onClick={() => attach('image')} /><Tool icon={<Film />} label="Video" onClick={() => attach('video')} /><Tool icon={<File />} label="PDF" onClick={() => attach('document')} /><Tool icon={<Mic />} label="Voice" onClick={() => attach('voice')} /></div><div className="flex items-end gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message privately..." rows={1} className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" /><button onClick={submit} disabled={!draft.trim()} className="rounded-2xl bg-gradient-to-r from-amethyst to-fuchsia-500 p-4 disabled:opacity-40"><Send size={20} /></button></div></div></footer></div>;
}

function Tool({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-silver">{icon}{label}</button>; }
function DateSeparator({ iso }: { iso: string }) { return <div className="my-2 text-center text-xs text-silver"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{humanDate(iso)}</span></div>; }

function MessageBubble({ message, mine, original, onReply, onUpdate }: { message: Message; mine: boolean; original?: Message; onReply: () => void; onUpdate: (message: Message) => void }) {
  const [menu, setMenu] = useState(false);
  const statusIcon = message.status === 'read' ? <CheckCheck size={14} className="text-sky-300" /> : message.status === 'delivered' ? <CheckCheck size={14} /> : <Check size={14} />;
  return <div className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[84%] rounded-[1.5rem] p-3 shadow-lg ${mine ? 'rounded-br-md bg-gradient-to-br from-amethyst to-fuchsia-600' : 'rounded-bl-md bg-white/10'}`}>{original && <div className="mb-2 rounded-xl border-l-2 border-fuchsia-200 bg-black/20 px-3 py-2 text-xs opacity-80">{original.content}</div>}{message.deletedForEveryone ? <p className="italic text-silver">This message was deleted</p> : <MessageContent message={message} />}{message.pinned && <span className="mt-2 inline-flex items-center gap-1 text-xs text-fuchsia-100"><Pin size={12} />Pinned</span>}{message.starred && <span className="ml-2 mt-2 inline-flex items-center gap-1 text-xs text-amber-100"><Star size={12} />Starred</span>}<div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-white/70"><span>{humanTime(message.createdAt)}{message.editedAt ? ' · edited' : ''}</span>{mine && statusIcon}<button onClick={() => setMenu((value) => !value)}><MoreVertical size={14} /></button></div>{menu && <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><Action icon={<Copy size={13} />} label="Copy" onClick={() => navigator.clipboard?.writeText(message.content)} /><Action icon={<Clipboard size={13} />} label="Reply" onClick={onReply} /><Action icon={<Star size={13} />} label="Star" onClick={() => onUpdate({ ...message, starred: !message.starred })} /><Action icon={<Pin size={13} />} label="Pin" onClick={() => onUpdate({ ...message, pinned: !message.pinned })} /><Action icon={<Send size={13} />} label="Forward" onClick={() => alert('Forward is limited to this two-member private space.')} /><Action icon={<Trash2 size={13} />} label="Delete all" onClick={() => onUpdate({ ...message, deletedForEveryone: true })} /></div>}</div></div>;
}
function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center gap-1 rounded-xl bg-black/20 px-2 py-1">{icon}{label}</button>; }
function MessageContent({ message }: { message: Message }) { if (message.attachments?.[0]?.type === 'image') return <div><img src={message.attachments[0].url} alt={message.attachments[0].name} className="mb-2 max-h-72 rounded-2xl object-cover" /><p>{message.content}</p></div>; if (message.kind === 'voice') return <div className="flex items-center gap-3"><button className="rounded-full bg-white/20 p-2"><Play size={16} /></button><div className="h-2 w-36 rounded-full bg-white/25"><div className="h-2 w-1/2 rounded-full bg-white" /></div><span className="text-sm">0:18</span></div>; if (message.kind === 'document') return <div className="flex items-center gap-3"><File /><span>{message.attachments?.[0]?.name ?? message.content}</span></div>; if (message.content.includes('http')) return <div><p>{message.content}</p><div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">Link preview generated securely for this private space.</div></div>; return <p className="whitespace-pre-wrap">{message.content}</p>; }

function ProfileScreen({ space, currentMember, partner, messages, calls, onBack, onSpacesChange }: { space: Space; currentMember: Member; partner: Member; messages: Message[]; calls: CallLog[]; onBack: () => void; onSpacesChange: React.Dispatch<React.SetStateAction<Space[]>> }) {
  const [bio, setBio] = useState(currentMember.bio);
  const media = messages.flatMap((message) => message.attachments ?? []).filter((attachment) => ['image', 'video', 'gif'].includes(attachment.type));
  const docs = messages.flatMap((message) => message.attachments ?? []).filter((attachment) => attachment.type === 'document');
  const save = () => onSpacesChange((items) => items.map((item) => item.id === space.id ? { ...item, members: item.members.map((member) => member.id === currentMember.id ? { ...member, bio } : member) as [Member, Member] } : item));
  return <Shell><button onClick={onBack} className="mb-5 flex items-center gap-2 text-silver"><ChevronLeft />Back to chat</button><section className="glass rounded-[2rem] p-6 text-center"><img src={partner.avatar} alt={partner.name} className="mx-auto h-28 w-28 rounded-[2rem] object-cover" /><h1 className="mt-4 text-3xl font-semibold">{partner.name}</h1><p className="text-emerald-300">{partner.online ? 'Online' : partner.lastSeen}</p><p className="mx-auto mt-4 max-w-md text-silver">{partner.bio}</p></section><div className="mt-5 grid gap-4 md:grid-cols-2"><Panel title="Shared Media" icon={<Image />}>{media.length ? media.map((item) => <GalleryItem key={item.id} item={item} />) : <Empty text="No shared media yet." />}</Panel><Panel title="Shared Files" icon={<File />}>{docs.length ? docs.map((item) => <GalleryItem key={item.id} item={item} />) : <Empty text="No shared files yet." />}</Panel><Panel title="Call History" icon={<Phone />}>{calls.map((call) => <div key={call.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3"><span>{call.type} · {call.direction}</span><span className="text-silver">{call.duration}</span></div>)}</Panel><Panel title="Theme & Profile Preferences" icon={<Sparkles />}><textarea value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 p-3 outline-none" /><button onClick={save} className="mt-3 rounded-2xl bg-amethyst px-4 py-2">Save Permanently</button></Panel></div></Shell>;
}
function GalleryItem({ item }: { item: Attachment }) { return <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3"><span className="truncate">{item.name}</span><span className="text-xs text-silver">{item.size}</span></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl bg-white/5 p-4 text-silver">{text}</p>; }
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="glass rounded-[2rem] p-5"><h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">{icon}{title}</h2><div className="space-y-2">{children}</div></section>; }

function SettingsScreen({ space, currentMember, onBack, onLogout, onClear, onSpacesChange }: { space: Space; currentMember: Member; onBack: () => void; onLogout: () => void; onClear: () => void; onSpacesChange: React.Dispatch<React.SetStateAction<Space[]>> }) {
  const [name, setName] = useState(currentMember.name);
  const [theme, setTheme] = useState('Premium Dark · Deep Purple · Silver Accent');
  const [confirm, setConfirm] = useState('');
  const save = () => onSpacesChange((items) => items.map((item) => item.id === space.id ? { ...item, members: item.members.map((member) => member.id === currentMember.id ? { ...member, name } : member) as [Member, Member] } : item));
  return <Shell><button onClick={onBack} className="mb-5 flex items-center gap-2 text-silver"><ChevronLeft />Home</button><div className="grid gap-4 md:grid-cols-2"><Panel title="Profile Settings" icon={<User />}><input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 p-3" /><button onClick={save} className="rounded-2xl bg-amethyst px-4 py-2">Save</button></Panel><Panel title="Theme Settings" icon={<Sparkles />}><select value={theme} onChange={(event) => setTheme(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 p-3"><option>Premium Dark · Deep Purple · Silver Accent</option><option>Midnight Black · Amethyst Glow</option></select></Panel><Panel title="Notification Settings" icon={<Bell />}><button onClick={() => Notification.requestPermission?.()} className="rounded-2xl bg-white/10 px-4 py-2">Enable Browser, Push & Mobile Notifications</button><p className="text-sm text-silver">New message, media, voice/video call, and missed call notifications are supported.</p></Panel><Panel title="Storage Information" icon={<Database />}><p>{space.storageUsageMb} MB used by messages, media, files, profiles, call logs, settings and backups.</p></Panel><Panel title="Logout" icon={<LogOut />}><button onClick={onLogout} className="rounded-2xl bg-white/10 px-4 py-2">Logout</button></Panel><Panel title="Clear Everything" icon={<Trash2 />}><p className="text-rose-100">This action will permanently delete all messages, media, files, profile data and chat history.</p><input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type DELETE SPACE" className="w-full rounded-2xl border border-rose-400/30 bg-black/30 p-3" /><button disabled={confirm !== 'DELETE SPACE'} onClick={onClear} className="rounded-2xl bg-rose-600 px-4 py-2 disabled:opacity-40">Delete Private Space Data</button></Panel></div></Shell>;
}

function CallOverlay({ call, partner, onChange, onEnd }: { call: NonNullable<CallState>; partner: Member; onChange: React.Dispatch<React.SetStateAction<CallState>>; onEnd: () => void }) {
  const mm = String(Math.floor(call.seconds / 60)).padStart(2, '0');
  const ss = String(call.seconds % 60).padStart(2, '0');
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><div className="glass w-full max-w-md rounded-[2rem] p-6 text-center"><p className="text-sm uppercase tracking-[0.3em] text-silver">{call.type} call · {call.phase}</p>{call.type === 'video' && !call.cameraOff ? <div className="relative my-5 h-72 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violetDeep to-black"><img src={partner.avatar} alt="video" className="h-full w-full object-cover opacity-70" /><div className="absolute bottom-4 right-4 h-24 w-16 rounded-2xl border border-white/30 bg-black/60" /></div> : <img src={partner.avatar} alt={partner.name} className="mx-auto my-6 h-28 w-28 rounded-[2rem] object-cover" />}<h2 className="text-3xl font-semibold">{partner.name}</h2><p className="mt-1 text-silver">{call.phase === 'connected' ? `${mm}:${ss}` : call.phase === 'outgoing' ? 'Ringing...' : 'Reconnecting securely...'}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => onChange((active) => active && { ...active, muted: !active.muted })} className="rounded-2xl bg-white/10 p-4">{call.muted ? <MicOff /> : <Mic />}</button><button onClick={() => onChange((active) => active && { ...active, speaker: !active.speaker })} className="rounded-2xl bg-white/10 p-4"><Volume2 /></button>{call.type === 'video' && <><button onClick={() => onChange((active) => active && { ...active, cameraOff: !active.cameraOff })} className="rounded-2xl bg-white/10 p-4">{call.cameraOff ? <VideoOff /> : <Camera />}</button><button className="rounded-2xl bg-white/10 p-4"><RefreshCw /></button></>}<button onClick={onEnd} className="rounded-2xl bg-rose-600 p-4"><Phone /></button></div></div></div>;
}

function AdminDashboard({ spaces, messages, calls, onLogout, onSpacesChange, onMessagesChange }: { spaces: Space[]; messages: Message[]; calls: CallLog[]; onLogout: () => void; onSpacesChange: React.Dispatch<React.SetStateAction<Space[]>>; onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>> }) {
  const [form, setForm] = useState({ spaceName: '', ownerEmail: '', member1Name: '', member1SecretCode: '', member2Name: '', member2SecretCode: '' });
  const createSpace = () => {
    if (!form.spaceName || !form.member1Name || !form.member2Name) return;
    const space: Space = { id: uid('space'), name: form.spaceName, ownerEmail: form.ownerEmail, status: 'active', createdAt: nowIso(), storageUsageMb: 0, members: [{ id: uid('member'), name: form.member1Name, secretCode: form.member1SecretCode, avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(form.member1Name)}`, bio: '', online: false, lastSeen: 'Never logged in' }, { id: uid('member'), name: form.member2Name, secretCode: form.member2SecretCode, avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(form.member2Name)}`, bio: '', online: false, lastSeen: 'Never logged in' }] };
    onSpacesChange((items) => [space, ...items]);
    setForm({ spaceName: '', ownerEmail: '', member1Name: '', member1SecretCode: '', member2Name: '', member2SecretCode: '' });
  };
  const backup = JSON.stringify({ spaces, messages, calls }, null, 2);
  return <div className="min-h-screen bg-obsidian text-white"><Aurora /><Shell><header className="flex items-center justify-between"><div><p className="text-sm uppercase tracking-[0.35em] text-silver/60">Secure Admin</p><h1 className="text-3xl font-semibold">SoulSpace Dashboard</h1></div><button onClick={onLogout} className="rounded-2xl bg-white/10 px-4 py-2">Logout</button></header><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Total Spaces" value={spaces.length} /><Stat label="Total Users" value={spaces.length * 2} /><Stat label="Active Spaces" value={spaces.filter((space) => space.status === 'active').length} /><Stat label="Storage Usage" value={`${spaces.reduce((sum, space) => sum + space.storageUsageMb, 0)} MB`} /></div><div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]"><Panel title="Create Space" icon={<Plus />}>{(['spaceName','ownerEmail','member1Name','member1SecretCode','member2Name','member2SecretCode'] as const).map((key) => <input key={key} value={form[key]} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} placeholder={key.replace(/([A-Z])/g, ' $1')} className="w-full rounded-2xl border border-white/10 bg-black/30 p-3" />)}<button onClick={createSpace} className="rounded-2xl bg-gradient-to-r from-amethyst to-fuchsia-500 px-4 py-3 font-semibold">Create Two-Member Space</button></Panel><Panel title="Space Management" icon={<Shield />}>{spaces.map((space) => <div key={space.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{space.name}</h3><p className="text-sm text-silver">{space.ownerEmail} · {space.members.map((member) => `${member.name} (${member.secretCode})`).join(' / ')}</p><p className="text-xs text-silver">Created {humanDate(space.createdAt)} · Last Login {space.lastLogin ? humanTime(space.lastLogin) : 'Never'} · {space.storageUsageMb} MB</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">{space.status}</span></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => onSpacesChange((items) => items.map((item) => item.id === space.id ? { ...item, status: item.status === 'active' ? 'disabled' : 'active' } : item))} className="rounded-xl bg-white/10 px-3 py-2 text-xs">Disable/Edit Status</button><button onClick={() => onSpacesChange((items) => items.map((item) => item.id === space.id ? { ...item, members: item.members.map((member) => ({ ...member, secretCode: Math.random().toString(36).slice(2, 9).toUpperCase() })) as [Member, Member] } : item))} className="rounded-xl bg-white/10 px-3 py-2 text-xs">Reset Secret Codes</button><button onClick={() => onSpacesChange((items) => items.filter((item) => item.id !== space.id))} className="rounded-xl bg-rose-600 px-3 py-2 text-xs">Delete Space</button></div></div>)}</Panel><Panel title="Admin Data Access" icon={<Archive />}><p className="text-silver">Messages: {messages.length}; Media: {messages.filter((m) => m.attachments?.length).length}; Voice Notes: {messages.filter((m) => m.kind === 'voice').length}; Call Logs: {calls.length}; Profiles: {spaces.length * 2}; Backups: local export ready.</p><button onClick={() => onMessagesChange([])} className="rounded-2xl bg-white/10 px-4 py-2">Clear All Messages</button></Panel><Panel title="Backup System" icon={<Download />}><a className="inline-flex items-center gap-2 rounded-2xl bg-amethyst px-4 py-2" href={`data:application/json;charset=utf-8,${encodeURIComponent(backup)}`} download="soulspace-backup.json"><Download size={16} />Download Backup</a><button className="ml-2 rounded-2xl bg-white/10 px-4 py-2"><Upload size={16} className="inline" /> Restore Backup</button><p className="text-sm text-silver">Create, download, restore, export, and delete backups are modeled here and backed by the Supabase backups table in production.</p></Panel></div></Shell></div>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="glass rounded-3xl p-4"><p className="text-sm text-silver">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>; }

export default App;
