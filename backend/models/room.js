const mongoose = require('mongoose');
const { COLORS, MOVE_TIME } = require('../utils/constants');
const { makeRandomMove } = require('../handlers/handlersFunctions');
const timeoutManager = require('./timeoutManager.js');
const PawnSchema = require('./pawn');
const PlayerSchema = require('./player');

const RoomSchema = new mongoose.Schema({
    name: String,
    mainUrlApi: String,
    private: { type: Boolean, default: false },
    password: String,
    createDate: { type: Date, default: Date.now },
    started: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
    nextMoveTime: Number,
    rolledNumber: Number,
    places: Number,
    players: [PlayerSchema],
    winner: { type: String, default: null },
    pawns: {
        type: [PawnSchema],
        default: () => {
            const startPositions = [];
            for (let i = 0; i < 16; i++) {
                let pawn = {};
                pawn.basePos = i;
                pawn.position = i;
                if (i < 4) pawn.color = COLORS[0];
                else if (i < 8) pawn.color = COLORS[1];
                else if (i < 12) pawn.color = COLORS[2];
                else if (i < 16) pawn.color = COLORS[3];
                startPositions.push(pawn);
            }
            return startPositions;
        },
    },
});

RoomSchema.methods.beatPawns = function (position, attackingPawnColor) {
    const pawnsOnPosition = this.pawns.filter(pawn => pawn.position === position);
    pawnsOnPosition.forEach(pawn => {
        if (pawn.color !== attackingPawnColor) {
            const index = this.getPawnIndex(pawn._id);
            this.pawns[index].position = this.pawns[index].basePos;
        }
    });
};

RoomSchema.methods.changeMovingPlayer = function () {
    if (this.winner) return;
    const playerIndex = this.players.findIndex(player => player.nowMoving === true);
    this.players[playerIndex].nowMoving = false;
    if (playerIndex + 1 === this.players.length) {
        this.players[0].nowMoving = true;
    } else {
        // this.players[playerIndex + 1].nowMoving = true;
        if(typeof this.players[playerIndex + 1].name === 'undefined'){
            this.players[playerIndex + 2].nowMoving = true;
        }
        else{
            this.players[playerIndex + 1].nowMoving = true;
        }
    }
    this.nextMoveTime = Date.now() + MOVE_TIME;
    this.rolledNumber = null;
    timeoutManager.clear(this._id.toString());
    timeoutManager.set(makeRandomMove, MOVE_TIME, this._id.toString());
};

RoomSchema.methods.movePawn = function (pawn) {
    const newPositionOfMovedPawn = pawn.getPositionAfterMove(this.rolledNumber);
    this.changePositionOfPawn(pawn, newPositionOfMovedPawn);
    this.beatPawns(newPositionOfMovedPawn, pawn.color);
};

RoomSchema.methods.getPawnsThatCanMove = function () {
    const movingPlayer = this.getCurrentlyMovingPlayer();
    const playerPawns = this.getPlayerPawns(movingPlayer.color);
    return playerPawns.filter(pawn => pawn.canMove(this.rolledNumber));
};

RoomSchema.methods.changePositionOfPawn = function (pawn, newPosition) {
    const pawnIndex = this.getPawnIndex(pawn._id);
    this.pawns[pawnIndex].position = newPosition;
};

RoomSchema.methods.canStartGame = function () {
    return this.players.filter(player => player.ready).length >= 2;
};

RoomSchema.methods.startGame = function () {
    console.log('Démarrage de la partie pour la room :', this.name);

    this.started = true;
    this.nextMoveTime = Date.now() + MOVE_TIME;

    this.players.forEach(player => {
        player.ready = true;
    });

    //this.players[0].nowMoving = true;

    timeoutManager.set(makeRandomMove, MOVE_TIME, this._id.toString());
};

RoomSchema.methods.endGame = function (winner) {
    console.log("Fin de la partie");
    timeoutManager.clear(this._id.toString());
    this.rolledNumber = null;
    this.nextMoveTime = null;
    this.players.map(player => (player.nowMoving = false));
    this.winner = winner;
    this.save();
};

