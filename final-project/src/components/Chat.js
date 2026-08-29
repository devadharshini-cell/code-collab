import React, { useEffect } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import ACTIONS from '../Actions';

// Uses the *shared* room socket (already connected + joined by Editorpage)
// instead of opening a second connection, so messages are scoped to this
// room's socket.io room rather than broadcast globally.
const Chat = ({ socketRef, roomId, username }) => {
	const [chat, setChat] = useState([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const socket = socketRef?.current;
		if (!socket) return;

		const onMessage = ({ name, message }) => {
			setChat((prev) => [...prev, { name, message }]);
		};
		// Firestore-backed history for this room, sent once right after JOIN.
		const onHistory = (history) => {
			if (Array.isArray(history)) setChat(history);
		};

		socket.on('message', onMessage);
		socket.on(ACTIONS.CHAT_HISTORY, onHistory);

		return () => {
			socket.off('message', onMessage);
			socket.off(ACTIONS.CHAT_HISTORY, onHistory);
		};
	}, [socketRef]);

	const onMessageSubmit = (e) => {
		e.preventDefault();
		const trimmed = message.trim();
		if (!trimmed || !socketRef?.current) return;
		socketRef.current.emit('message', { roomId, name: username, message: trimmed });
		setMessage('');
	};

	const renderChat = () => {
		return chat.map(({ name, message }, index) => (
			<div key={index}>
				<h3 className='text-name'>
					{name}: <span className='text-message'>{message}</span>
				</h3>
			</div>
		));
	};

	return (
		<>
			<div className="render-chat">
				<h3 style={{ color: 'white', textAlign: 'center', fontFamily: '\'Baloo Bhaijaan 2\' , cursive', borderBottom: '1px solid white', margin: '1rem' }}>Chat Log</h3>
				{renderChat()}
			</div>
			<div className='textbox-message'>
				<InputGroup style={{ width: '100%' }} className="mb-3">
					<Form.Control
						name="message"
						type="text"
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') onMessageSubmit(e); }}
						value={message}
						label="Message"
						placeholder="Message"
					/>
					<Button onClick={onMessageSubmit} style={{ boxShadow: 'none', backgroundColor: '#4d67c3', border: 'none' }} id="button-addon2">
						Send
					</Button>
				</InputGroup>
			</div>
		</>
	);
};

export default Chat;
