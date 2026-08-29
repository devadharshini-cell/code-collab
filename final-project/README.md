# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Firebase setup

The app uses Firebase for two things:
- **Auth** (frontend) — email/password + Google sign-in, gates the app behind `/login`.
- **Firestore** (backend, via `firebase-admin`) — persists each room's code/files and chat history so they survive server restarts/redeploys. If it's not configured, the app still runs fine, it just falls back to in-memory-only state (same as before).

### 1. Create a Firebase project
Go to the [Firebase Console](https://console.firebase.google.com/), create a project, then:
- **Authentication** → Sign-in method → enable **Email/Password** and **Google**.
- **Firestore Database** → Create database (start in production mode; the backend's service account bypasses security rules, so client-side rules can stay locked down — the frontend never talks to Firestore directly).

### 2. Frontend config
Project Settings → General → "Your apps" → add a Web app → copy the config values into a `.env` file at the project root (see `.env.example`):
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

### 3. Backend config
Project Settings → Service Accounts → Generate new private key (downloads a JSON file). Base64-encode it onto one line and set it as `FIREBASE_SERVICE_ACCOUNT` in `backend/.env` (see `backend/.env.example`) — or as an env var in your hosting provider's dashboard when deploying:
```
# macOS/Linux
base64 -i serviceAccountKey.json | tr -d '\n'
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
```
Never commit the raw JSON file or the base64 string to source control.

### 4. Install & run
```
npm install               # frontend deps, incl. firebase
cd backend && npm install # backend deps, incl. firebase-admin
```
Then run the backend (`npm run dev` inside `backend/`) and frontend (`npm start` at the root) as usual.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
