const room = HBInit({
  roomName: "Orhan'ın Rank Odası",
  maxPlayers: 12,
  public: false,        // test aşamasında gizli oda
  noPlayer: true,       // host odada oyuncu olarak görünmesin
  token: "window.HAXBALL_TOKEN"
});

// Oda linki hazır olunca konsola yaz
room.onRoomLink = (link) => console.log("Oda linki:", link);

// Biri girince karşıla
room.onPlayerJoin = (player) => {
  room.sendAnnouncement(`Hoş geldin ${player.name}! Komutlar için !help yaz.`, player.id, 0x00FF00, "bold");
};

// Chat komutları
room.onPlayerChat = (player, message) => {
  if (message === "!help") {
    room.sendAnnouncement("Komutlar: !help, !rol <gk|df|os|kanat|forvet>", player.id, 0xFFFF00);
    return false; // false dönersen mesaj herkese gösterilmez
  }

  if (message.startsWith("!rol")) {
    const rol = message.split(" ")[1];
    const roller = ["gk", "df", "os", "kanat", "forvet"];
    if (roller.includes(rol)) {
      room.sendAnnouncement(`${player.name} artık ${rol.toUpperCase()}!`, null, 0x00BFFF);
    } else {
      room.sendAnnouncement("Geçersiz rol. Seçenekler: " + roller.join(", "), player.id, 0xFF0000);
    }
    return false;
  }
};