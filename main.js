const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");

const isMac = process.platform === "darwin";
const isDev = process.env.NODE_ENV !== "production";

// Main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDev ? 1000 : 500,
    height: 600,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false, // Disable web security for local file access
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // open dev tools if in dev env

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
}

function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    title: "About",
    width: 400,
    height: 300,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    // webPreferences: {
    //   preload: path.join(__dirname, "preload.js"),
    //   nodeIntegration: true,
    //   contextIsolation: false,
    //   webSecurity: false, // Disable web security for local file access
    // },
  });
  aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));
}

// when app is ready, create the main window
app.on("ready", () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove variable from memory
  mainWindow.on("closed", () => (mainWindow = null));
});

//Menu template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: () => createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(isMac
    ? []
    : [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: () => createAboutWindow(),
            },
          ],
        },
      ]),
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggledevtools" },
          ],
        },
      ]
    : []),
];

// Respond to ipcRenderer events
ipcMain.on("image:resize", (e, options) => {
  console.log(options);
  options.dest = path.join(os.homedir(),"imageresizer");
  resizeImage(options);
});

async function resizeImage({ imgPath, height, width, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });
    // create filename
    const filename = path.basename(imgPath);

    // create destination folder if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    //write the resized image to the destination folder
    fs.writeFileSync(path.join(dest, filename), newPath);

    console.log("Image resized and saved to:", path.join(dest, filename));
    // send success message to renderer
    mainWindow.webContents.send("image:done");
    // open the destination folder
    shell.openPath(dest);
  } catch (error) {
    console.log("Error resizing image:", error);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

// Open a window if none are open (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
