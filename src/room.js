// Biri girince: veritabanından kaydını getir (yoksa oluşturulur) ve karşıla
room.onPlayerJoin = async (player) => {
  const veri = await window.dbGetPlayer(player.auth, player.name);
  console.log("Veritabanından gelen:", JSON.stringify(veri));
  room.sendAnnouncement(`Hoş geldin ${player.name}! XP: ${veri.xp}. Komutlar için !help yaz.`, player.id, 0x00FF00, "bold");
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