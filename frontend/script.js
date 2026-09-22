// ======================================================
// SMARTBIN DASHBOARD
// ======================================================

const API_URL = "/api";

// ======================================================
// GLOBAL
// ======================================================

let map = null;
let markers = [];
let userMarker = null;


// ======================================================
// GOOGLE MAPS CALLBACK
// ======================================================

window.initGoogleMap = function() {

    console.log("📍 Google Maps callback");

    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.error("❌ ไม่พบ #map");
        return;
    }

    if (map) {
        return;
    }

    const defaultLocation = {
        lat: 13.7563,
        lng: 100.5018
    };

    try {

        map = new google.maps.Map(
            mapElement, {
                center: defaultLocation,
                zoom: 13,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true
            }
        );

        console.log("✅ Google Maps พร้อมใช้งาน");
        const statusMaps = document.getElementById("statusMaps");
        if (statusMaps) { statusMaps.textContent = "พร้อมใช้งาน"; statusMaps.className = "ok"; }

    } catch (error) {

        console.error(
            "❌ Google Maps Error:",
            error
        );
        const statusMaps = document.getElementById("statusMaps");
        if (statusMaps) { statusMaps.textContent = "ไม่พร้อมใช้งาน"; statusMaps.className = ""; }

    }

};


// ======================================================
// LOAD DASHBOARD DATA
// ======================================================

