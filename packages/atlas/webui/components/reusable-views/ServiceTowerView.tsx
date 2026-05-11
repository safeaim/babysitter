"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ServiceTowerFloor, ServiceTowerRoom, ServiceTowerViewData } from "./types";
import styles from "./ServiceTowerView.module.css";

const ISO_K = 0.55;
const ISO_OX = 980;
const ISO_OY = 500;
const COS = 0.866;
const SIN = 0.5;
const CELL = 200;
const ROOM_GAP = 4;
const FLOOR_W = 4 * CELL + 3 * ROOM_GAP;
const FLOOR_H = 4 * CELL + 3 * ROOM_GAP;
const FLOOR_GAP_Z = 180;
const SLAB_H = 22;
const WALL_H = 78;
const VB = { w: 1960, h: 1200 };

const ROOM_LAYOUTS = [
  { x: 0, y: 0, w: 3, h: 2 },
  { x: 3, y: 0, w: 1, h: 2 },
  { x: 0, y: 2, w: 2, h: 2 },
  { x: 2, y: 2, w: 2, h: 2 },
];

function iso(x: number, y: number, z = 0) {
  return [(x - y) * COS * ISO_K + ISO_OX, (x + y) * SIN * ISO_K - z * ISO_K + ISO_OY] as const;
}

function points(...values: ReadonlyArray<readonly [number, number]>) {
  return values.map((value) => value.join(",")).join(" ");
}

