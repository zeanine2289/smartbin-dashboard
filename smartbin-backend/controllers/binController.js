'use strict';

const data = require('../data/store');

const fs = require('fs');
const axios = require('axios');

// ========================================
// RESET COMMAND
// ========================================

let resetCommand = false;

// ========================================
// LID COMMAND
// ========================================

let openCommand = false;


// ========================================
// RECEIVE DATA FROM ESP32
// ========================================

exports.receiveData = (req, res) => {

    const {
        weight,
        isBottle,
        count,
        totalWeight
    } = req.body;

    console.log('');
    console.log('================================');
    console.log('📥 DATA FROM ESP32');
    console.log('================================');

    console.log('Weight:', weight);
    console.log('Count:', count);
    console.log('Total Weight:', totalWeight);
    console.log('Is Bottle:', isBottle);

    // ========================================
    // รับเฉพาะข้อมูลที่เป็นขวด
    // ========================================

    if (isBottle) {

        const bottleWeight = Number(weight) || 0;

        // ------------------------------------
        // สำคัญ
        //
        // ESP32 เป็นตัวตรวจว่าขวดใหม่จริง
        // Backend ไม่เพิ่ม count ซ้ำเอง
        // ------------------------------------

        if (typeof count === 'number') {
            data.bottleCount = count;
        }

        if (typeof totalWeight === 'number') {
            data.totalWeight = totalWeight;
        }

        // ------------------------------------
        // บันทึกประวัติ
        // ------------------------------------

        data.transactions.push({

            weight: bottleWeight,

            price: bottleWeight *
                data.pricePerKg,

            time: new Date()
        });

        console.log('🍾 New bottle received');

        console.log(
            'Bottle Count:',
            data.bottleCount
        );

        console.log(
            'Total Weight:',
            data.totalWeight
        );
    }

    console.log('================================');
    console.log('');

    res.json({
        success: true,

        count: data.bottleCount,

        weight: data.totalWeight,

        price: data.totalWeight *
            data.pricePerKg
    });
};


// ========================================
// GET DATA
// ========================================

exports.getData = (req, res) => {

    res.json({

        count: data.bottleCount,

        weight: data.totalWeight,

        price: data.totalWeight *
            data.pricePerKg,

        pricePerKg: data.pricePerKg
    });
};


// ========================================
// RESET FROM WEB
// ========================================

exports.reset = (req, res) => {

    console.log('');
    console.log('================================');
    console.log('🔄 RESET REQUEST FROM WEB');
    console.log('================================');

    // ------------------------------------
    // Reset ข้อมูลบนเว็บ
    // ------------------------------------

    data.totalWeight = 0;

    data.bottleCount = 0;

    // ------------------------------------
    // ส่งคำสั่งไป ESP32
    // ------------------------------------

    resetCommand = true;

    console.log('Reset command = TRUE');

    console.log('================================');

    res.json({

        success: true,

        message: 'Reset command sent to ESP32',

        reset: true
    });
};


// ========================================
// ESP32 CHECK RESET
// ========================================

exports.checkReset = (req, res) => {

    if (resetCommand) {

        console.log(
            '📡 ESP32 received RESET command'
        );

        // สำคัญมาก
        // อ่านแล้วปิดคำสั่งทันที

        resetCommand = false;

        return res.json({

            reset: true

        });
    }

    res.json({

        reset: false

    });
};


// ========================================
// SET PRICE
// ========================================

exports.setPrice = (req, res) => {

    const {
        price
    } = req.body;

    if (
        price === undefined ||
        price === null ||
        isNaN(price)
    ) {

        return res.status(400).json({

            success: false,

            message: 'Invalid price'

        });
    }

    data.pricePerKg =
        Number(price);

    console.log(
        '💰 New price:',
        data.pricePerKg,
        'THB/kg'
    );

    res.json({

        success: true,

        message: 'Price updated',

        newPrice: data.pricePerKg

    });
};


// ========================================
// GET PET PRICE
// ========================================

exports.getPetPrice = (req, res) => {

    try {

        const petPrice =
            require('../price.json');

        res.json(petPrice);

    } catch (error) {

        res.status(500).json({

            success: false,

            message: 'Cannot read price.json'

        });
    }
};


// ========================================
// CONTROL LID
// ========================================

exports.controlLid = (req, res) => {

    const {
        action
    } = req.body;

    console.log(
        'Lid action:',
        action
    );

    if (action === 'open') {

        openCommand = true;

    }

    res.json({

        success: true,

        message: `Lid ${action}`

    });
};


// ========================================
// TRIGGER LID
// ========================================

exports.triggerLid = (req, res) => {

    openCommand = true;

    console.log(
        '🚪 Lid triggered'
    );

    res.json({

        success: true,

        message: 'Lid triggered'

    });
};


// ========================================
// ESP32 CHECK LID
// ========================================

exports.checkLid = (req, res) => {

    if (openCommand) {

        openCommand = false;

        return res.json({

            action: 'open'

        });
    }

    res.json({

        action: 'none'

    });
};


// ========================================
// UPLOAD IMAGE
// ========================================

exports.uploadImage = async(req, res) => {

    const chunks = [];

    req.on('data', chunk => {

        chunks.push(chunk);

    });

    req.on('end', async() => {

        const buffer =
            Buffer.concat(chunks);

        // ------------------------------------
        // Save image
        // ------------------------------------

        try {

            fs.writeFileSync(
                'image.jpg',
                buffer
            );

            console.log(
                '📸 Image saved'
            );

        } catch (error) {

            console.error(
                'Image save error:',
                error.message
            );
        }


        // ------------------------------------
        // YOLO
        // ------------------------------------

        try {

            const yoloRes =
                await axios.post(

                    'http://192.168.1.10:8000/detect',

                    buffer,

                    {
                        headers: {

                            'Content-Type': 'application/octet-stream',

                            'x-api-key': 'mysecret1235'

                        }
                    }
                );


            console.log(
                'YOLO RESULT:',
                yoloRes.data
            );


            const isBottle =
                yoloRes.data.label ===
                'bottle';


            if (isBottle) {

                openCommand = true;

            }


            res.json({

                success: true,

                isBottle

            });


        } catch (error) {

            console.error(
                'YOLO ERROR:',
                error.message
            );

            res.status(500).json({

                success: false,

                error: 'YOLO failed'

            });

        }

    });
};


// ========================================
// HISTORY
// ========================================

exports.getHistory = (req, res) => {

    res.json(
        data.transactions || []
    );

};


// ========================================
// DELETE HISTORY
// ========================================

exports.deleteHistory = (req, res) => {

    try {

        data.transactions = [];

        console.log('🗑️ History deleted');

        res.json({

            success: true,

            message: 'ลบประวัติทั้งหมดแล้ว'

        });

    } catch (error) {

        console.error(
            'Delete history error:',
            error
        );

        res.status(500).json({

            success: false,

            message: 'ลบประวัติไม่สำเร็จ'

        });

    }

};