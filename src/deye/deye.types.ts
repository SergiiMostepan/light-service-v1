// Types transcribed from the official Deye Cloud OpenAPI schema (2026-10-29).
// Source: https://eu1-developer.deyecloud.com/v2/api-docs
// Only schemas reachable from monitoring endpoints and authentication are included.
export interface DeyeSchemas {
  AccountOrgInfo: {
    companyId?: number;
    companyName?: string;
    roleName?: string;
  };
  AccountOrgInfoResponse: {
    code?: string | number;
    msg?: string;
    orgInfoList?: Array<DeyeSchemas['AccountOrgInfo']>;
    requestId: string | null;
    success: boolean;
  };
  BaseStationAlertListRequest: {
    endTimestamp: number;
    page?: number;
    size?: number;
    startTimestamp: number;
    stationId: number;
  };
  BaseStationHistoryDataRequest: {
    endAt?: string;
    granularity: number;
    startAt: string;
    stationId: number;
  };
  BaseStationHistoryPowerRequest: {
    endTimestamp: number;
    startTimestamp: number;
    stationId: number;
  };
  BaseStationListRequest: {
    page?: number;
    size?: number;
  };
  BaseStationRealTimeDataRequest: {
    stationId: number;
  };
  BaseStationWithDeviceListRequest: {
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
    page?: number;
    size?: number;
  };
  DeviceAlertItem: {
    alertCode?: string;
    alertEndTime?: number;
    alertId?: string;
    alertName?: string;
    alertStartTime?: number;
    description?: string;
    impact?: number;
    level?: number;
    protocolName?: string;
    reason?: string;
    solution?: string;
    status?: number;
  };
  DeviceAlertListRequest: {
    deviceSn?: string;
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
    endTimestamp: number;
    page?: number;
    size?: number;
    startTimestamp: number;
  };
  DeviceAlertListResponse: {
    alertList?: Array<DeyeSchemas['DeviceAlertItem']>;
    code?: string | number;
    deviceId?: number;
    deviceSn: string;
    deviceType?: string;
    msg?: string;
    requestId: string | null;
    success: boolean;
    total?: number;
  };
  DeviceBatterySettingsResponse: {
    battCapacity?: number;
    battLowCapacity?: number;
    battShutDownCapacity?: number;
    code?: string | number;
    maxChargeCurrent?: number;
    maxDischargeCurrent?: number;
    msg?: string;
    requestId: string | null;
    success: boolean;
  };
  DeviceConfigPointRequest: {
    deviceSn: string;
  };
  DeviceDetailItem: {
    deviceSn?: string;
    deviceState?: number;
    deviceType?: string;
    productId?: string;
    updateTime?: number;
  };
  DeviceHistoryDataItem: {
    itemList?: Array<DeyeSchemas['Map\u00abstring,string\u00bb']>;
    time?: string;
  };
  DeviceHistoryDataRequest: {
    deviceSn: string;
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
    endAt?: string;
    granularity: number;
    measurePoints?: Array<string>;
    startAt: string;
  };
  DeviceHistoryDataResponse: {
    code?: string | number;
    dataList?: Array<DeyeSchemas['DeviceHistoryDataItem']>;
    deviceId?: number;
    deviceSn: string;
    deviceType?: string;
    granularity?: number;
    msg?: string;
    requestId: string | null;
    success: boolean;
  };
  DeviceHistoryPowerRequest: {
    deviceSn: string;
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
    endTimestamp: number;
    measurePoints: Array<string>;
    startTimestamp: number;
  };
  DeviceHistoryPowerResponse: {
    code?: string | number;
    dataList?: Array<DeyeSchemas['DeviceHistoryDataItem']>;
    deviceId?: number;
    deviceSn: string;
    deviceType?: string;
    msg?: string;
    requestId: string | null;
    success: boolean;
  };
  DeviceListItem: {
    collectionTime?: number;
    connectStatus?: number;
    deviceId?: number;
    deviceSn?: string;
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
    productId?: string;
    stationId?: number;
  };
  DeviceListRequest: {
    page?: number;
    size?: number;
  };
  DeviceListResponse: {
    code?: string | number;
    deviceList?: Array<DeyeSchemas['DeviceDetailItem']>;
    msg?: string;
    requestId: string | null;
    success: boolean;
    total?: number;
  };
  DeviceMeasurePointsRequest: {
    deviceSn: string;
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
  };
  DeviceMeasurePointsResponse: {
    code?: string | number;
    deviceSn?: string;
    deviceType?: string;
    measurePoints?: Array<string>;
    msg?: string;
    productId?: string;
    requestId: string | null;
    success: boolean;
    timeZone?: string;
  };
  DeviceSystemWorkModeResponse: {
    code?: string | number;
    energyPattern?: string;
    maxSellPower?: number;
    maxSolarPower?: number;
    msg?: string;
    requestId: string | null;
    success: boolean;
    systemWorkMode?: string;
    zeroExportPower?: number;
  };
  DeviceTimeOfUseResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    success: boolean;
    timeUseSettingItems?: Array<DeyeSchemas['TimeOfUseItem']>;
    touAction?: string;
  };
  'Map\u00abstring,string\u00bb': Record<string, unknown>;
  StationAlertItem: {
    alertCode?: string;
    alertEndTime?: number;
    alertId?: string;
    alertName?: string;
    alertStartTime?: number;
    deviceId?: string;
    deviceSn?: string;
    deviceType?: string;
    impact?: number;
    level?: number;
    protocolName?: string;
    status?: number;
  };
  StationAlertListResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    stationAlertItems?: Array<DeyeSchemas['StationAlertItem']>;
    success: boolean;
    total?: number;
  };
  StationDataItem: {
    batteryPower?: number;
    batterySOC?: number;
    chargePower?: number;
    chargeRatio?: number;
    chargeValue?: number;
    consumptionDischargeRatio?: number;
    consumptionPower?: number;
    consumptionRatio?: number;
    consumptionValue?: number;
    cpr?: number;
    day?: number;
    dischargePower?: number;
    dischargeValue?: number;
    fullPowerHours?: number;
    generationPower?: number;
    generationRatio?: number;
    generationValue?: number;
    gridPower?: number;
    gridRatio?: number;
    gridValue?: number;
    irradiate?: number;
    irradiateIntensity?: number;
    month?: number;
    pr?: number;
    purchasePower?: number;
    purchaseRatio?: number;
    purchaseValue?: number;
    theoreticalGeneration?: number;
    timeStamp?: string;
    wirePower?: number;
    year?: number;
  };
  StationDetailItem: {
    batterySOC?: number;
    connectionStatus?:
      'NORMAL' | 'NO_DEVICE' | 'ALL_OFFLINE' | 'PARTIAL_OFFLINE';
    contactPhone?: string;
    countryCode?: string;
    createdDate?: string;
    generationPower?: number;
    gridInterconnectionType?:
      | 'DISTRIBUTED_FULLY'
      | 'EXCESS'
      | 'OFF_GRID'
      | 'BATTERY_BACKUP'
      | 'GROUND_FULLY'
      | 'CENTRALIZED_FULLY'
      | 'GEN_USE_BTR'
      | 'GEN_USE'
      | 'GRID_USE_BTR'
      | 'USE_BTR'
      | 'PV_BTR_USE';
    id?: number;
    installedCapacity?: number;
    lastUpdateTime?: string;
    locationAddress?: string;
    locationLat?: number;
    locationLng?: number;
    name?: string;
    ownerName?: string;
    regionNationId?: number;
    regionTimezone?: string;
    startOperatingTime?: string;
  };
  StationHistoryDataItem: {
    batteryPower?: number;
    batterySOC?: number;
    chargePower?: number;
    chargeRatio?: number;
    chargeValue?: number;
    consumptionDischargeRatio?: number;
    consumptionPower?: number;
    consumptionRatio?: number;
    consumptionValue?: number;
    cpr?: number;
    dischargePower?: number;
    dischargeValue?: number;
    fullPowerHours?: number;
    generationPower?: number;
    generationRatio?: number;
    generationValue?: number;
    gridPower?: number;
    gridRatio?: number;
    gridValue?: number;
    irradiate?: number;
    irradiateIntensity?: number;
    pr?: number;
    purchasePower?: number;
    purchaseRatio?: number;
    purchaseValue?: number;
    theoreticalGeneration?: number;
    timeStamp?: string;
    wirePower?: number;
  };
  StationHistoryDataResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    stationDataItems?: Array<DeyeSchemas['StationDataItem']>;
    success: boolean;
    total?: number;
  };
  StationHistoryPowerResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    stationDataItems?: Array<DeyeSchemas['StationHistoryDataItem']>;
    success: boolean;
    total?: number;
  };
  StationWithDeviceDetailItem: {
    contactPhone?: string;
    createdDate?: string;
    deviceListItems?: Array<DeyeSchemas['DeviceListItem']>;
    deviceTotal?: number;
    gridInterconnectionType?:
      | 'DISTRIBUTED_FULLY'
      | 'EXCESS'
      | 'OFF_GRID'
      | 'BATTERY_BACKUP'
      | 'GROUND_FULLY'
      | 'CENTRALIZED_FULLY'
      | 'GEN_USE_BTR'
      | 'GEN_USE'
      | 'GRID_USE_BTR'
      | 'USE_BTR'
      | 'PV_BTR_USE';
    id?: number;
    installedCapacity?: number;
    locationAddress?: string;
    locationLat?: number;
    locationLng?: number;
    name?: string;
    ownerName?: string;
    regionNationId?: number;
    regionTimezone?: string;
    startOperatingTime?: string;
    type?: 'HOUSE_ROOF' | 'COMMERCIAL_ROOF' | 'INDUSTRIAL_ROOF' | 'GROUND';
  };
  StationWithDeviceListResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    stationList?: Array<DeyeSchemas['StationWithDeviceDetailItem']>;
    stationTotal?: number;
    success: boolean;
  };
  TimeOfUseItem: {
    enableGeneration: boolean;
    enableGridCharge: boolean;
    power: number;
    soc?: number;
    time: string;
    voltage?: number;
  };
  data: {
    key?: string;
    unit?: string;
    value?: string;
  };
  deviceLatestData: {
    collectionTime?: number;
    dataList?: Array<DeyeSchemas['data']>;
    deviceSn: string;
    deviceState?: number;
    deviceType?: string;
  };
  deviceListRequest: {
    page?: number;
    size?: number;
    stationIds: Array<number>;
  };
  deviceListResponse: {
    code?: string | number;
    deviceListItems?: Array<DeyeSchemas['DeviceListItem']>;
    msg?: string;
    requestId: string | null;
    success: boolean;
    total?: number;
  };
  latestDataRequest: {
    deviceList: Array<string>;
    deviceType?:
      | 'INVERTER'
      | 'COMBINER_BOX'
      | 'BATTERY'
      | 'WEATHER_STATION'
      | 'METER'
      | 'AIR_CONDITIONING'
      | 'OTHER_TYPE'
      | 'HARMONIC_METER'
      | 'QUALITY_MONITOR'
      | 'SMART_HOME'
      | 'SOLAR_TRACKING_CONTROLLER'
      | 'SOLAR_RADIATION_SPECTROMETER'
      | 'DTU'
      | 'REPEATER'
      | 'MICRO_INVERTER'
      | 'PV_MODULE'
      | 'ELECTRIC_SOURCE'
      | 'COLLECTOR'
      | 'FAN'
      | 'WATER_PUMP'
      | 'HYBRID_POWER_SYSTEM_CABINET'
      | 'STEAM_ENGINE'
      | 'EPM'
      | 'GAS_METER'
      | 'WATER_METER'
      | 'SMART_METER'
      | 'TYPE_RF_SUB_DEVICE'
      | 'TYPE_OFF_GRID_INVERTER'
      | 'MECD'
      | 'BOX_TRANSFORMER'
      | 'SWITCHGEAR'
      | 'OPTIMIZER'
      | 'DC_CONVERTER'
      | 'SURGE_PROTECTION'
      | 'FLOW_METER_THERMOMETER'
      | 'RELAY_BOX'
      | 'PCS'
      | 'FEED_IN_LIMIT'
      | 'CHARGING_STATION'
      | 'MICRO_STORAGE_IN_ONE'
      | 'OPTIMIZER_CONCENTRATOR'
      | 'MICRO_ENERGY_STORAGE'
      | 'LORA_SWITCH'
      | 'LORA_MASTER'
      | 'SMART_CT'
      | 'SMART_SWITCH'
      | 'CHARGE_PORT'
      | 'HOT_PUMP';
  };
  latestDataResponse: {
    code?: string | number;
    deviceDataList?: Array<DeyeSchemas['deviceLatestData']>;
    msg?: string;
    requestId: string | null;
    success: boolean;
  };
  request: {
    stationId: number;
  };
  response: {
    accessToken?: string;
    code?: string | number;
    expiresIn?: string;
    msg?: string;
    refreshToken?: string;
    requestId: string | null;
    scope?: string;
    success: boolean;
    tokenType?: string;
    uid?: number;
  };
  stationDetailResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    station?: DeyeSchemas['StationDetailItem'];
    success: boolean;
  };
  stationLatestDataResponse: {
    batteryPower?: number;
    batterySOC?: number;
    chargePower?: number;
    code?: string | number;
    consumptionPower?: number;
    dischargePower?: number;
    generationPower?: number;
    gridPower?: number;
    irradiateIntensity?: number;
    lastUpdateTime?: string;
    msg?: string;
    purchasePower?: number;
    requestId: string | null;
    success: boolean;
    wirePower?: number;
  };
  stationListResponse: {
    code?: string | number;
    msg?: string;
    requestId: string | null;
    stationList?: Array<DeyeSchemas['StationDetailItem']>;
    success: boolean;
    total?: number;
  };
}

