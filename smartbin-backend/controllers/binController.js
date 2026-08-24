const fs = require("fs");
const path = require("path");
const axios = require("axios");

const data = require("../data/store");

// ======================================================
// PRICE FILE
// ======================================================

const priceFile = path.join(
    __dirname,
    "..",
    "price.json"
);

// ======================================================
// LID COMMAND
// ======================================================

let openCommand = false;

// ======================================================
// SAVE PRICE
// ======================================================

function savePrice() {

    try {

        fs.writeFileSync(
            priceFile,
            JSON.stringify({
                    pricePerKg: data.pricePerKg
                },
                null,
                4
            )
        );

    } catch (error) {

        console.error(
            "❌ Save price error:",
            error.message
        );

    }

}

// ======================================================
// LOAD PRICE
// ======================================================

function loadPrice() {

    try {

        if (!fs.existsSync(priceFile)) {

            savePrice();

            return;
        }

        const priceData =
            JSON.parse(
                fs.readFileSync(
                    priceFile,
                    "utf8"
                )
            );

        if (
            priceData.pricePerKg !== undefined &&
            !isNaN(priceData.pricePerKg)
        ) {

            data.pricePerKg =
                Number(priceData.pricePerKg);

        }

    } catch (error) {

        console.error(
            "❌ Load price error:",
            error.message
        );

    }

}

loadPrice();

// ======================================================
// RECEIVE DATA FROM ESP32
// ======================================================
//
// ESP32 ส่งน้ำหนักเป็น "กรัม"
//
// ตัวอย่าง:
//
// {
//     "weight": 0.56,
//     "isBottle": true
// }
//
// 0.56 = 0.56 กรัม
//
// Backend จะ:
// 1. เพิ่มจำนวนขวด +1
// 2. เพิ่มน้ำหนักรวม
// 3. คำนวณราคา
// 4. บันทึก History
//
// ======================================================

exports.receiveData = (req, res) => {

    try {

        const weight =
            Number(req.body.weight);

        const isBottle =
            req.body.isBottle === true ||
            req.body.isBottle === 1 ||
            req.body.isBottle === "true";

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "📥 ESP32 RECYCLE DATA"
        );

        console.log(
            "Weight:",
            weight,
            "g"
        );

        console.log(
            "Bottle:",
            isBottle
        );

        console.log(
            "======================================"
        );

        // ==================================================
        // ตรวจข้อมูล
        // ==================================================

        if (!isBottle ||
            !isFinite(weight) ||
            weight <= 0
        ) {

            console.log(
                "⚠️ Invalid recycle data - ignored"
            );

            return res.json({

                success: false,

                message: "Invalid recycle data",

                count: data.bottleCount,

                totalWeight: data.totalWeight,

                totalValue:
                    (
                        (data.totalWeight / 1000) *
                        data.pricePerKg
                    ),

                pricePerKg: data.pricePerKg

            });

        }

        // ==================================================
        // เพิ่มจำนวนขวด
        // ==================================================

        data.bottleCount += 1;

        // ==================================================
        // เพิ่มน้ำหนักรวม
        // ==================================================

        data.totalWeight += weight;

        // ==================================================
        // แปลงกรัม -> กิโลกรัมเพื่อคำนวณราคา
        // ==================================================

        const weightKg =
            weight / 1000;

        const transactionPrice =
            weightKg *
            data.pricePerKg;

        // ==================================================
        // HISTORY
        // ==================================================

        data.transactions.push({

            weight: weight,

            price: transactionPrice,

            time: new Date()

        });

        // ==================================================
        // LOG
        // ==================================================

        console.log(
            "🍾 Bottle added: +1"
        );

        console.log(
            "📦 Bottle Count:",
            data.bottleCount
        );

        console.log(
            "⚖️ Current Bottle:",
            weight.toFixed(2),
            "g"
        );

        console.log(
            "⚖️ Total Weight:",
            data.totalWeight.toFixed(2),
            "g"
        );

        console.log(
            "⚖️ Total Weight:",
            (
                data.totalWeight / 1000
            ).toFixed(4),
            "kg"
        );

        console.log(
            "💰 Current Price:",
            transactionPrice.toFixed(4),
            "THB"
        );

        console.log(
            "💰 Total Value:",
            (
                (data.totalWeight / 1000) *
                data.pricePerKg
            ).toFixed(4),
            "THB"
        );

        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success: true,

            message: "Recycle data received",

            // จำนวนขวด
            count: data.bottleCount,

            // น้ำหนักรวม "กรัม"
            totalWeight: data.totalWeight,

            // น้ำหนักขวดล่าสุด "กรัม"
            lastWeight: weight,

            // น้ำหนักรวม "กิโลกรัม"
            totalWeightKg: data.totalWeight / 1000,

            // ราคาขวดล่าสุด
            lastPrice: transactionPrice,

            // เงินรวม
            totalValue:
                (
                    (data.totalWeight / 1000) *
                    data.pricePerKg
                ),

            // ราคาต่อ kg
            pricePerKg: data.pricePerKg

        });

    } catch (error) {

        console.error(
            "❌ receiveData error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Receive data failed",

            error: error.message

        });

    }

};

// ======================================================
// GET DASHBOARD DATA
// ======================================================

exports.getData = (req, res) => {

    res.json({

        count: data.bottleCount,

        // น้ำหนักรวมเป็นกรัม
        weight: data.totalWeight,

        // น้ำหนักรวมเป็น kg
        weightKg: data.totalWeight / 1000,

        // เงินรวม
        price:
            (
                (data.totalWeight / 1000) *
                data.pricePerKg
            ),

        // ราคาต่อ kg
        pricePerKg: data.pricePerKg

    });

};

