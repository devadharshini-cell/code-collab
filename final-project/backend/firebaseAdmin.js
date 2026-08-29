// Initializes Firebase Admin (Firestore) for the backend.
//
// Credentials come from one env var, FIREBASE_SERVICE_ACCOUNT, containing the
// full service-account JSON as a *base64-encoded* string. Base64 is used
// (instead of pasting raw JSON) because most host dashboards (Render,
// Railway, etc.) mangle multi-line/quoted JSON in env var fields — base64 is
// a single safe line to paste.
//
// To generate it:
//   Firebase Console -> Project Settings -> Service Accounts -> Generate new
//   private key (downloads a JSON file), then:
//     macOS/Linux: base64 -i serviceAccountKey.json | tr -d '\n'
//     Windows (PowerShell): [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
//
// If the env var isn't set, persistence is disabled but the app still runs
// (in-memory only, same as before) so local dev never requires Firebase.

const admin = require('firebase-admin');

let db = null;

function init() {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!encoded) {
        console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set — Firestore persistence is disabled (rooms/chat only live in memory).');
        return null;
    }
    try {
        const json = Buffer.from(encoded, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(json);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase Admin initialized — Firestore persistence enabled.');
        return admin.firestore();
    } catch (err) {
        console.error('⚠️  Failed to initialize Firebase Admin, persistence disabled:', err.message);
        return null;
    }
}

db = init();

module.exports = { admin, db };
