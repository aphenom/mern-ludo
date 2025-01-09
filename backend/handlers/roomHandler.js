const { getRooms, getRoom, updateRoom, createNewRoom } = require('../services/roomService');
const { sendToOnePlayerRooms, sendToOnePlayerData, sendWinner } = require('../socket/emits');

const util = require('util');

module.exports = socket => {
    const req = socket.request;

    // Gestionnaire pour récupérer les données d'une room
    const handleGetData = async () => {
        try {
            console.log('Événement room:data déclenché pour le socket ID:', socket.id);
            console.log('Session actuelle:', util.inspect(req.session, { depth: null }));

            if (!req.session || !req.session.roomId) {
                console.warn('Aucun roomId trouvé dans la session');
                return socket.emit('error', { message: 'Aucun roomId trouvé dans la session' });
            }

            const room = await getRoom(req.session.roomId);

            if (!room) {
                console.warn(`Room avec l'ID ${req.session.roomId} introuvable.`);
                return socket.emit('error', { message: 'Room introuvable.' });
            }

            console.log('Room récupérée :', room);

            // Vérification du temps écoulé
            if (room.nextMoveTime && room.nextMoveTime <= Date.now()) {
                console.log('Temps écoulé pour le joueur en mouvement. Changement du joueur...');
                room.changeMovingPlayer();
                await updateRoom(room);
            }

            // Envoi des données au joueur
            sendToOnePlayerData(socket.id, room);

            // Envoi du gagnant s'il existe
            if (room.winner) {
                const winPlayer = room.players.find(player => player.color === room.winner);
                sendWinner(socket.id, winPlayer);
            }
        } catch (error) {
            console.error('Erreur dans handleGetData :', error);
            socket.emit('error', { message: 'Erreur lors de la récupération des données de la room.' });
        }
    };
    // Gestionnaire pour récupérer toutes les rooms
    const handleGetAllRooms = async () => {
        try {
            const rooms = await getRooms();
            if (!rooms || rooms.length === 0) {
                console.warn('No rooms found.');
            }
            sendToOnePlayerRooms(socket.id, rooms);
        } catch (error) {
            console.error('Error in handleGetAllRooms:', error);
            socket.emit('error', { message: 'An error occurred while retrieving rooms.' });
        }
    };

    // Gestionnaire pour créer une nouvelle room
    const handleCreateRoom = async data => {
        try {
            await createNewRoom(data);
            const rooms = await getRooms();
            sendToOnePlayerRooms(socket.id, rooms);
        } catch (error) {
            console.error('Error in handleCreateRoom:', error);
            socket.emit('error', { message: 'An error occurred while creating the room.' });
        }
    };

    // Liaison des gestionnaires aux événements socket
    socket.on('room:data', handleGetData);
    socket.on('room:rooms', handleGetAllRooms);
    socket.on('room:create', handleCreateRoom);
};
