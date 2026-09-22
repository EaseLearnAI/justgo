/**
 * 城市级去向提示（L1：不依赖市中心 POI）
 */

const CITY_HINT_CATALOG = {
  default: ['社区公园', '滨水步道', '街区闲逛'],
  green: ['社区公园', '城市绿道', '林荫道'],
  water: ['滨水步道', '河岸栈道', '湖边步道'],
  citywalk: ['商业步行街', '历史文化街区', '街巷漫步']
};

/**
 * @param {string} [adcode]
 * @param {string[]} [routeStyle]
 * @returns {{ mode: string, hints: string[], pois: [] }}
 */
function getCityPlaceHints(adcode, routeStyle = []) {
  let hints = CITY_HINT_CATALOG.default;

  if (routeStyle.some((s) => /水|河|湖|滨/.test(s))) {
    hints = CITY_HINT_CATALOG.water;
  } else if (routeStyle.some((s) => /绿|公园|林/.test(s))) {
    hints = CITY_HINT_CATALOG.green;
  } else if (routeStyle.some((s) => /Citywalk|城市|街/.test(s))) {
    hints = CITY_HINT_CATALOG.citywalk;
  }

  return {
    mode: 'city_hint',
    hints,
    pois: [],
    adcode: adcode || null
  };
}

module.exports = {
  getCityPlaceHints,
  CITY_HINT_CATALOG
};
