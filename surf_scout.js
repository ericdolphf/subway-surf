import {tiny, defs} from './examples/common.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";
import {objs} from './objects.js'
import {txts} from './textures.js'

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;

class Scout {
    constructor() {
        this.transforms = {
            body: Mat4.identity()
                .times(Mat4.scale(0.5,0.75,0.5))
            ,
            head: Mat4.identity()
                .times(Mat4.translation(0, 1.1,0))
                .times(Mat4.scale(0.45,0.45,0.45))
            ,
            left_leg: Mat4.translation(-0.3,-1,0)
                .times(Mat4.scale(0.25,0.6,0.25))
            ,
            right_leg: Mat4.translation(0.3,-1,0)
                .times(Mat4.scale(0.25,0.6,0.25))
            ,
            left_arm: Mat4.translation(-0.8,0,0)
                .times(Mat4.rotation(-Math.PI/4, 0,0,1))
                .times(Mat4.scale(0.25, 0.6, 0.25))
            ,
            right_arm: Mat4.translation(0.8,0,0)
                .times(Mat4.rotation(Math.PI/4, 0,0,1))
                .times(Mat4.scale(0.25, 0.6, 0.25))
            ,
        }

        this.shapes = {
            sphere: new defs.Subdivision_Sphere(5),
        }
    }

    draw(context, program_state, transform_basis, material, phase) {
        let transform_body = transform_basis
            .times(this.transforms.body)
        ;
        this.shapes.sphere.draw(context, program_state, transform_body, material);

        let transform_head =  transform_basis
            .times(this.transforms.head)
        ;
        this.shapes.sphere.draw(context, program_state, transform_head, material);

        let transform_left_leg = transform_basis
            .times(Mat4.rotation(phase, 1, 0, 0))
            .times(this.transforms.left_leg)
        ;
        this.shapes.sphere.draw(context, program_state, transform_left_leg, material);

        let transform_right_leg = transform_basis
            .times(Mat4.rotation(-phase, 1, 0, 0))
            .times(this.transforms.right_leg)
        ;
        this.shapes.sphere.draw(context, program_state, transform_right_leg, material);

        let transform_left_arm =  transform_basis
            .times(Mat4.rotation(phase, 0,1,0))
            .times(this.transforms.left_arm)
        ;
        this.shapes.sphere.draw(context, program_state, transform_left_arm, material);

        let transform_right_arm =  transform_basis
            .times(Mat4.rotation(phase, 0,1,0))
            .times(this.transforms.right_arm)
        ;
        this.shapes.sphere.draw(context, program_state, transform_right_arm, material);
    }
}

class Tunnel {
    constructor(width, height_side, height_top, length) {
        let arc_start_angle = 2 * Math.atan(width/2/(height_top - height_side)) - Math.PI/2;
        let r = width / (2*Math.cos(arc_start_angle));

        this.shapes = {
            tunnel_top: new defs.Surface_Of_Revolution(2, 50, tiny.Vector3.cast([r*Math.cos(arc_start_angle), r*Math.sin(arc_start_angle), 0],[r*Math.cos(arc_start_angle), r*Math.sin(arc_start_angle), -length]), [[0, r*(Math.PI - 2*arc_start_angle)/2],[0, length/2]], Math.PI - 2*arc_start_angle),
            tunnel_wall: new defs.Square(),
            tunnel_ground: new defs.Square()
        };
        this.shapes.tunnel_wall.arrays.texture_coord = [[0,0],[height_side/2,0],[0, length/2],[height_side/2, length/2]];
        this.shapes.tunnel_ground.arrays.texture_coord = [[0,0],[width/2, 0],[0,length/2],[width/2, length/2]];

        this.transforms = {
            tunnel_top: Mat4.translation(0, height_top-r, 0),
            tunnel_wall_left: Mat4.rotation(-Math.PI/2, 1,0,0)
                .times(Mat4.rotation(Math.PI/2, 0,1,0))
                .times(Mat4.scale(height_side/2, length/2, 1))
                .times(Mat4.translation(-1, 1, -width/2)),
            tunnel_wall_right: Mat4.rotation(-Math.PI/2, 1,0,0)
                .times(Mat4.rotation(-Math.PI/2, 0,1,0))
                .times(Mat4.scale(height_side/2, length/2, 1))
                .times(Mat4.translation(1, 1, -width/2)),
            tunnel_ground: Mat4.rotation(-Math.PI/2, 1,0,0)
                .times(Mat4.scale(width/2, length/2, 1))
                .times(Mat4.translation(0,1,0))
        }
    }

