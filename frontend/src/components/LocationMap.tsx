import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import { Map } from 'lucide-react-native';
import type { MapLine, MapLocation, MapMarker, MapZone } from '../types';

export type { MapLine, MapLocation, MapMarker, MapZone } from '../types';

interface LocationMapProps {
  currentLocation?: MapLocation;
  mapType?: 'jurisdiction' | 'cockpit' | 'roadsos' | 'fineiq' | 'chat';
  markers?: MapMarker[];
  zones?: MapZone[];
  lines?: MapLine[];
  height?: number;
  interactive?: boolean;
  onMarkerSelect?: (marker: MapMarker) => void;
  forceWebView?: boolean;
}

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #070D19; }
    #map { width: 100vw; height: 100vh; background: #070D19; }

    /* ── Coordinate Badge ─────────────────────────────── */
    .coord-badge {
      position: fixed; bottom: 10px; left: 10px;
      background: rgba(15,23,42,0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(6,182,212,0.22);
      padding: 5px 10px; border-radius: 6px;
      font-size: 11px; color: rgba(0, 229, 255, 0.9);
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      z-index: 1000; letter-spacing: 0.5px;
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.1);
    }

    /* ── Offline Status Badge ─────────────────────────── */
    .offline-badge {
      position: fixed; bottom: 10px; right: 10px;
      background: rgba(15,23,42,0.88);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(6,182,212,0.22);
      padding: 6px 14px; border-radius: 8px;
      font-size: 10px; color: #00E5FF;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      z-index: 1001; letter-spacing: 1.4px; text-transform: uppercase;
      opacity: 0; transform: translateY(8px);
      transition: opacity 0.5s ease, transform 0.5s ease;
      display: flex; align-items: center; gap: 8px;
    }
    .offline-badge.visible {
      opacity: 1; transform: translateY(0);
    }
    .offline-badge .pulse-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #00E5FF;
      animation: pulseDot 2s ease-in-out infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 0.4; box-shadow: 0 0 0 0 rgba(6,182,212,0.4); }
      50% { opacity: 1; box-shadow: 0 0 8px 3px rgba(6,182,212,0.25); }
    }

    /* Blinking user vehicle marker */
    .user-marker {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 229, 255, 0.20);
      border: 2px solid #00E5FF;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: pulseUser 2.2s infinite;
    }
    .user-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00E5FF;
      box-shadow: 0 0 8px #00E5FF;
    }
    @keyframes pulseUser {
      0% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.6); }
      70% { box-shadow: 0 0 0 12px rgba(0, 229, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0); }
    }

    /* Rotating Car Mode Marker */
    .car-marker {
      width: 32px;
      height: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.2s ease-out;
    }
    .car-cursor-inner {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(0, 229, 255, 0.15);
      border: 2px solid #00E5FF;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 0 10px #00E5FF;
    }
    .car-arrow {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 12px solid #00E5FF;
    }

    /* Color-coded glowing legal intelligence markers */
    .neon-marker {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 10px rgba(0,0,0,0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s ease;
    }
    .neon-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #FFFFFF;
    }
    .neon-marker.police { background: #3B82F6; box-shadow: 0 0 8px #3B82F6; }
    .neon-marker.hospital { background: #10B981; box-shadow: 0 0 8px #10B981; }
    .neon-marker.fire { background: #EF4444; box-shadow: 0 0 8px #EF4444; }
    .neon-marker.rto { background: #F59E0B; box-shadow: 0 0 8px #F59E0B; }
    .neon-marker.ev { background: #06B6D4; box-shadow: 0 0 8px #06B6D4; }
    .neon-marker.warning { background: #EAB308; box-shadow: 0 0 8px #EAB308; }
    .neon-marker.border { background: #A855F7; box-shadow: 0 0 8px #A855F7; }

    /* Popups/Tooltips styling */
    .leaflet-tooltip {
      background: rgba(15, 23, 42, 0.9) !important;
      border: 1px solid rgba(6, 182, 212, 0.3) !important;
      color: #FFFFFF !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      font-weight: bold !important;
      box-shadow: 0 0 10px rgba(0,0,0,0.5) !important;
    }
    .leaflet-popup-content-wrapper {
      background: rgba(15, 23, 42, 0.95) !important;
      border: 1px solid rgba(6, 182, 212, 0.25) !important;
      color: #FFFFFF !important;
      border-radius: 8px !important;
      box-shadow: 0 0 15px rgba(0,0,0,0.6) !important;
      font-size: 12px !important;
    }
    .leaflet-popup-tip {
      background: rgba(15, 23, 42, 0.95) !important;
    }
    .popup-btn {
      display: block; width: 100%; text-align: center;
      background: #00E5FF; color: #070D19;
      font-size: 11px; font-weight: bold; text-transform: uppercase;
      padding: 5px; margin-top: 8px; border-radius: 4px;
      text-decoration: none; cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="coord-badge" id="coordBadge"></div>
  <div class="offline-badge" id="offlineBadge">
    <span class="pulse-dot"></span>
    <span>OFFLINE MODE &middot; Tactical Grid</span>
  </div>

  <script>
    /* ================================================================
       TACTICAL OFFLINE GRID LAYER
       ================================================================ */
    var TacticalGridLayer = L.GridLayer.extend({
      createTile: function(coords) {
        var tile = document.createElement('canvas');
        var sz = this.getTileSize();
        tile.width = sz.x;
        tile.height = sz.y;
        this._drawTacticalTile(tile, coords, sz);
        return tile;
      },
      _drawTacticalTile: function(canvas, coords, sz) {
        var ctx = canvas.getContext('2d');
        var w = sz.x, h = sz.y;
        ctx.fillStyle = '#070D19';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0,229,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (var x = 0; x < w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (var y = 0; y < h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,229,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x2 = 0; x2 < w; x2 += 120) { ctx.moveTo(x2, 0); ctx.lineTo(x2, h); }
        for (var y2 = 0; y2 < h; y2 += 120) { ctx.moveTo(0, y2); ctx.lineTo(w, y2); }
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,229,255,0.2)';
        for (var ix = 0; ix < w; ix += 120) {
          for (var iy = 0; iy < h; iy += 120) {
            ctx.beginPath(); ctx.arc(ix, iy, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    });

    var map = L.map('map', {
      attributionControl: false,
      zoomControl: false,
      scrollWheelZoom: true,
      dragging: true
    });

    var osmTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    var tacticalGrid = new TacticalGridLayer({ maxZoom: 19 });
    var isOffline = !navigator.onLine;

    function applyNetworkState() {
      var badge = document.getElementById('offlineBadge');
      if (isOffline) {
        if (map.hasLayer(osmTileLayer)) map.removeLayer(osmTileLayer);
        if (!map.hasLayer(tacticalGrid)) tacticalGrid.addTo(map);
        badge.classList.add('visible');
      } else {
        if (map.hasLayer(tacticalGrid)) map.removeLayer(tacticalGrid);
        if (!map.hasLayer(osmTileLayer)) osmTileLayer.addTo(map);
        badge.classList.remove('visible');
      }
    }

    applyNetworkState();
    window.addEventListener('online', function() { isOffline = false; applyNetworkState(); });
    window.addEventListener('offline', function() { isOffline = true; applyNetworkState(); });

    var userMarker = null;
    var markersList = {};
    var zoneLayers = [];
    var lineLayers = [];

    // INITIALIZATION_INJECTION

    function updateLocation(lat, lng, heading, speed) {
      document.getElementById('coordBadge').textContent = lat.toFixed(5) + ', ' + lng.toFixed(5) + (heading ? ' · ' + heading.toFixed(0) + '°' : '');
      var latlng = [lat, lng];
      
      if (userMarker) {
        userMarker.setLatLng(latlng);
      } else {
        // Toggle chevron vs pulsating dot based on heading
        var markerHtml = (heading !== undefined && heading !== null)
          ? '<div class="car-marker" id="carMarkerDiv"><div class="car-cursor-inner"><div class="car-arrow"></div></div></div>'
          : '<div class="user-marker"><div class="user-dot"></div></div>';
          
        userMarker = L.marker(latlng, {
          icon: L.divIcon({
            className: '',
            html: markerHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map);
      }

      if (heading !== undefined && heading !== null) {
        var arrowDiv = document.getElementById('carMarkerDiv');
        if (arrowDiv) {
          arrowDiv.style.transform = 'rotate(' + heading + 'deg)';
        }
      }

      // Smooth transition to viewport
      map.setView(latlng, map.getZoom() < 14 ? 15 : map.getZoom());
    }

    function updateMarkers(markers) {
      // Clear existing markers
      Object.keys(markersList).forEach(function(key) {
        map.removeLayer(markersList[key]);
      });
      markersList = {};

      markers.forEach(function(m) {
        var colorClass = m.type || 'police';
        
        var leafletMarker = L.marker([m.lat, m.lng], {
          icon: L.divIcon({
            className: '',
            html: '<div class="neon-marker ' + colorClass + '"><div class="neon-inner"></div></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          })
        }).addTo(map);

        var popupContent = '<b>' + m.name + '</b><br>' + 
                           (m.distance ? 'Distance: ' + m.distance + ' km<br>' : '') +
                           (m.address ? m.address + '<br>' : '');
                           
        if (m.phone) {
          popupContent += 'Phone: ' + m.phone + '<br>';
        }
        
        popupContent += '<a class="popup-btn" onclick="selectMarker(\\'' + m.id + '\\')">Select Node</a>';

        leafletMarker.bindPopup(popupContent);
        markersList[m.id] = leafletMarker;
      });
    }

    function updateZones(zones) {
      zoneLayers.forEach(function(z) { map.removeLayer(z); });
      zoneLayers = [];

      zones.forEach(function(z) {
        var color = z.severity === 'high' ? '#EF4444' :
                    z.severity === 'medium' ? '#FBBF24' : '#00E5FF';
                    
        if (z.coords && z.coords.length > 0) {
          if (z.coords.length === 1 && z.radius) {
            // Draw circle
            var circ = L.circle([z.coords[0].lat, z.coords[0].lng], {
              radius: z.radius,
              color: color,
              fillColor: color,
              fillOpacity: 0.15,
              weight: 2
            }).addTo(map);
            circ.bindTooltip(z.name);
            zoneLayers.push(circ);
          } else {
            // Draw polygon
            var polyCoords = z.coords.map(function(c) { return [c.lat, c.lng]; });
            var poly = L.polygon(polyCoords, {
              color: color,
              fillColor: color,
              fillOpacity: 0.15,
              weight: 2
            }).addTo(map);
            poly.bindTooltip(z.name);
            zoneLayers.push(poly);
          }
        }
      });
    }

    function updateLines(lines) {
      lineLayers.forEach(function(l) { map.removeLayer(l); });
      lineLayers = [];

      lines.forEach(function(l) {
        var polyCoords = l.coords.map(function(c) { return [c.lat, c.lng]; });
        var lineOpts = {
          color: l.color || '#00E5FF',
          weight: 4,
          opacity: 0.8
        };
        if (l.dashed) {
          lineOpts.dashArray = '8, 6';
        }
        var polyline = L.polyline(polyCoords, lineOpts).addTo(map);
        polyline.bindTooltip(l.name);
        lineLayers.push(polyline);
      });
    }

    function selectMarker(markerId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'marker_press',
        id: markerId
      }));
    }

    function focusOnMarker(markerId) {
      var m = markersList[markerId];
      if (m) {
        map.setView(m.getLatLng(), 16);
        m.openPopup();
      }
    }

    window.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'location') {
          updateLocation(data.lat, data.lng, data.heading, data.speed);
        } else if (data.type === 'markers') {
          updateMarkers(data.markers || []);
        } else if (data.type === 'zones') {
          updateZones(data.zones || []);
        } else if (data.type === 'lines') {
          updateLines(data.lines || []);
        } else if (data.type === 'focus_marker') {
          focusOnMarker(data.id);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>
`;

export const LocationMap: React.FC<LocationMapProps> = ({
  currentLocation,
  mapType = 'jurisdiction',
  markers = [],
  zones = [],
  lines = [],
  height = 300,
  interactive = true,
  onMarkerSelect,
  forceWebView: _forceWebView = false,
}) => {
  const webViewRef = useRef<WebView>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sendMessageToMap = useCallback((message: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  // Set initial map state injection and bypass race conditions
  const mapHtml = useMemo(() => {
    if (!currentLocation) {
      return MAP_HTML;
    }

    // Inject custom preset markers, lines, boundaries based on map types
    const markersStr = JSON.stringify(markers);
    const zonesStr = JSON.stringify(zones);
    const linesStr = JSON.stringify(lines);

    const injection = `
      map.setView([${currentLocation.lat}, ${currentLocation.lng}], ${
      mapType === 'cockpit' ? 16 : 14
    });
      updateLocation(${currentLocation.lat}, ${currentLocation.lng}, ${
      currentLocation.heading || 'null'
    }, ${currentLocation.speed || 'null'});
      try {
        updateMarkers(${markersStr});
        updateZones(${zonesStr});
        updateLines(${linesStr});
      } catch (e) {}
    `;
    return MAP_HTML.replace('// INITIALIZATION_INJECTION', injection);
  }, [currentLocation, mapType, markers, zones, lines]);

  // Sync update coordinates
  useEffect(() => {
    if (currentLocation) {
      sendMessageToMap({
        type: 'location',
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        heading: currentLocation.heading,
        speed: currentLocation.speed,
      });
    }
  }, [currentLocation, sendMessageToMap]);

  // Sync update markers
  useEffect(() => {
    if (markers.length > 0) {
      sendMessageToMap({ type: 'markers', markers });
    }
  }, [markers, sendMessageToMap]);

  // Sync update zones
  useEffect(() => {
    sendMessageToMap({ type: 'zones', zones });
  }, [zones, sendMessageToMap]);

  // Sync update lines
  useEffect(() => {
    sendMessageToMap({ type: 'lines', lines });
  }, [lines, sendMessageToMap]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker_press' && onMarkerSelect) {
        const found = markers.find((m) => m.id === data.id);
        if (found) {
          onMarkerSelect(found);
        }
      }
    } catch (e) {}
  };

  if (!currentLocation) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Map size={48} color={colors.textSecondary} />
        <Text style={styles.placeholderTitle}>No Location Data</Text>
        <Text style={styles.placeholderSub}>
          Enable GPS to see your position
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={interactive}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        onMessage={handleMessage}
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  map: {
    backgroundColor: '#070D19',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeholderSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
