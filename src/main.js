import {stateIcon} from "custom-card-helpers";
import {interpolateRgb} from "d3-interpolate";
import {html, LitElement, svg} from "lit-element";
import localForage from "localforage/src/localforage";
import buildConfig from "./buildConfig";
import Graph from "./graph";
import handleClick from "./handleClick";
import style from "./style";
import "./initialize";
import {CARD_NAME, CARD_NAME_READABLE, CARD_VERSION, ONE_HOUR, UPDATE_PROPS, V, X, Y} from "./const";
import {compress, decompress, getAvg, getMax, getMilli, getMin, getTime, logWarning,} from "./utils";

//TODO Clean cache after entity change
//TODO check update interval if state doesn't changes for a long time
//TODO HTML verschachtelung  vereinfachen
//TODO Render in sep class?

class ExtremaGraphCard extends LitElement {
    constructor() {
        super();
        this.id = Math.random().toString(36).substring(2, 12);
        this.config = {};
        this.boundary_min = 0;
        this.boundary_max = 0;
        this.entity = undefined;
        this.line = undefined;
        this.bars = undefined;
        this.extrema = [];
        this.fill = undefined;
        this.points = [];
        this.gradient = undefined;
        this.tooltip = {};
        this.updating = false;
        this.stateChanged = false;
        this.initial = true;
    }
    
    static get styles() {
        return style;
    }
    
    static get properties() {
        return {
            id: String,
            _hass: {},
            config: {},
            entity: {},
            Graph: [],
            line: [],
            shadow: [],
            length: Number,
            boundary_min: Number,
            boundary_max: Number,
            extrema: [],
            tooltip: {},
            color: String,
        };
    }
    
    //entity state change from home assistant
    set hass(hass) {
        this._hass = hass;
        const entityState = hass?.states[this.config.entity];
        if (entityState && this.entity !== entityState) {
            this.entity = entityState;
            this.stateChanged = true;
            
            if (this.config.update_interval <= 0 && !this.updating) {
                setTimeout(
                    () => {this.updateData().then();},
                    this.initial ? 0 : 1000,
                );
            }
        }
    }
    
    //card config update from home assistant
    setConfig(rawConfig) {
        this.config = buildConfig(rawConfig);
        
        if (this._hass) this.hass = this._hass; //Trigger data update
        
        this.Graph = new Graph(
            500,
            this.config.height,
            [this.config.show.fill ? 0 : this.config.line_width, this.config.line_width],
            this.config.hours_to_show,
            this.config.points_per_hour,
            this.config.aggregate_func,
            this.config.group_by,
            this.config.smoothing,
            this.config.logarithmic,
        );
    }
    
    //Lit -> Invoked when a component is added to the document's DOM
    connectedCallback() {
        super.connectedCallback();
        if (this.config.update_interval > 0) {
            window.requestAnimationFrame(() => {this.updateOnInterval();});
            this.interval = setInterval(() => this.updateOnInterval(), this.config.update_interval * 1000);
        }
    }
    
    //Lit -> Invoked when a component is removed from the document's DOM
    disconnectedCallback() {
        if (this.interval) clearInterval(this.interval);
        super.disconnectedCallback();
    }
    
    shouldUpdate(changedProps) {
        //todo move color set and remove this function see  https://lit.dev/docs/v1/components/lifecycle/#shouldupdate
        
        if (UPDATE_PROPS.some((prop) => changedProps.has(prop))) {
            if (this.config && this.entity) {
                this.color = this.computeColor(this.tooltip.value !== undefined ? this.tooltip.value : this.getEntityState());
            }
            return true;
        }
    }
    
    firstUpdated(changedProperties) {
        this.initial = false;
    }
    
