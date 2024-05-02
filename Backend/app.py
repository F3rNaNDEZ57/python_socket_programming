from flask import Flask
from flask_socketio import SocketIO, emit, join_room, leave_room
import pyodbc

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

def get_db_connection():
    return pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=149.28.141.230;DATABASE=chatapptest;UID=sa;PWD=2002JaN03KAV')

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    emit('room_status', {'msg': f'{username} has joined {room}'}, room=room)

@socketio.on('send_message')
def handle_send_message(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO Messages (UserID, RoomID, MessageText) VALUES (?, ?, ?)", (data['user_id'], data['room_id'], data['message']))
    conn.commit()
    cursor.close()
    conn.close()
    emit('receive_message', data, room=data['room'])

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    emit('room_status', {'msg': f'{username} has left {room}'}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)
