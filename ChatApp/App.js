import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, ScrollView } from 'react-native';
import io from 'socket.io-client';

const socket = io("https://7886-103-247-51-129.ngrok-free.app");

const App = () => {
    const [stage, setStage] = useState(1); // 1 = Username, 2 = Room, 3 = Chat
    const [username, setUsername] = useState('');
    const [room, setRoom] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        socket.on('register_response', response => {
            if (response.error) {
                alert(response.error);
            } else {
                setUserId(response.user_id);
                setStage(2); // Proceed to room stage
            }
        });

        socket.on('room_status', response => {
            alert(response.msg);
            setStage(3); // Proceed to chat stage
        });

        socket.on('load_messages', data => {
            setMessages(data.messages); // Load past messages upon room entry
        });

        socket.on('receive_message', data => {
            setMessages(prevMessages => [...prevMessages, data]); // Append new messages
        });

        return () => {
            socket.off('register_response');
            socket.off('room_status');
            socket.off('load_messages');
            socket.off('receive_message');
        };
    }, []);

    const handleUsernameSubmit = () => {
        if (!username.trim()) {
            alert("Username cannot be empty.");
            return;
        }
        socket.emit('check_register', { username });
    };

    const handleRoomJoin = () => {
        if (!room.trim()) {
            alert("Room cannot be empty.");
            return;
        }
        socket.emit('join', { room, username });
    };

    const handleSendMessage = () => {
        if (!message.trim()) return;
        if (!userId) {
            alert("User not identified. Please re-enter your username.");
            setStage(1);
            return;
        }
        socket.emit('send_message', { user_id: userId, username, message, room });
        setMessage('');
    };

    return (
        <View style={{ flex: 1, padding: 10, justifyContent: 'center', alignItems: 'center' }}>
            {stage === 1 && (
                <>
                    <TextInput
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Enter Username"
                        style={{ height: 40, borderColor: 'gray', borderWidth: 1, width: 200, marginBottom: 20 }}
                    />
                    <Button title="Submit Username" onPress={handleUsernameSubmit} />
                </>
            )}
            {stage === 2 && (
                <>
                    <TextInput
                        value={room}
                        onChangeText={setRoom}
                        placeholder="Enter Room"
                        style={{ height: 40, borderColor: 'gray', borderWidth: 1, width: 200, marginBottom: 20 }}
                    />
                    <Button title="Join Room" onPress={handleRoomJoin} />
                </>
            )}
            {stage === 3 && (
                <>
                    <ScrollView style={{ width: '100%', marginTop: 20, flex: 1 }}>
                        {messages.map((msg, index) => (
                            <Text key={index} style={{ textAlign: 'left', padding: 5, borderBottomWidth: 1, borderBottomColor: 'gray' }}>
                                {msg.username}: {msg.message}
                            </Text>
                        ))}
                    </ScrollView>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Type a message..."
                        style={{ height: 40, borderColor: 'gray', borderWidth: 1, width: '100%', marginTop: 10 }}
                    />
                    <Button title="Send Message" onPress={handleSendMessage}/>
                </>
            )}
        </View>
    );
};

export default App;
