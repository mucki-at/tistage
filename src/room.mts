import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import * as utils from "./utils.mts";

 type SelectObjectEventHandler = (event: MouseEvent, intersect: THREE.Intersection)=>void;
export type SelectableObject = THREE.Object3D & {
    onObjectSelected?: SelectObjectEventHandler;
};

export class Room extends THREE.Scene {
        static #instance: Room | null = null;

        static updateRoom() {
            Room.#instance?.render();
        }

        // Constructor
        constructor() {
            super();
            Room.#instance = this;
        }

        #camera: THREE.PerspectiveCamera | null = null;
        #renderer: THREE.WebGLRenderer | null = null;
        #raycaster: THREE.Raycaster | null = null;

        render() {
            if (this.#renderer && this.#camera) {
                this.#renderer.render(this, this.#camera);
            }
        }

        async init(environment: string, minRadius: number, maxRadius: number) {
            this.#camera = new THREE.PerspectiveCamera(
                40,
                window.innerWidth / window.innerHeight,
                minRadius,
                maxRadius * 2
            );
            this.#camera.position.set(0, maxRadius / 6, maxRadius / 4);
            this.#camera.lookAt(0, 0, 0);

            this.#renderer = new THREE.WebGLRenderer({ antialias: true });
            this.#renderer.setPixelRatio(window.devicePixelRatio);
            this.#renderer.setSize(window.innerWidth, window.innerHeight);
            this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.#renderer.shadowMap.enabled = true;
            this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

            this.#raycaster = new THREE.Raycaster();

            //

            this.background = new THREE.Color("gray");
            utils
                .loadTextureAsync(`${environment}.jpg`, true)
                .then((texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    this.background = texture;
                    this.render();
                });

            const dummyLight = new THREE.AmbientLight(0xffffff); // soft white light
            this.add(dummyLight);
            new EXRLoader().loadAsync(`${environment}.exr`).then((envMap) => {
                envMap.mapping = THREE.EquirectangularReflectionMapping;
                this.environment = envMap;
                this.background = this.environment;
                dummyLight.removeFromParent();
                this.render();
            });

            const keyLight = new THREE.DirectionalLight(0xffffff, 0);
            keyLight.position.set(0.5, 0.5, 0.25); //default; light shining from top
            keyLight.castShadow = true; // default false

            //Set up shadow properties for the light
            keyLight.shadow.mapSize.width = 1024; // default
            keyLight.shadow.mapSize.height = 512; // default
            keyLight.shadow.camera.left = -0.5; // default
            keyLight.shadow.camera.right = 0.5; // default
            keyLight.shadow.camera.top = 0.25; // default
            keyLight.shadow.camera.bottom = -0.25; // default
            keyLight.shadow.camera.near = 0.5; // default
            keyLight.shadow.camera.far = 1.5; // default

            this.add(keyLight);
            //this.add(new THREE.CameraHelper(keyLight.shadow.camera));

            const controls = new MapControls(
                this.#camera,
                this.#renderer.domElement
            );
            controls.mouseButtons = {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE,
            };
            controls.addEventListener("change", Room.updateRoom);
            controls.target.set(0, 0, 0);
            controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
            controls.maxDistance = maxRadius;
            controls.minDistance = minRadius;
            controls.update();

            document.body.appendChild(this.#renderer.domElement);
            window.addEventListener("resize", this.#onWindowResize.bind(this));
            window.addEventListener("click", this.#onMouseClick.bind(this));
        }

        #onWindowResize() {
            if (this.#renderer && this.#camera) {
                this.#camera.aspect = window.innerWidth / window.innerHeight;
                this.#camera.updateProjectionMatrix();

                this.#renderer.setSize(window.innerWidth, window.innerHeight);

                this.render();
            }
        }

        #onMouseClick(event: MouseEvent) {
            if (this.#raycaster && this.#camera) {
                const pointer = new THREE.Vector2();
                pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
                pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

                // update the picking ray with the camera and pointer position
                this.#raycaster.setFromCamera(pointer, this.#camera);

                // calculate objects intersecting the picking ray
                const intersects = this.#raycaster.intersectObjects(
                    this.children
                );

                if (intersects.length > 0) {
                    let obj: SelectableObject | null= intersects[0].object;
                    while (obj && !obj.onObjectSelected)
                    {
                        obj = obj.parent;
                    }
                    obj?.onObjectSelected?.(event, intersects[0]);
                }
            }
        }
    }
