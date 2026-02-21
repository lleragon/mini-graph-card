const URL_DOCS =
	"https://github.com/lleragon/mini-graph-card/blob/master/README.md";
const FONT_SIZE = 14;
const FONT_SIZE_HEADER = 14;
const MAX_BARS = 96;
const ICONS = {
	humidity: "hass:water-percent",
	illuminance: "hass:brightness-5",
	temperature: "hass:thermometer",
	battery: "hass:battery",
	pressure: "hass:gauge",
	power: "hass:flash",
	signal_strength: "hass:wifi",
	motion: "hass:walk",
	door: "hass:door-closed",
	window: "hass:window-closed",
	presence: "hass:account",
	light: "hass:lightbulb",
};
const DEFAULT_COLORS = [
	"var(--accent-color)",
	"#3498db",
	"#e74c3c",
	"#9b59b6",
	"#f1c40f",
	"#2ecc71",
	"#1abc9c",
	"#34495e",
	"#e67e22",
	"#7f8c8d",
	"#27ae60",
	"#2980b9",
	"#8e44ad",
];
const UPDATE_PROPS = [
	"entity",
	"line",
	"length",
	"fill",
	"points",
	"tooltip",
	"abs",
	"config",
];

const DEFAULT_CONF = {
	font_size: FONT_SIZE,
	font_size_header: FONT_SIZE_HEADER,
	height: 100,
	hours_to_show: 24,
	points_per_hour: 0.5,
	aggregate_func: "avg",
	group_by: "interval",
	line_color: [...DEFAULT_COLORS],
	color_thresholds: [],
	color_thresholds_transition: "smooth",
	line_width: 5,
	bar_spacing: 4,
	smoothing: true,
	state_map: [],
	cache: true,
	cache_compress: false,
	value_factor: 0,
	tap_action: {
		action: "more-info",
	},
};

const DEFAULT_CONF_SHOW = {
	name: true,
	icon: true,
	state: true,
	graph: "line",
	labels: "hover",
	labels_secondary: "hover",
	extrema: false,
	legend: true,
	fill: true,
	points: "hover",
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
	ICONS,
	DEFAULT_COLORS,
	UPDATE_PROPS,
	DEFAULT_CONF,
	DEFAULT_CONF_SHOW,
	X,
	Y,
	V,
	ONE_HOUR,
};
