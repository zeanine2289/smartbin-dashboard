#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <TM1637Display.h>
#include <ESP32Servo.h>
#include <math.h>
#include <Preferences.h>


// ======================================================
// SMARTBIN ESP32
// ======================================================


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

Preferences preferences;


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

// จำนวนครั้งที่ต้องนิ่ง
const int STABLE_COUNT_REQUIRED = 5;

// ยอมให้น้ำหนักแกว่งได้ประมาณ 5 กรัม
// 0.005 kg = 5 g
const float STABLE_DIFFERENCE = 0.005;

// ต้องมีน้ำหนักเพิ่มอย่างน้อย 5 กรัม
const float MIN_NEW_BOTTLE_WEIGHT = 0.005;


// ======================================================
// WEIGHT VARIABLES
// ======================================================

float currentWeight = 0.0;

float weightBeforeBottle = 0.0;

float weightAfterBottle = 0.0;

float newBottleWeight = 0.0;

float lastSentWeight = 0.0;


// ======================================================
// SAVED DATA
// ======================================================

float savedTankWeight = 0.0;

long savedHX711Offset = 0;

bool hasSavedData = false;


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


// เปิดฝาสูงสุด 20 วินาที
const unsigned long LID_TIMEOUT = 20000;


// ======================================================
// STABILITY
// ======================================================

float lastWeight = 0.0;

int stableCount = 0;


// ======================================================
// WIFI
// ======================================================

unsigned long lastWiFiCheck = 0;

const unsigned long WIFI_CHECK_INTERVAL = 5000;


// ======================================================
// BACKEND CHECK
// ======================================================

unsigned long lastBackendCheck = 0;

const unsigned long BACKEND_CHECK_INTERVAL = 1000;


// ======================================================
// PREFERENCES
// ======================================================

const char* PREF_NAMESPACE = "smartbin";

const char* PREF_HAS_DATA = "hasData";

const char* PREF_WEIGHT = "tankWeight";

const char* PREF_OFFSET = "hxOffset";


// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(115200);

  delay(1000);


  Serial.println();

  Serial.println(
    "======================================"
  );

  Serial.println(
    "          SMARTBIN ESP32"
  );

  Serial.println(
    "          WEIGHT UNIT: KG"
  );

  Serial.println(
    "======================================"
  );


  // ====================================================
  // TM1637
  // ====================================================

  display.setBrightness(7);

  display.showNumberDecEx(
    0,
    0,
    true
  );

  Serial.println(
    "TM1637 initialized"
  );


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

  Serial.println(
    "Servo initialized"
  );

  Serial.println(
    "Lid: CLOSED"
  );


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

  Serial.println(
    "Initializing HX711..."
  );

  delay(1000);


  // ====================================================
  // LOAD SAVED DATA
  // ====================================================

  loadSavedData();


  // ====================================================
  // HX711 OFFSET
  // ====================================================

  if (hasSavedData) {

    Serial.println();

    Serial.println(
      "Saved HX711 data found."
    );

    Serial.print(
      "Saved HX711 offset: "
    );

    Serial.println(
      savedHX711Offset
    );


    scale.set_offset(
      savedHX711Offset
    );


    currentWeight =
      savedTankWeight;

    weightBeforeBottle =
      savedTankWeight;

    weightAfterBottle =
      savedTankWeight;

    lastWeight =
      savedTankWeight;


    Serial.println();

    Serial.println(
      "======================================"
    );

    Serial.println(
      "      PREVIOUS TANK WEIGHT LOADED"
    );

    Serial.println(
      "======================================"
    );

    Serial.print(
      "Saved tank weight: "
    );

    Serial.print(
      savedTankWeight,
      4
    );

    Serial.println(
      " kg"
    );


    delay(500);


    float realWeight =
      getWeight();


    Serial.print(
      "HX711 current weight: "
    );

    Serial.print(
      realWeight,
      4
    );

    Serial.println(
      " kg"
    );


    currentWeight =
      realWeight;

    weightBeforeBottle =
      realWeight;

    weightAfterBottle =
      realWeight;

    lastWeight =
      realWeight;

    savedTankWeight =
      realWeight;


    Serial.println();

    Serial.println(
      "ESP32 restarted successfully."
    );

    Serial.println(
      "Old bottles will NOT be counted again."
    );

  }

  else {

    // ==================================================
    // FIRST START
    // ==================================================

    Serial.println();

    Serial.println(
      "======================================"
    );

    Serial.println(
      "       FIRST START"
    );

    Serial.println(
      "======================================"
    );

    Serial.println(
      "Remove ALL weight from Load Cell."
    );

    Serial.println(
      "Performing TARE..."
    );


    delay(1000);


    scale.tare(20);


    delay(500);


    savedHX711Offset =
      scale.get_offset();


    savedTankWeight =
      0.0;

    currentWeight =
      0.0;

    weightBeforeBottle =
      0.0;

    weightAfterBottle =
      0.0;

    lastWeight =
      0.0;


    saveTankData(
      0.0,
      savedHX711Offset
    );


    Serial.println();

    Serial.println(
      "Initial TARE completed."
    );

    Serial.print(
      "HX711 offset: "
    );

    Serial.println(
      savedHX711Offset
    );

  }


  // ====================================================
  // HX711 TEST
  // ====================================================

  Serial.println();

  Serial.println(
    "========== HX711 TEST =========="
  );


  if (scale.is_ready()) {

    float testWeight =
      getWeight();


    Serial.print(
      "Current Weight: "
    );

    Serial.print(
      testWeight,
      4
    );

    Serial.println(
      " kg"
    );

  }

  else {

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
  // DISPLAY
  // ====================================================

  displayWeight(
    currentWeight
  );


  // ====================================================
  // READY
  // ====================================================

  Serial.println();

  Serial.println(
    "======================================"
  );

  Serial.println(
    "          SMARTBIN READY"
  );

  Serial.println(
    "======================================"
  );


  Serial.print(
    "Backend: "
  );

  Serial.println(
    serverUrl
  );


  Serial.print(
    "Current tank weight: "
  );

  Serial.print(
    currentWeight,
    4
  );

  Serial.println(
    " kg"
  );


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
      WiFi.status() !=
      WL_CONNECTED
    ) {

      Serial.println();

      Serial.println(
        "WiFi disconnected!"
      );


      connectWiFi();

    }

  }


  // ====================================================
  // CHECK RESET
  // ====================================================

  if (
    millis() - lastBackendCheck >=
    BACKEND_CHECK_INTERVAL
  ) {

    lastBackendCheck = millis();


    checkResetCommand();

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
      "======================================"
    );

    Serial.println(
      "          LID TIMEOUT"
    );

    Serial.println(
      "======================================"
    );


    Serial.println(
      "No new bottle detected."
    );


    closeLid();


    stableCount = 0;

    state =
      WAITING_COMMAND;

  }


  delay(100);

}


// ======================================================
// WIFI
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

  WiFi.disconnect();

  delay(300);


  WiFi.begin(
    ssid,
    password
  );


  Serial.print(
    "Connecting"
  );


  int retry = 0;


  while (
    WiFi.status() !=
    WL_CONNECTED &&
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

  }

  else {

    Serial.println(
      "ERROR: WiFi connection failed"
    );

  }


  Serial.println(
    "======================================"
  );

}


// ======================================================
// LOAD SAVED DATA
// ======================================================

void loadSavedData() {

  preferences.begin(
    PREF_NAMESPACE,
    false
  );


  hasSavedData =
    preferences.getBool(
      PREF_HAS_DATA,
      false
    );


  if (hasSavedData) {

    savedTankWeight =
      preferences.getFloat(
        PREF_WEIGHT,
        0.0
      );


    savedHX711Offset =
      preferences.getLong(
        PREF_OFFSET,
        0
      );


    Serial.println();

    Serial.println(
      "Saved data loaded."
    );


    Serial.print(
      "Saved tank weight: "
    );

    Serial.print(
      savedTankWeight,
      4
    );

    Serial.println(
      " kg"
    );


    Serial.print(
      "Saved HX711 offset: "
    );

    Serial.println(
      savedHX711Offset
    );

  }

  else {

    savedTankWeight =
      0.0;

    savedHX711Offset =
      0;

    Serial.println();

    Serial.println(
      "No saved data found."
    );

  }

}


