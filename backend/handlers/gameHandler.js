const { getRoom, updateRoom } = require('../services/roomService');
const { sendToPlayersRolledNumber, sendWinner } = require('../socket/emits');
const { rollDice, isMoveValid } = require('./handlersFunctions');

module.exports = socket => {
    const req = socket.request;

    const handleMovePawn = async pawnId => {
        const room = await getRoom(req.session.roomId);
        if (room.winner) return;
        const pawn = room.getPawn(pawnId);
        if (isMoveValid(req.session, pawn, room)) {
            const newPositionOfMovedPawn = pawn.getPositionAfterMove(room.rolledNumber);
            room.changePositionOfPawn(pawn, newPositionOfMovedPawn);
            room.beatPawns(newPositionOfMovedPawn, req.session.color);
            room.changeMovingPlayer();
            const winner = room.getWinner();
            if (winner) {
                room.endGame(winner);
                const winPlayer = room.players.find(player => player.color === winner);
                sendWinner(room._id.toString(), winPlayer);
                // sendWinner(room._id.toString(), winner);
                const axios = require('axios');
                // const lastPlayer = room.players.find(player => player.color === winner);
                eventRoomName = room.name;
                eventType = "etat_fin";
                eventPlayerName = winPlayer.name;
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
            await updateRoom(room);
        }
    };

    const handleRollDice = async () => {
        const rolledNumber = rollDice();
        sendToPlayersRolledNumber(req.session.roomId, rolledNumber);
        const room = await updateRoom({ _id: req.session.roomId, rolledNumber: rolledNumber });
        const player = room.getPlayer(req.session.playerId);
        if (!player.canMove(room, rolledNumber)) {
            room.changeMovingPlayer();
            await updateRoom(room);
        }
    };

    socket.on('game:roll', handleRollDice);
    socket.on('game:move', handleMovePawn);
};
