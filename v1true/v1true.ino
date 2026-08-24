#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <TM1637Display.h>
#include <ESP32Servo.h>
#include <math.h>

// ======================================================
// WIFI
// ======================================================

const char* ssid = "Siraphat_2.4G";
const char* password = "siraphat6323";

// ======================================================
// BACKEND
// ======================================================

const char* serverUrl =
  "http://192.168.1.178:3000";

// ======================================================
// PIN
// ======================================================

// HX711
#define HX711_DT 16
#define HX711_SCK 19

// TM1637
#define TM1637_DIO 21
#define TM1637_CLK 18

// Servo
#define SERVO_PIN 23

// ======================================================
// OBJECT
// ======================================================

HX711 scale;

TM1637Display display(
  TM1637_CLK,
  TM1637_DIO
);

Servo lidServo;

// ======================================================
// SERVO
// ======================================================

#define SERVO_OPEN 0
#define SERVO_CLOSE 90

// ======================================================
// HX711 CALIBRATION
// ======================================================

float calibration_factor = 437000.0;

// ======================================================
// WEIGHT SETTINGS
// ======================================================

// ======================================================
// สำคัญ
//
// ไม่มีการกำหนดขั้นต่ำว่าต้องเพิ่มกี่กรัม
//
// เช่น
//
// 0.55 -> 0.56
// 0.56 -> 0.57
// 1.10 -> 1.11
//
// ถ้าน้ำหนักเพิ่มขึ้นและนิ่ง
// จะถือว่าเป็นขวดใหม่
//
// ======================================================

// ต้องนิ่งติดต่อกันกี่ครั้ง
const int STABLE_COUNT_REQUIRED = 5;

// ความแตกต่างของน้ำหนักที่ถือว่า "นิ่ง"
//
// ไม่ใช่ค่าขั้นต่ำในการตรวจขวด
// ใช้เฉพาะตรวจว่าน้ำหนักหยุดนิ่งแล้ว
//
const float STABLE_DIFFERENCE = 0.05;

// ======================================================
// WEIGHT
// ======================================================

// น้ำหนักจริงทั้งหมดในถัง
float currentWeight = 0.0;

// น้ำหนักก่อนใส่ขวดใหม่
float previousWeight = 0.0;

// น้ำหนักที่เพิ่มขึ้นจากขวดใหม่
float newBottleWeight = 0.0;

// น้ำหนักล่าสุดที่ส่งเว็บ
float lastSentWeight = 0.0;

// ======================================================
// STATE
// ======================================================

enum SystemState {

  WAITING_COMMAND,

  WAITING_NEW_BOTTLE,

  MEASURING,

  SENDING

};

SystemState state =
  WAITING_COMMAND;

// ======================================================
// LID
// ======================================================

bool lidOpen = false;

unsigned long lidOpenTime = 0;

const unsigned long LID_TIMEOUT = 10000;

// ======================================================
// STABLE
// ======================================================

float lastAddedWeight = 0.0;

int stableCount = 0;

// ======================================================
// WIFI CHECK
// ======================================================

unsigned long lastWiFiCheck = 0;

const unsigned long WIFI_CHECK_INTERVAL = 5000;

// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("======================================");
  Serial.println("          SMARTBIN ESP32");
  Serial.println("======================================");

  // ====================================================
  // TM1637
  // ====================================================

  display.setBrightness(7);

  display.showNumberDecEx(
    0,
    0,
    true
  );

  Serial.println("TM1637 initialized");

  // ====================================================
  // SERVO
  // ====================================================

  lidServo.setPeriodHertz(50);

  lidServo.attach(
    SERVO_PIN,
    500,
    2400
  );

  lidServo.write(
    SERVO_CLOSE
  );

  lidOpen = false;

  Serial.println("Servo initialized");
  Serial.println("Lid: CLOSED");

  // ====================================================
  // HX711
  // ====================================================

  scale.begin(
    HX711_DT,
    HX711_SCK
  );

  scale.set_scale(
    calibration_factor
  );

  Serial.println();
  Serial.println("Initializing HX711...");

  delay(1000);

  // ====================================================
  // TARE
  // ====================================================

  Serial.println("Taring scale...");

  scale.tare(20);

  delay(500);

  Serial.println("HX711 READY");

  // ====================================================
  // RAW DEBUG
  // ====================================================

  Serial.println();
  Serial.println("========== HX711 TEST ==========");

  if (scale.is_ready()) {

    long raw =
      scale.read_average(10);

    Serial.print("Raw HX711: ");
    Serial.println(raw);

    float testWeight =
      scale.get_units(10);

    if (testWeight < 0) {
      testWeight = 0;
    }

    Serial.print("Weight: ");
    Serial.print(testWeight, 2);
    Serial.println(" g");

  } else {

    Serial.println(
      "ERROR: HX711 NOT READY"
    );

  }

  Serial.println(
    "================================"
  );

  // ====================================================
  // WIFI
  // ====================================================

  connectWiFi();

  // ====================================================
  // INITIAL DISPLAY
  // ====================================================

  displayWeight(0.0);

  // ====================================================
  // READY
  // ====================================================

  Serial.println();
  Serial.println("======================================");
  Serial.println("          SMARTBIN READY");
  Serial.println("======================================");

  Serial.print("Backend: ");
  Serial.println(serverUrl);

  Serial.println();
  Serial.println(
    "Waiting for YOLO command..."
  );

}

