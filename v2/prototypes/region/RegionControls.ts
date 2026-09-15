import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function configureRegionControls(controls: OrbitControls, mobile: boolean) {
  controls.enableDamping = true;
  controls.dampingFactor = mobile ? 0.085 : 0.065;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.zoomToCursor = false;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.18;
}

export function preventRegionContextMenu(element: HTMLElement) {
  const handleContextMenu = (event: Event) => event.preventDefault();
  element.addEventListener('contextmenu', handleContextMenu);
  return () => element.removeEventListener('contextmenu', handleContextMenu);
}
