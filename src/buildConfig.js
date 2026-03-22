import {AGGREGATE_FUNCTIONS, CARD_NAME, DEFAULT_CONF, DEFAULT_CONF_SHOW, FONT_SIZE, MAX_BARS} from "./const";
import {isBool, isInt, isNumber, isString, isUndef, log} from "./utils";
import SparkMD5 from "spark-md5";

function buildConfig(rawConfig) {
    let conf;
    
    //Expand configuration from Lovelace with default configuration
    conf = {
        ...DEFAULT_CONF,
        ...structuredClone(rawConfig),
        show: {
            ...DEFAULT_CONF_SHOW,
            ...structuredClone(rawConfig.show)
        }
    }
    
    //Search for unknown configuration options
    for (let key of Object.keys(rawConfig)) {
        if (key === "type" || key === "show") continue;
        if (!(key in DEFAULT_CONF)) throw new Error(`Unknown configuration option: ${key}`);
    }
    for (let key of Object.keys(rawConfig.show)) {
        if (!(key in DEFAULT_CONF_SHOW)) throw new Error(`Unknown configuration key: show.${key}`);
    }
    
    //Verify configuration
    verifyConfig(conf)
    
    //Turn smoothing off for binary sensor
    if (conf.smoothing && conf.entity.startsWith("binary_sensor.")) {
        log.warn('Smoothing ist not compatible with binary sensors');
        conf.smoothing = false;
    }
    
    //Compute dynamic line color object
    if (Array.isArray(conf.color)) conf.color = computeDynamicColor(conf.color, conf.color_smooth_transition);
    
    //Override points per hour to mach group_by function
    if (conf.group_by === "date" || conf.group_by === "hour") {
        log.warn('Configuration option group_by overrides option points_per_hour.');
        conf.points_per_hour = (conf.group_by === "date") ? 1 / 24 : 1
    }
    
    //Scale font_size
    conf.font_size = ((conf.font_size / 100) * FONT_SIZE).toFixed(2);
    
    //Limit number of bars to show
    if (conf.graph_type === "bar" && (conf.hours_to_show * conf.points_per_hour > MAX_BARS)) {
        conf.points_per_hour = MAX_BARS / (conf.hours_to_show);
        log.warn(`Not enough space, adjusting points_per_hour to ${conf.points_per_hour}`);
    }
    
    //Generate time format for extrema and average info (show or hide date)
    conf.timeFormat = {hourCycle: "h23"};
    if (conf.hours_to_show > 24) conf.timeFormat = {...conf.timeFormat, day: "numeric", weekday: "short"};
    
    //Generate cache key
    if (conf.cache) {
        let hash = SparkMD5.hash(JSON.stringify(conf)); //Hash configuration to identify cache objects
        conf.cache_key = `${conf.entity}_${hash}`;
        if (!conf.cache_compress) conf.cache_key = `${conf.cache_key}_raw`;
    }
    
    log.debug('Configuration updated:', conf);
    return conf;
}

