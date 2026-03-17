import localForage from "localforage/src/localforage";
import {CARD_NAME, CARD_VERSION} from "./const.js";
import {decompress, logWarning} from "./utils";

localForage.config({
    name: CARD_NAME,
    storeName: "entity_history_cache",
    description: `${CARD_NAME} uses local caching for the entity history`,
});

localForage.iterate((data, key) => {
    const value = key.endsWith("_raw") ? data : decompress(data);
    const start = new Date();
    start.setHours(start.getHours() - value.hours_to_show);
    if (data.version !== CARD_VERSION || new Date(value.last_fetched) < start) {
        localForage.removeItem(key);
    }
}).catch((err) => {
    logWarning("Cache purging has errored: ", err);
});

console.info(
    `%c ${CARD_NAME.toUpperCase()} %c ${CARD_VERSION} `,
    "color: white; background: coral; font-weight: 700;",
    "color: coral; background: white; font-weight: 700;",
);
