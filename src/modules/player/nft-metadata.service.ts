import { Player } from "@prisma/client";

export const nftMetadataService = {
  generatePlayerMetadata(player: Player) {
    const attributes = [
      { trait_type: "Position", value: player.position },
      { trait_type: "Role", value: player.role },
      { trait_type: "Style", value: player.style },
      { trait_type: "Overall Rating", value: player.overallRating },
      { trait_type: "Pace", value: player.pace },
      { trait_type: "Shooting", value: player.shooting },
      { trait_type: "Passing", value: player.passing },
      { trait_type: "Dribbling", value: player.dribbling },
      { trait_type: "Defending", value: player.defending },
      { trait_type: "Physical", value: player.physical },
      { trait_type: "Nationality", value: player.nationality },
      { trait_type: "Club", value: player.club },
      { trait_type: "Age", value: player.age },
    ];

    return {
      name: `${player.name} ${player.surname || ""}`.trim(),
      description: `Professional Football Player Card - ${player.position} (${player.overallRating} OVR)`,
      image: player.imageUrl || "",
      attributes,
    };
  },
};
