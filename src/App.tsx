import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Bell, Bookmark, BrainCircuit, Check, ChevronDown, Code2,
  Compass, Cpu, FolderKanban, Github, Globe2, Heart, LogIn, Menu, Plus,
  Rocket, Search, ShieldCheck, Sparkles, Users, X, Zap
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';

type Project = {
  id: string; title: string; description: string; category: string;
  technologies: string[]; url?: string; owner_name: string; owner_id?: string;
  created_at?: string;
};
type Profile = { id: string; full_name: string; avatar_url?: string; role?: string };

const demoProjects: Project[] = [
  { id:'demo-1', title:'Neural Study Companion', description:'An AI study companion that turns notes into revision plans and practice questions.', category:'AI & Machine Learning', technologies:['Python','AI','Education'], owner_name:'Community project' },
  { id:'demo-2', title:'Autonomous Rover', description:'A small robotics project exploring object detection and navigation.', category:'Robotics & Hardware', technologies:['ROS','C++','Robotics'], owner_name:'Community project' },
  { id:'demo-3', title:'Secure Notes', description:'A privacy-first notes app prototype with a focus on safe data handling.', category:'Software & Open Source', technologies:['React','TypeScript','Security'], owner_name:'Community project' },
  { id:'demo-4', title:'Open Finance Dashboard', description:'A dashboard concept for visualising personal finance data and trends.', category:'Web & Apps', technologies:['Charts','Web','Data'], owner_name:'Community project' }
];

const categories = [
  { name:'AI & Machine Learning', detail:'Models, experiments, intelligent apps', icon:BrainCircuit },
  { name:'Software & Open Source', detail:'Developer tools and applications', icon:Code2 },
  { name:'Robotics & Hardware', detail:'Prototypes and engineering', icon:Cpu },
  { name:'Collaboration', detail:'Find people to build with', icon:Users }
];

