
const rays = [];
let player: Entity;
let canvas = document.querySelector("canvas");
let groundSize = 10e3;
let keys = {}
document.addEventListener("keydown", (evt: KeyboardEvent) => {
	keys[evt.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (evt: KeyboardEvent) => {
	keys[evt.key.toLowerCase()] = false;
});
const world: WorldOptions = {
	blocks: [
		{
			x: -groundSize/2,
			y: -50,
			z: -groundSize/2,
			width: groundSize,
			height: 50,
			length: groundSize,
			color: "green"
		},
		{
			x: 200,
			y: 0,
			z: -50,
			width: 10,
			height: 10,
			length: 100,
			color: "yellow"
		},
		{
			x: -50,
			y: 0,
			z: 300,
			width: 100,
			height: 100,
			length: 100,
			color: "red"
		},
		{
			x: -50,
			y: 200,
			z: 300,
			width: 100,
			height: 100,
			length: 100,
			color: "purple"
		}
	],
	spheres: [
		{
			x: -100,
			y: 300,
			z: 100,
			r: 90,
			color: "orange"
		}
	]
}

interface Block {
	x: number;
	y: number;
	z: number;
	width: number;
	height: number;
	length: number;
	color?: string;
}
interface Sphere {
	x: number;
	y: number;
	z: number;
	r: number;
	color?: string;
}

interface WorldOptions {
	blocks: Block[];
	spheres: Sphere[];
}

interface Options {
	move: boolean;
	blocksX: number;
	blocksY: number;
	fovX: number;
	fovY: number;
}

const config: Options = {
	move: false,
	blocksX: 40,
	blocksY: 20,
	fovX: 2,
	fovY: 1
}

interface EntityOptions {
	controllable: boolean;
}

class Entity {

	public x: number;
	public y: number;
	public z: number;

	public rotX: number;
	public rotY: number;
	
	public speed: number;
	public controllable: boolean;

	constructor({
		controllable = false
	}: EntityOptions) {

		this.controllable = controllable;

		this.speed = 5;

		this.rotX = -0.3;
		this.rotY = 0.3;

		this.x = 0;
		this.y = 0;
		this.z = 0;
	}

	update() {
		if(this.controllable) {

			let shouldMove = false;
			let moveRot = this.rotX;

			if(keys["w"]) {
				shouldMove = true;
			} else if(keys["s"]) {
				moveRot -= Math.PI;
				shouldMove = true;
			}
			if(keys["a"]) {
				moveRot += Math.PI/2;
				shouldMove = true;
			}else if(keys["d"]) {
				moveRot -= Math.PI/2;
				shouldMove = true;
			}

			if(shouldMove) {
				let addX = this.speed * Math.sin(moveRot);
				let addZ = this.speed * Math.cos(moveRot);
				this.x += addX;
				this.z += addZ;
			}
		}
	}

}

interface RayOptions {
	/** X position on screen */
	visX: number;
	/** Y position on screen */
	visY: number;
	/** Parent entity (starting position) */
	parent: Entity;
}

class Ray {

	public visX: number;
	public visY: number;
	public parent: Entity;

	public x: number;
	public y: number;
	public z: number;

	public travelSpeed: number;
	public travelDistance: number;
	public maxTravelDistance: number;

	public rotXCore: number;
	public rotYCore: number;
	public rotX: number;
	public rotY: number;

	public collidingWith?: Block | Sphere;

	constructor({
		visX,
		visY,
		parent
	}: RayOptions) {

		this.visX = visX;
		this.visY = visY;

		this.rotXCore = ((visX / config.blocksX) * config.fovX) - (config.fovX / 2);
		this.rotYCore = ((visY / config.blocksY) * config.fovY) - (config.fovY / 2);

		this.rotX = this.rotXCore;
		this.rotY = this.rotYCore;

		this.parent = parent;
		this.x = this.parent.x;
		this.y = this.parent.y;
		this.z = this.parent.z;

		this.travelSpeed = 10;
		this.travelDistance = 0;
		this.maxTravelDistance = 1000;
	}

	public update() {
		this.x = this.parent.x;
		this.y = this.parent.y + 20;
		this.z = this.parent.z;

		this.rotX = this.parent.rotX - this.rotXCore;
		this.rotY = this.parent.rotY - this.rotYCore;

		this.travelDistance = 0;
		delete this.collidingWith;
		this.loop();
	}

	protected loop() {
		this.travelDistance++

		let addX = this.travelSpeed * Math.sin(this.rotX);
		let addY = this.travelSpeed * Math.tan(this.rotY);
		let addZ = this.travelSpeed * Math.cos(this.rotX);

		this.x += addX;
		this.y += addY;
		this.z += addZ;

		for(let block of world.blocks) {
			if(this.collidesBlock(block)) {
				this.collidingWith = block;
				return;
			}
		}

		for(let sphere of world.spheres) {
			if(this.collidesSphere(sphere)) {
				this.collidingWith = sphere;
				return;
			}
		}

		if(this.travelDistance >= this.maxTravelDistance) {
			// Reached object
			return;
		}
		this.loop();
	}

	private collidesBlock(block: Block): boolean {
		if(this.x >= block.x                && this.y >= block.y                && this.z >= block.z               &&
		   this.x <= block.x + block.width  && this.y <= block.y + block.height && this.z <= block.z + block.length) {
				return true;
		   }

		return false;
	}

	private collidesSphere(sphere: Sphere): boolean {
		let dist = distanceVector(this, sphere);
		// console.log(dist);
		if(dist < sphere.r) {
			return true;
		}
		return false;
	}

	public draw(ctx: CanvasRenderingContext2D) {
		ctx.globalAlpha = 1;
		ctx.fillStyle = "black";
		ctx.fillRect(this.visX, this.visY, 10, 10);

		ctx.fillStyle = "#87ceeb";
		if(this.collidingWith) ctx.fillStyle = this.collidingWith.color ?? "black";
		if(this.collidingWith && this.collidingWith.color !== "green") ctx.globalAlpha = 1 - (this.travelDistance / this.maxTravelDistance) * 20;
		ctx.fillRect(this.visX, this.visY, 10, 10);
	}

}

function update() {

	if(player) player.update();

	for(let x = 0; x < rays.length; x++) {
		for(let y = 0; y < rays[x].length; y++) {
			rays[x][y].update();
		}
	}
}

function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {

	canvas.width = config.blocksX;
	canvas.height = config.blocksY;

	for(let x = 0; x < rays.length; x++) {
		for(let y = 0; y < rays[x].length; y++) {
			rays[x][y].draw(ctx);
		}
	}
}

function main(): void {

	
	let ctx = canvas.getContext("2d");

	update();
	draw(canvas, ctx);
	requestAnimationFrame(main);
}

function init(): void {

	player = new Entity({
		controllable: true
	});

	document.addEventListener("mousemove", (evt: MouseEvent) => {
		player.rotX -= evt.movementX / 200;
		let newYRot = player.rotY - evt.movementY / 200;
		player.rotY = newYRot;
	});

	setInterval(() => {
		// player.x += 1;
		// player.z += 1;
	}, 10);

	canvas.requestPointerLock = canvas.requestPointerLock;

	canvas.onclick = () => {
		canvas.requestPointerLock();
	}
	

	for(let x = 0; x < config.blocksX; x++) {
		rays[x] = [];
		for(let y = 0; y < config.blocksY; y++) {
			rays[x][y] = new Ray({
				visX: x,
				visY: y,
				parent: player
			});
		}
	}

	main();
}
init();

function distanceVector( v1, v2 ) {
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}