// ======================================================
// LOOP
// ======================================================

void loop() {

  // ====================================================
  // WIFI
  // ====================================================

  if (
    millis() - lastWiFiCheck >=
    WIFI_CHECK_INTERVAL
  ) {

    lastWiFiCheck = millis();

    if (
      WiFi.status() != WL_CONNECTED
    ) {

      Serial.println(
        "WiFi disconnected!"
      );

      connectWiFi();

    }

  }

  // ====================================================
  // STATE
  // ====================================================

  switch (state) {

    case WAITING_COMMAND:

      checkLidCommand();

      break;

    case WAITING_NEW_BOTTLE:

      measureNewBottle();

      break;

    case MEASURING:

      measureNewBottle();

      break;

    case SENDING:

      break;

  }

  // ====================================================
  // AUTO CLOSE
  // ====================================================

  if (
    lidOpen &&
    millis() - lidOpenTime >=
    LID_TIMEOUT
  ) {

    Serial.println();
    Serial.println(
      "Lid timeout!"
    );

    Serial.println(
      "No new bottle detected."
    );

    closeLid();

    state =
      WAITING_COMMAND;

  }

  delay(100);

}

// ======================================================
// CONNECT WIFI
// ======================================================

void connectWiFi() {

  Serial.println();
  Serial.println(
    "======================================"
  );

  Serial.println(
    "          CONNECTING WIFI"
  );

  Serial.println(
    "======================================"
  );

  WiFi.mode(WIFI_STA);

  WiFi.begin(
    ssid,
    password
  );

  Serial.print(
    "Connecting"
  );

  int retry = 0;

  while (
    WiFi.status() != WL_CONNECTED &&
    retry < 30
  ) {

    delay(500);

    Serial.print(".");

    retry++;

  }

  Serial.println();

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    Serial.println(
      "WiFi connected!"
    );

    Serial.print(
      "ESP32 IP: "
    );

    Serial.println(
      WiFi.localIP()
    );

    Serial.print(
      "Backend: "
    );

    Serial.println(
      serverUrl
    );

  } else {

    Serial.println(
      "ERROR: WiFi connection failed"
    );

  }

  Serial.println(
    "======================================"
  );

}

// ======================================================
// GET WEIGHT
// ======================================================

float getWeight() {

  if (
    !scale.is_ready()
  ) {

    Serial.println(
      "HX711 NOT READY"
    );

    return currentWeight;

  }

  float weight =
    scale.get_units(10);

  if (
    weight < 0
  ) {

    weight = 0;

  }

  return weight;

}

// ======================================================
// CHECK LID COMMAND
// ======================================================

void checkLidCommand() {

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    return;

  }

  HTTPClient http;

  String url =
    String(serverUrl) +
    "/api/lid";

  http.begin(url);

  http.setTimeout(3000);

  int httpCode =
    http.GET();

  if (
    httpCode == 200
  ) {

    String response =
      http.getString();

    Serial.print(
      "Lid API: "
    );

    Serial.println(
      response
    );

    // ==================================================
    // OPEN
    // ==================================================

    if (
      response.indexOf(
        "\"action\":\"open\""
      ) >= 0
      ||
      response.indexOf(
        "\"action\": \"open\""
      ) >= 0
    ) {

      if (!lidOpen) {

        openLid();

        state =
          WAITING_NEW_BOTTLE;

      }

    }

    // ==================================================
    // CLOSE
    // ==================================================

    if (
      response.indexOf(
        "\"action\":\"close\""
      ) >= 0
      ||
      response.indexOf(
        "\"action\": \"close\""
      ) >= 0
    ) {

      if (lidOpen) {

        closeLid();

        state =
          WAITING_COMMAND;

      }

    }

  } else {

    if (
      httpCode < 0
    ) {

      Serial.print(
        "Lid API Error: "
      );

      Serial.println(
        http.errorToString(
          httpCode
        )
      );

    }

  }

  http.end();

}

// ======================================================
// OPEN LID
// ======================================================

