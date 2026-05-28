import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Map } from 'lucide-react-native';

interface MapLocation {
  lat: number;
  lng: number;
  heading?: number;
}

interface ZoneOverlay {
  type: string;
  name: string;
  coords: { lat: number; lng: number }[];
  severity: 'low' | 'medium' | 'high';
}

interface LocationMapProps {
  currentLocation?: MapLocation;
  zones?: ZoneOverlay[];
  height?: number;
  interactive?: boolean;
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F172A; }
    #map { width: 100vw; height: 100vh; background: #0F172A; }

    /* ── Coordinate Badge ─────────────────────────────── */
    .coord-badge {
      position: fixed; bottom: 10px; left: 10px;
      background: rgba(15,23,42,0.82);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(6,182,212,0.18);
      padding: 5px 10px; border-radius: 6px;
      font-size: 11px; color: rgba(6,182,212,0.85);
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      z-index: 1000; letter-spacing: 0.5px;
      transition: all 0.4s ease;
    }
    .coord-badge.offline {
      border-color: rgba(6,182,212,0.35);
      box-shadow: 0 0 12px rgba(6,182,212,0.08);
    }

    /* ── Offline Status Badge ─────────────────────────── */
    .offline-badge {
      position: fixed; bottom: 10px; right: 10px;
      background: rgba(15,23,42,0.88);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(6,182,212,0.22);
      padding: 6px 14px; border-radius: 8px;
      font-size: 10px; color: #06B6D4;
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
      background: #06B6D4;
      animation: pulseDot 2s ease-in-out infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 0.4; box-shadow: 0 0 0 0 rgba(6,182,212,0.4); }
      50% { opacity: 1; box-shadow: 0 0 8px 3px rgba(6,182,212,0.25); }
    }

    /* ── Online transition overlay ────────────────────── */
    .reconnect-flash {
      position: fixed; inset: 0; z-index: 2000;
      background: radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 70%);
      opacity: 0; pointer-events: none;
      transition: opacity 0.6s ease;
    }
    .reconnect-flash.active { opacity: 1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="coord-badge" id="coordBadge"></div>
  <div class="offline-badge" id="offlineBadge">
    <span class="pulse-dot"></span>
    <span>OFFLINE MODE &middot; Tactical Grid</span>
  </div>
  <div class="reconnect-flash" id="reconnectFlash"></div>

  <script>
    /* ================================================================
       TACTICAL OFFLINE GRID LAYER
       A custom L.GridLayer that renders a canvas-based tactical grid
       when the device is offline.
       ================================================================ */
    var TacticalGridLayer = L.GridLayer.extend({
      _scanOffset: 0,
      _animFrame: null,

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

        /* ── Background ─────────────────────────────── */
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, w, h);

        /* ── Minor gridlines every 40px ─────────────── */
        ctx.strokeStyle = 'rgba(6,182,212,0.10)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (var x = 0; x < w; x += 40) {
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (var y = 0; y < h; y += 40) {
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        /* ── Major gridlines every 120px ────────────── */
        ctx.strokeStyle = 'rgba(6,182,212,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x2 = 0; x2 < w; x2 += 120) {
          ctx.moveTo(x2, 0); ctx.lineTo(x2, h);
        }
        for (var y2 = 0; y2 < h; y2 += 120) {
          ctx.moveTo(0, y2); ctx.lineTo(w, y2);
        }
        ctx.stroke();

        /* ── Intersection dots ──────────────────────── */
        ctx.fillStyle = 'rgba(6,182,212,0.22)';
        for (var ix = 0; ix < w; ix += 120) {
          for (var iy = 0; iy < h; iy += 120) {
            ctx.beginPath();
            ctx.arc(ix, iy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        /* ── Coordinate labels at major intersections ─ */
        var map = this._map;
        if (map) {
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(6,182,212,0.30)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          for (var lx = 0; lx < w; lx += 120) {
            for (var ly = 0; ly < h; ly += 120) {
              var tileOrigin = coords.scaleBy(sz);
              var latlng = map.unproject([tileOrigin.x + lx, tileOrigin.y + ly], coords.z);
              var label = latlng.lat.toFixed(3) + ', ' + latlng.lng.toFixed(3);
              ctx.fillText(label, lx + 4, ly + 4);
            }
          }
        }

        /* ── Subtle corner glow on each tile ────────── */
        var grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.7);
        grad.addColorStop(0, 'rgba(6,182,212,0.02)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      },

      /* Animated scanning line – runs once added to map */
      onAdd: function(map) {
        L.GridLayer.prototype.onAdd.call(this, map);
        this._startScanAnimation();
        return this;
      },
      onRemove: function(map) {
        this._stopScanAnimation();
        L.GridLayer.prototype.onRemove.call(this, map);
        return this;
      },

      _startScanAnimation: function() {
        var self = this;
        var scanCanvas = document.createElement('canvas');
        scanCanvas.id = 'tactical-scan-overlay';
        scanCanvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:450;';
        document.body.appendChild(scanCanvas);
        self._scanCanvas = scanCanvas;

        function animateScan() {
          var c = self._scanCanvas;
          if (!c) return;
          c.width = window.innerWidth;
          c.height = window.innerHeight;
          var ctx = c.getContext('2d');
          ctx.clearRect(0, 0, c.width, c.height);

          /* Sweeping horizontal scan line */
          self._scanOffset = (self._scanOffset + 0.4) % c.height;
          var sy = self._scanOffset;
          var scanGrad = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
          scanGrad.addColorStop(0, 'transparent');
          scanGrad.addColorStop(0.5, 'rgba(6,182,212,0.07)');
          scanGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = scanGrad;
          ctx.fillRect(0, sy - 30, c.width, 60);

          /* Thin bright line at center */
          ctx.strokeStyle = 'rgba(6,182,212,0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(c.width, sy);
          ctx.stroke();

          self._animFrame = requestAnimationFrame(animateScan);
        }
        self._animFrame = requestAnimationFrame(animateScan);
      },

      _stopScanAnimation: function() {
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        var el = document.getElementById('tactical-scan-overlay');
        if (el) el.parentNode.removeChild(el);
        this._scanCanvas = null;
      }
    });

    /* ================================================================
       MAP INIT
       ================================================================ */
    var map = L.map('map', {
      attributionControl: false,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    var osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    });
    var tacticalGrid = new TacticalGridLayer({ maxZoom: 19 });

    var isOffline = !navigator.onLine;

    function applyNetworkState() {
      var badge = document.getElementById('offlineBadge');
      var coordEl = document.getElementById('coordBadge');
      if (isOffline) {
        /* Switch to tactical grid */
        if (map.hasLayer(osmTileLayer)) map.removeLayer(osmTileLayer);
        if (!map.hasLayer(tacticalGrid)) tacticalGrid.addTo(map);
        badge.classList.add('visible');
        coordEl.classList.add('offline');
        /* Prefix coord badge */
        var raw = coordEl.textContent.replace(/^OFFLINE\s*\u00b7\s*/, '');
        coordEl.textContent = 'OFFLINE · ' + raw;
      } else {
        /* Switch to OSM tiles */
        if (map.hasLayer(tacticalGrid)) map.removeLayer(tacticalGrid);
        if (!map.hasLayer(osmTileLayer)) osmTileLayer.addTo(map);
        badge.classList.remove('visible');
        coordEl.classList.remove('offline');
        coordEl.textContent = coordEl.textContent.replace(/^OFFLINE\s*\u00b7\s*/, '');
        /* Flash reconnect effect */
        var flash = document.getElementById('reconnectFlash');
        flash.classList.add('active');
        setTimeout(function() { flash.classList.remove('active'); }, 800);
      }
    }

    /* Initial state */
    applyNetworkState();

    /* Seamless transitions */
    window.addEventListener('online', function() {
      isOffline = false;
      applyNetworkState();
    });
    window.addEventListener('offline', function() {
      isOffline = true;
      applyNetworkState();
    });

    var userMarker = null;
    var zoneLayers = [];

    // INITIALIZATION_INJECTION

    function updateLocation(lat, lng) {
      var prefix = isOffline ? 'OFFLINE \u00b7 ' : '';
      document.getElementById('coordBadge').textContent = prefix + lat.toFixed(4) + ', ' + lng.toFixed(4);
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], {
          title: 'You are here'
        }).addTo(map);
      }
      map.setView([lat, lng], map.getZoom() < 14 ? 14 : map.getZoom());
    }

    function updateZones(zones) {
      zoneLayers.forEach(function(l) { map.removeLayer(l); });
      zoneLayers = [];
      zones.forEach(function(zone) {
        var coords = zone.coords.map(function(c) { return [c.lat, c.lng]; });
        var color = zone.severity === 'high' ? '#ef4444' :
                    zone.severity === 'medium' ? '#f59e0b' : '#3b82f6';
        var polygon = L.polygon(coords, {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
        polygon.bindTooltip(zone.name);
        zoneLayers.push(polygon);
      });
    }

    window.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'location') {
          updateLocation(data.lat, data.lng);
        } else if (data.type === 'zones') {
          updateZones(data.zones || []);
        } else if (data.type === 'init') {
          if (data.lat && data.lng) updateLocation(data.lat, data.lng);
          if (data.zones) updateZones(data.zones);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>
`;

import { useAppMode } from '../hooks/useAppMode';
import { Compass, Navigation } from 'lucide-react-native';

export const LocationMap: React.FC<LocationMapProps> = ({
  currentLocation,
  zones = [],
  height = 300,
  interactive = true,
}) => {
  const webViewRef = useRef<WebView>(null);
  const { isCar } = useAppMode();

  const sendMessageToMap = useCallback((message: object) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  // Dynamically inject the coordinates and zones into the Leaflet script upon mount
  // to completely eliminate webview message-handling race conditions.
  const mapHtml = React.useMemo(() => {
    if (!currentLocation) return MAP_HTML;
    const injection = `
      map.setView([${currentLocation.lat}, ${currentLocation.lng}], 14);
      userMarker = L.marker([${currentLocation.lat}, ${currentLocation.lng}], {
        title: 'You are here'
      }).addTo(map);
      document.getElementById('coordBadge').textContent = "${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}";
      try {
        updateZones(${JSON.stringify(zones)});
      } catch (e) {}
    `;
    return MAP_HTML.replace('// INITIALIZATION_INJECTION', injection);
  }, [currentLocation, zones]);

  useEffect(() => {
    if (currentLocation && !isCar) {
      sendMessageToMap({ type: 'location', lat: currentLocation.lat, lng: currentLocation.lng });
    }
  }, [currentLocation, isCar, sendMessageToMap]);

  if (!currentLocation) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Map size={48} color={COLORS.textSecondary} />
        <Text style={styles.placeholderTitle}>No Location Data</Text>
        <Text style={styles.placeholderSub}>Enable GPS to see your position</Text>
      </View>
    );
  }

  // Optimized Car Mode view: Disable heavy WebViews completely to prevent OOM
  if (isCar) {
    const heading = currentLocation.heading !== undefined && currentLocation.heading !== null
      ? currentLocation.heading
      : 0;

    const getHeadingDirection = (deg: number) => {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
      return directions[idx];
    };

    return (
      <View style={[styles.carContainer, { height }]}>
        <View style={styles.carRow}>
          <Compass size={40} color="#00E5FF" style={{ ...SHADOWS.glow('#00E5FF') }} />
          <View style={styles.carInfo}>
            <Text style={styles.carInfoTitle}>TACTICAL TELEMETRY</Text>
            <Text style={styles.carInfoCoords}>
              {currentLocation.lat.toFixed(5)}°N, {currentLocation.lng.toFixed(5)}°E
            </Text>
            <Text style={styles.carInfoSub}>HEADING: {heading.toFixed(0)}° {getHeadingDirection(heading)}</Text>
          </View>
        </View>
        <View style={[styles.compassContainer, { ...SHADOWS.glow('#00E676') }]}>
          <Navigation 
            size={32} 
            color="#00E676" 
            style={{ 
              transform: [{ rotate: `${heading - 45}deg` }] 
            }} 
          />
          <Text style={styles.compassLabel}>{getHeadingDirection(heading)}</Text>
        </View>
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
        domStorageEnabled={false}
        originWhitelist={['*']}
        onMessage={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  map: {
    backgroundColor: '#0F172A',
  },
  carContainer: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#262626',
    borderRadius: BORDER_RADIUS.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  carInfo: {
    justifyContent: 'center',
  },
  carInfoTitle: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  carInfoCoords: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  carInfoSub: {
    color: '#A3A3A3',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    backgroundColor: '#0A0A0A',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#262626',
  },
  arrow: {
    transform: [{ rotate: '45deg' }],
  },
  compassLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    top: 4,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  placeholderSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
