import LZString from "lz-string";
import {CARD_NAME} from "./const.js";

function getMinState(history) {
    return history.reduce((min, p) => (p.state < min.state ? p : min), history[0]);
}

function getAvgState(history) {
    return history.reduce((sum, p) => (sum + p.state), 0) / history.length;
}

function getMaxState(history) {
    return history.reduce((max, p) => (p.state > max.state ? p : max), history[0]);
}

function getTime(date, extra, locale = "en-US") {
    return date.toLocaleString(locale, {hour: "numeric", minute: "numeric", ...extra})
}

function compress(data) {
    return LZString.compress(JSON.stringify(data));
}

function decompress(data) {
    try {
        return JSON.parse(LZString.decompress(data));
    } catch (error) {
        logWarning('Decompress failed.', error);
        return undefined;
    }
}

function isString(value) {
    return (typeof value === "string");
}

function isNumber(value, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
    return (typeof value === "number" && value >= min && value <= max);
}

function isInt(value, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
    return (Number.isInteger(value) && value >= min && value <= max);
}

function isUndef(value) {
    return (typeof value === "undefined");
}

function isBool(value) {
    return (typeof value === "boolean");
}

const log = {
    debug: function (message, data = undefined) {
        console.debug(`${CARD_NAME}: ${message}`, data);
    },
    warn: function (message, data = undefined) {
        console.warn(`${CARD_NAME}: ${message}`, data);
    }
};


export {
    getMinState,
    getAvgState,
    getMaxState,
    getTime,
    compress,
    decompress,
    isString,
    isNumber,
    isInt,
    isUndef,
    isBool,
    log
};