void openLid() {

  Serial.println();
  Serial.println(
    "======================================"
  );

  Serial.println(
    "            OPENING LID"
  );

  Serial.println(
    "======================================"
  );

  // ====================================================
  // อ่านน้ำหนักจริงก่อนรับขวดใหม่
  //
  // ตัวอย่าง:
  //
  // ขวด 1 อยู่ในถัง
  // previousWeight = 0.55
  //
  // ขวด 2 ลงมา
  // HX711 = 0.57
  //
  // จะตรวจว่า
  // 0.57 > 0.55
  //
  // ====================================================

  delay(500);

  previousWeight =
    getWeight();

  currentWeight =
    previousWeight;

  Serial.print(
    "Weight before new bottle: "
  );

  Serial.print(
    previousWeight,
    2
  );

  Serial.println(
    " g"
  );

  // ====================================================
  // OPEN SERVO
  // ====================================================

  lidServo.write(
    SERVO_OPEN
  );

  lidOpen = true;

  lidOpenTime =
    millis();

  stableCount = 0;

  lastAddedWeight =
    0.0;

  newBottleWeight =
    0.0;

  Serial.println(
    "Servo = 90 degrees"
  );

  Serial.println();

  Serial.println(
    "Waiting for NEW bottle..."
  );

  Serial.print(
    "Current total weight: "
  );

  Serial.print(
    previousWeight,
    2
  );

  Serial.println(
    " g"
  );

  Serial.println(
    "ANY weight increase will be detected as a new bottle."
  );

}

// ======================================================
// MEASURE NEW BOTTLE
// ======================================================

void measureNewBottle() {

  if (!lidOpen) {

    return;

  }

  // ====================================================
  // READ TOTAL REAL WEIGHT
  // ====================================================

  float weight =
    getWeight();

  currentWeight =
    weight;

  // ====================================================
  // CALCULATE INCREASE
  // ====================================================

  float addedWeight =
    weight - previousWeight;

  // ถ้าน้ำหนักลดลง
  // ไม่ถือว่าเป็นขวดใหม่
  if (
    addedWeight < 0
  ) {

    addedWeight = 0;

  }

  // ====================================================
  // SERIAL
  // ====================================================

  Serial.print(
    "HX711 Total Weight: "
  );

  Serial.print(
    weight,
    2
  );

  Serial.print(
    " g | Added: "
  );

  Serial.print(
    addedWeight,
    2
  );

  Serial.println(
    " g"
  );

  // ====================================================
  // TM1637
  // ====================================================

  displayWeight(
    weight
  );

  // ====================================================
  // สำคัญ
  //
  // ไม่มี MIN_NEW_BOTTLE_WEIGHT แล้ว
  //
  // ขอแค่น้ำหนักเพิ่มมากกว่า 0
  //
  // เช่น:
  //
  // 0.55 -> 0.56 = ตรวจ
  // 0.56 -> 0.57 = ตรวจ
  // 1.10 -> 1.11 = ตรวจ
  //
  // ====================================================

  if (
    addedWeight <= 0
  ) {

    stableCount = 0;

    lastAddedWeight =
      0.0;

    return;

  }

  // ====================================================
  // CHECK STABLE
  // ====================================================

  float difference =
    fabs(
      addedWeight -
      lastAddedWeight
    );

  if (
    difference <=
    STABLE_DIFFERENCE
  ) {

    stableCount++;

  } else {

    stableCount = 1;

  }

  lastAddedWeight =
    addedWeight;

  Serial.print(
    "Stable: "
  );

  Serial.print(
    stableCount
  );

  Serial.print(
    "/"
  );

  Serial.println(
    STABLE_COUNT_REQUIRED
  );

  // ====================================================
  // STABLE
  // ====================================================

  if (
    stableCount >=
    STABLE_COUNT_REQUIRED
  ) {

    // ==================================================
    // น้ำหนักขวดที่เพิ่ม
    // ==================================================

    newBottleWeight =
      addedWeight;

    // ==================================================
    // น้ำหนักรวมจริงในถัง
    // ==================================================

    float totalWeight =
      weight;

    Serial.println();
    Serial.println(
      "======================================"
    );

    Serial.println(
      "          NEW BOTTLE DETECTED"
    );

    Serial.println(
      "======================================"
    );

    Serial.print(
      "Previous total weight: "
    );

    Serial.print(
      previousWeight,
      2
    );

    Serial.println(
      " g"
    );

    Serial.print(
      "Weight increased: "
    );

    Serial.print(
      newBottleWeight,
      2
    );

    Serial.println(
      " g"
    );

    Serial.print(
      "TOTAL REAL WEIGHT: "
    );

    Serial.print(
      totalWeight,
      2
    );

    Serial.println(
      " g"
    );

    // ==================================================
    // DISPLAY TOTAL
    // ==================================================

    displayWeight(
      totalWeight
    );

    // ==================================================
    // SEND TOTAL TO WEB
    // ==================================================

    state =
      SENDING;

    bool sent =
      sendRecycleData(
        totalWeight
      );

    // ==================================================
    // ถ้าส่งสำเร็จเท่านั้น
    // ให้ถือว่ารับขวดเรียบร้อย
    // ==================================================

    if (sent) {

      delay(500);

      closeLid();

      // =================================================
      // อัปเดตฐานเป็นน้ำหนักรวมล่าสุด
      // =================================================

      previousWeight =
        totalWeight;

      currentWeight =
        totalWeight;

      stableCount = 0;

      lastAddedWeight =
        0.0;

      newBottleWeight =
        0.0;

      state =
        WAITING_COMMAND;

      Serial.println();
      Serial.println(
        "======================================"
      );

      Serial.println(
        "TOTAL WEIGHT SAVED"
      );

      Serial.print(
        "Current tank weight: "
      );

      Serial.print(
        previousWeight,
        2
      );

      Serial.println(
        " g"
      );

      Serial.println(
        "Lid CLOSED"
      );

      Serial.println(
        "Waiting for next bottle..."
      );

      Serial.println(
        "======================================"
      );

    } else {

      // =================================================
      // ถ้าส่งไม่สำเร็จ
      // ห้ามอัปเดต previousWeight
      //
      // เพื่อให้สามารถส่งขวดนี้ใหม่ได้
      // =================================================

      Serial.println();
      Serial.println(
        "ERROR: Weight was NOT sent."
      );

      Serial.println(
        "Keeping current bottle state."
      );

      stableCount = 0;

      state =
        WAITING_NEW_BOTTLE;

    }

  }

}

