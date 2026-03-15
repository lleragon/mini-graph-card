import {AGGREGATE_FUNCTIONS, CARD_NAME, DEFAULT_CONF, DEFAULT_CONF_SHOW, FONT_SIZE, MAX_BARS} from "./const";
import {logWarning, isNumber, isBool, isUndef, isInt, isString} from "./utils";
import SparkMD5 from "spark-md5";

function buildConfig(rawConfig) {
    //todo check all config entries and remove uneccessdary checks in main
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
    
    //Verify configuration values
    //todo check readme datatypes and limits
    if (!isString(conf.entity)) throw new Error(`Please provide an entity.`);
    if (!isUndef(conf.decimals) && !isInt(conf.decimals, 0, 10)) throw new InvalidConfValError("decimals");
    //-----
    if (conf.graph_type !== "line" && conf.graph_type === "bar" && conf.graph_type === "none") throw new InvalidConfValError("graph_type");
    if (!isNumber(conf.line_width, 0.5, 10)) throw new InvalidConfValError("line_width");
    if (!isNumber(conf.bar_spacing, 0.5, 10)) throw new InvalidConfValError("bar_spacing");
    if (!isBool(conf.smoothing)) throw new InvalidConfValError("smoothing");
    if (!isBool(conf.logarithmic)) throw new InvalidConfValError("logarithmic");
    //todo color
    if (!isBool(conf.color_smooth_transition)) throw new InvalidConfValError("color_smooth_transition");
    //-----
    if (!isInt(conf.hours_to_show, 1, 500)) throw new InvalidConfValError("hours_to_show");
    if (!isNumber(conf.points_per_hour, 0.1, 60)) throw new InvalidConfValError("points_per_hour");
    if (!AGGREGATE_FUNCTIONS.contains(conf.aggregate_func)) throw new InvalidConfValError("aggregate_func");
    if (!["date", "hour", "interval"].contains(conf.group_by)) throw new InvalidConfValError("group_by");   //todo readme overrides points_per_hour
    if (!isInt(conf.update_interval, 0, 3600)) throw new InvalidConfValError("update_interval");
    //-----
    if (!isInt(conf.font_size, 1, 500)) throw new InvalidConfValError("font_size");
    if (!isNumber(conf.font_size_header, 1, 100)) throw new InvalidConfValError("font_size_header");
    if (!isInt(conf.height, 10, 500)) throw new InvalidConfValError("height");
    //todo align_icon
    //todo align_state
    //todo align_header
    if (!isBool(conf.group)) throw new InvalidConfValError("group");
    //-----
    if (!isUndef(conf.lower_bound) && !isNumber(conf.lower_bound)) throw new InvalidConfValError("lower_bound");
    if (!isUndef(conf.lower_bound) && !isNumber(conf.lower_bound)) throw new InvalidConfValError("upper_bound");
    if (!isUndef(conf.min_bound_range) && !isNumber(conf.min_bound_range, 1)) throw new InvalidConfValError("min_bound_range");
    if (!isNumber(conf.value_factor) || conf.value_factor === 0) throw new InvalidConfValError("value_factor");
    verifyStateMap()
    //-----
    if (!isBool(conf.cache)) throw new InvalidConfValError("cache");
    if (!isBool(conf.cache_compress)) throw new InvalidConfValError("cache_compress");
    //todo tap_action
    
    
    //Turn smoothing off for binary sensor
    if (conf.smoothing && conf.entity.startsWith("binary_sensor.")) {
        logWarning('Smoothing ist not compatible with binary sensors');
        conf.smoothing = false;
    }
    //Compute dynamic line color object
    if (Array.isArray(conf.color)) conf.color = computeThresholds(conf.color, conf.color_smooth_transition);
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
    console.debug(`${CARD_NAME}: Configuration ${this.config}`);
    return conf;
}

class InvalidConfValError extends Error {
    constructor(message) {
        super("Invalid value for " + message);
        this.name = "InvalidConfValError";
    }
}


function verifyStateMap(rawStateMap) {
    if (!Array.isArray(rawStateMap)) throw new InvalidConfValError("state_map");
    
    rawStateMap.forEach((state, i) => {
        if (!('label' in state && 'value' in state)) throw new InvalidConfValError("state_map");
    });
}


function computeThresholds(stops, smooth) {
    const valuedStops = interpolateStops(stops);
    valuedStops.sort((a, b) => b.value - a.value);
    
    if (smooth) {
        return valuedStops;
    } else {
        return [].concat(
            ...valuedStops.map((stop, i) => [
                stop,
                {
                    value: stop.value - 0.0001,
                    color: valuedStops[i + 1] ? valuedStops[i + 1].color : stop.color,
                },
            ]),
        );
    }
}

/**
 * Interpolates the "value" of each stop. Each stop can be a color string or an object of type
 * ```
 * {
 *   color: string
 *   value?: number | null
 * }
 * ```
 * And the values will be interpolated by the nearest valued stops.
 *
 * For example, given values `[ 0, null, null, 4, null, 3]`,
 * the interpolation will output `[ 0, 1.3333, 2.6667, 4, 3.5, 3 ]`
 *
 * Note that values will be interpolated ascending and descending.
 * All that's necessary is that the first and the last elements have values.
 *
 * @param {Array} stops
 * @returns {Array<{ color: string, value: number }>}
 */
function interpolateStops(stops) {
    if (!stops || !stops.length) {
        return stops;
    }
    if (stops[0].value == null || stops[stops.length - 1].value == null) {
        throw new Error(`The first and last thresholds must have a set "value".`);
    }
    
    let leftValuedIndex = 0;
    let rightValuedIndex = null;
    
    return stops.map((stop, stopIndex) => {
        if (stop.value != null) {
            leftValuedIndex = stopIndex;
            return {...stop};
        }
        
        if (rightValuedIndex == null) {
            rightValuedIndex = findFirstValuedIndex(stops, stopIndex);
        } else if (stopIndex > rightValuedIndex) {
            leftValuedIndex = rightValuedIndex;
            rightValuedIndex = findFirstValuedIndex(stops, stopIndex);
        }
        
        // y = mx + b
        // m = dY/dX
        // x = index in question
        // b = left value
        
        const leftValue = stops[leftValuedIndex].value;
        const rightValue = stops[rightValuedIndex].value;
        const m = (rightValue - leftValue) / (rightValuedIndex - leftValuedIndex);
        return {
            color: typeof stop === "string" ? stop : stop.color,
            value: m * stopIndex + leftValue,
        };
    });
}

/**
 * Starting from the given index, increment the index until an array element with a
 * "value" property is found
 *
 * @param {Array} stops
 * @param {number} startIndex
 * @returns {number}
 */
function findFirstValuedIndex(stops, startIndex) {
    for (let i = startIndex, l = stops.length; i < l; i += 1) {
        if (stops[i].value != null) {
            return i;
        }
    }
    throw new Error(
        "Error in threshold interpolation: could not find right-nearest valued stop. " +
        'Do the first and last thresholds have a set "value"?',
    );
}


export default buildConfig;
