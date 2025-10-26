// Shared in-memory store for 2PlayerChess rooms
// TODO: In production, use Redis or database for persistent room storage

let chessRooms = {};

module.exports = {
  getRooms: () => chessRooms,
  setRoom: (roomCode, roomData) => {
    chessRooms[roomCode] = roomData;
  },
  deleteRoom: (roomCode) => {
    delete chessRooms[roomCode];
  },
  getRoom: (roomCode) => {
    return chessRooms[roomCode];
  }
};

