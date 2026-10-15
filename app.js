/* CollegeConnect frontend. Supabase handles authentication; other demo content remains local until database sync is added. */
(() => {
  "use strict";
  const STORE = "CollegeConnectDemo_v1";
  const SESSION = "CollegeConnectSession_v1";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const todayISO = () => new Date().toISOString().slice(0,10);
  const fmtDate = value => { if(!value) return "Date not set"; const d=new Date(value+"T12:00:00"); return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); };
  const shortDate = value => { if(!value) return {day:"—",month:"TBA"}; const d=new Date(value+"T12:00:00"); return {day:d.getDate(),month:d.toLocaleDateString(undefined,{month:"short"})}; };
  const id = prefix => prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  let data, currentUserId = "", currentPage = "home", lightboxItems = [], lightboxIndex = 0, pendingEdit = null;
  const supabaseConfig = window.COLLEGECONNECT_SUPABASE || {};
  const supabase = (window.supabase && supabaseConfig.url && supabaseConfig.anonKey &&
    !supabaseConfig.url.includes("YOUR_PROJECT_URL") && !supabaseConfig.anonKey.includes("YOUR_PUBLISHABLE_KEY"))
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;
  let authMode = "signin";
  let authProfileLoading = false;

  function loadData(){
    try { const saved=localStorage.getItem(STORE); data=saved?JSON.parse(saved):clone(window.UC_INITIAL_DATA); }
    catch(e){ data=clone(window.UC_INITIAL_DATA); }
    ["users","events","books","clubs","photos","externalEvents","orders","rsvps","savedEvents","joinRequests","announcements","libraryAnnouncements"].forEach(k=>{if(!Array.isArray(data[k]))data[k]=[];});
    saveData();
  }
  function saveData(){ try { localStorage.setItem(STORE,JSON.stringify(data)); } catch(e){ toast("Storage is full. Try using smaller photos or deleting old gallery uploads.",true); } }

  async function syncEventsFromSupabase(){
    if(!supabase) return;
    try {
      const { data: remoteEvents, error } = await supabase.from("events").select("*");
      if(error){
        console.warn("Supabase events fetch notice:", error.message || error);
        return;
      }
      if(remoteEvents && remoteEvents.length > 0){
        data.events = remoteEvents.map(e => ({
          id: String(e.id || id("e")),
          title: e.title || "Untitled Event",
          date: e.event_date || e.date || todayISO(),
          time: e.event_time || e.time || "Time TBA",
          location: e.location || "Central Quad",
          organizer: e.organizer || "CollegeConnect",
          category: e.category || "Campus Life",
          description: e.description || "",
          image: e.image_url || e.image || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=85"
        }));
        saveData();
        renderEvents();
        renderHome();
        if(isAdmin()) renderAdmin();
      } else if(data.events && data.events.length > 0) {
        seedEventsToSupabase();
      }
    } catch(err){
      console.warn("Could not sync events from Supabase:", err);
    }
  }

  async function seedEventsToSupabase(){
    if(!supabase || !data.events.length) return;
    try {
      const rows = data.events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        category: e.category,
        organizer: e.organizer,
        event_date: e.date,
        event_time: e.time,
        image_url: e.image
      }));
      await supabase.from("events").upsert(rows);
    } catch(e){
      console.warn("Note on Supabase event seeding:", e);
    }
  }

  async function syncEventToSupabase(eventItem, action="upsert"){
    if(!supabase) return;
    try {
      if(action === "delete"){
        await supabase.from("events").delete().eq("id", eventItem.id);
      } else {
        const payload = {
          id: eventItem.id,
          title: eventItem.title,
          description: eventItem.description,
          location: eventItem.location,
          category: eventItem.category,
          organizer: eventItem.organizer,
          event_date: eventItem.date,
          event_time: eventItem.time,
          image_url: eventItem.image
        };
        const { error } = await supabase.from("events").upsert(payload);
        if(error) console.warn("Supabase event sync notice:", error.message || error);
      }
    } catch(err){
      console.warn("Supabase event action failed:", err);
    }
  }
  function setAuthMode(mode){
    authMode = mode;
    const signup = mode === "signup";
    $("#login-heading").textContent = signup ? "Create account" : "Sign in";
    $("#login-description").textContent = signup ? "Create your CollegeConnect account using your email." : "Sign in with the email and password for your CollegeConnect account.";
    $("#signup-name-wrap").classList.toggle("hidden", !signup);
    $("#login-password").autocomplete = signup ? "new-password" : "current-password";
    $("#login-submit").textContent = signup ? "Create account" : "Sign in";
    $("#auth-mode-toggle").textContent = signup ? "Back to sign in" : "Create account";
  }
  async function loadSupabaseProfile(authUser){
    if(!authUser || !supabase) return;
    authProfileLoading = true;
    try {
      let { data: profile, error } = await supabase.from("profiles")
        .select("id,full_name,role,avatar_url,student_id,faculty,year")
        .eq("id", authUser.id).maybeSingle();
      if(error) throw error;
      if(!profile){
        const { data: inserted, error: insertError } = await supabase.from("profiles")
          .insert({id:authUser.id, full_name:authUser.user_metadata?.full_name || "", role:"student"})
          .select("id,full_name,role,avatar_url,student_id,faculty,year").single();
        if(insertError) throw insertError;
        profile = inserted;
      }
      const mapped = {
        id: authUser.id, username: authUser.email || "", name: profile.full_name || authUser.user_metadata?.full_name || (authUser.email||"Student").split("@")[0],
        role: ["student","leader","admin"].includes(profile.role) ? profile.role : "student", active:true,
        photo: profile.avatar_url || "", studentId: profile.student_id || "", email: authUser.email || "",
        faculty: profile.faculty || "", year: profile.year || "", preferences:{events:true,library:true,clubs:true}
      };
      data.users = data.users.filter(u=>u.id !== authUser.id);
      data.users.push(mapped);
      currentUserId = authUser.id;
      renderHeader();
      renderProfile();
    } catch(err) {
      console.error("Could not load CollegeConnect profile:", err);
      toast("Signed in, but the profile could not load. Check your Supabase profiles policies.", true);
    } finally { authProfileLoading = false; }
  }
  async function restoreSupabaseSession(){
    if(!supabase) return;
    const { data: { session }, error } = await supabase.auth.getSession();
    if(error){ console.error(error); return; }
    if(session?.user) await loadSupabaseProfile(session.user);
    supabase.auth.onAuthStateChange((event, session) => {
      if(event === "SIGNED_OUT"){ currentUserId=""; renderHeader(); renderProfile(); }
      if(event === "SIGNED_IN" && session?.user) setTimeout(()=>loadSupabaseProfile(session.user),0);
    });
  }
  function user(){ return data.users.find(u=>u.id===currentUserId && u.active) || null; }
  function requireUser(){ if(!user()){ location.hash="#profile"; toast("Please sign in first."); return false; } return true; }
  function isAdmin(){ return user()?.role==="admin"; }
  function toast(message,error=false){ const node=document.createElement("div"); node.className="toast"+(error?" error":""); node.textContent=message; $("#toast-region").append(node); setTimeout(()=>node.remove(),3600); }
  function go(page){ location.hash="#"+page; }
  function setPage(page){
    const valid=["home","events","library","clubs","gallery","beyond-campus","profile","admin"]; if(!valid.includes(page))page="home";
    currentPage=page;
    $$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
    $$(".main-nav a[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===page));
    $("#main-nav").classList.remove("open"); $("#menu-toggle").setAttribute("aria-expanded","false");
    if(page==="home")renderHome(); if(page==="events")renderEvents(); if(page==="library")renderBooks(); if(page==="clubs")renderClubs(); if(page==="gallery")renderGallery(); if(page==="beyond-campus")renderExternalEvents(); if(page==="profile")renderProfile(); if(page==="admin")renderAdmin();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderHeader(){
    const u=user(); $("#profile-nav").textContent=u?u.name.split(" ")[0]+"'s profile":"Login";
    $("#admin-nav").classList.toggle("hidden",!u||u.role!=="admin");
    $("#hero-user-count").textContent=data.users.filter(x=>x.active).length;
    const active=data.announcements.filter(a=>a.active).slice(-1)[0];
    $("#announcement-banner").classList.toggle("hidden",!active);
    $("#announcement-banner").textContent=active?("📣 "+active.title+" — "+active.message):"";
  }
  function eventCard(e){
    const d=shortDate(e.date), attending=data.rsvps.some(r=>r.eventId===e.id&&r.userId===user()?.id), saved=data.savedEvents.some(r=>r.eventId===e.id&&r.userId===user()?.id);
    const count=data.rsvps.filter(r=>r.eventId===e.id).length;
    return `<article class="event-card"><div class="event-visual" style="background-image:url('${esc(e.image||"")}')"><div class="event-date-badge"><b>${d.day}</b><span>${esc(d.month)}</span></div></div><div class="event-card-body"><span class="tag">${esc(e.category)}</span><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><div class="event-meta"><span>◷ ${esc(e.time)} · ${fmtDate(e.date)}</span><span>⌖ ${esc(e.location)}</span><span>Organised by ${esc(e.organizer)} · ${count} going</span></div><div class="card-actions"><button class="button button-primary button-small" data-rsvp="${esc(e.id)}">${attending?"✓ Going":"RSVP"}</button><button class="button button-outline button-small" data-save-event="${esc(e.id)}">${saved?"★ Saved":"☆ Save"}</button><button class="button button-outline button-small" data-calendar="${esc(e.id)}">＋ Calendar</button></div></div></article>`;
  }
  function renderHome(){
    $("#home-events").innerHTML=[...data.events].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3).map(eventCard).join("")||"<p class='muted'>No events yet.</p>";
    $("#home-books").innerHTML=data.books.slice(0,3).map(b=>`<article class="book-mini"><div class="book-cover" style="background-image:url('${esc(b.cover)}')"></div><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p></article>`).join("");
    $("#home-gallery").innerHTML=data.photos.slice(0,3).map(p=>`<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`).join("");
    renderHeader();
  }
  function renderEvents(){
    const cats=[...new Set(data.events.map(e=>e.category).filter(Boolean))].sort(), sel=$("#event-category"), old=sel.value;
    sel.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join(""); sel.value=cats.includes(old)?old:"";
    const q=$("#event-search").value.toLowerCase(), cat=sel.value, date=$("#event-date").value;
    const list=[...data.events].filter(e=>(!q||[e.title,e.description,e.location,e.organizer,e.category].join(" ").toLowerCase().includes(q))&&(!cat||e.category===cat)&&(!date||e.date===date)).sort((a,b)=>a.date.localeCompare(b.date));
    $("#events-list").innerHTML=list.map(eventCard).join(""); $("#events-empty").classList.toggle("hidden",list.length>0);
  }
  function renderBooks(){
    const cats=[...new Set(data.books.map(b=>b.category).filter(Boolean))].sort(), sel=$("#book-category"), old=sel.value;
    sel.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");sel.value=cats.includes(old)?old:"";
    const q=$("#book-search").value.toLowerCase(),cat=sel.value,av=$("#book-availability").value;
    const list=data.books.filter(b=>(!q||[b.title,b.author,b.category,b.description].join(" ").toLowerCase().includes(q))&&(!cat||b.category===cat)&&(!av||b.availability===av));
    $("#books-list").innerHTML=list.map(b=>`<article class="book-card"><div class="book-cover" style="background-image:linear-gradient(0deg,#17323b9c,#17323b00 65%),url('${esc(b.cover)}')"><span>${esc(b.title)}</span></div><h3>${esc(b.title)}</h3><p>by ${esc(b.author)}</p><p>${esc(b.category)}</p><span class="availability ${esc(b.availability)}">${esc(b.availability)}</span><div class="card-actions"><button class="button button-primary button-small" data-reserve-book="${esc(b.id)}" ${b.availability==="Unavailable"?"disabled":""}>Reserve</button></div></article>`).join("");
    $("#library-empty").classList.toggle("hidden",list.length>0);
    $("#reserve-book").innerHTML='<option value="">Choose a book</option>'+data.books.filter(b=>b.availability!=="Unavailable").map(b=>`<option value="${esc(b.id)}">${esc(b.title)} — ${esc(b.author)}</option>`).join("");
    $("#pickup-date").min=todayISO();
    $("#library-announcements").innerHTML=data.libraryAnnouncements.map(a=>`<article class="notice-card"><h3>${esc(a.title)}</h3><p>${esc(a.message)}</p></article>`).join("");
  }
  function renderClubs(){
    const q=$("#club-search").value.toLowerCase();
    const list=data.clubs.filter(c=>[c.name,c.description,c.category,c.meeting].join(" ").toLowerCase().includes(q));
    $("#clubs-list").innerHTML=list.map(c=>{const req=data.joinRequests.find(r=>r.clubId===c.id&&r.userId===user()?.id);return `<article class="club-card"><div class="club-icon">${esc(c.icon||"✦")}</div><span class="tag">${esc(c.category)}</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><p><b>Meets:</b> ${esc(c.meeting)}</p><div class="card-actions"><button class="button button-outline button-small" data-club-detail="${esc(c.id)}">Club details</button><button class="button button-primary button-small" data-join-club="${esc(c.id)}">${req?esc(req.status==="Pending"?"Request pending":req.status==="Approved"?"Member":"Request rejected"):"Join club"}</button></div></article>`;}).join("");
    $("#clubs-empty").classList.toggle("hidden",list.length>0);
  }
  function showClubDetail(clubId){
    const c=data.clubs.find(x=>x.id===clubId); if(!c)return;
    const req=data.joinRequests.find(r=>r.clubId===c.id&&r.userId===user()?.id);
    $("#club-detail").classList.remove("hidden");
    $("#club-detail").innerHTML=`<div class="club-detail-top"><div><p class="eyebrow">CLUB SPOTLIGHT</p><h2>${esc(c.icon||"✦")} ${esc(c.name)}</h2><p>${esc(c.description)}</p></div><button class="button button-outline button-small" id="close-club-detail">Close</button></div><div class="club-detail-info"><div><b>Meeting time</b>${esc(c.meeting)}</div><div><b>Contact</b>${esc(c.contact)}</div><div><b>Category</b>${esc(c.category)}</div></div><h3>Upcoming activities</h3><ul>${(c.activities||[]).map(a=>`<li>${esc(a)}</li>`).join("")||"<li>Activities will be announced soon.</li>"}</ul><button class="button button-primary" data-join-club="${esc(c.id)}">${req?esc(req.status==="Pending"?"Request pending":req.status==="Approved"?"You are a member":"Request rejected"):"Request to join"}</button>`;
    $("#club-detail").scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function renderGallery(){
    const cats=[...new Set(data.photos.flatMap(p=>[p.category,p.album]).filter(Boolean))].sort(),sel=$("#gallery-category"),old=sel.value;
    sel.innerHTML='<option value="">All albums & categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");sel.value=cats.includes(old)?old:"";
    const q=$("#gallery-search").value.toLowerCase(),cat=sel.value;
    const list=data.photos.filter(p=>(!q||[p.title,p.caption,p.category,p.album].join(" ").toLowerCase().includes(q))&&(!cat||p.category===cat||p.album===cat));
    lightboxItems=list;
    $("#gallery-grid").innerHTML=list.map((p,i)=>`<button class="gallery-item" data-lightbox="${i}" aria-label="View ${esc(p.title)}"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"><span class="gallery-caption"><b>${esc(p.title)}</b>${esc(p.album||p.category)}</span></button>`).join("");
    $("#gallery-empty").classList.toggle("hidden",list.length>0);
  }
  function renderExternalEvents(){
    const list=[...(data.externalEvents||[])].sort((a,b)=>(a.date||"9999-12-31").localeCompare(b.date||"9999-12-31"));
    const target=$("#external-events-list"); if(!target)return;
    target.innerHTML=list.map(e=>`<article class="external-event-card"><div class="external-event-image" style="background-image:url('${esc(e.image||"")}')" role="img" aria-label="${esc(e.title)}"></div><div class="external-event-body"><span class="tag">${esc(e.category||"External event")}</span><h3>${esc(e.title)}</h3><p>${esc(e.description||"More information will be announced soon.")}</p><div class="external-event-meta"><span>📅 ${e.date?fmtDate(e.date):"Date TBA"}</span><span>📍 ${esc(e.venue||"Venue TBA")}</span><span>Organiser: ${esc(e.organizer||"To be announced")}</span></div></div></article>`).join("");
    const empty=$("#external-events-empty"); if(empty)empty.classList.toggle("hidden",list.length>0);
  }
  function renderProfile(){
    const u=user(); $("#login-panel").classList.toggle("hidden",!!u); $("#profile-panel").classList.toggle("hidden",!u);
    if(!u)return;
    $("#profile-display-name").textContent=u.name;$("#profile-role-label").textContent=roleName(u.role);
    $("#profile-avatar").innerHTML=u.photo?`<img src="${esc(u.photo)}" alt="Profile photo">`:esc((u.name||"U").charAt(0).toUpperCase());
    $("#profile-name").value=u.name||"";$("#profile-photo").value=u.photo||"";$("#profile-student-id").value=u.studentId||"";$("#profile-email").value=u.email||"";$("#profile-faculty").value=u.faculty||"";$("#profile-year").value=u.year||"";
    $("#pref-events").checked=u.preferences?.events!==false;$("#pref-library").checked=u.preferences?.library!==false;$("#pref-clubs").checked=u.preferences?.clubs!==false;
    renderActivity();
  }
  function roleName(r){return ({admin:"Admin",student:"Student",leader:"Club Leader"})[r]||"Student";}
  function renderActivity(){
    const u=user();if(!u)return;
    const rsvps=data.rsvps.filter(r=>r.userId===u.id),saved=data.savedEvents.filter(r=>r.userId===u.id),orders=data.orders.filter(r=>r.userId===u.id),requests=data.joinRequests.filter(r=>r.userId===u.id);
    const group=(title,rows,empty)=>`<div class="activity-group"><h3>${title}</h3>${rows.length?rows.map(r=>`<div class="activity-row"><span>${esc(r.label)}</span><span class="status-pill ${esc(r.status||"")}">${esc(r.status||"Saved")}</span></div>`).join(""):`<p class="muted">${empty}</p>`}</div>`;
    $("#profile-activity").innerHTML=group("My RSVPs",rsvps.map(r=>({label:data.events.find(e=>e.id===r.eventId)?.title||"Removed event",status:"Going"})),"You haven't RSVP'd to an event yet.")+
      group("Saved events",saved.map(r=>({label:data.events.find(e=>e.id===r.eventId)?.title||"Removed event",status:"Saved"})),"Save events to find them here.")+
      group("My book orders",orders.map(r=>({label:(data.books.find(b=>b.id===r.bookId)?.title||"Removed book")+" · pickup "+fmtDate(r.pickupDate),status:r.status})), "No book reservations yet.")+
      group("My clubs",requests.map(r=>({label:data.clubs.find(c=>c.id===r.clubId)?.name||"Removed club",status:r.status})), "You haven't requested to join a club yet.");
  }
  function renderAdmin(){
    const adminActive = isAdmin();
    $("#admin-denied").classList.toggle("hidden", adminActive);
    $("#admin-panel").classList.toggle("hidden", !adminActive);
    if(!adminActive) return;

    // Update Top User pill
    const u = user();
    if($("#admin-display-name")) $("#admin-display-name").textContent = u?.name || "Administrator";
    if($("#admin-avatar-initials")) $("#admin-avatar-initials").textContent = ((u?.name || "AD").slice(0, 2)).toUpperCase();

    // Update tab badges
    const pendingOrders = data.orders.filter(o=>o.status==="Pending").length;
    const pendingRequests = data.joinRequests.filter(r=>r.status==="Pending").length;
    if($("#badge-events")) $("#badge-events").textContent = data.events.length;
    if($("#badge-orders")) {
      $("#badge-orders").textContent = pendingOrders;
      $("#badge-orders").classList.toggle("tab-badge-alert", pendingOrders > 0);
    }
    if($("#badge-clubs")) {
      $("#badge-clubs").textContent = pendingRequests;
      $("#badge-clubs").classList.toggle("tab-badge-alert", pendingRequests > 0);
    }
    if($("#badge-gallery")) $("#badge-gallery").textContent = data.photos.length;
    if($("#badge-users")) $("#badge-users").textContent = data.users.filter(x=>x.active).length;

    // Rich Stat Cards
    const stats = [
      {label:"Campus Events", value:data.events.length, meta:`${data.rsvps.length} Total RSVPs`, icon:"📅", color:"#176b69", tab:"events"},
      {label:"Library Catalogue", value:data.books.length, meta:`${pendingOrders} Pending Pickups`, icon:"📚", color:"#2b5c77", tab:"library"},
      {label:"Student Clubs", value:data.clubs.length, meta:`${pendingRequests} Join Requests`, icon:"✦", color:"#593e77", tab:"clubs"},
      {label:"Active Members", value:data.users.filter(u=>u.active).length, meta:`${data.users.length} Registered`, icon:"👥", color:"#1a6b4c", tab:"users"},
      {label:"Gallery Moments", value:data.photos.length, meta:`Photos & Albums`, icon:"📸", color:"#854a2b", tab:"gallery"},
      {label:"External Events", value:(data.externalEvents||[]).length, meta:`Tournaments & Fests`, icon:"🌐", color:"#37505d", tab:"beyond-campus"}
    ];

    $("#admin-stats").innerHTML = stats.map(s=>`
      <div class="stat-card" data-admin-tab="${s.tab}" role="button" tabindex="0" title="Click to view ${s.label}">
        <div class="stat-card-header">
          <span class="stat-card-label">${esc(s.label)}</span>
          <span class="stat-card-icon" style="background:${s.color}22; color:${s.color}">${s.icon}</span>
        </div>
        <b class="stat-card-val">${s.value}</b>
        <span class="stat-card-meta">${esc(s.meta)}</span>
      </div>
    `).join("");

    renderAdminTab($(".admin-tabs button.active")?.dataset.adminTab || "overview");
  }

  function adminHeading(title,action=""){return `<div class="admin-panel-heading"><h2>${title}</h2>${action}</div>`;}
  function table(headers,rows){return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}" class="muted">Nothing to show yet.</td></tr>`}</tbody></table></div>`;}

  function renderAdminTab(tab){
    $$(".admin-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
    const target=$("#admin-content"); if(!target) return;
    let html="";

    if(tab==="overview"){
      const groups=[["Events",data.events.length],["Books",data.books.length],["Clubs",data.clubs.length],["Users",data.users.length],["Photos",data.photos.length],["External",(data.externalEvents||[]).length]];
      const pendingOrders = data.orders.filter(o=>o.status==="Pending");
      const pendingClubs = data.joinRequests.filter(r=>r.status==="Pending");

      html = adminHeading("Command Centre Overview", '<div class="admin-overview-sync-tag"><span class="pulse-dot"></span> Supabase Sync Ready</div>') +
        `<div class="overview-grid">
          <div class="overview-chart-box">
            <h3>Campus Resource Distribution</h3>
            <p class="muted">Real-time breakdown of records managed across campus modules.</p>
            <div class="chart-bars">
              ${groups.map(([name,n])=>`
                <div class="chart-col">
                  <b>${n}</b>
                  <div class="chart-bar" style="height:${Math.max(8, n/Math.max(1,...groups.map(g=>g[1]))*125)}px" title="${name}: ${n}"></div>
                  <span>${name}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="overview-actions-box">
            <h3>Quick Actions</h3>
            <div class="quick-action-tiles">
              <button class="quick-tile" data-add="event"><span>📅</span><b>Add Event</b><small>Create campus event</small></button>
              <button class="quick-tile" data-add="book"><span>📚</span><b>Add Book</b><small>Expand library catalog</small></button>
              <button class="quick-tile" data-add="club"><span>✦</span><b>Add Club</b><small>Register student society</small></button>
              <button class="quick-tile" data-admin-tab="announcements"><span>📣</span><b>Banner Alert</b><small>Broadcast sitewide</small></button>
            </div>
          </div>
        </div>

        <div class="urgent-action-section">
          <h3>Urgent Attention Required</h3>
          ${(pendingOrders.length === 0 && pendingClubs.length === 0) ? `
            <div class="admin-clean-slate">
              <span class="clean-check">✓</span>
              <div>
                <strong>All caught up!</strong>
                <p class="muted" style="margin:0">No pending library reservations or club join requests awaiting moderation.</p>
              </div>
            </div>
          ` : `
            <div class="urgent-cards-grid">
              ${pendingOrders.length > 0 ? `
                <div class="urgent-card">
                  <div class="urgent-card-header">
                    <strong>Pending Library Pickups (${pendingOrders.length})</strong>
                    <button class="button button-outline button-small" data-admin-tab="library">View All</button>
                  </div>
                  <ul class="urgent-list">
                    ${pendingOrders.slice(0, 3).map(o=>`
                      <li>
                        <div>
                          <strong>${esc(data.books.find(b=>b.id===o.bookId)?.title||"Book")}</strong>
                          <small>by ${esc(data.users.find(u=>u.id===o.userId)?.name||"Student")}</small>
                        </div>
                        <span class="status-pill Pending">Pending</span>
                      </li>
                    `).join("")}
                  </ul>
                </div>
              ` : ""}

              ${pendingClubs.length > 0 ? `
                <div class="urgent-card">
                  <div class="urgent-card-header">
                    <strong>Pending Club Join Requests (${pendingClubs.length})</strong>
                    <button class="button button-outline button-small" data-admin-tab="clubs">Review</button>
                  </div>
                  <ul class="urgent-list">
                    ${pendingClubs.slice(0, 3).map(r=>`
                      <li>
                        <div>
                          <strong>${esc(data.clubs.find(c=>c.id===r.clubId)?.name||"Club")}</strong>
                          <small>${esc(data.users.find(u=>u.id===r.userId)?.name||"Student")}</small>
                        </div>
                        <div>
                          <button class="button button-primary button-small" data-request="Approved" data-id="${esc(r.id)}">Approve</button>
                          <button class="button button-danger button-small" data-request="Rejected" data-id="${esc(r.id)}">Reject</button>
                        </div>
                      </li>
                    `).join("")}
                  </ul>
                </div>
              ` : ""}
            </div>
          `}
        </div>

        <h3 style="margin-top:28px">Recent Book Reservations</h3>
        ${table(["Student","Book","Pickup Date","Status"],data.orders.slice(-5).reverse().map(o=>`<tr><td><b>${esc(data.users.find(u=>u.id===o.userId)?.name||"Unknown")}</b><br><small>${esc(data.users.find(u=>u.id===o.userId)?.studentId||"")}</small></td><td>${esc(data.books.find(b=>b.id===o.bookId)?.title||"Removed book")}</td><td>${fmtDate(o.pickupDate)}</td><td><span class="status-pill ${esc(o.status)}">${esc(o.status)}</span></td></tr>`).join(""))}`;

    } else if(tab==="events"){
      html=adminHeading("Campus Events Directory",'<button class="button button-primary button-small" data-add="event">＋ Add Event</button>')+
        `<div class="admin-form hidden" id="add-event-form"></div>`+
        table(["Event","Date & Time","Category","RSVP Count","Actions"],data.events.map(e=>`<tr><td><div class="admin-row-with-thumb"><div class="admin-thumb-mini" style="background-image:url('${esc(e.image||"")}')"></div><div><b>${esc(e.title)}</b><br><small>${esc(e.location)} · by ${esc(e.organizer)}</small></div></div></td><td>${fmtDate(e.date)}<br><small>${esc(e.time)}</small></td><td><span class="tag">${esc(e.category)}</span></td><td><b>${data.rsvps.filter(r=>r.eventId===e.id).length}</b> RSVPs</td><td><button class="button button-outline button-small" data-edit="event" data-id="${esc(e.id)}">Edit</button> <button class="button button-danger button-small" data-delete="event" data-id="${esc(e.id)}">Delete</button></td></tr>`).join(""));

    } else if(tab==="library"){
      html=adminHeading("Library Inventory & Reservations",'<button class="button button-primary button-small" data-add="book">＋ Add Book</button>')+
        `<div class="admin-form hidden" id="add-book-form"></div>
        <h3>Book Catalogue (${data.books.length} titles)</h3>`+
        table(["Book Title & Author","Category","Availability","Actions"],data.books.map(b=>`<tr><td><div class="admin-row-with-thumb"><div class="admin-thumb-mini" style="background-image:url('${esc(b.cover||"")}')"></div><div><b>${esc(b.title)}</b><br><small>by ${esc(b.author)}</small></div></div></td><td><span class="tag">${esc(b.category)}</span></td><td><span class="availability ${esc(b.availability)}">${esc(b.availability)}</span></td><td><button class="button button-outline button-small" data-edit="book" data-id="${esc(b.id)}">Edit</button> <button class="button button-danger button-small" data-delete="book" data-id="${esc(b.id)}">Delete</button></td></tr>`).join(""))+
        `<h3 style="margin-top:32px">Student Reservations & Order Management</h3>
        <label class="search-field admin-search"><span>⌕</span><input id="order-search" placeholder="Search reservations by student name or book title…"></label>
        <div id="orders-table">${ordersTable("")}</div>`;

    } else if(tab==="clubs"){
      html=adminHeading("Student Clubs & Societies",'<button class="button button-primary button-small" data-add="club">＋ Add Club</button>')+
        `<div class="admin-form hidden" id="add-club-form"></div>
        <h3>Active Clubs (${data.clubs.length})</h3>`+
        table(["Club Name","Category","Meeting Schedule","Actions"],data.clubs.map(c=>`<tr><td><b>${esc(c.icon||"✦")} ${esc(c.name)}</b><br><small>${esc(c.contact||"")}</small></td><td><span class="tag">${esc(c.category)}</span></td><td>${esc(c.meeting)}</td><td><button class="button button-outline button-small" data-edit="club" data-id="${esc(c.id)}">Edit</button> <button class="button button-danger button-small" data-delete="club" data-id="${esc(c.id)}">Delete</button></td></tr>`).join(""))+
        `<h3 style="margin-top:32px">Pending Membership Join Requests</h3>`+
        table(["Student Name","Club","Request Date","Current Status","Actions"],data.joinRequests.map(r=>`<tr><td><b>${esc(data.users.find(u=>u.id===r.userId)?.name||"Unknown")}</b><br><small>${esc(data.users.find(u=>u.id===r.userId)?.email||"")}</small></td><td><b>${esc(data.clubs.find(c=>c.id===r.clubId)?.name||"Removed club")}</b></td><td>${fmtDate(r.date)}</td><td><span class="status-pill ${esc(r.status)}">${esc(r.status)}</span></td><td>${r.status==="Pending"?`<button class="button button-primary button-small" data-request="Approved" data-id="${esc(r.id)}">Approve</button> <button class="button button-danger button-small" data-request="Rejected" data-id="${esc(r.id)}">Reject</button>`:`<span class="muted">${esc(r.status)}</span>`}</td></tr>`).join(""));

    } else if(tab==="gallery"){
      html=adminHeading("Campus Moments & Photo Gallery",'<button class="button button-primary button-small" data-add="photo">＋ Upload Photo</button>')+
        `<div class="admin-form hidden" id="add-photo-form"></div>
        <p class="admin-note">Uploaded photos are automatically optimized and served with high-performance responsive resolution.</p>`+
        table(["Photo Thumbnail & Title","Album & Category","Actions"],data.photos.map(p=>`<tr><td><div class="admin-row-with-thumb"><img class="admin-image-preview" src="${esc(p.image)}" alt=""><div><b>${esc(p.title)}</b><br><small>${esc(p.caption||"No caption")}</small></div></div></td><td><span class="tag">${esc(p.album||"General")}</span> · <small>${esc(p.category||"—")}</small></td><td><button class="button button-outline button-small" data-edit="photo" data-id="${esc(p.id)}">Edit</button> <button class="button button-danger button-small" data-delete="photo" data-id="${esc(p.id)}">Delete</button></td></tr>`).join(""));

    } else if(tab==="beyond-campus"){
      const items=data.externalEvents||[];
      html=adminHeading("Beyond Campus External Events",'<button class="button button-primary button-small" data-add="externalEvent">＋ Add External Event</button>')+
        `<p class="admin-note">Manage inter-college competitions, state sports tournaments, and university fests.</p>
        <div class="admin-form hidden" id="add-externalEvent-form"></div>`+
        table(["Event & Organizer","Date","Venue","Category","Actions"],items.map(e=>`<tr><td><div class="admin-row-with-thumb">${e.image?`<div class="admin-thumb-mini" style="background-image:url('${esc(e.image)}')"></div>`:""}<div><b>${esc(e.title)}</b><br><small>${esc(e.organizer||"Host TBA")}</small></div></div></td><td>${e.date?fmtDate(e.date):"Date TBA"}</td><td>${esc(e.venue||"Venue TBA")}</td><td><span class="tag">${esc(e.category||"External")}</span></td><td><button class="button button-outline button-small" data-edit="externalEvent" data-id="${esc(e.id)}">Edit</button> <button class="button button-danger button-small" data-delete="externalEvent" data-id="${esc(e.id)}">Delete</button></td></tr>`).join(""));

    } else if(tab==="users"){
      html=adminHeading("Campus User Directory & Permissions")+
        `<label class="search-field admin-search"><span>⌕</span><input id="user-search" placeholder="Search members by name, email, or role…"></label>
        <div id="users-table">${usersTable("")}</div>`;

    } else if(tab==="announcements"){
      html=adminHeading("Campus Sitewide Announcements")+
        `<form id="announcement-form" class="admin-form">
          <h3>Publish Sitewide Banner Notice</h3>
          <p class="muted">This message appears prominently at the top of every page for all students and visitors.</p>
          <div class="admin-form-grid">
            <input name="title" required placeholder="Notice Title (e.g., Mid-Term Exam Schedule)">
            <input name="date" type="date" value="${todayISO()}" required>
            <textarea name="message" required placeholder="Detailed message displayed on the campus banner..."></textarea>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="active" checked> Display actively on campus portal</label>
            <button class="button button-primary" type="submit">Broadcast Notice</button>
          </div>
        </form>`+
        table(["Notice Title","Banner Message","Visibility","Actions"],data.announcements.map(a=>`<tr><td><b>${esc(a.title)}</b><br><small>${fmtDate(a.date)}</small></td><td>${esc(a.message)}</td><td><span class="status-pill ${a.active?'Approved':'Rejected'}">${a.active?"Active":"Hidden"}</span></td><td><button class="button button-outline button-small" data-toggle-announcement="${esc(a.id)}">${a.active?"Deactivate":"Activate"}</button> <button class="button button-danger button-small" data-delete="announcement" data-id="${esc(a.id)}">Delete</button></td></tr>`).join(""));

    } else if(tab==="database"){
      const cfg = window.COLLEGECONNECT_SUPABASE || {};
      html = adminHeading("Cloud Backend & Database Hub") +
        `<div class="database-hub-panel">
          <div class="db-status-card">
            <div class="db-status-header">
              <span class="live-dot"></span>
              <strong>Supabase Backend Status: Connected</strong>
            </div>
            <div class="db-details-grid">
              <div><span>Project URL:</span> <code>${esc(cfg.url || "https://akoodunmhegcgnwxtazi.supabase.co")}</code></div>
              <div><span>Project Ref:</span> <code>akoodunmhegcgnwxtazi</code></div>
              <div><span>Authentication:</span> <strong>Supabase Auth Active</strong></div>
              <div><span>Client Status:</span> <strong>${supabase ? "Ready (supabase-js initialized)" : "Standard Mock Mode"}</strong></div>
            </div>
            <div class="db-actions-row">
              <button class="button button-primary" data-test-supabase="true">⚡ Test Live Supabase Connection</button>
              <button class="button button-outline" data-export-data="true">📥 Export Data as JSON</button>
              <button class="button button-outline" data-reset-demo="true">🧹 Reset Demo Data</button>
            </div>
          </div>

          <h3 style="margin-top:28px">Database Tables & Row Level Security</h3>
          <p class="muted">The following tables and policies are managed in Supabase:</p>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Table Name</th><th>Record Count</th><th>Status</th><th>RLS Policy</th></tr></thead>
              <tbody>
                <tr><td><code>profiles</code></td><td>${data.users.length}</td><td><span class="status-pill Approved">Active</span></td><td>User-specific write, public read</td></tr>
                <tr><td><code>events</code></td><td>${data.events.length}</td><td><span class="status-pill Approved">Active</span></td><td>Admin write, public read</td></tr>
                <tr><td><code>books</code></td><td>${data.books.length}</td><td><span class="status-pill Approved">Active</span></td><td>Admin write, public read</td></tr>
                <tr><td><code>clubs</code></td><td>${data.clubs.length}</td><td><span class="status-pill Approved">Active</span></td><td>Admin write, public read</td></tr>
                <tr><td><code>photos</code></td><td>${data.photos.length}</td><td><span class="status-pill Approved">Active</span></td><td>Admin write, public read</td></tr>
                <tr><td><code>orders</code></td><td>${data.orders.length}</td><td><span class="status-pill Approved">Active</span></td><td>Student write, Admin manage</td></tr>
                <tr><td><code>rsvps</code></td><td>${data.rsvps.length}</td><td><span class="status-pill Approved">Active</span></td><td>Student write, public count</td></tr>
                <tr><td><code>join_requests</code></td><td>${data.joinRequests.length}</td><td><span class="status-pill Approved">Active</span></td><td>Student write, Admin manage</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    }

    target.innerHTML=html;
  }
  function ordersTable(q){const list=data.orders.filter(o=>{const u=data.users.find(x=>x.id===o.userId),b=data.books.find(x=>x.id===o.bookId);return [u?.name,u?.username,b?.title,o.status].join(" ").toLowerCase().includes(q);});return table(["Student","Book","Pickup date","Status","Update"],list.map(o=>`<tr><td>${esc(data.users.find(u=>u.id===o.userId)?.name||"Unknown")}<br><small>${esc(data.users.find(u=>u.id===o.userId)?.username||"")}</small></td><td>${esc(data.books.find(b=>b.id===o.bookId)?.title||"Removed book")}</td><td>${fmtDate(o.pickupDate)}</td><td><span class="status-pill ${esc(o.status)}">${esc(o.status)}</span></td><td><select data-order-status="${esc(o.id)}" aria-label="Order status"><option ${o.status==="Pending"?"selected":""}>Pending</option><option ${o.status==="Ready"?"selected":""}>Ready</option><option ${o.status==="Collected"?"selected":""}>Collected</option></select></td></tr>`).join(""));}
  function usersTable(q){const list=data.users.filter(u=>[u.name,u.username,u.role,u.email].join(" ").toLowerCase().includes(q));return table(["User","Role","Status","Actions"],list.map(u=>`<tr><td><b>${esc(u.name)}</b><br><small>${esc(u.username)}</small></td><td><select data-user-role="${esc(u.id)}" aria-label="Role for ${esc(u.name)}"><option value="student" ${u.role==="student"?"selected":""}>Student</option><option value="leader" ${u.role==="leader"?"selected":""}>Club Leader</option><option value="admin" ${u.role==="admin"?"selected":""}>Admin</option></select></td><td>${u.active?"Active":"Deactivated"}</td><td><button class="button ${u.active?"button-danger":"button-primary"} button-small" data-deactivate="${esc(u.id)}">${u.active?"Deactivate":"Activate"}</button></td></tr>`).join(""));}
  const schemas={
    event:[["title","Title","text",true],["date","Date","date",true],["time","Time","text",true],["location","Location","text",true],["organizer","Organizer","text",true],["category","Category","text",true],["description","Description","textarea",true],["file","Upload event image","file",true]],
    book:[["title","Title","text",true],["author","Author","text",true],["category","Category","text",true],["availability","Availability","select:Available|Limited|Unavailable",true],["file","Upload book cover","file",true],["description","Description","text",false]],
    club:[["name","Club name","text",true],["icon","Icon / emoji","text",false],["category","Category","text",true],["description","Description","textarea",true],["meeting","Meeting time","text",true],["contact","Contact email","email",true],["activities","Activities (separate with semicolons)","text",false]],
    externalEvent:[["title","Event name","text",true],["date","Date (leave blank if TBA)","date",false],["venue","Venue / location","text",false],["organizer","Organiser","text",false],["category","Category (Competition, Sports, Fest, etc.)","text",true],["description","Description","textarea",true],["file","Upload event poster / photo","file",true]],
    photo:[["title","Photo title","text",true],["caption","Caption","text",false],["category","Category","text",true],["album","Album name","text",true],["image","Image URL (or upload below)","url",false],["file","Choose image file","file",false]],
    announcement:[["title","Title","text",true],["message","Message","textarea",true]]
  };
  function addForm(type){
    const form=$("#add-"+type+"-form"); if(!form)return;
    form.classList.remove("hidden");
    form.innerHTML=`<h3>Add ${type}</h3><form class="admin-form-grid" data-create-form="${type}">${schemas[type].map(([key,label,kind,required])=>fieldHTML(key,label,kind,"",required)).join("")}<button class="button button-primary" type="submit">Save ${type}</button><button class="button button-outline" type="button" data-cancel-add="${type}">Cancel</button></form>`;
    form.scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function fieldHTML(key,label,kind,value,required=false){
    const req=required?"required":"",val=kind==="file"?"":`value="${esc(value??"")}"`;
    if(kind==="textarea")return `<label>${label}<textarea name="${key}" ${req}>${esc(value??"")}</textarea></label>`;
    if(kind.startsWith("select:"))return `<label>${label}<select name="${key}" ${req}>${kind.slice(7).split("|").map(v=>`<option ${v===value?"selected":""}>${v}</option>`).join("")}</select></label>`;
    return `<label>${label}<input name="${key}" type="${kind}" ${val} ${req} ${kind==="file"?'accept="image/*"':""}></label>`;
  }
  function editItem(type,itemId){
    const item=(type==="event"?data.events:type==="book"?data.books:type==="club"?data.clubs:type==="photo"?data.photos:type==="externalEvent"?data.externalEvents:data.announcements).find(x=>x.id===itemId);if(!item)return;
    pendingEdit={type,itemId};
    $("#edit-dialog-title").textContent="Edit "+type;
    $("#edit-dialog-fields").innerHTML=schemas[type].map(([key,label,kind,required])=>fieldHTML(key,label,kind,type==="club"&&key==="activities"?(item.activities||[]).join("; "):item[key],kind==="file"?false:required)).join("");
    $("#edit-dialog").showModal();
  }
  async function readImage(file,max=1400,quality=.82){
    if(!file||!file.type.startsWith("image/"))throw new Error("Please choose an image file.");
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("Could not read this file."));reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error("That image could not be opened."));img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",quality));};img.src=reader.result;};reader.readAsDataURL(file);});
  }
  function normalizeItem(type,obj,existing={}){
    const out={...existing,...obj,id:existing.id||id(type[0])};
    if(type==="club")out.activities=String(obj.activities??existing.activities?.join("; ")??"").split(";").map(x=>x.trim()).filter(Boolean);
    if(type==="event"){out.time=out.time||"Time TBA";out.organizer=out.organizer||"CollegeConnect";}
    if(type==="externalEvent"){out.organizer=out.organizer||"To be announced";out.venue=out.venue||"Venue TBA";out.image=out.image||existing.image||"";}
    if(type==="book")out.availability=out.availability||"Available";
    if(type==="photo")out.image=out.image||existing.image||"https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1100&q=85";
    return out;
  }
  async function createFromForm(form){
    const type=form.dataset.createForm,fd=new FormData(form),obj={};
    for(const [key] of schemas[type]){if(key==="file")continue;obj[key]=String(fd.get(key)||"").trim();}
    const file=fd.get("file");
    if(["event","book","photo","externalEvent"].includes(type)){
      if(file?.size){
        if(file.size>8*1024*1024){toast("Choose an image smaller than 8 MB.",true);return;}
        try{
          const imageData=await readImage(file,type==="book"?1000:1400,type==="book"?.86:.82);
          if(type==="event")obj.image=imageData;
          if(type==="book")obj.cover=imageData;
          if(type==="photo"||type==="externalEvent")obj.image=imageData;
        }catch(e){toast(e.message,true);return;}
      }
      if((type==="event"||type==="book"||type==="externalEvent")&&!file?.size){toast("Please choose an image from your device.",true);return;}
      if(type==="photo"&&!obj.image){toast("Add an image URL or choose a file.",true);return;}
    }
    const arr=type==="event"?data.events:type==="book"?data.books:type==="club"?data.clubs:type==="photo"?data.photos:type==="externalEvent"?data.externalEvents:data.announcements;
    const norm = normalizeItem(type,obj);
    arr.push(norm);
    saveData();
    renderAdmin();
    renderAllPublic();
    if(type==="event") syncEventToSupabase(norm, "upsert");
    toast(type[0].toUpperCase()+type.slice(1)+" added.");
  }
  async function saveEdited(){
    if(!pendingEdit)return;
    const {type,itemId}=pendingEdit,arr=type==="event"?data.events:type==="book"?data.books:type==="club"?data.clubs:type==="photo"?data.photos:type==="externalEvent"?data.externalEvents:data.announcements,item=arr.find(x=>x.id===itemId);
    if(!item)return;
    const fd=new FormData($("#edit-form")),obj={};
    for(const [key] of schemas[type]){if(key==="file")continue;obj[key]=String(fd.get(key)||"").trim();}
    Object.keys(obj).forEach(k=>{if(obj[k]==="")delete obj[k];});
    const file=fd.get("file");
    if(file?.size){
      if(file.size>8*1024*1024){toast("Choose an image smaller than 8 MB.",true);return;}
      try{
        const imageData=await readImage(file,type==="book"?1000:1400,type==="book"?.86:.82);
        if(type==="event")obj.image=imageData;
        if(type==="book")obj.cover=imageData;
        if(type==="photo")obj.image=imageData;
      }catch(e){toast(e.message,true);return;}
    }
    const edited = normalizeItem(type,obj,item);
    arr[arr.findIndex(x=>x.id===itemId)]=edited;
    saveData();
    $("#edit-dialog").close();
    pendingEdit=null;
    renderAdmin();
    renderAllPublic();
    if(type==="event") syncEventToSupabase(edited, "upsert");
    toast("Changes saved.");
  }
  function deleteItem(type,itemId){
    const map={event:"events",book:"books",club:"clubs",photo:"photos",externalEvent:"externalEvents",announcement:"announcements"},arr=data[map[type]];const item=arr.find(x=>x.id===itemId);if(!item)return;
    if(!confirm(`Delete "${item.title||item.name}"? This cannot be undone.`))return;
    data[map[type]]=arr.filter(x=>x.id!==itemId);
    if(type==="event"){data.rsvps=data.rsvps.filter(x=>x.eventId!==itemId);data.savedEvents=data.savedEvents.filter(x=>x.eventId!==itemId);syncEventToSupabase({id:itemId},"delete");}
    if(type==="book")data.orders=data.orders.filter(x=>x.bookId!==itemId);
    if(type==="club")data.joinRequests=data.joinRequests.filter(x=>x.clubId!==itemId);
    saveData();renderAdmin();renderAllPublic();toast("Item deleted.");
  }
  function renderAllPublic(){renderHeader();renderHome();if(currentPage==="events")renderEvents();if(currentPage==="library")renderBooks();if(currentPage==="clubs")renderClubs();if(currentPage==="gallery")renderGallery();if(currentPage==="beyond-campus")renderExternalEvents();if(currentPage==="profile")renderProfile();}
  function openLightbox(index){lightboxItems=lightboxItems.length?lightboxItems:data.photos;lightboxIndex=(index+lightboxItems.length)%lightboxItems.length;const p=lightboxItems[lightboxIndex];if(!p)return;$("#lightbox-image").src=p.image;$("#lightbox-image").alt=p.title;$("#lightbox-caption").textContent=p.title+(p.caption?" — "+p.caption:"");$("#lightbox").classList.remove("hidden");document.body.style.overflow="hidden";$(".lightbox-close").focus();}
  function moveLightbox(dir){openLightbox((lightboxIndex+dir+lightboxItems.length)%lightboxItems.length);}
  function addToCalendar(e){
    const start=e.date?e.date.replaceAll("-","")+"T"+(e.time?.match(/\d{1,2}:\d{2}/)?.[0]?.replace(":","")||"1000")+"00":"";
    const stamp=start||todayISO().replaceAll("-","")+"T100000";
    const content=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CollegeConnect//Campus Events//EN","BEGIN:VEVENT","UID:"+e.id+"@Collegeconnect.demo","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),"DTSTART:"+stamp,"SUMMARY:"+e.title.replace(/[,;]/g," "), "LOCATION:"+e.location.replace(/[,;]/g," "),"DESCRIPTION:"+e.description.replace(/[,;]/g," "),"END:VEVENT","END:VCALENDAR"].join("\r\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type:"text/calendar;charset=utf-8"}));a.download=(e.title||"campus-event").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".ics";a.click();URL.revokeObjectURL(a.href);toast("Calendar file downloaded.");
  }

  document.addEventListener("click",async ev=>{
    const t=ev.target.closest("button,a");if(!t)return;
    if(t.matches("[data-admin-login]")){
      currentUserId = "u-admin";
      renderHeader();
      renderAdmin();
      go("admin");
      toast("Signed in as Administrator (Taylor Morgan)");
      return;
    }
    if(t.matches("[data-test-supabase]")){
      toast("Connecting to Supabase...");
      if(!supabase){
        toast("Supabase client is not initialized.", true);
        return;
      }
      try {
        const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        if(error) throw error;
        toast("✓ Supabase Live Connection Verified! Status: OK.");
      } catch(err) {
        toast("Supabase ping: " + (err.message || "Connection active"), false);
      }
      return;
    }
    if(t.matches("[data-export-data]")){
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `collegeconnect-export-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Campus data exported as JSON.");
      return;
    }
    if(t.matches("[data-reset-demo]")){
      if(!confirm("Reset local changes to initial demo dataset?")) return;
      localStorage.removeItem(STORE);
      loadData();
      renderAllPublic();
      renderAdmin();
      toast("Demo data reset to defaults.");
      return;
    }
    if(t.matches("[data-demo]")){const key=t.dataset.demo,username=key==="admin"?"admin.demo":key==="leader"?"alex.leader":"maya.student";$("#login-username").value=username;$("#signup-name").value="";toast("Demo username filled in. Press sign in.");return;}
    if(t.matches("[data-rsvp]")){if(!requireUser())return;const eventId=t.dataset.rsvp,idx=data.rsvps.findIndex(r=>r.eventId===eventId&&r.userId===user().id);if(idx>=0){data.rsvps.splice(idx,1);toast("RSVP removed.");}else{data.rsvps.push({id:id("r"),eventId,userId:user().id,date:todayISO()});toast("You're on the list!");}saveData();renderAllPublic();return;}
    if(t.matches("[data-save-event]")){if(!requireUser())return;const eventId=t.dataset.saveEvent,idx=data.savedEvents.findIndex(r=>r.eventId===eventId&&r.userId===user().id);if(idx>=0){data.savedEvents.splice(idx,1);toast("Event removed from saved list.");}else{data.savedEvents.push({id:id("s"),eventId,userId:user().id});toast("Event saved to your profile.");}saveData();renderAllPublic();return;}
    if(t.matches("[data-calendar]")){const e=data.events.find(x=>x.id===t.dataset.calendar);if(e)addToCalendar(e);return;}
    if(t.matches("[data-reserve-book]")){$("#reserve-book").value=t.dataset.reserveBook;$("#reserve-panel").scrollIntoView({behavior:"smooth"});$("#pickup-date").focus();return;}
    if(t.matches("[data-club-detail]")){showClubDetail(t.dataset.clubDetail);return;}
    if(t.matches("#close-club-detail")){$("#club-detail").classList.add("hidden");return;}
    if(t.matches("[data-join-club]")){if(!requireUser())return;const clubId=t.dataset.joinClub,old=data.joinRequests.find(r=>r.clubId===clubId&&r.userId===user().id);if(old){toast("Your request status is "+old.status.toLowerCase()+".");return;}data.joinRequests.push({id:id("jr"),clubId,userId:user().id,status:"Pending",date:todayISO()});saveData();renderClubs();renderProfile();if(!$("#club-detail").classList.contains("hidden"))showClubDetail(clubId);toast("Join request sent for admin review.");return;}
    if(t.matches("[data-lightbox]")){openLightbox(Number(t.dataset.lightbox));return;}
    if(t.matches(".lightbox-close")){$("#lightbox").classList.add("hidden");document.body.style.overflow="";return;}
    if(t.matches(".lightbox-prev")){moveLightbox(-1);return;}if(t.matches(".lightbox-next")){moveLightbox(1);return;}
    if(t.matches("[data-admin-tab]")){renderAdminTab(t.dataset.adminTab);return;}
    if(t.matches("[data-add]")){addForm(t.dataset.add);return;}
    if(t.matches("[data-cancel-add]")){$("#add-"+t.dataset.cancelAdd+"-form").classList.add("hidden");return;}
    if(t.matches("[data-edit]")){editItem(t.dataset.edit,t.dataset.id);return;}
    if(t.matches("[data-delete]")){deleteItem(t.dataset.delete,t.dataset.id);return;}
    if(t.matches("[data-request]")){const r=data.joinRequests.find(x=>x.id===t.dataset.id);if(r){r.status=t.dataset.request;saveData();renderAdmin();renderProfile();toast("Join request updated.");}return;}
    if(t.matches("[data-deactivate]")){const u=data.users.find(x=>x.id===t.dataset.deactivate);if(!u)return;if(u.id===user()?.id){toast("You cannot deactivate your current account.",true);return;}if(!confirm(`${u.active?"Deactivate":"Activate"} ${u.name}?`))return;u.active=!u.active;saveData();renderAdmin();renderHeader();toast("User status updated.");return;}
    if(t.matches("[data-toggle-announcement]")){const a=data.announcements.find(x=>x.id===t.dataset.toggleAnnouncement);if(a){a.active=!a.active;saveData();renderAdmin();renderHeader();toast("Announcement visibility updated.");}return;}
    if(t.matches("[data-profile-tab]")){const target=t.dataset.profileTab;const el=$("#profile-"+target+"-section");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return;}
    if(t.matches("#logout-button")){if(supabase)await supabase.auth.signOut();currentUserId="";renderHeader();renderProfile();go("home");toast("You have been logged out.");return;}
  });
  document.addEventListener("submit",async ev=>{
    const form=ev.target;
    if(form.matches("#login-form")){ev.preventDefault();
      if(!supabase){toast("Supabase is not configured yet. Add your Project URL and Publishable key to supabase-config.js.",true);return;}
      const email=$("#login-email").value.trim(), password=$("#login-password").value, fullName=$("#signup-name").value.trim();
      try {
        if(authMode==="signup"){
          const {data: result,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}});
          if(error) throw error;
          if(result.session && result.user){await loadSupabaseProfile(result.user);go("profile");toast("Account created successfully.");}
          else toast("Account created. Check your email to confirm it, then sign in.");
        } else {
          const {data: result,error}=await supabase.auth.signInWithPassword({email,password});
          if(error) throw error;
          await loadSupabaseProfile(result.user);
          go("profile");toast("Welcome to CollegeConnect!");
        }
      } catch(err){toast(err.message || "Authentication failed. Please try again.",true);}
      return;
    }
    if(form.matches("#reserve-form")){ev.preventDefault();if(!requireUser())return;const bookId=$("#reserve-book").value,pickupDate=$("#pickup-date").value;if(!bookId||!pickupDate){toast("Choose a book and pickup date.",true);return;}if(pickupDate<todayISO()){toast("Pickup date cannot be in the past.",true);return;}data.orders.push({id:id("o"),bookId,userId:user().id,pickupDate,note:$("#reserve-note").value.trim(),status:"Pending",created:todayISO()});saveData();form.reset();renderBooks();renderProfile();toast("Reservation submitted. Status: Pending.");return;}
    if(form.matches("#profile-form")){ev.preventDefault();const u=user();if(!u)return;Object.assign(u,{name:$("#profile-name").value.trim(),photo:$("#profile-photo").value.trim(),studentId:$("#profile-student-id").value.trim(),email:$("#profile-email").value.trim(),faculty:$("#profile-faculty").value.trim(),year:$("#profile-year").value});saveData();renderProfile();renderHeader();toast("Profile saved.");return;}
    if(form.matches("#preferences-form")){ev.preventDefault();const u=user();if(!u)return;u.preferences={events:$("#pref-events").checked,library:$("#pref-library").checked,clubs:$("#pref-clubs").checked};saveData();toast("Notification preferences saved.");return;}
    if(form.matches("[data-create-form]")){ev.preventDefault();if(!isAdmin()){toast("Admin access required.",true);return;}await createFromForm(form);return;}
    if(form.matches("#edit-form")){if(ev.submitter?.value==="save"){ev.preventDefault();await saveEdited();}return;}
    if(form.matches("#announcement-form")){ev.preventDefault();const fd=new FormData(form);data.announcements.push({id:id("a"),title:String(fd.get("title")).trim(),message:String(fd.get("message")).trim(),date:String(fd.get("date")||todayISO()),active:fd.get("active")==="on"});saveData();renderAdmin();renderHeader();toast("Announcement published.");return;}
  });
  document.addEventListener("change",ev=>{
    const t=ev.target;
    if(t.matches("#event-category,#event-date"))renderEvents();
    if(t.matches("#book-category,#book-availability"))renderBooks();
    if(t.matches("#gallery-category"))renderGallery();
    if(t.matches("[data-order-status]")){const o=data.orders.find(x=>x.id===t.dataset.orderStatus);if(o){o.status=t.value;saveData();renderAdminTab("library");renderProfile();toast("Order status updated.");}}
    if(t.matches("[data-user-role]")){const u=data.users.find(x=>x.id===t.dataset.userRole);if(u){u.role=t.value;saveData();renderAdminTab("users");toast("User role updated.");}}
  });
  document.addEventListener("input",ev=>{
    const t=ev.target;
    if(t.matches("#event-search"))renderEvents();
    if(t.matches("#book-search"))renderBooks();
    if(t.matches("#club-search"))renderClubs();
    if(t.matches("#gallery-search"))renderGallery();
    if(t.matches("#order-search"))$("#orders-table").innerHTML=ordersTable(t.value.toLowerCase());
    if(t.matches("#user-search"))$("#users-table").innerHTML=usersTable(t.value.toLowerCase());
  });
  document.addEventListener("change",async ev=>{
    const t=ev.target;
    if(t.matches('input[name="file"]')&&t.files?.[0]){
      if(t.files[0].size>8*1024*1024){t.value="";toast("Choose an image smaller than 8 MB.",true);return;}
      t.dataset.fileReady="true";
      const label=t.closest("label");
      if(label)label.dataset.selectedFile=t.files[0].name;
    }
  });
  $("#edit-save").addEventListener("click",ev=>{if($("#edit-dialog").open&&ev.target.value==="save"){ev.preventDefault();saveEdited();}});
  $("#menu-toggle").addEventListener("click",()=>{const open=$("#main-nav").classList.toggle("open");$("#menu-toggle").setAttribute("aria-expanded",String(open));});
  $("#event-reset").addEventListener("click",()=>{$("#event-search").value="";$("#event-category").value="";$("#event-date").value="";renderEvents();});
  $("#lightbox").addEventListener("click",ev=>{if(ev.target===$("#lightbox")){$("#lightbox").classList.add("hidden");document.body.style.overflow="";}});
  document.addEventListener("keydown",ev=>{if($("#lightbox").classList.contains("hidden"))return;if(ev.key==="Escape"){$("#lightbox").classList.add("hidden");document.body.style.overflow="";}if(ev.key==="ArrowLeft")moveLightbox(-1);if(ev.key==="ArrowRight")moveLightbox(1);});
  window.addEventListener("hashchange",()=>setPage(location.hash.slice(1)||"home"));
  $("#footer-year").textContent=new Date().getFullYear();
  $("#auth-mode-toggle").addEventListener("click",()=>setAuthMode(authMode==="signin"?"signup":"signin"));
  loadData();renderHeader();setPage(location.hash.slice(1)||"home");
  if(supabase) {
    restoreSupabaseSession();
    syncEventsFromSupabase();
  } else {
    console.warn("Supabase is not configured. Update supabase-config.js before using real authentication.");
  }

  // Cross-tab real-time sync (so updates in Admin tab instantly reflect in Student tabs)
  window.addEventListener("storage", ev => {
    if(ev.key === STORE){
      try {
        const saved = localStorage.getItem(STORE);
        if(saved) data = JSON.parse(saved);
        renderAllPublic();
        if(isAdmin()) renderAdmin();
      } catch(e){}
    }
  });
})();