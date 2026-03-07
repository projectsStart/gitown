import './App.css'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// ─── Types ───────────────────────────────────────────────────────────────────

type TileType = 'grass' | 'path' | 'house'

type Tile = {
  id: number
  type: TileType
  commit?: CommitInfo
}

type CommitInfo = {
  sha: string
  message: string
  authorName: string
  url: string
  date: string
  commitCount?: number  // total commits by this author
}

// Tier 1 = cottage (1 commit), up to Tier 5 = skyscraper (30+ commits)
type Tier = 1 | 2 | 3 | 4 | 5

// ─── Config ──────────────────────────────────────────────────────────────────

const GRID_SIZE = 10
const STARTER_HOUSES = [12, 17, 66, 73]
const GITHUB_OWNER = 'projectsStart'
const GITHUB_REPO = 'gitown'
const TERRAIN_RADIUS = 5

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getTier(commitCount: number): Tier {
  if (commitCount >= 30) return 5   // skyscraper
  if (commitCount >= 15) return 4   // tower
  if (commitCount >= 7)  return 3   // mansion
  if (commitCount >= 3)  return 2   // house
  return 1                           // cottage
}

const TIER_LABELS: Record<Tier, string> = {
  1: 'Cottage',
  2: 'House',
  3: 'Mansion',
  4: 'Tower',
  5: 'Skyscraper',
}

// ─── Grid helpers ────────────────────────────────────────────────────────────

const createBaseTown = (): Tile[] => {
  const mid = Math.floor(GRID_SIZE / 2)
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
    const isPath = i % GRID_SIZE === mid
    const isStarterHouse = STARTER_HOUSES.includes(i)
    const type: TileType = isStarterHouse ? 'house' : isPath ? 'path' : 'grass'
    return { id: i, type }
  })
}

const baseGrid: Tile[] = createBaseTown()

// ─── Building builders by tier ────────────────────────────────────────────────

function buildCottage(hash: number, bodyH: number): THREE.Group {
  // Tier 1 — small stone cottage, single gabled roof
  const g = new THREE.Group()
  const wallColor = new THREE.Color().setHSL(0.08 + (hash % 4) * 0.02, 0.22, 0.30 + (hash % 4) * 0.03)

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, bodyH, 0.65),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 }),
  )
  body.position.y = bodyH / 2
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)

  const roofH = 0.45
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, roofH, 4),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.63, 0.45, 0.16), roughness: 0.9 }),
  )
  roof.position.y = bodyH + roofH / 2
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  g.add(roof)

  return g
}

function buildHouseT2(hash: number, bodyH: number): THREE.Group {
  // Tier 2 — standard house with chimney
  const g = new THREE.Group()
  const wallColor = new THREE.Color().setHSL(0.07 + (hash % 6) * 0.02, 0.28, 0.32 + (hash % 5) * 0.04)

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, bodyH, 0.78),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 }),
  )
  body.position.y = bodyH / 2
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)

  const roofH = 0.55 + (hash % 3) * 0.08
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, roofH, 4),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.62 + (hash % 3) * 0.04, 0.5, 0.17), roughness: 0.9 }),
  )
  roof.position.y = bodyH + roofH / 2
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  g.add(roof)

  // Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.35, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.95 }),
  )
  chimney.position.set(0.2, bodyH + roofH * 0.6, 0.15)
  chimney.castShadow = true
  g.add(chimney)

  return g
}

function buildMansion(hash: number, bodyH: number): THREE.Group {
  // Tier 3 — wider mansion with side wings and multiple windows
  const g = new THREE.Group()
  const wallColor = new THREE.Color().setHSL(0.09 + (hash % 4) * 0.02, 0.25, 0.35 + (hash % 4) * 0.03)
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 })

  // Main body (wider)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, bodyH, 0.88), wallMat)
  body.position.y = bodyH / 2
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)

  // Left wing
  const wingMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.09 + (hash % 4) * 0.02, 0.22, 0.30),
    roughness: 0.85,
  })
  const wingH = bodyH * 0.65
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.35, wingH, 0.5), wingMat)
  wingL.position.set(-0.62, wingH / 2, 0)
  wingL.castShadow = true
  wingL.receiveShadow = true
  g.add(wingL)

  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.35, wingH, 0.5), wingMat)
  wingR.position.set(0.62, wingH / 2, 0)
  wingR.castShadow = true
  wingR.receiveShadow = true
  g.add(wingR)

  // Main roof
  const roofH = 0.6
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, roofH, 4),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.64, 0.55, 0.15), roughness: 0.88 }),
  )
  roof.position.y = bodyH + roofH / 2
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  g.add(roof)

  // Wing roofs (flat hip)
  const wingRoofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.64, 0.5, 0.13), roughness: 0.9 })
  const wRL = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.3, 4), wingRoofMat)
  wRL.position.set(-0.62, wingH + 0.15, 0)
  wRL.rotation.y = Math.PI / 4
  wRL.castShadow = true
  g.add(wRL)

  const wRR = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.3, 4), wingRoofMat)
  wRR.position.set(0.62, wingH + 0.15, 0)
  wRR.rotation.y = Math.PI / 4
  wRR.castShadow = true
  g.add(wRR)

  return g
}

