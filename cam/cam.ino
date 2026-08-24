#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"

// ======================================================
// WIFI
// ======================================================

const char* ssid = "Siraphat_2.4G";
const char* password = "siraphat6323";

// ======================================================
// YOLO API
// ======================================================

const char* YOLO_URL =
  "http://192.168.1.178:8000/detect";

// ======================================================
// SMARTBIN BACKEND
// ======================================================

const char* BACKEND_URL =
  "http://192.168.1.178:3000";

// ======================================================
// AI THINKER ESP32-CAM PIN
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

// ตรวจจับทุก 3 วินาที
const unsigned long DETECTION_INTERVAL = 3000;

// ป้องกันเปิดฝาซ้ำ
const unsigned long LID_COOLDOWN = 5000;

// เวลา
unsigned long lastDetection = 0;
unsigned long lastLidCommand = 0;


// ======================================================
// CAMERA
// ======================================================

bool initCamera() {

  Serial.println();
  Serial.println("======================================");
  Serial.println("          CAMERA INITIALIZE");
  Serial.println("======================================");

  Serial.println("Creating camera config...");

  camera_config_t config;

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;

  config.pixel_format = PIXFORMAT_JPEG;

  config.frame_size = FRAMESIZE_VGA;

  config.jpeg_quality = 12;

  config.fb_count = 1;

  Serial.println("Camera config OK");

  Serial.println("Calling esp_camera_init()...");

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {

    Serial.print("Camera init FAILED: 0x");

    Serial.println(err, HEX);

    return false;
  }

  Serial.println("Camera init SUCCESS");

  return true;
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

  Serial.print("Connecting to: ");

  Serial.println(ssid);

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
// CHECK WIFI
// ======================================================

bool ensureWiFi() {

  if (
    WiFi.status() == WL_CONNECTED
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

  unsigned long startTime =
    millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startTime < 10000
  ) {

    delay(500);

    Serial.print(".");
  }

  Serial.println();

  if (
    WiFi.status() == WL_CONNECTED
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
// SEND OPEN LID TO BACKEND
// ======================================================

void sendOpenLidCommand() {

  // ====================================================
  // COOLDOWN
  // ====================================================

  if (
    millis() - lastLidCommand
    < LID_COOLDOWN
  ) {

    Serial.println(
      "Lid command cooldown..."
    );

    return;
  }


  Serial.println();
  Serial.println("======================================");
  Serial.println("       BOTTLE DETECTED");
  Serial.println("======================================");

  Serial.println(
    "Sending OPEN command to Backend..."
  );


  // ====================================================
  // HTTP
  // ====================================================

  HTTPClient http;

  String url =
    String(BACKEND_URL)
    + "/api/trigger-lid";

  Serial.print(
    "URL: "
  );

  Serial.println(
    url
  );

  http.begin(url);

  http.setTimeout(5000);

  http.addHeader(
    "Content-Type",
    "application/json"
  );


  // ====================================================
  // JSON
  // ====================================================

  String json =
    "{\"action\":\"open\"}";

  Serial.print(
    "POST: "
  );

  Serial.println(
    json
  );


  // ====================================================
  // POST
  // ====================================================

  int httpCode =
    http.POST(
      json
    );


  // ====================================================
  // RESULT
  // ====================================================

  Serial.print(
    "Backend HTTP Code: "
  );

  Serial.println(
    httpCode
  );


  if (
    httpCode > 0
  ) {

    String response =
      http.getString();

    Serial.print(
      "Backend Response: "
    );

    Serial.println(
      response
    );


    if (
      httpCode >= 200 &&
      httpCode < 300
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
      "HTTP Error: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );
  }

  http.end();
}


// ======================================================
// SEND IMAGE TO YOLO
// ======================================================

void detectBottle() {

  // ====================================================
  // CHECK WIFI
  // ====================================================

  if (
    !ensureWiFi()
  ) {

    return;
  }


  // ====================================================
  // CAMERA CAPTURE
  // ====================================================

  Serial.println();
  Serial.println("--------------------------------------");

  Serial.println(
    "Capturing image..."
  );

  camera_fb_t* fb =
    esp_camera_fb_get();


  if (!fb) {

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


  // ====================================================
  // CREATE HTTP
  // ====================================================

  HTTPClient http;

  Serial.println(
    "Connecting to YOLO API..."
  );

  http.begin(
    YOLO_URL
  );

  http.setTimeout(
    15000
  );


  // ====================================================
  // MULTIPART
  // ====================================================

  String boundary =
    "----ESP32CAMBoundary";


  String contentType =
    "multipart/form-data; boundary="
    + boundary;


  http.addHeader(
    "Content-Type",
    contentType
  );


  // ====================================================
  // HEADER
  // ====================================================

  String head =
    "--"
    + boundary
    + "\r\n"
    "Content-Disposition: form-data; "
    "name=\"file\"; "
    "filename=\"image.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n"
    "\r\n";


  // ====================================================
  // TAIL
  // ====================================================

  String tail =
    "\r\n--"
    + boundary
    + "--\r\n";


  // ====================================================
  // TOTAL LENGTH
  // ====================================================

  size_t totalLength =
    head.length()
    + fb->len
    + tail.length();


  Serial.print(
    "Payload: "
  );

  Serial.print(
    totalLength
  );

  Serial.println(
    " bytes"
  );


  // ====================================================
  // ALLOCATE
  // ====================================================

  uint8_t* payload =
    (uint8_t*)malloc(
      totalLength
    );


  if (
    payload == nullptr
  ) {

    Serial.println(
      "ERROR: malloc failed"
    );

    esp_camera_fb_return(
      fb
    );

    http.end();

    return;
  }


  // ====================================================
  // COPY HEADER
  // ====================================================

  memcpy(
    payload,
    head.c_str(),
    head.length()
  );


  // ====================================================
  // COPY IMAGE
  // ====================================================

  memcpy(
    payload + head.length(),
    fb->buf,
    fb->len
  );


  // ====================================================
  // COPY TAIL
  // ====================================================

  memcpy(
    payload
    + head.length()
    + fb->len,

    tail.c_str(),

    tail.length()
  );


  // ====================================================
  // SEND
  // ====================================================

  Serial.println(
    "Sending image to YOLO..."
  );


  int httpCode =
    http.POST(
      payload,
      totalLength
    );


  // ====================================================
  // FREE MEMORY
  // ====================================================

  free(
    payload
  );

  esp_camera_fb_return(
    fb
  );


  // ====================================================
  // HTTP CODE
  // ====================================================

  Serial.print(
    "HTTP Code: "
  );

  Serial.println(
    httpCode
  );


  // ====================================================
  // SUCCESS
  // ====================================================

  if (
    httpCode > 0
  ) {

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


    // ==================================================
    // DETECT BOTTLE
    // ==================================================

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
        "       BOTTLE DETECTED!"
      );

      Serial.println(
        "######################################"
      );


      // =================================================
      // SEND COMMAND
      // =================================================

      sendOpenLidCommand();

    }

    else {

      Serial.println();
      Serial.println(
        "No bottle detected."
      );
    }
  }

  // ====================================================
  // ERROR
  // ====================================================

  else {

    Serial.println();
    Serial.println(
      "======================================"
    );

    Serial.println(
      "         YOLO CONNECTION ERROR"
    );

    Serial.println(
      "======================================"
    );

    Serial.print(
      "Error: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );

    Serial.print(
      "YOLO URL: "
    );

    Serial.println(
      YOLO_URL
    );

    Serial.println(
      "Check:"
    );

    Serial.println(
      "1. PC IP"
    );

    Serial.println(
      "2. WiFi"
    );

    Serial.println(
      "3. Uvicorn"
    );

    Serial.println(
      "4. Windows Firewall"
    );
  }


  http.end();
}


// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(
    115200
  );

  delay(
    2000
  );


  Serial.println();
  Serial.println(
    "======================================"
  );

  Serial.println(
    "       SMARTBIN ESP32-CAM"
  );

  Serial.println(
    "       YOLO + SMARTBIN"
  );

  Serial.println(
    "======================================"
  );


  // ====================================================
  // CAMERA
  // ====================================================

  Serial.println();
  Serial.println(
    "START CAMERA..."
  );


  if (
    !initCamera()
  ) {

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


  if (
    !connectWiFi()
  ) {

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
  // SYSTEM READY
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
    "Backend     : 192.168.1.166:3000"
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

  // ====================================================
  // DETECTION TIMER
  // ====================================================

  if (
    millis() - lastDetection
    >= DETECTION_INTERVAL
  ) {

    lastDetection =
      millis();

    detectBottle();
  }


  delay(50);
}