// Shared in-memory store for 2PlayerChess rooms
// TODO: In production, use Redis or database for persistent room storage

let redisClient = null;

// Try to initialize Redis client if available
try {
  const redis = require('redis');
  
  // Only create Redis client if REDIS_URL is configured
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      redisClient = null; // Fallback to in-memory
    });
    
    redisClient.connect().then(() => {
      console.log('Connected to Redis for room storage');
    }).catch(err => {
      console.warn('Failed to connect to Redis:', err.message);
      redisClient = null; // Fallback to in-memory
    });
  }
} catch (err) {
  console.log('Redis not available, using in-memory storage');
}

// In-memory fallback storage
let chessRooms = {};

// Helper function to get rooms (from Redis or memory)
async function getRooms() {
  if (redisClient) {
    try {
      const keys = await redisClient.keys('chess_room:*');
      const rooms = {};
      
      for (const key of keys) {
        const roomData = await redisClient.get(key);
        if (roomData) {
          const roomCode = key.replace('chess_room:', '');
          rooms[roomCode] = JSON.parse(roomData);
        }
      }
      
      return rooms;
    } catch (err) {
      console.error('Error reading from Redis:', err);
      return chessRooms; // Fallback to in-memory
    }
  }
  
  return chessRooms;
}

// Helper function to set room (in Redis or memory)
async function setRoom(roomCode, roomData) {
  if (redisClient) {
    try {
      await redisClient.set(`chess_room:${roomCode}`, JSON.stringify(roomData));
      return;
    } catch (err) {
      console.error('Error writing to Redis:', err);
    }
  }
  
  chessRooms[roomCode] = roomData;
}

// Helper function to delete room
async function deleteRoom(roomCode) {
  if (redisClient) {
    try {
      await redisClient.del(`chess_room:${roomCode}`);
      return;
    } catch (err) {
      console.error('Error deleting from Redis:', err);
    }
  }
  
  delete chessRooms[roomCode];
}

// Helper function to get single room
async function getRoom(roomCode) {
  if (redisClient) {
    try {
      const roomData = await redisClient.get(`chess_room:${roomCode}`);
      return roomData ? JSON.parse(roomData) : null;
    } catch (err) {
      console.error('Error reading room from Redis:', err);
    }
  }
  
  return chessRooms[roomCode];
}

module.exports = {
  getRooms,
  setRoom,
  deleteRoom,
  getRoom
};

