const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/binController");


// ======================================================
// RECYCLE DATA FROM ESP32
// ======================================================

router.post(
    "/recycle",
    controller.receiveData
);


// ======================================================
// DASHBOARD DATA
// ======================================================

router.get(
    "/data",
    controller.getData
);


// ======================================================
// RESET
// ======================================================

router.post(
    "/reset",
    controller.reset
);

router.get(
    "/check-reset",
    controller.checkReset
);


// ======================================================
// SELL
// ======================================================

router.post(
    "/sell",
    controller.sell
);


// ======================================================
// PRICE
// ======================================================

router.post(
    "/set-price",
    controller.setPrice
);

router.get(
    "/pet-price",
    controller.getPetPrice
);


// ======================================================
// LID
// ======================================================

// Manual/API control
router.post(
    "/lid",
    controller.controlLid
);

// ESP32 checks whether it should open
router.get(
    "/lid",
    controller.checkLid
);

// Dashboard / YOLO triggers lid
router.post(
    "/trigger-lid",
    controller.triggerLid
);


// ======================================================
// IMAGE / YOLO
// ======================================================

router.post(
    "/upload",
    controller.uploadImage
);


// ======================================================
// HISTORY
// ======================================================

router.get(
    "/history",
    controller.getHistory
);

router.delete(
    "/history",
    controller.deleteHistory
);


// ======================================================
// TEST STATUS
// ======================================================

router.get(
    "/status",
    (req, res) => {

        res.json({

            success: true,

            server: "SmartBin Backend",

            status: "online",

            time: new Date()

        });

    }
);


module.exports = router;