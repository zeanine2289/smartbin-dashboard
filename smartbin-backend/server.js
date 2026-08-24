const express = require("express");
const path = require("path");
const cors = require("cors");
const os = require("os");

const app = express();

const PORT = 3000;
const HOST = "0.0.0.0";

// ======================================================
// FIND LOCAL IPv4
// ======================================================

function getLocalIP() {

    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {

        for (const net of interfaces[name]) {

            if (
                net.family === "IPv4" &&
                !net.internal
            ) {
                return net.address;
            }
        }
    }

    return "127.0.0.1";
}

const LOCAL_IP = getLocalIP();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json({
    limit: "20mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "20mb"
}));

// ======================================================
// API ROUTES
// ======================================================

const apiRoutes = require("./routes/api");

app.use("/api", apiRoutes);

// ======================================================
// FRONTEND
// ======================================================

const frontendPath =
    path.join(__dirname, "frontend");

app.use(
    express.static(frontendPath)
);

// ======================================================
// ROOT
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});

// ======================================================
// 404 API
// ======================================================

app.use("/api", (req, res) => {

    res.status(404).json({

        success: false,

        message: "API endpoint not found"

    });

});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

    console.error(
        "❌ SERVER ERROR:",
        err
    );

    res.status(500).json({

        success: false,

        message: "Internal server error",

        error: err.message

    });

});

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    HOST,
    () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "♻️ SMARTBIN SERVER"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `🌐 Local:   http://localhost:${PORT}`
        );

        console.log(
            `📡 LAN:     http://${LOCAL_IP}:${PORT}`
        );

        console.log(
            `📡 API:     http://${LOCAL_IP}:${PORT}/api`
        );

        console.log(
            `📊 Data:    http://${LOCAL_IP}:${PORT}/api/data`
        );

        console.log(
            `📦 History: http://${LOCAL_IP}:${PORT}/api/history`
        );

        console.log(
            "=========================================="
        );

        console.log(
            "✅ Server is ready for ESP32"
        );

        console.log(
            "=========================================="
        );

        console.log("");

    }
);