function shade(hex: string, ratio = 0.68, target = "#0a080d") {
  const source = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "c98a3e";
  const targetHex = target.replace("#", "");
  const sourceRgb = [0, 2, 4].map((index) => Number.parseInt(source.slice(index, index + 2), 16));
  const targetRgb = [0, 2, 4].map((index) => Number.parseInt(targetHex.slice(index, index + 2), 16));
  const mixed = sourceRgb.map((value, index) => Math.round(value * ratio + targetRgb[index] * (1 - ratio)));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function IsoTile({ x, y, w, h, z, fill, stroke = "rgba(240,230,209,.2)", opacity = 1 }: {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  fill: string;
  stroke?: string;
  opacity?: number;
}) {
  return (
    <polygon
      points={points(iso(x, y, z), iso(x + w, y, z), iso(x + w, y + h, z), iso(x, y + h, z))}
      fill={fill}
      stroke={stroke}
      strokeWidth={0.7}
      opacity={opacity}
    />
  );
}

function IsoBox({ x, y, w, h, z, height, color, opacity = 1 }: {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  height: number;
  color: string;
  opacity?: number;
}) {
  const base2 = iso(x + w, y, z);
  const base3 = iso(x + w, y + h, z);
  const base4 = iso(x, y + h, z);
  const top1 = iso(x, y, z + height);
  const top2 = iso(x + w, y, z + height);
  const top3 = iso(x + w, y + h, z + height);
  const top4 = iso(x, y + h, z + height);
  return (
    <g opacity={opacity}>
      <polygon points={points(base3, base2, top2, top3)} fill={shade(color, 0.58)} stroke="rgba(240,230,209,.2)" strokeWidth={0.7} />
      <polygon points={points(base4, base3, top3, top4)} fill={shade(color, 0.42)} stroke="rgba(240,230,209,.18)" strokeWidth={0.7} />
      <polygon points={points(top1, top2, top3, top4)} fill={color} stroke="rgba(240,230,209,.26)" strokeWidth={0.8} />
    </g>
  );
}

function centerOfRoom(layout: typeof ROOM_LAYOUTS[number], z: number) {
  return iso(
    layout.x * (CELL + ROOM_GAP) + layout.w * CELL / 2,
    layout.y * (CELL + ROOM_GAP) + layout.h * CELL / 2,
    z + WALL_H + 26,
  );
}

function floorCamera(floorIndex: number | null) {
  if (floorIndex == null) return "translate(0 0) scale(1)";
  const z = floorIndex * FLOOR_GAP_Z;
  const center = iso(FLOOR_W / 2, FLOOR_H / 2, z + WALL_H / 2);
  const scale = 1.55;
  const dx = VB.w / 2 - center[0] * scale;
  const dy = VB.h / 2 - center[1] * scale;
  return `translate(${dx} ${dy}) scale(${scale})`;
}

function roomCamera(floorIndex: number | null, roomIndex: number | null) {
  if (floorIndex == null || roomIndex == null) return floorCamera(floorIndex);
  const layout = ROOM_LAYOUTS[roomIndex] ?? ROOM_LAYOUTS[0];
  const center = centerOfRoom(layout, floorIndex * FLOOR_GAP_Z);
  const scale = 2.1;
  const dx = VB.w / 2 - center[0] * scale;
  const dy = VB.h / 2 - center[1] * scale;
  return `translate(${dx} ${dy}) scale(${scale})`;
}

function RoomShape({ room, roomIndex, floorIndex, selected, dimmed, onSelect }: {
  room: ServiceTowerRoom;
  roomIndex: number;
  floorIndex: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const layout = ROOM_LAYOUTS[roomIndex] ?? ROOM_LAYOUTS[0];
  const x = layout.x * (CELL + ROOM_GAP);
  const y = layout.y * (CELL + ROOM_GAP);
  const w = layout.w * CELL + (layout.w - 1) * ROOM_GAP;
  const h = layout.h * CELL + (layout.h - 1) * ROOM_GAP;
  const z = floorIndex * FLOOR_GAP_Z;
  const label = centerOfRoom(layout, z);
  const serviceCount = Math.min(room.services.length, 4);

  return (
    <g className={`${styles.roomGroup} ${selected ? styles.focused : ""} ${dimmed ? styles.dimmed : ""}`} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <IsoBox x={x} y={y} w={w} h={h} z={z + SLAB_H} height={WALL_H} color={room.color} opacity={selected ? 1 : 0.9} />
      {Array.from({ length: serviceCount }).map((_, index) => {
        const sx = x + 28 + (index % 2) * Math.max(46, w / 2 - 20);
        const sy = y + 28 + Math.floor(index / 2) * Math.max(46, h / 2 - 20);
        return <IsoBox key={index} x={sx} y={sy} w={Math.min(62, w / 3)} h={Math.min(42, h / 4)} z={z + SLAB_H + 6} height={18} color={shade(room.color, 0.88, "#f0e6d1")} opacity={0.72} />;
      })}
      <text className={styles.roomLabel} x={label[0]} y={label[1] - 8} textAnchor="middle">{room.label.slice(0, 24)}</text>
      <text className={styles.roomSubLabel} x={label[0]} y={label[1] + 12} textAnchor="middle">{room.metricValue} {room.metricLabel}</text>
    </g>
  );
}

function FloorShape({ floor, floorIndex, activeFloorIndex, activeRoomIndex, onFloorSelect, onRoomSelect }: {
  floor: ServiceTowerFloor;
  floorIndex: number;
  activeFloorIndex: number | null;
  activeRoomIndex: number | null;
  onFloorSelect: () => void;
  onRoomSelect: (roomIndex: number) => void;
}) {
  const z = floorIndex * FLOOR_GAP_Z;
  const activeFloor = activeFloorIndex === floorIndex;
  const otherFloorFocused = activeFloorIndex != null && !activeFloor;
  const label = iso(FLOOR_W + 80, FLOOR_H / 2, z + WALL_H + 30);
  return (
    <g className={`${styles.floorGroup} ${activeFloor ? styles.focused : ""} ${otherFloorFocused ? styles.dimmed : ""}`} onClick={onFloorSelect}>
      <IsoBox x={-18} y={-18} w={FLOOR_W + 36} h={FLOOR_H + 36} z={z} height={SLAB_H} color="#2a2331" opacity={0.96} />
      <IsoTile x={0} y={0} w={FLOOR_W} h={FLOOR_H} z={z + SLAB_H + 1} fill="rgba(240,230,209,.05)" />
      {floor.rooms.map((room, roomIndex) => (
        <RoomShape
          key={room.id}
          room={room}
          roomIndex={roomIndex}
          floorIndex={floorIndex}
          selected={activeFloor && activeRoomIndex === roomIndex}
          dimmed={activeFloor && activeRoomIndex != null && activeRoomIndex !== roomIndex}
          onSelect={() => onRoomSelect(roomIndex)}
        />
      ))}
      <text className={styles.floorLabel} x={label[0]} y={label[1]}>{floor.label}</text>
    </g>
  );
}

function selectedRoom(data: ServiceTowerViewData, floorIndex: number | null, roomIndex: number | null) {
  if (floorIndex == null) return null;
  if (roomIndex == null) return null;
  return data.floors[floorIndex]?.rooms[roomIndex] ?? null;
}

function Drawer({ data, activeFloorIndex, activeRoomIndex, onFloorSelect, onRoomSelect }: {
  data: ServiceTowerViewData;
  activeFloorIndex: number | null;
  activeRoomIndex: number | null;
  onFloorSelect: (floorIndex: number | null) => void;
  onRoomSelect: (roomIndex: number) => void;
}) {
  const floor = activeFloorIndex == null ? null : data.floors[activeFloorIndex];
  const room = selectedRoom(data, activeFloorIndex, activeRoomIndex);

  if (room) {
    return (
      <aside className={styles.drawer}>
        <div className={styles.drawerInner}>
          <div>
            <div className={styles.drawerEyebrow}><span className={styles.seal} style={{ background: room.color }} />{room.eyebrow}</div>
            <h3 className={styles.drawerName}>{room.label}</h3>
            <div className={styles.drawerId}>{room.id} · {room.metricValue} {room.metricLabel}</div>
          </div>
          <p className={styles.drawerBlurb}>{room.summary}</p>
          <section>
            <h4 className={styles.sectionTitle}>Service lines</h4>
            <ul className={styles.serviceList}>
              {room.services.map((service) => (
                <li key={service.code} className={styles.serviceCard}>
                  <div className={styles.serviceCode}>{service.code}</div>
                  <strong>{service.name}</strong>
                  <p>{service.summary}</p>
                  <ul className={styles.kpis}>{service.kpis.map((kpi) => <li key={kpi}>{kpi}</li>)}</ul>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className={styles.sectionTitle}>Graph records</h4>
            <ul className={styles.recordList}>
              {room.records.map((record) => (
                <li key={record.id} className={styles.recordCard}>
                  <Link href={record.href}>{record.label}</Link>
                  <span className={styles.recordKind}>{record.kind}</span>
                  <p>{record.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    );
  }

  if (floor) {
    return (
      <aside className={styles.drawer}>
        <div className={styles.drawerInner}>
          <div>
            <div className={styles.drawerEyebrow}><span className={styles.seal} />Service floor</div>
            <h3 className={styles.drawerName}>{floor.label}</h3>
            <div className={styles.drawerId}>{floor.id} · {floor.rooms.length} rooms</div>
          </div>
          <p className={styles.drawerBlurb}>{floor.subtitle}</p>
          <section>
            <h4 className={styles.sectionTitle}>Rooms</h4>
            <ul className={styles.roomList}>
              {floor.rooms.map((room, roomIndex) => (
                <li key={room.id} className={styles.roomCard}>
                  <button type="button" onClick={() => onRoomSelect(roomIndex)}>
                    <span className={styles.cardTitle}>{room.label}</span>
                    <span className={styles.recordKind}> · {room.kind} · {room.metricValue} records</span>
                  </button>
                  <p className={styles.cardText}>{room.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.drawer}>
      <div className={styles.drawerInner}>
        <div>
          <div className={styles.drawerEyebrow}><span className={styles.seal} />A5C service catalog</div>
          <h3 className={styles.drawerName}>Walk the building.</h3>
          <div className={styles.drawerId}>cursor: idle · awaiting selection</div>
        </div>
        <p className={styles.drawerBlurb}>Click a floor to step inside. Click a room to inspect service lines and graph records. Use the breadcrumb to step back.</p>
        <section>
          <h4 className={styles.sectionTitle}>Floors</h4>
          <ul className={styles.roomList}>
            {data.floors.map((floor, floorIndex) => (
              <li key={floor.id} className={styles.roomCard}>
                <button type="button" onClick={() => onFloorSelect(floorIndex)}>
                  <span className={styles.cardTitle}>{floor.label}</span>
                  <span className={styles.recordKind}> · {floor.rooms.length} rooms</span>
                </button>
                <p className={styles.cardText}>{floor.subtitle}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

export function ServiceTowerView({ data }: { data: ServiceTowerViewData }) {
  const [activeFloorIndex, setActiveFloorIndex] = useState<number | null>(null);
  const [activeRoomIndex, setActiveRoomIndex] = useState<number | null>(null);
  const camera = useMemo(() => roomCamera(activeFloorIndex, activeRoomIndex), [activeFloorIndex, activeRoomIndex]);
  const room = selectedRoom(data, activeFloorIndex, activeRoomIndex);

  const selectFloor = (floorIndex: number | null) => {
    setActiveFloorIndex(floorIndex);
    setActiveRoomIndex(null);
  };

  const selectRoom = (roomIndex: number) => {
    setActiveRoomIndex(roomIndex);
  };

  return (
    <section className={styles.tower} id={data.id}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.eyebrow}><span className={styles.seal} />{data.eyebrow}</div>
          <h2 className={styles.title}>{data.title} <em>tower</em></h2>
          <p className={styles.subtitle}>{data.subtitle}</p>
        </div>
        <nav className={styles.nav}>
          <a href="#tower-stage">Floors</a>
          <Link href="/graph">{data.ctaLabel}</Link>
        </nav>
      </header>
      <div className={styles.layout}>
        <div className={styles.stage} id="tower-stage">
          <div className={styles.stageBar}>
            <div className={styles.crumbs}>
              <button type="button" className={activeFloorIndex == null ? styles.active : undefined} onClick={() => selectFloor(null)}>Building</button>
              {activeFloorIndex != null ? <span>›</span> : null}
              {activeFloorIndex != null ? <button type="button" className={activeRoomIndex == null ? styles.active : undefined} onClick={() => selectFloor(activeFloorIndex)}>{data.floors[activeFloorIndex]?.label}</button> : null}
              {room ? <span>›</span> : null}
              {room ? <button type="button" className={styles.active}>{room.label}</button> : null}
            </div>
            <div className={styles.domainLegend}>
              {data.domains.map((domain) => (
                <span key={domain.id}><i className={styles.swatch} style={{ background: domain.color, borderColor: domain.color }} />{domain.label}</span>
              ))}
            </div>
          </div>
          <div className={styles.svgWrap}>
            <svg className={styles.svg} viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label={`${data.title} service tower`}>
              <defs>
                <linearGradient id={`${data.id}-sky`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1b1724" />
                  <stop offset="1" stopColor="#0b0a0f" />
                </linearGradient>
              </defs>
              <rect width={VB.w} height={VB.h} fill={`url(#${data.id}-sky)`} />
              <g className={styles.camera} transform={camera}>
                {[...data.floors].map((floor, index) => ({ floor, index })).reverse().map(({ floor, index }) => (
                  <FloorShape
                    key={floor.id}
                    floor={floor}
                    floorIndex={index}
                    activeFloorIndex={activeFloorIndex}
                    activeRoomIndex={activeRoomIndex}
                    onFloorSelect={() => selectFloor(index)}
                    onRoomSelect={(roomIndex) => { setActiveFloorIndex(index); selectRoom(roomIndex); }}
                  />
                ))}
              </g>
            </svg>
          </div>
          <footer className={styles.footer}>
            <div className={styles.stats}>
              {data.stats.map((stat) => (
                <span key={stat.label}><b className={styles.statValue}>{stat.value}</b><span className={styles.statLabel}>{stat.label}</span></span>
              ))}
            </div>
            <span>esc-free · graph-backed reusable view</span>
          </footer>
        </div>
        <Drawer data={data} activeFloorIndex={activeFloorIndex} activeRoomIndex={activeRoomIndex} onFloorSelect={selectFloor} onRoomSelect={selectRoom} />
      </div>
    </section>
  );
}
