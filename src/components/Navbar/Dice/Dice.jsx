import React, { useContext, useState } from 'react';
import { SocketContext } from '../../../App';
import images from '../../../constants/diceImages';
import styles from './Dice.module.css';

const Dice = ({ rolledNumber, nowMoving, playerColor, movingPlayer }) => {
    const socket = useContext(SocketContext);
    const [isRolling, setIsRolling] = useState(false);

    const handleClick = () => {
        if (!isRolling) {
            setIsRolling(true);
            socket.emit('game:roll');
            setTimeout(() => setIsRolling(false), 1000); // Empêche les clics multiples rapides
        }
    };

    const isCurrentPlayer = movingPlayer === playerColor;
    const hasRolledNumber = rolledNumber !== null && rolledNumber !== undefined;

    return (
        <div className={styles.container}>
            {isCurrentPlayer ? (
                hasRolledNumber ? (
                    <img src={images[rolledNumber - 1]} alt={rolledNumber} />
                ) : nowMoving ? (
                    <img
                        src={images[6]}
                        className={`roll ${isRolling ? styles.disabled : ''}`}
                        alt='roll'
                        onClick={handleClick}
                    />
                ) : null
            ) : null}
        </div>
    );
};

export default Dice;
