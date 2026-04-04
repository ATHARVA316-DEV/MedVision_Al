/*
 * MedVision AI — ESP32-CAM Firmware
 * 
 * This Arduino sketch runs on an ESP32-CAM module to:
 * 1. Connect to WiFi
 * 2. Stream camera feed via HTTP (MJPEG)
 * 3. Provide single frame capture endpoint
 * 4. Integrate with MedVision AI web dashboard
 * 
 * Hardware: ESP32-CAM (AI-Thinker module)
 * 
 * Endpoints:
 *   http://<ip>:80/        → Status page
 *   http://<ip>:81/stream  → MJPEG live stream
 *   http://<ip>/capture    → Single JPEG frame
 * 
 * How to use:
 * 1. Install Arduino IDE with ESP32 board support
 * 2. Select "AI Thinker ESP32-CAM" as board
 * 3. Update WiFi credentials below
 * 4. Upload sketch
 * 5. Open Serial Monitor at 115200 baud to get IP address
 * 6. Enter the stream URL in MedVision AI dashboard
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ─── WiFi Configuration ────────────────────────────────────────
const char* ssid = "YOUR_WIFI_SSID";       // Change this
const char* password = "YOUR_WIFI_PASSWORD"; // Change this

// ─── Camera Pin Configuration (AI-Thinker ESP32-CAM) ───────────
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
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ─── LED Flash ─────────────────────────────────────────────────
#define FLASH_LED_PIN      4

httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

// ─── Stream Handler (MJPEG) ───────────────────────────────────
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t * _jpg_buf = NULL;
    char part_buf[64];

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if(res != ESP_OK) return res;

    // Add CORS header for web access
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    while(true) {
        fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed");
            res = ESP_FAIL;
        } else {
            if(fb->format != PIXFORMAT_JPEG) {
                bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
                esp_camera_fb_return(fb);
                fb = NULL;
                if(!jpeg_converted) {
                    Serial.println("JPEG compression failed");
                    res = ESP_FAIL;
                }
            } else {
                _jpg_buf_len = fb->len;
                _jpg_buf = fb->buf;
            }
        }
        if(res == ESP_OK) {
            size_t hlen = snprintf(part_buf, 64, _STREAM_PART, _jpg_buf_len);
            res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
            if(res == ESP_OK) res = httpd_resp_send_chunk(req, part_buf, hlen);
            if(res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        if(fb) {
            esp_camera_fb_return(fb);
            fb = NULL;
            _jpg_buf = NULL;
        } else if(_jpg_buf) {
            free(_jpg_buf);
            _jpg_buf = NULL;
        }
        if(res != ESP_OK) break;
    }
    return res;
}

// ─── Capture Handler (Single Frame) ───────────────────────────
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;

    // Flash LED on
    digitalWrite(FLASH_LED_PIN, HIGH);
    delay(100);

    fb = esp_camera_fb_get();
    
    // Flash LED off
    digitalWrite(FLASH_LED_PIN, LOW);

    if (!fb) {
        Serial.println("Camera capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// ─── Status Page Handler ──────────────────────────────────────
static esp_err_t index_handler(httpd_req_t *req) {
    const char* html = "<html><head>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>MedVision AI - ESP32-CAM</title>"
        "<style>"
        "body{font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;margin:0;padding:40px;text-align:center;}"
        "h1{color:#14b8a6;}.box{background:#1e293b;padding:20px;border-radius:12px;max-width:400px;margin:20px auto;}"
        "a{color:#14b8a6;text-decoration:none;display:block;margin:10px;padding:12px;border:1px solid #14b8a6;border-radius:8px;}"
        "a:hover{background:#14b8a6;color:#0f172a;}.status{color:#10b981;font-weight:bold;}"
        "</style></head><body>"
        "<h1>MedVision AI</h1>"
        "<p>ESP32-CAM Module Active</p>"
        "<div class='box'>"
        "<p class='status'>Camera: ONLINE</p>"
        "<a href='/capture'>Capture Single Frame</a>"
        "<a href='http://" + WiFi.localIP().toString() + ":81/stream'>Live Stream</a>"
        "</div>"
        "<p style='color:#64748b;font-size:12px;'>Enter the stream URL in MedVision AI Dashboard</p>"
        "</body></html>";
    
    httpd_resp_set_type(req, "text/html");
    return httpd_resp_send(req, html, strlen(html));
}

// ─── Start Camera Server ──────────────────────────────────────
void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;

    // Main server (port 80): capture + status
    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_uri_t index_uri = { .uri = "/", .method = HTTP_GET, .handler = index_handler };
        httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler };
        httpd_register_uri_handler(camera_httpd, &index_uri);
        httpd_register_uri_handler(camera_httpd, &capture_uri);
    }

    // Stream server (port 81)
    config.server_port = 81;
    config.ctrl_port += 1;
    if (httpd_start(&stream_httpd, &config) == ESP_OK) {
        httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler };
        httpd_register_uri_handler(stream_httpd, &stream_uri);
    }
}

// ─── Setup ────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println("\n=== MedVision AI - ESP32-CAM ===");

    // Flash LED
    pinMode(FLASH_LED_PIN, OUTPUT);
    digitalWrite(FLASH_LED_PIN, LOW);

    // Camera configuration
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

    // Resolution settings
    if(psramFound()) {
        config.frame_size = FRAMESIZE_VGA;  // 640x480
        config.jpeg_quality = 10;
        config.fb_count = 2;
        Serial.println("PSRAM found - using VGA resolution");
    } else {
        config.frame_size = FRAMESIZE_CIF;  // 352x288
        config.jpeg_quality = 12;
        config.fb_count = 1;
        Serial.println("No PSRAM - using CIF resolution");
    }

    // Initialize camera
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        return;
    }
    Serial.println("Camera initialized successfully");

    // Adjust camera settings for medical imaging
    sensor_t * s = esp_camera_sensor_get();
    s->set_brightness(s, 1);      // Slightly brighter
    s->set_contrast(s, 1);        // Higher contrast
    s->set_saturation(s, 0);      // Neutral saturation
    s->set_whitebal(s, 1);        // Auto white balance
    s->set_awb_gain(s, 1);
    s->set_exposure_ctrl(s, 1);   // Auto exposure
    s->set_aec2(s, 1);
    s->set_gain_ctrl(s, 1);      // Auto gain

    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected!");
        Serial.print("IP Address: http://");
        Serial.println(WiFi.localIP());
        Serial.print("Stream URL: http://");
        Serial.print(WiFi.localIP());
        Serial.println(":81/stream");
        Serial.print("Capture URL: http://");
        Serial.print(WiFi.localIP());
        Serial.println("/capture");
        Serial.println("\nEnter the stream URL in MedVision AI Dashboard");
    } else {
        Serial.println("\nWiFi connection failed!");
        Serial.println("Starting in AP mode...");
        WiFi.softAP("MedVision-CAM", "medvision123");
        Serial.print("AP IP: http://");
        Serial.println(WiFi.softAPIP());
    }

    // Start HTTP servers
    startCameraServer();
    Serial.println("Camera server started!");
    Serial.println("================================");
}

void loop() {
    // Blink LED every 5 seconds to show status
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 5000) {
        digitalWrite(FLASH_LED_PIN, HIGH);
        delay(50);
        digitalWrite(FLASH_LED_PIN, LOW);
        lastBlink = millis();
    }
    delay(10);
}
