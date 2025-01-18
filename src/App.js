import React, { useEffect, useState, createContext } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReactLoading from 'react-loading';
import Gameboard from './components/Gameboard/Gameboard';
import LoginPage from './components/LoginPage/LoginPage';
import axios from 'axios';

export const PlayerDataContext = createContext();
export const SocketContext = createContext();

function App() {
    const [playerData, setPlayerData] = useState();
    const [playerSocket, setPlayerSocket] = useState(null);
    const [redirect, setRedirect] = useState(false);

    const autoIntegratePlayer = async (socketID, url) => {
        try {
            console.log('Tentative d’intégration automatique du joueur...');
            
            /*const savedPlayer = JSON.parse(localStorage.getItem('playerData'));
            if (savedPlayer) {
                console.log('Joueur trouvé dans localStorage:', savedPlayer);
                setPlayerData(savedPlayer);
                setRedirect(true);
                return;
            }*/

            // Récupère les paramètres d'URL pour associer un nouveau joueur
            const params = new URLSearchParams(window.location.search);
            const roomName = params.get('roomName');
            const roomMainUrlAPI = params.get('roomMainUrlAPI');
            const roomPlaces = params.get('roomPlaces');
            const playerName = params.get('playerName');
            const sessionID = params.get('sessionID');

            if (!roomName || !roomMainUrlAPI || !roomPlaces || !playerName || !sessionID) {
                console.warn('Paramètres manquants dans l’URL.');
                return;
            }

            // Appel API pour intégrer automatiquement le joueur
            const response = await axios.post(`${url}/api/rooms/auto-join`, {
                roomName,
                roomMainUrlAPI,
                roomPlaces,
                playerName,
                sessionID,
                socketID, // Envoi le socket ID
            });

            console.log('Réponse API:', response.data);

            const player = response.data.player;
            setPlayerData(response.data);
            localStorage.setItem('playerData', JSON.stringify(player));
            setRedirect(true);
        } catch (error) {
            console.error('Erreur lors de l’intégration automatique du joueur:', error);
        }
    };

    useEffect(() => {
        let port = window.location.port;
        let url = null;
        if(!port){
            url = `http://${window.location.hostname}`;
        }
        else{
            url = `http://${window.location.hostname}:8088`;
        }
        const socket = io(`${url}`, { withCredentials: true });

        socket.on('connect', () => {
            console.log('Socket connecté avec ID:', socket.id);
            autoIntegratePlayer(socket.id, url); // Appelle l'intégration avec le socket ID
        });

        setPlayerSocket(socket);

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={playerSocket}>
            <Router>
                <Routes>
                    <Route
                        exact
                        path='/'
                        Component={() => {
                            if (redirect) {
                                return <Navigate to='/game' />;
                            } else if (playerSocket) {
                                return <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />;
                                // return <LoginPage />;
                            } else {
                                return <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />;
                            }
                        }}
                    ></Route>
                    <Route
                        path='/login'
                        Component={() => {
                            if (redirect) {
                                return <Navigate to='/game' />;
                            } else if (playerSocket) {
                                return <LoginPage />;
                            } else {
                                return <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />;
                            }
                        }}
                    ></Route>
                    <Route
                        path='/game'
                        Component={() => {
                            if (playerData) {
                                return (
                                    <PlayerDataContext.Provider value={playerData}>
                                        <Gameboard />
                                    </PlayerDataContext.Provider>
                                );
                            } else {
                                return <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />;
                                // return <Navigate to='/login' />;
                            }
                        }}
                    ></Route>
                </Routes>
            </Router>
        </SocketContext.Provider>
    );
}

export default App;