function buildTower(hash: number, bodyH: number): THREE.Group {
  // Tier 4 — medieval tower / tall building with battlements
  const g = new THREE.Group()
  const wallColor = new THREE.Color().setHSL(0.62 + (hash % 4) * 0.03, 0.15, 0.28 + (hash % 4) * 0.03)
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.88 })

  // Main tall tower
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, bodyH, 0.72), wallMat)
  body.position.y = bodyH / 2
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)

  // Battlement row (4 merlons)
  const merlon = new THREE.BoxGeometry(0.14, 0.18, 0.14)
  const merlonMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 })
  const merlonPositions = [
    [-0.22, -0.22], [-0.22, 0.22], [0.22, -0.22], [0.22, 0.22],
  ]
  merlonPositions.forEach(([mx, mz]) => {
    const m = new THREE.Mesh(merlon, merlonMat)
    m.position.set(mx, bodyH + 0.09, mz)
    m.castShadow = true
    g.add(m)
  })

  // Pointed spire
  const spireH = 0.8 + (hash % 3) * 0.15
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, spireH, 8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.66, 0.6, 0.14), roughness: 0.85 }),
  )
  spire.position.y = bodyH + 0.18 + spireH / 2
  spire.castShadow = true
  g.add(spire)

  // Attached smaller turret
  const turretH = bodyH * 0.6
  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, turretH, 8),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.88 }),
  )
  turret.position.set(0.42, turretH / 2, 0.3)
  turret.castShadow = true
  g.add(turret)

  const tSpireH = 0.35
  const tSpire = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, tSpireH, 8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.66, 0.6, 0.12), roughness: 0.85 }),
  )
  tSpire.position.set(0.42, turretH + tSpireH / 2, 0.3)
  tSpire.castShadow = true
  g.add(tSpire)

  g.frustumCulled = false
  g.traverse((c) => { c.frustumCulled = false })

  return g
}

function buildSkyscraper(hash: number, bodyH: number): THREE.Group {
  // Tier 5 — glass skyscraper with setbacks and antenna
  const g = new THREE.Group()

  // Dark glass tones — blue/teal
  const glassColor = new THREE.Color().setHSL(0.58 + (hash % 5) * 0.03, 0.45, 0.22 + (hash % 4) * 0.04)
  const makeGlass = () => new THREE.MeshStandardMaterial({
    color: glassColor,
    roughness: 0.15,
    metalness: 0.7,
  })
  const makeConcrete = () => new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.85, metalness: 0.1 })

  // Base podium (wide)
  const podiumH = bodyH * 0.12
  const podium = new THREE.Mesh(new THREE.BoxGeometry(0.92, podiumH, 0.92), makeConcrete())
  podium.position.y = podiumH / 2
  podium.castShadow = true
  podium.receiveShadow = true
  g.add(podium)

  // Main shaft (narrower, very tall)
  const shaftH = bodyH * 0.72
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.72, shaftH, 0.72), makeGlass())
  shaft.position.y = podiumH + shaftH / 2
  shaft.castShadow = true
  shaft.receiveShadow = true
  g.add(shaft)

  // First setback
  const sb1H = bodyH * 0.10
  const sb1 = new THREE.Mesh(new THREE.BoxGeometry(0.54, sb1H, 0.54), makeGlass())
  sb1.position.y = podiumH + shaftH + sb1H / 2
  sb1.castShadow = true
  g.add(sb1)

  // Second setback
  const sb2H = bodyH * 0.06
  const sb2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, sb2H, 0.36), makeGlass())
  sb2.position.y = podiumH + shaftH + sb1H + sb2H / 2
  sb2.castShadow = true
  g.add(sb2)

  const topY = podiumH + shaftH + sb1H + sb2H

  // Antenna mast
  const antennaH = bodyH * 0.18
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, antennaH, 6),
    new THREE.MeshStandardMaterial({ color: 0xaaaacc, roughness: 0.3, metalness: 0.9 }),
  )
  antenna.position.y = topY + antennaH / 2
  antenna.castShadow = true
  g.add(antenna)

  // Blinking red light at top of antenna
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    emissive: new THREE.Color(0xff2200),
    emissiveIntensity: 3,
  })
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), beaconMat)
  beacon.position.y = topY + antennaH
  beacon.userData.animBeacon = true
  g.add(beacon)

  // Window grid lines — horizontal bands
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 })
  const bands = Math.floor(shaftH / 0.18)
  for (let b = 0; b < bands; b++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.73, 0.02, 0.73), bandMat)
    band.position.y = podiumH + 0.09 + b * 0.18
    g.add(band)
  }

  // Disable frustum culling — bounding sphere at origin doesn't cover full height
  g.frustumCulled = false
  g.traverse((c) => { c.frustumCulled = false })

  return g
}

