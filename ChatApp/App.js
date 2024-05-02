import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, ScrollView } from 'react-native';
import io from 'socket.io-client';

const socket = io("https://b38b-103-247-51-129.ngrok-free.app");

const ChatRoom = () => {
    const [room, setRoom] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on('receive_message', (data) => {
            setMessages(prevMessages => [...prevMessages, data]);
        });

        return () => socket.off('receive_message');
    }, []);

    const joinRoom = () => {
        socket.emit('join', { room, username });
    };

    const sendMessage = () => {
        const messageData = {
            room,
            message,
            username
        };
        socket.emit('send_message', messageData);
        setMessage('');
    };

    return (
        <View style={{ flex: 1, padding: 10, marginBottom: 100 }}>
            <TextInput value={username} onChangeText={setUsername} placeholder="Username" style={{ height: 40, borderColor: 'gray', borderWidth: 1 ,marginTop : 200}} />
            <TextInput value={room} onChangeText={setRoom} placeholder="Room" style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginTop: 5 }} />
            <Button title="Join Room" onPress={joinRoom} />
            <ScrollView style={{ flex: 1, marginTop: 5 }}>
                {messages.map((msg, index) => (
                    <Text key={index}>{msg.username}: {msg.message}</Text>
                ))}
            </ScrollView>
            <TextInput value={message} onChangeText={setMessage} placeholder="Message" style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginTop: 5 }} />
            <Button title="Send" onPress={sendMessage} />
        </View>
    );
};

export default ChatRoom;