async function loadData() {

    const serverStatus =
        document.getElementById("serverStatus");

    try {

        const response = await fetch(
            `${API_URL}/data`, {
                cache: "no-store"
            }
        );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data = await response.json();

        const now = new Date();
        const timeText = now.toLocaleTimeString("th-TH", { hour12: false });
        const lastUpdate = document.getElementById("lastUpdate");
        const lastDetect = document.getElementById("lastDetect");
        if (lastUpdate) lastUpdate.textContent = timeText;
        if (lastDetect) lastDetect.textContent = timeText;

        console.log(
            "✅ Backend:",
            data
        );


        // ==================================================
        // COUNT
        // ==================================================

        const count =
            document.getElementById("count");

        if (count) {

            count.innerText =
                Number(data.count || 0);

        }


        // ==================================================
        // WEIGHT
        // ==================================================

        const totalWeight =
            document.getElementById("totalWeight");

        // Backend ส่ง weightKg มาโดยตรง
        const weightKg =
            Number(
                data.weightKg !== undefined ?
                data.weightKg :
                data.weight !== undefined ?
                data.weight :
                0
            );

        if (totalWeight) {

            totalWeight.innerText =
                weightKg.toFixed(2);

        }


        // ==================================================
        // TOTAL VALUE
        // ==================================================

        const totalValue =
            document.getElementById("totalValue");

        if (totalValue) {

            totalValue.innerText =
                Number(
                    data.price || 0
                ).toFixed(2);

        }


        // ==================================================
        // PRICE PER KG
        // ==================================================

        const petPrice =
            document.getElementById("petPrice");

        if (petPrice) {

            petPrice.innerText =
                Number(
                    data.pricePerKg || 0
                ).toFixed(2);

        }


        // ==================================================
        // SERVER ONLINE
        // ==================================================

        if (serverStatus) {
            serverStatus.innerText = "ออนไลน์";
            serverStatus.style.color = "#0d9a61";
        }

        const statusBackend = document.getElementById("statusBackend");
        if (statusBackend) {
            statusBackend.textContent = "ออนไลน์";
            statusBackend.className = "ok";
        }

        const sensorStatus = document.getElementById("sensorStatus");
        if (sensorStatus) sensorStatus.textContent = "ได้รับข้อมูล";

        const aiStatus = document.getElementById("aiStatus");
        if (aiStatus) aiStatus.textContent = "เชื่อมต่อระบบ";

        const sellCount = document.getElementById("sellCount");
        const sellWeight = document.getElementById("sellWeight");
        const sellValue = document.getElementById("sellValue");
        if (sellCount) sellCount.textContent = Number(data.count || 0).toLocaleString("th-TH");
        if (sellWeight) sellWeight.textContent = weightKg.toFixed(2);
        if (sellValue) sellValue.textContent = Number(data.price || 0).toFixed(2);


        // ==================================================
        // SELL BUTTON
        // ==================================================

        updateSellButton(data);

    } catch (error) {

        console.error(
            "❌ Backend Error:",
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
// UPDATE SELL BUTTON
// ======================================================

function updateSellButton(data) {

    const button =
        document.getElementById("sellButton");

    if (!button) {
        return;
    }


    const count =
        Number(data.count || 0);


    const weightKg =
        Number(
            data.weightKg !== undefined ?
            data.weightKg :
            data.weight !== undefined ?
            data.weight :
            0
        );


    // ==================================================
    // มีขวด
    // ==================================================

    if (
        count > 0 &&
        weightKg > 0
    ) {

        button.disabled = false;

        button.innerText =
            "💰 ขาย";

        button.style.opacity =
            "1";

        button.style.cursor =
            "pointer";

    }


    // ==================================================
    // ไม่มีขวด
    // ==================================================
    else {

        button.disabled = true;

        button.innerText =
            "💰 ยังไม่มีขวด";

        button.style.opacity =
            "0.5";

        button.style.cursor =
            "not-allowed";

    }

}


// ======================================================
// SELL RECYCLE
// ======================================================

async function sellRecycle() {

    const button =
        document.getElementById("sellButton");


    // ==================================================
    // CONFIRM
    // ==================================================

    const confirmSell =
        confirm(
            "ต้องการขายขวดทั้งหมดในถังตอนนี้ใช่หรือไม่?"
        );


    if (!confirmSell) {

        console.log(
            "❌ ยกเลิกการขาย"
        );

        return;

    }


    // ==================================================
    // DISABLE BUTTON
    // ==================================================

    if (button) {

        button.disabled = true;

        button.innerText =
            "⏳ กำลังขาย...";

        button.style.opacity =
            "0.6";

        button.style.cursor =
            "wait";

    }


    try {

        // ==================================================
        // SELL
        // ==================================================

        const response =
            await fetch(
                `${API_URL}/sell`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );


        const result =
            await response.json();


        console.log(
            "💰 SELL RESULT:",
            result
        );


        // ==================================================
        // ERROR
        // ==================================================

        if (!response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "ขายไม่สำเร็จ"
            );

        }


        // ==================================================
        // RESULT
        // ==================================================

        const sale =
            result.sale || {};


        const soldCount =
            Number(
                result.soldCount !== undefined ?
                result.soldCount :
                sale.count !== undefined ?
                sale.count :
                0
            );


        const soldWeightKg =
            Number(
                result.soldWeightKg !== undefined ?
                result.soldWeightKg :
                sale.weightKg !== undefined ?
                sale.weightKg :
                sale.weight !== undefined ?
                sale.weight :
                0
            );


        const soldValue =
            Number(
                result.soldValue !== undefined ?
                result.soldValue :
                sale.price !== undefined ?
                sale.price :
                0
            );


        // ==================================================
        // SUCCESS MESSAGE
        // ==================================================

        alert(

            "✅ ขายสำเร็จ!\n\n" +

            "🍾 จำนวนขวด: " +
            soldCount +
            " ขวด\n" +

            "⚖️ น้ำหนัก: " +
            soldWeightKg.toFixed(2) +
            " กิโลกรัม\n" +

            "⚖️ น้ำหนัก: " +
            (
                soldWeightKg * 1000
            ).toFixed(2) +
            " กรัม\n" +

            "💰 มูลค่า: " +
            soldValue.toFixed(2) +
            " บาท"

        );


        // ==================================================
        // REFRESH
        // ==================================================

        await loadData();

        await loadHistory();


        console.log(
            "✅ Dashboard และ History อัปเดตแล้ว"
        );

    } catch (error) {

        console.error(
            "❌ Sell Error:",
            error
        );


        alert(
            "❌ ขายไม่สำเร็จ\n\n" +
            error.message
        );


        await loadData();

    }

}


// ======================================================
// LOAD SALES HISTORY
// ======================================================

async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/history`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const wrapper = document.getElementById("history");
        if (!wrapper) return;

        const history = Array.isArray(data) ? data.slice().reverse() : [];
        updateTrendCharts(history);

        if (history.length === 0) {
            wrapper.querySelector(".history-container").innerHTML =
                `<div class="empty-history">ยังไม่มีประวัติการขาย</div>`;
            return;
        }

        const rows = history.slice(0, 10).map((item, index) => {
            const count = Number(item.count || 0);
            const weightKg = Number(item.weightKg !== undefined ? item.weightKg : item.weight || 0);
            const price = Number(item.price || 0);
            let time = "-";
            if (item.time) {
                const date = new Date(item.time);
                if (!isNaN(date.getTime())) time = date.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
            }
            return `<tr>
                <td>${escapeHTML(time)}</td>
                <td>${count.toLocaleString("th-TH")} ขวด</td>
                <td>${weightKg.toFixed(2)} kg</td>
                <td>${price.toFixed(2)} ฿</td>
            </tr>`;
        }).join("");

        wrapper.querySelector(".history-container").innerHTML = `
            <table class="history-table">
                <thead><tr><th>วันที่</th><th>จำนวน</th><th>น้ำหนัก</th><th>มูลค่า</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    } catch (error) {
        console.error("❌ History Error:", error);
    }
}