export interface DeyeOperations {
  getAccountInfo: {
    request: Record<string, never>;
    response: DeyeSchemas['AccountOrgInfoResponse'];
  };
  getStations: {
    request: DeyeSchemas['BaseStationListRequest'];
    response: DeyeSchemas['stationListResponse'];
  };
  getStation: {
    request: DeyeSchemas['request'];
    response: DeyeSchemas['stationDetailResponse'];
  };
  getStationDevices: {
    request: DeyeSchemas['deviceListRequest'];
    response: DeyeSchemas['deviceListResponse'];
  };
  getStationsWithDevices: {
    request: DeyeSchemas['BaseStationWithDeviceListRequest'];
    response: DeyeSchemas['StationWithDeviceListResponse'];
  };
  getStationLatest: {
    request: DeyeSchemas['BaseStationRealTimeDataRequest'];
    response: DeyeSchemas['stationLatestDataResponse'];
  };
  getStationHistory: {
    request: DeyeSchemas['BaseStationHistoryDataRequest'];
    response: DeyeSchemas['StationHistoryDataResponse'];
  };
  getStationHistoryPower: {
    request: DeyeSchemas['BaseStationHistoryPowerRequest'];
    response: DeyeSchemas['StationHistoryPowerResponse'];
  };
  getStationAlerts: {
    request: DeyeSchemas['BaseStationAlertListRequest'];
    response: DeyeSchemas['StationAlertListResponse'];
  };
  getDevices: {
    request: DeyeSchemas['DeviceListRequest'];
    response: DeyeSchemas['DeviceListResponse'];
  };
  getDeviceLatest: {
    request: DeyeSchemas['latestDataRequest'];
    response: DeyeSchemas['latestDataResponse'];
  };
  getDeviceHistory: {
    request: DeyeSchemas['DeviceHistoryDataRequest'];
    response: DeyeSchemas['DeviceHistoryDataResponse'];
  };
  getDeviceHistoryRaw: {
    request: DeyeSchemas['DeviceHistoryPowerRequest'];
    response: DeyeSchemas['DeviceHistoryPowerResponse'];
  };
  getDeviceMeasurePoints: {
    request: DeyeSchemas['DeviceMeasurePointsRequest'];
    response: DeyeSchemas['DeviceMeasurePointsResponse'];
  };
  getDeviceAlerts: {
    request: DeyeSchemas['DeviceAlertListRequest'];
    response: DeyeSchemas['DeviceAlertListResponse'];
  };
  getBatteryConfiguration: {
    request: DeyeSchemas['DeviceConfigPointRequest'];
    response: DeyeSchemas['DeviceBatterySettingsResponse'];
  };
  getSystemConfiguration: {
    request: DeyeSchemas['DeviceConfigPointRequest'];
    response: DeyeSchemas['DeviceSystemWorkModeResponse'];
  };
  getTimeOfUseConfiguration: {
    request: DeyeSchemas['DeviceConfigPointRequest'];
    response: DeyeSchemas['DeviceTimeOfUseResponse'];
  };
}
export type DeyeRequest<K extends keyof DeyeOperations> =
  DeyeOperations[K]['request'];
export type DeyeResponse<K extends keyof DeyeOperations> =
  DeyeOperations[K]['response'];
export type DeyeTokenResponse = DeyeSchemas['response'];
