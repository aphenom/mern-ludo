const { sessionMiddleware } = require('../config/session');
const util = require('util');

const socketManager = {
    io: null,
    initialize(server) {
        this.io = require('socket.io')(server, {
            cors: {
                origin: 'http://localhost:3000',
                credentials: true,
            },
            allowRequest: (req, callback) => {
                const fakeRes = {
                    getHeader() {
                        return [];
                    },
                    setHeader(key, values) {
                        req.cookieHolder = values[0];
                    },
                    writeHead() {},
                };
            
                console.log('Avant middleware de session - Requête:', util.inspect(req.session, { depth: null }));
            
                sessionMiddleware(req, fakeRes, () => {
                    if (req.session) {
                        fakeRes.writeHead();
                        req.session.save(err => {
                            if (err) console.error('Erreur lors de la sauvegarde de session:', err);
                            console.log('Session après middleware dans socketManager:', util.inspect(req.session, { depth: null }));
                            callback(null, true);
                        });
                    } else {
                        console.warn('Session introuvable après middleware.');
                        callback(null, false);
                    }
                });
            },
        });
    },
    getIO() {
        if (!this.io) {
            throw new Error('Socket.io non initialisé');
        }
        return this.io;
    },
};

module.exports = socketManager;
