// ======================================================
// SMARTBIN DASHBOARD
// LOCALHOST 3000
// GOOGLE MAPS + GOOGLE PLACES
// ======================================================


// ======================================================
// BACKEND
// ======================================================

// ใช้ Backend ตัวเดียวกับหน้าเว็บ
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

    console.log(
        "📍 Google Maps callback"
    );

    const mapElement =
        document.getElementById("map");

    if (!mapElement) {

        console.error(
            "❌ ไม่พบ #map"
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

    try {

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
            "❌ Google Maps Error:",
            error
        );

    }

};


// ======================================================
// LOAD DATA
// ======================================================

async function loadData() {

    const serverStatus =
        document.getElementById(
            "serverStatus"
        );

    try {

        const response =
            await fetch(
                `${API_URL}/data`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "✅ Backend:",
            data
        );

        // ==============================================
        // COUNT
        // ==============================================

        const count =
            document.getElementById(
                "count"
            );

        if (count) {

            count.innerText =
                Number(
                    data.count || 0
                );

        }

        // ==============================================
        // WEIGHT
        // ==============================================

        const totalWeight =
            document.getElementById(
                "totalWeight"
            );

        if (totalWeight) {

            totalWeight.innerText =
                Number(
                    data.weight || 0
                ).toFixed(2);

        }

        // ==============================================
        // TOTAL VALUE
        // ==============================================

        const totalValue =
            document.getElementById(
                "totalValue"
            );

        if (totalValue) {

            totalValue.innerText =
                Number(
                    data.price || 0
                ).toFixed(2);

        }

        // ==============================================
        // PRICE PER KG
        // ==============================================

        const petPrice =
            document.getElementById(
                "petPrice"
            );

        if (petPrice) {

            petPrice.innerText =
                Number(
                    data.pricePerKg || 0
                ).toFixed(2);

        }

        // ==============================================
        // ONLINE
        // ==============================================

        if (serverStatus) {

            serverStatus.innerText =
                "🟢 ออนไลน์";

            serverStatus.style.color =
                "green";

        }

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
// LOAD HISTORY
// ======================================================

async function loadHistory() {

    try {

        const response =
            await fetch(
                `${API_URL}/history`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        const container =
            document.getElementById(
                "history"
            );

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
            .forEach(
                item => {

                    const weight =
                        Number(
                            item.weight || 0
                        );

                    const price =
                        Number(
                            item.price || 0
                        );

                    let time = "";

                    if (item.time) {

                        time =
                            new Date(
                                item.time
                            ).toLocaleString(
                                "th-TH"
                            );

                    }

                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "history-card";

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

                    container.appendChild(
                        card
                    );

                }
            );

    } catch (error) {

        console.error(
            "❌ History Error:",
            error
        );

    }

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
        (lat2 - lat1) *
        Math.PI / 180;

    const dLng =
        (lng2 - lng1) *
        Math.PI / 180;

    const a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

    +

    Math.cos(
        lat1 * Math.PI / 180
    )

    *

    Math.cos(
        lat2 * Math.PI / 180
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

        // ==============================================
        // CHECK GOOGLE
        // ==============================================

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

        // ==============================================
        // LOADING
        // ==============================================

        if (list) {

            list.innerHTML = `

                <div class="empty-history">

                    📍
                    กำลังค้นหาตำแหน่งของคุณ...

                </div>

            `;

        }

        // ==============================================
        // GPS
        // ==============================================

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

        // ==============================================
        // USER MARKER
        // ==============================================

        userMarker =
            new google.maps.Marker({

                position: {

                    lat: userLat,

                    lng: userLng

                },

                map: map,

                title: "ตำแหน่งของคุณ"

            });

        // ==============================================
        // CENTER
        // ==============================================

        map.setCenter({

            lat: userLat,

            lng: userLng

        });

        map.setZoom(14);

        // ==============================================
        // KEYWORD
        // ==============================================

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

        // ==============================================
        // GOOGLE PLACES
        // ==============================================

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

        // ==============================================
        // SEARCH
        // ==============================================

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

        // ==============================================
        // NO RESULT
        // ==============================================

        if (
            places.length === 0
        ) {

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

        // ==============================================
        // PREPARE
        // ==============================================

        const shops = [];

        places.forEach(
            place => {

                if (!place.location) {

                    return;

                }

                const lat =

                    typeof place.location.lat ===
                    "function"

                ?

                place.location.lat()

                :

                place.location.lat;

                const lng =

                    typeof place.location.lng ===
                    "function"

                ?

                place.location.lng()

                :

                place.location.lng;

                if (
                    lat === undefined ||
                    lng === undefined
                ) {

                    return;

                }

                let name =
                    "ร้านรับซื้อของเก่า";

                if (
                    place.displayName
                ) {

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
                    place.formattedAddress ||
                    "";

                const phone =
                    place.nationalPhoneNumber ||
                    "";

                const distance =
                    calculateDistance(

                        userLat,

                        userLng,

                        lat,

                        lng

                    );

                shops.push({

                    place:

                        place,

                    lat:

                        lat,

                    lng:

                        lng,

                    name:

                        name,

                    address:

                        address,

                    phone:

                        phone,

                    distance:

                        distance

                });

            }
        );

        // ==============================================
        // SORT
        // ==============================================

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

        // ==============================================
        // BOUNDS
        // ==============================================

        const bounds =
            new google.maps.LatLngBounds();

        bounds.extend({

            lat: userLat,

            lng: userLng

        });

        // ==============================================
        // CREATE
        // ==============================================

        nearest.forEach(
                shop => {

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
                                    ${escapeHTML(
                                        shop.name
                                    )}

                                </h3>

                                ${
                                    shop.address
                                        ?

                                    `

                                    <div>

                                        📍
                                        ${escapeHTML(
                                            shop.address
                                        )}

                                    </div>

                                    `

                                        :

                                    ""
                                }

                                ${
                                    shop.phone
                                        ?

                                    `

                                    <div>

                                        ☎️
                                        ${escapeHTML(
                                            shop.phone
                                        )}

                                    </div>

                                    `

                                        :

                                    ""
                                }

                                <br>

                                <b>

                                    📏
                                    ${shop.distance.toFixed(2)}
                                    กม.

                                </b>

                                <a
                                    href="${directionUrl}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="direction-button">

                                    🧭
                                    เปิดใน Google Maps

                                </a>

                            </div>

                        `

                    });

                marker.addListener(
                    "click",
                    () => {

                        infoWindow.open({

                            anchor:
                                marker,

                            map:
                                map

                        });

                    }
                );

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
                        ${escapeHTML(
                            shop.name
                        )}

                    </div>

                    ${
                        shop.address
                            ?

                        `

                        <div class="shop-address">

                            📍
                            ${escapeHTML(
                                shop.address
                            )}

                        </div>

                        `

                            :

                        ""
                    }

                    ${
                        shop.phone
                            ?

                        `

                        <div class="shop-phone">

                            ☎️
                            ${escapeHTML(
                                shop.phone
                            )}

                        </div>

                        `

                            :

                        ""
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
                        class="shop-direction">

                        🧭 นำทาง

                    </a>

                `;

                card.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target.closest(
                                "a"
                            )
                        ) {

                            return;

                        }

                        map.setCenter({

                            lat:
                                shop.lat,

                            lng:
                                shop.lng

                        });

                        map.setZoom(17);

                        google.maps.event.trigger(
                            marker,
                            "click"
                        );

                    }
                );

                list.appendChild(
                    card
                );

            }
        );

        if (
            nearest.length > 0
        ) {

            map.fitBounds(
                bounds,
                {

                    top:
                        50,

                    right:
                        50,

                    bottom:
                        50,

                    left:
                        50

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
// START
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🚀 SmartBin Dashboard Started"
        );

        loadData();

        loadHistory();

        // Update Dashboard
        setInterval(
            loadData,
            3000
        );

        // Update History
        setInterval(
            loadHistory,
            5000
        );

    }
);