function updateTrendCharts(history) {
    const charts = [
        { id: "bottleChart", key: "count", fallback: 0 },
        { id: "weightChart", key: "weightKg", fallback: 0 },
        { id: "valueChart", key: "price", fallback: 0 }
    ];

    const recent = history.slice(0, 7).reverse();
    charts.forEach(({ id, key, fallback }) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!recent.length) {
            el.innerHTML = `<div class="chart-empty">ยังไม่มีข้อมูล</div>`;
            return;
        }
        const values = recent.map(item => Number(
            key === "weightKg"
                ? (item.weightKg !== undefined ? item.weightKg : item.weight || fallback)
                : (item[key] !== undefined ? item[key] : fallback)
        ));
        const max = Math.max(...values, 1);
        el.innerHTML = values.map((value, i) => {
            const height = Math.max(5, (value / max) * 100);
            const label = recent[i].time ? new Date(recent[i].time).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" }) : `${i + 1}`;
            return `<div class="bar" style="height:${height}%" title="${label}: ${value}"></div>`;
        }).join("");
    });
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

    .replace(
        /&/g,
        "&amp;"
    )

    .replace(
        /</g,
        "&lt;"
    )

    .replace(
        />/g,
        "&gt;"
    )

    .replace(
        /"/g,
        "&quot;"
    )

    .replace(
        /'/g,
        "&#039;"
    );

}


// ======================================================
// CLEAR MARKERS
// ======================================================

