import {interpolateRgb} from "d3-interpolate";
import {ONE_HOUR, V, X, Y} from "./const";

export default class Graph {
    constructor(
        width,
        height,
        margin,
        hours_to_show,
        points_per_hour,
        aggregateFuncName = "avg",
        groupBy = "interval",
        smoothing = true,
        logarithmic = false,
        dynamic_color = undefined,
        bar_spacing = 4,
    ) {
        const aggregateFuncMap = {
            avg: this._average,
            median: this._median,
            max: this._maximum,
            min: this._minimum,
            first: this._first,
            last: this._last,
            sum: this._sum,
            delta: this._delta,
            diff: this._diff,
        };
        
        this._history = undefined;
        this.coords = [];
        this.width = width - margin[X] * 2;
        this.height = height - margin[Y] * 4;
        this.margin = margin;
        this._max = 0;
        this._min = 0;
        this.hours_to_show = hours_to_show;
        this.points_per_hour = points_per_hour;
        this.aggregateFuncName = aggregateFuncName;
        this.dynamic_color = dynamic_color;
        this.bar_spacing = bar_spacing;
        this._calcPoint = aggregateFuncMap[aggregateFuncName] || this._average;
        this._smoothing = smoothing;
        this._logarithmic = logarithmic;
        this._groupBy = groupBy;
        this._endTime = 0;
        
        this._cache = {
            points: undefined,
            path: undefined,
            gradient: undefined,
            fill: undefined,
            bars: undefined,
        }
    }
    
    get max() {
        return this._max;
    }
    
    set max(max) {  //todo include in graph and remove setter?
        this._max = max;
        this._clearCache();
    }
    
    get min() { //todo include in graph and remove setter?
        return this._min;
    }
    
    set min(min) {
        this._min = min;
        this._clearCache();
    }
    
    _clearCache() {
        this._cache = {
            points: undefined,
            path: undefined,
            gradient: undefined,
            fill: undefined,
            bars: undefined,
        }
    }
    
    update(history) {
        this._history = history;
        this._clearCache();
        
        if (!this._history || history.length <= 0) return;
        this._updateEndTime();
        
        const histGroups = this._history.reduce((res, item) => this._reducer(res, item), []);
        
        // extend length to fill missing history
        histGroups.length = Math.ceil(this.hours_to_show * this.points_per_hour);
        
        this.coords = this._calcPoints(histGroups);
        this.min = Math.min(...this.coords.map((item) => Number(item[V])));
        this.max = Math.max(...this.coords.map((item) => Number(item[V])));
    }
    
    _reducer(res, item) {
        const age = this._endTime - new Date(item.last_changed).getTime();
        const interval = (age / ONE_HOUR) * this.points_per_hour - this.hours_to_show * this.points_per_hour;
        if (interval < 0) {
            const key = Math.floor(Math.abs(interval));
            if (!res[key]) res[key] = [];
            res[key].push(item);
        } else {
            res[0] = [item];
        }
        return res;
    }
    
    _calcPoints(history) {
        let xRatio = this.width / (this.hours_to_show * this.points_per_hour - 1);
        xRatio = Number.isFinite(xRatio) ? xRatio : this.width;
        
        const coords = [];
        let last = history.filter(Boolean)[0];
        let x;
        for (let i = 0; i < history.length; i += 1) {
            x = xRatio * i + this.margin[X];
            if (history[i]) {
                last = history[i];
                coords.push([x, 0, this._calcPoint(last)]);
            } else {
                coords.push([x, 0, this._lastValue(last)]);
            }
        }
        return coords;
    }
    
    _calcY(coords) {
        // account for logarithmic graph
        const max = this._logarithmic ? Math.log10(Math.max(1, this.max)) : this.max;
        const min = this._logarithmic ? Math.log10(Math.max(1, this.min)) : this.min;
        
        const yRatio = (max - min) / this.height || 1;
        return coords.map((coord) => {
            const val = this._logarithmic ? Math.log10(Math.max(1, coord[V])) : coord[V];
            const coordY = this.height - (val - min) / yRatio + this.margin[Y] * 2;
            return [coord[X], coordY, coord[V]];
        });
    }
    
    getPoints() {
        if (this._cache.points) return this._cache.points;  //Serving from cache
        let {coords} = this;
        let points;
        
        if (coords.length === 1) {
            coords[1] = [this.width + this.margin[X], 0, coords[0][V]];
        }
        coords = this._calcY(this.coords);
        if (this._smoothing) {
            let last = coords[0];
            coords.shift();
            points = coords.map((point, i) => {
                const Z = this._midPoint(last[X], last[Y], point[X], point[Y]);
                const sum = (last[V] + point[V]) / 2;
                last = point;
                return [Z[X], Z[Y], sum, i + 1];
            });
        } else {
            points = coords.map((point, i) => [point[X], point[Y], point[V], i]);
        }
        
        this._cache.points = points;
        return points;
    }
    
