const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const { sessionMiddleware } = require('./config/session');

const PORT = process.env.PORT;

const app = express();

app.use(cookieParser());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(express.json());
app.set('trust proxy', 1);
/*
app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
    })
);
*/

// Détermine les paramètres CORS en fonction de l'environnement
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? `https://gameplay.ludo-round.com` // Adresse en production
        : 'http://localhost:3000',         // Adresse en développement
    credentials: true,
};

// Applique les paramètres CORS
app.use(cors(corsOptions));

app.use(sessionMiddleware);

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});

console.log(`corsOptions : ${corsOptions.origin}`);

require('./config/database')(mongoose);
require('./config/socket')(server);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('./build'));
    app.get('*', (req, res) => {
        const indexPath = path.join(__dirname, './build/index.html');
        res.sendFile(indexPath);
    });
}

const roomsRoute = require('./routes/rooms');
app.use('/api/rooms', roomsRoute);

module.exports = { server };
