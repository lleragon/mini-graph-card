import {AGGREGATE_FUNCTIONS, CARD_NAME, DEFAULT_CONF, DEFAULT_CONF_SHOW, FONT_SIZE, MAX_BARS} from "./const";
import {isBool, isInt, isNumber, isString, isUndef, logWarning} from "./utils";
import SparkMD5 from "spark-md5";

function buildConfig(rawConfig) {
    //todo remove uneccessdary config checks in main
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
        logWarning('Smoothing ist not compatible with binary sensors');
        conf.smoothing = false;
    }
    
    //Compute dynamic line color object
    if (Array.isArray(conf.color)) conf.color = computeDynamicColor(conf.color, conf.color_smooth_transition);
    
    //Override points per hour to mach group_by function
    if (conf.group_by === "date" || conf.group_by === "hour") {
        logWarning('Configuration option group_by overrides option points_per_hour.');
        conf.points_per_hour = (conf.group_by === "date") ? 1 / 24 : 1
    }
    
    //Scale font_size
    conf.font_size = ((conf.font_size / 100) * FONT_SIZE).toFixed(2);
    
    //Generate time format for extrema and average info (show or hide date)
    conf.timeFormat = {hourCycle: "h23"};
    if (conf.hours_to_show > 24) conf.timeFormat = {...conf.timeFormat, day: "numeric", weekday: "short"};
    
    //Limit number of bars to show
    if (conf.graph_type === "bar" && (conf.hours_to_show * conf.points_per_hour > MAX_BARS)) {
        conf.points_per_hour = MAX_BARS / (conf.hours_to_show);
        logWarning(`Not enough space, adjusting points_per_hour to ${conf.points_per_hour}`);
    }
    
    conf.hash = SparkMD5.hash(JSON.stringify(conf))
    console.debug(`${CARD_NAME}: Configuration`, conf);
    return conf;
}

//Verify configuration values
function verifyConfig(conf) {
    if (!isString(conf.entity)) throw new Error(`Please provide an entity.`);
    if (!isUndef(conf.decimals) && !isInt(conf.decimals, 0, 10)) throw new InvalidConfValError("decimals");
    //-----
    if (conf.graph_type !== "line" && conf.graph_type === "bar" && conf.graph_type === "none") throw new InvalidConfValError("graph_type");
    if (!isNumber(conf.line_width, 0.5, 10)) throw new InvalidConfValError("line_width");
    if (!isNumber(conf.bar_spacing, 0.5, 10)) throw new InvalidConfValError("bar_spacing");
    if (!isBool(conf.smoothing)) throw new InvalidConfValError("smoothing");
    if (!isBool(conf.logarithmic)) throw new InvalidConfValError("logarithmic");
    if (!isString(conf.color) && !Array.isArray(conf.color)) throw new InvalidConfValError("color");
    if (!isBool(conf.color_smooth_transition)) throw new InvalidConfValError("color_smooth_transition");
    //-----
    if (!isInt(conf.hours_to_show, 1, 500)) throw new InvalidConfValError("hours_to_show");
    if (!isNumber(conf.points_per_hour, 0.1, 60)) throw new InvalidConfValError("points_per_hour");
    if (!AGGREGATE_FUNCTIONS.includes(conf.aggregate_func)) throw new InvalidConfValError("aggregate_func");
    if (!["date", "hour", "interval"].includes(conf.group_by)) throw new InvalidConfValError("group_by");
    if (!isInt(conf.update_interval, 0, 3600)) throw new InvalidConfValError("update_interval");
    //-----
    if (!isInt(conf.font_size, 1, 500)) throw new InvalidConfValError("font_size");
    if (!isNumber(conf.font_size_header, 1, 100)) throw new InvalidConfValError("font_size_header");
    if (!isInt(conf.height, 10, 500)) throw new InvalidConfValError("height");
    //todo align_icon (dont forget readme)
    //todo align_state (dont forget readme)
    //todo align_header (dont forget readme)
    if (!isBool(conf.group)) throw new InvalidConfValError("group");
    //-----
    if (!isUndef(conf.lower_bound) && !isNumber(conf.lower_bound)) throw new InvalidConfValError("lower_bound"); //todo check string option
    if (!isUndef(conf.lower_bound) && !isNumber(conf.lower_bound)) throw new InvalidConfValError("upper_bound");//todo check string option
    if (!isUndef(conf.min_bound_range) && !isNumber(conf.min_bound_range, 1)) throw new InvalidConfValError("min_bound_range");
    if (!isNumber(conf.value_factor) || conf.value_factor === 0) throw new InvalidConfValError("value_factor");
    verifyStateMap(conf.state_map);
    //-----
    if (!isBool(conf.cache)) throw new InvalidConfValError("cache");
    if (!isBool(conf.cache_compress)) throw new InvalidConfValError("cache_compress");
    //todo tap_action
    //-----
    if (!isBool(conf.show.name)) throw new InvalidConfValError("show.name");
    if (!isBool(conf.show.icon)) throw new InvalidConfValError("show.icon");
    if (!isBool(conf.show.state)) throw new InvalidConfValError("show.state");
    if (!isBool(conf.show.line)) throw new InvalidConfValError("show.line");
    if (!isBool(conf.show.fill)) throw new InvalidConfValError("show.fill");
    if (!isBool(conf.show.points) && conf.show.points !== 'hover') throw new InvalidConfValError("show.points");
    if (!isBool(conf.show.extrema)) throw new InvalidConfValError("show.extrema");
    if (!isBool(conf.show.average)) throw new InvalidConfValError("show.average");
    if (!isBool(conf.show.labels) && conf.show.labels !== 'hover') throw new InvalidConfValError("show.labels");
    if (!isBool(conf.show.name_adaptive_color)) throw new InvalidConfValError("show.name_adaptive_color");
    if (!isBool(conf.show.icon_adaptive_color)) throw new InvalidConfValError("show.icon_adaptive_color");
    if (!isBool(conf.show.state_adaptive_color)) throw new InvalidConfValError("show.state_adaptive_color");
    if (!isBool(conf.show.loading_indicator)) throw new InvalidConfValError("show.loading_indicator");
    
    
}

function verifyStateMap(rawStateMap) {
    if (!Array.isArray(rawStateMap)) throw new InvalidConfValError("state_map");
    
    rawStateMap.forEach((state, i) => {
        if (!('label' in state && 'value' in state)) throw new InvalidConfValError("state_map");
    });
}

function computeDynamicColor(colors, smooth) {
    colors.forEach(col => {
        if (!('value' in col && 'color' in col)) throw new InvalidConfValError("color (color or value key is missing)");
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

class InvalidConfValError extends Error {
    constructor(message) {
        super("Invalid value for " + message);
        this.name = "InvalidConfValError";
    }
}

export default buildConfig;
