import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Cpu, ArrowRight } from 'lucide-react';

export default function Opening3DScreen({ onComplete }) {
  const mountRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING CHASSIS...');

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.03);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(12, 10, 18);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const cyanPoint = new THREE.PointLight(0x00f0ff, 3, 25);
    cyanPoint.position.set(-4, 4, 4);
    scene.add(cyanPoint);

    const purplePoint = new THREE.PointLight(0x8b5cf6, 3, 25);
    purplePoint.position.set(4, 2, -4);
    scene.add(purplePoint);

    // ----------------------------------------------------
    // Create 3D PC Parts Meshes
    // ----------------------------------------------------
    const pcGroup = new THREE.Group();
    scene.add(pcGroup);

    // 1. Chassis / PC Case Wireframe & Glass Box
    const caseGeo = new THREE.BoxGeometry(6, 8, 7);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: 0x111319,
      metalness: 0.8,
      roughness: 0.2,
      transmission: 0.4,
      transparent: true,
      opacity: 0.85
    });
    const caseMesh = new THREE.Mesh(caseGeo, caseMat);
    caseMesh.position.set(0, 0, 0);
    pcGroup.add(caseMesh);

    // Case Edge Wireframe Highlight
    const edgesGeo = new THREE.EdgesGeometry(caseGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
    const caseWireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    pcGroup.add(caseWireframe);

    // 2. Motherboard PCB
    const moboGeo = new THREE.BoxGeometry(5.2, 7.2, 0.3);
    const moboMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.4,
      metalness: 0.5
    });
    const moboMesh = new THREE.Mesh(moboGeo, moboMat);
    moboMesh.position.set(-0.2, 0, -1.8);
    pcGroup.add(moboMesh);

    // 3. CPU Socket & CPU Chip
    const cpuSocketGeo = new THREE.BoxGeometry(1.2, 1.2, 0.1);
    const cpuSocketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const cpuSocket = new THREE.Mesh(cpuSocketGeo, cpuSocketMat);
    cpuSocket.position.set(-0.2, 1.5, -1.55);
    pcGroup.add(cpuSocket);

    // CPU Processor Chip (animates down into socket)
    const cpuChipGeo = new THREE.BoxGeometry(1.0, 1.0, 0.15);
    const cpuChipMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1
    });
    const cpuChip = new THREE.Mesh(cpuChipGeo, cpuChipMat);
    cpuChip.position.set(-0.2, 8, -1.55); // start floating high
    pcGroup.add(cpuChip);

    // 4. RAM Sticks (animates in from side)
    const ramGeo = new THREE.BoxGeometry(0.15, 2.2, 0.4);
    const ramMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.6,
      metalness: 0.8
    });

    const ramStick1 = new THREE.Mesh(ramGeo, ramMat);
    ramStick1.position.set(8, 1.5, -1.4);
    pcGroup.add(ramStick1);

    const ramStick2 = new THREE.Mesh(ramGeo, ramMat);
    ramStick2.position.set(8, 1.5, -1.1);
    pcGroup.add(ramStick2);

    // 5. GPU Graphics Card (animates in from front)
    const gpuGeo = new THREE.BoxGeometry(4.2, 1.4, 2.2);
    const gpuMat = new THREE.MeshStandardMaterial({
      color: 0x090a0f,
      metalness: 0.9,
      roughness: 0.2
    });
    const gpuMesh = new THREE.Mesh(gpuGeo, gpuMat);
    gpuMesh.position.set(-0.2, -1.2, 8); // start far out
    pcGroup.add(gpuMesh);

    // GPU Glowing RGB Strip
    const gpuRgbGeo = new THREE.BoxGeometry(4.25, 0.15, 0.1);
    const gpuRgbMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const gpuRgb = new THREE.Mesh(gpuRgbGeo, gpuRgbMat);
    gpuRgb.position.set(0, 0.6, 1.1);
    gpuMesh.add(gpuRgb);

    // 6. CPU Liquid Cooler Block
    const coolerGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.4, 32);
    const coolerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      metalness: 0.9
    });
    const coolerMesh = new THREE.Mesh(coolerGeo, coolerMat);
    coolerMesh.rotation.x = Math.PI / 2;
    coolerMesh.position.set(-0.2, 1.5, 6); // start floating out
    pcGroup.add(coolerMesh);

    // ----------------------------------------------------
    // Animation Loop
    // ----------------------------------------------------
    let startTime = Date.now();
    const DURATION = 3000; // 3 seconds
    let animationFrameId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(1, elapsed / DURATION);
      setProgress(Math.round(progressRatio * 100));

      // Stage 1: CPU Descent (0ms to 900ms)
      if (elapsed < 900) {
        const t1 = elapsed / 900;
        cpuChip.position.y = THREE.MathUtils.lerp(8, 1.5, t1);
        cpuChip.rotation.z = THREE.MathUtils.lerp(Math.PI, 0, t1);
        setStatusText('MOUNTING CPU PROCESSOR...');
      } else {
        cpuChip.position.y = 1.5;
        cpuChip.rotation.z = 0;
      }

      // Stage 2: RAM Insertion (600ms to 1600ms)
      if (elapsed >= 600 && elapsed < 1600) {
        const t2 = (elapsed - 600) / 1000;
        ramStick1.position.x = THREE.MathUtils.lerp(8, 0.8, t2);
        ramStick2.position.x = THREE.MathUtils.lerp(8, 1.2, t2);
        setStatusText('SLOTTING HIGH-SPEED DDR5 RAM...');
      } else if (elapsed >= 1600) {
        ramStick1.position.x = 0.8;
        ramStick2.position.x = 1.2;
      }

      // Stage 3: GPU Mounting (1400ms to 2400ms)
      if (elapsed >= 1400 && elapsed < 2400) {
        const t3 = (elapsed - 1400) / 1000;
        gpuMesh.position.z = THREE.MathUtils.lerp(8, -0.4, t3);
        coolerMesh.position.z = THREE.MathUtils.lerp(6, -1.2, t3);
        setStatusText('SECURING GEFORCE RTX GPU & COOLER...');
      } else if (elapsed >= 2400) {
        gpuMesh.position.z = -0.4;
        coolerMesh.position.z = -1.2;
        setStatusText('SYSTEM ASSEMBLY COMPLETE! POWERING ON...');
      }

      // Continuous 3D rotation & pulsing lights
      pcGroup.rotation.y = elapsed * 0.0015;
      pcGroup.rotation.x = Math.sin(elapsed * 0.001) * 0.1;

      cyanPoint.intensity = 2 + Math.sin(elapsed * 0.005) * 1.5;
      purplePoint.intensity = 2 + Math.cos(elapsed * 0.005) * 1.5;

      renderer.render(scene, camera);

      if (elapsed < DURATION + 200) {
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
        backgroundColor: '#050508',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '32px',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Top Software Name Header */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justify-content: 'center',
              color: '#000',
              fontWeight: 800,
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
            }}
          >
            <Cpu size={22} />
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '1px',
              background: 'linear-gradient(to right, #ffffff, #00f0ff)',
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
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600
          }}
        >
          PC Builder & Inventory Quotation Software
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
          border: '1px solid rgba(0, 240, 255, 0.3)',
          color: '#f4f4f6',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease'
        }}
      >
        Skip Intro <ArrowRight size={14} />
      </button>

      {/* 3D WebGL Canvas Container */}
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

      {/* Bottom Progress Bar & Assembly Status */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            width: '100%',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#a1a1aa'
          }}
        >
          <span style={{ color: '#00f0ff', fontWeight: 600 }}>{statusText}</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>{progress}%</span>
        </div>

        {/* Progress Track */}
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '3px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(to right, #00f0ff, #8b5cf6)',
              boxShadow: '0 0 12px rgba(0, 240, 255, 0.8)',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
}
