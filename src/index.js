// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
// import Stats from "three/examples/jsm/libs/stats.module.js";

// import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
// import CapsuleBufferGeometry from "./CapsuleBufferGeometry.js";

// import * as Helpers from "./Helpers.js";

// import { setupDragAndDrop } from "./DragAndDrop.js";

import * as L from "leaflet"

main();

function main() {
  let activeArea = document.getElementById("activeArea");

  var w = 33000;
  var h = 33000;
  var mapMinZoom = 2;
  var mapMaxZoom = 7;
  var _map = L.map('mapid', {
    maxZoom: mapMaxZoom,
    minZoom: mapMinZoom,
    crs: L.CRS.Simple,
    zoomControl: true,
    wheelPxPerZoomLevel: 250,
    attributionControl: false,
    detectRetina: true
  });

  var _mapBounds = new L.LatLngBounds(
    _map.unproject([0, h], mapMaxZoom),
    _map.unproject([w, 0], mapMaxZoom));
  _map.setMaxBounds(_mapBounds);

  var _mapCenter = _map.unproject([w / 2, h / 2], mapMaxZoom);
  _map.setView(_mapCenter, 2);

  var _tileLayer = L.tileLayer(
    'assets/iwd-tiles-sq/{z}/{x}/{y}.png', {
    minZoom: mapMinZoom, maxZoom: mapMaxZoom,
    bounds: _mapBounds,
    continuousWorld: false,
    noWrap: true,
    tileSize: 256,
    crs: L.CRS.Simple,
    detectRetina: true
  }).addTo(_map);

  // Set up drag-and-drop for the active area
  // setupDragAndDrop(activeArea, objCallback);

  // _map.fitBounds(_mapBounds)
}
