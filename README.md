# BTime

BTime is a web application for social/competitive online cubing.

BTime is available at https://btime.app. The development version, https://dev.btime.app, will have more recent changes but may be more unstable.

## Notable Features

- Create and join rooms where users can race against each other, or just casually solve with others in real time.
- Custom racing modes: win the match by winning sets, and win sets by solving quickly!
  - Supported match formats: Best of, First to
  - Supported set formats: Best of, First to, Fastest of, Average of, Mean of
- Race alone or **in teams**! In teams mode, solve results are aggregated per team.
- Support for GAN Timer (hopefully, other bluetooth devices soon)
- View other users' times live as they happen while racing!

BTime is still in active development. New features coming soon!

## Development

If you're interested, the following are basic instructions for hosting the BTime webapp locally for development.

#### External Dependencies (install these on your own)

- `pnpm` (package management)
- `Node.js` (server runtime)
- `redis` (ephemeral data store)
- `mongodb` (database)

#### BTime Repo Setup

First, clone the repo.

(HTTPS)

```bash
git clone https://github.com/BTimeApp/BTime.git
```

(ssh)

```bash
git clone git@github.com:BTimeApp/BTime.git
```

Then, install node packages:

```bash
cd BTime
pnpm install
pnpm build-packages
```

Finally, run

```bash
pnpm dev-website
```

on the terminal. If all goes well, you should eventually see something like

```
> Server listening on http://0.0.0.0:8080
```

This means the webapp is running on your local machine!

In development, you can view BTime by directly connecting to the express server at [http://0.0.0.0:8080](http://0.0.0.0:8080) or through the vite server at [http://0.0.0.0:5173](http://0.0.0.0:5173). Note that you will need to set up your env development (read below) before you can do anything fun, though.

#### Setting up your env.development file

You will need to configure your own environment variables for development in the .env.development file. This includes wherever you set up your local ports/addresses for MongoDB and Redis.

BTime uses OAuth for login and currently only supports WCA OAuth. Go to the [WCA staging webite](https://staging.worldcubeassociation.org), log in, and create a new application with your WCA account. Use "public email" for the scope and use the provided callback url in `env.development` and copy the application ID and secret into the corresponding variables in `env.development`.

#### Making Changes

Do NOT try to push code to the `main` or `dev` branches. Please push your code in a separate branch and submit a pull request to merge into `dev`.
