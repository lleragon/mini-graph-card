const URL_DOCS = "https://github.com/lleragon/mini-graph-card/blob/master/README.md";
const FONT_SIZE = 14;
const FONT_SIZE_HEADER = 14;
const MAX_BARS = 96;

const UPDATE_PROPS = [
    "entity",
    "line",
    "length",
    "fill",
    "points",
    "tooltip",
    "abs",
    "config"
];
//TODO SORT CONF
const DEFAULT_CONF = {
    entity: undefined,
    entity_attribute: undefined,
    name: undefined,
    icon: undefined,
    unit: undefined,
    font_size: 100,
    font_size_header: FONT_SIZE_HEADER,
    height: 100,
    hours_to_show: 24,
    points_per_hour: 1,
    aggregate_func: "avg",
    group_by: "interval",
    color: "var(--accent-color)",
    color_thresholds_transition: "smooth",
    line_width: 5,
    bar_spacing: 4,
    smoothing: true,
    state_map: [],
    cache: true,
    cache_compress: false,
    value_factor: 1,
    logarithmic: false,
    update_interval: 0,
    align_icon: "right",
    align_state: "left",
    align_header: undefined,
    group: false,
    decimals: undefined,
    lower_bound: undefined,
    upper_bound: undefined,
    min_bound_range: undefined,
    tap_action: {
        action: "more-info",
    },
    graph_type: "line", //line || bar || none
};

const DEFAULT_CONF_SHOW = {
    name: true,
    icon: true,
    state: true,
    labels: "hover",
    extrema: false,
    average: false,
    line: true,
    fill: true,
    points: "hover", //true ||false
    name_adaptive_color: false,
    icon_adaptive_color: false,
    state_adaptive_color: false,
    loading_indicator: true
};

const X = 0;
const Y = 1;
const V = 2;
const ONE_HOUR = 1000 * 3600;

export {
    URL_DOCS,
    FONT_SIZE,
    FONT_SIZE_HEADER,
    MAX_BARS,
    UPDATE_PROPS,
    DEFAULT_CONF,
    DEFAULT_CONF_SHOW,
    X,
    Y,
    V,
    ONE_HOUR,
};
