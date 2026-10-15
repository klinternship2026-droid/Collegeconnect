/* Edit this file to change the sample content. app.js copies it into localStorage on first run.
   To reset demo data after editing this file, run localStorage.clear() in the browser console and refresh. */
window.UC_INITIAL_DATA = {
  users: [
    {id:"u-admin",username:"admin.demo",name:"Taylor Morgan",role:"admin",active:true,photo:"",studentId:"STAFF-001",email:"admin.demo@example.edu",faculty:"Student Affairs",year:"",preferences:{events:true,library:true,clubs:true}},
    {id:"u-student",username:"maya.student",name:"Maya Chen",role:"student",active:true,photo:"",studentId:"UC-2026-014",email:"maya.student@example.edu",faculty:"Arts & Humanities",year:"Year 2",preferences:{events:true,library:true,clubs:true}},
    {id:"u-leader",username:"alex.leader",name:"Alex Rivera",role:"leader",active:true,photo:"",studentId:"UC-2025-027",email:"alex.leader@example.edu",faculty:"Media & Design",year:"Year 3",preferences:{events:true,library:false,clubs:true}},
    {id:"u-sam",username:"sam.patel",name:"Sam Patel",role:"student",active:true,photo:"",studentId:"UC-2026-031",email:"sam.patel@example.edu",faculty:"Business",year:"Year 1",preferences:{events:true,library:true,clubs:false}},
    {id:"u-jordan",username:"jordan.lee",name:"Jordan Lee",role:"student",active:true,photo:"",studentId:"UC-2024-008",email:"jordan.lee@example.edu",faculty:"Science & Technology",year:"Year 3",preferences:{events:true,library:true,clubs:true}}
  ],
  events: [
    {id:"e1",title:"Welcome Week: Campus Kick-off",date:"2026-10-20",time:"10:00 AM",location:"Central Quad",organizer:"Student Affairs",category:"Campus Life",description:"Meet new friends, explore student services and kick off a brilliant semester with music, games and campus tours.",image:"https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=85"},
    {id:"e2",title:"Creative Futures Design Jam",date:"2026-10-23",time:"2:00 PM",location:"Innovation Lab, Room 204",organizer:"Design Society",category:"Workshop",description:"A relaxed, team-based design sprint for curious minds. Bring an idea and leave with a prototype.",image:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85"},
    {id:"e3",title:"Open Mic Under the Stars",date:"2026-10-25",time:"6:30 PM",location:"Amphitheatre Lawn",organizer:"Arts Collective",category:"Arts & Culture",description:"Poetry, acoustic sets, comedy and spontaneous performances. Sign up to perform or come cheer people on.",image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85"},
    {id:"e4",title:"Interfaculty Football Cup",date:"2026-10-28",time:"4:00 PM",location:"North Sports Ground",organizer:"Sports Union",category:"Sports",description:"Bring your faculty colours and support the teams as they compete for the campus cup.",image:"https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=85"},
    {id:"e5",title:"Research, Reimagined",date:"2026-11-02",time:"11:00 AM",location:"Learning Commons",organizer:"Research Office",category:"Academic",description:"Short talks from student researchers, poster sessions and practical tips for your next research project.",image:"https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=85"},
    {id:"e6",title:"Green Campus Volunteer Day",date:"2026-11-05",time:"9:00 AM",location:"East Garden Gate",organizer:"Eco Circle",category:"Community",description:"Help care for our campus garden, learn about native plants and meet people who care about sustainability.",image:"https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=85"},
    {id:"e7",title:"Student Startup Showcase",date:"2026-11-09",time:"1:00 PM",location:"Business Atrium",organizer:"Entrepreneurs Network",category:"Career",description:"Discover student-led ventures, get feedback on your idea and connect with mentors from the local startup community.",image:"https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85"}
  ],
  books: [
    {id:"b1",title:"Atomic Habits",author:"James Clear",category:"Personal Development",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",description:"Small changes, remarkable results."},
    {id:"b2",title:"The Design of Everyday Things",author:"Don Norman",category:"Design",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780465050659-L.jpg",description:"A classic guide to human-centred design."},
    {id:"b3",title:"Educated",author:"Tara Westover",category:"Memoir",availability:"Limited",cover:"https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",description:"A memoir about education and self-invention."},
    {id:"b4",title:"Sapiens",author:"Yuval Noah Harari",category:"History",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",description:"A brief history of humankind."},
    {id:"b5",title:"The Psychology of Money",author:"Morgan Housel",category:"Business",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",description:"Timeless lessons on wealth and behaviour."},
    {id:"b6",title:"Silent Spring",author:"Rachel Carson",category:"Environment",availability:"Unavailable",cover:"https://covers.openlibrary.org/b/isbn/9780618249060-L.jpg",description:"A landmark work in environmental writing."},
    {id:"b7",title:"The Creative Act",author:"Rick Rubin",category:"Arts & Culture",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg",description:"A way of being creative in everyday life."},
    {id:"b8",title:"Thinking, Fast and Slow",author:"Daniel Kahneman",category:"Psychology",availability:"Limited",cover:"https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",description:"How the mind makes decisions."},
    {id:"b9",title:"The Alchemist",author:"Paulo Coelho",category:"Fiction",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg",description:"A fable about following your dreams."},
    {id:"b10",title:"A Brief History of Time",author:"Stephen Hawking",category:"Science",availability:"Available",cover:"https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg",description:"Big questions about the universe."}
  ],
  clubs: [
    {id:"c1",name:"Design Society",icon:"✳",category:"Creative",description:"A welcoming space for designers, makers and curious minds to share ideas and build a portfolio together.",meeting:"Wednesdays, 4:00 PM",contact:"design.society@example.edu",leaderId:"u-leader",activities:["Weekly design jam","Portfolio feedback night","Campus poster challenge"]},
    {id:"c2",name:"Eco Circle",icon:"🌱",category:"Community",description:"Students taking practical steps toward a greener, kinder and more sustainable campus.",meeting:"Fridays, 3:30 PM",contact:"eco.circle@example.edu",leaderId:"u-sam",activities:["Garden volunteering","Repair café","Sustainability film night"]},
    {id:"c3",name:"Arts Collective",icon:"🎭",category:"Arts & Culture",description:"A home for performers, writers, musicians and anyone who loves creative expression.",meeting:"Tuesdays, 5:00 PM",contact:"arts.collective@example.edu",leaderId:"u-jordan",activities:["Open mic","Student exhibition","Collaborative zine"]},
    {id:"c4",name:"Sports Union",icon:"⚽",category:"Sports",description:"Friendly competition, fitness sessions and a community that cheers for every effort.",meeting:"Mondays, 4:30 PM",contact:"sports.union@example.edu",leaderId:"u-admin",activities:["Interfaculty cup","Weekend fun run","Beginner badminton"]},
    {id:"c5",name:"Entrepreneurs Network",icon:"↗",category:"Career",description:"Meet future founders, test ideas, find collaborators and learn from people who have built things.",meeting:"Thursdays, 6:00 PM",contact:"founders.network@example.edu",leaderId:"u-admin",activities:["Startup showcase","Pitch practice","Founder Q&A"]}
  ],
  externalEvents: [
    {id:"x1",title:"ANCSU Competition",date:"",venue:"To be announced",organizer:"ANCSU",category:"Competition",description:"Inter-college competition. Add confirmed schedule and details when announced.",image:""},
    {id:"x2",title:"Patkai Trophy",date:"",venue:"To be announced",organizer:"To be announced",category:"Sports",description:"A sporting event. Add confirmed schedule, venue and event details when available.",image:""},
    {id:"x3",title:"Harbinger Fest",date:"",venue:"To be announced",organizer:"To be announced",category:"College Fest",description:"A student festival. Add confirmed schedule and programme details when announced.",image:""}
  ],
  photos: [
    {id:"p1",title:"First week, new friends",caption:"A warm welcome on the central quad.",category:"Campus Life",album:"Welcome Week",image:"https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1100&q=85"},
    {id:"p2",title:"Ideas in motion",caption:"Creative Futures design jam in action.",category:"Workshop",album:"Creative Campus",image:"https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1100&q=85"},
    {id:"p3",title:"A little stage magic",caption:"An evening of music, poetry and brave first performances.",category:"Arts & Culture",album:"Arts Week",image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1100&q=85"},
    {id:"p4",title:"Team spirit",caption:"The campus cup brings everyone together.",category:"Sports",album:"Sports Season",image:"https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1100&q=85"},
    {id:"p5",title:"Pages and possibilities",caption:"A quiet afternoon in the learning commons.",category:"Library",album:"Campus Spaces",image:"https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1100&q=85"},
    {id:"p6",title:"Green hands, greener campus",caption:"Volunteers planting for the future.",category:"Community",album:"Eco Circle",image:"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1100&q=85"},
    {id:"p7",title:"Make it together",caption:"Club members share ideas over a workshop table.",category:"Clubs",album:"Creative Campus",image:"https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1100&q=85"},
    {id:"p8",title:"Research with purpose",caption:"Student researchers share their work.",category:"Academic",album:"Learning in Action",image:"https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1100&q=85"},
    {id:"p9",title:"The best kind of break",caption:"Friends catch up between lectures.",category:"Campus Life",album:"Everyday Campus",image:"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1100&q=85"},
    {id:"p10",title:"A court full of energy",caption:"Practice makes progress at the sports centre.",category:"Sports",album:"Sports Season",image:"https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1100&q=85"},
    {id:"p11",title:"Meet the makers",caption:"Students show what they have been creating.",category:"Arts & Culture",album:"Arts Week",image:"https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1100&q=85"},
    {id:"p12",title:"Small steps, shared future",caption:"The Eco Circle gets its hands dirty.",category:"Community",album:"Eco Circle",image:"https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1100&q=85"}
  ],
  orders: [],
  rsvps: [],
  savedEvents: [],
  joinRequests: [],
  announcements: [
    {id:"a1",title:"Welcome to CollegeConnect",message:"Explore the demo campus portal, try a demo account, and discover what is happening around campus.",active:true,date:"2026-10-15"}
  ],
  libraryAnnouncements: [
    {id:"la1",title:"Extended study hours",message:"The learning commons will stay open until 9:00 PM during the mid-semester study period."},
    {id:"la2",title:"New arrivals are here",message:"Fresh titles in design, psychology and personal development are ready to discover."}
  ]
};
