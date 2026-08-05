import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Cpu, ArrowRight, Zap } from 'lucide-react';

// 4K Ultra-Detailed Motherboard Texture Generator
function createUltraMoboTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Matte Black PCB Base
  ctx.fillStyle = '#06080d';
  ctx.fillRect(0, 0, 2048, 2048);

  // Micro Electronics Grid Pattern
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2048; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 2048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(2048, i); ctx.stroke();
  }

  // Complex Circuit Traces (Gold & Silver)
  for (let c = 0; c < 300; c++) {
    ctx.strokeStyle = c % 2 === 0 ? '#d97706' : '#38bdf8';
    ctx.lineWidth = Math.random() > 0.8 ? 3 : 1;
    let x = Math.random() * 2048;
    let y = Math.random() * 2048;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 200;
      y += (Math.random() - 0.5) * 200;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Solder Pads & Micro Resistors
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 2048;
    ctx.fillStyle = i % 3 === 0 ? '#fbbf24' : '#64748b';
    ctx.fillRect(x, y, 6, 6);
  }

  // Audio Capacitors Array (Gold Tops)
  for (let y = 1400; y < 1900; y += 80) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(200, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(200, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  // Motherboard Markings & Brand Artwork
  ctx.fillStyle = '#00f0ff';
  ctx.font = '900 48px monospace';
  ctx.fillText('ZEUS Z790 EXTREME APEX', 120, 1950);
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('LGA1700 / DDR5 / PCIe 5.0 / WiFi 7', 120, 2000);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// Ultra GPU Backplate & Shroud Texture
function createUltraGpuTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Dark Brushed Metal
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  // Carbon Fiber Hex Mesh Panels
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  for (let x = 0; x < 1024; x += 40) {
    for (let y = 0; y < 1024; y += 40) {
      ctx.fillRect(x + 5, y + 5, 30, 30);
    }
  }

  // Metallic Logo & Model Specs
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 56px sans-serif';
  ctx.fillText('NVIDIA GEFORCE RTX 4090', 160, 520);
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('24GB GDDR6X | 384-BIT | DLSS 3.5', 220, 580);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

export default function Opening3DScreen({ onComplete }) {
  const mountRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('POWERING ON FRONT ARGB CABINET LIGHTS...');
  const [stepName, setStepName] = useState('Stage 1/6');
  const [telemetry, setTelemetry] = useState({ temp: '28°C', clock: '5.8 GHz', voltage: '1.25 V' });

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene & High-Precision Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.012);

    const camera = new THREE.PerspectiveCamera(
      38,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    // Position camera facing front-three-quarter (+Z, +X)
    camera.position.set(16, 12, 22);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp"
    });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    currentMount.appendChild(renderer.domElement);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const mainKey = new THREE.DirectionalLight(0xffffff, 2.4);
    mainKey.position.set(20, 30, 25);
    mainKey.castShadow = true;
    scene.add(mainKey);

    // Front-Facing ARGB Point Lights (Illuminate front of PC directly towards viewer)
    const rgbLightFrontCyan = new THREE.PointLight(0x00f0ff, 10, 40);
    rgbLightFrontCyan.position.set(0, 4, 12);
    scene.add(rgbLightFrontCyan);

    const rgbLightFrontPurple = new THREE.PointLight(0x8b5cf6, 10, 40);
    rgbLightFrontPurple.position.set(6, -2, 10);
    scene.add(rgbLightFrontPurple);

    // Floating RGB Dust Particles
    const particleCount = 250;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 30;
      particlePositions[i + 1] = (Math.random() - 0.5) * 30;
      particlePositions[i + 2] = (Math.random() - 0.5) * 30;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Textures & Materials
    const moboTex = createUltraMoboTexture();
    const gpuTex = createUltraGpuTexture();

    const pcbMat = new THREE.MeshStandardMaterial({ map: moboTex, roughness: 0.25, metalness: 0.4 });
    const gpuMat = new THREE.MeshStandardMaterial({ map: gpuTex, roughness: 0.2, metalness: 0.85 });
    const metallicDark = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.9 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.08, metalness: 0.98 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.95 });

    // Dynamic Emissive Materials for ARGB Lightstrips & Fans
    const argbMat1 = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 3.0, roughness: 0.1 });
    const argbMat2 = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 3.0, roughness: 0.1 });
    const argbMat3 = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 3.0, roughness: 0.1 });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 0.85,
      transparent: true,
      roughness: 0.02,
      ior: 1.52,
      thickness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02
    });

    const pcGroup = new THREE.Group();
    scene.add(pcGroup);

    // ----------------------------------------------------
    // 1. Cabinet Frame & Front ARGB Lightstrips & Front ARGB Fans
    // ----------------------------------------------------
    const caseGroup = new THREE.Group();
    pcGroup.add(caseGroup);

    const frameGeo = new THREE.BoxGeometry(7.2, 10.4, 9.2);
    const frameWireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(frameGeo),
      new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 })
    );
    caseGroup.add(frameWireframe);

    const psuShroud = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.5, 9.0), metallicDark);
    psuShroud.position.set(0, -3.9, 0);
    caseGroup.add(psuShroud);

    // Cabinet Front ARGB Vertical Lightstrips (Front Face at +Z = 4.65)
    const frontRgbStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 10.2, 0.1), argbMat1);
    frontRgbStrip1.position.set(3.5, 0, 4.65);
    caseGroup.add(frontRgbStrip1);

    const frontRgbStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 10.2, 0.1), argbMat2);
    frontRgbStrip2.position.set(-3.5, 0, 4.65);
    caseGroup.add(frontRgbStrip2);

    // Cabinet Front ARGB Top/Bottom Frame Borders
    const frontRgbTopBorder = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.15, 0.1), argbMat3);
    frontRgbTopBorder.position.set(0, 5.1, 4.65);
    caseGroup.add(frontRgbTopBorder);

    const frontRgbBottomBorder = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.15, 0.1), argbMat3);
    frontRgbBottomBorder.position.set(0, -5.1, 4.65);
    caseGroup.add(frontRgbBottomBorder);

    // 3x Front ARGB Intake Fans (On Front Face +Z = 4.70, Facing Camera!)
    const caseFans = [];
    [-3.0, 0, 3.0].forEach(y => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, y, 4.70);

      // Outer ARGB Halo Ring
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.14, 16, 32), argbMat1);
      fanGroup.add(ringMesh);

      // Inner Hub ARGB Ring
      const innerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 16, 32), argbMat2);
      fanGroup.add(innerRingMesh);

      // Fan Blades
      const bladesGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.06, 12);
      const bladesMesh = new THREE.Mesh(bladesGeo, metallicDark);
      bladesMesh.rotation.x = Math.PI / 2;
      fanGroup.add(bladesMesh);

      caseGroup.add(fanGroup);
      caseFans.push(bladesMesh);
    });

    // Side Tempered Glass Panel (On SIDE face +X = 3.65, sliding in from +X = 14)
    const glassPanel = new THREE.Group();
    glassPanel.position.set(14, 0, 0); // start open at right side (+X)
    caseGroup.add(glassPanel);

    const glassSheet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 10.2, 9.0), glassMat);
    glassPanel.add(glassSheet);

    [[0, 4.8, 4.2], [0, 4.8, -4.2], [0, -4.8, 4.2], [0, -4.8, -4.2]].forEach(([x, y, z]) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 16), silverMat);
      screw.rotation.z = Math.PI / 2;
      screw.position.set(0.08, y, z);
      glassPanel.add(screw);
    });

    // ----------------------------------------------------
    // 2. ATX Motherboard & VRM Heatsinks & Slots
    // ----------------------------------------------------
    const moboGroup = new THREE.Group();
    moboGroup.position.set(0, 12, 0);
    pcGroup.add(moboGroup);

    const mobo = new THREE.Mesh(new THREE.BoxGeometry(6.0, 8.4, 0.2), pcbMat);
    mobo.position.set(-0.2, 0.8, -2.1);
    moboGroup.add(mobo);

    // PCIe Steel Slots (x3)
    [-0.6, -2.2, -3.8].forEach(y => {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.28), silverMat);
      slot.position.set(-0.2, y + 1.4, -1.6);
      moboGroup.add(slot);
    });

    // CPU Socket & Latch
    const socket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.1), metallicDark);
    socket.position.set(-0.2, 2.6, -1.9);
    moboGroup.add(socket);

    // ----------------------------------------------------
    // 3. CPU Processor
    // ----------------------------------------------------
    const cpuMesh = new THREE.Group();
    cpuMesh.position.set(-0.2, 16, -1.9);
    pcGroup.add(cpuMesh);

    const cpuBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.08), goldMat);
    cpuMesh.add(cpuBase);
    const cpuIhs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.12), silverMat);
    cpuIhs.position.z = 0.08;
    cpuMesh.add(cpuIhs);

    // ----------------------------------------------------
    // 4. DDR5 RAM Sticks & Crystalline ARGB Top Diffuser
    // ----------------------------------------------------
    const ramGroup = new THREE.Group();
    ramGroup.position.set(16, 2.6, -1.7);
    pcGroup.add(ramGroup);

    for (let i = 0; i < 4; i += 2) {
      const ram = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 0.65), metallicDark);
      ram.position.z = i * 0.35;
      const rgb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.67), argbMat2);
      rgb.position.y = 1.35;
      ram.add(rgb);
      ramGroup.add(ram);
    }

    // ----------------------------------------------------
    // 5. Triple-Fan RTX 4090 GPU & Glowing Side Logo
    // ----------------------------------------------------
    const gpuGroup = new THREE.Group();
    gpuGroup.position.set(18, -0.6, 16);
    pcGroup.add(gpuGroup);

    const gpuBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.7, 2.5), gpuMat);
    gpuGroup.add(gpuBody);

    // Triple Spinning Fans
    const gpuFans = [];
    [-1.7, 0, 1.7].forEach(x => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(x, -0.1, 1.28);
      const fanMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 32), metallicDark);
      fanMesh.rotation.x = Math.PI / 2;
      fanGroup.add(fanMesh);
      const fanRgbRing = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.06, 16, 32), argbMat1);
      fanGroup.add(fanRgbRing);
      gpuGroup.add(fanGroup);
      gpuFans.push(fanMesh);
    });

    // ----------------------------------------------------
    // 6. AIO 360mm Radiator & Infinity Mirror Pump
    // ----------------------------------------------------
    const coolerGroup = new THREE.Group();
    coolerGroup.position.set(-0.2, 18, 0);
    pcGroup.add(coolerGroup);

    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 32), metallicDark);
    pump.rotation.x = Math.PI / 2;
    coolerGroup.add(pump);

    const pumpRgb = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.1, 16, 32), argbMat1);
    pumpRgb.position.z = 0.26;
    coolerGroup.add(pumpRgb);

    // ----------------------------------------------------
    // Animation Timeline (3.6s Precision Assembly)
    // ----------------------------------------------------
    let startTime = Date.now();
    const DURATION = 3600;
    let animationFrameId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(1, elapsed / DURATION);
      setProgress(Math.round(progressRatio * 100));

      // Dynamic ARGB Color Wave Hue Shift
      const hue1 = (elapsed * 0.00035) % 1;
      const hue2 = (elapsed * 0.00035 + 0.33) % 1;
      const hue3 = (elapsed * 0.00035 + 0.66) % 1;

      rgbLightFrontCyan.color.setHSL(hue1, 1, 0.6);
      rgbLightFrontPurple.color.setHSL(hue2, 1, 0.6);

      argbMat1.color.setHSL(hue1, 1, 0.6);
      argbMat1.emissive.setHSL(hue1, 1, 0.6);

      argbMat2.color.setHSL(hue2, 1, 0.6);
      argbMat2.emissive.setHSL(hue2, 1, 0.6);

      argbMat3.color.setHSL(hue3, 1, 0.6);
      argbMat3.emissive.setHSL(hue3, 1, 0.6);

      // Rotate Front Case & GPU Fans
      caseFans.forEach(f => { f.rotation.z += 0.35; });
      gpuFans.forEach(f => { f.rotation.z += 0.35; });

      // Rotate Particles
      particleSystem.rotation.y = elapsed * 0.0004;

      // Timeline Sequences
      if (elapsed < 700) {
        const t1 = elapsed / 700;
        moboGroup.position.y = THREE.MathUtils.lerp(12, 0, t1);
        setStatusText('MOUNTING ATX MOTHERBOARD & VRM HEATSINKS...');
        setStepName('Step 1/6 Motherboard');
        setTelemetry({ temp: '26°C', clock: '0.0 GHz', voltage: '0.00 V' });
      } else {
        moboGroup.position.y = 0;
      }

      if (elapsed >= 600 && elapsed < 1300) {
        const t2 = (elapsed - 600) / 700;
        cpuMesh.position.y = THREE.MathUtils.lerp(16, 2.6, t2);
        cpuMesh.rotation.z = THREE.MathUtils.lerp(Math.PI / 2, 0, t2);
        setStatusText('SEATING INTEL CORE i9-14900KS PROCESSOR (6.2GHz)...');
        setStepName('Step 2/6 CPU Processor');
        setTelemetry({ temp: '32°C', clock: '3.2 GHz', voltage: '1.05 V' });
      } else if (elapsed >= 1300) {
        cpuMesh.position.y = 2.6;
        cpuMesh.rotation.z = 0;
      }

      if (elapsed >= 1200 && elapsed < 1900) {
        const t3 = (elapsed - 1200) / 700;
        ramGroup.position.x = THREE.MathUtils.lerp(16, 0.8, t3);
        setStatusText('SLOTTING QUAD-CHANNEL DDR5-8000 ARGB MEMORY...');
        setStepName('Step 3/6 DDR5 RAM');
        setTelemetry({ temp: '34°C', clock: '4.8 GHz', voltage: '1.18 V' });
      } else if (elapsed >= 1900) {
        ramGroup.position.x = 0.8;
      }

      if (elapsed >= 1800 && elapsed < 2500) {
        const t4 = (elapsed - 1800) / 700;
        coolerGroup.position.y = THREE.MathUtils.lerp(18, 2.6, t4);
        coolerGroup.position.z = THREE.MathUtils.lerp(0, -1.65, t4);
        setStatusText('MOUNTING 360mm AIO LIQUID PUMP ONTO CPU...');
        setStepName('Step 4/6 Liquid Cooling');
        setTelemetry({ temp: '29°C', clock: '5.4 GHz', voltage: '1.22 V' });
      } else if (elapsed >= 2500) {
        coolerGroup.position.y = 2.6;
        coolerGroup.position.z = -1.65;
      }

      if (elapsed >= 2400 && elapsed < 3100) {
        const t5 = (elapsed - 2400) / 700;
        gpuGroup.position.x = THREE.MathUtils.lerp(18, -0.2, t5);
        gpuGroup.position.z = THREE.MathUtils.lerp(16, -0.5, t5);
        setStatusText('LOCKING GEFORCE RTX 4090 INTO PCIe 5.0 SLOT...');
        setStepName('Step 5/6 RTX 4090 GPU');
        setTelemetry({ temp: '31°C', clock: '5.8 GHz', voltage: '1.28 V' });
      } else if (elapsed >= 3100) {
        gpuGroup.position.x = -0.2;
        gpuGroup.position.z = -0.5;
      }

      // Glass Side Panel closes onto SIDE (+X = 3.65) without covering front fans (+Z = 4.70)!
      if (elapsed >= 3000 && elapsed < 3600) {
        const t6 = (elapsed - 3000) / 600;
        glassPanel.position.x = THREE.MathUtils.lerp(14, 3.65, t6);
        setStatusText('CLOSING SIDE GLASS PANEL & ILLUMINATING FRONT ARGB FANS...');
        setStepName('Step 6/6 Power-On');
        setTelemetry({ temp: '30°C', clock: '6.2 GHz', voltage: '1.30 V' });
      } else if (elapsed >= 3600) {
        glassPanel.position.x = 3.65;
        setStatusText('ZEUS HIGH-PERFORMANCE SYSTEM READY!');
      }

      // Smooth Front Three-Quarter Camera Panning Angle
      const angle = Math.sin(elapsed * 0.0006) * 0.35 + 0.3;
      camera.position.x = Math.sin(angle) * 20;
      camera.position.z = Math.cos(angle) * 20;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      if (elapsed < DURATION + 300) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        onComplete && onComplete();
      }
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#020205',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '32px',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Title Header */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 900,
              boxShadow: '0 0 35px rgba(0, 240, 255, 0.8)'
            }}
          >
            <Cpu size={28} />
          </div>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 900,
              letterSpacing: '2px',
              background: 'linear-gradient(to right, #ffffff, #00f0ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              fontFamily: "'Space Grotesk', sans-serif"
            }}
          >
            ZEUS BUILDER
          </h1>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#00f0ff',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700
          }}
        >
          Front ARGB Cabinet 3D Hardware Assembly
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        style={{
          position: 'absolute',
          top: '32px',
          right: '32px',
          zIndex: 20,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          color: '#f4f4f6',
          padding: '10px 22px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(16px)',
          transition: 'all 0.2s ease',
          boxShadow: '0 0 25px rgba(0, 240, 255, 0.25)'
        }}
      >
        Skip Intro <ArrowRight size={16} />
      </button>

      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
      />

      {/* Telemetry HUD & Progress Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '16px',
          background: 'rgba(6, 8, 13, 0.9)',
          border: '1px solid rgba(0, 240, 255, 0.35)',
          borderRadius: '14px',
          padding: '18px 24px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.9)'
        }}
      >
        {/* Hardware Status Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ color: '#00f0ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#00f0ff" /> {statusText}
          </span>
          <span style={{ color: '#8b5cf6', fontWeight: 800 }}>{stepName}</span>
        </div>

        {/* Live System Telemetry Badges */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'space-between', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>
          <div>TEMP: <strong style={{ color: '#10b981' }}>{telemetry.temp}</strong></div>
          <div>CLOCK: <strong style={{ color: '#00f0ff' }}>{telemetry.clock}</strong></div>
          <div>VOLT: <strong style={{ color: '#8b5cf6' }}>{telemetry.voltage}</strong></div>
          <div>STATUS: <strong style={{ color: '#f59e0b' }}>OPTIMAL</strong></div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(to right, #00f0ff, #8b5cf6)',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.95)',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
}
