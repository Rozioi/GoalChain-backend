const fs = require("fs");
const path = require("path");

const COUNTRY_MAP = {
  Portugal: "PT",
  Argentina: "AR",
  France: "FR",
  Norway: "NO",
  Belgium: "BE",
  England: "GB",
  Brazil: "BR",
  Netherlands: "NL",
  Germany: "DE",
  Spain: "ES",
  Italy: "IT",
  Poland: "PL",
  Croatia: "HR",
  Senegal: "SN",
  Egypt: "EG",
  "South Korea": "KR",
  Uruguay: "UY",
  Belarus: "BY",
  Ukraine: "UA",
  Colombia: "CO",
  Morocco: "MA",
  Cameroon: "CM",
  Nigeria: "NG",
  "Ivory Coast": "CI",
  Mali: "ML",
  Algeria: "DZ",
  Ghana: "GH",
  Tunisia: "TN",
  Turkey: "TR",
  Denmark: "DK",
  Sweden: "SE",
  Switzerland: "CH",
  Austria: "AT",
  Serbia: "RS",
  Wales: "GB",
  Scotland: "GB",
  Ireland: "IE",
  Japan: "JP",
  Australia: "AU",
  Canada: "CA",
  "United States": "US",
  Mexico: "MX",
  Ecuador: "EC",
  Venezuela: "VE",
  Chile: "CL",
  Paraguay: "PY",
  Peru: "PE",
  Greece: "GR",
  "Czech Republic": "CZ",
  Slovakia: "SK",
  Hungary: "HU",
  Romania: "RO",
  Bulgaria: "BG",
  Russia: "RU",
  Georgia: "GE",
  Slovenia: "SI",
  Montenegro: "ME",
  "North Macedonia": "MK",
  Kosovo: "XK",
  Finland: "FI",
  Iceland: "IS",
  Bosnia: "BA",
  Albania: "AL",
  Israel: "IL",
  "Saudi Arabia": "SA",
  Iran: "IR",
  "South Africa": "ZA",
  "DR Congo": "CD",
  Guinea: "GN",
  "Burkina Faso": "BF",
  Zambia: "ZM",
  Congo: "CG",
  Angola: "AO",
  "Sierra Leone": "SL",
  Gabon: "GA",
  Montenegro: "ME",
  // Добавьте остальные по необходимости — для неизвестных возьмём первые 2 буквы
};

const exPath = path.resolve(__dirname, "../data/ex.json");
const outputPath = path.resolve(__dirname, "../data/real-players.json");

const raw = fs.readFileSync(exPath, "utf-8");
const players = JSON.parse(raw);

const transformed = players.map((p) => {
  const ovr = parseInt(p.overall_rating) || 50;
  const id = `${p.name.toLowerCase()}_${p.surname.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  const rawCountry = p.country?.trim() || "";
  const country = COUNTRY_MAP[rawCountry] || rawCountry.slice(0, 2).toUpperCase() || "XX";

  // GK получают высокий goalkeeping, полевые — низкий
  const isGk = p.position === "GK";
  const goalkeeping = isGk
    ? Math.min(99, Math.max(ovr - 5, 40))
    : Math.min(20, Math.max(5, Math.floor(Math.random() * 12) + 5));

  return {
    id,
    name: p.name,
    surname: p.surname,
    ovr,
    pace: parseInt(p.pace) || 50,
    shooting: parseInt(p.shooting) || 50,
    passing: parseInt(p.passing) || 50,
    dribbling: parseInt(p.dribbling) || 50,
    defending: parseInt(p.defending) || 50,
    physical: parseInt(p.physical) || 50,
    goalkeeping,
    avatar_path: `https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7lu3gr2g7u2aefw3w6a5q4q4q4q4q4q4q4q4q4/${id}.png`,
    weight: parseInt(p.weight_kg) || 75,
    height: parseInt(p.height_cm) || 182,
    weakFoot: parseInt(p.weak_foot) || 3,
    foot: p.foot?.toLowerCase() === "left" ? "Left" : "Right",
    club: p.club_name,
    country,
    position: p.position,
    age: parseInt(p.age) || 22,
  };
});

// Фиксируем random — делаем детерминированным через seed на основе id
const seedrandom = require("seedrandom");
for (const player of transformed) {
  const rng = seedrandom(player.id);
  if (player.position !== "GK") {
    player.goalkeeping = Math.min(20, Math.max(5, Math.floor(rng() * 12) + 5));
  }
}

fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2), "utf-8");
console.log(`Transformed ${transformed.length} players to ${outputPath}`);
