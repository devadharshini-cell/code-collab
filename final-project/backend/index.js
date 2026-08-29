require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('../src/Actions');
const cors = require('cors');
const { execSync } = require('child_process');
const { c, cpp, node, python, java } = require('compile-run');
const { db } = require('./firebaseAdmin');

// compile-run can emit low-level spawn errors (e.g. "spawn gcc ENOENT" when a
// compiler isn't installed) in a way that bypasses normal try/catch and
// crashes the whole process. Without this, ONE missing compiler takes down
// the server for every single person in every room, not just the person
// who ran that file.
process.on('uncaughtException', (err) => {
    console.error('⚠️  Caught an error that would have crashed the server:', err.message);
});
process.on('unhandledRejection', (err) => {
    console.error('⚠️  Caught an unhandled rejection that would have crashed the server:', err);
});

// Quick check so we can return a clean error instead of ever calling a
// missing compiler and risking a spawn error in the first place.
function isCommandAvailable(cmd) {
    try {
        execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}
const COMPILER_FOR = { c: 'gcc', cpp: 'g++', java: 'javac', python: 'python', node: 'node' };
const compilerAvailability = {};
function ensureCompilerAvailable(runtime) {
    if (compilerAvailability[runtime] === undefined) {
        compilerAvailability[runtime] = isCommandAvailable(COMPILER_FOR[runtime]);
    }
    return compilerAvailability[runtime];
}

function describeFailure(result) {
    if (result.errorType === 'run-timeout') {
        return `Your program timed out after ${10}s without finishing. This usually means it's waiting for input (cin/scanf/input()) that never arrives, or it has an infinite loop.`;
    }
    if (result.errorType === 'compile-timeout') {
        return `Compilation took too long and was stopped. Try again — this can happen on a slow first run.`;
    }
    return result.stderr || result.stdout || 'Unknown error';
}

const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json())

//Compiling code for all languages
app.post("/python", (req, res) => {
    const resultPromise = python.runSource(req.body.runcode, { timeout: 10000 });
    resultPromise
        .then(result => {
            console.log('[python]', result);
            if (result.exitCode == 0) {
                res.json(result.stdout)
            }
            else {
                res.json({ error: true, stderr: describeFailure(result), exitCode: result.exitCode })
            }
        })
        .catch(err => {
            console.log(err);
            res.json({ error: true, stderr: String(err) })
        });
})
app.post("/node", (req, res) => {
    const resultPromise = node.runSource(req.body.runcode, { timeout: 10000 });
    resultPromise
        .then(result => {
            console.log('[node]', result);
            if (result.exitCode == 0) {
                res.json(result.stdout)
            }
            else {
                res.json({ error: true, stderr: describeFailure(result), exitCode: result.exitCode })
            }
        })
        .catch(err => {
            console.log(err);
            res.json({ error: true, stderr: String(err) })
        });
})
app.post("/java", (req, res) => {
    if (!ensureCompilerAvailable('java')) {
        return res.json({ error: true, stderr: `'javac' was not found on this server's PATH. Install a JDK (e.g. Adoptium Temurin) to run Java here, or use "evaluate" for an AI-predicted result.` });
    }
    const resultPromise = java.runSource(req.body.runcode, { timeout: 10000, compileTimeout: 15000 });
    resultPromise
        .then(result => {
            console.log('[java]', result);
            if (result.exitCode == 0) {
                res.json(result.stdout)
            }
            else {
                res.json({ error: true, stderr: describeFailure(result), exitCode: result.exitCode })
            }
        })
        .catch(err => {
            console.log(err);
            res.json({ error: true, stderr: String(err) })
        });
})
app.post("/c", (req, res) => {
    if (!ensureCompilerAvailable('c')) {
        return res.json({ error: true, stderr: `'gcc' was not found on this server's PATH. Install MSYS2/MinGW-w64 (Windows) to run C here, or use "evaluate" for an AI-predicted result.` });
    }
    const resultPromise = c.runSource(req.body.runcode, { timeout: 10000, compileTimeout: 15000 });
    resultPromise
        .then(result => {
            console.log('[c]', result);
            if (result.exitCode == 0) {
                res.json(result.stdout)
            }
            else {
                res.json({ error: true, stderr: describeFailure(result), exitCode: result.exitCode })
            }
        })
        .catch(err => {
            console.log(err);
            res.json({ error: true, stderr: String(err) })
        });
})
app.post("/cpp", (req, res) => {
    if (!ensureCompilerAvailable('cpp')) {
        return res.json({ error: true, stderr: `'g++' was not found on this server's PATH. Install MSYS2/MinGW-w64 (Windows) to run C++ here, or use "evaluate" for an AI-predicted result.` });
    }
    const resultPromise = cpp.runSource(req.body.runcode, { timeout: 10000, compileTimeout: 15000 });
    resultPromise
        .then(result => {
            console.log('[cpp]', result);
            if (result.exitCode == 0) {
                res.json(result.stdout)
            }
            else {
                res.json({ error: true, stderr: describeFailure(result), exitCode: result.exitCode })
            }
        })
        .catch(err => {
            console.log(err);
            res.json({ error: true, stderr: String(err) })
        });
})

