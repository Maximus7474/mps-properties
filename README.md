# astrum-properties

## ToDo:
- Rework property entrance system:
  1. Check entrance:
    - Client -> Server CB: Checks if has access or not, if yes: return interior data, if no: add to doorbell pool and notify players inside
  2. Load IPL *or* Spawn shell (client side) from the received data:
    - Shell data will include: model, position (not offset), heading
  3. Let the user enter into the property:
    - Done server side to also set  his routing bucket and save him as being inside 

## Convars
```bash
set properties:startingBucket 100
set properties:bucketGaps 1
```

## Getting Started

### Node.js v18+

Install any LTS release of [`Node.js`](https://nodejs.org/) from v18.

### pnpm

Install the [`pnpm`](https://pnpm.io/installation) package manager globally.

```
npm install -g pnpm
```

Navigate to the root directory and execute the following command to install dependencies.

```
pnpm install
```

## Development

Use `pnpm watch` to actively rebuild modified files while developing the resource.

During web development, use `pnpm web:dev` to start vite's webserver and watch for changes.

## Build

Use `pnpm build` to build all project files in production mode.

To build and create GitHub releases, tag your commit (e.g. `v1.0.0`) and push it.

## Layout

- [/dist/](dist)
  - Compiled project files.
- [/scripts/](scripts)
  - Scripts used in the development process, but not part of the compiled resource.
- [/src/](src)
  - Project source code.
- [/static/](static)
  - Files to include with the resource that aren't compiled or loaded (e.g. config).
