import {stateIcon} from "custom-card-helpers";
import {interpolateRgb} from "d3-interpolate";
import {html, LitElement, svg} from "lit-element";
import localForage from "localforage/src/localforage";
import SparkMD5 from "spark-md5";
import buildConfig from "./buildConfig";
import Graph from "./graph";
import handleClick from "./handleClick";
import style from "./style";
import "./initialize";
import {version} from "../package.json";

import {ICONS, ONE_HOUR, UPDATE_PROPS, V, X, Y} from "./const";
import {compress, decompress, getAvg, getFirstDefinedItem, getMax, getMilli, getMin, getTime, log,} from "./utils";

class ExtremaGraphCard extends LitElement {
    constructor() {
        super();
        this.id = Math.random().toString(36).substr(2, 9);
        this.config = {};
        this.bound = [0, 0];
        this.boundSecondary = [0, 0];
        this.entity = {};
        this.line = {};
        this.bar = {};
        this.abs = [];
        this.fill = {};
        this.points = [];
        this.gradient = {};
        this.tooltip = {};
        this.updateQueue = []; //TODO
        this.updating = false;
        this.stateChanged = false;
        this.initial = true;
        this._md5Config = undefined;
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
            bound: [],
            boundSecondary: [],
            abs: [],
            tooltip: {},
            //TODO updateQueue: [],
            color: String,
        };
    }

    set hass(hass) {
        this._hass = hass;
        const queue = [];
        const entityState = hass?.states[entity.entity];
        if (entityState && this.entity !== entityState) {
            this.entity = entityState;
            queue.push(`${entityState.entity_id}}`);
            this.stateChanged = true;

            this.entity = [...this.entity];
            if (!this.config.update_interval && !this.updating) {
                setTimeout(
                    () => {
                        this.updateQueue = [...queue, ...this.updateQueue];
                        this.updateData();
                    },
                    this.initial ? 0 : 1000,
                );
            } else {
                this.updateQueue = [...queue, ...this.updateQueue];
            }
        }
    }

    setConfig(config) {
        this.config = buildConfig(config, this.config); //TODO ? Second para
        this._md5Config = SparkMD5.hash(JSON.stringify(this.config));

        if (!this.Graph || this.config.entity !== config.entity) {
            if (this._hass) this.hass = this._hass;
            this.Graph = new Graph(
                500,
                this.config.height,
                [this.config.show.fill ? 0 : this.config.line_width, this.config.line_width],
                this.config.hours_to_show,
                this.config.points_per_hour,
                this.config.aggregate_func,
                this.config.group_by,
                getFirstDefinedItem(
                    this.config.entity.smoothing,
                    this.config.smoothing,
                    !this.config.entity.startsWith("binary_sensor."), // turn off for binary sensor by default
                ),
                this.config.logarithmic,
            );
        }
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.config.update_interval) {
            window.requestAnimationFrame(() => {
                this.updateOnInterval();
            });
            this.interval = setInterval(() => this.updateOnInterval(), this.config.update_interval * 1000);
        }
    }

    disconnectedCallback() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        super.disconnectedCallback();
    }

    shouldUpdate(changedProps) {
        if (UPDATE_PROPS.some((prop) => changedProps.has(prop))) {
            this.color = this.computeColor(this.tooltip.value !== undefined ? this.tooltip.value : this.getEntityState(0));
            return true;
        }
    }

    firstUpdated() {
        this.initial = false;
    }

    render({config} = this) {
        if (!config || !this.entity || !this._hass) return html``;
        if (this.entity === undefined) {
            return this.renderWarnings();
        }
        return html`
            <ha-card
                    class="flex"
                    ?group=${config.group}
                    ?fill=${config.show.graph && config.show.fill}
                    ?points=${config.show.points === "hover"}
                    ?labels=${config.show.labels === "hover"}
                    ?labels-secondary=${config.show.labels_secondary === "hover"}
                    ?gradient=${config.color_thresholds.length > 0}
                    ?hover=${config.tap_action.action !== "none"}
                    style="font-size: ${config.font_size}px;"
                    @click=${(e) => this.handlePopup(e, config.tap_action.entity || this.entity)}
            >
                ${this.renderHeader()} ${this.renderStates()} ${this.renderGraph()} ${this.renderInfo()}
            </ha-card>
        `;
    }

    renderWarnings() {
        return html`
            <hui-warning>
                <div>extrema-graph-card</div>
                <div>
                    Entity not available: ${this.config.entity}
                </div>
            </hui-warning>`;
    }

    renderHeader() {
        const {show, align_icon, align_header, font_size_header} = this.config;
        return show.name || (show.icon && align_icon !== "state")
            ? html`
          <div class="header flex" loc=${align_header} style="font-size: ${font_size_header}px;">
            ${this.renderName()} ${align_icon !== "state" ? this.renderIcon() : ""}
          </div>
        `
            : "";
    }

    renderIcon() {
        if (this.config.icon_image !== undefined) {
            return html`
        <div class="icon">
          <img src="${this.config.icon_image}" height="25"/>
        </div>
      `;
        }

        const {icon, icon_adaptive_color} = this.config.show;
        return icon
            ? html`
      <div class="icon" loc=${this.config.align_icon}
        style=${icon_adaptive_color ? `color: ${this.color};` : ""}>
        <ha-icon .icon=${this.computeIcon()}></ha-icon>
      </div>
    `
            : "";
    }

    renderName() {
        if (!this.config.show.name) return;
        const name = this.tooltip.value !== undefined ? this.computeName() : this.config.name || this.computeName(0);
        const color = this.config.show.name_adaptive_color ? `opacity: 1; color: ${this.color};` : "";

        return html`
      <div class="name flex">
        <span class="ellipsis" style=${color}>${name}</span>
      </div>
    `;
    }

    renderStates() {
        //TODO integrate in render state
        if (this.config.show.state)
            return html`
        <div class="states flex" loc=${this.config.align_state}>
          ${this.renderState(0)}
          ${this.config.align_icon === "state" ? this.renderIcon() : ""}
        </div>
      `;
    }

    getObjectAttr(obj, path) {
        return path.split(".").reduce((res, key) => res?.[key], obj);
    }

    getEntityState() {
        const entityConfig = this.config.entity;
        if (this.config.show.state === "last") {
            return this.points[this.points.length - 1][V];
        } else if (entityConfig.attribute) {
            return this.getObjectAttr(this.entity.attributes, entityConfig.attribute);
        } else {
            return this.entity.state;
        }
    }

    renderState() {
        const state = this.getEntityState();
        // use tooltip data for main state element, if tooltip is active
        const {entity: tooltipEntity, value: tooltipValue} = this.tooltip;
        const isTooltip = isPrimary && tooltipEntity !== undefined;
        const value = isTooltip ? tooltipValue : state;
        const entity = isTooltip ? tooltipEntity : id;
        const entityConfig = this.config.entity;
        return html`
        <div
          class="state"
          @click=${(e) => this.handlePopup(e, this.entity)}
          style=${entityConfig.state_adaptive_color ? `color: ${this.computeColor(value, entity)}` : ""}>
          <span class="state__value ellipsis">
            ${this.computeState(value)}
          </span>
          <span class="state__uom ellipsis">
            ${this.computeUom()}
          </span>
          ${this.renderStateTime()}
        </div>
      `;
    }

    renderStateTime() {
        if (this.tooltip.value === undefined) return;
        return html`
      <div class="state__time">
        ${
            this.tooltip.label
                ? html`
          <span class="tooltip--label">${this.tooltip.label}</span>
        `
                : html`
          <span>${this.tooltip.time[0]}</span> -
          <span>${this.tooltip.time[1]}</span>
        `
        }
      </div>
    `;
    }

    renderGraph() {
        const ready =
            (this.entity && (this.Graph._history !== undefined || this.config.entity.show_graph === false)) ||
            this.config.show.loading_indicator === false;
        return this.config.show.graph
            ? html`
                    <div class="graph">
                        ${
                                ready
                                        ? html`
            <div class="graph__container">
              ${this.renderLabels()}
              ${this.renderLabelsSecondary()}
              <div class="graph__container__svg">
                ${this.renderSvg()}
              </div>
            </div> `
                                        : html`<ha-spinner aria-label="Loading" size="small"></ha-spinner>`
                        }
                    </div>`
            : "";
    }

    renderSvgFill(fill) {
        if (!fill) return;
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

    renderSvgLine(line) {
        if (!line) return;
        const path = svg`
      <path
        class='line'
        fill='none'
        stroke-dasharray='none'
		stroke-dashoffset='none'
        stroke=${"white"}
        stroke-width=${this.config.line_width}
        d=${this.line}
      />`;

        return svg`
		<mask id=${`line-${this.id}`}>
			${path}
		</mask>
    `;
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
      />
    `;
    }

    renderSvgPoints(points) {
        if (!points) return;
        const color = this.computeColor(this.entity.state);
        return svg`
      <g class='line--points'
        ?tooltip=${this.tooltip.value !== undefined}  
        fill=${color}
        stroke=${color}
        stroke-width=${this.config.line_width / 2}>
        ${points.map((point) => this.renderSvgPoint(point))}
      </g>`;
        //TODO can be removed? "?inactive=${this.tooltip.value !== undefined && this.tooltip.entity !== i}"
    }

    renderSvgGradient(gradients) {
        if (!gradients) return;
        const items = gradients.map((gradient, i) => {
            if (!gradient) return "";
            return svg`
        <linearGradient id=${`grad-${this.id}-${i}`} gradientTransform="rotate(90)">
          ${gradient.map(
                (stop) => svg`
            <stop stop-color=${stop.color} offset=${`${stop.offset}%`} />
          `,
            )}
        </linearGradient>`;
        });
        return svg`${items}`;
    }

    renderSvgLineRect(line) {
        if (!line) return;
        const fill = this.gradient ? `url(#grad-${this.id})` : this.computeColor(this.entity.state);
        return svg`
      <rect class='line--rect'
        id=${`rect-${this.id}`}
        fill=${fill} height="100%" width="100%"
        mask=${`url(#line-${this.id})`}
      />`;
    }

    //TODO can be removed? "?inactive=${this.tooltip.value !== undefined && this.tooltip.entity !== i}"

    renderSvgFillRect(fill) {
        if (!fill) return;
        const svgFill = this.gradient ? `url(#grad-${this.id}-${i})` : this.computeColor(this.entity.state);
        return svg`
      <rect class='fill--rect'
        id=${`fill-rect-${this.id}`}
        fill=${svgFill} height="100%" width="100%"
        mask=${`url(#fill-${this.id})`}
      />`;
    }

    //TODO can be removed? "?inactive=${this.tooltip.value !== undefined && this.tooltip.entity !== i}"

    renderSvgBars(bars) {
        if (!bars) return;
        const items = bars.map((bar, i) => {
            const color = this.computeColor(bar.value);
            return svg`
        <rect class='bar' x=${bar.x} y=${bar.y}
          height=${bar.height} width=${bar.width} fill=${color}
          @mouseover=${() => this.setTooltip(i, bar.value)}
          @mouseout=${() => (this.tooltip = {})}>
        </rect>`;
        });
        return svg`<g class='bars'>${items}</g>`;
    }

    renderSvg() {
        const {height} = this.config;
        return svg`
      <svg preserveAspectRatio='none' width='100%' height='${height !== 0 ? height : 0}px' viewBox='0 0 500 ${height}'
        @click=${(e) => e.stopPropagation()}>
        <g>
          <defs>
            ${this.renderSvgGradient(this.gradient)}
          </defs>
          ${this.renderSvgFill(this.fill, i)}
          ${this.renderSvgFillRect(this.fill, i)}
          ${this.renderSvgLine(this.line, i)}
          ${this.renderSvgLineRect(this.line, i)}
          ${this.renderSvgBars(this.bar, i)}
        </g>
        ${this.renderSvgPoints(this.points, i)}
      </svg>`;
    }

    setTooltip(index, value, label = null) {
        const {group_by, points_per_hour, hours_to_show, format} = this.config;

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
        const end = getTime(now, format, this._hass.language);
        now.setMilliseconds(now.getMilliseconds() + oneMinute - interval);
        const start = getTime(now, format, this._hass.language);

        this.tooltip = {
            value,
            count,
            time: [start, end],
            index,
            label,
        };
    }

    renderLabels() {
        if (!this.config.show.labels || this.primaryYaxisSeries.length === 0) return;
        return html`
      <div class="graph__labels --primary flex">
        <span class="label--max">${this.computeState(this.bound[1])}</span>
        <span class="label--min">${this.computeState(this.bound[0])}</span>
      </div>
    `;
    }

    //TODO NEEDED?
    renderLabelsSecondary() {
        if (!this.config.show.labels_secondary || this.secondaryYaxisSeries.length === 0) return;
        return html`
      <div class="graph__labels --secondary flex">
        <span class="label--max">${this.computeState(this.boundSecondary[1])}</span>
        <span class="label--min">${this.computeState(this.boundSecondary[0])}</span>
      </div>
    `;
    }

    renderInfo() {
        return this.abs.length > 0
            ? html`
      <div class="info flex">
        ${this.abs.map(
                (entry) => html`
          <div class="info__item">
            <span class="info__item__type">${entry.type}</span>
            <span class="info__item__value">
              ${this.computeState(entry.state)}
            </span>
            <span class="info__item__time">
              ${entry.type !== "avg" ? getTime(new Date(entry.last_changed), this.config.format, this._hass.language) : ""}
            </span>
          </div>
        `,
            )}
      </div>
    `
            : html``;
    }

    handlePopup(e, entity) {
        e.stopPropagation();
        handleClick(this, this._hass, this.config, this.config.tap_action, entity.entity_id || entity);
    }

    /* TODO Remove?
    get visibleEntities() {
        return this.config.entities.filter((entity) => entity.show_graph !== false);
    }

    get primaryYaxisEntities() {
        return this.visibleEntities.filter((entity) => entity.y_axis === undefined || entity.y_axis === "primary");
    }

    get secondaryYaxisEntities() {
        return this.visibleEntities.filter((entity) => entity.y_axis === "secondary");
    }

    get primaryYaxisSeries() {
        return this.primaryYaxisEntities.map((entity) => this.Graph[entity.index]);
    }

    get secondaryYaxisSeries() {
        return this.secondaryYaxisEntities.map((entity) => this.Graph[entity.index]);
    }*/

    computeColor(inState) {
        const {color_thresholds, line_color} = this.config;
        const state = Number(inState) || 0;

        let intColor;
        if (color_thresholds.length > 0) {
            const {color} = color_thresholds.find((ele) => ele.value < state) || color_thresholds.slice(-1)[0];
            intColor = color;
            const index = color_thresholds.findIndex((ele) => ele.value < state);
            const c1 = color_thresholds[index];
            const c2 = color_thresholds[index - 1];
            if (c2) {
                const factor = (c2.value - state) / (c2.value - c1.value);
                intColor = interpolateRgb(c2.color, c1.color)(factor);
            } else {
                intColor = index ? color_thresholds[color_thresholds.length - 1].color : color_thresholds[0].color;
            }
        }

        return this.config.entity.color || intColor || line_color;
    }

    computeName() {
        //TODO function needed?
        return this.config.entity.name || this.entity.attributes.friendly_name || this.entity.entity_id;
    }

    computeIcon() {
        return this.config.icon || this.entity.attributes.icon || stateIcon(this.entity) || ICONS.temperature;
    }

    computeUom() {
        return this.config.entity.unit !== undefined
            ? this.config.entity.unit
            : this.config.unit !== undefined
                ? this.config.unit
                : !this.config.entity.attribute
                    ? this.entity.attributes.unit_of_measurement || ""
                    : "";
    }

    computeState(inState) {
        if (this.config.state_map.length > 0) {
            const stateMap = Number.isInteger(inState)
                ? this.config.state_map[inState]
                : this.config.state_map.find((state) => state.value === inState);

            if (stateMap) {
                return stateMap.label;
            } else {
                log(`value [${inState}] not found in state_map`);
            }
        }

        let state;
        if (typeof inState === "string") {
            state = parseFloat(inState.replace(/,/g, "."));
        } else {
            state = Number(inState);
        }
        const dec = this.config.decimals;
        const value_factor = 10 ** this.config.value_factor;

        if (dec === undefined || Number.isNaN(dec) || Number.isNaN(state)) {
            return this.numberFormat(Math.round(state * value_factor * 100) / 100, this._hass.language);
        }

        const x = 10 ** dec;
        return this.numberFormat((Math.round(state * value_factor * x) / x).toFixed(dec), this._hass.language, dec);
    }

    numberFormat(num, language, dec) {
        if (!Number.isNaN(Number(num)) && Intl)
            return new Intl.NumberFormat(language, {
                minimumFractionDigits: dec,
            }).format(Number(num));
        return num.toString();
    }

    updateOnInterval() {
        if (this.stateChanged && !this.updating) {
            this.stateChanged = false;
            this.updateData();
        }
    }

    async updateData({config} = this) {
        this.updating = true;

        const end = this.getEndDate();
        const start = new Date(end);
        start.setMilliseconds(start.getMilliseconds() - getMilli(config.hours_to_show));

        try {
            const promise = [this.updateEntity(start, end)];
            await Promise.all(promise);
        } catch (err) {
            log(err);
        }

        if (this.entity) this.Graph.update();

        this.updateBounds();

        if (config.show.graph) {
            let graphPos = 0;

            if (!this.entity || this.Graph.coords.length === 0) return;
            const bound = config.entity.y_axis === "secondary" ? this.boundSecondary : this.bound;
            [this.Graph.min, this.Graph.max] = [bound[0], bound[1]];
            if (config.show.graph === "bar") {
                const numVisible = 1;
                this.bar = this.Graph.getBars(graphPos, numVisible, config.bar_spacing);
                graphPos += 1;
            } else {
                const line = this.Graph.getPath();
                if (config.entity.show_line !== false) this.line = line;
                if (config.show.fill && config.entity.show_fill !== false) this.fill = this.Graph.getFill(line);
                if (config.show.points && config.entity.show_points !== false) {
                    this.points = this.Graph.getPoints();
                }
                if (config.color_thresholds.length > 0 && !config.entity.color)
                    this.gradient = this.Graph.computeGradient(config.color_thresholds, this.config.logarithmic);
            }
            this.line = [...this.line];
        }
        this.updating = false;
        this.setNextUpdate();
    }

    getBoundary(type, series, configVal, fallback) {
        if (!(type in Math)) {
            throw new Error(`The type "${type}" is not present on the Math object`);
        }

        if (configVal === undefined) {
            // dynamic boundary depending on values
            return Math[type](...series.map((ele) => ele[type])) || fallback;
        }
        if (configVal[0] !== "~") {
            // fixed boundary
            return configVal;
        }
        // soft boundary (respecting out of range values)
        return Math[type](Number(configVal.substr(1)), ...series.map((ele) => ele[type]));
    }

    getBoundaries(series, min, max, fallback, minRange) {
        let boundary = [
            this.getBoundary("min", series, min, fallback[0]),
            this.getBoundary("max", series, max, fallback[1]),
        ];

        if (minRange) {
            const currentRange = Math.abs(boundary[0] - boundary[1]);
            const diff = parseFloat(minRange) - currentRange;

            // Doesn't matter if minBoundRange is NaN because this will be false if so
            if (diff > 0) {
                const weights = [
                    (min !== undefined && min[0] !== "~") || max === undefined ? 0 : 1,
                    (max !== undefined && max[0] !== "~") || min === undefined ? 0 : 1,
                ];
                const sum = weights[0] + weights[1];
                if (sum > 0) {
                    boundary = [boundary[0] - (diff * weights[0]) / sum, boundary[1] + (diff * weights[1]) / sum];
                } else {
                    boundary = [boundary[0] - diff / 2, boundary[1] + diff / 2];
                }
            }
        }

        return boundary;
    }

    updateBounds({config} = this) {
        this.bound = this.getBoundaries(
            this.primaryYaxisSeries,
            config.lower_bound,
            config.upper_bound,
            this.bound,
            config.min_bound_range,
        );

        this.boundSecondary = this.getBoundaries(
            this.secondaryYaxisSeries,
            config.lower_bound_secondary,
            config.upper_bound_secondary,
            this.boundSecondary,
            config.min_bound_range_secondary,
        );
    }

    async getCache(key, compressed) {
        const data = await localForage.getItem(`${key}_${this._md5Config}${compressed ? "" : "_raw"}`);
        return data ? (compressed ? decompress(data) : data) : null;
    }

    async setCache(key, data, compressed) {
        return compressed
            ? localForage.setItem(`${key}_${this._md5Config}`, compress(data))
            : localForage.setItem(`${key}_${this._md5Config}_raw`, data);
    }

    async updateEntity(initStart, end) {
        if (
            !this.entity ||
            !this.updateQueue.includes(`${this.entity.entity_id}`) ||
            this.config.entity.show_graph === false
        )
            return;
        this.updateQueue = this.updateQueue.filter((entry) => entry !== `${this.entity.entity_id}`);

        let stateHistory = [];
        let start = initStart;
        let skipInitialState = false;

        const history = this.config.cache
            ? await this.getCache(`${this.entity.entity_id}`, this.config.cache_compress)
            : undefined;
        if (history && history.hours_to_show === this.config.hours_to_show) {
            stateHistory = history.data;

            let currDataIndex = stateHistory.findIndex((item) => new Date(item.last_changed) > initStart);
            if (currDataIndex !== -1) {
                if (currDataIndex > 0) {
                    // include previous item
                    currDataIndex -= 1;
                    // but change it's last changed time
                    stateHistory[currDataIndex].last_changed = initStart;
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
            this.config.entity.attribute ? false : skipInitialState,
            !!this.config.entity.attribute,
        );
        if (newStateHistory[0] && newStateHistory[0].length > 0) {
            /**
             * hack because HA doesn't return anything if skipInitialState is false
             * when retrieving for attributes so we retrieve it and we remove it.*
             */
            if (this.config.entity.attribute && skipInitialState) {
                newStateHistory[0].shift();
            }
            // check if we should convert states to numeric values
            if (this.config.state_map.length > 0 || this.config.entity.attribute) {
                newStateHistory[0].forEach((item) => {
                    if (this.config.entity.attribute) {
                        item.state = this.getObjectAttr(item.attributes, this.config.entity.attribute);
                        delete item.attributes;
                    }
                    if (this.config.state_map.length > 0) this._convertState(item);
                });
            }

            newStateHistory = newStateHistory[0].filter((item) => !Number.isNaN(parseFloat(item.state)));
            newStateHistory = newStateHistory.map((item) => ({
                last_changed: this.config.entity.attribute ? item.last_updated : item.last_changed,
                state: item.state,
            }));
            stateHistory = [...stateHistory, ...newStateHistory];

            if (this.config.cache) {
                this.setCache(
                    `${this.entity.entity_id}`,
                    {
                        hours_to_show: this.config.hours_to_show,
                        last_fetched: new Date(),
                        data: stateHistory,
                        version,
                    },
                    this.config.cache_compress,
                ).catch((err) => {
                    log(err);
                    localForage.clear();
                });
            }
        }

        if (stateHistory.length === 0) return;

        if (this.entity) {
            this.updateExtrema(stateHistory);
        }

        if (this.config.entity.fixed_value === true) {
            const last = stateHistory[stateHistory.length - 1];
            this.Graph.history = [last, last];
        } else {
            this.Graph.history = stateHistory;
        }
    }

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
        const {extrema, average} = this.config.show;
        this.abs = [
            ...(extrema
                ? [
                    {
                        type: "min",
                        ...getMin(history, "state"),
                    },
                ]
                : []),
            ...(average
                ? [
                    {
                        type: "avg",
                        state: getAvg(history, "state"),
                    },
                ]
                : []),
            ...(extrema
                ? [
                    {
                        type: "max",
                        ...getMax(history, "state"),
                    },
                ]
                : []),
        ];
    }

    _convertState(res) {
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

    setNextUpdate() {
        if (!this.config.update_interval) {
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

customElements.define("extrema-graph-card", ExtremaGraphCard);

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
    type: "extrema-graph-card",
    name: "Extrema Graph Card",
    preview: false,
    description: "TODO",
});
