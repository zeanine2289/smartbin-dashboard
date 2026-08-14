#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <TM1637Display.h>
#include <ESP32Servo.h>

// =================================================
// WIFI
// =================================================

const char* ssid = "Siraphat_2.4G";
const char* password = "siraphat6323";

// =================================================
// API
// =================================================

const char* serverUrl =
  "http://192.168.1.138:3000/api/recycle";

const char* resetUrl =
  "http://192.168.1.138:3000/api/check-reset";

const char* lidUrl =
  "http://192.168.1.138:3000/api/lid";

// =================================================
// HX711
// =================================================

#define DT 16
#define SCK 19

HX711 scale;

float calibration_factor = 437000.0;

// =================================================
// TM1637
// =================================================

#define TM1637_DIO 21
#define TM1637_CLK 18

TM1637Display display(
  TM1637_CLK,
  TM1637_DIO
);

// =================================================
// SERVO
// =================================================

#define SERVO_PIN 23

Servo lidServo;

// มุมปิด
const int SERVO_CLOSE = 0;

// มุมเปิด
const int SERVO_OPEN = 90;

// เปิด 3 วินาที
const unsigned long SERVO_OPEN_TIME = 3000;

bool lidIsOpen = false;

unsigned long lidOpenTime = 0;

// =================================================
// ตรวจจับขวด
// =================================================

float newBottleWeight = 0.005;

float stableDifference = 0.002;

int stableCountRequired = 5;

// =================================================
// ตัวแปรระบบ
// =================================================

float lastConfirmedWeight = 0.0;

float totalWeight = 0.0;

float currentWeight = 0.0;

int bottleCount = 0;

float previousWeight = 0.0;

int stableCount = 0;

// =================================================
// RESET
// =================================================

unsigned long lastResetCheck = 0;

const unsigned long resetCheckInterval = 1000;

// =================================================
// LID CHECK
// =================================================

unsigned long lastLidCheck = 0;

const unsigned long lidCheckInterval = 300;

// =================================================
// SETUP
// =================================================

void setup() {

  Serial.begin(115200);

  // =================================================
  // TM1637
  // =================================================

  display.setBrightness(7);

  display.showNumberDec(
    8888,
    true
  );

  delay(1000);

  display.showNumberDec(
    0,
    true
  );

  // =================================================
  // SERVO
  // =================================================

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "SERVO START"
  );

  Serial.println(
    "================================"
  );

  lidServo.setPeriodHertz(50);

  bool servoAttached =
    lidServo.attach(
      SERVO_PIN,
      500,
      2400
    );

  if (servoAttached) {

    Serial.println(
      "Servo attach OK"
    );

    Serial.print(
      "Servo GPIO: "
    );

    Serial.println(
      SERVO_PIN
    );

  } else {

    Serial.println(
      "Servo attach FAILED"
    );
  }

  // ปิดฝาตอนเริ่ม
  lidServo.write(
    SERVO_CLOSE
  );

  delay(500);

  lidIsOpen = false;

  Serial.println(
    "Servo position: CLOSE"
  );

  // =================================================
  // HX711
  // =================================================

  scale.begin(
    DT,
    SCK
  );

  scale.set_scale(
    calibration_factor
  );

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "HX711 START"
  );

  Serial.println(
    "================================"
  );

  delay(1000);

  scale.tare();

  Serial.println(
    "HX711 Tare complete"
  );

  delay(500);

  // =================================================
  // WIFI
  // =================================================

  WiFi.begin(
    ssid,
    password
  );

  Serial.print(
    "Connecting WiFi"
  );

  while (
    WiFi.status() != WL_CONNECTED
  ) {

    delay(500);

    Serial.print(
      "."
    );
  }

  Serial.println();

  Serial.println(
    "WiFi Connected!"
  );

  Serial.print(
    "ESP32 IP: "
  );

  Serial.println(
    WiFi.localIP()
  );

  // =================================================
  // อ่านน้ำหนักเริ่มต้น
  // =================================================

  float startWeight =
    scale.get_units(10);

  if (startWeight < 0) {
    startWeight = 0;
  }

  currentWeight =
    startWeight;

  lastConfirmedWeight =
    startWeight;

  previousWeight =
    startWeight;

  // =================================================
  // READY
  // =================================================

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "       SMART BIN READY"
  );

  Serial.println(
    "================================"
  );

  Serial.print(
    "Starting weight: "
  );

  Serial.print(
    startWeight,
    3
  );

  Serial.println(
    " kg"
  );

  Serial.print(
    "Baseline: "
  );

  Serial.print(
    lastConfirmedWeight,
    3
  );

  Serial.println(
    " kg"
  );

  Serial.println();

  display.showNumberDec(
    0,
    true
  );
}