//Verify configuration values
function verifyConfig(conf) {
    if (!isString(conf.entity)) throw new Error(`Please provide an entity.`);
    if (!isUndef(conf.decimals) && !isInt(conf.decimals, 0, 10)) throw new ConfValError("decimals");
    //-----
    if (!["line", "bar", "none"].includes(conf.graph_type)) throw new ConfValError("graph_type");
    if (!isNumber(conf.line_width, 0.5, 10)) throw new ConfValError("line_width");
    if (!isNumber(conf.bar_spacing, 0.5, 10)) throw new ConfValError("bar_spacing");
    if (!isBool(conf.smoothing)) throw new ConfValError("smoothing");
    if (!isBool(conf.logarithmic)) throw new ConfValError("logarithmic");
    if (!isString(conf.color) && !Array.isArray(conf.color)) throw new ConfValError("color");
    if (!isBool(conf.color_smooth_transition)) throw new ConfValError("color_smooth_transition");
    //-----
    if (!isInt(conf.hours_to_show, 1, 500)) throw new ConfValError("hours_to_show");
    if (!isNumber(conf.points_per_hour, 0.1, 60)) throw new ConfValError("points_per_hour");
    if (!AGGREGATE_FUNCTIONS.includes(conf.aggregate_func)) throw new ConfValError("aggregate_func");
    if (!["date", "hour", "interval"].includes(conf.group_by)) throw new ConfValError("group_by");
    if (!isInt(conf.update_interval, 0, 3600)) throw new ConfValError("update_interval");
    //-----
    if (!isInt(conf.font_size, 1, 500)) throw new ConfValError("font_size");
    if (!isNumber(conf.font_size_header, 1, 100)) throw new ConfValError("font_size_header");
    if (!isInt(conf.height, 10, 500)) throw new ConfValError("height");
    //todo align_icon (dont forget readme)
    //todo align_state (dont forget readme)
    //todo align_header (dont forget readme)
    if (!isBool(conf.group)) throw new ConfValError("group");
    //-----
    verifyBound(conf.lower_bound, 'lower_bound');
    verifyBound(conf.upper_bound, 'upper_bound');
    if (!isUndef(conf.min_bound_range) && !isNumber(conf.min_bound_range, 1)) throw new ConfValError("min_bound_range");
    if (!isNumber(conf.value_factor) || conf.value_factor === 0) throw new ConfValError("value_factor");
    verifyStateMap(conf.state_map);
    //-----
    if (!isBool(conf.cache)) throw new ConfValError("cache");
    if (!isBool(conf.cache_compress)) throw new ConfValError("cache_compress");
    //todo tap_action
    //-----
    if (!isBool(conf.show.name)) throw new ConfValError("show.name");
    if (!isBool(conf.show.icon)) throw new ConfValError("show.icon");
    if (!isBool(conf.show.state) && conf.show.state !== 'last') throw new ConfValError("show.state");
    if (!isBool(conf.show.line)) throw new ConfValError("show.line");
    if (!isBool(conf.show.fill) && conf.show.fill !== 'fade') throw new ConfValError("show.fill");
    if (!isBool(conf.show.points) && conf.show.points !== 'hover') throw new ConfValError("show.points");
    if (!isBool(conf.show.extrema)) throw new ConfValError("show.extrema");
    if (!isBool(conf.show.average)) throw new ConfValError("show.average");
    if (!isBool(conf.show.labels) && conf.show.labels !== 'hover') throw new ConfValError("show.labels");
    if (!isBool(conf.show.name_adaptive_color)) throw new ConfValError("show.name_adaptive_color");
    if (!isBool(conf.show.icon_adaptive_color)) throw new ConfValError("show.icon_adaptive_color");
    if (!isBool(conf.show.state_adaptive_color)) throw new ConfValError("show.state_adaptive_color");
}

function verifyBound(rawBound, confOptName){
    if (isUndef(rawBound) || isNumber(rawBound)) return;
    if (isString(rawBound) && rawBound[0] === "~" && !isNaN(rawBound.substr(1))) return;
    throw new ConfValError(confOptName);
}

function verifyStateMap(rawStateMap) {
    if (!Array.isArray(rawStateMap)) throw new ConfValError("state_map");
    
    rawStateMap.forEach((state, i) => {
        if (!('label' in state && 'value' in state)) throw new ConfValError("state_map");
    });
}

function computeDynamicColor(colors, smooth) {
    colors.forEach(col => {
        if (!('value' in col && 'color' in col)) throw new ConfValError("color (color or value key is missing)");
    })
    
    colors.sort((a, b) => b.value - a.value);
    if (smooth) {
        //smooth transitions
        return colors;
    } else {
        //hard transitions
        let hardColors = [];
        for (let i = 0; i < colors.length; i++) {
            hardColors.push(colors[i]);
            hardColors.push({
                value: colors[i].value - 0.0001,
                color: colors[i + 1] ? colors[i + 1].color : colors[i].color,
            })
        }
        return hardColors;
    }
}

class ConfValError extends Error {
    constructor(message) {
        super("Invalid value for " + message);
        this.name = "Configuration validation error";
    }
}

export default buildConfig;
