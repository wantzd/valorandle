// ── Static metadata ────────────────────────────────────────────────────────────
const MAPS_STATIC = {
  ascent:   { releaseYear: 2020, country: 'Itália'   },
  bind:     { releaseYear: 2020, country: 'Marrocos'  },
  haven:    { releaseYear: 2020, country: 'Butão'     },
  split:    { releaseYear: 2020, country: 'Japão'     },
  icebox:   { releaseYear: 2020, country: 'Ártico'    },
  breeze:   { releaseYear: 2021, country: 'Caribe'    },
  fracture: { releaseYear: 2021, country: 'EUA'       },
  pearl:    { releaseYear: 2022, country: 'Portugal'  },
  lotus:    { releaseYear: 2023, country: 'Índia'     },
  sunset:   { releaseYear: 2023, country: 'EUA'       },
  abyss:    { releaseYear: 2024, country: 'Alto-mar'  },
  corrode:  { releaseYear: 2025, country: 'França'    },
};

// Rotation used by the callout-editor — must match so x,y coords render correctly
export const MAPS_ROTATION = {
  bind:180, sunset:180, lotus:180, pearl:180, fracture:180, breeze:180,
  icebox:90,
  // all others: 270
};

export const MAPS_WITH_SCREENSHOTS = new Set([
  'bind','haven','ascent','icebox','breeze','fracture','pearl','lotus',
]);

// Filename overrides: derived name would be wrong
export const IMG_OVERRIDES = {
  'ascent|b_boathouse': 'Boat House_B',
  'breeze|mid_hall':    'Hall_A',
  'breeze|a_ramp':      null,
};

