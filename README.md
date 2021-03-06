# Mini DndD
This is a static single page app which adds some dnd features. It is for fun.

## Running
```
git clone <repo_url>
cd <git_directory>
npm install # Install npm packages
npx webpack # Generate dist files (add --watch to continuously refresh)
npm install http-server -g # Install server
http-server # Run server
```

Open `http://127.0.0.1:8080/dist/index.html` in your browser.

or use the following for auto-refresh while developing.
```
npm install live-server -g
live-server --wait=250 # Delay is needed to make sure webpack can finish running
```

## About
The entry point for the viewer code is found in `src/index.js`.
The example code is somewhat documented, but please feel free to reach out to info@meshconsultants.ca with any questions.

