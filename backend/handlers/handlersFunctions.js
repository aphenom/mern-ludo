const { sendToPlayersRolledNumber, sendWinner } = require('../socket/emits');

const rollDice = () => {
    const rolledNumber = Math.ceil(Math.random() * 6);
    return rolledNumber;
};

const makeRandomMove = async roomId => {
    const { updateRoom, getRoom } = require('../services/roomService');
    const room = await getRoom(roomId);
    if (room.winner) return;
    if (room.rolledNumber === null) {
        room.rolledNumber = rollDice();
        sendToPlayersRolledNumber(room._id.toString(), room.rolledNumber);
    }

    const pawnsThatCanMove = room.getPawnsThatCanMove();
    if (pawnsThatCanMove.length > 0) {
        const randomPawn = pawnsThatCanMove[Math.floor(Math.random() * pawnsThatCanMove.length)];
        room.movePawn(randomPawn);
    }
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
};

const isMoveValid = (session, pawn, room) => {
    if (session.color !== pawn.color) {
        return false;
    }
    if (session.playerId !== room.getCurrentlyMovingPlayer()._id.toString()) {
        return false;
    }
    return true;
};

module.exports = { rollDice, makeRandomMove, isMoveValid };
