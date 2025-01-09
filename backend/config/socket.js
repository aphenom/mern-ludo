const socketManager = require('../socket/socketManager');
const registerPlayerHandlers = require('../handlers/playerHandler');
const registerRoomHandlers = require('../handlers/roomHandler');
const registerGameHandlers = require('../handlers/gameHandler');
const { sessionMiddleware, wrap } = require('../config/session');

module.exports = function (server) {
    // Initialisation de Socket.IO
    socketManager.initialize(server);

    // Gestion des en-têtes initiaux pour les cookies
    socketManager.getIO().engine.on('initial_headers', (headers, req) => {
        if (req.cookieHolder) {
            console.log('Transmission des cookies:', req.cookieHolder);
            headers['set-cookie'] = req.cookieHolder;
            delete req.cookieHolder;
        }
    });

    // Intégration du middleware de session
    socketManager.getIO().use(wrap(sessionMiddleware));

    // Gestion des connexions Socket.IO
    socketManager.getIO().on('connection', socket => {
        console.log('Nouvelle connexion:', socket.id);
        console.log('Session associée:', socket.request.session);

        // Vérifiez si la session contient les informations nécessaires
        if (socket.request.session && socket.request.session.roomId) {
            const roomId = socket.request.session.roomId.toString();
            console.log(`Le joueur rejoint la room avec ID: ${roomId}`);
            socket.join(roomId);
            socket.emit('player:data', JSON.stringify(socket.request.session));
        } else {
            console.warn('Aucune roomId trouvée dans la session. Session actuelle:', socket.request.session);
        }

        // Enregistrez les gestionnaires pour les différents événements
        registerPlayerHandlers(socket);
        registerRoomHandlers(socket);
        registerGameHandlers(socket);

        // Gérer la déconnexion
        socket.on('disconnect', () => {
            console.log(`Joueur déconnecté: ${socket.id}`);
        });
    });
};