// ─── Main building assembler ──────────────────────────────────────────────────

function buildBuilding(
  commit: CommitInfo | undefined,
  x: number,
  z: number,
  tier: Tier = 1,
): THREE.Group {
  const group = new THREE.Group()
  const hash = commit
    ? (commit.sha.charCodeAt(0) * 31 + commit.sha.charCodeAt(1))
    : Math.abs(x * 7 + z * 13 + x * z)

  // Body height scales dramatically with tier
  const BASE_HEIGHTS: Record<Tier, number> = {
    1: 0.65 + (hash % 3) * 0.08,   // 0.65–0.89
    2: 0.90 + (hash % 4) * 0.10,   // 0.90–1.20
    3: 1.40 + (hash % 4) * 0.15,   // 1.40–1.85
    4: 2.40 + (hash % 4) * 0.30,   // 2.40–3.30
    5: 4.50 + (hash % 5) * 0.60,   // 4.50–6.90
  }
  const bodyH = BASE_HEIGHTS[tier]

  let interior: THREE.Group
  switch (tier) {
    case 1: interior = buildCottage(hash, bodyH); break
    case 2: interior = buildHouseT2(hash, bodyH); break
    case 3: interior = buildMansion(hash, bodyH); break
    case 4: interior = buildTower(hash, bodyH); break
    case 5: interior = buildSkyscraper(hash, bodyH); break
  }
  group.add(interior)

  // ── Windows ──
  // Tiers 1–3 get a warm glowing window on the front face
  if (tier <= 3) {
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffe88a,
      emissive: new THREE.Color(0xffbb33),
      emissiveIntensity: commit ? 2.0 : 0.5,
      roughness: 0.1,
    })
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), winMat)
    win.position.set(0, bodyH * 0.52, tier === 1 ? 0.33 : tier === 2 ? 0.4 : 0.45)
    if (commit) win.userData.animWindow = true
    group.add(win)

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.9 })
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.28, 0.04), doorMat)
    door.position.set(0, 0.14, tier === 1 ? 0.33 : 0.4)
    group.add(door)
  }

  // Tiers 4–5 get many glowing windows scattered on all faces
  if (tier >= 4 && commit) {
    const winCount = tier === 4 ? 8 : 20
    const faceZ = tier === 4 ? 0.37 : 0.37
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfff0aa,
      emissive: new THREE.Color(0xffcc44),
      emissiveIntensity: 1.8,
      roughness: 0.1,
    })
    const winGeo = new THREE.PlaneGeometry(0.08, 0.1)
    const yStart = tier === 4 ? 0.4 : 0.3
    const yStep = bodyH / (winCount / 2 + 1)
    for (let w = 0; w < winCount / 2; w++) {
      const wy = yStart + w * yStep
      // Front
      const wf = new THREE.Mesh(winGeo, winMat.clone())
      wf.position.set((hash % 3 === 0 ? -0.12 : 0.12), wy, faceZ)
      wf.userData.animWindow = true
      group.add(wf)
      // Back
      const wb = new THREE.Mesh(winGeo, winMat.clone())
      wb.position.set((hash % 3 === 1 ? -0.12 : 0.12), wy + yStep * 0.5, -faceZ)
      wb.rotation.y = Math.PI
      wb.userData.animWindow = true
      group.add(wb)
    }
  }

  // ── Point light ──
  if (commit) {
    const lightColors: Record<Tier, number> = {
      1: 0xffaa33,
      2: 0xffaa33,
      3: 0xff9922,
      4: 0xaaccff,
      5: 0x88aaff,
    }
    const lightIntensity: Record<Tier, number> = { 1: 0.7, 2: 0.8, 3: 1.0, 4: 1.2, 5: 1.8 }
    const lightRange: Record<Tier, number> = { 1: 2.5, 2: 3.2, 3: 4.5, 4: 6.0, 5: 9.0 }

    const light = new THREE.PointLight(lightColors[tier], lightIntensity[tier], lightRange[tier])
    light.position.set(0, bodyH * 0.5, 0.8)
    group.add(light)
  }

  // Tall buildings (tier 4+) have large vertical extent — their bounding sphere
  // origin is at y=0 but meshes reach far up, causing incorrect frustum culling.
  // Disable culling on the group and all children to fix disappearing buildings.
  if (tier >= 4) {
    group.frustumCulled = false
    group.traverse((child) => { child.frustumCulled = false })
  }

  group.position.set(x, 0, z)
  return group
}

