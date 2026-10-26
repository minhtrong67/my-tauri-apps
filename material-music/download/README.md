# Download folder

`npm run build` builds the installer and copies it here automatically as

```
download/Material-Music_<version>_x64-setup.exe
```

The landing page (`index.html`) links to that exact name (currently `Material-Music_1.3.0_x64-setup.exe`),
so after each build just deploy the project folder again. The app does not update itself:
users download the new installer from the landing page and run it.

`npm run portable` (after `npm run build`) also creates `Material-Music_<version>_x64-portable.zip` here.