// ======================================================
// DISPLAY WEIGHT
// ======================================================

void displayWeight(
  float weight
) {

  if (
    weight < 0
  ) {

    weight = 0;

  }

  if (
    weight > 99.99
  ) {

    weight = 99.99;

  }

  int value =
    (int)round(
      weight * 100.0
    );

  display.showNumberDecEx(
    value,
    0b01000000,
    true
  );

  Serial.print(
    "TM1637 TOTAL: "
  );

  Serial.print(
    weight,
    2
  );

  Serial.println(
    " g"
  );

}

// ======================================================
// CLOSE LID
// ======================================================

void closeLid() {

  Serial.println();
  Serial.println(
    "======================================"
  );

  Serial.println(
    "            CLOSING LID"
  );

  Serial.println(
    "======================================"
  );

  lidServo.write(
    SERVO_CLOSE
  );

  lidOpen = false;

  Serial.println(
    "Servo = 0 degrees"
  );

  Serial.println(
    "Lid CLOSED"
  );

}

// ======================================================
// SEND RECYCLE DATA
// ======================================================
//
// ส่งน้ำหนักรวมจริงในถัง
//
// ตัวอย่าง:
//
// รอบ 1
// HX711 = 0.55
// ส่งเว็บ = 0.55
//
// รอบ 2
// HX711 = 0.57
// ส่งเว็บ = 0.57
//
// รอบ 3
// HX711 = 1.10
// ส่งเว็บ = 1.10
//
// ======================================================

bool sendRecycleData(
  float weight
) {

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    Serial.println(
      "ERROR: WiFi disconnected"
    );

    return false;

  }

  HTTPClient http;

  String url =
    String(serverUrl) +
    "/api/recycle";

  http.begin(url);

  http.setTimeout(10000);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  // ====================================================
  // JSON
  // ====================================================

  String json =
    "{\"weight\":" +
    String(weight, 2) +
    ",\"isBottle\":true}";

  // ====================================================
  // SERIAL
  // ====================================================

  Serial.println();
  Serial.println(
    "======================================"
  );

  Serial.println(
    "       SEND TOTAL WEIGHT TO WEB"
  );

  Serial.println(
    "======================================"
  );

  Serial.print(
    "URL: "
  );

  Serial.println(
    url
  );

  Serial.print(
    "TOTAL HX711 WEIGHT: "
  );

  Serial.print(
    weight,
    2
  );

  Serial.println(
    " g"
  );

  Serial.print(
    "JSON: "
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

  Serial.print(
    "HTTP Code: "
  );

  Serial.println(
    httpCode
  );

  // ====================================================
  // RESPONSE
  // ====================================================

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
        "======================================"
      );

      Serial.println(
        "     TOTAL WEIGHT SENT SUCCESSFULLY"
      );

      Serial.println(
        "======================================"
      );

      lastSentWeight =
        weight;

      http.end();

      return true;

    } else {

      Serial.println(
        "Backend returned error."
      );

    }

  } else {

    Serial.print(
      "HTTP ERROR: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );

  }

  http.end();

  return false;

}