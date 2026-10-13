import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let db;
try {
  // Offline-Speicher: Änderungen ohne Internet werden später automatisch hochgeladen
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  db = getFirestore(app);
}

let aktuelleUid = null;
let beenden = null;

window.Cloud = {
  anmelden: (mail, pw) => signInWithEmailAndPassword(auth, mail, pw),
  registrieren: (mail, pw) => createUserWithEmailAndPassword(auth, mail, pw),
  abmelden: () => signOut(auth),
  passwortReset: (mail) => sendPasswordResetEmail(auth, mail),
  speichern: (json) => {
    if (!aktuelleUid) return Promise.resolve();
    return setDoc(doc(db, "paare", aktuelleUid), { json: json, geaendert: Date.now() });
  }
};

onAuthStateChanged(auth, (user) => {
  if (beenden) { beenden(); beenden = null; }
  aktuelleUid = user ? user.uid : null;
  window.WeddingApp.auth(user ? { email: user.email } : null);
  if (!user) return;

  beenden = onSnapshot(
    doc(db, "paare", user.uid),
    (snap) => {
      // Eigene, noch nicht bestätigte Änderungen ignorieren
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists()) {
        // Auf Antwort vom Server warten, nicht auf den leeren Zwischenspeicher
        if (snap.metadata.fromCache) return;
        window.WeddingApp.neueDaten(null);
        return;
      }
      let obj = null;
      try { obj = JSON.parse(snap.data().json); } catch (e) { obj = null; }
      window.WeddingApp.neueDaten(obj);
    },
    (err) => { window.WeddingApp.fehler(err.code || "unbekannt"); }
  );
});