// =================================================
// LOOP
// =================================================

void loop() {

  // =================================================
  // CHECK RESET
  // =================================================

  if (
    millis() - lastResetCheck >=
    resetCheckInterval
  ) {

    lastResetCheck =
      millis();

    checkResetCommand();
  }

  // =================================================
  // CHECK LID
  // =================================================

  if (
    millis() - lastLidCheck >=
    lidCheckInterval
  ) {

    lastLidCheck =
      millis();

    checkLidCommand();
  }

  // =================================================
  // AUTO CLOSE AFTER 3 SEC
  // =================================================

  if (
    lidIsOpen &&
    millis() - lidOpenTime >=
    SERVO_OPEN_TIME
  ) {

    Serial.println();
    Serial.println(
      "================================"
    );

    Serial.println(
      "⏰ 3 seconds finished"
    );

    Serial.println(
      "================================"
    );

    closeLid();
  }

  // =================================================
  // CHECK HX711
  // =================================================

  if (
    !scale.is_ready()
  ) {

    Serial.println(
      "HX711 not found!"
    );

    delay(500);

    return;
  }

  // =================================================
  // READ WEIGHT
  // =================================================

  float weight =
    scale.get_units(5);

  if (weight < 0) {
    weight = 0;
  }

  currentWeight =
    weight;

  // =================================================
  // SERIAL
  // =================================================

  Serial.print(
    "Weight: "
  );

  Serial.print(
    weight,
    3
  );

  Serial.print(
    " kg | "
  );

  Serial.print(
    weight * 1000,
    1
  );

  Serial.print(
    " g | Count: "
  );

  Serial.println(
    bottleCount
  );

  // =================================================
  // DISPLAY TOTAL WEIGHT
  // =================================================

  int totalGram =
    (int)round(
      totalWeight * 1000.0
    );

  if (totalGram > 9999) {
    totalGram = 9999;
  }

  if (totalGram < 0) {
    totalGram = 0;
  }

  display.showNumberDec(
    totalGram,
    true
  );

  // =================================================
  // CHECK STABLE WEIGHT
  // =================================================

  if (
    abs(
      weight -
      previousWeight
    ) <= stableDifference
  ) {

    stableCount++;

  } else {

    stableCount = 0;
  }

  previousWeight =
    weight;

  // =================================================
  // NOT STABLE
  // =================================================

  if (
    stableCount <
    stableCountRequired
  ) {

    delay(200);

    return;
  }

  // =================================================
  // STABLE
  // =================================================

  float weightIncrease =
    weight -
    lastConfirmedWeight;

  Serial.print(
    "เพิ่มขึ้น: "
  );

  Serial.print(
    weightIncrease * 1000,
    1
  );

  Serial.println(
    " g"
  );

  // =================================================
  // NEW BOTTLE
  // =================================================

  if (
    weightIncrease >=
    newBottleWeight
  ) {

    // เพิ่มจำนวน
    bottleCount++;

    // น้ำหนักขวดใหม่
    float newWeight =
      weightIncrease;

    // น้ำหนักรวม
    totalWeight +=
      newWeight;

    // อัปเดต baseline
    lastConfirmedWeight =
      weight;

    Serial.println();
    Serial.println(
      "================================"
    );

    Serial.println(
      "🍾 พบขวดใหม่!"
    );

    Serial.print(
      "จำนวนขวด: "
    );

    Serial.println(
      bottleCount
    );

    Serial.print(
      "น้ำหนักขวดใหม่: "
    );

    Serial.print(
      newWeight * 1000,
      1
    );

    Serial.println(
      " g"
    );

    Serial.print(
      "น้ำหนักรวม: "
    );

    Serial.print(
      totalWeight,
      3
    );

    Serial.println(
      " kg"
    );

    Serial.println(
      "================================"
    );

    // =================================================
    // DISPLAY
    // =================================================

    int newTotalGram =
      (int)round(
        totalWeight * 1000.0
      );

    if (
      newTotalGram > 9999
    ) {

      newTotalGram = 9999;
    }

    display.showNumberDec(
      newTotalGram,
      true
    );

    // =================================================
    // SEND API
    // =================================================

    sendToAPI(
      newWeight,
      bottleCount,
      totalWeight
    );

    stableCount = 0;

    delay(500);
  }

  delay(200);
}

