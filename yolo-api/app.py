from fastapi import FastAPI, File, UploadFile
from ultralytics import YOLO
from PIL import Image
import io
import requests
import time

app = FastAPI(title="SmartBin YOLO API")


# ======================================================
# YOLO MODEL
# ======================================================

model = YOLO("best.pt")


print("======================================")
print(" SmartBin YOLO API")
print(" Model: best.pt")
print(" Classes:", model.names)
print("======================================")


# ======================================================
# SMARTBIN BACKEND
# ======================================================

BACKEND_URL = "http://192.168.1.178:3000"

TRIGGER_LID_URL = BACKEND_URL + "/api/trigger-lid"


# ======================================================
# YOLO SETTINGS
# ======================================================

CONFIDENCE_THRESHOLD = 0.25

# ต้องเจอขวดติดต่อกันกี่ภาพ
REQUIRED_DETECTIONS = 3

# หลังเปิดฝาแล้ว รอ 10 วินาทีก่อนเปิดซ้ำ
COOLDOWN_SECONDS = 10


# ======================================================
# STATE
# ======================================================

consecutive_bottles = 0
last_open_time = 0


# ======================================================
# ROOT
# ======================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "model": "smartbin_v8_combined",
        "classes": model.names,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "required_detections": REQUIRED_DETECTIONS,
        "cooldown": COOLDOWN_SECONDS
    }


# ======================================================
# OPEN LID
# ======================================================

def open_lid():

    global last_open_time

    print()
    print("======================================")
    print(" Sending OPEN LID command")
    print("======================================")

    print("Backend:", TRIGGER_LID_URL)

    try:

        response = requests.post(
            TRIGGER_LID_URL,
            timeout=5
        )

        print(
            "Backend HTTP:",
            response.status_code
        )

        print(
            "Backend response:",
            response.text
        )

        if response.status_code == 200:

            print("OPEN LID SUCCESS")

            last_open_time = time.time()

            return True

        else:

            print("Backend rejected OPEN command")

            return False

    except Exception as e:

        print("Backend connection error:")
        print(e)

        return False


# ======================================================
# DETECT
# ======================================================

@app.post("/detect")
async def detect(
    file: UploadFile = File(...)
):

    global consecutive_bottles

    print()
    print("======================================")
    print(" YOLO REQUEST")
    print("======================================")

    # ==================================================
    # READ IMAGE
    # ==================================================

    image_bytes = await file.read()

    print(
        "Image size:",
        len(image_bytes),
        "bytes"
    )

    if len(image_bytes) == 0:

        consecutive_bottles = 0

        return {
            "detected": False,
            "count": 0,
            "bottles": [],
            "confirmed": False,
            "consecutive": 0,
            "required": REQUIRED_DETECTIONS,
            "lid_opened": False
        }


    # ==================================================
    # OPEN IMAGE
    # ==================================================

    try:

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

    except Exception as e:

        print("Image error:", e)

        consecutive_bottles = 0

        return {
            "detected": False,
            "count": 0,
            "bottles": [],
            "confirmed": False,
            "consecutive": 0,
            "required": REQUIRED_DETECTIONS,
            "lid_opened": False
        }


    # ==================================================
    # YOLO
    # ==================================================

    try:

        results = model.predict(
            source=image,
            imgsz=640,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )

    except Exception as e:

        print("YOLO error:", e)

        consecutive_bottles = 0

        return {
            "detected": False,
            "count": 0,
            "bottles": [],
            "confirmed": False,
            "consecutive": 0,
            "required": REQUIRED_DETECTIONS,
            "lid_opened": False
        }


    result = results[0]

    bottles = []


    # ==================================================
    # READ DETECTIONS
    # ==================================================

    if result.boxes is not None:

        for box in result.boxes:

            cls = int(
                box.cls[0]
            )

            conf = float(
                box.conf[0]
            )

            # class 0 = bottle
            if cls == 0:

                x1, y1, x2, y2 = (
                    box.xyxy[0].tolist()
                )

                bottles.append({

                    "class": "bottle",

                    "confidence": round(
                        conf,
                        4
                    ),

                    "box": [
                        round(x1),
                        round(y1),
                        round(x2),
                        round(y2)
                    ]
                })


    # ==================================================
    # DETECTED
    # ==================================================

    detected = len(bottles) > 0


    # ==================================================
    # CONSECUTIVE
    # ==================================================

    if detected:

        consecutive_bottles += 1

    else:

        consecutive_bottles = 0


    # ==================================================
    # BEST CONFIDENCE
    # ==================================================

    best_confidence = 0

    if bottles:

        best_confidence = max(
            b["confidence"]
            for b in bottles
        )


    print()
    print(
        "Bottle detected:",
        detected
    )

    print(
        "Confidence:",
        best_confidence
    )

    print(
        "Consecutive:",
        consecutive_bottles,
        "/",
        REQUIRED_DETECTIONS
    )


    # ==================================================
    # COOLDOWN
    # ==================================================

    current_time = time.time()

    cooldown_remaining = (
        COOLDOWN_SECONDS
        - (current_time - last_open_time)
    )

    if cooldown_remaining < 0:

        cooldown_remaining = 0


    # ==================================================
    # CONFIRM
    # ==================================================

    confirmed = False
    lid_opened = False


    if (
        detected
        and best_confidence >= CONFIDENCE_THRESHOLD
        and consecutive_bottles >= REQUIRED_DETECTIONS
    ):

        confirmed = True

        print()
        print("======================================")
        print(" BOTTLE CONFIRMED!")
        print("======================================")


        # ==================================================
        # OPEN LID
        # ==================================================

        if cooldown_remaining <= 0:

            lid_opened = open_lid()

            if lid_opened:

                # reset หลังเปิดสำเร็จ
                consecutive_bottles = 0

        else:

            print(
                "Cooldown:",
                round(
                    cooldown_remaining,
                    1
                ),
                "seconds"
            )


    # ==================================================
    # RESPONSE
    # ==================================================

    response = {

        "detected":
            detected,

        "count":
            len(bottles),

        "bottles":
            bottles,

        "confirmed":
            confirmed,

        "consecutive":
            consecutive_bottles,

        "required":
            REQUIRED_DETECTIONS,

        "threshold":
            CONFIDENCE_THRESHOLD,

        "cooldown":
            round(
                cooldown_remaining,
                1
            ),

        "lid_opened":
            lid_opened
    }


    print()
    print("YOLO RESPONSE:")
    print(response)
    print()


    return response