function clearMarkers() {

    markers.forEach(
        marker => {

            marker.setMap(null);

        }
    );


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
        (
            lat2 - lat1
        ) *
        Math.PI /
        180;


    const dLng =
        (
            lng2 - lng1
        ) *
        Math.PI /
        180;


    const a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

    +

    Math.cos(
        lat1 *
        Math.PI /
        180
    )

    *

    Math.cos(
        lat2 *
        Math.PI /
        180
    )

    *

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
// GET USER LOCATION
// ======================================================

function getUserLocation() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "อุปกรณ์ไม่รองรับ GPS"
                    )
                );

                return;

            }


            navigator.geolocation
                .getCurrentPosition(

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

        // ==================================================
        // CHECK GOOGLE MAPS
        // ==================================================

        if (
            typeof google === "undefined" ||
            !google.maps
        ) {

            throw new Error(
                "Google Maps ยังโหลดไม่เสร็จ"
            );

        }


        if (!map) {

            window.initGoogleMap();

        }


        if (!map) {

            throw new Error(
                "ไม่สามารถสร้าง Google Maps ได้"
            );

        }


        // ==================================================
        // LOADING GPS
        // ==================================================

        if (list) {

            list.innerHTML = `

                <div class="empty-history">

                    📍
                    กำลังค้นหาตำแหน่งของคุณ...

                </div>

            `;

        }


        // ==================================================
        // GET GPS
        // ==================================================

        let position;


        try {

            position =
                await getUserLocation();

        } catch (error) {

            console.warn(
                "⚠️ GPS ใช้งานไม่ได้ ใช้กรุงเทพแทน"
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

                title: "ตำแหน่งของคุณ"

            });


        map.setCenter({

            lat: userLat,

            lng: userLng

        });


        map.setZoom(14);


        // ==================================================
        // KEYWORD
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


        // ==================================================
        // NO RESULT
        // ==================================================

        if (places.length === 0) {

            if (list) {

                list.innerHTML = `

                    <div class="empty-history">

                        ❌ ไม่พบร้านใกล้คุณ

                        <br><br>

                        ลองค้นหา

                        <br>

                        ร้านรับซื้อของเก่า

                        <br>

                        รับซื้อขวดพลาสติก

                        <br>

                        ร้านรีไซเคิล

                    </div>

                `;

            }

            return;

        }


        // ==================================================
        // PREPARE SHOPS
        // ==================================================

        const shops = [];


        places.forEach(
            place => {

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

                    place: place,

                    lat: lat,

                    lng: lng,

                    name: name,

                    address: address,

                    phone: phone,

                    distance: distance

                });

            }
        );


        // ==================================================
        // SORT
        // ==================================================

        shops.sort(
            (a, b) =>
            a.distance - b.distance
        );


        const nearest =
            shops.slice(0, 20);


        if (list) {

            list.innerHTML = "";

        }


        // ==================================================
        // BOUNDS
        // ==================================================

        const bounds =
            new google.maps.LatLngBounds();


        bounds.extend({

            lat: userLat,

            lng: userLng

        });


        // ==================================================
        // CREATE SHOPS
        // ==================================================

        nearest.forEach(
                shop => {

                    bounds.extend({

                        lat: shop.lat,

                        lng: shop.lng

                    });


                    // ==================================================
                    // MARKER
                    // ==================================================

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


                    // ==================================================
                    // DIRECTION URL
                    // ==================================================

                    const directionUrl =
                        shop.place.googleMapsURI ||
                        `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;


                    // ==================================================
                    // INFO WINDOW
                    // ==================================================

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

                                    🧭
                                    เปิดใน Google Maps

                                </a>

                            </div>

                        `

                    });


                // ==================================================
                // MARKER CLICK
                // ==================================================

                marker.addListener(
                    "click",
                    () => {

                        infoWindow.open({

                            anchor: marker,

                            map: map

                        });

                    }
                );


                // ==================================================
                // SHOP CARD
                // ==================================================

                if (!list) {
                    return;
                }


                const card =
                    document.createElement(
                        "div"
                    );


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


                // ==================================================
                // CARD CLICK
                // ==================================================

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

            }
        );


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
            `✅ พบ ${nearest.length} ร้าน`
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
// SEARCH ENTER
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById(
                "searchInput"
            );


        if (input) {

            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        findNearby();

                    }

                }
            );

        }

    }
);


// ======================================================
// START
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🚀 SmartBin Dashboard Started"
        );


        // ==================================================
        // DASHBOARD
        // ==================================================

        loadData();


        // ==================================================
        // HISTORY
        // ==================================================

        loadHistory();


        // ==================================================
        // AUTO UPDATE DASHBOARD
        // ==================================================

        setInterval(
            loadData,
            3000
        );


        // ==================================================
        // AUTO UPDATE HISTORY
        // ==================================================

        setInterval(
            loadHistory,
            5000
        );

    }
);