import { Object3DNode, extend } from "@react-three/fiber";
import {
  Mesh,
  Group,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  HemisphereLight,
} from "three";

// Extend JSX.IntrinsicElements with Three.js objects
declare module "@react-three/fiber" {
  interface ThreeElements {
    mesh: Object3DNode<Mesh, typeof Mesh>;
    group: Object3DNode<Group, typeof Group>;
    boxGeometry: Object3DNode<BoxGeometry, typeof BoxGeometry>;
    sphereGeometry: Object3DNode<SphereGeometry, typeof SphereGeometry>;
    planeGeometry: Object3DNode<PlaneGeometry, typeof PlaneGeometry>;
    meshStandardMaterial: Object3DNode<MeshStandardMaterial, typeof MeshStandardMaterial>;
    meshBasicMaterial: Object3DNode<MeshBasicMaterial, typeof MeshBasicMaterial>;
    ambientLight: Object3DNode<AmbientLight, typeof AmbientLight>;
    directionalLight: Object3DNode<DirectionalLight, typeof DirectionalLight>;
    pointLight: Object3DNode<PointLight, typeof PointLight>;
    spotLight: Object3DNode<SpotLight, typeof SpotLight>;
    hemisphereLight: Object3DNode<HemisphereLight, typeof HemisphereLight>;
  }
}

export {};
