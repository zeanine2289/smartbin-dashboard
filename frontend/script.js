// ======================================================
// SMARTBIN DASHBOARD
// ======================================================

// ======================================================
// BACKEND API
// ======================================================

// 🔴 เปลี่ยน URL นี้เป็น URL Backend ของ Render
const API_URL = "https://ชื่อ-backendของคุณ.onrender.com/api";

let map = null;
let markers = [];
let userMarker = null;


// ======================================================
// LOAD DATA
// ======================================================

async function loadData() {

    const serverStatus =
        document.getElementById("serverStatus");

    try {

        const response =
            await fetch(`${API_URL}/data`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data =
            await response.json();

        console.log("✅ Backend data:", data);


        // จำนวนขวด
        const count =
            document.getElementById("count");

        if (count) {

            count.innerText =
                data.count !== undefined &&
                data.count !== null ?
                data.count :
                0;

        }


        // น้ำหนัก
        const totalWeight =
            document.getElementById("totalWeight");

        if (totalWeight) {

            const weight =
                data.weight !== undefined &&
                data.weight !== null ?
                Number(data.weight) :
                0;

            totalWeight.innerText =
                weight.toFixed(2);

        }


        // ราคา
        const totalValue =
            document.getElementById("totalValue");

        if (totalValue) {

            const price =
                data.price !== undefined &&
                data.price !== null ?
                Number(data.price) :
                0;

            totalValue.innerText =
                price.toFixed(2);

        }


        // ราคาต่อกิโล
        const petPrice =
            document.getElementById("petPrice");

        if (petPrice) {

            let pricePerKg = 0;

            if (
                data.petPrice !== undefined &&
                data.petPrice !== null
            ) {

                pricePerKg =
                    Number(data.petPrice);

            } else if (
                data.pricePerKg !== undefined &&
                data.pricePerKg !== null
            ) {

                pricePerKg =
                    Number(data.pricePerKg);

            }

            petPrice.innerText =
                Number(pricePerKg).toFixed(2);

        }


        // Backend ONLINE
        if (serverStatus) {

            serverStatus.innerText =
                "🟢 ออนไลน์";

            serverStatus.style.color =
                "green";

        }

    } catch (error) {

        console.error(
            "❌ Load data error:",
            error
        );

        if (serverStatus) {

            serverStatus.innerText =
                "🔴 ออฟไลน์";

            serverStatus.style.color =
                "red";

        }

    }

}


// ======================================================
// LOAD HISTORY
// ======================================================

async function loadHistory() {

    try {

        const response =
            await fetch(`${API_URL}/history`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data =
            await response.json();

        const container =
            document.getElementById("history");

        if (!container) {
            return;
        }

        container.innerHTML = "";


        if (!Array.isArray(data) ||
            data.length === 0
        ) {

            container.innerHTML = `
                <div class="empty-history">
                    ยังไม่มีประวัติการขาย
                </div>
            `;

            return;
        }


        data
            .slice()
            .reverse()
            .forEach(item => {

                const card =
                    document.createElement("div");

                card.className =
                    "history-card";


                const weight =
                    item.weight !== undefined &&
                    item.weight !== null ?
                    Number(item.weight) :
                    0;


                const price =
                    item.price !== undefined &&
                    item.price !== null ?
                    Number(item.price) :
                    0;


                let time = "";

                if (item.time) {

                    time =
                        new Date(
                            item.time
                        ).toLocaleString("th-TH");

                }


                card.innerHTML = `

                    <div>

                        📦
                        ${weight.toFixed(2)}
                        kg

                        <br>

                        <small>
                            ${escapeHTML(time)}
                        </small>

                    </div>

                    <div style="
                        color:green;
                        font-weight:bold;
                    ">

                        💰
                        ${price.toFixed(2)}
                        บาท

                    </div>

                `;


                container.appendChild(card);

            });


    } catch (error) {

        console.error(
            "❌ Load history error:",
            error
        );

    }

}


// ======================================================
// GOOGLE MAP
// ======================================================

function initGoogleMap() {

    try {

        const mapElement =
            document.getElementById("map");

        if (!mapElement) {

            console.error(
                "❌ ไม่พบ element #map"
            );

            return;
        }


        if (map) {
            return;
        }


        const defaultLocation = {
            lat: 13.7563,
            lng: 100.5018
        };


        map =
            new google.maps.Map(
                mapElement, {

                    center: defaultLocation,

                    zoom: 13,

                    mapTypeControl: true,

                    streetViewControl: true,

                    fullscreenControl: true

                }
            );


        console.log(
            "✅ Google Maps พร้อมใช้งาน"
        );


    } catch (error) {

        console.error(
            "❌ Google Maps error:",
            error
        );

    }

}


// ======================================================
// CLEAR MARKERS
// ======================================================

function clearMarkers() {

    markers.forEach(marker => {

        marker.setMap(null);

    });

    markers = [];


    if (userMarker) {

        userMarker.setMap(null);

        userMarker = null;

    }

}


// ======================================================
// DISTANCE
// ======================================================

function calculateDistance(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const dLng =
        (lng2 - lng1) *
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

        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// GET USER LOCATION
// ======================================================

function getUserLocation() {

    return new Promise(
        (resolve, reject) => {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "อุปกรณ์นี้ไม่รองรับ GPS"
                    )
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                position => {

                    resolve({

                        lat: position.coords.latitude,

                        lng: position.coords.longitude

                    });

                },

                error => {

                    reject(error);

                },

                {

                    enableHighAccuracy: true,

                    timeout: 15000,

                    maximumAge: 0

                }

            );

        }
    );

}


// ======================================================
// FIND NEARBY
// ======================================================

async function findNearby() {

    const list =
        document.getElementById(
            "shopList"
        );


    try {

        if (!map) {

            throw new Error(
                "Google Maps ยังโหลดไม่เสร็จ"
            );

        }


        if (list) {

            list.innerHTML = `
                <div class="empty-history">
                    📍 กำลังค้นหาตำแหน่งของคุณ...
                </div>
            `;

        }


        // ==================================================
        // GPS
        // ==================================================

        let position;

        try {

            position =
                await getUserLocation();

        } catch (gpsError) {

            console.warn(
                "⚠️ GPS ไม่พร้อม ใช้กรุงเทพแทน"
            );

            position = {

                lat: 13.7563,

                lng: 100.5018

            };

        }


        const userLat =
            position.lat;

        const userLng =
            position.lng;


        console.log(
            "📍 User location:",
            userLat,
            userLng
        );


        clearMarkers();


        // ==================================================
        // USER MARKER
        // ==================================================

        userMarker =
            new google.maps.Marker({

                position: {

                    lat: userLat,

                    lng: userLng

                },

                map: map,

                title: "ตำแหน่งของคุณ",

                icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"

            });


        map.setCenter({

            lat: userLat,

            lng: userLng

        });

        map.setZoom(14);


        // ==================================================
        // SEARCH KEYWORD
        // ==================================================

        const input =
            document.getElementById(
                "searchInput"
            );


        let keyword = "";

        if (input) {

            keyword =
                input.value.trim();

        }


        if (!keyword) {

            keyword =
                "ร้านรับซื้อของเก่า";

        }


        if (list) {

            list.innerHTML = `

                <div class="empty-history">

                    🔍 กำลังค้นหา

                    <b>
                        ${escapeHTML(keyword)}
                    </b>

                    ใกล้คุณ...

                </div>

            `;

        }


        // ==================================================
        // GOOGLE PLACES
        // ==================================================

        const placesLibrary =
            await google.maps.importLibrary(
                "places"
            );


        const Place =
            placesLibrary.Place;


        if (!Place) {

            throw new Error(
                "Google Places API ไม่พร้อมใช้งาน"
            );

        }


        const request = {

            textQuery: keyword,

            fields: [

                "displayName",

                "location",

                "formattedAddress",

                "googleMapsURI",

                "nationalPhoneNumber",

                "businessStatus"

            ],

            locationBias: {

                center: {

                    lat: userLat,

                    lng: userLng

                },

                radius: 5000

            },

            maxResultCount: 20

        };


        const result =
            await Place.searchByText(
                request
            );


        const places =
            result &&
            result.places ?
            result.places :
            [];


        if (places.length === 0) {

            if (list) {

                list.innerHTML = `

                    <div class="empty-history">

                        ❌ ไม่พบร้านใกล้คุณ

                        <br><br>

                        ลองค้นหา:

                        <br>

                        <b>ร้านรับซื้อของเก่า</b>

                        <br>

                        <b>รับซื้อขวดพลาสติก</b>

                        <br>

                        <b>ร้านรีไซเคิล</b>

                    </div>

                `;

            }

            return;

        }


        // ==================================================
        // PREPARE SHOPS
        // ==================================================

        const shops = [];


        places.forEach(place => {

            if (!place.location) {
                return;
            }


            const lat =
                typeof place.location.lat === "function" ?
                place.location.lat() :
                place.location.lat;


            const lng =
                typeof place.location.lng === "function" ?
                place.location.lng() :
                place.location.lng;


            if (
                lat === undefined ||
                lng === undefined
            ) {

                return;

            }


            let name =
                "ร้านรับซื้อของเก่า";


            if (place.displayName) {

                if (
                    typeof place.displayName ===
                    "string"
                ) {

                    name =
                        place.displayName;

                } else if (
                    place.displayName.text
                ) {

                    name =
                        place.displayName.text;

                }

            }


            const address =
                place.formattedAddress || "";


            const phone =
                place.nationalPhoneNumber || "";


            const distance =
                calculateDistance(
                    userLat,
                    userLng,
                    lat,
                    lng
                );


            shops.push({

                place,

                lat,

                lng,

                name,

                address,

                phone,

                distance

            });

        });


        // ==================================================
        // SORT DISTANCE
        // ==================================================

        shops.sort(
            (a, b) =>
            a.distance -
            b.distance
        );


        const nearest =
            shops.slice(0, 20);


        if (list) {

            list.innerHTML = "";

        }


        const bounds =
            new google.maps.LatLngBounds();


        bounds.extend({

            lat: userLat,

            lng: userLng

        });


        // ==================================================
        // CREATE SHOP
        // ==================================================

        nearest.forEach(shop => {

                    bounds.extend({

                        lat: shop.lat,

                        lng: shop.lng

                    });


                    const marker =
                        new google.maps.Marker({

                            position: {

                                lat: shop.lat,

                                lng: shop.lng

                            },

                            map: map,

                            title: shop.name

                        });


                    markers.push(marker);


                    const directionUrl =
                        shop.place.googleMapsURI ||
                        `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;


                    const infoWindow =
                        new google.maps.InfoWindow({

                                content: `

                        <div class="google-popup">

                            <h3>
                                ♻️
                                ${escapeHTML(shop.name)}
                            </h3>

                            ${
                                shop.address
                                    ? `
                                        <div>
                                            📍
                                            ${escapeHTML(shop.address)}
                                        </div>
                                    `
                                    : ""
                            }

                            ${
                                shop.phone
                                    ? `
                                        <div>
                                            ☎️
                                            ${escapeHTML(shop.phone)}
                                        </div>
                                    `
                                    : ""
                            }

                            <br>

                            <b>
                                📏
                                ${shop.distance.toFixed(2)}
                                กม.
                            </b>

                            <br><br>

                            <a
                                href="${directionUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="direction-button"
                            >
                                🧭 เปิดใน Google Maps
                            </a>

                        </div>

                    `

                });


            marker.addListener(
                "click",
                () => {

                    infoWindow.open({

                        anchor: marker,

                        map: map

                    });

                }
            );


            if (!list) {
                return;
            }


            const card =
                document.createElement("div");


            card.className =
                "shop-card";


            card.innerHTML = `

                <div class="shop-name">

                    ♻️
                    ${escapeHTML(shop.name)}

                </div>

                ${
                    shop.address
                        ? `
                            <div class="shop-address">

                                📍
                                ${escapeHTML(shop.address)}

                            </div>
                        `
                        : ""
                }

                ${
                    shop.phone
                        ? `
                            <div class="shop-phone">

                                ☎️
                                ${escapeHTML(shop.phone)}

                            </div>
                        `
                        : ""
                }

                <div class="shop-distance">

                    📏
                    ${shop.distance.toFixed(2)}
                    กม. จากคุณ

                </div>

                <a

                    href="${directionUrl}"

                    target="_blank"

                    rel="noopener noreferrer"

                    class="shop-direction"

                >

                    🧭 นำทาง

                </a>

            `;


            card.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest("a")
                    ) {

                        return;

                    }


                    map.setCenter({

                        lat: shop.lat,

                        lng: shop.lng

                    });


                    map.setZoom(17);


                    google.maps.event.trigger(
                        marker,
                        "click"
                    );

                }
            );


            list.appendChild(card);

        });


        // ==================================================
        // FIT MAP
        // ==================================================

        if (nearest.length > 0) {

            map.fitBounds(
                bounds,
                {

                    top: 50,

                    right: 50,

                    bottom: 50,

                    left: 50

                }
            );

        }


        console.log(
            `✅ Found ${nearest.length} shops`
        );


    } catch (error) {

        console.error(
            "❌ Search error:",
            error
        );


        if (list) {

            list.innerHTML = `

                <div class="empty-history">

                    ❌ เกิดข้อผิดพลาดในการค้นหา

                    <br><br>

                    <small>

                        ${escapeHTML(
                            error.message ||
                            "เกิดข้อผิดพลาด"
                        )}

                    </small>

                </div>

            `;

        }

    }

}


// ======================================================
// SEARCH BUTTON
// ======================================================

function searchShops() {

    findNearby();

}


// ======================================================
// ENTER KEY
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const input =
            document.getElementById(
                "searchInput"
            );


        if (input) {

            input.addEventListener(
                "keydown",
                function(event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        findNearby();

                    }

                }
            );

        }

    }
);


// ======================================================
// OPEN LID
// ======================================================

async function openLid() {

    const status =
        document.getElementById(
            "lidStatus"
        );


    if (!status) {
        return;
    }


    status.innerText =
        "⏳ กำลังส่งคำสั่งเปิดฝา...";


    try {

        const response =
            await fetch(
                `${API_URL}/trigger-lid`,
                {

                    method: "POST"

                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (data.success) {

            status.innerText =
                "✅ ส่งคำสั่งเปิดฝาแล้ว";

        } else {

            status.innerText =
                "❌ เปิดฝาไม่สำเร็จ";

        }


    } catch (error) {

        console.error(
            "❌ Lid error:",
            error
        );


        status.innerText =
            "❌ เชื่อมต่อ Backend ไม่ได้";

    }

}


// ======================================================
// START DASHBOARD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        // โหลดข้อมูลทันที
        loadData();

        // โหลดประวัติ
        loadHistory();


        // อัปเดตข้อมูลทุก 3 วินาที
        setInterval(
            loadData,
            3000
        );


        // อัปเดตประวัติทุก 5 วินาที
        setInterval(
            loadHistory,
            5000
        );

    }
);