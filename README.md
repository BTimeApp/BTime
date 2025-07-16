# BTime
BTime is a web application for social/competitive online cubing.

## Features
BTime is in development. New features coming soon!

## Development
These are basic instructions for hosting the BTime webapp locally.

#### External Dependency Setup
Download and install both `Node.js` and `npm` on your machine. [This link](https://nodejs.org/en/download) should work.

You will also need to separately [install MongoDB](https://www.mongodb.com/docs/manual/installation/) on your machine. Make sure the [MongoDB daemon](https://www.mongodb.com/docs/manual/reference/program/mongod/) is active when you want to run the dev server (otherwise `npm run dev` will just hang for a little while).

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
npm install
```

Finally, run
```bash
npm run dev
```
on the terminal. If all goes well, you should eventually see something like 
```
> Server listening on http://0.0.0.0:8080
```
This means the webapp is running on your local machine!

You can view BTime on [http://0.0.0.0:8080](http://0.0.0.0:8080). Others on your local network can also use the url `http://[your_ip]:8080`to access the site if you've configured your machine's firewall correctly.


## Licenses
This project uses [icons.cubing.net](https://icons.cubing.net/) icons, which is allowed under the MIT License.