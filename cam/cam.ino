#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"

// ======================================================
// WIFI
// ======================================================

const char* ssid = "Siraphat_2.4G";
const char* password = "siraphat6323";

// ======================================================
// SERVER
// ======================================================

const char* YOLO_URL =
  "http://192.168.1.178:8000/detect";

const char* BACKEND_URL =
  "http://192.168.1.178:3000";

// ======================================================
// AI THINKER ESP32-CAM
// ======================================================

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0

#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM       5

#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ======================================================
// SETTINGS
// ======================================================

const unsigned long DETECTION_INTERVAL = 3000;
const unsigned long LID_COOLDOWN = 10000;

unsigned long lastDetection = 0;
unsigned long lastLidCommand = 0;


// ======================================================
// CAMERA POWER RESET
// ======================================================

void cameraPowerReset() {

  Serial.println();
  Serial.println("Camera power reset...");

  pinMode(PWDN_GPIO_NUM, OUTPUT);

  // ปิดกล้อง
  digitalWrite(PWDN_GPIO_NUM, HIGH);

  delay(200);

  // เปิดกล้อง
  digitalWrite(PWDN_GPIO_NUM, LOW);

  // รอ sensor พร้อม
  delay(1000);

  Serial.println("Camera power reset complete");
}


// ======================================================
// CAMERA INITIALIZE
// ======================================================

bool initCamera() {

  Serial.println();
  Serial.println("======================================");
  Serial.println("          CAMERA INITIALIZE");
  Serial.println("======================================");

  // ----------------------------------------------------
  // Power reset
  // ----------------------------------------------------

  cameraPowerReset();

  // ----------------------------------------------------
  // CAMERA CONFIG
  // ----------------------------------------------------

  camera_config_t config;

  memset(&config, 0, sizeof(config));

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;

  // DATA

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  // CLOCK

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;

  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href  = HREF_GPIO_NUM;

  // SCCB

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  // POWER

  config.pin_pwdn  = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  // CAMERA CLOCK

  config.xclk_freq_hz = 20000000;

  // JPEG

  config.pixel_format = PIXFORMAT_JPEG;

  // QVGA

  config.frame_size = FRAMESIZE_QVGA;

  config.jpeg_quality = 12;

  config.fb_count = 1;

  Serial.println("Camera config OK");

  // ----------------------------------------------------
  // TRY INITIALIZE
  // ----------------------------------------------------

  for (int attempt = 1; attempt <= 3; attempt++) {

    Serial.println();
    Serial.print("Camera initialization attempt ");
    Serial.print(attempt);
    Serial.println("/3");

    esp_err_t err = esp_camera_init(&config);

    if (err == ESP_OK) {

      Serial.println();
      Serial.println("======================================");
      Serial.println("       CAMERA INIT SUCCESS");
      Serial.println("======================================");

      sensor_t* sensor = esp_camera_sensor_get();

      if (sensor == NULL) {

        Serial.println("ERROR: Camera sensor NULL");

        esp_camera_deinit();

        delay(500);

        continue;
      }

      Serial.println("Camera sensor detected!");

      // ------------------------------------------------
      // CAPTURE TEST
      // ------------------------------------------------

      delay(500);

      Serial.println("Testing camera capture...");

      camera_fb_t* fb =
        esp_camera_fb_get();

      if (fb == NULL) {

        Serial.println(
          "Camera capture FAILED"
        );

        esp_camera_deinit();

        delay(500);

        cameraPowerReset();

        continue;
      }

      Serial.println(
        "Camera capture SUCCESS!"
      );

      Serial.print(
        "Image size: "
      );

      Serial.print(
        fb->len
      );

      Serial.println(
        " bytes"
      );

      Serial.print(
        "Width: "
      );

      Serial.println(
        fb->width
      );

      Serial.print(
        "Height: "
      );

      Serial.println(
        fb->height
      );

      esp_camera_fb_return(fb);

      Serial.println();
      Serial.println("CAMERA READY");

      return true;
    }

    // --------------------------------------------------
    // FAILED
    // --------------------------------------------------

    Serial.print(
      "Camera init FAILED: 0x"
    );

    Serial.println(
      err,
      HEX
    );

    if (attempt < 3) {

      Serial.println(
        "Retrying camera..."
      );

      esp_camera_deinit();

      delay(500);

      cameraPowerReset();

      delay(500);
    }
  }

  Serial.println();
  Serial.println("======================================");
  Serial.println("       CAMERA INIT FAILED");
  Serial.println("======================================");

  return false;
}


