import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

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
            maxRadius*2
        );
        this.#camera.position.set(0,maxRadius/6,maxRadius/4);
        this.#camera.lookAt(0, 0, 0);
        
        this.background = new THREE.Color("gray")

        const dummyLight = new THREE.AmbientLight(0xFFFFFF); // soft white light
        this.add(dummyLight);

        const hdrLoader = new RGBELoader();
        hdrLoader.loadAsync(environment).then((envMap) => {
            envMap.mapping = THREE.EquirectangularReflectionMapping;
            this.environment = envMap;
            this.background = this.environment;
            dummyLight.removeFromParent();
            window.updateRoom();
        });
        
        this.#renderer = new THREE.WebGLRenderer({ antialias: true });
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
        
        window.updateRoom = this.render.bind(this);
        //
        
        const controls = new OrbitControls(this.#camera, this.#renderer.domElement);
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
