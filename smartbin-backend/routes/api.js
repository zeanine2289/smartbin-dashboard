const express = require('express');
const axios = require('axios');

const router = express.Router();

const controller = require('../controllers/binController');


// ========================================
// SMARTBIN API
// ========================================

router.post('/recycle', controller.receiveData);

router.get('/data', controller.getData);

router.post('/reset', controller.reset);

router.get('/check-reset', controller.checkReset);

router.post('/set-price', controller.setPrice);

router.get('/pet-price', controller.getPetPrice);

router.post('/lid', controller.controlLid);

router.get('/lid', controller.checkLid);

router.post('/trigger-lid', controller.triggerLid);

router.post('/upload', controller.uploadImage);

router.get('/history', controller.getHistory);

router.delete('/history', controller.deleteHistory);


// ========================================
// SCRAP SHOPS / OPENSTREETMAP
// ========================================

router.get('/scrap-shops', async(req, res) => {

    try {

        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);

        if (isNaN(lat) || isNaN(lon)) {

            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ lat และ lon'
            });

        }

        console.log('');
        console.log('================================');
        console.log('🔍 SEARCH SCRAP SHOPS');
        console.log('================================');
        console.log('📍 Latitude:', lat);
        console.log('📍 Longitude:', lon);


        // ========================================
        // คำค้นหา
        // ========================================

        const searchWords = [
            'ร้านรับซื้อของเก่า',
            'ร้านของเก่า',
            'รับซื้อขวดพลาสติก',
            'recycling',
            'scrap'
        ];


        let allResults = [];


        // ========================================
        // Nominatim Search
        // ========================================

        for (const word of searchWords) {

            try {

                console.log('🔎 Searching:', word);


                const response = await axios.get(
                    'https://nominatim.openstreetmap.org/search', {

                        params: {

                            q: word,

                            format: 'json',

                            addressdetails: 1,

                            limit: 20,

                            viewbox: `${lon - 0.05},${lat + 0.05},${lon + 0.05},${lat - 0.05}`,

                            bounded: 1

                        },

                        headers: {

                            'User-Agent': 'SmartBin-Recycling-App/1.0'

                        },

                        timeout: 15000

                    }
                );


                if (response.data) {

                    allResults =
                        allResults.concat(
                            response.data
                        );

                }


            } catch (error) {

                console.log(
                    '❌ Search failed:',
                    word,
                    error.message
                );

            }

        }


        // ========================================
        // ลบข้อมูลซ้ำ
        // ========================================

        const unique = new Map();


        allResults.forEach(item => {

            const id =
                item.place_id ||
                `${item.lat}-${item.lon}`;


            if (!unique.has(id)) {

                unique.set(id, item);

            }

        });


        // ========================================
        // แปลงข้อมูลร้าน
        // ========================================

        const shops =
            Array.from(unique.values())
            .map(item => {

                let shopName = 'ร้านรับซื้อของเก่า';

                if (item.name) {

                    shopName = item.name;

                } else if (item.display_name) {

                    shopName =
                        item.display_name.split(',')[0];

                }


                return {

                    id: item.place_id,

                    name: shopName,

                    lat: parseFloat(item.lat),

                    lon: parseFloat(item.lon),

                    phone: '',

                    address: item.display_name || '',

                    type: item.type || '',

                    category: item.category || ''

                };

            })

        .filter(shop => {

            return (!isNaN(shop.lat) &&
                !isNaN(shop.lon)
            );

        });


        // ========================================
        // คำนวณระยะทาง
        // ========================================

        function distance(
            lat1,
            lon1,
            lat2,
            lon2
        ) {

            const R = 6371;

            const dLat =
                (lat2 - lat1) *
                Math.PI / 180;

            const dLon =
                (lon2 - lon1) *
                Math.PI / 180;


            const a =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +

                Math.cos(
                    lat1 * Math.PI / 180
                ) *

                Math.cos(
                    lat2 * Math.PI / 180
                ) *

                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);


            const c =
                2 *
                Math.atan2(
                    Math.sqrt(a),
                    Math.sqrt(1 - a)
                );


            return R * c;

        }


        // ========================================
        // เพิ่มระยะทาง
        // ========================================

        shops.forEach(shop => {

            shop.distance =
                distance(
                    lat,
                    lon,
                    shop.lat,
                    shop.lon
                );

        });


        // ========================================
        // เรียงจากใกล้ไปไกล
        // ========================================

        shops.sort(
            (a, b) => {

                return a.distance -
                    b.distance;

            }
        );


        // ========================================
        // เอา 20 ร้าน
        // ========================================

        const finalShops =
            shops.slice(0, 20);


        console.log(
            `♻️ Found ${finalShops.length} shops`
        );

        console.log('================================');
        console.log('');


        // ========================================
        // ส่งกลับ Frontend
        // ========================================

        res.json({

            success: true,

            count: finalShops.length,

            shops: finalShops

        });


    } catch (error) {

        console.error(
            '❌ Scrap shop error:',
            error.message
        );


        res.status(500).json({

            success: false,

            message: 'ค้นหาร้านรับซื้อของเก่าไม่สำเร็จ'

        });

    }

});


// ========================================
// EXPORT
// ========================================

module.exports = router;