# Wanna Play? — Mattel Playhouse web game

Pitch concept by Salt XC. Not an official Mattel or LA28 product.

A three.js walk-through of the Wanna Playhouse (LA28 XM deck, Nov 13) with a mini-game at every zone.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

Add `?skip` to the URL to jump straight into the world while developing.

## Deploy to Vercel

Push this folder to a GitHub repo, then import the repo at vercel.com/new. Vercel detects Vite on its own
(build command `npm run build`, output `dist`). No environment variables are needed.

## Controls

- Arrow keys or WASD: walk. Stand on a red burst, then Space or click to play.
- Club UNO: F blue, G green, H yellow, J red, Space wild.
- The Ultimate Race: Space to push off and boost on chevrons, A/D or arrows to steer.
- Dream Court: press, drag up toward the hoop, release.

## Layout

- `public/assets/playhouse.glb` — the activation, exported from `2026-11-12_MattelLA28_T1_O1_HWRingsTrack.blend`
  (visible objects only) and compressed with glTF-Transform (`optimize --texture-size 1024 --texture-compress webp --compress meshopt`).
- `src/world.js` — hub scene, player controller, zone triggers and colliders (positions are Blender ground coordinates).
- `src/avatar.js` — the code-built player figure, outfits and poses.
- `src/creator.js` — Fit For the Games character creator.
- `src/games/` — one file per game: `simone`, `photo`, `tee`, `race`, `uno`, `court`, `quiz`.
- `src/state.js` — character, tee, rings and best times, saved in the browser.
