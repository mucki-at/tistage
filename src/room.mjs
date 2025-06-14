import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import * as utils from "./utils.mjs";

export class Room extends THREE.Scene
{
    // Constructor
    constructor()
    {
        super()
    }

    #camera = null;
    #renderer = null;

    render()
    {
        this.#renderer.render(this, this.#camera);
    }
   
    async init(environment, minRadius, maxRadius)
    {
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

        window.updateRoom = this.render.bind(this);
        //

        this.background = new THREE.Color("gray");
        utils.LoadTextureAsync(`${environment}.jpg`, true).then((texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.background = texture;
            window.updateRoom();
        });

        const dummyLight = new THREE.AmbientLight(0xffffff); // soft white light
        this.add(dummyLight);
        new EXRLoader().loadAsync(`${environment}.exr`).then((envMap) => {
            envMap.mapping = THREE.EquirectangularReflectionMapping;
            this.environment = envMap;
            this.background = this.environment;
            dummyLight.removeFromParent();
            window.updateRoom();
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

        const controls = new OrbitControls(
            this.#camera,
            this.#renderer.domElement
        );
        controls.addEventListener("change", window.updateRoom);
        controls.target.set(0, 0, 0);
        controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
        controls.maxDistance = maxRadius;
        controls.minDistance = minRadius;
        controls.enablePan = false;
        controls.update();

        document.body.appendChild(this.#renderer.domElement);
        window.addEventListener("resize", this.#onWindowResize.bind(this));
    }
    
    #onWindowResize()
    {
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
        
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        
        window.updateRoom();
    }    
}
