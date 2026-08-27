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

            JSON.stringify(

                {
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

            priceData.pricePerKg !==
            undefined &&

            !isNaN(
                priceData.pricePerKg
            )

        ) {

            data.pricePerKg =
                Number(
                    priceData.pricePerKg
                );

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
// ESP32 ส่งน้ำหนัก "ขวดใหม่" เป็น KG
//
// ตัวอย่าง:
//
// ขวดหนัก 20 g
//
// 20 g = 0.020 kg
//
// {
//     "weight": 0.0200,
//     "isBottle": true
// }
//
// ======================================================

exports.receiveData = (req, res) => {

    try {

        const weight =
            Number(
                req.body.weight
            );


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
            "New bottle weight:",
            weight.toFixed(4),
            "kg"
        );

        console.log(
            "New bottle weight:",
            (weight * 1000).toFixed(2),
            "g"
        );

        console.log(
            "Bottle:",
            isBottle
        );

        console.log(
            "======================================");


        // ==================================================
        // VALIDATE
        // ==================================================

        if (

            !isBottle ||

            !isFinite(weight) ||

            weight <= 0

        ) {

            console.log(
                "⚠️ Invalid recycle data - ignored"
            );


            const totalValue =
                data.totalWeight *
                data.pricePerKg;


            return res.json({

                success: false,

                message: "Invalid recycle data",

                count: data.bottleCount,

                totalWeight: data.totalWeight,

                weightKg: data.totalWeight,

                totalValue: totalValue,

                pricePerKg: data.pricePerKg

            });

        }


        // ==================================================
        // ADD BOTTLE
        // ==================================================

        data.bottleCount += 1;

        data.totalWeight += weight;


        // ==================================================
        // CURRENT VALUE
        // ==================================================

        const totalWeightKg =
            data.totalWeight;


        const totalValue =
            totalWeightKg *
            data.pricePerKg;


        // ==================================================
        // SAVE
        // ==================================================

        data.save();


        // ==================================================
        // LOG
        // ==================================================

        console.log(
            "🍾 Bottle added: +1"
        );

        console.log(
            "📦 Current bottles:",
            data.bottleCount
        );

        console.log(
            "⚖️ New bottle:",
            weight.toFixed(4),
            "kg"
        );

        console.log(
            "⚖️ New bottle:",
            (weight * 1000).toFixed(2),
            "g"
        );

        console.log(
            "⚖️ Current total:",
            data.totalWeight.toFixed(4),
            "kg"
        );

        console.log(
            "⚖️ Current total:",
            (data.totalWeight * 1000).toFixed(2),
            "g"
        );

        console.log(
            "💰 Current value:",
            totalValue.toFixed(2),
            "THB"
        );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success: true,

            message: "Bottle added to current session",

            count: data.bottleCount,

            totalWeight: data.totalWeight,

            weightKg: data.totalWeight,

            totalValue: totalValue,

            lastWeight: weight,

            lastWeightKg: weight,

            lastWeightGram: weight * 1000,

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

    try {

        const weightKg =
            Number(
                data.totalWeight || 0
            );


        const totalValue =
            weightKg *
            Number(
                data.pricePerKg || 0
            );


        res.json({

            // จำนวนขวด
            count: Number(
                data.bottleCount || 0
            ),

            // KG
            weight: weightKg,

            // KG
            weightKg: weightKg,

            // GRAM
            weightGram: weightKg * 1000,

            // เงิน
            price: totalValue,

            // ราคา / KG
            pricePerKg: Number(
                data.pricePerKg || 0
            )

        });

    } catch (error) {

        console.error(
            "❌ getData error:",
            error
        );


        res.status(500).json({

            success: false,

            message: "Cannot get dashboard data",

            error: error.message

        });

    }

};


// ======================================================
// SELL CURRENT BATCH
// ======================================================

exports.sell = (req, res) => {

    try {

        // ==================================================
        // CHECK DATA
        // ==================================================

        if (

            Number(
                data.bottleCount
            ) <= 0 ||

            Number(
                data.totalWeight
            ) <= 0

        ) {

            console.log(
                "⚠️ Sell failed: ไม่มีขวดสำหรับขาย"
            );


            return res.status(400).json({

                success: false,

                message: "ไม่มีขวดสำหรับขาย",

                count: data.bottleCount,

                weight: data.totalWeight

            });

        }


        // ==================================================
        // SNAPSHOT
        // ==================================================

        const count =
            Number(
                data.bottleCount
            );


        const weightKg =
            Number(
                data.totalWeight
            );


        const pricePerKg =
            Number(
                data.pricePerKg
            );


        const totalPrice =
            weightKg *
            pricePerKg;


        const saleTime =
            new Date();


        // ==================================================
        // SAVE HISTORY
        // ==================================================

        if (!Array.isArray(
                data.transactions
            )) {

            data.transactions = [];

        }


        data.transactions.push({

            id: Date.now(),

            count: count,

            weight: weightKg,

            weightKg: weightKg,

            weightGram: weightKg * 1000,

            pricePerKg: pricePerKg,

            price: totalPrice,

            time: saleTime

        });


        // ==================================================
        // CLEAR CURRENT SESSION
        // ==================================================

        data.bottleCount =
            0;


        data.totalWeight =
            0;


        // ==================================================
        // RESET ESP32
        // ==================================================

        data.resetCommand =
            true;


        // ==================================================
        // SAVE
        // ==================================================

        data.save();


        // ==================================================
        // LOG
        // ==================================================

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "💰 SALE COMPLETED"
        );

        console.log(
            "======================================"
        );

        console.log(
            "📦 Bottles:",
            count
        );

        console.log(
            "⚖️ Weight:",
            weightKg.toFixed(4),
            "kg"
        );

        console.log(
            "⚖️ Weight:",
            (weightKg * 1000).toFixed(2),
            "g"
        );

        console.log(
            "💵 Price/kg:",
            pricePerKg.toFixed(2),
            "THB"
        );

        console.log(
            "💰 Total:",
            totalPrice.toFixed(2),
            "THB"
        );

        console.log(
            "📚 Added to sales history"
        );

        console.log(
            "📡 Reset command sent to ESP32"
        );

        console.log(
            "======================================"
        );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success: true,

            message: "ขายสำเร็จ",

            // ให้ frontend ใช้ได้
            soldCount: count,

            soldWeightKg: weightKg,

            soldWeightGram: weightKg * 1000,

            soldValue: totalPrice,

            sale: {

                count: count,

                weight: weightKg,

                weightKg: weightKg,

                weightGram: weightKg * 1000,

                pricePerKg: pricePerKg,

                price: totalPrice,

                time: saleTime

            }

        });

    } catch (error) {

        console.error(
            "❌ Sell error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Sell failed",

            error: error.message

        });

    }

};


