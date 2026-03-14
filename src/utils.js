import LZString from "lz-string";
import {CARD_NAME} from "./const.js";

const getMin = (arr, val) => arr.reduce((min, p) => (Number(p[val]) < Number(min[val]) ? p : min), arr[0]);
const getAvg = (arr, val) => arr.reduce((sum, p) => sum + Number(p[val]), 0) / arr.length;
const getMax = (arr, val) => arr.reduce((max, p) => (Number(p[val]) > Number(max[val]) ? p : max), arr[0]);
const getTime = (date, extra, locale = "en-US") =>
    date.toLocaleString(locale, {hour: "numeric", minute: "numeric", ...extra});
const getMilli = (hours) => hours * 60 ** 2 * 10 ** 3;

const compress = (data) => LZString.compressToUint8Array(JSON.stringify(data));

const decompress = (data) => (typeof data === "string" ? JSON.parse(LZString.decompressFromUint8Array(data)) : data);

const logWarning = (message) => {
    console.warn(CARD_NAME, ": ", message);
};

export {getMin, getAvg, getMax, getTime, getMilli, compress, decompress, logWarning};
