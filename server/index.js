const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");
const { v4: uuidv4 } = require("uuid");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const rooms = {}; // In-memory room store


async function start_server() {
    app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        socket.on("join-room", ({ roomId, username }) => {
        const userId = uuidv4();
        const joinedAt = Date.now();

        if (!rooms[roomId]) {
            rooms[roomId] = {
            users: [],
            state: "waiting",
            };
        }

        rooms[roomId].users.push({ id: userId, name: username, joinedAt });

        const sortedUsers = [...rooms[roomId].users].sort((a, b) => a.joinedAt - b.joinedAt);
        const hostId = sortedUsers[0].id;

        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;

        io.to(roomId).emit("room-update", {
            users: rooms[roomId].users,
            state: rooms[roomId].state,
            hostId,
        });
        });

        socket.on("start-room", () => {
        const room = rooms[socket.roomId];
        if (!room) return;

        const hostId = room.users.sort((a, b) => a.joinedAt - b.joinedAt)[0].id;
        if (hostId === socket.userId) {
            room.state = "started";
            io.to(socket.roomId).emit("room-update", {
            users: room.users,
            state: room.state,
            hostId,
            });
        }
        });

        socket.on("disconnect", () => {
        const { roomId, userId } = socket;
        if (!rooms[roomId]) return;

        rooms[roomId].users = rooms[roomId].users.filter((u) => u.id !== userId);

        if (rooms[roomId].users.length === 0) {
            delete rooms[roomId];
        } else {
            const newHostId = rooms[roomId].users.sort((a, b) => a.joinedAt - b.joinedAt)[0].id;
            io.to(roomId).emit("room-update", {
            users: rooms[roomId].users,
            state: rooms[roomId].state,
            hostId: newHostId,
            });
        }
        });
    });

    // define other api methods

    // Next.js pages and assets
    server.use((req, res) => {return handle(req, res);});

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
        console.log(`> Server listening on http://localhost:${PORT}`);
    });
    });
}

module.exports = { start_server };