    getPath() {
        if (this._cache.path) return this._cache.path;  //Serving from cache
        let {coords} = this;
        
        if (coords.length === 1) {
            coords[1] = [this.width + this.margin[X], 0, coords[0][V]];
        }
        coords = this._calcY(this.coords);
        let next;
        let Z;
        let path = "";
        let last = coords[0];
        path += `M${last[X]},${last[Y]}`;
        
        coords.forEach((point) => {
            next = point;
            Z = this._smoothing ? this._midPoint(last[X], last[Y], next[X], next[Y]) : next;
            path += ` ${Z[X]},${Z[Y]}`;
            path += ` Q ${next[X]},${next[Y]}`;
            last = next;
        });
        path += ` ${next[X]},${next[Y]}`;
        
        this._cache.path = path;
        return path;
    }
    
    computeGradient() {
        if (this._cache.gradient) return this._cache.gradient; //Serving from cache
        if (!Array.isArray(this.dynamic_color)) return null;
        let gradient;
        
        const scale = this._logarithmic
            ? Math.log10(Math.max(1, this._max)) - Math.log10(Math.max(1, this._min))
            : this._max - this._min;
        
        gradient = this.dynamic_color.map((stop, index, arr) => {
            let color;
            if (stop.value > this._max && arr[index + 1]) {
                const factor = (this._max - arr[index + 1].value) / (stop.value - arr[index + 1].value);
                color = interpolateRgb(arr[index + 1].color, stop.color)(factor);
            } else if (stop.value < this._min && arr[index - 1]) {
                const factor = (arr[index - 1].value - this._min) / (arr[index - 1].value - stop.value);
                color = interpolateRgb(arr[index - 1].color, stop.color)(factor);
            }
            let offset;
            if (scale <= 0) {
                offset = 0;
            } else if (this._logarithmic) {
                offset = (Math.log10(Math.max(1, this._max)) - Math.log10(Math.max(1, stop.value))) * (100 / scale);
            } else {
                offset = (this._max - stop.value) * (100 / scale);
            }
            return {
                color: color || stop.color,
                offset,
            };
        });
        this._cache.gradient = gradient;
        return gradient;
    }
    
    getFill() {
        if (this._cache.fill) return this._cache.fill;  //Serving from cache
        const height = this.height + this.margin[Y] * 4;
        let fill = this.getPath();
        fill += ` L ${this.width - this.margin[X] * 2}, ${height}`;
        fill += ` L ${this.coords[0][X]}, ${height} z`;
        this._cache.fill = fill;
        return fill;
    }
    
    getBars() {
        if (this._cache.bars) return this._cache.bars;  //Serving from cache
        let bars;
        
        const coords = this._calcY(this.coords);
        const xRatio = (this.width - this.bar_spacing) / Math.ceil(this.hours_to_show * this.points_per_hour);
        bars = coords.map((coord, i) => ({
            x: xRatio * i + xRatio + this.bar_spacing,
            y: coord[Y],
            height: this.height - coord[Y] + this.margin[Y] * 4,
            width: xRatio - this.bar_spacing,
            value: coord[V],
        }));
        this._cache.bars = bars;
        return bars;
    }
    
    _midPoint(Ax, Ay, Bx, By) {
        const Zx = (Ax - Bx) / 2 + Bx;
        const Zy = (Ay - By) / 2 + By;
        return [Zx, Zy];
    }
    
    _average(items) {
        return items.reduce((sum, entry) => sum + entry.state, 0) / items.length;
    }
    
    _median(items) {
        const sorted = Array.from(items).sort((a, b) => a.state - b.state);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1].state + sorted[middle].state) / 2;
        }
        
        return sorted[middle].state;
    }
    
    _maximum(items) {
        return Math.max(...items.map((item) => item.state));
    }
    
    _minimum(items) {
        return Math.min(...items.map((item) => item.state));
    }
    
    _first(items) {
        return items[0].state;
    }
    
    _last(items) {
        return items[items.length - 1].state;
    }
    
    _sum(items) {
        return items.reduce((sum, entry) => sum + entry.state, 0);
    }
    
    _delta(items) {
        return this._maximum(items) - this._minimum(items);
    }
    
    _diff(items) {
        return this._last(items) - this._first(items);
    }
    
    _lastValue(items) {
        if (["delta", "diff"].includes(this.aggregateFuncName)) {
            return 0;
        } else {
            return items[items.length - 1].state || 0;
        }
    }
    
    _updateEndTime() {
        this._endTime = new Date();
        switch (this._groupBy) {
            case "date":
                this._endTime.setDate(this._endTime.getDate() + 1);
                this._endTime.setHours(0, 0, 0, 0);
                break;
            case "hour":
                this._endTime.setHours(this._endTime.getHours() + 1);
                this._endTime.setMinutes(0, 0, 0);
                break;
            default:
                break;
        }
    }
}
