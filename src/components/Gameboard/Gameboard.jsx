import React, { useState, useEffect, useContext } from 'react';
import ReactLoading from 'react-loading';
import { PlayerDataContext, SocketContext } from '../../App';
import useSocketData from '../../hooks/useSocketData';
import Map from './Map/Map';
import Navbar from '../Navbar/Navbar';
import Overlay from '../Overlay/Overlay';
import styles from './Gameboard.module.css';
import trophyImage from '../../images/trophy.webp';

const Gameboard = () => {
    const socket = useContext(SocketContext);
    const context = useContext(PlayerDataContext);
    const [pawns, setPawns] = useState([]);
    const [players, setPlayers] = useState([]);

    const [rolledNumber, setRolledNumber] = useSocketData('game:roll');
    const [time, setTime] = useState();
    const [isReady, setIsReady] = useState();
    const [nowMoving, setNowMoving] = useState(false);
    const [started, setStarted] = useState(false);

    const [movingPlayer, setMovingPlayer] = useState('red');

    const [winner, setWinner] = useState(null);

    useEffect(() => {

        //socket.emit('session:get');
        /*socket.on('session:data', (data) => {
            console.log('Données de session reçues depuis le backend :', data);
        });*/

        console.log('Contexte joueur:', context.playerId);
        console.log('Événement room:data émis avec roomId:', context.roomId);
        console.log('socket session avant roomhandler : ', socket)
        socket.emit('room:data', context.roomId);
        socket.on('room:data', data => {
            console.log('Données reçues dans room:data:', data);
            data = JSON.parse(data);
    
            if (!data || data.players == null || data.pawns == null) {
                console.warn('Données invalides reçues:', data);
                return;
            }
    
            // Remplir la barre de navigation avec des joueurs fictifs si nécessaire
            while (data.players.length !== 4) {
                data.players.push({ name: '...' });
            }
    
            const nowMovingPlayer = data.players.find(player => player.nowMoving === true);
            if (nowMovingPlayer) {
                if (nowMovingPlayer._id === context.playerId) {
                    setNowMoving(true);
                } else {
                    setNowMoving(false);
                }
                setMovingPlayer(nowMovingPlayer.color);
            }
    
            const currentPlayer = data.players.find(player => player._id === context.playerId);
            if (currentPlayer) {
                setIsReady(currentPlayer.ready);
            } else {
                console.warn('Joueur actuel introuvable:', context.playerId);
            }
    
            setRolledNumber(data.rolledNumber);
            setPlayers(data.players);
            setPawns(data.pawns);
            setTime(data.nextMoveTime);
            setStarted(data.started);
        });
    
        socket.on('game:winner', winner => {
            winner = JSON.parse(winner);
            console.log('Gagnant reçu:', winner);
            setWinner(winner);
        });
    
        socket.on('redirect', () => {
            console.log('Redirection reçue, rechargement de la page.');
            window.location.reload();
        });

    }, [socket, context, context.playerId, context.roomId, setRolledNumber]);
    
    return (
        <>
            {pawns.length === 16 ? (
                <div className='container'>
                    <Navbar
                        players={players}
                        started={started}
                        time={time}
                        isReady={isReady}
                        movingPlayer={movingPlayer}
                        rolledNumber={rolledNumber}
                        nowMoving={nowMoving}
                        ended={winner !== null}
                    />
                    <Map pawns={pawns} nowMoving={nowMoving} rolledNumber={rolledNumber} />
                </div>
            ) : (
                <>
                    <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />
                </>
            )}
            {winner ? (
                <Overlay>
                    <div className={styles.winnerContainer}>
                        <img src={trophyImage} alt='winner' />
                        <h1>
                            Vainqueur : <span style={{ color: winner.color, backgroundColor:"white" }}>{winner.name}</span>
                            </h1>
                            <button style={{display:'none'}} onClick={() => socket.emit('player:exit')}>Play again</button>
                        </div>
                    </Overlay>
                ) : null}
        </>
    );
};

export default Gameboard;