function WhyroMark({ size=34 }: {size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-label="WHYRO logo" role="img">
    <defs><linearGradient id="whyro-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8affd8"/><stop offset="1" stopColor="#00b889"/></linearGradient></defs>
    <path d="M7 20h18l11 35 14-25 14 25 11-35h18L77 81H60L50 61 39 81H22z" fill="url(#whyro-gradient)"/>
  </svg>;
}

export default function App() {
  const [boot, setBoot] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All projects');
  const [modal, setModal] = useState<'project'|'contributor'|null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectForm, setProjectForm] = useState({title:'',description:'',category:'AI & Machine Learning',technologies:'',url:''});
  const [contributorForm, setContributorForm] = useState({name:'',email:'',area:'AI & Machine Learning',message:''});

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setBoot(false), reducedMotion ? 0 : 1450);
    if (supabase) {
      supabase.auth.getSession().then(({data}) => setSession(data.session));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
        if (next?.user) setProfile({
          id: next.user.id,
          full_name: next.user.user_metadata?.full_name || next.user.user_metadata?.name || next.user.email || 'WHYRO member',
          avatar_url: next.user.user_metadata?.avatar_url,
        });
        else setProfile(null);
      });
      return () => { window.clearTimeout(timer); listener.subscription.unsubscribe(); };
    }
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    async function load() {
      const { data } = await supabase!.from('projects').select('id,title,description,category,technologies,url,owner_id,created_at,profiles(full_name)').eq('status','published').order('created_at',{ascending:false}).limit(60);
      if (alive && data) {
        const rows = data as any[];
        setProjects(rows.map(p => ({...p, owner_name:p.profiles?.full_name || 'WHYRO member'})));
      }
    }
    load();
    return () => { alive = false; };
  }, [session]);

  const visibleProjects = useMemo(() => projects.filter(p => {
    const text = `${p.title} ${p.description} ${p.category} ${p.technologies.join(' ')}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (category === 'All projects' || p.category === category);
  }), [projects, search, category]);

  async function signIn() {
    if (!supabase) { setNotice('Connect Supabase first. Follow SETUP.md to enable Google sign-in.'); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } });
    if (error) setNotice(error.message);
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setProfile(null); setNotice('You have signed out.');
  }
  async function publishProject(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) { setNotice('Sign in with Google to publish a project.'); return; }
    if (!supabase) return;
    setBusy(true);
    const technologies = projectForm.technologies.split(',').map(s=>s.trim()).filter(Boolean).slice(0,8);
    const { error } = await supabase.from('projects').insert({
      title:projectForm.title.trim(), description:projectForm.description.trim(),
      category:projectForm.category, technologies, url:projectForm.url.trim() || null,
      owner_id:session.user.id, status:'published'
    });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    setNotice('Your project has been published to WHYRO.');
    setModal(null); setProjectForm({title:'',description:'',category:'AI & Machine Learning',technologies:'',url:''});
    const {data} = await supabase.from('projects').select('id,title,description,category,technologies,url,owner_id,created_at,profiles(full_name)').eq('status','published').order('created_at',{ascending:false}).limit(60);
    if (data) setProjects((data as any[]).map(p=>({...p,owner_name:p.profiles?.full_name||'WHYRO member'})));
  }
  async function applyContributor(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setNotice('Connect Supabase to save applications and email notifications.'); return; }
    setBusy(true);
    const { error } = await supabase.from('contributor_applications').insert({
      name:contributorForm.name.trim(), email:contributorForm.email.trim(),
      area:contributorForm.area, message:contributorForm.message.trim(),
      user_id:session?.user?.id || null
    });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    setNotice('Application submitted. Email notifications require the server-side function in SETUP.md.');
    setModal(null); setContributorForm({name:'',email:'',area:'AI & Machine Learning',message:''});
  }

  if (boot) return <div className="boot-screen"><div className="boot-orbit"><WhyroMark size={88}/></div><div className="boot-wordmark">WHYRO</div><div className="boot-tagline">BUILD · COLLABORATE · INNOVATE</div><div className="boot-track"><span/></div></div>;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setCategory('All projects');window.scrollTo({top:0,behavior:'smooth'});}}>
        <WhyroMark size={39}/><span>WHYRO</span>
      </a>
      <div className="brand-motto">Build <i>·</i> Collaborate <i>·</i> Innovate</div>
      <label className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects, technologies, or ideas..."/><kbd>/</kbd></label>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications" onClick={()=>setNotice('You are all caught up.')}><Bell size={19}/></button>
        {session?.user ? <button className="user-pill" onClick={()=>setProfileMenuOpen(!profileMenuOpen)} aria-expanded={profileMenuOpen} aria-haspopup="true">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile"/> : <span className="avatar-initial">{(profile?.full_name||'W').slice(0,1).toUpperCase()}</span>}
          <span>{profile?.full_name || session.user.email || 'Member'}</span><ChevronDown size={15}/>
        </button> : <button className="signin-btn" onClick={signIn}><LogIn size={16}/> Sign in</button>}
        {profileMenuOpen && <div className="profile-menu"><button onClick={()=>{setProfileMenuOpen(false);setModal('project')}}>Publish a project</button><button onClick={signOut}>Sign out</button></div>}
      </div>
      <button className="mobile-menu icon-btn" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} aria-label="Open menu" aria-expanded={mobileMenuOpen}><Menu/></button>
    </header>
    {mobileMenuOpen && <button className="mobile-backdrop" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />}
    <aside className={`sidebar ${mobileMenuOpen?'sidebar-open':''}`}>
      <div className="nav-label">WORKSPACE</div>
      <button className="nav-item active" onClick={()=>{setMobileMenuOpen(false);setCategory('All projects');window.scrollTo({top:0,behavior:'smooth'});}}><Compass size={18}/>Home</button>
      <button className="nav-item" onClick={()=>{setMobileMenuOpen(false);document.getElementById('explore')?.scrollIntoView({behavior:'smooth'});}}><Globe2 size={18}/>Explore</button>
      <button className="nav-item" onClick={()=>{setMobileMenuOpen(false);setModal('project')}}><FolderKanban size={18}/>Publish project</button>
      <button className="nav-item" onClick={()=>{setMobileMenuOpen(false);setModal('contributor')}}><Users size={18}/>Join the team</button>
      <div className="sidebar-spacer"/>
      <div className="idea-card"><div className="idea-icon"><Sparkles size={18}/></div><strong>Have an idea?</strong><p>Share what you're building and find your people.</p><button onClick={()=>setModal('project')}>Share a project <ArrowRight size={15}/></button></div>
      <div className="sidebar-foot"><WhyroMark size={25}/><div><b>WHYRO</b><span>A community built by creators.</span></div></div>
    </aside>

    <main className="main-content">
      <section className="hero">
        <div className="hero-grid"/><div className="hero-glow"/>
        <div className="hero-content">
          <div className="eyebrow"><span className="pulse-dot"/> A COMMUNITY FOR BUILDERS</div>
          <div className="hero-mark"><WhyroMark size={92}/></div>
          <h1><span>WHY</span>RO</h1>
          <h2>Build something. Share it. Build together.</h2>
          <p>Discover projects, share your work, and collaborate with people turning ideas into real-world solutions.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={()=>document.getElementById('explore')?.scrollIntoView({behavior:'smooth'})}>Explore projects <ArrowRight size={17}/></button><button className="secondary-btn" onClick={()=>setModal('project')}><Plus size={17}/> Share your project</button></div>
          <div className="hero-credit">Founded by <strong>Muhammad Nomair</strong></div>
        </div>
        <div className="hero-corner corner-one"/><div className="hero-corner corner-two"/>
      </section>

      <section className="category-grid" id="explore">
        {categories.map(({name,detail,icon:Icon})=><button className={`category-card ${category===name?'category-selected':''}`} key={name} onClick={()=>setCategory(category===name?'All projects':name)}>
          <span className="category-icon"><Icon size={24}/></span><strong>{name}</strong><span>{detail}</span>
        </button>)}
      </section>

      <section className="projects-section">
        <div className="section-heading"><div><div className="eyebrow">MADE BY THE COMMUNITY</div><h2>Explore projects <span className="count">{visibleProjects.length}</span></h2></div><button className="text-link" onClick={()=>{setCategory('All projects');setSearch('');}}>View all <ArrowRight size={15}/></button></div>
        <div className="filter-row"><button className={category==='All projects'?'filter active-filter':'filter'} onClick={()=>setCategory('All projects')}>All projects</button>{categories.slice(0,3).map(c=><button key={c.name} className={category===c.name?'filter active-filter':'filter'} onClick={()=>setCategory(c.name)}>{c.name}</button>)}</div>
        {visibleProjects.length ? <div className="project-grid">{visibleProjects.map((p,i)=><article className="project-card" key={p.id}>
          <div className={`project-art art-${i%4}`}><div className="art-orb"/><span>{p.category}</span><div className="art-mark">{i%4===0?<BrainCircuit/>:i%4===1?<Cpu/>:i%4===2?<Code2/>:<Rocket/>}</div></div>
          <div className="project-body"><div className="project-meta"><span className="project-type"><Zap size={13}/>{p.category}</span><button className="save-btn" title="Save project" onClick={()=>setNotice('Sign in and save/bookmark features will be enabled in a later release.')}><Bookmark size={16}/></button></div>
            <h3>{p.title}</h3><p>{p.description}</p><div className="tags">{p.technologies.map(t=><span key={t}>{t}</span>)}</div>
            <div className="project-footer"><span className="owner-dot">{p.owner_name.slice(0,1).toUpperCase()}</span><span>{p.owner_name}</span>{p.url&&<a href={p.url} target="_blank" rel="noreferrer">Open project <ArrowRight size={13}/></a>}</div>
          </div>
        </article>)}</div> : <div className="empty-state"><FolderKanban size={34}/><h3>No projects found</h3><p>Try another search or be the first to share something in this category.</p><button className="primary-btn" onClick={()=>setModal('project')}>Publish a project <ArrowRight size={16}/></button></div>}
      </section>

      <section className="join-banner"><div className="join-icon"><Rocket size={25}/></div><div><h2>What are you building?</h2><p>Your next collaborator might be one project away.</p></div><button className="primary-btn" onClick={()=>setModal('project')}>Share your work <ArrowRight size={16}/></button></section>
      <footer className="footer"><div className="footer-brand"><WhyroMark size={26}/><strong>WHYRO</strong></div><span>Build · Collaborate · Innovate</span><span>Founded by Muhammad Nomair</span><button onClick={()=>setModal('contributor')}>Become a contributor</button></footer>
    </main>

    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}

    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="modal">
      <button className="modal-close" onClick={()=>setModal(null)} aria-label="Close"><X/></button>
      {modal==='project' ? <>
        <div className="modal-icon"><FolderKanban/></div><div className="eyebrow">SHARE WITH THE COMMUNITY</div><h2>Publish a project</h2><p className="modal-copy">Give your idea a home on WHYRO. You can edit your project later.</p>
        {!session?.user && <button className="google-btn" onClick={signIn}><GoogleGlyph/> Continue with Google to publish</button>}
        <form onSubmit={publishProject}>
          <label>Project name<input required maxLength={90} value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})} placeholder="e.g. Open-source AI assistant"/></label>
          <label>What does it do?<textarea required minLength={20} maxLength={1000} value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})} placeholder="Describe the problem, your approach, and what makes it useful."/></label>
          <label>Category<select value={projectForm.category} onChange={e=>setProjectForm({...projectForm,category:e.target.value})}>{categories.slice(0,3).map(c=><option key={c.name}>{c.name}</option>)}<option>Web & Apps</option><option>Other</option></select></label>
          <label>Technologies <span className="optional">(comma-separated)</span><input value={projectForm.technologies} onChange={e=>setProjectForm({...projectForm,technologies:e.target.value})} placeholder="Python, React, PostgreSQL"/></label>
          <label>Project URL <span className="optional">(optional)</span><input type="url" value={projectForm.url} onChange={e=>setProjectForm({...projectForm,url:e.target.value})} placeholder="https://..."/></label>
          <button className="primary-btn full-btn" disabled={busy}>{busy?'Publishing...':'Publish to WHYRO'} <ArrowRight size={16}/></button>
        </form>
      </> : <>
        <div className="modal-icon"><Users/></div><div className="eyebrow">HELP BUILD THE COMMUNITY</div><h2>Become a contributor</h2><p className="modal-copy">Tell us what you would like to contribute. Team membership is reviewed by WHYRO administrators.</p>
        <form onSubmit={applyContributor}>
          <label>Your name<input required maxLength={100} value={contributorForm.name} onChange={e=>setContributorForm({...contributorForm,name:e.target.value})} placeholder="Your full name"/></label>
          <label>Email address<input type="email" required maxLength={254} value={contributorForm.email} onChange={e=>setContributorForm({...contributorForm,email:e.target.value})} placeholder="you@example.com"/></label>
          <label>Area of interest<select value={contributorForm.area} onChange={e=>setContributorForm({...contributorForm,area:e.target.value})}>{categories.slice(0,3).map(c=><option key={c.name}>{c.name}</option>)}<option>Community & Operations</option><option>Design</option><option>Other</option></select></label>
          <label>How would you contribute?<textarea required minLength={20} maxLength={1500} value={contributorForm.message} onChange={e=>setContributorForm({...contributorForm,message:e.target.value})} placeholder="Tell us about your interests, skills, or ideas."/></label>
          <button className="primary-btn full-btn" disabled={busy}>{busy?'Submitting...':'Submit application'} <ArrowRight size={16}/></button>
          <p className="privacy-note"><ShieldCheck size={14}/> Your application is intended for WHYRO team review. Do not include passwords or sensitive personal information.</p>
        </form>
      </>}
    </section></div>}
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
  </div>;
}

function GoogleGlyph() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#4A90E2" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12z"/></svg>;
}
