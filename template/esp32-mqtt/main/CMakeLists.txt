idf_component_register(SRCS "main.c" "wifi.c" "status.c" "settings.c" "web.c"
      "mqtt.c" "temp_sensor.c" "trigger_sensor.c" "analog_sensor.c" "gps_module.cpp"
      "deps/ds18b20/ds18b20.c" "ntp.c" "deps/tinygps/tinygps.cpp"
      "events/schemas/SensorReading_0_0_1Schema.c" "events/schemas/anonymous_schema_12Schema.c" "events/schemas/anonymous_schema_3Schema.c"  "events/schemas/anonymous_schema_7Schema.c"
      "events/schemas/SensorStatusSchema.c" "events/schemas/anonymous_schema_13Schema.c" "events/schemas/anonymous_schema_4Schema.c"  "events/schemas/anonymous_schema_8Schema.c"
      "events/schemas/anonymous_schema_10Schema.c" "events/schemas/anonymous_schema_1Schema.c"  "events/schemas/anonymous_schema_5Schema.c"  "events/schemas/anonymous_schema_9Schema.c"
      "events/schemas/anonymous_schema_11Schema.c" "events/schemas/anonymous_schema_2Schema.c"  "events/schemas/anonymous_schema_6Schema.c"

      INCLUDE_DIRS ".")
