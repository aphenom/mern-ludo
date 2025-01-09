const { getRoom, updateRoom } = require('../services/roomService');
const { COLORS } = require('../utils/constants');

module.exports = socket => {
    const req = socket.request;

    const handleLogin = async data => {
        console.log('Connexion du joueur avec données :', data);

        const room = await getRoom(data.roomId);
        if (!room) {
            console.error('Room introuvable.');
            return socket.emit('error:changeRoom');
        }

        if (room.isFull()) {
            console.warn('Room pleine.');
            return socket.emit('error:changeRoom');
        }

        if (room.started) {
            console.warn('La partie a déjà commencé.');
            return socket.emit('error:changeRoom');
        }

        if (room.private && room.password !== data.password) {
            console.warn('Mot de passe incorrect pour la room.');
            return socket.emit('error:wrongPassword');
        }

        addPlayerToExistingRoom(room, data);
    };

    const handleReady = async () => {
        console.log('Joueur prêt, mise à jour du statut...');

        const room = await getRoom(req.session.roomId);
        if (!room) {
            console.error('Room introuvable lors de la mise à jour.');
            return;
        }

        const player = room.getPlayer(req.session.playerId);
        player.changeReadyStatus();

        if (room.canStartGame()) {
            console.log('Room prête, démarrage de la partie...');
            room.startGame();
            const lastPlayer = room.players.find(player => player.nowMoving === true);
            roomName = room.name;
            eventType = "etat_demarrage";
            playerName = lastPlayer.name;
            sendRoomInfoToDjango(roomName, eventType, playerName);
        }

        await updateRoom(room);
    };

    const addPlayerToExistingRoom = async (room, data) => {
        const player = room.addPlayer(data.name, data.sessionID);
        if (!player) {
            console.warn('Impossible d’ajouter le joueur.');
            return socket.emit('error:changeRoom');
        }

        if (room.isFull()) {
            console.log('Room pleine, démarrage de la partie...');
            room.startGame();
            const lastPlayer = room.players.find(player => player.nowMoving === true);
            roomName = room.name;
            eventType = "etat_demarrage";
            playerName = lastPlayer.name;
            sendRoomInfoToDjango(roomName, eventType, playerName);
        }

        await updateRoom(room);
        reloadSession(room, player);
    };

    const reloadSession = (room, player) => {
        req.session.reload(err => {
            if (err) {
                console.error('Erreur lors du rechargement de la session :', err);
                return socket.disconnect();
            }

            req.session.roomId = room._id.toString();
            req.session.playerId = player._id.toString();
            req.session.color = player.color;

            console.log('Session mise à jour :', req.session);

            req.session.save(err => {
                if (err) {
                    console.error('Erreur lors de la sauvegarde de la session :', err);
                    return;
                }
                else{
                    socket.join(room._id.toString());
                    //socket.emit('room:data');
                    socket.emit('player:data', JSON.stringify(req.session));
                }
            });
        });
    };

    const handleExit = async () => {
        req.session.reload(err => {
            if (err) return socket.disconnect();
            req.session.destroy();
            socket.emit('redirect');
        });
    };

    const axios = require('axios');
    const sendRoomInfoToDjango = async (roomName, eventType, playerName) => {
        try {
            const response = await axios.post(`${room.mainUrlApi}/api/update-room-info/`, {
                roomName,
                eventType,
                playerName
            });
            console.log(`Django API response: ${response.data.message}`);
        } catch (error) {
            console.error('Error sending room info to Django:', error.message);
        }
    };

    socket.on('player:login', handleLogin);
    socket.on('player:ready', handleReady);
    socket.on('player:exit', handleExit);
};
