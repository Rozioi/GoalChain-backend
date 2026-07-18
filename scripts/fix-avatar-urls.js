const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../data/real-players.json");
const raw = fs.readFileSync(filePath, "utf-8");
let players = JSON.parse(raw);

const PINATA_BASE = "https://blush-giant-planarian-701.mypinata.cloud/ipfs/bafybeieu7xsxkynmjpxy3mvdwamll2xepbhcnyjedvnsmz5iawuuijgg4q";
const IPFS_BASE = "https://ipfs.io/ipfs/bafybeieu7xsxkynmjpxy3mvdwamll2xepbhcnyjedvnsmz5iawuuijgg4q";

let changed = 0;
for (const p of players) {
    if (p.avatar_path && p.avatar_path.startsWith(PINATA_BASE)) {
        const filename = p.avatar_path.replace(PINATA_BASE + "/", "");
        p.avatar_path = `${IPFS_BASE}/${filename}`;
        changed++;
    }
}

fs.writeFileSync(filePath, JSON.stringify(players, null, 2), "utf-8");
console.log(`Updated ${changed} avatar paths. Total players: ${players.length}`);
