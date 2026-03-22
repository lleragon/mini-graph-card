import {name, version} from "../package.json";

const CARD_NAME = name
const CARD_NAME_READABLE = name.replace('-', " ").replace(/(^\w|\s\w)/g, m => m.toUpperCase());
const CARD_VERSION = version
const FONT_SIZE = 14;
const MAX_BARS = 96;


const DEFAULT_CONF = {
    entity: undefined,
    entity_attribute: undefined,
    name: undefined,
    unit: undefined,
    icon: undefined,
    decimals: undefined,
    
    graph_type: "line",                 //todo further description in readme
    line_width: 5,
    bar_spacing: 4,
    smoothing: true,
    logarithmic: false,                  //TODO TEST
    color: "var(--accent-color)",
    color_smooth_transition: true,
    
    hours_to_show: 24,
    points_per_hour: 1,
    aggregate_func: "avg",
    group_by: "interval",
    update_interval: 0,             //TODO TEST
    
    font_size: 100,
    font_size_header: 14,
    height: 100,
    align_icon: "right",
    align_state: "left",
    align_header: undefined,        //TODO TEST
    group: false,
    
    lower_bound: undefined,
    upper_bound: undefined,
    min_bound_range: undefined,
    value_factor: 1,
    state_map: [],
    
    cache: true,
    cache_compress: false,             //TODO CAUSES HAVE CPU LOAD AT FREQUENT STATE UPDATES
    tap_action: {
        action: "more-info",
    }
};

const DEFAULT_CONF_SHOW = {
    name: true,
    icon: true,
    state: true,                     //TODO WORKS BUT THROWS ERRORS
    line: true,
    fill: true,
    points: "hover",
    extrema: false,
    average: false,
    labels: "hover",
    name_adaptive_color: false,
    icon_adaptive_color: false,
    state_adaptive_color: false,
};

const AGGREGATE_FUNCTIONS = [
    'avg',
    'median',
    'max',
    'min',
    'first',
    'last',
    'sum',
    'delta',
    'diff',
]

const X = 0;
const Y = 1;
const V = 2;
const ONE_HOUR = 1000 * 3600;

export {
    CARD_NAME,
    CARD_NAME_READABLE,
    CARD_VERSION,
    FONT_SIZE,
    MAX_BARS,
    DEFAULT_CONF,
    DEFAULT_CONF_SHOW,
    AGGREGATE_FUNCTIONS,
    X,
    Y,
    V,
    ONE_HOUR,
};
