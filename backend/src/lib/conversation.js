// Sorting makes the ID identical no matter who starts the DM
const dmId = (a, b) => "dm:" + [a, b].sort().join("_");
const roomId = (name) => "room:" + name.trim().toLowerCase();

module.exports = { dmId, roomId };