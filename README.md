# Football Manager Backend

Modern football management game backend built with Fastify and Prisma.

## Tech Stack
- **Framework:** [Fastify](https://www.fastify.io/) (High performance, low overhead)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Language:** TypeScript
- **Telegram Integration:** [GrammY](https://grammy.dev/)
- **Validation:** JSON Schema (Fastify native)

  
## Project Structure
```
src/
├── bot/            # Telegram Bot implementation
├── config/         # Environment and global constants
├── modules/        # Business logic (Feature-based)
│   ├── auth/       # JWT and Telegram Auth
│   ├── match/      # Match Engine and Simulation logic
│   ├── player/     # Player stats, generation and rental
│   ├── team/       # Team management and formations
│   └── user/       # User profiles and referrals
├── plugins/        # Fastify plugins (Prisma, Auth, CORS)
└── utils/          # Shared helper functions
```

## Core Modules Overview

### Match Engine (`src/modules/match`)
The heart of the game. Handles:
- Real-time and simulated matches.
- Event generation (goals, cards, injuries).
- Player fatigue and performance scaling.
- Re-simulation logic for tactical changes.

### Player Generation (`src/modules/player`)
Sophisticated algorithm for creating realistic football players:
- 11+ positions (GK, CB, LW, etc.).
- Detailed attributes (Pace, Shooting, Passing, etc.).
- Rarity levels and potential growth.

### Rental System (`src/modules/player/rental`)
Marketplace logic allowing users to rent out their players for TON or coins.

## Getting Started

1. **Prerequisites:**
   - Node.js 18+
   - PostgreSQL

2. **Setup:**
   ```bash
   cp .env.example .env
   npm install
   ```

3. **Database:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Development:**
   ```bash
   npm run dev
   ```

## Development Conventions
- **Controllers:** Handle HTTP requests and responses.
- **Services:** Contain pure business logic and DB interactions.
- **Routes:** Define API endpoints and schemas.
- **Types:** Centralized in `src/types` or local to modules.