// ======================================================
// RESET DASHBOARD
// ======================================================

exports.reset = (req, res) => {

    try {

        data.bottleCount =
            0;


        data.totalWeight =
            0;


        data.transactions = [];


        // ESP32 reset
        data.resetCommand =
            true;


        data.save();


        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "🔄 DASHBOARD RESET"
        );

        console.log(
            "📦 Bottle Count = 0"
        );

        console.log(
            "⚖️ Total Weight = 0 kg"
        );

        console.log(
            "🗑️ History Cleared"
        );

        console.log(
            "📡 Reset command sent to ESP32"
        );

        console.log(
            "======================================"
        );


        res.json({

            success: true,

            message: "Reset success",

            count: 0,

            totalWeight: 0,

            weightKg: 0

        });

    } catch (error) {

        console.error(
            "❌ Reset error:",
            error
        );


        res.status(500).json({

            success: false,

            message: "Reset failed",

            error: error.message

        });

    }

};


// ======================================================
// CHECK RESET COMMAND FROM ESP32
// ======================================================

exports.checkReset = (req, res) => {

    if (
        data.resetCommand
    ) {

        data.resetCommand =
            false;


        data.save();


        console.log(
            "📡 ESP32 received RESET command"
        );


        return res.json({

            reset: true

        });

    }


    res.json({

        reset: false

    });

};


// ======================================================
// SET PRICE
// ======================================================

exports.setPrice = (req, res) => {

    const price =
        Number(
            req.body.price
        );


    if (

        !isFinite(price) ||

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

    data.save();


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


    if (
        action === "open"
    ) {

        openCommand =
            true;

    } else if (
        action === "close"
    ) {

        openCommand =
            false;

    } else {

        return res.status(400).json({

            success: false,

            message: "Invalid lid action"

        });

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

    openCommand =
        true;


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

    if (
        openCommand
    ) {

        openCommand =
            false;


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

exports.uploadImage = async(
    req,
    res
) => {

    try {

        const chunks = [];


        req.on(
            "data",
            chunk => {

                chunks.push(
                    chunk
                );

            }
        );


        req.on(
            "end",
            async() => {

                try {

                    const buffer =
                        Buffer.concat(
                            chunks
                        );


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
                    // SEND YOLO
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
                        )

                    ?

                    yoloRes.data.bottles

                        :

                        [];


                    // ==================================================
                    // DETECTED
                    // ==================================================

                    if (
                        detected
                    ) {

                        openCommand =
                            true;


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


    data.save();


    console.log(
        "🗑️ History deleted"
    );


    res.json({

        success: true,

        message: "History deleted"

    });

};