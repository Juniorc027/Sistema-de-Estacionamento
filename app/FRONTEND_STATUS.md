# Frontend Status - Parking System

## Overview
Frontend for the parking system with real-time updates and 3D visualization. It consumes the .NET API and SignalR hub.

## Stack
- Next.js 14.2.5 (App Router)
- React 18.3.1
- React Three Fiber 8.17.0 + drei 9.114.0
- SignalR client 8.0.7
- Tailwind CSS

## How It Works
- On load, it fetches parking spots from the REST API.
- It opens a SignalR connection and listens for SpotUpdated events.
- The 3D view renders 20 spots (top row 001-010, bottom row 011-020).
- Spot colors change by status in real time.

## Run Locally
1. Install deps: npm install
2. Start: npm run dev
3. Open: http://localhost:3000

Backend must be running at http://localhost:5167.

## Environment Variables
Optional:
- NEXT_PUBLIC_API_URL (default: http://localhost:5167)
- NEXT_PUBLIC_SIGNALR_URL (default: http://localhost:5167/hubs/parking)

## Project Structure
- src/app/layout.tsx: Root layout
- src/app/page.tsx: Main page, data fetch, SignalR hook, 3D view
- src/components/ParkingLot3D.tsx: 3D scene, camera, lights, layout, overlay UI
- src/components/ParkingSpot3D.tsx: Individual spot mesh with status color
- src/services/api.ts: REST calls for parking spots
- src/services/signalr.ts: SignalR connection wrapper
- src/hooks/useSignalR.ts: React hook to manage connection
- src/types/parking.ts: TypeScript types and enums

## Endpoints Used
- GET /api/parkingspots/by-lot/{parkingLotId}
- GET /api/parkingspots/{id}
- SignalR hub: /hubs/parking (event: SpotUpdated)

## Layout Details (3D)
- Orthographic top-down camera
- Base plane: 8 x 6 units
- Corridor: 7 x 0.6 units
- Spot size: 0.55 x 0.1 x 1.0 units
- Positions calculated by spotNumber

## Current Status
Working locally with Next 14 + React 18 and React Three Fiber.

## Known Constraints
- If backend is down, frontend shows fetch errors and SignalR fails.
- 3D view is client-only (SSR disabled via dynamic import).

## Pending/Optional Improvements
- Remove unused Spot3DPosition interface (not used anymore)
- Add loading skeleton for 3D scene
- Add retries/backoff for REST calls
- Add error boundary around 3D canvas
- Move parking lot ID to env/config

## Repo Notes
This frontend should live in its own Git repository. The backend repo contains another old frontend folder that is kept as backup.