    draw(context, program_state, transform_basis, start_dist, material) {
        transform_basis = transform_basis.times(Mat4.translation(0,-0.1,-start_dist));
        this.shapes.tunnel_top.draw(context, program_state, transform_basis.times(this.transforms.tunnel_top), material);
        this.shapes.tunnel_wall.draw(context, program_state, transform_basis.times(this.transforms.tunnel_wall_left), material);
        this.shapes.tunnel_wall.draw(context, program_state, transform_basis.times(this.transforms.tunnel_wall_right), material);
        this.shapes.tunnel_ground.draw(context, program_state, transform_basis.times(this.transforms.tunnel_ground), material);
    }
}

export class Surf_Scout_Base extends Scene
{                                          // **Transforms_Sandbox_Base** is a Scene that can be added to any display canvas.
                                           // This particular scene is broken up into two pieces for easier understanding.
                                           // The piece here is the base class, which sets up the machinery to draw a simple
                                           // scene demonstrating a few concepts.  A subclass of it, Transforms_Sandbox,
                                           // exposes only the display() method, which actually places and draws the shapes,
                                           // isolating that code so it can be experimented with on its own.
    constructor()
    {                  // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.floor = 0;
        this.curr_rail = 0;

        this.t_jump = 0;
        this.h_hi = 1.5;
        this.h_lo = 0.75;
        this.g = 15;
        this.v_hi = Math.sqrt(2*this.g*this.h_hi);
        this.v_lo = Math.sqrt(2*this.g*this.h_lo);
        this.jump_start = false;
        this.jump = false;
        this.jump_kind = 0; // 0 for high jump, 1 for low jump;

        this.t_switch = 0;
        this.rail_width = 2;
        this.v_switch = 10;
        this.switch_start = 0;
        this.switch_left = false;
        this.switch_right = false;

        this.omega_down = 2*Math.PI * 2;
        this.angle_down = 0;
        this.down_start = false;
        this.down = false;
        this.recover = false;

        this.v_scout_0 = this.v_scout = 10;
        this.omega_scout_sway_0 = this.omega_scout_sway = 10;

        this.object_types = [new objs.Road_Block(this.scene_far, this.scene_near)];
        this.object_count = 0;
        this.max_object_count = 5;
        this.objects = [];
        this.object_gen_rate = 0.8; // # objects per second

        this.camera_pos = vec3(0, 5, 6);
        this.camera_angle = Math.PI/6; // > PI/8 to limit the view

        this.scene_far = this.camera_pos[1] / Math.tan(this.camera_angle - Math.PI/8) - this.camera_pos[2];
        this.scene_far = Math.ceil(this.scene_far/10) * 10;
        this.scene_near = -this.camera_pos[2];
        this.scene_near = Math.floor(this.scene_near/10) * 10;

        let tunnel_width = 3*this.rail_width + 0.5;
        let tunnel_height_side = this.camera_pos[1] - 1.5;
        let tunnel_height_top = this.camera_pos[1] + 1;
        let tunnel_length = this.scene_far-this.scene_near;

        this.rail_stretch = 3.5;

        this.shapes = {
            box  : new Cube(),
            ball : new Subdivision_Sphere( 4 ),
            square  : new Square(),
            scout :  new Scout(),
            rail: new Square(),
            tunnel: new Tunnel(tunnel_width, tunnel_height_side, tunnel_height_top, tunnel_length)
        };
        this.shapes.rail.arrays.texture_coord = tiny.Vector.cast([0,0], [1,0], [0, (this.scene_far-this.scene_near)/this.rail_width/this.rail_stretch], [1, (this.scene_far-this.scene_near)/this.rail_width/this.rail_stretch]);

        const phong = new defs.Phong_Shader();
        this.materials = {
            plastic: new Material( phong,
                { ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) } ),
            metal: new Material( phong,
                { ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) } ),
            transparent: new Material(phong,
                {ambient: .2, diffusivity: .8, specularity: .5, color: color(.9,.9,.9,.3)}),
            block: new Material(new defs.Textured_Phong(), {
                color: color(1., 1., 1., 1),
                ambient: .5, diffusivity: 0.5, specularity: 0.3,
                texture: new Texture("assets/road-block.jpg")
            }),
            rail: new Material(new txts.Texture_Rail(), {
                color: hex_color("#000000"),
                ambient: .5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/rail.png", "NEAREST") // texture source: https://tekkitclassic.fandom.com/wiki/Track
            }),
            tunnel: new Material(new txts.Texture_Tunnel(), {
                color: hex_color("#000000"),
                ambient: .5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/tunnel1.jpg", "NEAREST") // texture source: https://nl.pinterest.com/pin/638807528370979541/
            }),
        };
    }
    make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Dragonfly rotation angle: <br>";
        // The next line adds a live text readout of a data member of our Scene.
        this.live_string( box => { box.textContent = ( ( this.t % (2*Math.PI)).toFixed(2) + " radians" )} );
        this.new_line();
        // Add buttons so the user can actively toggle data members of our Scene:
        this.key_triggered_button( "High Jump", [ "8" ], () => { if (!this.jump && !this.down && !this.recover) {this.jump_start = 1; this.jump_kind = 0; } } );
        this.new_line();
        this.key_triggered_button( "Low Jump", [ "i" ], () => { if (!this.jump && !this.down && !this.recover) {this.jump_start = 1; this.jump_kind = 1; } } );
        this.new_line();
        this.key_triggered_button( "Switch Left", [ "j" ], () => { if (!(this.switch_left || this.switch_right)) {this.switch_start = 1} } );
        this.new_line();
        this.key_triggered_button( "Switch Right", [ "l" ], () => { if(!(this.switch_left || this.switch_right)) {this.switch_start = -1} } );
        this.new_line();
        this.key_triggered_button( "Lie Down", [ "k" ], () => { this.down_start = true; }, undefined, () => { this.down_start = false; });
        this.new_line();
        this.key_triggered_button( "Pause/Resume", [ "=" ], () => { this.v_scout = (this.v_scout === 0 ? this.v_scout_0 : 0); this.omega_scout_sway = (this.omega_scout_sway === 0 ? this.omega_scout_sway_0 : 0); } );
    }
    display( context, program_state )
    {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Transforms_Sandbox, a
        // subclass of this Scene.  Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !context.scratchpad.controls )
        {   this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );

            // Define the global camera and projection matrices, which are stored in program_state.  The camera
            // matrix follows the usual format for transforms, but with opposite values (cameras exist as
            // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
            // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() and
            // orthographic() automatically generate valid matrices for one.  The input arguments of
            // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.
            let transform_camera = Mat4.inverse(Mat4.identity()
                .times(Mat4.translation( this.camera_pos[0], this.camera_pos[1], this.camera_pos[2] ))
                .times(Mat4.rotation(-this.camera_angle, 1,0,0))
            );
            program_state.set_camera( transform_camera );
            program_state.rail_width = this.rail_width; // set the rail_width to pass to shader
            program_state.rail_stretch = this.rail_stretch;
        }
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const light_position = Mat4.rotation( 0,   1,0,0 ).times( vec4( 0,-1,1,0 ) );
        program_state.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ];
    }
}