// =================================================
// OPEN LID
// =================================================

void openLid() {

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "🚪 OPEN LID"
  );

  Serial.println(
    "================================"
  );

  // เปิด Servo
  lidServo.write(
    SERVO_OPEN
  );

  // บันทึกสถานะ
  lidIsOpen = true;

  // เริ่มจับเวลาใหม่
  lidOpenTime =
    millis();

  Serial.print(
    "Open time: "
  );

  Serial.print(
    SERVO_OPEN_TIME
  );

  Serial.println(
    " ms"
  );
}

// =================================================
// CLOSE LID
// =================================================

void closeLid() {

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "🚪 CLOSE LID"
  );

  Serial.println(
    "================================"
  );

  // ปิด Servo
  lidServo.write(
    SERVO_CLOSE
  );

  // เปลี่ยนสถานะ
  lidIsOpen = false;

  Serial.println(
    "Servo position: CLOSE"
  );
}

// =================================================
// CHECK LID COMMAND
// =================================================

void checkLidCommand() {

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    return;
  }

  HTTPClient http;

  http.begin(
    lidUrl
  );

  int response =
    http.GET();

  if (
    response == 200
  ) {

    String result =
      http.getString();

    Serial.print(
      "Lid check: "
    );

    Serial.println(
      result
    );

    // =================================================
    // OPEN COMMAND
    // =================================================

    if (
      result.indexOf(
        "\"action\":\"open\""
      ) >= 0
    ) {

      openLid();
    }

    // =================================================
    // CLOSE COMMAND
    // =================================================

    if (
      result.indexOf(
        "\"action\":\"close\""
      ) >= 0
    ) {

      closeLid();
    }
  }

  http.end();
}

// =================================================
// SEND DATA TO API
// =================================================

void sendToAPI(
  float bottleWeight,
  int count,
  float totalWeight
) {

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    Serial.println(
      "WiFi disconnected!"
    );

    return;
  }

  HTTPClient http;

  http.begin(
    serverUrl
  );

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  String jsonData =
    "{\"weight\":" +
    String(
      bottleWeight,
      3
    ) +

    ",\"isBottle\":true" +

    ",\"count\":" +
    String(count) +

    ",\"totalWeight\":" +
    String(
      totalWeight,
      3
    ) +

    "}";

  Serial.println();
  Serial.println(
    "Sending API:"
  );

  Serial.println(
    jsonData
  );

  int response =
    http.POST(
      jsonData
    );

  Serial.print(
    "HTTP Response: "
  );

  Serial.println(
    response
  );

  if (
    response > 0
  ) {

    String responseBody =
      http.getString();

    Serial.print(
      "Server: "
    );

    Serial.println(
      responseBody
    );
  }

  http.end();
}

// =================================================
// CHECK RESET
// =================================================

void checkResetCommand() {

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    return;
  }

  HTTPClient http;

  http.begin(
    resetUrl
  );

  int response =
    http.GET();

  if (
    response == 200
  ) {

    String result =
      http.getString();

    Serial.print(
      "Reset check: "
    );

    Serial.println(
      result
    );

    // =================================================
    // RESET COMMAND
    // =================================================

    if (
      result.indexOf(
        "\"reset\":true"
      ) >= 0
    ) {

      Serial.println();
      Serial.println(
        "================================"
      );

      Serial.println(
        "🔄 RESET FROM WEB"
      );

      Serial.println(
        "================================"
      );

      // อ่านน้ำหนักปัจจุบัน
      float resetWeight =
        scale.get_units(10);

      if (
        resetWeight < 0
      ) {

        resetWeight = 0;
      }

      currentWeight =
        resetWeight;

      // Reset จำนวน
      bottleCount = 0;

      // Reset น้ำหนักรวม
      totalWeight = 0.0;

      // ตั้ง baseline ใหม่
      lastConfirmedWeight =
        resetWeight;

      previousWeight =
        resetWeight;

      stableCount = 0;

      // Reset จอ
      display.showNumberDec(
        0,
        true
      );

      Serial.print(
        "New baseline: "
      );

      Serial.print(
        resetWeight,
        3
      );

      Serial.println(
        " kg"
      );

      Serial.println(
        "Bottle count = 0"
      );

      Serial.println(
        "Total weight = 0"
      );

      Serial.println(
        "================================"
      );
    }
  }

  http.end();
}