const userSocketMap = {};
// Keep latest editor state per room so new joiners get full state immediately.
// This in-memory cache is the fast path; Firestore (when configured) is the
// durable backing store so state survives restarts/redeploys.
const roomStates = {}; // { [roomId]: { files, activeFileId, ... } }

// Firestore writes are debounced per room so a burst of keystrokes doesn't
// turn into a burst of document writes — we only persist once things go
// quiet for a bit.
const CODE_SAVE_DEBOUNCE_MS = 2000;
const saveTimers = {}; // { [roomId]: Timeout }

function scheduleRoomSave(roomId) {
    if (!db) return; // persistence disabled, nothing to do
    clearTimeout(saveTimers[roomId]);
    saveTimers[roomId] = setTimeout(async () => {
        try {
            const state = roomStates[roomId];
            if (!state) return;
            await db.collection('rooms').doc(roomId).set(
                {
                    files: state.files || {},
                    activeFileId: state.activeFileId || null,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );
        } catch (err) {
            console.error(`⚠️  Firestore save failed for room ${roomId}:`, err.message);
        }
    }, CODE_SAVE_DEBOUNCE_MS);
}

async function loadRoomFromFirestore(roomId) {
    if (!db) return null;
    try {
        const snap = await db.collection('rooms').doc(roomId).get();
        if (!snap.exists) return null;
        const data = snap.data();
        if (!data.files) return null;
        return { files: data.files, activeFileId: data.activeFileId || null };
    } catch (err) {
        console.error(`⚠️  Firestore load failed for room ${roomId}:`, err.message);
        return null;
    }
}

async function loadChatHistory(roomId) {
    if (!db) return [];
    try {
        const snap = await db
            .collection('rooms')
            .doc(roomId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limitToLast(100)
            .get();
        return snap.docs.map((d) => {
            const { name, message } = d.data();
            return { name, message };
        });
    } catch (err) {
        console.error(`⚠️  Firestore chat history load failed for room ${roomId}:`, err.message);
        return [];
    }
}

async function saveChatMessage(roomId, name, message) {
    if (!db || !roomId) return;
    try {
        await db.collection('rooms').doc(roomId).collection('messages').add({
            name,
            message,
            createdAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error(`⚠️  Firestore chat save failed for room ${roomId}:`, err.message);
    }
}

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId],
        }
    });
}

//Socket io connection
io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
        console.log(`[JOIN] user=${username} socket=${socket.id} room=${roomId}`);
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        console.log(`[JOIN] clients in room ${roomId}:`, clients);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            })
        })

        // Fast path: latest state already cached in memory (server hasn't restarted).
        // Fallback: load the last persisted state from Firestore (e.g. right after a
        // redeploy, or this is the very first joiner of a room someone visited before).
        let state = roomStates[roomId];
        if (!state) {
            const loaded = await loadRoomFromFirestore(roomId);
            if (loaded) {
                roomStates[roomId] = loaded;
                state = loaded;
            }
        }
        if (state) {
            console.log(`[JOIN] sending state to ${socket.id}: files=${state.files ? Object.keys(state.files).length : 0}, activeFileId=${state.activeFileId}`);
            io.to(socket.id).emit(ACTIONS.CODE_CHANGE, state);
        }

        // Send chat history for this room so new joiners (or anyone reconnecting
        // after a server restart) see prior messages, not a blank chat.
        const history = await loadChatHistory(roomId);
        io.to(socket.id).emit(ACTIONS.CHAT_HISTORY, history);
    });

    //For code change - store latest state and forward to room
    socket.on(ACTIONS.CODE_CHANGE, (payload) => {
        const { roomId } = payload || {};
        if (roomId) {
            const count = payload.files ? Object.keys(payload.files).length : 0;
            console.log(`[CODE_CHANGE] room=${roomId} from=${socket.id} files=${count} activeFileId=${payload.activeFileId}`);
            roomStates[roomId] = payload; // persist latest state (in-memory)
            scheduleRoomSave(roomId); // debounced persist to Firestore
            socket.in(roomId).emit(ACTIONS.CODE_CHANGE, payload);
        }
    });

    //For syncing code - also update room state if roomId provided, then send to specific socket
    socket.on(ACTIONS.SYNC_CODE, (payload) => {
        const { socketId, roomId } = payload || {};
        if (roomId) {
            const count = payload.files ? Object.keys(payload.files).length : 0;
            console.log(`[SYNC_CODE] room=${roomId} from=${socket.id} -> to=${socketId} files=${count} activeFileId=${payload.activeFileId}`);
            roomStates[roomId] = payload;
            scheduleRoomSave(roomId);
        }
        if (socketId) {
            io.to(socketId).emit(ACTIONS.CODE_CHANGE, payload);
        }
    });

    //For chat message - persist to Firestore (best-effort) and forward to the room only
    socket.on('message', ({ roomId, name, message }) => {
        const target = roomId ? io.to(roomId) : io; // fall back to old global broadcast if no roomId sent
        target.emit('message', { name, message });
        if (roomId) saveChatMessage(roomId, name, message);
    })

    //For disconnection
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms]
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
    })
})


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));