    render() {
        //TODO check properly update detection on immuntabel properties https://lit.dev/docs/components/properties/#mutating-properties
        console.debug('rendering');
        if (!this.config) {
            return this.renderWarnings(`Card configuration not available.`);
        }
        if (!this.entity) {
            return this.renderWarnings(`Entity not available: ${this.config.entity}`);
        }
        if (!this._hass) {
            return this.renderWarnings(`Internal hass object not available: ${this.config.entity}`);
        }
        
        return html`
            <ha-card
                    class="flex"
                    ?group=${this.config.group}
                    ?fill=${(this.config.graph_type !== "none") && this.config.show.fill}
                    ?points=${this.config.show.points === "hover"}
                    ?labels=${this.config.show.labels === "hover"}
                    ?gradient=${Array.isArray(this.config.color)}
                    ?hover=${this.config.tap_action.action !== "none"}
                    style="font-size: ${this.config.font_size}px;"
                    @click=${(e) => this.handlePopup(e, this.config.tap_action.entity || this.entity)}
            >
                ${this.renderHeader()}
                ${this.renderState()}
                ${this.renderGraph()}
                ${this.renderInfo()}
            </ha-card>
        `;
    }
    
    renderWarnings(message) { //TODO more and specif error messages?
        return html`
            <hui-warning>
                <div>extrema-graph-card</div>
                <div>${message}</div>
            </hui-warning>`;
    }
    
    renderHeader() {
        const {show, align_icon, align_header, font_size_header} = this.config;
        
        if (!show.name && !(show.icon && align_icon !== "state")) return html``
        
        return html`
            <div class="header flex" loc=${align_header} style="font-size: ${font_size_header}px;">
                ${this.renderName()}
                ${align_icon !== "state" ? this.renderIcon() : ""}
            </div>`;
    }
    
    renderName() {
        if (!this.config.show.name) return;
        
        const name = this.config.name || this.entity.attributes.friendly_name || this.entity.entity_id;
        const color = this.config.show.name_adaptive_color ? `opacity: 1; color: ${this.color};` : "";
        
        return html`
            <div class="name flex">
                <span class="ellipsis" style=${color}>${name}</span>
            </div>`;
    }
    
    renderIcon() {
        if (!this.config.show.icon) return;
        
        const icon = this.config.icon || this.entity.attributes.icon || stateIcon(this.entity) || "";
        
        return html`
            <div class="icon" loc=${this.config.align_icon}
                 style=${this.config.show.icon_adaptive_color ? `color: ${this.color};` : ""}>
                <ha-icon .icon=${icon}></ha-icon>
            </div>`;
    }
    
    renderState() {
        if (!this.config.show.state) return;
        
        // use tooltip data for main state element, if tooltip is active
        const isTooltip = this.tooltip.value !== undefined;
        const value = isTooltip ? this.tooltip.value : this.getEntityState();
        
        const color = this.config.show.state_adaptive_color ? `color: ${this.computeColor(value)}` : ""
        
        return html`
            <div class="states flex" loc=${this.config.align_state}>
                <div class="state" @click=${(e) => this.handlePopup(e, this.entity)} style=${color}>
                    <span class="state__value ellipsis">
                        ${this.computeState(value)}
                    </span>
                    <span class="state__uom ellipsis">
                        ${this.computeUom()}
                    </span>
                    ${this.renderStateTime()}
                </div>
                ${this.config.align_icon === "state" ? this.renderIcon() : ""}
            </div>`;
    }
    
    //TODO Move to Utils
    getObjectAttr(obj, path) {
        return path.split(".").reduce((res, key) => res?.[key], obj);
    }
    
    getEntityState() {
        if (this.config.show.state === "last") {
            return this.points[this.points.length - 1][V];
        } else if (this.config.entity_attribute) {
            return this.getObjectAttr(this.entity.attributes, this.config.entity_attribute);
        } else {
            return this.entity.state;
        }
    }
    
    renderStateTime() {
        if (this.tooltip.value === undefined) return;
        
        return html`
            <div class="state__time">
                <span>${this.tooltip.time[0]}</span>
                -
                <span>${this.tooltip.time[1]}</span>
            </div>`;
    }
    
    renderGraph() {
        let content;
        
        if (this.config.graph_type === 'none') return "";
        
        if ((this.entity && (this.Graph._history !== undefined))) {
            content = html`
                <div class="graph__container">
                    ${this.renderLabels()}
                    <div class="graph__container__svg">
                        ${this.renderSvg()}
                    </div>
                </div> `;
        } else {
            content = html`<ha-spinner aria-label="Loading" size="small"></ha-spinner>`;
        }
        
        return html`
            <div class="graph">${content}</div>`
    }
    