// ─── Terrain chunk builder ───────────────────────────────────────────────────

function buildTerrainChunk(
  tx: number,
  tz: number,
  grid: Tile[],
  meshMap: Map<THREE.Object3D, CommitInfo>,
): THREE.Group {
  const chunk = new THREE.Group()
  const ox = tx * GRID_SIZE
  const oz = tz * GRID_SIZE
  const isOrigin = tx === 0 && tz === 0

  const pathMat = new THREE.MeshStandardMaterial({ color: 0x3a3448, roughness: 0.98 })
  const grassMats = [
    new THREE.MeshStandardMaterial({ color: 0x1c2820, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x202e1e, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x182218, roughness: 1 }),
  ]

  grid.forEach((tile) => {
    const col = tile.id % GRID_SIZE
    const row = Math.floor(tile.id / GRID_SIZE)
    const x = col + ox
    const z = row + oz

    if (tile.type === 'path') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), pathMat)
      mesh.position.set(x, 0, z)
      mesh.receiveShadow = true
      chunk.add(mesh)
    } else if (tile.type === 'grass') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), grassMats[(col + row) % 3])
      mesh.position.set(x, 0, z)
      mesh.receiveShadow = true
      chunk.add(mesh)
      // Fill empty grass tiles in origin chunk with varied decorative buildings
      if (isOrigin) {
        const h = Math.abs(x * 2654435761 + z * 1234567891) % 100
        const decoTier: Tier =
          h < 30 ? 1 :
          h < 55 ? 2 :
          h < 75 ? 3 :
          h < 90 ? 4 : 5
        chunk.add(buildBuilding(undefined, x, z, decoTier))
      }
    } else if (tile.type === 'house') {
      if (isOrigin) {
        const count = tile.commit?.commitCount ?? 1
        const tier = getTier(count)
        const building = buildBuilding(tile.commit, x, z, tier)
        if (tile.commit) {
          building.traverse((child) => {
            if (child instanceof THREE.Mesh) meshMap.set(child, tile.commit!)
          })
        }
        chunk.add(building)
      } else {
        // Decorative — use all tiers with weighted distribution
        // so the surrounding town looks varied with towers and skyscrapers too
        const h = Math.abs(x * 2654435761 + z * 1234567891) % 100
        const decoTier: Tier =
          h < 30 ? 1 :   // 30% cottages
          h < 55 ? 2 :   // 25% houses
          h < 75 ? 3 :   // 20% mansions
          h < 90 ? 4 :   // 15% towers
                   5     // 10% skyscrapers
        chunk.add(buildBuilding(undefined, x, z, decoTier))
      }
    }
  })

  return chunk
}

// ─── TownScene ───────────────────────────────────────────────────────────────

interface TownSceneProps {
  grid: Tile[]
  onSelectCommit: (commit: CommitInfo) => void
}