// ======================================================
// SAVE TANK DATA
// ======================================================

void saveTankData(
  float weight,
  long offset
) {

  savedTankWeight =
    weight;

  savedHX711Offset =
    offset;


  preferences.putFloat(
    PREF_WEIGHT,
    weight
  );


  preferences.putLong(
    PREF_OFFSET,
    offset
  );


  preferences.putBool(
    PREF_HAS_DATA,
    true
  );


  Serial.println();

  Serial.println(
    "======================================"
  );

  Serial.println(
    "        TANK DATA SAVED"
  );

  Serial.println(
    "======================================"
  );


  Serial.print(
    "Tank weight saved: "
  );

  Serial.print(
    weight,
    4
  );

  Serial.println(
    " kg"
  );


  Serial.print(
    "HX711 offset saved: "
  );

  Serial.println(
    offset
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
    WiFi.status() !=
    WL_CONNECTED
  ) {

    return;

  }


  HTTPClient http;


  String url =
    String(serverUrl) +
    "/api/lid";


  if (!http.begin(url)) {

    Serial.println(
      "ERROR: Cannot begin Lid API"
    );

    return;

  }


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

  }

  else {

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
  // READ BASE WEIGHT
  // ====================================================

  delay(500);


  weightBeforeBottle =
    getWeight();


  currentWeight =
    weightBeforeBottle;


  Serial.print(
    "Weight BEFORE bottle: "
  );

  Serial.print(
    weightBeforeBottle,
    4
  );

  Serial.println(
    " kg"
  );


  // ====================================================
  // OPEN SERVO
  // ====================================================

  lidServo.write(
    SERVO_OPEN
  );


  lidOpen =
    true;


  lidOpenTime =
    millis();


  // ====================================================
  // RESET MEASUREMENT
  // ====================================================

  stableCount = 0;


  lastWeight =
    weightBeforeBottle;


  weightAfterBottle =
    weightBeforeBottle;


  newBottleWeight =
    0.0;


  Serial.println(
    "Servo OPEN"
  );


  Serial.println();

  Serial.println(
    "Waiting for NEW bottle..."
  );


  Serial.print(
    "Base weight: "
  );

  Serial.print(
    weightBeforeBottle,
    4
  );

  Serial.println(
    " kg"
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
  // READ
  // ====================================================

  float weight =
    getWeight();


  currentWeight =
    weight;


  // ====================================================
  // DISPLAY
  // ====================================================

  displayWeight(
    weight
  );


  // ====================================================
  // SERIAL
  // ====================================================

  Serial.print(
    "HX711 Total Weight: "
  );

  Serial.print(
    weight,
    4
  );

  Serial.print(
    " kg"
  );


  // ====================================================
  // DIFFERENCE
  // ====================================================

  float difference =
    fabs(
      weight -
      lastWeight
    );


  if (
    difference <=
    STABLE_DIFFERENCE
  ) {

    stableCount++;

  }

  else {

    stableCount = 1;

  }


  lastWeight =
    weight;


  Serial.print(
    " | Difference: "
  );

  Serial.print(
    difference * 1000.0,
    2
  );

  Serial.print(
    " g"
  );


  Serial.print(
    " | Stable: "
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
  // NOT STABLE
  // ====================================================

  if (
    stableCount <
    STABLE_COUNT_REQUIRED
  ) {

    return;

  }


  // ====================================================
  // STABLE
  // ====================================================

  weightAfterBottle =
    weight;


  // ====================================================
  // NEW BOTTLE WEIGHT
  // ====================================================

  newBottleWeight =
    weightAfterBottle -
    weightBeforeBottle;


  if (
    newBottleWeight < 0
  ) {

    newBottleWeight =
      0;

  }


  // ====================================================
  // DEBUG
  // ====================================================

  Serial.println();

  Serial.println(
    "======================================"
  );

  Serial.println(
    "          WEIGHT STABLE"
  );

  Serial.println(
    "======================================"
  );


  Serial.print(
    "Weight BEFORE: "
  );

  Serial.print(
    weightBeforeBottle,
    4
  );

  Serial.println(
    " kg"
  );


  Serial.print(
    "Weight AFTER : "
  );

  Serial.print(
    weightAfterBottle,
    4
  );

  Serial.println(
    " kg"
  );


  Serial.print(
    "NEW BOTTLE   : "
  );

  Serial.print(
    newBottleWeight,
    4
  );

  Serial.println(
    " kg"
  );


  Serial.print(
    "NEW BOTTLE   : "
  );

  Serial.print(
    newBottleWeight * 1000.0,
    2
  );

  Serial.println(
    " g"
  );


  // ====================================================
  // CHECK MINIMUM
  // ====================================================

  if (
    newBottleWeight <
    MIN_NEW_BOTTLE_WEIGHT
  ) {

    Serial.println();

    Serial.println(
      "No new bottle detected."
    );


    stableCount = 0;


    lastWeight =
      weightBeforeBottle;


    return;

  }


  // ====================================================
  // SEND
  // ====================================================

  Serial.println();

  Serial.println(
    "Sending NEW BOTTLE weight..."
  );


  state =
    SENDING;


  bool sent =
    sendRecycleData(
      newBottleWeight
    );


  // ====================================================
  // SUCCESS
  // ====================================================

  if (sent) {

    Serial.println();

    Serial.println(
      "======================================"
    );

    Serial.println(
      "      NEW BOTTLE SENT SUCCESS"
    );

    Serial.println(
      "======================================"
    );


    Serial.print(
      "Bottle weight: "
    );

    Serial.print(
      newBottleWeight,
      4
    );

    Serial.println(
      " kg"
    );


    Serial.print(
      "Bottle weight: "
    );

    Serial.print(
      newBottleWeight * 1000.0,
      2
    );

    Serial.println(
      " g"
    );


    Serial.print(
      "Tank total: "
    );

    Serial.print(
      weightAfterBottle,
      4
    );

    Serial.println(
      " kg"
    );


    // ==================================================
    // UPDATE BASE
    // ==================================================

    weightBeforeBottle =
      weightAfterBottle;


    currentWeight =
      weightAfterBottle;


    // ==================================================
    // SAVE
    // ==================================================

    saveTankData(
      weightAfterBottle,
      scale.get_offset()
    );


    // ==================================================
    // RESET
    // ==================================================

    stableCount = 0;


    lastWeight =
      weightAfterBottle;


    newBottleWeight =
      0.0;


    // ==================================================
    // CLOSE
    // ==================================================

    delay(500);


    closeLid();


    state =
      WAITING_COMMAND;


    Serial.println();

    Serial.println(
      "======================================"
    );

    Serial.println(
      "       BOTTLE ACCEPTED"
    );

    Serial.println(
      "======================================"
    );


    Serial.print(
      "Current tank weight: "
    );

    Serial.print(
      currentWeight,
      4
    );

    Serial.println(
      " kg"
    );


    Serial.println(
      "Lid CLOSED"
    );


    Serial.println(
      "Waiting for next bottle..."
    );

  }

  else {

    Serial.println();

    Serial.println(
      "======================================"
    );

    Serial.println(
      "          SEND FAILED"
    );

    Serial.println(
      "======================================"
    );


    Serial.println(
      "Bottle NOT confirmed."
    );


    stableCount = 0;


    state =
      WAITING_NEW_BOTTLE;

  }

}


// ======================================================
// DISPLAY WEIGHT
// ======================================================
//
// รูปแบบการแสดงผล:
//
// 8.8 g    -> 8.8
// 20.0 g   -> 20.0
// 573.2 g  -> 573.2
// 999.9 g  -> 999.9
// 1200 g   -> 1200
// 5732 g   -> 5732
//
// ไม่ล็อกไว้ที่ 99.99 อีกแล้ว
//
// ======================================================

void displayWeight(
  float weightKg
) {

  if (
    weightKg < 0
  ) {

    weightKg = 0;

  }


  float weightGram =
    weightKg * 1000.0;


  // ====================================================
  // 0 - 999.9 g
  // แสดงทศนิยม 1 ตำแหน่ง
  // ====================================================

  if (
    weightGram <= 999.9
  ) {

    int value =
      (int)round(
        weightGram * 10.0
      );


    display.showNumberDecEx(
      value,
      0b01000000,
      true
    );

  }

  // ====================================================
  // มากกว่า 999.9 g
  // แสดงเป็นกรัมเต็ม
  // ====================================================

  else {

    int value =
      (int)round(
        weightGram
      );


    // สูงสุดที่ TM1637 4 หลักแสดงได้
    if (
      value > 9999
    ) {

      value = 9999;

    }


    display.showNumberDec(
      value,
      true
    );

  }

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


  lidOpen =
    false;


  Serial.println(
    "Servo CLOSED"
  );

}


// ======================================================
// SEND RECYCLE DATA
// ======================================================
//
// POST /api/recycle
//
// ส่ง KG
//
// ======================================================

bool sendRecycleData(
  float bottleWeightKg
) {

  if (
    WiFi.status() !=
    WL_CONNECTED
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


  if (!http.begin(url)) {

    Serial.println(
      "ERROR: Cannot begin Backend API"
    );

    return false;

  }


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
    String(
      bottleWeightKg,
      4
    ) +
    ",\"isBottle\":true}";


  Serial.println();

  Serial.println(
    "======================================"
  );

  Serial.println(
    "       SEND NEW BOTTLE TO WEB"
  );

  Serial.println(
    "======================================"
  );


  Serial.print(
    "Bottle weight: "
  );

  Serial.print(
    bottleWeightKg,
    4
  );

  Serial.println(
    " kg"
  );


  Serial.print(
    "Bottle weight: "
  );

  Serial.print(
    bottleWeightKg * 1000.0,
    2
  );

  Serial.println(
    " g"
  );


  Serial.print(
    "URL: "
  );

  Serial.println(
    url
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

      Serial.println();

      Serial.println(
        "BOTTLE WEIGHT SENT SUCCESSFULLY"
      );


      lastSentWeight =
        bottleWeightKg;


      http.end();


      return true;

    }


    Serial.println(
      "Backend returned error."
    );

  }

  else {

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


// ======================================================
// CHECK RESET COMMAND
// ======================================================

void checkResetCommand() {

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    return;

  }


  HTTPClient http;


  String url =
    String(serverUrl) +
    "/api/check-reset";


  if (!http.begin(url)) {

    return;

  }


  http.setTimeout(2000);


  int httpCode =
    http.GET();


  if (
    httpCode == 200
  ) {

    String response =
      http.getString();


    if (
      response.indexOf(
        "\"reset\":true"
      ) >= 0

      ||

      response.indexOf(
        "\"reset\": true"
      ) >= 0
    ) {

      Serial.println();

      Serial.println(
        "======================================"
      );

      Serial.println(
        "      RESET COMMAND RECEIVED"
      );

      Serial.println(
        "======================================"
      );


      resetTank();

    }

  }


  http.end();

}


// ======================================================
// RESET TANK
// ======================================================

void resetTank() {

  // ปิดฝา
  closeLid();


  state =
    WAITING_COMMAND;


  stableCount =
    0;


  newBottleWeight =
    0.0;


  weightBeforeBottle =
    0.0;


  weightAfterBottle =
    0.0;


  currentWeight =
    0.0;


  lastWeight =
    0.0;


  // ====================================================
  // TARE
  // ====================================================

  Serial.println(
    "Preparing new TARE..."
  );


  delay(500);


  if (
    scale.is_ready()
  ) {

    scale.tare(20);


    delay(500);


    savedHX711Offset =
      scale.get_offset();


    savedTankWeight =
      0.0;


    saveTankData(
      0.0,
      savedHX711Offset
    );


    Serial.println(
      "New TARE completed."
    );

  }

  else {

    Serial.println(
      "ERROR: HX711 NOT READY during reset"
    );

  }


  displayWeight(
    0.0
  );


  Serial.println();

  Serial.println(
    "======================================"
  );

  Serial.println(
    "          TANK RESET COMPLETE"
  );

  Serial.println(
    "======================================"
  );

  Serial.println(
    "Bottle count = 0"
  );

  Serial.println(
    "Tank weight = 0 kg"
  );

  Serial.println(
    "Ready for next bottle."
  );

}