// Облачное хранилище клуба «Ведьмы не стареют»
// Если есть Firebase config — работает через Firestore (realtime, общее облако)
// Если нет — фолбэк на localStorage

(function () {
  const cfg = window.FIREBASE_CONFIG;
  const useCloud = cfg && cfg.apiKey && cfg.apiKey !== 'ВСТАВЬТЕ_СЮДА';

  // =========== LOCAL FALLBACK ===========
  function LocalStore() {
    const K = { members: 'vedmy_members', trips: 'vedmy_trips', history: 'vedmy_history', apps: 'vedmy_applications' };
    function id() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
    function read(k, d) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } }
    function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    ['members','trips','history','apps'].forEach(c => { if (read(K[c]) === null) write(K[c], []); });

    const L = { members:[], trips:[], history:[], apps:[] };
    const fire = c => L[c].forEach(f => f());

    function crud(c, k) {
      return {
        list: () => read(k, []),
        add: (o) => { const l = read(k, []); l.push({ ...o, id: id() }); write(k, l); fire(c); },
        update: (i, p) => { write(k, read(k, []).map(x => x.id === i ? { ...x, ...p } : x)); fire(c); },
        remove: (i) => { write(k, read(k, []).filter(x => x.id !== i)); fire(c); },
        onChange: (f) => { L[c].push(f); f(); },
      };
    }
    const m = crud('members', K.members), t = crud('trips', K.trips),
          h = crud('history', K.history), a = crud('apps', K.apps);

    const addApp = (o) => {
      const l = read(K.apps, []);
      l.push({ ...o, id: id(), createdAt: new Date().toISOString(), status: 'new' });
      write(K.apps, l); fire('apps');
    };

    return {
      mode: 'local', id,
      getMembers: m.list, addMember: m.add, updateMember: m.update, removeMember: m.remove,
      getTrips: t.list, addTrip: t.add, updateTrip: t.update, removeTrip: t.remove,
      getHistory: h.list, addHistory: h.add, updateHistory: h.update, removeHistory: h.remove,
      getApplications: a.list, addApplication: addApp,
      updateApplication: a.update, removeApplication: a.remove,
      onMembersChange: m.onChange, onTripsChange: t.onChange,
      onHistoryChange: h.onChange, onApplicationsChange: a.onChange,
    };
  }

  // =========== CLOUD (FIRESTORE) ===========
  function CloudStore() {
    const { initializeApp } = window.firebaseApp;
    const F = window.firebaseFirestore;
    const app = initializeApp(cfg);
    const db = F.getFirestore(app);

    const cache = { members: [], trips: [], history: [], apps: [] };
    const L = { members: [], trips: [], history: [], apps: [] };

    function subscribe(collName, cacheKey) {
      const q = F.query(F.collection(db, collName));
      F.onSnapshot(q, (snap) => {
        cache[cacheKey] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        L[cacheKey].forEach(f => f());
      }, (err) => console.error(`Firestore listen error (${collName})`, err));
    }
    subscribe('members', 'members');
    subscribe('trips', 'trips');
    subscribe('history', 'history');
    subscribe('applications', 'apps');

    function crud(collName, cacheKey) {
      return {
        list: () => cache[cacheKey].slice(),
        add: async (o) => {
          try { await F.addDoc(F.collection(db, collName), o); }
          catch (e) { console.error(e); alert('Ошибка облака: ' + e.message); }
        },
        update: async (i, p) => {
          try { await F.updateDoc(F.doc(db, collName, i), p); }
          catch (e) { console.error(e); alert('Ошибка облака: ' + e.message); }
        },
        remove: async (i) => {
          try { await F.deleteDoc(F.doc(db, collName, i)); }
          catch (e) { console.error(e); alert('Ошибка облака: ' + e.message); }
        },
        onChange: (f) => { L[cacheKey].push(f); f(); },
      };
    }
    const m = crud('members', 'members'), t = crud('trips', 'trips'),
          h = crud('history', 'history'), a = crud('applications', 'apps');

    const addApp = async (o) => {
      try {
        await F.addDoc(F.collection(db, 'applications'), {
          ...o, createdAt: new Date().toISOString(), status: 'new'
        });
      } catch (e) { console.error(e); alert('Ошибка облака: ' + e.message); }
    };

    return {
      mode: 'cloud',
      id: () => Math.random().toString(36).slice(2, 10),
      getMembers: m.list, addMember: m.add, updateMember: m.update, removeMember: m.remove,
      getTrips: t.list, addTrip: t.add, updateTrip: t.update, removeTrip: t.remove,
      getHistory: h.list, addHistory: h.add, updateHistory: h.update, removeHistory: h.remove,
      getApplications: a.list, addApplication: addApp,
      updateApplication: a.update, removeApplication: a.remove,
      onMembersChange: m.onChange, onTripsChange: t.onChange,
      onHistoryChange: h.onChange, onApplicationsChange: a.onChange,
    };
  }

  // =========== BOOTSTRAP ===========
  function init() {
    if (useCloud && window.firebaseApp) {
      console.log('☁️ Vedmy Club: cloud storage (Firebase)');
      window.Store = CloudStore();
    } else {
      if (useCloud) console.warn('Firebase config есть, но SDK не загружен — fallback на localStorage');
      else console.log('💾 Vedmy Club: localStorage (Firebase не настроен)');
      window.Store = LocalStore();
    }
    window.dispatchEvent(new Event('store-ready'));
  }

  if (useCloud && !window.firebaseApp) {
    window.addEventListener('firebase-ready', init, { once: true });
    // Защита от таймаута
    setTimeout(() => { if (!window.Store) init(); }, 5000);
  } else {
    init();
  }
})();