// ── Callout positions (from callout-positions (7).json) ────────────────────────
export const CUSTOM_CALLOUTS_DB = {
  bind:{"callouts":[{"id":"a_tower","name":"A Tower","area":"A","x":26.54,"y":79.21},{"id":"a_site","name":"A Site","area":"A","x":26.31,"y":66.09},{"id":"a_lamps","name":"A Lamps","area":"A","x":37.34,"y":67.13},{"id":"a_bath","name":"A Bath","area":"A","x":15.27,"y":56.79},{"id":"a_teleporter","name":"A Teleporter","area":"A","x":38.15,"y":58.89},{"id":"a_short","name":"A Short","area":"A","x":36.64,"y":47.62},{"id":"a_cubby","name":"A Cubby","area":"A","x":39.31,"y":52.85},{"id":"a_exit","name":"A Exit","area":"A","x":8.77,"y":47.97},{"id":"a_lobby","name":"A Lobby","area":"A","x":24.56,"y":38.91},{"id":"a_link","name":"A Link","area":"A","x":48.26,"y":40.77},{"id":"b_hall","name":"B Hall","area":"B","x":71.95,"y":79.44},{"id":"b_site","name":"B Site","area":"B","x":69.74,"y":69.22},{"id":"b_garden","name":"B Garden","area":"B","x":75.32,"y":57.72},{"id":"b_window","name":"B Window","area":"B","x":68.12,"y":55.05},{"id":"b_long","name":"B Long","area":"B","x":80.78,"y":49.94},{"id":"b_teleporter","name":"B Teleporter","area":"B","x":84.96,"y":56.56},{"id":"b_short","name":"B Short","area":"B","x":60.34,"y":48.43},{"id":"b_link","name":"B Link","area":"B","x":59.29,"y":40.42},{"id":"b_fountain","name":"B Fountain","area":"B","x":74.39,"y":37.05},{"id":"b_elbow","name":"B Elbow","area":"B","x":83.68,"y":69.34},{"id":"b_exit","name":"B Exit","area":"B","x":53.14,"y":55.87},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":48.14,"y":89.55},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":40.59,"y":10.1},{"id":"attacker_side_cave","name":"Attacker Side Cave","area":"Other","x":37.92,"y":27.06}]},
  haven:{"callouts":[{"id":"a_tower","name":"A Tower","area":"A","x":14.46,"y":69.11},{"id":"a_site","name":"A Site","area":"A","x":18.06,"y":60.51},{"id":"a_link","name":"A Link","area":"A","x":33.97,"y":61.44},{"id":"a_lobby","name":"A Lobby","area":"A","x":37.11,"y":37.75},{"id":"a_sewer","name":"A Sewer","area":"A","x":38.04,"y":51.8},{"id":"a_long","name":"A Long","area":"A","x":17.71,"y":43.09},{"id":"a_garden","name":"A Garden","area":"A","x":38.5,"y":24.97},{"id":"b_site","name":"B Site","area":"B","x":49.88,"y":58.89},{"id":"b_back","name":"B Back","area":"B","x":49.88,"y":70.62},{"id":"c_site","name":"C Site","area":"C","x":83.33,"y":57.49},{"id":"c_long","name":"C Long","area":"C","x":84.26,"y":30.78},{"id":"c_lobby","name":"C Lobby","area":"C","x":72.53,"y":26.6},{"id":"c_cubby","name":"C Cubby","area":"C","x":80.55,"y":39.95},{"id":"c_window","name":"C Window","area":"C","x":61.73,"y":57.84},{"id":"c_garage","name":"C Garage","area":"C","x":62.89,"y":49.36},{"id":"mid_courtyard","name":"Mid Courtyard","area":"Mid","x":49.42,"y":44.72},{"id":"mid_window","name":"Mid Window","area":"Mid","x":47.79,"y":32.06},{"id":"mid_doors","name":"Mid Doors","area":"Mid","x":61.96,"y":38.79},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":40.71,"y":85.25},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":50.12,"y":10.8}]},
  split:{"callouts":[{"id":"a_screens","name":"A Screens","area":"A","x":22.82,"y":83.86},{"id":"a_rafters","name":"A Rafters","area":"A","x":26.19,"y":65.85},{"id":"a_tower","name":"A Tower","area":"A","x":32.35,"y":69.22},{"id":"a_ramps","name":"A Ramps","area":"A","x":35.6,"y":51.22},{"id":"a_site","name":"A Site","area":"A","x":17.13,"y":68.29},{"id":"a_main","name":"A Main","area":"A","x":22.24,"y":50.06},{"id":"a_lobby","name":"A Lobby","area":"A","x":16.32,"y":35.66},{"id":"a_sewer","name":"A Sewer","area":"A","x":31.77,"y":34.38},{"id":"a_back","name":"A Back","area":"A","x":12.6,"y":77.35},{"id":"b_lobby","name":"B Lobby","area":"B","x":79.04,"y":31.24},{"id":"b_tower","name":"B Tower","area":"B","x":68.93,"y":56.45},{"id":"b_site","name":"B Site","area":"B","x":85.77,"y":66.2},{"id":"b_alley","name":"B Alley","area":"B","x":78.69,"y":78.63},{"id":"b_garage","name":"B Garage","area":"B","x":85.19,"y":45.3},{"id":"b_rafters","name":"B Rafters","area":"B","x":75.2,"y":64},{"id":"b_stairs","name":"B Stairs","area":"B","x":61.73,"y":68.29},{"id":"b_link","name":"B Link","area":"B","x":70.79,"y":34.15},{"id":"b_back","name":"B Back","area":"B","x":94.37,"y":72.59},{"id":"mid_top","name":"Mid Top","area":"Mid","x":53.48,"y":52.5},{"id":"mid_vent","name":"Mid Vent","area":"Mid","x":44.77,"y":57.72},{"id":"mid_mail","name":"Mid Mail","area":"Mid","x":61.27,"y":53.77},{"id":"mid_bottom","name":"Mid Bottom","area":"Mid","x":54.3,"y":38.68},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":52.67,"y":87.34},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":54.65,"y":14.52}]},
  ascent:{"callouts":[{"id":"a_rafters","name":"A Rafters","area":"A","x":14.23,"y":75.03},{"id":"a_site","name":"A Site","area":"A","x":14.81,"y":65.39},{"id":"a_wine","name":"A Wine","area":"A","x":7.96,"y":51.8},{"id":"a_main","name":"A Main","area":"A","x":19.22,"y":51.1},{"id":"a_lobby","name":"A Lobby","area":"A","x":26.66,"y":40.19},{"id":"a_tree","name":"A Tree","area":"A","x":29.79,"y":59.93},{"id":"a_garden","name":"A Garden","area":"A","x":28.63,"y":66.78},{"id":"a_window","name":"A Window","area":"A","x":28.16,"y":75.26},{"id":"b_lobby","name":"B Lobby","area":"B","x":70.33,"y":43.32},{"id":"b_main","name":"B Main","area":"B","x":69.63,"y":59.81},{"id":"b_site","name":"B Site","area":"B","x":78.8,"y":71.31},{"id":"b_boathouse","name":"B Boathouse","area":"B","x":88.1,"y":72.71},{"id":"mid_pizza","name":"Mid Pizza","area":"Mid","x":45.35,"y":68.99},{"id":"mid_market","name":"Mid Market","area":"Mid","x":54.88,"y":70.27},{"id":"mid_bottom","name":"Mid Bottom","area":"Mid","x":49.3,"y":59.58},{"id":"mid_courtyard","name":"Mid Courtyard","area":"Mid","x":49.3,"y":51.45},{"id":"mid_catwalk","name":"Mid Catwalk","area":"Mid","x":41.99,"y":46.81},{"id":"mid_link","name":"Mid Link","area":"Mid","x":59.29,"y":47.39},{"id":"mid_top","name":"Mid Top","area":"Mid","x":41.64,"y":33.1},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":44.31,"y":87.11},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":55.57,"y":19.16}]},
  icebox:{"callouts":[{"id":"a_screen","name":"A Screen","area":"A","x":31.3,"y":67.94},{"id":"a_rafters","name":"A Rafters","area":"A","x":19.69,"y":76.54},{"id":"a_site","name":"A Site","area":"A","x":19.34,"y":68.99},{"id":"a_belt","name":"A Belt","area":"A","x":15.62,"y":43.44},{"id":"a_nest","name":"A Nest","area":"A","x":20.62,"y":52.15},{"id":"a_pipes","name":"A Pipes","area":"A","x":23.17,"y":58.89},{"id":"b_site","name":"B Site","area":"B","x":79.85,"y":59.93},{"id":"b_yellow","name":"B Yellow","area":"B","x":85.54,"y":45.76},{"id":"b_orange","name":"B Orange","area":"B","x":61.27,"y":57.72},{"id":"b_green","name":"B Green","area":"B","x":65.45,"y":43.55},{"id":"b_tube","name":"B Tube","area":"B","x":52.21,"y":53.19},{"id":"b_kitchen","name":"B Kitchen","area":"B","x":53.72,"y":71.08},{"id":"b_hall","name":"B Hall","area":"B","x":66.26,"y":68.18},{"id":"b_cubby","name":"B Cubby","area":"B","x":77.41,"y":39.37},{"id":"b_garage","name":"B Garage","area":"B","x":60.34,"y":34.61},{"id":"b_snowman","name":"B Snowman","area":"B","x":85.42,"y":76.31},{"id":"b_back","name":"B Back","area":"B","x":76.48,"y":80.6},{"id":"b_hut","name":"B Hut","area":"B","x":60.22,"y":78.16},{"id":"b_snow_pile","name":"B Snow Pile","area":"B","x":57.32,"y":64.34},{"id":"mid_boiler","name":"Mid Boiler","area":"Mid","x":46.75,"y":66.67},{"id":"mid_pallet","name":"Mid Pallet","area":"Mid","x":38.04,"y":59.23},{"id":"mid_blue","name":"Mid Blue","area":"Mid","x":46.52,"y":42.86},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":43.73,"y":86.76},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":38.97,"y":25.44}]},
  breeze:{"callouts":[{"id":"a_lobby","name":"A Lobby","area":"A","x":33.28,"y":21.84},{"id":"a_pyramids","name":"A Pyramids","area":"A","x":14.69,"y":50.06},{"id":"a_site","name":"A Site","area":"A","x":17.6,"y":60.98},{"id":"a_bridge","name":"A Bridge","area":"A","x":28.05,"y":76.31},{"id":"a_ramp","name":"A Ramp","area":"A","x":36.3,"y":67.83},{"id":"a_shop","name":"A Shop","area":"A","x":23.64,"y":34.61},{"id":"b_site","name":"B Site","area":"B","x":84.38,"y":74.45},{"id":"b_main","name":"B Main","area":"B","x":85.42,"y":51.1},{"id":"b_tunnel","name":"B Tunnel","area":"B","x":67.07,"y":70.03},{"id":"b_elbow","name":"B Elbow","area":"B","x":65.33,"y":59},{"id":"b_window","name":"B Window","area":"B","x":83.91,"y":34.73},{"id":"b_wall","name":"B Wall","area":"B","x":74.04,"y":75.84},{"id":"b_back","name":"B Back","area":"B","x":94.72,"y":69.92},{"id":"mid_nest","name":"Mid Nest","area":"Mid","x":56.85,"y":77.7},{"id":"mid_top","name":"Mid Top","area":"Mid","x":54.18,"y":66.67},{"id":"mid_pillar","name":"Mid Pillar","area":"Mid","x":52.21,"y":49.25},{"id":"mid_wood_doors","name":"Mid Wood Doors","area":"Mid","x":36.76,"y":53.08},{"id":"mid_hall","name":"Mid Hall","area":"Mid","x":36.88,"y":40.88},{"id":"mid_bottom","name":"Mid Bottom","area":"Mid","x":52.32,"y":37.05},{"id":"mid_cannon","name":"Mid Cannon","area":"Mid","x":66.96,"y":38.21},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":42.68,"y":85.13},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":55.46,"y":12.08},{"id":"defender_side_arches","name":"Defender Side Arches","area":"Other","x":62.2,"y":88.15}]},
  fracture:{"callouts":[{"id":"a_site","name":"A Site","area":"A","x":15.62,"y":46.57},{"id":"a_main","name":"A Main","area":"A","x":17.25,"y":34.38},{"id":"a_drop","name":"A Drop","area":"A","x":22.01,"y":58.42},{"id":"a_dish","name":"A Dish","area":"A","x":31.18,"y":74.33},{"id":"a_hall","name":"A Hall","area":"A","x":27.7,"y":24.04},{"id":"a_rope","name":"A Rope","area":"A","x":36.53,"y":36.35},{"id":"a_door","name":"A Door","area":"A","x":30.37,"y":29.04},{"id":"a_link","name":"A Link","area":"A","x":34.44,"y":53.89},{"id":"a_gate","name":"A Gate","area":"A","x":32.11,"y":85.48},{"id":"b_tree","name":"B Tree","area":"B","x":71.95,"y":20.44},{"id":"b_main","name":"B Main","area":"B","x":86.35,"y":31.94},{"id":"b_site","name":"B Site","area":"B","x":93.09,"y":45.53},{"id":"b_tunnel","name":"B Tunnel","area":"B","x":76.02,"y":34.15},{"id":"b_generator","name":"B Generator","area":"B","x":70.56,"y":48.08},{"id":"b_link","name":"B Link","area":"B","x":66.03,"y":57.96},{"id":"b_bench","name":"B Bench","area":"B","x":64.87,"y":71.08},{"id":"b_arcade","name":"B Arcade","area":"B","x":75.9,"y":66.67},{"id":"b_tower","name":"B Tower","area":"B","x":88.91,"y":55.4},{"id":"b_canteen","name":"B Canteen","area":"B","x":63.94,"y":42.97},{"id":"attacker_side_bridge","name":"Attacker Side Bridge","area":"Spawn","x":49.42,"y":85.83},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":51.86,"y":19.05},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":49.88,"y":55.87}]},
  pearl:{"callouts":[{"id":"a_flowers","name":"A Flowers","area":"A","x":25.38,"y":77.47},{"id":"a_site","name":"A Site","area":"A","x":15.27,"y":65.16},{"id":"a_main","name":"A Main","area":"A","x":10.39,"y":50.87},{"id":"a_link","name":"A Link","area":"A","x":31.07,"y":64.34},{"id":"a_art","name":"A Art","area":"A","x":30.6,"y":50.75},{"id":"a_secret","name":"A Secret","area":"A","x":16.09,"y":81.77},{"id":"a_dugout","name":"A Dugout","area":"A","x":8.07,"y":69.45},{"id":"a_restaurant","name":"A Restaurant","area":"A","x":25.84,"y":32.75},{"id":"b_main","name":"B Main","area":"B","x":91.81,"y":47.62},{"id":"b_ramp","name":"B Ramp","area":"B","x":91,"y":30.55},{"id":"b_site","name":"B Site","area":"B","x":83.91,"y":59.58},{"id":"b_tunnel","name":"B Tunnel","area":"B","x":66.03,"y":64.23},{"id":"b_club","name":"B Club","area":"B","x":71.72,"y":22.53},{"id":"b_hall","name":"B Hall","area":"B","x":83.33,"y":70.62},{"id":"b_link","name":"B Link","area":"B","x":67.77,"y":47.62},{"id":"b_tower","name":"B Tower","area":"B","x":72.18,"y":59.81},{"id":"b_screen","name":"B Screen","area":"B","x":93.32,"y":64.34},{"id":"mid_plaza","name":"Mid Plaza","area":"Mid","x":46.17,"y":36.7},{"id":"mid_top","name":"Mid Top","area":"Mid","x":39.43,"y":26.95},{"id":"mid_shops","name":"Mid Shops","area":"Mid","x":60.45,"y":32.06},{"id":"mid_doors","name":"Mid Doors","area":"Mid","x":49.42,"y":46.11},{"id":"mid_connector","name":"Mid Connector","area":"Mid","x":48.95,"y":63.3},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":42.33,"y":86.88},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":48.49,"y":10.34},{"id":"defender_side_records","name":"Defender Side Records","area":"Other","x":52.9,"y":77.82},{"id":"defender_side_water","name":"Defender Side Water","area":"Other","x":42.92,"y":69.22}]},
  lotus:{"callouts":[{"id":"a_site","name":"A Site","area":"A","x":14.34,"y":60.28},{"id":"a_tree","name":"A Tree","area":"A","x":14.46,"y":53.31},{"id":"a_root","name":"A Root","area":"A","x":31.3,"y":37.98},{"id":"a_lobby","name":"A Lobby","area":"A","x":33.16,"y":27.41},{"id":"a_stairs","name":"A Stairs","area":"A","x":25.61,"y":68.52},{"id":"a_main","name":"A Main","area":"A","x":25.49,"y":50.64},{"id":"a_rubble","name":"A Rubble","area":"A","x":18.99,"y":39.72},{"id":"a_door","name":"A Door","area":"A","x":16.9,"y":48.55},{"id":"a_hut","name":"A Hut","area":"A","x":14.58,"y":68.64},{"id":"a_drop","name":"A Drop","area":"A","x":9.81,"y":76.66},{"id":"a_top","name":"A Top","area":"A","x":19.57,"y":76.89},{"id":"a_link","name":"A Link","area":"A","x":38.73,"y":52.85},{"id":"b_site","name":"B Site","area":"B","x":50,"y":54.24},{"id":"b_main","name":"B Main","area":"B","x":56.04,"y":42.86},{"id":"b_upper","name":"B Upper","area":"B","x":45.24,"y":62.83},{"id":"b_pillars","name":"B Pillars","area":"B","x":49.54,"y":34.26},{"id":"c_main","name":"C Main","area":"C","x":76.6,"y":45.76},{"id":"c_site","name":"C Site","area":"C","x":86.24,"y":58.54},{"id":"c_bend","name":"C Bend","area":"C","x":92.04,"y":50.06},{"id":"c_hall","name":"C Hall","area":"C","x":82.75,"y":66.2},{"id":"c_mound","name":"C Mound","area":"C","x":72.53,"y":35.77},{"id":"c_lobby","name":"C Lobby","area":"C","x":71.49,"y":23.93},{"id":"c_door","name":"C Door","area":"C","x":66.49,"y":42.86},{"id":"c_waterfall","name":"C Waterfall","area":"C","x":71.72,"y":54.24},{"id":"c_link","name":"C Link","area":"C","x":65.21,"y":62.49},{"id":"c_gravel","name":"C Gravel","area":"C","x":61.73,"y":73.64},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":38.97,"y":83.04},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":47.68,"y":14.4}]},
  abyss:{"callouts":[{"id":"a_lobby","name":"A Lobby","area":"A","x":23.64,"y":20.21},{"id":"a_main","name":"A Main","area":"A","x":11.32,"y":36.59},{"id":"a_tower","name":"A Tower","area":"A","x":25.26,"y":49.48},{"id":"a_site","name":"A Site","area":"A","x":16.43,"y":52.03},{"id":"a_bridge","name":"A Bridge","area":"A","x":4.24,"y":53.19},{"id":"a_security","name":"A Security","area":"A","x":11.09,"y":73.98},{"id":"a_link","name":"A Link","area":"A","x":27.93,"y":69.57},{"id":"a_secret","name":"A Secret","area":"A","x":19.57,"y":83.16},{"id":"a_vent","name":"A Vent","area":"A","x":36.3,"y":52.38},{"id":"b_link","name":"B Link","area":"B","x":65.91,"y":68.29},{"id":"b_main","name":"B Main","area":"B","x":75.32,"y":37.51},{"id":"b_nest","name":"B Nest","area":"B","x":89.72,"y":32.29},{"id":"b_site","name":"B Site","area":"B","x":85.42,"y":58.89},{"id":"b_tower","name":"B Tower","area":"B","x":79.85,"y":71.54},{"id":"b_lobby","name":"B Lobby","area":"B","x":79.85,"y":17.89},{"id":"b_danger","name":"B Danger","area":"B","x":98.66,"y":44.25},{"id":"mid_top","name":"Mid Top","area":"Mid","x":43.61,"y":69.11},{"id":"mid_catwalk","name":"Mid Catwalk","area":"Mid","x":45.35,"y":45.41},{"id":"mid_bottom","name":"Mid Bottom","area":"Mid","x":51.16,"y":34.15},{"id":"mid_bend","name":"Mid Bend","area":"Mid","x":63.94,"y":42.74},{"id":"mid_library","name":"Mid Library","area":"Mid","x":53.14,"y":54.82},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":45.7,"y":86.88},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":45.24,"y":15.8}]},
  corrode:{"callouts":[{"id":"a_lobby","name":"A Lobby","area":"A","x":32.58,"y":27.99},{"id":"a_main","name":"A Main","area":"A","x":23.87,"y":39.14},{"id":"a_link","name":"A Link","area":"A","x":39.55,"y":56.21},{"id":"a_site","name":"A Site","area":"A","x":19.8,"y":59.93},{"id":"a_crane","name":"A Crane","area":"A","x":23.17,"y":80.37},{"id":"a_elbow","name":"A Elbow","area":"A","x":10.86,"y":62.37},{"id":"a_pocket","name":"A Pocket","area":"A","x":10.63,"y":52.26},{"id":"a_yard","name":"A Yard","area":"A","x":22.94,"y":52.61},{"id":"b_arch","name":"B Arch","area":"B","x":81.71,"y":82.35},{"id":"b_elbow","name":"B Elbow","area":"B","x":88.91,"y":67.48},{"id":"b_site","name":"B Site","area":"B","x":76.83,"y":60.05},{"id":"b_main","name":"B Main","area":"B","x":80.2,"y":46.57},{"id":"b_lobby","name":"B Lobby","area":"B","x":67.19,"y":30.08},{"id":"b_link","name":"B Link","area":"B","x":61.03,"y":60.51},{"id":"mid_window","name":"Mid Window","area":"Mid","x":49.88,"y":68.18},{"id":"mid_top","name":"Mid Top","area":"Mid","x":50.46,"y":60.98},{"id":"mid_bottom","name":"Mid Bottom","area":"Mid","x":48.84,"y":28.69},{"id":"mid_stairs","name":"Mid Stairs","area":"Mid","x":47.79,"y":44.48},{"id":"defender_side_spawn","name":"Defender Side Spawn","area":"Spawn","x":47.91,"y":86.99},{"id":"attacker_side_spawn","name":"Attacker Side Spawn","area":"Spawn","x":50.12,"y":10.34}]},
};

