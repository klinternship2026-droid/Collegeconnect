/* CollegeConnect frontend.
   Supabase handles authentication and shared database features.
*/
(() => {
  "use strict";

  const STORE = "CollegeConnectDemo_v1";
  const SESSION = "CollegeConnectSession_v1";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const clone = obj => JSON.parse(JSON.stringify(obj));

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const fmtDate = value => {
    if (!value) return "Date not set";

    const d = new Date(value + "T12:00:00");

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const shortDate = value => {
    if (!value) return { day: "—", month: "TBA" };

    const d = new Date(value + "T12:00:00");

    return {
      day: d.getDate(),
      month: d.toLocaleDateString(undefined, {
        month: "short"
      })
    };
  };

  const id = prefix =>
    prefix + "-" + Date.now().toString(36) +
    "-" + Math.random().toString(36).slice(2, 7);

  let data;
  let currentUserId = "";
  let currentPage = "home";
  let lightboxItems = [];
  let lightboxIndex = 0;
  let pendingEdit = null;

  const supabaseConfig = window.COLLEGECONNECT_SUPABASE || {};

  const supabase = (
    window.supabase &&
    supabaseConfig.url &&
    supabaseConfig.anonKey &&
    !supabaseConfig.url.includes("YOUR_PROJECT_URL") &&
    !supabaseConfig.anonKey.includes("YOUR_PUBLISHABLE_KEY")
  )
    ? window.supabase.createClient(
        supabaseConfig.url,
        supabaseConfig.anonKey
      )
    : null;

  let authMode = "signin";
  let authProfileLoading = false;

  function loadData() {
    try {
      const saved = localStorage.getItem(STORE);

      data = saved
        ? JSON.parse(saved)
        : clone(window.UC_INITIAL_DATA);

    } catch (e) {
      data = clone(window.UC_INITIAL_DATA);
    }

    [
      "users",
      "events",
      "books",
      "clubs",
      "photos",
      "externalEvents",
      "orders",
      "rsvps",
      "savedEvents",
      "joinRequests",
      "announcements",
      "libraryAnnouncements"
    ].forEach(k => {
      if (!Array.isArray(data[k])) {
        data[k] = [];
      }
    });

    saveData();
  }

  function saveData() {
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch (e) {
      toast(
        "Storage is full. Try using smaller photos or deleting old gallery uploads.",
        true
      );
    }
  }

  // Shared campus content.
  const SHARED_KEYS = [
    "events",
    "books",
    "clubs",
    "photos",
    "externalEvents",
    "announcements",
    "libraryAnnouncements"
  ];

  let cloudSyncBusy = false;

  async function syncAllContentFromSupabase() {
    if (!supabase || cloudSyncBusy) return;

    cloudSyncBusy = true;

    try {
      const { data: rows, error } = await supabase
        .from("site_content")
        .select("content_key,payload");

      if (error) throw error;

      if (rows && rows.length) {
        rows.forEach(row => {
          if (
            SHARED_KEYS.includes(row.content_key) &&
            Array.isArray(row.payload)
          ) {
            data[row.content_key] = row.payload;
          }
        });

        saveData();
        renderAllPublic();

        if (isAdmin()) {
          renderAdmin();
        }

      } else if (isAdmin()) {
        await saveSharedContent(true);
      }

    } catch (err) {
      console.warn(
        "CollegeConnect cloud content sync failed:",
        err.message || err
      );

    } finally {
      cloudSyncBusy = false;
    }
  }

  async function saveSharedContent(seed = false) {
    if (!supabase) {
      toast(
        "Supabase is not configured; changes are only saved on this device.",
        true
      );

      return false;
    }

    try {
      const rows = SHARED_KEYS.map(key => ({
        content_key: key,
        payload: Array.isArray(data[key]) ? data[key] : [],
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("site_content")
        .upsert(rows, {
          onConflict: "content_key"
        });

      if (error) throw error;

      if (!seed) {
        toast("Saved to the shared CollegeConnect database.");
      }

      return true;

    } catch (err) {
      console.error(
        "Could not save shared CollegeConnect content:",
        err
      );

      toast(
        "Could not sync to the cloud: " +
        (err.message || "check site_content permissions"),
        true
      );

      return false;
    }
  }

  async function refreshSharedContent() {
    if (!supabase || cloudSyncBusy) return;

    try {
      const { data: rows, error } = await supabase
        .from("site_content")
        .select("content_key,payload");

      if (error) throw error;

      if (!rows?.length) return;

      let changed = false;

      rows.forEach(row => {
        if (
          SHARED_KEYS.includes(row.content_key) &&
          Array.isArray(row.payload)
        ) {
          const before = JSON.stringify(
            data[row.content_key] || []
          );

          const after = JSON.stringify(row.payload);

          if (before !== after) {
            data[row.content_key] = row.payload;
            changed = true;
          }
        }
      });

      if (changed) {
        saveData();
        renderAllPublic();

        if (isAdmin()) {
          renderAdmin();
        }
      }

    } catch (err) {
      console.warn(
        "Cloud refresh notice:",
        err.message || err
      );
    }
  }

  async function uploadSharedImage(
    file,
    max = 1400,
    quality = 0.82
  ) {
    if (!file || !supabase) {
      throw new Error(
        "Image upload requires a configured Supabase connection."
      );
    }

    const dataUrl = await readImage(file, max, quality);

    const blob = await (
      await fetch(dataUrl)
    ).blob();

    const path =
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;

    const { error } = await supabase
      .storage
      .from("collegeconnect-media")
      .upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (error) throw error;

    const { data: publicData } = supabase
      .storage
      .from("collegeconnect-media")
      .getPublicUrl(path);

    return publicData.publicUrl;
  }

  async function loadSupabaseProfile(authUser) {
    if (!authUser || !supabase) return;

    authProfileLoading = true;

    try {
      let { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id,full_name,role,avatar_url,student_id,faculty,year"
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        const { data: inserted, error: insertError } =
          await supabase
            .from("profiles")
            .insert({
              id: authUser.id,
              full_name:
                authUser.user_metadata?.full_name || "",
              role: "student"
            })
            .select(
              "id,full_name,role,avatar_url,student_id,faculty,year"
            )
            .single();

        if (insertError) throw insertError;

        profile = inserted;
      }

      const mapped = {
        id: authUser.id,
        username: authUser.email || "",

        name:
          profile.full_name ||
          authUser.user_metadata?.full_name ||
          (authUser.email || "Student").split("@")[0],

        role: [
          "student",
          "leader",
          "admin"
        ].includes(profile.role)
          ? profile.role
          : "student",

        active: true,
        photo: profile.avatar_url || "",
        studentId: profile.student_id || "",
        email: authUser.email || "",
        faculty: profile.faculty || "",
        year: profile.year || "",

        preferences: {
          events: true,
          library: true,
          clubs: true
        }
      };

      data.users = data.users.filter(
        u => u.id !== authUser.id
      );

      data.users.push(mapped);

      currentUserId = authUser.id;

      saveData();
      renderHeader();
      renderProfile();

    } catch (err) {
      console.error(
        "Could not load CollegeConnect profile:",
        err
      );

      toast(
        "Signed in, but the profile could not load. Check your Supabase profiles policies.",
        true
      );

    } finally {
      authProfileLoading = false;
    }
  }
    // ============================================
  // PART 2: DATABASE FUNCTIONS
  // Book reservations, clubs and registered users
  // ============================================

  async function getAuthenticatedUser() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data: result, error } =
      await supabase.auth.getUser();

    if (error) throw error;

    if (!result.user) {
      throw new Error("Please sign in first.");
    }

    return result.user;
  }


  // --------------------------------------------
  // BOOK RESERVATIONS
  // --------------------------------------------

  async function createBookReservation(
    bookId,
    pickupDate,
    note = ""
  ) {
    const authUser = await getAuthenticatedUser();

    const localBook = data.books.find(
      book => String(book.id) === String(bookId)
    );

    if (!localBook) {
      throw new Error("Please select a valid book.");
    }

    // Resolve the actual Supabase book record.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let query = supabase
      .from("books")
      .select("id,title");

    if (uuidPattern.test(String(bookId))) {
      query = query.eq("id", bookId);
    } else {
      query = query.ilike("title", localBook.title);
    }

    const { data: matchingBooks, error: bookError } =
      await query.limit(1);

    if (bookError) throw bookError;

    if (!matchingBooks?.length) {
      throw new Error(
        `The book "${localBook.title}" was not found in the Supabase books table.`
      );
    }

    const databaseBook = matchingBooks[0];

    const { data: reservation, error } = await supabase
      .from("book_reservations")
      .insert({
        user_id: authUser.id,
        book_id: databaseBook.id,
        pickup_date: pickupDate,
        note: note,
        status: "Pending"
      })
      .select()
      .single();

    if (error) throw error;

    return reservation;
  }


  async function loadBookReservations() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const authUser = await getAuthenticatedUser();

    let query = supabase
      .from("book_reservations")
      .select(`
        id,
        book_id,
        user_id,
        pickup_date,
        note,
        status,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (!isAdmin()) {
      query = query.eq("user_id", authUser.id);
    }

    const { data: reservations, error } = await query;

    if (error) throw error;

    return reservations || [];
  }


  async function updateBookReservationStatus(
    reservationId,
    status
  ) {
    if (!isAdmin()) {
      throw new Error("Only an admin can update reservations.");
    }

    const allowedStatuses = [
      "Pending",
      "Ready",
      "Collected",
      "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid reservation status.");
    }

    const { data: updated, error } = await supabase
      .from("book_reservations")
      .update({ status })
      .eq("id", reservationId)
      .select()
      .single();

    if (error) throw error;

    return updated;
  }


  // --------------------------------------------
  // CLUB MEMBERSHIP REQUESTS
  // --------------------------------------------

  async function createClubMembershipRequest(clubId) {
    const authUser = await getAuthenticatedUser();

    const localClub = data.clubs.find(
      club => String(club.id) === String(clubId)
    );

    if (!localClub) {
      throw new Error("Please select a valid club.");
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let query = supabase
      .from("clubs")
      .select("id,name");

    if (uuidPattern.test(String(clubId))) {
      query = query.eq("id", clubId);
    } else {
      query = query.ilike("name", localClub.name);
    }

    const { data: matchingClubs, error: clubError } =
      await query.limit(1);

    if (clubError) throw clubError;

    if (!matchingClubs?.length) {
      throw new Error(
        `The club "${localClub.name}" was not found in the Supabase clubs table.`
      );
    }

    const databaseClub = matchingClubs[0];

    const { data: existing, error: existingError } =
      await supabase
        .from("club_memberships")
        .select("id,status")
        .eq("user_id", authUser.id)
        .eq("club_id", databaseClub.id)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      throw new Error(
        `You already have a request for this club. Status: ${existing.status}.`
      );
    }

    const { data: membership, error } = await supabase
      .from("club_memberships")
      .insert({
        user_id: authUser.id,
        club_id: databaseClub.id,
        status: "Pending"
      })
      .select()
      .single();

    if (error) throw error;

    return membership;
  }


  async function loadClubMemberships() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const authUser = await getAuthenticatedUser();

    let query = supabase
      .from("club_memberships")
      .select(`
        id,
        club_id,
        user_id,
        status,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (!isAdmin()) {
      query = query.eq("user_id", authUser.id);
    }

    const { data: memberships, error } = await query;

    if (error) throw error;

    return memberships || [];
  }


  async function updateClubMembershipStatus(
    membershipId,
    status
  ) {
    if (!isAdmin()) {
      throw new Error("Only an admin can update club requests.");
    }

    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid membership status.");
    }

    const { data: updated, error } = await supabase
      .from("club_memberships")
      .update({ status })
      .eq("id", membershipId)
      .select()
      .single();

    if (error) throw error;

    return updated;
  }


  // --------------------------------------------
  // USERS & ROLES
  // --------------------------------------------

  async function loadRegisteredProfiles() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    if (!isAdmin()) {
      throw new Error("Admin access is required.");
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (profiles || []).map(profile => ({
      id: profile.id,

      name:
        profile.full_name ||
        profile.name ||
        "Student",

      username:
        profile.student_id ||
        profile.id,

      studentId:
        profile.student_id ||
        "",

      role:
        profile.role ||
        "student",

      active: true,

      photo:
        profile.avatar_url ||
        profile.photo ||
        "",

      faculty:
        profile.faculty ||
        "",

      year:
        profile.year ||
        ""
    }));
  }