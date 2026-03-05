import {DEFAULT_CONF, DEFAULT_CONF_SHOW, FONT_SIZE, MAX_BARS, URL_DOCS} from "./const";
import {log} from "./utils";

function buildConfig(rawConfig) {
    let conf;
    
    if (typeof rawConfig.entity !== "string") {
        throw new Error(`Please provide a entity. See ${URL_DOCS}`);
    }
    
    conf = {
        ...DEFAULT_CONF,
        ...structuredClone(rawConfig),
    }
    conf.show = {
        ...DEFAULT_CONF_SHOW,
        ...rawConfig.show
    };
    
    conf.entity = String(conf.entity);
    conf.font_size = (rawConfig.font_size / 100) * FONT_SIZE || FONT_SIZE;
    
    conf.state_map.forEach((state, i) => {
        // convert string values to objects
        if (typeof state === "string") conf.state_map[i] = {value: state, label: state};
        // make sure label is set
        conf.state_map[i].label = conf.state_map[i].label || conf.state_map[i].value;
    });
    
    if (Array.isArray(conf.color)) {
        // color threshold
        conf.color = computeThresholds(conf.color, conf.color_thresholds_transition);
    }
    
    const additional = conf.hours_to_show > 24 ? {day: "numeric", weekday: "short"} : {};
    const hourFormat = {hourCycle: "h23"};
    conf.format = {...hourFormat, ...additional};
    
    // override points per hour to mach group_by function
    switch (conf.group_by) {
        case "date":
            conf.points_per_hour = 1 / 24;
            break;
        case "hour":
            conf.points_per_hour = 1;
            break;
        default:
            break;
    }
    
    if (conf.graph_type === "bar" && (conf.hours_to_show * conf.points_per_hour > MAX_BARS)) {
        conf.points_per_hour = MAX_BARS / (conf.hours_to_show);
        log(`Not enough space, adjusting points_per_hour to ${conf.points_per_hour}`);
    }
    
    return conf;
}


function computeThresholds(stops, type) {
    const valuedStops = interpolateStops(stops);
    valuedStops.sort((a, b) => b.value - a.value);
    
    if (type === "smooth") {
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
        throw new Error(`The first and last thresholds must have a set "value".\n See ${URL_DOCS}`);
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