    renderSvgFill() {
        if (!this.fill) return;
        const fade = this.config.show.fill === "fade";
        
        return svg`
            <defs>
                <linearGradient id=${`fill-grad-${this.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop stop-color='white' offset='0%' stop-opacity='1'/>
                    <stop stop-color='white' offset='100%' stop-opacity='.15'/>
                 </linearGradient>
                <mask id=${`fill-grad-mask-${this.id}`}>
                    <rect width="100%" height="100%" fill=${`url(#fill-grad-${this.id})`} />
                </mask>
            </defs>
            <mask id=${`fill-${this.id}`}>
                <path class='fill'
                    type=${this.config.show.fill}
                    fill='white'
                    mask=${fade ? `url(#fill-grad-mask-${this.id})` : ""}
                    d=${this.fill}
                />
            </mask>`;
    }
    
    renderSvgLine() {
        if (!this.line) return;
        
        return svg`
            <mask id=${`line-${this.id}`}>
                  <path
                    class='line'
                    fill='none'
                    stroke-dasharray='none'
                    stroke-dashoffset='none'
                    stroke=${"white"}
                    stroke-width=${this.config.line_width}
                    d=${this.line}
                  />
            </mask>`;
    }
    
    renderSvgPoint(point) {
        const color = this.gradient ? this.computeColor(point[V]) : "inherit";
        
        return svg`
            <circle
                class='line--point'
                ?inactive=${this.tooltip.index !== point[3]}
                style=${`--mcg-hover: ${color};`}
                stroke=${color}
                fill=${color}
                cx=${point[X]} cy=${point[Y]} r=${this.config.line_width}
                @mouseover=${() => this.setTooltip(point[3], point[V])}
                @mouseout=${() => (this.tooltip = {})}
            />`;
    }
    
    renderSvgPoints() {
        if (!this.points) return;
        const color = this.computeColor(this.entity.state);
        
        return svg`
            <g class='line--points'
                ?tooltip=${this.tooltip.value !== undefined}
                ?inactive=${this.tooltip.value !== undefined}
                fill=${color}
                stroke=${color}
                stroke-width=${this.config.line_width / 2}>
                ${this.points.map((point) => this.renderSvgPoint(point))}
            </g>`;
    }
    
    renderSvgGradient() {
        if (!this.gradient) return;
        const stops = this.gradient.map((stop) =>
            svg`<stop stop-color=${stop.color} offset=${`${stop.offset}%`} />`,)
        
        return svg`
            <linearGradient id=${`grad-${this.id}`} gradientTransform="rotate(90)">
                ${stops}
            </linearGradient>`;
    }
    
    renderSvgLineRect() {
        if (!this.line) return;
        const fill = this.gradient ? `url(#grad-${this.id})` : this.computeColor(this.entity.state);
        
        return svg`
          <rect class='line--rect'
            id=${`rect-${this.id}`}
            ?inactive=${this.tooltip.value !== undefined}
            fill=${fill} height="100%" width="100%"
            mask=${`url(#line-${this.id})`}
          />`;
    }
    
    renderSvgFillRect() {
        if (!this.fill) return;
        const svgFill = this.gradient ? `url(#grad-${this.id})` : this.computeColor(this.entity.state);
        
        return svg`
          <rect class='fill--rect'
            id=${`fill-rect-${this.id}`}
            ?inactive=${this.tooltip.value !== undefined}
            fill=${svgFill} height="100%" width="100%"
            mask=${`url(#fill-${this.id})`}
          />`;
    }
    
    renderSvgBars() {
        if (!this.bars) return;
        
        const items = this.bars.map((bar, i) => svg`
                    <rect class='bar' x=${bar.x} y=${bar.y}
                      height=${bar.height} width=${bar.width} fill=${this.computeColor(bar.value)}
                      @mouseover=${() => this.setTooltip(i, bar.value)}
                      @mouseout=${() => (this.tooltip = {})}>
                    </rect>`
        );
        return svg`<g class='bars'>${items}</g>`;
    }
    
    renderSvg() {
        const {height} = this.config;
        
        return svg`
            <svg preserveAspectRatio='none' width='100%' height='${height}px' viewBox='0 0 500 ${height}'
                @click=${(e) => e.stopPropagation()}>
                <g>
                  <defs>
                    ${this.renderSvgGradient()}
                  </defs>
                  ${this.renderSvgFill()}
                  ${this.renderSvgFillRect()}
                  ${this.renderSvgLine()}
                  ${this.renderSvgLineRect()}
                  ${this.renderSvgBars()}
                </g>
                ${this.renderSvgPoints(this.points)}
            </svg>`;
    }
    
    setTooltip(index, value) {
        const {group_by, points_per_hour, hours_to_show, timeFormat} = this.config;
        
        // time units in milliseconds in this function
        const interval = getMilli(1 / points_per_hour);
        const n_points = Math.ceil(hours_to_show * points_per_hour);
        
        // index is 0 (oldest) to n_points-1 (most recent ~= now)
        // count of intervals from now to end of bin
        // count is 0 (now) to n_points-1 (oldest)
        const count = n_points - 1 - index;
        
        // offset end by a minute, if grouped by, e.g., date or hour
        const oneMinute = group_by !== "interval" ? 60000 : 0;
        
        const now = this.getEndDate();
        
        now.setMilliseconds(now.getMilliseconds() - oneMinute - interval * count);
        const end = getTime(now, timeFormat, this._hass.language);
        now.setMilliseconds(now.getMilliseconds() + oneMinute - interval);
        const start = getTime(now, timeFormat, this._hass.language);
        
        this.tooltip = {
            value,
            count,
            time: [start, end],
            index,
        };
    }
    
    renderLabels() {
        if (!this.config.show.labels) return;
        
        return html`
            <div class="graph__labels --primary flex">
                <span class="label--max">${this.computeState(this.boundary_max)}</span>
                <span class="label--min">${this.computeState(this.boundary_min)}</span>
            </div>`;
    }
    
    renderInfo() {
        if (this.extrema.length <= 0) return html``;
        
        const info = this.extrema.map((entry) => html`
            <div class="info__item">
                <span class="info__item__type">${entry.type}</span>
                <span class="info__item__value">${this.computeState(entry.state)}</span>
                <span class="info__item__time">
                    ${entry.type !== "avg" ? getTime(new Date(entry.last_changed), this.config.timeFormat, this._hass.language) : ""}
                </span>
            </div>`
        )
        
        return html`
            <div class="info flex">
                ${info}
            </div>`;
    }
    
    handlePopup(e, entity) {
        e.stopPropagation();
        handleClick(this, this._hass, this.config.tap_action, entity.entity_id || entity);
    }
    
    computeColor(inState) {
        const state = Number(inState) || 0;
        
        let intColor;
        if (Array.isArray(this.config.color)) {
            const {color} = this.config.color.find((ele) => ele.value < state) || this.config.color.slice(-1)[0];
            intColor = color;
            const index = this.config.color.findIndex((ele) => ele.value < state);
            const c1 = this.config.color[index];
            const c2 = this.config.color[index - 1];
            if (c2) {
                const factor = (c2.value - state) / (c2.value - c1.value);
                intColor = interpolateRgb(c2.color, c1.color)(factor);
            } else {
                intColor = index ? this.config.color[this.config.color.length - 1].color : this.config.color[0].color;
            }
        }
        
        return intColor || this.config.color;
    }
    
    computeUom() {
        if (this.config.unit !== undefined) {
            return this.config.unit;
        } else if (!this.config.entity_attribute) {
            return this.entity.attributes.unit_of_measurement || ""
        } else {
            return ""
        }
    }
    
    
    computeState(rawState) {
        if (this.config.state_map.length > 0) {
            const stateMap = this.config.state_map.find((state) => state.value === rawState);
            
            if (stateMap) {
                return stateMap.label;
            } else {
                logWarning(`value [${rawState}] not found in state_map`);
            }
        }
        
        let state;
        if (typeof rawState === "string") {
            state = parseFloat(rawState.replace(/,/g, "."));
        } else {
            state = Number(rawState);
        }
        
        //todo Needs to be created only on config or language chaange
        let nbrf = new Intl.NumberFormat(this._hass.language, {
            minimumFractionDigits: this.config.decimals !== undefined ? this.config.decimals : 0,
            maximumFractionDigits: this.config.decimals !== undefined ? this.config.decimals : 3,
        });
        
        return nbrf.format(state * this.config.value_factor);
    }
    
    updateOnInterval() {
        if (this.stateChanged && !this.updating) {
            this.stateChanged = false;
            this.updateData().then();
        }
    }
    
    async updateData({config} = this) {
        this.updating = true;
        
        //todo move to updateEntity()?
        const end = this.getEndDate();
        const start = new Date(end);
        start.setMilliseconds(start.getMilliseconds() - getMilli(config.hours_to_show));
        
        try {
            await this.updateEntity(start, end)
        } catch (err) {
            logWarning(err);
        }
        
        if (this.entity) this.Graph.update();
        
        this.updateBounds();
        
        if (config.graph_type !== "none" && this.entity && this.Graph.coords.length !== 0) {
            this.Graph.min = this.boundary_min;
            this.Graph.max = this.boundary_max;
            
            //todo set svg element to undifend if not configurated and remove other config checks
            if (config.graph_type === "bar") {
                this.bars = this.Graph.getBars(config.bar_spacing);
            } else {
                const line = this.Graph.getPath();
                if (config.show.line === true) this.line = line;
                if (config.show.fill) this.fill = this.Graph.getFill(line);
                if (config.show.points) this.points = this.Graph.getPoints();
                
                if (Array.isArray(config.color)) {
                    this.gradient = this.Graph.computeGradient(config.color, this.config.logarithmic);
                }
            }
        }
        
        this.updating = false;
        this.setNextUpdate();
    }
    
    getBoundary(type, configVal, fallback) {
        if (configVal === undefined) {
            // dynamic boundary depending on values
            return this.Graph[type] || fallback;
        } else if (configVal[0] !== "~") {
            // fixed boundary
            return configVal;
        } else {
            // soft boundary (respecting out of range values)
            return Math[type](Number(configVal.substr(1)), this.Graph[type]);
        }
    }
    
    updateBounds() {
        const min = this.config.lower_bound
        const max = this.config.upper_bound
        
        let boundary_min = this.getBoundary("min", min, this.boundary_min)
        let boundary_max = this.getBoundary("max", max, this.boundary_max)
        
        if (this.config.min_bound_range) {
            const currentRange = Math.abs(boundary_min - boundary_max);
            const diff = parseFloat(this.config.min_bound_range) - currentRange;
            
            // Doesn't matter if minBoundRange is NaN because this will be false if so
            if (diff > 0) {
                const weight_min = (min !== undefined && min[0] !== "~") || max === undefined ? 0 : 1
                const weight_max = (max !== undefined && max[0] !== "~") || min === undefined ? 0 : 1
                const sum = weight_min + weight_max;
                if (sum > 0) {
                    boundary_min = boundary_min - (diff * weight_min) / sum
                    boundary_max = boundary_max + (diff * weight_max) / sum
                } else {
                    boundary_min = boundary_min - diff / 2
                    boundary_max = boundary_max + diff / 2
                }
            }
        }
        
        this.boundary_min = boundary_min
        this.boundary_max = boundary_max
    }
    
    async getCache() {
        //todo key generation during config update
        let key = `${this.entity.entity_id}_${this.config.hash}`
        if (!this.config.cache_compress) key = `${key}_raw`
        
        const data = await localForage.getItem(key);
        if (!data) return null;
        
        return this.config.cache_compress ? decompress(data) : data;
    }
    
    async setCache(data) {
        if (this.config.cache_compress) {
            localForage.setItem(`${this.entity.entity_id}_${this.config.hash}`, compress(data));
        } else {
            localForage.setItem(`${this.entity.entity_id}_${this.config.hash}_raw`, data);
        }
    }
    
    //TODO THIS FUNCTION :(
    async updateEntity(start, end) {
        if (!this.entity) return;
        
        let stateHistory = [];
        let skipInitialState = false;
        
        const history = this.config.cache ? await this.getCache() : undefined;
        if (history && history.hours_to_show === this.config.hours_to_show) {
            stateHistory = history.data;
            
            let currDataIndex = stateHistory.findIndex((item) => new Date(item.last_changed) > start);
            if (currDataIndex !== -1) {
                if (currDataIndex > 0) {
                    // include previous item
                    currDataIndex -= 1;
                    // but change it's last changed time
                    stateHistory[currDataIndex].last_changed = start;
                }
                
                stateHistory = stateHistory.slice(currDataIndex, stateHistory.length);
                // skip initial state when fetching recent/not-cached data
                skipInitialState = true;
            } else {
                // there were no states which could be used in current graph so clearing
                stateHistory = [];
            }
            
            const lastFetched = new Date(history.last_fetched);
            if (lastFetched > start) {
                start = new Date(lastFetched - 1);
            }
        }
        
        let newStateHistory = await this.fetchRecent(
            this.entity.entity_id,
            start,
            end,
            this.config.entity_attribute ? false : skipInitialState,
            !!this.config.entity_attribute,
        );
        if (newStateHistory[0] && newStateHistory[0].length > 0) {
            /**
             * hack because HA doesn't return anything if skipInitialState is false
             * when retrieving for attributes so we retrieve it, and we remove it.*
             */
            if (this.config.entity_attribute && skipInitialState) {
                newStateHistory[0].shift();
            }
            // check if we should convert states to numeric values
            if (this.config.state_map.length > 0 || this.config.entity_attribute) {
                newStateHistory[0].forEach((item) => {
                    if (this.config.entity_attribute) {
                        item.state = this.getObjectAttr(item.attributes, this.config.entity_attribute);
                        delete item.attributes;
                    }
                    if (this.config.state_map.length > 0) this.convertState(item);
                });
            }
            
            newStateHistory = newStateHistory[0].filter((item) => !Number.isNaN(parseFloat(item.state)));
            newStateHistory = newStateHistory.map((item) => ({
                last_changed: this.config.entity_attribute ? item.last_updated : item.last_changed,
                state: item.state,
            }));
            stateHistory = [...stateHistory, ...newStateHistory];
            
            if (this.config.cache) {
                this.setCache(
                    {
                        hours_to_show: this.config.hours_to_show,
                        last_fetched: new Date(),
                        data: stateHistory,
                        CARD_VERSION,
                    },
                ).catch((err) => {
                    logWarning(err);
                    localForage.clear();
                });
            }
        }
        
        if (stateHistory.length === 0) return;
        
        if (this.entity) {
            this.updateExtrema(stateHistory);
        }
        
        this.Graph.history = stateHistory;
        
    }
    
    //TODO THIS FUNCTION
    async fetchRecent(entityId, start, end, skipInitialState, withAttributes) {
        let url = "history/period";
        if (start) url += `/${start.toISOString()}`;
        url += `?filter_entity_id=${entityId}`;
        if (end) url += `&end_time=${end.toISOString()}`;
        if (skipInitialState) url += "&skip_initial_state";
        if (!withAttributes) url += "&minimal_response&no_attributes";
        if (withAttributes) url += "&significant_changes_only=0";
        return this._hass.callApi("GET", url);
    }
    
    updateExtrema(history) {
        //todo include, getMin, getMax, getAVg her
        this.extrema = []
        if (this.config.show.extrema) {
            this.extrema.push({type: "min", ...getMin(history, "state")});
        }
        if (this.config.show.average) {
            this.extrema.push({type: "avg", state: getAvg(history, "state")});
        }
        if (this.config.show.extrema) {
            this.extrema.push({type: "max", ...getMax(history, "state")});
        }
    }
    
    
    convertState(res) {
        const resultIndex = this.config.state_map.findIndex((s) => s.value === res.state);
        if (resultIndex === -1) {
            return;
        }
        
        res.state = resultIndex;
    }
    
    getEndDate() {
        const date = new Date();
        switch (this.config.group_by) {
            case "date":
                date.setDate(date.getDate() + 1);
                date.setHours(0, 0, 0);
                break;
            case "hour":
                date.setHours(date.getHours() + 1);
                date.setMinutes(0, 0);
                break;
            default:
                break;
        }
        return date;
    }
    
    //TODO FROM HERE
    setNextUpdate() {
        if (this.config.update_interval <= 0) {
            const interval = 1 / this.config.points_per_hour;
            clearInterval(this.interval);
            this.interval = setInterval(() => {
                if (!this.updating) this.updateData();
            }, interval * ONE_HOUR);
        }
    }
    
    getCardSize() {
        return 3;
    }
}

customElements.define(CARD_NAME, ExtremaGraphCard);

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
    type: CARD_NAME,
    name: CARD_NAME_READABLE,
    preview: false,
    description: "TODO", //todo import from package.json
});
