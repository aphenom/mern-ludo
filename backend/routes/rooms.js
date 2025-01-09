const express = require('express');
const Room = require('../models/room');
const socketManager = require('../socket/socketManager');

const router = express.Router();

router.post('/auto-join', async (req, res) => {
    const { roomName, roomMainUrlAPI, roomPlaces, playerName, sessionID, socketID } = req.body;

    console.log('Auto-join parameters received:', { roomName, roomMainUrlAPI, roomPlaces, playerName, sessionID, socketID });

    if (!roomName || !roomMainUrlAPI || !roomPlaces || !playerName || !sessionID || !socketID) {
        return res.status(400).json({ error: 'roomName, roomMainUrlAPI, roomPlaces, playerName, sessionID, and socketID are required.' });
    }

    try {
        let room = await Room.findOne({ name: roomName });

        if (!room) {
            console.log('Room not found, creating a new one...');
            room = new Room({ name: roomName, mainUrlApi: roomMainUrlAPI, places: roomPlaces });
            await room.save();
        }
        let room_init_started_state = room.started

        const player = room.addPlayer(playerName, sessionID);
        await room.save();

        if (!player) {
            return res.status(400).json({ error: 'Room is full.' });
        }
        else{
            console.log(`etat initial ${room_init_started_state} et etat actuel de la room ${room.started}`)
            if(room_init_started_state == false && room.started == true){
                const axios = require('axios');
                let eventRoomName = room.name;
                let eventType = "etat_demarrage";
                let eventPlayerName = player.name;
                try {
                    const response = await axios.post(`${room.mainUrlApi}/api/update-room-info/`, {
                        eventRoomName,
                        eventType,
                        eventPlayerName
                    });
                    console.log(`Django API response: ${response.data.message}`);
                } catch (error) {
                    console.error('Error sending room info to Django:', error.message);
                }
            }
        }

        // Update session
        req.session.roomId = room._id.toString();
        req.session.playerId = player._id.toString();
        req.session.color = player.color;

        req.session.save(async err => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Error saving session.' });
            }

            console.log('Session updated:', req.session);

            // Connect the socket to the room
            const io = socketManager.getIO();
            const targetSocket = io.sockets.sockets.get(socketID);

            if (targetSocket) {
                targetSocket.request.session.roomId = room._id.toString();
                targetSocket.request.session.playerId = player._id.toString();
                targetSocket.request.session.color = player.color;
                targetSocket.request.session.save()
                targetSocket.join(room._id.toString());
                targetSocket.emit('player:data', JSON.stringify(req.session));
                console.log(`Socket ${socketID} joined room ${room._id}`);
            } else {
                console.warn(`Socket with ID ${socketID} not found.`);
            }

            res.status(200).json({
                message: player.sessionID === sessionID ? 'Existing player rejoined' : 'New player added',
                roomId: room._id,
                playerId: player._id,
                player: player,
            });
        });
    } catch (err) {
        console.error('Error during room management:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/remove-player', async (req, res) => {
    const { roomName, sessionID } = req.body;

    console.log('Remove player parameters received:', { roomName, sessionID });

    if (!roomName || !sessionID) {
        return res.status(400).json({ error: 'roomName and sessionID are required.' });
    }

    try {
        let room = await Room.findOne({ name: roomName });

        if (!room) {
            console.warn(`Room with name ${roomName} not found.`);
            return res.status(404).json({ error: 'Room not found.' });
        }

        // Supprime le joueur
        const removedPlayer = room.removePlayer(sessionID);
        if (!removedPlayer) {
            console.warn(`Player with sessionID ${sessionID} not found in room ${roomName}.`);
            return res.status(404).json({ error: 'Player not found in room.' });
        }
        await room.save();

        console.log(`Player ${removedPlayer.name} removed from room ${roomName}.`);

        /*
        // Supprime la session et gère la déconnexion du socket
        const io = socketManager.getIO();
        const targetSocket = io.sockets.sockets.get(socketID);

        if (targetSocket) {
            targetSocket.request.session.destroy(err => {
                if (err) {
                    console.error('Error destroying session:', err);
                } else {
                    console.log(`Session for socket ${socketID} destroyed.`);
                }
            });
            targetSocket.leave(room._id.toString());
            targetSocket.emit('player:removed', { message: 'You have been removed from the room.' });
        } else {
            console.warn(`Socket with ID ${socketID} not found.`);
        }
        */

        res.status(200).json({
            message: `Player ${removedPlayer.name} removed successfully.`,
            room: room,
        });
    } catch (err) {
        console.error('Error during player removal:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});


module.exports = router;
