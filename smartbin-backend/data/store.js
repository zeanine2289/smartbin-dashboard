const fs = require("fs");
const path = require("path");

// ======================================================
// DATA FILE
// ======================================================

const dataFile = path.join(
    __dirname,
    "data.json"
);

// ======================================================
// DEFAULT DATA
// ======================================================

const defaultData = {

    // จำนวนขวดในรอบปัจจุบัน
    bottleCount: 0,

    // น้ำหนักรวมในถัง
    // หน่วย = KG
    totalWeight: 0,

    // ราคาต่อกิโลกรัม
    pricePerKg: 7,

    // ประวัติการขาย
    transactions: [],

    // คำสั่ง Reset ESP32
    resetCommand: false

};

// ======================================================
// LOAD DATA
// ======================================================

function loadData() {

    try {

        if (!fs.existsSync(dataFile)) {

            fs.writeFileSync(

                dataFile,

                JSON.stringify(
                    defaultData,
                    null,
                    4
                )

            );

            return {
                ...defaultData
            };

        }

        const saved =
            JSON.parse(
                fs.readFileSync(
                    dataFile,
                    "utf8"
                )
            );

        return {

            // จำนวนขวด
            bottleCount: Number(
                saved.bottleCount
            ) || 0,

            // น้ำหนักรวม
            // หน่วย = KG
            totalWeight: Number(
                saved.totalWeight
            ) || 0,

            // ราคา / KG
            pricePerKg: Number(
                saved.pricePerKg
            ) || 7,

            // ประวัติ
            transactions: Array.isArray(
                    saved.transactions
                ) ?
                saved.transactions :
                [],

            // Backend restart
            // ไม่ให้ Reset ค้าง
            resetCommand: false

        };

    } catch (error) {

        console.error(
            "❌ Load data error:",
            error.message
        );

        return {
            ...defaultData
        };

    }

}

// ======================================================
// DATA OBJECT
// ======================================================

const data = loadData();

// ======================================================
// SAVE DATA
// ======================================================

data.save = function() {

    try {

        const saveObject = {

            // จำนวนขวด
            bottleCount: data.bottleCount,

            // น้ำหนักรวม
            // KG
            totalWeight: data.totalWeight,

            // ราคา / KG
            pricePerKg: data.pricePerKg,

            // History
            transactions: data.transactions

        };

        fs.writeFileSync(

            dataFile,

            JSON.stringify(
                saveObject,
                null,
                4
            )

        );

    } catch (error) {

        console.error(
            "❌ Save data error:",
            error.message
        );

    }

};

// ======================================================
// EXPORT
// ======================================================

module.exports = data;