RoomSchema.methods.getWinner = function () {
    if (this.pawns.filter(pawn => pawn.color === 'red' && pawn.position === 73).length === 4) {
        return 'red';
    }
    if (this.pawns.filter(pawn => pawn.color === 'blue' && pawn.position === 79).length === 4) {
        return 'blue';
    }
    if (this.pawns.filter(pawn => pawn.color === 'green' && pawn.position === 85).length === 4) {
        return 'green';
    }
    if (this.pawns.filter(pawn => pawn.color === 'yellow' && pawn.position === 91).length === 4) {
        return 'yellow';
    }
    return null;
};

RoomSchema.methods.isFull = function () {
    if (this.players.length === 4 || this.players.length === this.places) {
        this.full = true;
    }
    return this.full;
};

RoomSchema.methods.getPlayer = function (playerId) {
    return this.players.find(player => player._id.toString() === playerId.toString());
};

/*
RoomSchema.methods.addPlayer = function (name, id) {
    if (this.full) return;
    this.players.push({
        sessionID: id,
        name: name,
        ready: false,
        color: COLORS[this.players.length],
    });
};
*/
RoomSchema.methods.addPlayer = function (name, sessionID) {
    console.log('Tentative d’ajout du joueur avec sessionID :', sessionID);

    const existingPlayer = this.players.find(player => player.sessionID === sessionID);
    if (existingPlayer) {
        console.log('Joueur déjà existant dans la room :', existingPlayer);
        return existingPlayer;
    }

    if (this.full) {
        console.warn('La room est pleine.');
        return null;
    }

    const newPlayer = {
        sessionID: sessionID,
        name: name,
        ready: false,
        color: COLORS[this.players.length],
    };

    this.players.push(newPlayer);

    // on va mettre un joueur virtuel au milieu pour separer les opposant
    if(this.places === 2 && this.players.length === 1){
        const newPlayerTampon = {
            //sessionID: sessionID+"-tmp",
            ready: false,
            color: COLORS[this.players.length],
        };
    
        this.players.push(newPlayerTampon);
    }

    const lastPlayer = this.players.find(player => player.sessionID === sessionID);


    if (this.players.length === 4 || (this.players.length === this.places && this.places > 2) || (this.places === 2 && this.players.length === 3)) {
        this.full = true;
        lastPlayer.nowMoving = true; // désignant comme debutant
        this.players.forEach(player => {
            player.ready = true;
        });
        this.started = true;
    }

    console.log('Nouveau joueur ajouté :', lastPlayer);
    return lastPlayer;
};

RoomSchema.methods.removePlayer = function (sessionID) {
    const playerIndex = this.players.findIndex(player => player.sessionID === sessionID);
    if (playerIndex !== -1) {
        const removedPlayer = this.players.splice(playerIndex, 1)[0];
        
        // ici au cas où il s'agit d'un 1 contre 1 il faut immédiatement supprimé le joueur virtuel créé pour séparer les joueurs 
        if(this.places === 2){
            this.players.splice(playerIndex, 1);
        }
        
        if (this.players.length < 4 || this.players.length < this.places) {
            this.full = false; // Met à jour le statut de la room
        }
        // reattribution de couleur et position
        let i = 0;
        this.players.forEach(player => {
            player.color = COLORS[i]
            i++;
        });
        return removedPlayer;
    }
    return null;
};


RoomSchema.methods.getPawnIndex = function (pawnId) {
    return this.pawns.findIndex(pawn => pawn._id.toString() === pawnId.toString());
};

RoomSchema.methods.getPawn = function (pawnId) {
    return this.pawns.find(pawn => pawn._id.toString() === pawnId.toString());
};

RoomSchema.methods.getPlayerPawns = function (color) {
    return this.pawns.filter(pawn => pawn.color === color);
};

RoomSchema.methods.getCurrentlyMovingPlayer = function () {
    return this.players.find(player => player.nowMoving === true);
};

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;