// ── Hints ──────────────────────────────────────────────────────────────────────
export const MAPS_HINTS = {
  bind:     [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2020",en:"Released in 2020"},{pt:"Localizado no Marrocos",en:"Located in Morocco"},{pt:"Único mapa com teleportes unidirecionais (sem mid convencional)",en:"Only map with one-way teleporters (no conventional mid)"} ],
  haven:    [ {pt:"Possui 3 bombsites",en:"Has 3 bomb sites"},{pt:"Lançado em 2020",en:"Released in 2020"},{pt:"Localizado no Butão",en:"Located in Bhutan"},{pt:"Único mapa com três bombsites",en:"Only map with three bomb sites"} ],
  split:    [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2020",en:"Released in 2020"},{pt:"Localizado no Japão",en:"Located in Japan"},{pt:"Cordas (rapel) são a principal mecânica vertical",en:"Ropes are the main vertical mechanic"} ],
  ascent:   [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2020",en:"Released in 2020"},{pt:"Localizado na Itália",en:"Located in Italy"},{pt:"Portões mecânicos nas entradas dos sites e no mid",en:"Mechanical gates at site entries and mid"} ],
  icebox:   [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2020",en:"Released in 2020"},{pt:"Localizado no Ártico",en:"Located in the Arctic"},{pt:"Cabos deslizantes (ziplines) conectam áreas verticais",en:"Ziplines connect vertical areas"} ],
  breeze:   [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2021",en:"Released in 2021"},{pt:"Localizado no Caribe",en:"Located in the Caribbean"},{pt:"Sites e corredores muito amplos, favorecem rifles de longa distância",en:"Very wide sites and corridors, favor long-range rifles"} ],
  fracture: [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2021",en:"Released in 2021"},{pt:"Localizado nos EUA",en:"Located in the USA"},{pt:"Atacantes chegam pelos flancos esquerdo e direito por uma ponte",en:"Attackers approach both flanks via a bridge"} ],
  pearl:    [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2022",en:"Released in 2022"},{pt:"Localizado em Portugal (dimensão alternativa)",en:"Located in Portugal (alternate dimension)"},{pt:"Sem mecânicas especiais — sem portas, teleportes ou cabos",en:"No special mechanics — no doors, teleporters or ziplines"} ],
  lotus:    [ {pt:"Possui 3 bombsites",en:"Has 3 bomb sites"},{pt:"Lançado em 2023",en:"Released in 2023"},{pt:"Localizado na Índia",en:"Located in India"},{pt:"Portas giratórias controlam passagens entre áreas-chave",en:"Rotating doors control key passages"} ],
  sunset:   [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2023",en:"Released in 2023"},{pt:"Localizado em Los Angeles, EUA",en:"Located in Los Angeles, USA"},{pt:"Portão de garagem no mid pode ser aberto ou fechado",en:"Mid garage door can be opened or closed"} ],
  abyss:    [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2024",en:"Released in 2024"},{pt:"Localizado em alto-mar / plataforma oceânica",en:"Located at sea / oceanic platform"},{pt:"Bordas sem paredes — queda resulta em morte instantânea",en:"No walls at edges — falling off means instant death"} ],
  corrode:  [ {pt:"Possui 2 bombsites",en:"Has 2 bomb sites"},{pt:"Lançado em 2025",en:"Released in 2025"},{pt:"Localizado em Mont-Saint-Michel, Normandia, França (Terra Ômega)",en:"Located in Mont-Saint-Michel, Normandy, France (Omega Earth)"},{pt:"Segundo mapa ambientado na Terra Ômega (após Pearl)",en:"Second map set on Omega Earth (after Pearl)"} ],
};

// ── i18n ───────────────────────────────────────────────────────────────────────
export const MAPS_I18N = {
  'pt-BR': {
    back:'← Hub', modeTag:'Mapas', showMap:'🗺️ Ver mapa', hideMap:'✕ Ocultar mapa',
    selectMapHint:'Selecione um mapa abaixo', hintBtn:'💡 Dica',
    hintLeft: n => `${n} restante${n===1?'':'s'}`, noHints:'Sem mais dicas',
    attempts: (n,max) => `${n}/${max} tentativas`,
    headers:{ map:'Mapa', callout:'Callout', area:'Área' },
    areas:{ A:'Site A', B:'Site B', C:'Site C', Mid:'Meio', Spawn:'Spawn', Other:'Outro' },
    win:'Você acertou!', lose:(map,callout) => `Era ${map} · ${callout}`,
    winSub: n => `Em ${n} tentativa${n===1?'':'s'}`, loseSub:'Mais sorte amanhã!',
    shareHeader:'🗺️ Valorandle Mapas', shareWin: n => `Acertei em ${n} tentativa${n===1?'':'s'}!`,
    shareLose:'Não acertei hoje.', nextDaily:'Próximo daily em', playFree:'Modo livre',
    shareBtn:'Compartilhar 📋', copiedToast:'Copiado!',
    imgPlaceholder:'Screenshots em breve', mapPlaceholder:'Selecione o mapa para ver o minimapa',
    apiError:'Não foi possível carregar os mapas. Verifique sua conexão.',
    modePicker:'Mapas — Selecione o modo', modeDailyDesc:'Um novo callout por dia',
    modeFreeDesc:'Jogue quantas vezes quiser', newRound:'Novo Round →',
    confirmGuess:'Confirmar →', offlineWarn:'Modo offline — funcionalidades limitadas.',
    tutTitle:'Como Jogar', tutDismiss:'Entendido →',
    tutSteps:[
      'Você vê uma <b>screenshot</b> de um local do mapa com muito zoom. Quanto mais você erra, mais a imagem abre.',
      'Alterne para <b>🗺️ Mapa</b>, selecione qual mapa você acha que é e clique no callout correto no minimapa.',
      'O feedback mostra 3 células: <b>Mapa</b>, <b>Callout</b> e <b>Área</b> — verde se acertou, vermelho se errou.',
      'Você tem <b>6 tentativas</b>. Use a <b>💡 Dica</b> para revelar pistas sobre o mapa sem gastar tentativa.',
    ],
  },
  'en': {
    back:'← Hub', modeTag:'Maps', showMap:'🗺️ Show map', hideMap:'✕ Hide map',
    selectMapHint:'Select a map below', hintBtn:'💡 Hint',
    hintLeft: n => `${n} left`, noHints:'No more hints',
    attempts: (n,max) => `${n}/${max} attempts`,
    headers:{ map:'Map', callout:'Callout', area:'Area' },
    areas:{ A:'A Site', B:'B Site', C:'C Site', Mid:'Mid', Spawn:'Spawn', Other:'Other' },
    win:'You got it!', lose:(map,callout) => `It was ${map} · ${callout}`,
    winSub: n => `In ${n} attempt${n===1?'':'s'}`, loseSub:'Better luck tomorrow!',
    shareHeader:'🗺️ Valorandle Maps', shareWin: n => `Got it in ${n} attempt${n===1?'':'s'}!`,
    shareLose:"Didn't get it today.", nextDaily:'Next daily in', playFree:'Free mode',
    shareBtn:'Share 📋', copiedToast:'Copied!',
    imgPlaceholder:'Screenshots coming soon', mapPlaceholder:'Select a map to see its minimap',
    apiError:'Could not load maps. Check your connection.',
    modePicker:'Maps — Select mode', modeDailyDesc:'A new callout every day',
    modeFreeDesc:'Play as many times as you want', newRound:'New Round →',
    confirmGuess:'Confirm →', offlineWarn:'Offline mode — limited functionality.',
    tutTitle:'How to Play', tutDismiss:'Got it →',
    tutSteps:[
      'You see a <b>screenshot</b> of a map location zoomed in close. The more you miss, the more it zooms out.',
      'Switch to <b>🗺️ Map</b>, pick which map you think it is, then click the correct callout on the minimap.',
      'Feedback shows 3 cells: <b>Map</b>, <b>Callout</b> and <b>Area</b> — green if correct, red if wrong.',
      'You have <b>6 attempts</b>. Use the <b>💡 Hint</b> button to reveal clues without spending a guess.',
    ],
  },
};

// ── Runtime state (mutated by loadMapsFromAPI) ─────────────────────────────────
export let MAPS_DB       = {};
export let MAPS_CALLOUTS = {};

const VAPI_BASE    = 'https://valorant-api.com/v1/maps';
const NON_PLAYABLE = ['HURM', 'Range', 'Duel', 'Podium', 'MenuStaging'];

function _mapId(name) { return name.toLowerCase().replace(/\s+/g, '_'); }
function _lcg(seed)   { return ((seed * 1664525 + 1013904223) >>> 0); }

function _injectCustomCallouts() {
  Object.keys(CUSTOM_CALLOUTS_DB).forEach(mapId => {
    MAPS_CALLOUTS[mapId] = CUSTOM_CALLOUTS_DB[mapId].callouts.map(c => ({
      id: c.id, names: { 'pt-BR': c.name, 'en': c.name }, area: c.area, x: c.x, y: c.y,
    }));
  });
}

function _injectOffline() {
  Object.keys(CUSTOM_CALLOUTS_DB).forEach(mapId => {
    const stat = MAPS_STATIC[mapId] || {};
    if (!MAPS_DB[mapId]) {
      MAPS_DB[mapId] = {
        uuid: null,
        name: mapId.charAt(0).toUpperCase() + mapId.slice(1),
        sites: 2,
        releaseYear: stat.releaseYear ?? null,
        country: stat.country ?? null,
        displayIcon: null, splash: null,
        rotation: MAPS_ROTATION[mapId] ?? 270,
      };
    }
  });
  _injectCustomCallouts();
}

export async function loadMapsFromAPI() {
  try {
    const [resPT, resEN] = await Promise.all([
      fetch(VAPI_BASE + '?language=pt-BR'),
      fetch(VAPI_BASE + '?language=en-US'),
    ]);
    if (!resPT.ok || !resEN.ok) throw new Error('HTTP error');
    const [dataPT, dataEN] = await Promise.all([resPT.json(), resEN.json()]);
    const rawPT = dataPT.data || [];
    const rawEN = dataEN.data || [];

    const playable = rawPT.filter(m =>
      (m.callouts?.length || 0) > 5 &&
      m.xMultiplier !== null &&
      !NON_PLAYABLE.some(s => (m.mapUrl || '').includes(s))
    );

    // Reset
    Object.keys(MAPS_DB).forEach(k => delete MAPS_DB[k]);
    Object.keys(MAPS_CALLOUTS).forEach(k => delete MAPS_CALLOUTS[k]);

    playable.forEach(mapPT => {
      const mapEN = rawEN.find(m => m.uuid === mapPT.uuid);
      const id    = _mapId(mapPT.displayName);
      const stat  = MAPS_STATIC[id] || {};
      const sites = (mapPT.tacticalDescription || '').includes('C') ? 3 : 2;

      MAPS_DB[id] = {
        uuid: mapPT.uuid, name: mapPT.displayName, sites,
        releaseYear: stat.releaseYear ?? null, country: stat.country ?? null,
        displayIcon: mapPT.displayIcon, splash: mapPT.splash,
        rotation: MAPS_ROTATION[id] ?? 270,
      };

      const cl = mapPT.callouts || [];
      const PAD = 5;
      const rx = cl.map(c => c.location.x * mapPT.xMultiplier + mapPT.xScalarToAdd);
      const ry = cl.map(c => c.location.y * mapPT.yMultiplier + mapPT.yScalarToAdd);
      const aMin = Math.min(...ry), aMax = Math.max(...ry);
      const bMin = Math.min(...rx), bMax = Math.max(...rx);
      const norm = (v, lo, hi) => lo === hi ? 50 : PAD + (v - lo) / (hi - lo) * (100 - 2 * PAD);

      MAPS_CALLOUTS[id] = cl.map((c, i) => ({
        id: id + '_' + i,
        names: { 'pt-BR': c.regionName, 'en': mapEN?.callouts?.[i]?.regionName || c.regionName },
        area: c.superRegionName || 'Other',
        x: norm(ry[i], aMin, aMax),
        y: norm(rx[i], bMin, bMax),
      }));
    });

    _injectCustomCallouts();
    return true;
  } catch {
    _injectOffline();
    return false;
  }
}

// ── Screenshot path ────────────────────────────────────────────────────────────
export function getCalloutImgPath(mapId, calloutId) {
  if (!MAPS_WITH_SCREENSHOTS.has(mapId)) return null;
  const mapName = MAPS_DB[mapId]?.name;
  if (!mapName) return null;

  const key = `${mapId}|${calloutId}`;
  if (key in IMG_OVERRIDES) {
    return IMG_OVERRIDES[key] === null ? null : `maps/${mapName}/${IMG_OVERRIDES[key]}.png`;
  }

  const callout = (MAPS_CALLOUTS[mapId] || []).find(c => c.id === calloutId);
  const name = callout?.names?.['en'] || '';
  if (!name) return null;

  for (const [pfx, sfx] of [
    ['Attacker Side ','_Attacker Side'], ['Defender Side ','_Defender Side'],
    ['Mid ','_Mid'], ['A ','_A'], ['B ','_B'], ['C ','_C'],
  ]) {
    if (name.startsWith(pfx)) return `maps/${mapName}/${name.slice(pfx.length)}${sfx}.png`;
  }
  return `maps/${mapName}/${name}.png`;
}

// ── Target selection ───────────────────────────────────────────────────────────
import { getDailyDateKey } from './game-utils.js';

export function getDailyMapTarget() {
  const ids = Object.keys(MAPS_DB).filter(id =>
    MAPS_WITH_SCREENSHOTS.has(id) && (MAPS_CALLOUTS[id]?.length || 0) > 3
  );
  if (!ids.length) return null;
  const dateNum = parseInt(getDailyDateKey().replace(/-/g, ''), 10);
  let s = _lcg(dateNum);
  const mapId  = ids[s % ids.length];
  s = _lcg(s);
  const callouts = MAPS_CALLOUTS[mapId];
  return { mapId, calloutId: callouts[s % callouts.length].id };
}

export function getFreeMapTarget() {
  const ids = Object.keys(MAPS_DB).filter(id =>
    MAPS_WITH_SCREENSHOTS.has(id) && (MAPS_CALLOUTS[id]?.length || 0) > 3
  );
  if (!ids.length) return null;
  const mapId   = ids[Math.floor(Math.random() * ids.length)];
  const callouts = MAPS_CALLOUTS[mapId];
  return { mapId, calloutId: callouts[Math.floor(Math.random() * callouts.length)].id };
}

// ── Comparison ─────────────────────────────────────────────────────────────────
export function compareMapGuess(guessMapId, guessCalloutId, target, lang = 'pt-BR') {
  const l = lang === 'en' ? 'en' : 'pt-BR';
  const tc = (MAPS_CALLOUTS[target.mapId] || []).find(c => c.id === target.calloutId);
  const gc = (MAPS_CALLOUTS[guessMapId]  || []).find(c => c.id === guessCalloutId);

  const mapOk     = guessMapId === target.mapId;
  const calloutOk = mapOk && guessCalloutId === target.calloutId;
  const areaOk    = mapOk && !!gc && !!tc && gc.area === tc.area;

  return [
    { attr:'map',     value: MAPS_DB[guessMapId]?.name || guessMapId,                 status: mapOk     ? 'correct' : 'wrong' },
    { attr:'callout', value: gc?.names[l] || gc?.names['en'] || guessCalloutId,       status: calloutOk ? 'correct' : 'wrong' },
    { attr:'area',    value: gc?.area || '?',                                          status: areaOk    ? 'correct' : 'wrong' },
  ];
}