function TownScene({ grid, onSelectCommit }: TownSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const frustumRef = useRef<number>(12)

  useEffect(() => {
    const mount = mountRef.current!
    const w = mount.clientWidth
    const h = mount.clientHeight
    if (w === 0 || h === 0) return

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    mount.appendChild(renderer.domElement)

    // ── Scene ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d0d1a)
    scene.fog = new THREE.Fog(0x0d0d1a, 35, 70)

    // ── Isometric orthographic camera ──
    const aspect = w / h
    const frustum = frustumRef.current
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
       frustum, -frustum,
      0.1, 200,
    )
    const ISO_DIST = 40
    const azimuth = Math.PI / 4
    const elevation = Math.atan(1 / Math.sqrt(2))
    const camOffset = new THREE.Vector3(
      ISO_DIST * Math.cos(elevation) * Math.sin(azimuth),
      ISO_DIST * Math.sin(elevation),
      ISO_DIST * Math.cos(elevation) * Math.cos(azimuth),
    )
    const panTarget = new THREE.Vector3(GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5)
    camera.position.copy(panTarget).add(camOffset)
    camera.lookAt(panTarget)

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0x4050a0, 1.2))

    const sun = new THREE.DirectionalLight(0xfff0cc, 1.8)
    sun.position.set(-14, 20, -10)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 90
    sun.shadow.camera.left = -30
    sun.shadow.camera.right = 30
    sun.shadow.camera.top = 30
    sun.shadow.camera.bottom = -30
    sun.shadow.bias = -0.001
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0x5577ff, 0.5)
    fill.position.set(12, 10, 12)
    scene.add(fill)

    // ── Stars ──
    const starPos = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 150
      starPos[i * 3 + 1] = 18 + Math.random() * 35
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 150
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14 })))

    // ── Moon ──
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xe8e0ff, emissive: new THREE.Color(0xbbaaff), emissiveIntensity: 0.6 }),
    )
    moon.position.set(-22, 26, -20)
    scene.add(moon)

    // ── Terrain ──
    const meshMap = new Map<THREE.Object3D, CommitInfo>()
    for (let tx = -TERRAIN_RADIUS; tx <= TERRAIN_RADIUS; tx++) {
      for (let tz = -TERRAIN_RADIUS; tz <= TERRAIN_RADIUS; tz++) {
        scene.add(buildTerrainChunk(tx, tz, grid, meshMap))
      }
    }

    // ── Pan (XZ only) ──
    let isPanning = false
    let lastPtr = { x: 0, y: 0 }

    const doPan = (dx: number, dy: number) => {
      const f = frustumRef.current
      const unitsPerPx = (f * 2) / mount.clientHeight
      const wx = (dx * Math.cos(azimuth) + dy * Math.sin(azimuth)) * unitsPerPx
      const wz = (-dx * Math.sin(azimuth) + dy * Math.cos(azimuth)) * unitsPerPx
      panTarget.x -= wx
      panTarget.z -= wz
      camera.position.copy(panTarget).add(camOffset)
      camera.lookAt(panTarget)
    }

    const onMouseDown = (e: MouseEvent) => { isPanning = true; lastPtr = { x: e.clientX, y: e.clientY } }
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return
      doPan(e.clientX - lastPtr.x, e.clientY - lastPtr.y)
      lastPtr = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { isPanning = false }

    let lastTouch = { x: 0, y: 0 }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      doPan(e.touches[0].clientX - lastTouch.x, e.touches[0].clientY - lastTouch.y)
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const onWheel = (e: WheelEvent) => {
      const newF = Math.max(5, Math.min(22, frustumRef.current * (e.deltaY > 0 ? 1.08 : 0.93)))
      frustumRef.current = newF
      const a = mount.clientWidth / mount.clientHeight
      camera.left = -newF * a; camera.right = newF * a
      camera.top = newF; camera.bottom = -newF
      camera.updateProjectionMatrix()
    }

    const raycaster = new THREE.Raycaster()
    const ptr = new THREE.Vector2()
    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect()
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ptr, camera)
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        const c = meshMap.get(hit.object)
        if (c) { onSelectCommit(c); break }
      }
    }

    mount.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    mount.addEventListener('wheel', onWheel, { passive: true })
    mount.addEventListener('click', onClick)
    mount.addEventListener('touchstart', onTouchStart, { passive: true })
    mount.addEventListener('touchmove', onTouchMove, { passive: true })

    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight
      renderer.setSize(w2, h2)
      const a = w2 / h2, f = frustumRef.current
      camera.left = -f * a; camera.right = f * a
      camera.top = f; camera.bottom = -f
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // ── Pre-collect animatable objects (no per-frame traverse) ──
    type WinEntry  = { mat: THREE.MeshStandardMaterial; seed: number }
    type BeaconEntry = { mat: THREE.MeshStandardMaterial; seed: number }
    type LightEntry  = { light: THREE.PointLight; seed: number }

    const winMeshes: WinEntry[] = []
    const beaconMeshes: BeaconEntry[] = []
    const pointLights: LightEntry[] = []

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        if (obj.userData.animWindow)  winMeshes.push({ mat: obj.material, seed: obj.id * 0.3 })
        if (obj.userData.animBeacon)  beaconMeshes.push({ mat: obj.material, seed: obj.id })
      }
      if (obj instanceof THREE.PointLight) {
        pointLights.push({ light: obj, seed: obj.id * 0.7 })
      }
    })

    // ── Animation loop ──
    const clock = new THREE.Clock()
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      for (const { mat, seed } of winMeshes) {
        mat.emissiveIntensity = 1.7 + Math.sin(t * 3.1 + seed) * 0.35
      }
      for (const { mat, seed } of beaconMeshes) {
        mat.emissiveIntensity = Math.max(0.1, 2.5 + Math.sin(t * 1.8 + seed) * 2.4)
      }
      for (const { light, seed } of pointLights) {
        light.intensity = 0.65 + Math.sin(t * 4.2 + seed) * 0.18
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      mount.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      mount.removeEventListener('wheel', onWheel)
      mount.removeEventListener('click', onClick)
      mount.removeEventListener('touchstart', onTouchStart)
      mount.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [grid])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [grid, setGrid] = useState<Tile[]>(() => createBaseTown())
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  useEffect(() => { fetchCommits() }, [])

  const fetchCommits = async () => {
    if (!GITHUB_OWNER || !GITHUB_REPO) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=100`,
      )
      if (!res.ok) throw new Error(`GitHub error: ${res.status}`)
      const data = await res.json()

      // Count commits per author
      const authorCounts = new Map<string, number>()
      data.forEach((item: any) => {
        const name = item.commit?.author?.name ?? item.author?.login ?? 'Unknown'
        authorCounts.set(name, (authorCounts.get(name) ?? 0) + 1)
      })

      const mapped: CommitInfo[] = data.map((item: any) => {
        const authorName = item.commit?.author?.name ?? item.author?.login ?? 'Unknown author'
        return {
          sha: item.sha,
          message: item.commit?.message ?? 'No message',
          authorName,
          url: item.html_url,
          date: item.commit?.author?.date ?? '',
          commitCount: authorCounts.get(authorName) ?? 1,
        }
      })

      setCommits(mapped)

      const buildOrder = baseGrid.filter((t) => t.type === 'grass').map((t) => t.id)
      const nextGrid = createBaseTown()

      mapped.slice(0, buildOrder.length).forEach((commit, i) => {
        const idx = nextGrid.findIndex((t) => t.id === buildOrder[i])
        if (idx >= 0) nextGrid[idx] = { ...nextGrid[idx], type: 'house', commit }
      })

      setGrid(nextGrid)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load commits')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTier = selectedCommit?.commitCount ? getTier(selectedCommit.commitCount) : 1

  return (
    <div className="app-fullscreen">
      <div className="canvas-fill">
        <TownScene
          grid={grid}
          onSelectCommit={(c) => { setSelectedCommit(c); setPanelOpen(true) }}
        />
      </div>

      <div className="hud-brand">
        <div className="hud-title-row">
          <h1 className="hud-title">GITOWN</h1>
          <button className="about-btn" type="button" onClick={() => setAboutOpen(true)} title="About this project">?</button>
        </div>
        <p className="hud-sub">drag · scroll · click a house</p>
      </div>

      <div className="hud-social">
        <a href="https://x.com/Gitown_" target="_blank" rel="noreferrer" className="social-button social-x">X</a>
        <a href="https://github.com/projectsStart/gitown" target="_blank" rel="noreferrer" className="social-button social-git">GIT</a>
      </div>

      {/* Tier legend */}
      <div className="hud-legend">
        {([1, 2, 3, 4, 5] as Tier[]).map((t) => (
          <div key={t} className={`legend-item tier-${t}`}>
            <span className="legend-icon">{'▪'.repeat(t)}</span>
            <span className="legend-label">{TIER_LABELS[t]}</span>
            <span className="legend-range">{(['1', '2–3', '4–6', '7–14', '15–29', '30+'])[t - 1] ?? ''} commits</span>
          </div>
        ))}
      </div>

      {/* About modal */}
      {aboutOpen && (
        <div className="modal-overlay" onClick={() => setAboutOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">About Gitown</span>
              <button className="modal-close" type="button" onClick={() => setAboutOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-lead">
                Gitown turns your GitHub commit history into a living 3D village — every commit plants a new building in the town.
              </p>
              <div className="modal-section">
                <h3 className="modal-section-title">How it works</h3>
                <p>Point the app at any public GitHub repository by editing <code>GITHUB_OWNER</code> and <code>GITHUB_REPO</code> in <code>App.tsx</code>. Hit <strong>Sync commits</strong> and the town rebuilds itself from your repo's history.</p>
              </div>
              <div className="modal-section">
                <h3 className="modal-section-title">Building tiers</h3>
                <p>The more commits an author has, the grander their building. Frequent contributors graduate from humble cottages all the way up to glass skyscrapers towering over the skyline.</p>
                <ul className="modal-tier-list">
                  <li><span className="tier-badge tier-1">Cottage</span> 1–2 commits</li>
                  <li><span className="tier-badge tier-2">House</span> 3–6 commits</li>
                  <li><span className="tier-badge tier-3">Mansion</span> 7–14 commits</li>
                  <li><span className="tier-badge tier-4">Tower</span> 15–29 commits</li>
                  <li><span className="tier-badge tier-5">Skyscraper</span> 30+ commits</li>
                </ul>
              </div>
              <div className="modal-section">
                <h3 className="modal-section-title">Navigation</h3>
                <p><strong>Drag</strong> to pan across the infinite terrain · <strong>Scroll</strong> to zoom in and out · <strong>Click</strong> any building to see its commit details.</p>
              </div>
              <div className="modal-section">
                <h3 className="modal-section-title">Open source</h3>
                <p>Gitown is fully open source. Fork it, embed it in your own project page, or contribute back at <a href="https://github.com/projectsStart/gitown" target="_blank" rel="noreferrer" className="modal-link">github.com/projectsStart/gitown</a>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className={`hud-toggle ${panelOpen ? 'active' : ''}`}
        onClick={() => setPanelOpen((p) => !p)}
        type="button"
      >
        {panelOpen ? '✕ close' : '⊞ commits'}
      </button>

      {panelOpen && (
        <aside className="hud-panel">
          <div className="commit-form">
            <button className="button" type="button" onClick={fetchCommits} disabled={isLoading}>
              {isLoading ? 'Syncing…' : 'Sync commits'}
            </button>
            <p className="hint">
              Edit <code>GITHUB_OWNER</code> / <code>GITHUB_REPO</code> in <code>App.tsx</code>.
            </p>
            {error && <p className="error-text">⚠ {error}</p>}
          </div>

          {selectedCommit && (
            <div className={`selected-commit tier-card tier-${selectedTier}`}>
              <div className="selected-commit-header">
                <span className="selected-commit-label">
                  {TIER_LABELS[selectedTier]} · {selectedCommit.commitCount ?? 1} commit{(selectedCommit.commitCount ?? 1) !== 1 ? 's' : ''}
                </span>
                <button type="button" className="selected-commit-close" onClick={() => setSelectedCommit(null)}>×</button>
              </div>
              <p className="selected-commit-author">{selectedCommit.authorName}</p>
              <p className="selected-commit-message">{selectedCommit.message}</p>
              <a href={selectedCommit.url} target="_blank" rel="noreferrer" className="selected-commit-link">
                View on GitHub →
              </a>
            </div>
          )}

          <div className="history">
            <h3 className="history-title">Recent commits</h3>
            {commits.length === 0 ? (
              <p className="history-empty">No commits loaded yet.</p>
            ) : (
              <ul className="history-list">
                {commits.slice(0, 15).map((c) => (
                  <li key={c.sha} className="history-item">
                    <a href={c.url} target="_blank" rel="noreferrer" className="commit-link">
                      <span className="commit-author">
                        {c.authorName}
                        <span className={`tier-badge tier-${getTier(c.commitCount ?? 1)}`}>
                          {TIER_LABELS[getTier(c.commitCount ?? 1)]}
                        </span>
                      </span>
                      <span className="commit-message">{c.message}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

export default App