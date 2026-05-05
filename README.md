# Football Manager Backend

Modern football management simulation backend built with Fastify, Prisma, and PostgreSQL.

## Features
- **User Management**: Telegram-integrated authentication and profile management.
- **Draft System**: Initial team building with player selection.
- **Scouting System**: 3-tier scouting (Common, Pro, Master) with balanced OVR generation.
- **Match Engine**: Simulation of football matches with detailed event logging.
- **Training**: Player development system with stat boosts.
- **Rental System**: Peer-to-peer player rental market.
- **Seasons & Events**: Competitive league structures and special events.

## Tech Stack
- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/football"
   JWT_SECRET="your_secret"
   ```
4. Run database migrations:
   ```bash
   npx prisma db push
   ```

### Development
Run the server in development mode:
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Module Structure
- `src/modules/scouting`: Tiered player discovery logic.
- `src/modules/player`: Core player stats and rental logic, including player import from external API.
- `src/modules/match`: Match simulation and matchmaking.
- `src/modules/team`: Squad management and lineup configuration.

## Player Import API
The `FootballApiService` class in `src/modules/player/football-api.service.ts` provides methods for importing players from an external API.

### Methods
1. **fetchPlayersFromApi(leagueId: number, season: number, page: number = 1)**
   - Fetches players from the external API for a specific league and season.
   - Parameters:
     - `leagueId`: ID of the league.
     - `season`: Season year.
     - `page`: Page number for paginated results (default: 1).
   - Returns: JSON response from the API.

2. **importPlayersForLeague(leagueId: number, season: number = 2024)**
   - Imports players for a specific league and season into the database.
   - Parameters:
     - `leagueId`: ID of the league.
     - `season`: Season year (default: 2024).
   - Saves player data to the database using Prisma.

3. **populateInitialDatabase(count: number = 68000)**
   - Generates and populates the database with a specified number of players.
   - Parameters:
     - `count`: Number of players to generate (default: 68,000).

### Notes
- The API key for the external service is configured via the `FOOTBALL_API_KEY` environment variable.
- Ensure the database is properly set up before running the import.
