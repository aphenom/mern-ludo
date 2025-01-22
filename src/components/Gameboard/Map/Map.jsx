import React, { useEffect, useRef, useState, useContext } from 'react';
import { PlayerDataContext, SocketContext } from '../../../App';

import mapImage from '../../../images/map.jpg';
import positionMapCoords from '../positions';
import pawnImages from '../../../constants/pawnImages';
import canPawnMove from './canPawnMove';
import getPositionAfterMove from './getPositionAfterMove';

const Map = ({ pawns, nowMoving, rolledNumber }) => {
    const player = useContext(PlayerDataContext);
    const socket = useContext(SocketContext);
    const canvasRef = useRef(null);

    const [hintPawn, setHintPawn] = useState();

    const paintPawn = (context, pawn) => {
        const { x, y } = positionMapCoords[pawn.position];
        const touchableArea = new Path2D();
        touchableArea.arc(x, y, 12, 0, 2 * Math.PI);
        const image = new Image();
        image.src = pawnImages[pawn.color];
        image.onload = function () {
            context.drawImage(image, x - 17, y - 15, 35, 30);
        };
        return touchableArea;
    };

    const handleCanvasClick = event => {
        if (!nowMoving || rolledNumber === null) {
            console.warn('Pawn interaction blocked: The die has not been rolled yet.');
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // Ajustement des coordonnées avec un facteur d'échelle
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cursorX = (event.clientX - rect.left) * scaleX;
        const cursorY = (event.clientY - rect.top) * scaleY;

        console.log(`Cursor position - X: ${cursorX}, Y: ${cursorY}`);

        let moveExecuted = false;

        for (const pawn of pawns) {
            if (ctx.isPointInPath(pawn.touchableArea, cursorX, cursorY)) {
                console.log(`Pawn touched - ID: ${pawn._id}, Color: ${pawn.color}`);

                if (canPawnMove(pawn, rolledNumber)) {
                    socket.emit('game:move', pawn._id);
                    moveExecuted = true;
                    break;
                } else {
                    console.warn(`Pawn cannot move: ${pawn._id}`);
                }
            }
        }

        if (!moveExecuted) {
            console.warn('No valid pawn interaction detected.');
        }

        setHintPawn(null);
    };

    const handleMouseMove = event => {
        if (!nowMoving || !rolledNumber) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // Ajustement des coordonnées avec un facteur d'échelle
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cursorX = (event.clientX - rect.left) * scaleX;
        const cursorY = (event.clientY - rect.top) * scaleY;

        canvas.style.cursor = 'default';
        for (const pawn of pawns) {
            if (
                ctx.isPointInPath(pawn.touchableArea, cursorX, cursorY) &&
                player.color === pawn.color &&
                canPawnMove(pawn, rolledNumber)
            ) {
                const pawnPosition = getPositionAfterMove(pawn, rolledNumber);
                if (pawnPosition) {
                    canvas.style.cursor = 'pointer';
                    if (hintPawn && hintPawn.id === pawn._id) return;
                    setHintPawn({ id: pawn._id, position: pawnPosition, color: 'grey' });
                    return;
                }
            }
        }
        setHintPawn(null);
    };

    useEffect(() => {
        const rerenderCanvas = () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const image = new Image();
            image.src = mapImage;
            image.onload = function () {
                ctx.drawImage(image, 0, 0);
                pawns.forEach((pawn, index) => {
                    pawns[index].touchableArea = paintPawn(ctx, pawn);
                });
                if (hintPawn) {
                    paintPawn(ctx, hintPawn);
                }
            };
        };
        rerenderCanvas();
    }, [hintPawn, pawns]);

    return (
        <canvas
            className='canvas-container'
            width={460}
            height={460}
            ref={canvasRef}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
        />
    );
};

export default Map;