// ======================================================
// RESET
// ======================================================

exports.reset = (req, res) => {

    data.bottleCount = 0;

    data.totalWeight = 0;

    data.transactions = [];

    console.log(
        "🔄 Dashboard data reset"
    );

    res.json({

        success: true,

        message: "Reset success"

    });

};

// ======================================================
// SET PRICE
// ======================================================

exports.setPrice = (req, res) => {

    const price =
        Number(req.body.price);

    if (!isFinite(price) ||
        price <= 0
    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid price"

        });

    }

    data.pricePerKg =
        price;

    savePrice();

    console.log(
        "💰 Price updated:",
        price,
        "THB/kg"
    );

    res.json({

        success: true,

        message: "Price updated",

        newPrice: data.pricePerKg

    });

};

// ======================================================
// GET PRICE
// ======================================================

exports.getPetPrice = (req, res) => {

    res.json({

        pricePerKg: data.pricePerKg

    });

};

// ======================================================
// CONTROL LID
// ======================================================

exports.controlLid = (req, res) => {

    const action =
        req.body.action;

    if (action === "open") {

        openCommand = true;

    } else if (action === "close") {

        openCommand = false;

    }

    console.log(
        "🚪 Lid action:",
        action
    );

    res.json({

        success: true,

        action: action

    });

};

// ======================================================
// TRIGGER LID
// ======================================================

exports.triggerLid = (req, res) => {

    openCommand = true;

    console.log(
        "🚪 OPEN LID COMMAND"
    );

    res.json({

        success: true,

        message: "Lid triggered"

    });

};

// ======================================================
// ESP32 CHECK LID
// ======================================================

exports.checkLid = (req, res) => {

    if (openCommand) {

        openCommand = false;

        console.log(
            "📡 ESP32 received OPEN command"
        );

        return res.json({

            action: "open"

        });

    }

    res.json({

        action: "none"

    });

};

// ======================================================
// UPLOAD IMAGE -> YOLO
// ======================================================

exports.uploadImage = async(req, res) => {

    try {

        const chunks = [];

        req.on(
            "data",
            chunk => {

                chunks.push(chunk);

            }
        );

        req.on(
            "end",
            async() => {

                try {

                    const buffer =
                        Buffer.concat(chunks);

                    console.log("");
                    console.log(
                        "======================================"
                    );

                    console.log(
                        "📸 Image received:",
                        buffer.length,
                        "bytes"
                    );

                    console.log(
                        "======================================"
                    );

                    // ==================================================
                    // SAVE IMAGE
                    // ==================================================

                    const imagePath =
                        path.join(
                            __dirname,
                            "..",
                            "image.jpg"
                        );

                    fs.writeFileSync(
                        imagePath,
                        buffer
                    );

                    console.log(
                        "💾 image.jpg saved"
                    );

                    // ==================================================
                    // SEND TO YOLO
                    // ==================================================

                    console.log(
                        "🤖 Sending image to YOLO..."
                    );

                    const yoloRes =
                        await axios.post(

                            "http://192.168.1.166:8000/detect",

                            buffer,

                            {

                                headers: {

                                    "Content-Type": "application/octet-stream"

                                },

                                timeout: 15000

                            }

                        );

                    console.log(
                        "🤖 YOLO RESPONSE:"
                    );

                    console.log(
                        JSON.stringify(
                            yoloRes.data
                        )
                    );

                    // ==================================================
                    // YOLO RESULT
                    // ==================================================

                    const detected =
                        yoloRes.data &&
                        yoloRes.data.detected === true;

                    const yoloCount =
                        Number(
                            yoloRes.data &&
                            yoloRes.data.count ?
                            yoloRes.data.count :
                            0
                        );

                    const bottles =
                        yoloRes.data &&
                        Array.isArray(
                            yoloRes.data.bottles
                        ) ?
                        yoloRes.data.bottles :
                        [];

                    // ==================================================
                    // DETECTED
                    // ==================================================

                    if (detected) {

                        openCommand = true;

                        console.log("");
                        console.log(
                            "🍾 BOTTLE DETECTED!"
                        );

                        console.log(
                            "YOLO detected:",
                            yoloCount,
                            "object(s)"
                        );

                        console.log(
                            "🚪 Lid command sent"
                        );

                    } else {

                        console.log("");

                        console.log(
                            "❌ NO BOTTLE DETECTED"
                        );

                    }

                    // ==================================================
                    // RESPONSE
                    // ==================================================

                    return res.json({

                        success: true,

                        detected: detected,

                        count: yoloCount,

                        bottles: bottles,

                        action: detected ?
                            "open" :
                            "none"

                    });

                } catch (error) {

                    console.error(
                        "❌ YOLO ERROR:",
                        error.message
                    );

                    return res.status(500).json({

                        success: false,

                        error: "YOLO failed",

                        message: error.message

                    });

                }

            }
        );

    } catch (error) {

        console.error(
            "❌ uploadImage error:",
            error
        );

        return res.status(500).json({

            success: false,

            error: "Upload failed"

        });

    }

};

// ======================================================
// GET HISTORY
// ======================================================

exports.getHistory = (req, res) => {

    res.json(
        data.transactions || []
    );

};

// ======================================================
// DELETE HISTORY
// ======================================================

exports.deleteHistory = (req, res) => {

    data.transactions = [];

    console.log(
        "🗑️ History deleted"
    );

    res.json({

        success: true,

        message: "History deleted"

    });

};