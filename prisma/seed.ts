import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding tasks...");

  const tasks = [
    {
      title: "Welcome to the Club",
      description: "Win your first match to start your career!",
      type: "INTRO",
      objective: "WINS",
      goal: 1,
      reward: 1000,
      icon: "trophy",
      isActive: true
    },
    {
      title: "Daily Scorer",
      description: "Score 5 goals today.",
      type: "DAILY",
      objective: "GOALS",
      goal: 5,
      reward: 500,
      icon: "ball",
      isActive: true
    },
    {
      title: "Wall of Defense",
      description: "Keep 2 clean sheets in matches.",
      type: "DAILY",
      objective: "CLEAN_SHEETS",
      goal: 2,
      reward: 800,
      icon: "shield",
      isActive: true
    },
    {
      title: "Season Veteran",
      description: "Play 50 matches in this season.",
      type: "SEASON",
      objective: "MATCHES",
      goal: 50,
      reward: 5000,
      icon: "medal",
      isActive: true
    },
    {
      title: "Recruiter",
      description: "Invite 3 friends to join the game.",
      type: "INTRO",
      objective: "REFERRALS",
      goal: 3,
      reward: 1500,
      icon: "people",
      isActive: true
    },
  ];

  for (const taskData of tasks) {
    const { title, description, type, objective, goal, reward, icon, isActive } = taskData;
    const id = title.toLowerCase().replace(/ /g, "-");
    await prisma.task.upsert({
      where: { id },
      update: { title, description, type: type as any, objective: objective as any, goal, reward, icon, isActive },
      create: {
        id,
        title,
        description,
        type: type as any,
        objective: objective as any,
        goal,
        reward,
        icon,
        isActive
      },
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
