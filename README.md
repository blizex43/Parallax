# Parallax

Parallax is a Roblox TypeScript project built with [Flamework](https://flamework.fireboltofdeath.dev/docs/). It includes reusable client and server systems, utilities, and tools to help get a game started.

## Quick start

Install the dependencies and build the project:

```bash
npm install
npm run build
```

Useful commands:

```bash
npm run watch       # Rebuild when files change
npm run build-place # Build the Roblox place file
npm test            # Build the place and run tests
```

Rokit manages the project tools (including Rojo and Lune); the build script sets them up when needed.

## Libraries

- `@rbxts/firebase`
- `@rbxts/ez-log`
- `@rbxts/lazy`
- `@rbxts/lazy-iterator`
- `@rbxts/flamework-meta-utils`
- `@rbxts/array-utils`
- `@rbxts/instance-utility`
- `@rbxts/wave`
- `@rbxts/runit` — tests are located in `src/tests`
- `@rbxts/flamework-binary-serializer` — serializes tables and instances into buffers to reduce network data size. Serializers are exported in `shared/network.ts`; `@LinkSerializedRemote` automatically deserializes remote arguments.

## Features

- Snippets for Flamework controllers, services, components, UI components, and rUnit tests
- Client systems:
  - Mouse, character, and replica controllers
  - Camera switching, with default, first-person, aerial, fixed, and wall-flying cameras
  - Procedural camera/model animations: landing, mouse sway, and walk cycle
  - Iris control panel with performance, movement, and camera settings
  - UI animation components and visual effects, such as fading
- Server systems:
  - Cmdr custom commands
  - Firebase data API
  - Product and gamepass transaction handling
  - Automatic audio replication
- Utility functions and decorators for common tasks, including input binding, remote handling, cooldowns, memoization, retries, and benchmarking
- Lifecycle hooks for character and player changes, data loading/updates, and startup logging

## Project guide

- `src/client` — client controllers and components
- `src/server` — server services and components
- `src/shared` — code shared between client and server
- `src/tests` — project tests

## Setup notes

- **Firebase:** Configure a Realtime Database and set `FIREBASE_URL` and `FIREBASE_AUTH` in the `EnvironmentInfo` DataStore. Do not commit real credentials.
- **Developer permissions:** Add your Roblox user ID to the `DevID` enum in `src/shared/constants.ts`.
- **Indexing Studio children:** For assets placed in services such as `Workspace`, see the [Roblox-TS guide](https://roblox-ts.com/docs/guides/indexing-children#rbxts-object-to-tree-plugin-by-validark) for the optional `rbxts-object-to-tree` workflow.
- **React/Roact:** Not included; install it separately if your project needs it.

## Credits

The original Flamework template and its foundational systems were created by [Runic](https://github.com/R-unic) in [R-unic/flamework-template](https://github.com/R-unic/flamework-template). Parallax builds on that work. Thank you, Runic!
