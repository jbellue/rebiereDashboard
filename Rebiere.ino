#include <WiFiClient.h>
#include <NTPClient.h>
#include <AmazonDynamoDBClient.h>
#include <Esp8266AWSImplementations.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <NewPing.h>
#include <WiFiUdp.h>

#include "keys.h"
/*
static const char* WIFI_SSID;
static const char* WIFI_PASS;
static const char* AWS_KEY_ID;
static const char* AWS_SECRET_KEY;
*/

/* DEBUG PRINT MACROS */
#ifdef DEBUG
    #define DEBUG_PRINT(x)   Serial.print(x)
    #define DEBUG_PRINTLN(x) Serial.println(x)
#else
    #define DEBUG_PRINT(x)
    #define DEBUG_PRINTLN(x)
#endif

#define PHOTOCELL_PIN    A0
#define TRIGGER_PIN      D6
#define ECHO_PIN         D7
#define MAX_DISTANCE     400

// one hour in microseconds
#define UPDATE_FREQUENCY 3600000000

const int MAX_DEPTH = 400;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "europe.pool.ntp.org");

/* Contants describing DynamoDB table and values being used. */
static const char* DEVICEID_KEY_NAME = "deviceId";
static const char* DEVICEID_KEY_VALUE = "Wemos D1 Mini";
static const char* TIMESTAMP_KEY_NAME = "timestamp";
static const char* LEVEL_KEY_NAME = "waterLevel";
static const char* TEMPERATURE_KEY_NAME = "temperature";
static const char* PRESSURE_KEY_NAME = "pressure";
static const char* LIGHT_KEY_NAME = "light";
static const char* TABLE_NAME = "Rebiere";

Esp8266HttpClient httpClient;
Esp8266DateTimeProvider dateTimeProvider;

AmazonDynamoDBClient ddbClient;

NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);
Adafruit_BMP280 bmp;

unsigned long previousTime = 0;
const unsigned long updateInterval = 1000*60*60; // 1 hour

void setup() {
    unsigned long timeStart = millis();
#ifdef DEBUG
    Serial.begin(115200);
    while(!Serial);
#endif

    WiFi.begin(WIFI_SSID, WIFI_PASS);
    // Wait for WiFi connection
    DEBUG_PRINT(F("Connecting to WiFi."));
    while (WiFi.status() != WL_CONNECTED) {
        DEBUG_PRINT(".");
        delay(500);
    }
    DEBUG_PRINTLN(" Done!");

    if (!bmp.begin()) {  
        DEBUG_PRINTLN(F("Could not find a valid BMP280 sensor, check wiring!"));
        while (1);
    }

    timeClient.begin();
    DEBUG_PRINT(F("Connecting to NTP server."));
    while (!timeClient.forceUpdate()) {
        DEBUG_PRINT(".");
        delay(500);
    }
    DEBUG_PRINTLN(" Done!");

    ddbClient.setAWSRegion("eu-west-1");
    ddbClient.setAWSEndpoint("amazonaws.com");
    ddbClient.setAWSKeyID(AWS_KEY_ID);
    ddbClient.setAWSSecretKey(AWS_SECRET_KEY);
    ddbClient.setHttpClient(&httpClient);
    ddbClient.setDateTimeProvider(&dateTimeProvider);

    send_data();
    ESP.deepSleep(UPDATE_FREQUENCY - ((millis() - timeStart) * 1000));
}

int get_light() {
    return analogRead(PHOTOCELL_PIN);
}

unsigned int get_distance() {
    unsigned int distance_cm = 0;
    char loop_count = 0;
    while (distance_cm == 0 && loop_count < 5) {
        distance_cm = sonar.convert_cm(sonar.ping_median(10));
        ++loop_count;
    }
    return MAX_DEPTH - distance_cm;
}

ActionError send_data() {
    AttributeValue idValue;
    idValue.setS(DEVICEID_KEY_VALUE);

    AttributeValue timeValue;
    timeValue.setN(String(timeClient.getEpochTime()).c_str());

    AttributeValue temperatureValue;
    temperatureValue.setN(String(bmp.readTemperature()).c_str());

    AttributeValue pressureValue;
    pressureValue.setN(String(bmp.readPressure() / 100).c_str()); //get pressure in hPa

    AttributeValue lightValue;
    lightValue.setN(String(get_light()).c_str());

    const unsigned int distance = get_distance();
    AttributeValue levelValue;
    levelValue.setN(String(distance).c_str());

    MinimalKeyValuePair <MinimalString, AttributeValue> attributeId(DEVICEID_KEY_NAME, idValue);
    MinimalKeyValuePair <MinimalString, AttributeValue> attributeTimestamp(TIMESTAMP_KEY_NAME, timeValue);
    MinimalKeyValuePair <MinimalString, AttributeValue> attributeTemperature(TEMPERATURE_KEY_NAME, temperatureValue);
    MinimalKeyValuePair <MinimalString, AttributeValue> attributePressure(PRESSURE_KEY_NAME, pressureValue);
    MinimalKeyValuePair <MinimalString, AttributeValue> attributeLight(LIGHT_KEY_NAME, lightValue);
    MinimalKeyValuePair <MinimalString, AttributeValue> attributeLevel(LEVEL_KEY_NAME, levelValue);

    MinimalKeyValuePair <MinimalString, AttributeValue> itemArray[] = {attributeId,
                                                                       attributeTimestamp, 
                                                                       attributeTemperature,
                                                                       attributePressure,
                                                                       attributeLight,
                                                                       attributeLevel};
    uint8_t numberOfItems = (distance == MAX_DEPTH) ? 5 : 6;
    PutItemInput putItemInput;
    putItemInput.setItem(MinimalMap <AttributeValue> (itemArray, numberOfItems));
    putItemInput.setTableName(TABLE_NAME);

    /* perform putItem and check for errors. */
    ActionError actionError;
    PutItemOutput putItemOutput = ddbClient.putItem(putItemInput, actionError);

    switch (actionError) {
        case NONE_ACTIONERROR:
            // happy path
            DEBUG_PRINTLN(F("Done"));
            break;
        case INVALID_REQUEST_ACTIONERROR:
            DEBUG_PRINT(F("ERROR: "));
            DEBUG_PRINTLN(putItemOutput.getErrorMessage().getCStr());
            break;
        case MISSING_REQUIRED_ARGS_ACTIONERROR:
            DEBUG_PRINTLN(F("ERROR: Required arguments were not set for PutItemInput"));
            break;
        case RESPONSE_PARSING_ACTIONERROR:
            DEBUG_PRINTLN(F("ERROR: Problem parsing http response of PutItem"));
            break;
        case CONNECTION_ACTIONERROR:
            DEBUG_PRINTLN(F("ERROR: Connection problem"));
            break;
        default:
            DEBUG_PRINTLN(F("ERROR: Query not for I do not know."));
            break;
    }
    return actionError;
}

void loop() {

}