// ======================================================
// WIFI
// ======================================================

bool connectWiFi() {

  Serial.println();
  Serial.println("======================================");
  Serial.println("             WIFI CONNECT");
  Serial.println("======================================");

  WiFi.mode(WIFI_STA);

  WiFi.disconnect(true);

  delay(500);

  Serial.print(
    "Connecting to: "
  );

  Serial.println(
    ssid
  );

  WiFi.begin(
    ssid,
    password
  );

  int count = 0;

  while (
    WiFi.status() != WL_CONNECTED &&
    count < 40
  ) {

    delay(500);

    Serial.print(".");

    count++;
  }

  Serial.println();

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    Serial.println(
      "WiFi connection FAILED"
    );

    return false;
  }

  Serial.println(
    "WiFi connected!"
  );

  Serial.print(
    "ESP32-CAM IP: "
  );

  Serial.println(
    WiFi.localIP()
  );

  Serial.print(
    "Gateway: "
  );

  Serial.println(
    WiFi.gatewayIP()
  );

  Serial.print(
    "Subnet: "
  );

  Serial.println(
    WiFi.subnetMask()
  );

  Serial.println();

  Serial.print(
    "YOLO URL: "
  );

  Serial.println(
    YOLO_URL
  );

  Serial.print(
    "Backend URL: "
  );

  Serial.println(
    BACKEND_URL
  );

  return true;
}


// ======================================================
// ENSURE WIFI
// ======================================================

bool ensureWiFi() {

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    return true;
  }

  Serial.println();
  Serial.println(
    "WiFi disconnected!"
  );

  Serial.println(
    "Trying to reconnect..."
  );

  WiFi.disconnect();

  WiFi.begin(
    ssid,
    password
  );

  unsigned long start =
    millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - start < 10000
  ) {

    delay(500);

    Serial.print(".");
  }

  Serial.println();

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    Serial.println(
      "WiFi reconnected!"
    );

    Serial.print(
      "IP: "
    );

    Serial.println(
      WiFi.localIP()
    );

    return true;
  }

  Serial.println(
    "WiFi reconnect FAILED"
  );

  return false;
}


// ======================================================
// TEST YOLO
// ======================================================

void testYOLO() {

  Serial.println();
  Serial.println("======================================");
  Serial.println("            TEST YOLO API");
  Serial.println("======================================");

  HTTPClient http;

  String url =
    "http://192.168.1.178:8000/";

  Serial.print(
    "URL: "
  );

  Serial.println(
    url
  );

  if (!http.begin(url)) {

    Serial.println(
      "YOLO http.begin FAILED"
    );

    return;
  }

  http.setTimeout(5000);

  int code =
    http.GET();

  Serial.print(
    "YOLO HTTP Code: "
  );

  Serial.println(
    code
  );

  if (code > 0) {

    Serial.print(
      "YOLO Response: "
    );

    Serial.println(
      http.getString()
    );

  } else {

    Serial.print(
      "YOLO Error: "
    );

    Serial.println(
      http.errorToString(code)
    );
  }

  http.end();
}


// ======================================================
// TEST BACKEND
// ======================================================

void testBackend() {

  Serial.println();
  Serial.println("======================================");
  Serial.println("           TEST BACKEND API");
  Serial.println("======================================");

  HTTPClient http;

  String url =
    String(BACKEND_URL) +
    "/api/data";

  Serial.print(
    "URL: "
  );

  Serial.println(
    url
  );

  if (!http.begin(url)) {

    Serial.println(
      "Backend http.begin FAILED"
    );

    return;
  }

  http.setTimeout(5000);

  int code =
    http.GET();

  Serial.print(
    "Backend HTTP Code: "
  );

  Serial.println(
    code
  );

  if (code > 0) {

    Serial.print(
      "Backend Response: "
    );

    Serial.println(
      http.getString()
    );

  } else {

    Serial.print(
      "Backend Error: "
    );

    Serial.println(
      http.errorToString(code)
    );
  }

  http.end();
}