export class Surf_Scout extends Surf_Scout_Base
{                                                    // **Transforms_Sandbox** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, Transforms_Sandbox_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
    display( context, program_state ) {                                                // display():  Called once per frame of animation.  For each shape that you want to
        // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
        // different matrix value to control where the shape appears.

        // program_state:  Information the shader needs for drawing.  Pass to draw().
        // context:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

        // Call the setup code that we left inside the base class:
        super.display(context, program_state);

        /**********************************
         Start coding down here!!!!
         **********************************/
            // From here on down it's just some example shapes drawn for you -- freely
            // replace them with your own!  Notice the usage of the Mat4 functions
            // translation(), scale(), and rotation() to generate matrices, and the
            // function times(), which generates products of matrices.

        const blue = color(0, 0, 1, 1), yellow = color(1, 1, 0, 1);

        // Find how much time has passed in seconds; we can use
        // time as an input when calculating new transforms:
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // set the variables in program_state to pass to the shader
        program_state.v_scout = this.v_scout;

        let exp_frame_per_object = Math.floor(1/(dt * this.object_gen_rate));
        if (this.object_count <= this.max_object_count && (Math.floor(Math.random() * exp_frame_per_object) % exp_frame_per_object === Math.floor(exp_frame_per_object / 2))) {
            this.objects.push({ind: 0, curr_dist: this.scene_far, rail_ind: Math.floor(Math.random() * 3)-1});
            this.object_count += 1;
        }

        for (let i = 0; i < this.object_count;) {
            let obj_type = this.object_types[this.objects[i].ind];
            this.objects[i].curr_dist -= dt * this.v_scout;
            obj_type.draw(context, program_state, this.objects[i].curr_dist, this.objects[i].rail_ind);
            if (this.objects[i].curr_dist < this.scene_near) {
                this.objects.splice(i, 1);
                this.object_count -= 1;
                continue;
            }
            i++;
        }

        let phase = Math.PI/6*Math.cos(this.omega_scout_sway*t);
        let transform_scout = Mat4.translation(this.curr_rail * this.rail_width, 0, 0)
            .times(Mat4.scale(0.3,0.3,0.3))
        ;

        if (this.jump_start && !this.jump && !this.down) {
            this.t_jump = t;
            this.jump = true;
            this.jump_start = false;
        }
        if (this.jump) {
            let h = this.floor + (this.jump_kind === 0 ? this.v_hi : this.v_lo) * (t-this.t_jump) - 1/2 * this.g * (t-this.t_jump)**2;
            transform_scout = Mat4.translation(0, h, 0).times(transform_scout);
            if (h <= this.floor && t !== this.t_jump) {
                this.jump = false;
            } else {
                transform_scout = Mat4.translation(0, h, 0).times(transform_scout);
            }
        }

        if (this.down_start && !this.jump) {
            this.down = true;
        }
        if (!this.down_start && this.down) {
            this.recover = true;
            this.down = false;
        }
        if (this.down) {
            this.angle_down = Math.min(Math.PI/2, this.angle_down + dt * this.omega_down);
            phase = 0;
        } else if (this.recover) {
            this.angle_down = Math.max(0, this.angle_down - dt * this.omega_down);
            if (this.angle_down === 0) {
                this.recover = false;
            }
            phase = 0;
        }
        transform_scout = Mat4.translation(0, 0.15+0.35*Math.cos(this.angle_down),0).times(Mat4.rotation(this.angle_down, 1,0,0)).times(transform_scout);

        if (this.switch_start === 1 && !this.switch_right && this.curr_rail >= 0) {
            this.t_switch = t;
            this.switch_left = true;
            this.switch_start = 0;
        }
        if (this.switch_left) {
            let dx = -this.v_switch * (t - this.t_switch);
            if (dx <= -this.rail_width) {
                this.switch_left = false;
                this.curr_rail -= 1;
                transform_scout = Mat4.translation(-this.rail_width, 0, 0)
                    .times(transform_scout)
                ;
            } else {
                transform_scout = Mat4.translation(dx, 0, 0).times(transform_scout);
            }
        }

        if (this.switch_start === -1 && !this.switch_left && this.curr_rail <= 0) {
            this.t_switch = t;
            this.switch_right = true;
            this.switch_start = 0;
        }
        if (this.switch_right) {
            let dx = this.v_switch * (t - this.t_switch);
            if (dx >= this.rail_width) {
                this.switch_right = false;
                this.curr_rail += 1;
                transform_scout = Mat4.translation(this.rail_width, 0, 0)
                    .times(transform_scout)
                ;
            } else {
                transform_scout = Mat4.translation(dx, 0, 0).times(transform_scout);
            }
        }

        this.shapes.scout.draw(context, program_state, transform_scout, this.materials.metal.override({color: yellow}), phase);

        let transform_rail_basis = Mat4.translation(0,0, -this.scene_near)
            .times(Mat4.rotation(-Math.PI/2, 1,0,0))
            .times(Mat4.scale(1, (this.scene_far-this.scene_near)/2, this.rail_width/2))
            .times(Mat4.translation(0, 1, 0))
        ;
        let transform_rails = [Mat4.translation(-this.rail_width,0,0), Mat4.identity(), Mat4.translation(this.rail_width,0,0)];
        for (let t of transform_rails) {
            this.shapes.rail.draw(context, program_state, transform_rail_basis.times(t), this.materials.rail);
        }

        this.shapes.tunnel.draw(context, program_state, Mat4.identity(), this.scene_near, this.materials.tunnel);

        // Note that our coordinate system stored in model_transform still has non-uniform scaling
        // due to our scale() call.  This could have undesired effects for subsequent transforms;
        // rotations will behave like shears.  To avoid this it may have been better to do the
        // scale() last and then immediately unscale after the draw.  Or better yet, don't store
        // the scaled matrix back in model_transform at all -- but instead in just a temporary
        // expression that we pass into draw(), or store under a different name.
    }
}