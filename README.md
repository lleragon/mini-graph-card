# Lovelace Mini Graph Card

# todo change name

A minimalistic and customizable graph card for [Home Assistant](https://github.com/home-assistant/home-assistant)
Lovelace UI.

The card works with entities from within the **sensor** & **binary_sensor** domain and displays the sensors current
state as well as a line graph representation of the history.

![Preview](https://user-images.githubusercontent.com/457678/52977264-edf34980-33cc-11e9-903b-cee43b307ed8.png)

## Install

### Manual install

1. Download and copy `mini-graph-card-bundle.js` from
   the [latest release](https://github.com/kalkih/mini-graph-card/releases/latest) into your `config/www` directory.
2. Make sure, advanced mode is enabled in your user profile (click on your user name to get there)
3. Navigate to Configuration -> Lovelace Dashboards -> Resources Tab. Hit orange (+) icon
4. Enter URL `/local/mini-graph-card-bundle.js` and select type "JavaScript Module".
5. Restart Home Assistant.

*You may need to empty the browsers cache (CTRL+F5) if you have problems the updated card.*

## Using the card

We recommend looking at the [Example usage section](#example-usage) to understand the basics to configure this card.
(also) pay attention to the **required** options mentioned below.

### Options

#### Card options

| Name                    |                  Type                   |        Default        | Description                                                                                                                                            |
|-------------------------|:---------------------------------------:|:---------------------:|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| type ***(required)***   |                 string                  |                       | `custom:mini-graph-card`                                                                                                                               |
| entity ***(required)*** |                 string                  |                       | Entity id of the sensor.                                                                                                                               |
| attribute               |                 string                  |                       | Retrieves an attribute or [sub-attribute (attr1.attr2...)](#accessing-attributes-in-complex-structures) instead of the state                           |
| name                    |                 string                  |                       | Set a custom name, defaults to entity's friendly_name.                                                                                                 |
| unit                    |                 string                  |                       | Set a custom unit of measurement (`''` value for an empty unit).                                                                                       |
| icon                    |                 string                  |                       | Set a custom icon from any of the available mdi icons.                                                                                                 |
| decimals                |                 integer                 |                       | Specify the exact number of decimals to show.                                                                                                          |
|                         |                                         |                       |                                                                                                                                                        |
| graph_type              |                 string                  |        `line`         | Display style for the graph, `line`, `bar` or `none`. If set to `bar` a maximum of `96` bars will be displayed.                                        |
| line_width              |                 number                  |          `5`          | Set the thickness of the graph line.                                                                                                                   |
| bar_spacing             |                 number                  |          `4`          | Set the spacing between bars in bar graph.                                                                                                             |
| smoothing               |                 boolean                 |        `true`         | Whether to make graph line smooth.                                                                                                                     |
| logarithmic             |                 boolean                 |        `false`        | Use a Logarithmic scale for the graph                                                                                                                  |
| color                   |      string *or* line color object      | `var(--accent-color)` | Set a custom color for the graph. Either a fixed color or a dynamic color depending on the state                                                       |
| color_smooth_transition |                 boolean                 |        `true`         | Smooth or hard transition between Dynaimc color thresholds.                                                                                            |
|                         |                                         |                       |                                                                                                                                                        |
| hours_to_show           |                 integer                 |         `24`          | Specify how many hours of history the graph should present.                                                                                            |
| points_per_hour         |                 number                  |          `1`          | Specify amount of data points the graph should display for each hour, *(basically the detail/accuracy/smoothing of the graph)*.                        |
| aggregate_func          |                 string                  |         `avg`         | Specify [aggregate function](#aggregate-functions) used to calculate point/bar in the graph.                                                           |
| group_by                |                 string                  |      `interval`       | Specify type of grouping of data, dynamic `interval`, `date` or `hour`.                                                                                |
| update_interval         |                 number                  |          `0`          | Specify a custom update interval of the history data (in seconds), Set to zero to update automatically on every state change.                          |
|                         |                                         |                       |                                                                                                                                                        |
| font_size               |                 number                  |         `100`         | Adjust the font size of the state, as percentage of the original size.                                                                                 |
| font_size_header        |                 number                  |         `14`          | Adjust the font size of the header, size in pixels.                                                                                                    |
| height                  |                 number                  |         `100`         | Set a custom height of the graph.                                                                                                                      |
| align_header            |                 string                  |                       | Set the alignment of the header, `left`, `right`, `center` or `default`.                                                                               |
| align_icon              |                 string                  |        `right`        | Set the alignment of the icon, `left`, `right` or `state`.                                                                                             |
| align_state             |                 string                  |        `left`         | Set the alignment of the current state, `left`, `right` or `center`.                                                                                   |
| group                   |                 boolean                 |        `false`        | Disable paddings and box-shadow, useful when nesting the card.                                                                                         |
|                         |                                         |                       |                                                                                                                                                        |
| lower_bound             |           number *or* string            |                       | Set a fixed lower bound for the graph axis. String value starting with ~ (e.g. `~50`) specifies soft bound.                                            |
| upper_bound             |           number *or* string            |                       | Set a fixed upper bound for the graph axis. String value starting with ~ (e.g. `~50`) specifies soft bound.                                            |
| min_bound_range         |                 number                  |                       | Applied after everything, makes sure there's a minimum range that the axis will have. Useful for not making small changes look large because of scale. |
| value_factor            |                 number                  |           1           | Up- or Downscale the value (e.g. convert Watts to kilo Watts).                                                                                         |
| state_map               |  [state map object](#state-map-object)  |                       | List of entity states to convert.                                                                                                                      |
|                         |                                         |                       |                                                                                                                                                        |
| cache                   |                 boolean                 |        `true`         | Enable/disable local caching of history data.                                                                                                          |
| cache_compress          |                 boolean                 |        `false`        | Compress local cache date (only usefull if localStorage quota is exeeded)                                                                              |  
| tap_action              | [action object](#action-object-options) |                       | Action on click/tap.                                                                                                                                   |
|                         |                                         |                       |                                                                                                                                                        |
| show                    |                  list                   |                       | List of UI elements to display/hide, for available items see [available show options](#available-show-options).                                        |

#### Available show options

All properties are optional.

| Name                 | Default |          Options           | Description                                                           |
|----------------------|:-------:|:--------------------------:|-----------------------------------------------------------------------|
| name                 | `true`  |      `true` / `false`      | Display name.                                                         |
| icon                 | `true`  |      `true` / `false`      | Display icon.                                                         |
| state                | `true`  | `true` / `false` / `last`  | Display current state. `last` will show the last graph point's value. |
| line                 | `true`  |      `true` / `false`      | Display the line graph line.                                          |
| fill                 | `true`  | `true` / `false` / `fade`  | Display the line graph fill.                                          |
| points               | `hover` | `true` / `false` / `hover` | Display graph data points.                                            |
| extrema              | `false` |      `true` / `false`      | Display max/min information.                                          |
| average              | `false` |      `true` / `false`      | Display average information.                                          |
| labels               | `hover` | `true` / `false` / `hover` | Display Y-axis labels.                                                |
| name_adaptive_color  | `false` |      `true` / `false`      | Make the name color adapt with the primary entity color.              |
| icon_adaptive_color  | `false` |      `true` / `false`      | Make the icon color adapt with the primary entity color.              |
| state_adaptive_color | `false` |      `true` / `false`      | Make the color of the state adapt to the entity color.                |
| loading_indicator    | `true`  |      `true` / `false`      | Show loading indicator while attempting to retrieve a history.        |

#### Line color object

See [dynamic line color](#dynamic-line-color) for example usage.

| Name                                                                                                   |  Type  | Default | Description                                   |
|--------------------------------------------------------------------------------------------------------|:------:|:-------:|-----------------------------------------------|
| value ***(required [except in interpolation (see below)](#line-color-interpolation-of-stop-values))*** | number |         | The threshold for the color stop.             |
| color ***(required)***                                                                                 | string |         | Color in 6 digit hex format (e.g. `#008080`). |

##### Line color interpolation of stop values

As long as the first and last threshold stops have `value` properties, intermediate stops can exclude `value`; they will
be interpolated linearly. For example, given stops like:

```yaml
color_thresholds:
  - value: 0
    color: "#ff0000"
  - color: "#ffff00"
  - color: "#00ff00"
  - value: 4
    color: "#0000ff"
```

The values will be interpolated as:

```yaml
color_thresholds:
  - value: 0
    color: "#ff0000"
  - value: 1.333333
    color: "#ffff00"
  - value: 2.666667
    color: "#00ff00"
  - value: 4
    color: "#0000ff"
```

The example above will result in the following colors of the graph: if value is

* between `0` (including this value) and  `1.33333`, the color is `#ff0000`,
* between `1.33333` (including this value) and `2.666667`, the color is `#ffff00`,
* between `2.666667` (including this value) and `4`, the color is `#00ff00`,
* equal to or more than `4`, the color is `#0000ff`.

As a shorthand, you can just use a color string for the stops that you want interpolated:

```yaml
  - value: 0
    color: "#ff0000"
  - "#ffff00"
  - "#00ff00"
  - value: 4
    color: "#0000ff"
```

#### Action object options

| Name            |  Type  |   Default   |                           Options                           | Description                                                                              |
|-----------------|:------:|:-----------:|:-----------------------------------------------------------:|------------------------------------------------------------------------------------------|
| action          | string | `more-info` | `more-info` / `navigate` / `call-service`  / `url` / `none` | Action to perform.                                                                       |
| entity          | string |             |                        Any entity id                        | Override default entity of `more-info`, when  `action` is defined as `more-info`.        |
| service         | string |             |                         Any service                         | Service to call (e.g. `media_player.toggle`) when `action` is defined as `call-service`. |
| service_data    | object |             |                      Any service data                       | Service data to include with the service call (e.g. `entity_id: media_player.office`).   |
| navigation_path | string |             |                          Any path                           | Path to navigate to (e.g. `/lovelace/0/`) when `action` is defined as `navigate`.        |
| url             | string |             |                           Any URL                           | URL to open when `action` is defined as `url`.                                           |

#### State map object

A list of entity states to convert.
Order matters as position becomes a value on the graph.

| Name  |  Type  | Default | Description              |
|-------|:------:|:-------:|--------------------------|
| value | string |         | Value to convert.        |
| label | string |         | String to show as label. |

### Aggregate functions

Recorded values are grouped in time buckets which are determined by `group_by`, `points_per_hour` configuration.
These buckets are converted later to single point/bar on the graph. Aggregate function defines the methods of that
conversion.

| Name     | Description                                        |
|----------|----------------------------------------------------|
| `avg`    | Average                                            |
| `median` | Median                                             |
| `min`    | Minimum - lowest value                             |
| `max`    | Maximum - largest value                            |
| `first`  |                                                    |
| `last`   |                                                    |
| `sum`    |                                                    |
| `delta`  | Calculates difference between max and min value    |
| `diff`   | Calculates difference between first and last value |

### Theme variables

The following theme variables can be set in your HA theme to customize the appearance of the card.

| Name                     | Default | Description                                       |
|--------------------------|:-------:|---------------------------------------------------|
| mcg-title-letter-spacing |         | Letter spacing of the card title (`name` option). |
| mcg-title-font-weight    |   500   | Font weight of the card title.                    |

### Example usage

#### Single entity card

![Single entity card](https://user-images.githubusercontent.com/457678/52009150-884d2500-24d2-11e9-9f2b-2981210d3897.png)

```yaml
type: custom:mini-graph-card
entities:
  - sensor.illumination
```

#### Alternative style

![Alternative style](https://user-images.githubusercontent.com/457678/52009161-8daa6f80-24d2-11e9-8678-47658a181615.png)

```yaml
type: custom:mini-graph-card
entities:
  - sensor.illumination
align_icon: left
align_state: center
show:
  fill: false
```

#### Bar chart card

![Bar chart card](https://user-images.githubusercontent.com/457678/52970286-985e7300-33b3-11e9-89bc-1278c4e2ecf2.png)

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.energy_consumption
name: ENERGY CONSUMPTION
show:
  graph: bar
```

#### Show data from the past week

![Show data from the past week](https://user-images.githubusercontent.com/457678/52009167-913df680-24d2-11e9-8732-52fc65e3f0d8.png)

Use the `hours_to_show` option to specify how many hours of history the graph should represent.
Use the `points_per_hour` option to specify the accuracy/detail of the graph.

```yaml
type: custom:mini-graph-card
entities:
  - sensor.living_room_temp
name: LIVING ROOM
hours_to_show: 168
points_per_hour: 0.25
```

#### Graph only card

Use the `show` option to show/hide UI elements.

```yaml
type: custom:mini-graph-card
entities:
  - sensor.humidity
show:
  icon: false
  name: false
  state: false
```

#### Horizontally stacked cards

You can stack cards horizontally by using one or more `horizontal-stack(s)`.

![Horizontally stacked cards](https://user-images.githubusercontent.com/457678/52009171-926f2380-24d2-11e9-9dd4-28f010608858.png)

```yaml
type: horizontal-stack
cards:
  - type: custom:mini-graph-card
    entities:
      - sensor.humidity
    line_color: blue
    line_width: 8
    font_size: 75
  - type: custom:mini-graph-card
    entities:
      - sensor.illumination
    line_color: '#e74c3c'
    line_width: 8
    font_size: 75
  - type: custom:mini-graph-card
    entities:
      - sensor.temperature
    line_color: var(--accent-color)
    line_width: 8
    font_size: 75
```

#### Dynamic line color

Have the graph change line color dynamically.

![Dynamic line color](https://user-images.githubusercontent.com/457678/52573150-cbd05900-2e19-11e9-9e01-740753169093.png)

```yaml
type: custom:mini-graph-card
entities:
  - sensor.sensor_temperature
show:
  labels: true
color_thresholds:
  - value: 20
    color: "#f39c12"
  - value: 21
    color: "#d35400"
  - value: 21.5
    color: "#c0392b"
```

#### Alternate y-axis

Have one or more series plot on a separate y-axis, which appears on the right side of the graph. This example also
shows turning off the line, points and legend.

![Alternate y-axis](https://user-images.githubusercontent.com/373079/60764115-63cf2780-a0c6-11e9-8b9a-97fc47161180.png)

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.verandah
    name: Verandah
  - entity: sensor.lounge
    name: Lounge
  - entity: sensor.kitchen
    name: Kitchen
  - color: gray
    entity: input_number.nighttime
    name: Night
    show_line: false
    show_points: false
    show_legend: false
    y_axis: secondary
show:
  labels: true
  labels_secondary: true
```

#### Grouping by date

![mini_energy_daily](https://user-images.githubusercontent.com/8268674/66688605-3ffc1e80-ec7f-11e9-872e-935870a542f3.png)

You can group values by date, this way you can visualize for example daily energy consumption.

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.energy_daily
name: Energy consumption
hours_to_show: 168
aggregate_func: max
group_by: date
show:
  graph: bar
```

#### Data aggregation functions

You can decide how values are aggregated for points on graph. Example how to display min, max, avg temperature per day
from last week.

![mini_temperature_aggregate_daily](https://user-images.githubusercontent.com/8268674/66688610-44c0d280-ec7f-11e9-86c2-a728da239dab.png)

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.outside_temp
    aggregate_func: max
    name: Max
    color: "#e74c3c"
  - entity: sensor.outside_temp
    aggregate_func: min
    name: Min
  - entity: sensor.outside_temp
    aggregate_func: avg
    name: Avg
    color: green
name: Temp outside daily (last week)
hours_to_show: 168
group_by: date
```

#### Non-numeric sensor states

![mini_binary_sensor](https://user-images.githubusercontent.com/8268674/66825779-e1ff5d80-ef42-11e9-89eb-673d2ada8d34.png)

You can render non-numeric states by providing state_map config. For example this way you can show data coming from
binary sensors.

```yaml
type: custom:mini-graph-card
entities:
  - entity: binary_sensor.living_room_motion
    name: Living room
  - entity: binary_sensor.corridor_motion
    name: Corridor
  - entity: binary_sensor.master_bed_motion
    name: Master bed.
    color: green
  - entity: binary_sensor.bedroom_motion
    name: Bedroom
name: Motion last hour
hours_to_show: 1
points_per_hour: 60
update_interval: 30
aggregate_func: max
line_width: 2
smoothing: false
state_map:
  - value: "off"
    label: "Clear"
  - value: "on"
    label: "Detected"
```

#### Showing additional info on the card

![изображение](https://user-images.githubusercontent.com/71872483/170584118-ef826b60-dce3-42ec-a005-0f467616cd37.png)

It is possible to show a state without displaying a graph for a sensor.
Imagine there are two CO-2 sensors & one humidity sensor; graphs are displayed for the CO-2 only, and the humidity is
shown as a state only.

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.xiaomi_cg_1_humidity
    show_state: true
    show_graph: false
  - entity: sensor.xiaomi_cg_1_co2
    color: green
    show_state: false
    name: CO2-1
  - entity: sensor.xiaomi_cg_2_co2
    color: orange
    show_state: false
    name: CO2-2
name: Humidity
hours_to_show: 4
points_per_hour: 60
show:
  name: true
  legend: true
  icon: false
  labels: true
```

This method may be also used to add a calculated value with it's own `aggregate_func` option.

#### Accessing attributes in complex structures

When using the `attribute` option in the [entities object](#entities-object), you can access data in structured
attributes, such as dictionaries and lists.

##### Accessing dictionary attributes

Suppose you have data stored inside a *dictionary* attribute named `dict_attribute`

```yaml
dict_attribute:
  value_1: 53
  value_2: 64
  value_3: 72
```

Such data should be addressed as `dict_attribute.sub_attribute`:

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.testing_object_data
    attribute: dict_attribute.value_1
    name: value_1 from dictionary attribute
```

![image](https://github.com/ildar170975/mini-graph-card/assets/71872483/0549afd5-901e-4e86-a144-edc4cd207440)

##### Accessing list attributes

Suppose you have data stored inside a *list* attribute named `list_attribute`:

```yaml
list_attribute:
  - value_1: 67
    value_2: 65
    value_3: 93
  - value_1: 134
    value_2: 130
    value_3: 186
  - value_1: 201
    value_2: 195
    value_3: 279
```

Such data should be addressed as `list_attribute.index.sub_attribute`:

```yaml
type: custom:mini-graph-card
entities:
  - entity: sensor.testing_object_data_list
    attribute: list_attribute.0.value_1
    name: value_1 from first element of list attribute
```

![image](https://github.com/ildar170975/mini-graph-card/assets/71872483/eebd0cea-da93-4bf5-97a1-118edd2a9c5e)

## Development

1. Clone this repository into your `config/www` folder using git:

```console
$ git clone https://github.com/kalkih/mini-graph-card.git
```

2. Add a reference to the card in your `ui-lovelace.yaml`:

```yaml
resources:
  - url: /local/mini-graph-card/dist/mini-graph-card-bundle.js
    type: module
```

### Instructions

*Requires `nodejs` & `npm`.*

1. Move into the `mini-graph-card` repo, checkout the *dev* branch & install dependencies:

```console
$ cd mini-graph-card && git checkout dev && npm install
```

2. Make changes to the source code.

3. Build the source by running:

```console
$ npm run build
```

4. Refresh the browser to see changes.

   *Make sure cache is cleared or disabled.*

5. *(Optional)* Watch the source and automatically rebuild on save:

```console
$ npm run watch
```

*The new `mini-graph-card-bundle.js` will be build and ready inside `/dist`.*

Note that the `dev` branch is the most up-to-date and matches our beta releases.

Please refer to the [Contribution Guidelines](./CONTRIBUTING.md) if you're interested in contributing to the project. (
And thanks for considering!)

## Getting errors?

Make sure you have `javascript_version: latest` in your `configuration.yaml` under `frontend:`.

Make sure you have the latest versions of `mini-graph-card.js` & `mini-graph-lib.js`.

If you have issues after updating the card, try clearing your browser cache.

If you have issues displaying the card in older browsers, try changing `type: module` to `type: js` at the card
reference in `ui-lovelace.yaml`.

## License

This project is under the MIT license.