// ======================================================
// OPEN LID
// ======================================================

void sendOpenLidCommand() {

  if (
    millis() - lastLidCommand <
    LID_COOLDOWN
  ) {

    Serial.println();
    Serial.println(
      "Lid cooldown active."
    );

    return;
  }

  Serial.println();
  Serial.println("======================================");
  Serial.println("          BOTTLE DETECTED!");
  Serial.println("======================================");

  HTTPClient http;

  String url =
    String(BACKEND_URL) +
    "/api/trigger-lid";

  Serial.print(
    "URL: "
  );

  Serial.println(
    url
  );

  if (!http.begin(url)) {

    Serial.println(
      "Backend http.begin FAILED"
    );

    return;
  }

  http.setTimeout(5000);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  String json =
    "{\"action\":\"open\"}";

  Serial.print(
    "POST: "
  );

  Serial.println(
    json
  );

  int code =
    http.POST(json);

  Serial.print(
    "Backend HTTP Code: "
  );

  Serial.println(
    code
  );

  if (code > 0) {

    String response =
      http.getString();

    Serial.print(
      "Backend Response: "
    );

    Serial.println(
      response
    );

    if (
      code >= 200 &&
      code < 300
    ) {

      Serial.println(
        "OPEN COMMAND SENT OK"
      );

      lastLidCommand =
        millis();
    }

  } else {

    Serial.println(
      "ERROR: Cannot connect to Backend"
    );

    Serial.print(
      "Error: "
    );

    Serial.println(
      http.errorToString(code)
    );
  }

  http.end();
}


// ======================================================
// SEND IMAGE TO YOLO
// ======================================================

void detectBottle() {

  if (!ensureWiFi()) {

    return;
  }

  Serial.println();
  Serial.println("--------------------------------------");
  Serial.println(
    "Capturing image..."
  );

  camera_fb_t* fb =
    esp_camera_fb_get();

  if (fb == NULL) {

    Serial.println(
      "ERROR: Camera capture failed"
    );

    return;
  }

  Serial.print(
    "Captured: "
  );

  Serial.print(
    fb->len
  );

  Serial.println(
    " bytes"
  );

  // ----------------------------------------------------
  // HTTP
  // ----------------------------------------------------

  HTTPClient http;

  Serial.println(
    "Connecting to YOLO API..."
  );

  if (!http.begin(YOLO_URL)) {

    Serial.println(
      "ERROR: YOLO http.begin failed"
    );

    esp_camera_fb_return(fb);

    return;
  }

  http.setTimeout(15000);

  // ----------------------------------------------------
  // MULTIPART
  // ----------------------------------------------------

  String boundary =
    "----ESP32CAMBoundary";

  String contentType =
    "multipart/form-data; boundary=" +
    boundary;

  http.addHeader(
    "Content-Type",
    contentType
  );

  // ----------------------------------------------------
  // HEADER
  // ----------------------------------------------------

  String head =
    "--" +
    boundary +
    "\r\n"
    "Content-Disposition: form-data; "
    "name=\"file\"; "
    "filename=\"image.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n"
    "\r\n";

  // ----------------------------------------------------
  // TAIL
  // ----------------------------------------------------

  String tail =
    "\r\n--" +
    boundary +
    "--\r\n";

  size_t totalLength =
    head.length() +
    fb->len +
    tail.length();

  Serial.print(
    "Payload: "
  );

  Serial.print(
    totalLength
  );

  Serial.println(
    " bytes"
  );

  // ----------------------------------------------------
  // MEMORY
  // ----------------------------------------------------

  uint8_t* payload =
    (uint8_t*)malloc(
      totalLength
    );

  if (payload == NULL) {

    Serial.println(
      "ERROR: malloc failed"
    );

    esp_camera_fb_return(fb);

    http.end();

    return;
  }

  // ----------------------------------------------------
  // COPY
  // ----------------------------------------------------

  memcpy(
    payload,
    head.c_str(),
    head.length()
  );

  memcpy(
    payload + head.length(),
    fb->buf,
    fb->len
  );

  memcpy(
    payload +
    head.length() +
    fb->len,
    tail.c_str(),
    tail.length()
  );

  // ----------------------------------------------------
  // SEND
  // ----------------------------------------------------

  Serial.println(
    "Sending image to YOLO..."
  );

  int httpCode =
    http.POST(
      payload,
      totalLength
    );

  // ----------------------------------------------------
  // FREE
  // ----------------------------------------------------

  free(payload);

  esp_camera_fb_return(fb);

  // ----------------------------------------------------
  // RESULT
  // ----------------------------------------------------

  Serial.print(
    "YOLO HTTP Code: "
  );

  Serial.println(
    httpCode
  );

  if (httpCode > 0) {

    String response =
      http.getString();

    Serial.println();
    Serial.println(
      "======================================"
    );

    Serial.println(
      "             YOLO RESPONSE"
    );

    Serial.println(
      "======================================"
    );

    Serial.println(
      response
    );

    Serial.println(
      "======================================"
    );

    // --------------------------------------------------
    // DETECTED
    // --------------------------------------------------

    if (
      response.indexOf(
        "\"detected\":true"
      ) >= 0
    ) {

      Serial.println();
      Serial.println(
        "######################################"
      );

      Serial.println(
        "          BOTTLE DETECTED!"
      );

      Serial.println(
        "######################################"
      );

      sendOpenLidCommand();

    } else {

      Serial.println();
      Serial.println(
        "No bottle detected."
      );
    }

  } else {

    Serial.println();
    Serial.println(
      "======================================"
    );

    Serial.println(
      "          YOLO CONNECTION ERROR"
    );

    Serial.println(
      "======================================");

    Serial.print(
      "Error: "
    );

    Serial.println(
      http.errorToString(httpCode)
    );

    Serial.print(
      "YOLO URL: "
    );

    Serial.println(
      YOLO_URL
    );
  }

  http.end();
}


// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(115200);

  // ให้ sensor มีเวลานิ่งหลังเปิดเครื่อง
  delay(5000);

  Serial.println();
  Serial.println("======================================");
  Serial.println("       SMARTBIN ESP32-CAM");
  Serial.println("       YOLO + SMARTBIN");
  Serial.println("======================================");

  // ====================================================
  // CAMERA
  // ====================================================

  Serial.println();
  Serial.println(
    "START CAMERA..."
  );

  if (!initCamera()) {

    Serial.println();
    Serial.println(
      "Camera failed!"
    );

    Serial.println(
      "System stopped."
    );

    while (true) {

      delay(1000);
    }
  }

  Serial.println(
    "CAMERA DONE"
  );

  // ====================================================
  // WIFI
  // ====================================================

  Serial.println();
  Serial.println(
    "START WIFI..."
  );

  if (!connectWiFi()) {

    Serial.println();
    Serial.println(
      "WiFi failed!"
    );

    Serial.println(
      "System stopped."
    );

    while (true) {

      delay(1000);
    }
  }

  Serial.println(
    "WIFI DONE"
  );

  // ====================================================
  // TEST SERVER
  // ====================================================

  testYOLO();

  delay(500);

  testBackend();

  // ====================================================
  // READY
  // ====================================================

  Serial.println();
  Serial.println(
    "======================================"
  );

  Serial.println(
    "          SYSTEM READY"
  );

  Serial.println(
    "======================================"
  );

  Serial.println(
    "Camera      : OK"
  );

  Serial.println(
    "WiFi        : OK"
  );

  Serial.println(
    "YOLO API    : 192.168.1.178:8000"
  );

  Serial.println(
    "Backend     : 192.168.1.178:3000"
  );

  Serial.println(
    "======================================"
  );

  Serial.println();
  Serial.println(
    "Starting detection..."
  );
}


// ======================================================
// LOOP
// ======================================================

void loop() {

  if (
    millis() - lastDetection >=
    DETECTION_INTERVAL
  ) {

    lastDetection =
      millis();

    detectBottle();
  }

  delay(50);
}