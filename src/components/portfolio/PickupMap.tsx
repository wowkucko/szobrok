"use client";

import { useEffect, useRef } from "react";

export interface PickupPoint {
  lat: number;
  lng: number;
  label: string;
  /** Pontos átvételi cím (a popupban jelenik meg). */
  address: string;
  /** Nyitvatartás / átvételi időpontok (a popupban jelenik meg). */
  hours: string;
}

/** A személyes átvételi pontok (Budapest, Fót, Csomád, Veresegyház). */
export const PICKUP_POINTS: PickupPoint[] = [
  {
    lat: 47.532397,
    lng: 19.066205,
    label: "Budapest",
    address: "1138 Budapest, Váci út",
    hours: "Előre egyeztetett időpontban",
  },
  {
    lat: 47.618209,
    lng: 19.194557,
    label: "Fót",
    address: "2151 Fót, Móricz Zsigmond utca",
    hours: "Előre egyeztetett időpontban",
  },
  {
    lat: 47.650707,
    lng: 19.236467,
    label: "Csomád",
    address: "Csomád, József Attila utca",
    hours: "Előre egyeztetett időpontban",
  },
  {
    lat: 47.654799,
    lng: 19.280142,
    label: "Veresegyház",
    address: "2112 Veresegyház, Pacsirta utca",
    hours: "Előre egyeztetett időpontban",
  },
];

/** A marker-popup HTML-je: cím + nyitvatartás sorokkal. */
function popupHtml(p: PickupPoint): string {
  const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  return `
    <strong>${p.label}</strong>
    <div class="pickup-popup-sub">Átvételi pont</div>
    <div class="pickup-popup-row">${pinIcon}<span>${p.address}</span></div>
    <div class="pickup-popup-row">${clockIcon}<span>${p.hours}</span></div>
  `;
}

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="42" aria-hidden="true">
  <defs>
    <linearGradient id="pickup-pin-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbbf24"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <path d="M12 2 C7 2 3.5 5.8 3.5 10.5 C3.5 16 12 22 12 22 C12 22 20.5 16 20.5 10.5 C20.5 5.8 17 2 12 2 Z" fill="url(#pickup-pin-g)"/>
  <circle cx="12" cy="10.5" r="3.4" fill="#0c0c0c" opacity="0.85"/>
</svg>`;

export default function PickupMap({
  className = "",
  frameless = false,
}: {
  className?: string;
  /** Keret nélkül (pl. csempébe ágyazva, ahol a kártya adja a keretet). */
  frameless?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ map: L.Map } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    // A Leaflet JS + CSS csak akkor töltődik be, ha a térkép közel kerül a
    // képernyőhöz — így a főoldal kritikus útvonalán nem szerepel sem a
    // Leaflet CSS (render-blocking), sem a térkép JS, sem az OSM csempék.
    const initMap = async () => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: false });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = L.divIcon({
        className: "pickup-pin",
        html: PIN_SVG,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40],
      });

      const markers = PICKUP_POINTS.map((p) =>
        L.marker([p.lat, p.lng], { icon }).bindPopup(popupHtml(p))
      );

      const group = L.featureGroup(markers);
      group.addTo(map);
      map.fitBounds(group.getBounds(), { padding: [28, 28], maxZoom: 13 });

      L.control.zoom({ position: "topright" }).addTo(map);

      mapRef.current = { map };
    };

    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      void initMap();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer?.disconnect();
            void initMap();
          }
        },
        { rootMargin: "300px 0px" }
      );
      observer.observe(el);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      className={`pickup-map overflow-hidden ${
        frameless ? "" : "rounded-2xl border border-zinc-800"
      } ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />
      <style>{`
        /* A Leaflet belső panelei magas z-indexeket használnak (tile 200,
           marker 600, popup 700). Stacking context nélkül ezek görgetéskor
           a sticky menüsor (z-40) fölé kerülhetnek. Az izoláció a teljes
           térképet egy alacsony, önálló rétegbe zárja. */
        .pickup-map {
          position: relative;
          z-index: 0;
          isolation: isolate;
        }
        .pickup-map .leaflet-container {
          background: #18181b;
          font-family: inherit;
        }
        /* Sötét térkép-stílus a weboldal prémium megjelenéséhez */
        .pickup-map .leaflet-tile-pane {
          filter: grayscale(1) invert(1) hue-rotate(200deg) brightness(0.92) contrast(0.9) saturate(0.4);
        }
        .pickup-pin {
          background: transparent !important;
          border: none !important;
        }
        .pickup-map .leaflet-popup-content-wrapper {
          background: #18181b;
          color: #f4f4f5;
          border: 1px solid #3f3f46;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .pickup-map .leaflet-popup-tip {
          background: #18181b;
          border: 1px solid #3f3f46;
        }
        .pickup-map .leaflet-popup-content {
          margin: 10px 14px;
          font-size: 13px;
          line-height: 1.4;
        }
        .pickup-map .leaflet-popup-content strong {
          color: #fbbf24;
          font-weight: 600;
        }
        .pickup-map .pickup-popup-sub {
          color: #a1a1aa;
          font-size: 11px;
        }
        .pickup-map .pickup-popup-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-top: 6px;
          color: #d4d4d8;
          font-size: 12px;
          line-height: 1.4;
        }
        .pickup-map .pickup-popup-row svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .pickup-map .leaflet-container a.leaflet-popup-close-button {
          color: #71717a;
        }
        .pickup-map .leaflet-control-zoom {
          border: 1px solid #3f3f46 !important;
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4) !important;
        }
        .pickup-map .leaflet-control-zoom a {
          background: #18181b !important;
          color: #e4e4e7 !important;
          border-bottom: 1px solid #3f3f46 !important;
        }
        .pickup-map .leaflet-control-zoom a:hover {
          background: #27272a !important;
          color: #fbbf24 !important;
        }
        .pickup-map .leaflet-control-attribution {
          background: rgba(24, 24, 27, 0.75) !important;
          color: #71717a !important;
          font-size: 10px;
        }
        .pickup-map .leaflet-control-attribution a {
          color: #a1a1aa !important;
        }
      `}</style>
    </div>
  );
}
