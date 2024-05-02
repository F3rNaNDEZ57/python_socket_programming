from flask import Flask
from flask_socketio import SocketIO, emit, join_room, leave_room
import pyodbc

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

def get_db_connection():
    return pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=149.28.141.230;DATABASE=chatapptest;UID=sa;PWD=2002JaN03KAV')

@socketio.on('check_register')
def handle_check_register(data):
    username = data['username']
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT UserID FROM Users WHERE Username = ?", (username,))
        user = cursor.fetchone()
        if user:
            emit('register_response', {'success': True, 'user_id': user[0], 'username': username})
        else:
            cursor.execute("INSERT INTO Users (Username) OUTPUT INSERTED.UserID VALUES (?)", (username,))
            user_id = cursor.fetchone()[0]
            conn.commit()
            emit('register_response', {'success': True, 'user_id': user_id, 'username': username})
    except Exception as e:
        print("An error occurred:", e)
        emit('register_response', {'error': 'Registration failed'})
    finally:
        cursor.close()
        conn.close()

def ensure_room_exists(room_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT RoomID FROM Rooms WHERE RoomName = ?", (room_name,))
    room = cursor.fetchone()
    if not room:
        cursor.execute("INSERT INTO Rooms (RoomName) OUTPUT INSERTED.RoomID VALUES (?)", (room_name,))
        conn.commit()
        room_id = cursor.fetchone()[0]
    else:
        room_id = room[0]
    cursor.close()
    conn.close()
    return room_id

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    room_id = ensure_room_exists(room)  # Ensure room exists
    join_room(room)

    # Connect to the database and fetch the last 50 messages for the room
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT TOP 50 m.MessageText, u.Username 
            FROM Messages m
            JOIN Users u ON u.UserID = m.UserID
            WHERE m.RoomID = ? 
            ORDER BY m.MessageID DESC
        """, (room_id,))
        messages = [{'message': msg[0], 'username': msg[1]} for msg in cursor.fetchall()]
        # Send messages and room join status
        emit('room_status', {'msg': f'{username} has joined {room}'}, room=room)
        emit('load_messages', {'messages': messages}, room=room)
    except Exception as e:
        print("An error occurred while fetching messages:", e)
        emit('error', {'error': 'Failed to fetch messages'})
    finally:
        cursor.close()
        conn.close()


@socketio.on('send_message')
def handle_send_message(data):
    try:
        user_id = data.get('user_id')
        if not user_id:
            emit('error', {'error': 'User ID is missing'})
            return

        room_id = ensure_room_exists(data['room'])
        message = data['message']

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO Messages (UserID, RoomID, MessageText) VALUES (?, ?, ?)", (user_id, room_id, message))
        conn.commit()
        emit('receive_message', {'message': message, 'username': data['username']}, room=data['room'])
    except pyodbc.IntegrityError as e:
        print("An integrity error occurred:", e)
        emit('error', {'error': 'User or room does not exist'})
    except Exception as e:
        print("An unexpected error occurred:", e)
        emit('error', {'error': 'An unexpected error occurred during message sending'})
    finally:
        cursor.close()
        conn.close()


@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    emit('room_status', {'msg': f'{username} has left {room}'}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)
