import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;
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
    constructor() {

    }
}

export class Subway_Surf_Base extends Scene
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

        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = {
            box  : new Cube(),
            ball : new Subdivision_Sphere( 4 ),
            square  : new Square(),
        };

        this.scout = new Scout();

        // *** Materials: *** Define a shader, and then define materials that use
        // that shader.  Materials wrap a dictionary of "options" for the shader.
        // Here we use a Phong shader and the Material stores the scalar
        // coefficients that appear in the Phong lighting formulas so that the
        // appearance of particular materials can be tweaked via these numbers.
        const phong = new defs.Phong_Shader();
        this.materials = { plastic: new Material( phong,
                { ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) } ),
            metal: new Material( phong,
                { ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) } ),
            transparent: new Material(phong,
                {ambient: .2, diffusivity: .8, specularity: .5, color: color(.9,.9,.9,.3)}),
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
        this.key_triggered_button( "Switch Left", [ "j" ], () => { if (!(this.switch_left || this.switch_right)) {this.switch_start = 1}; } );
        this.new_line();
        this.key_triggered_button( "Switch Right", [ "l" ], () => { if(!(this.switch_left || this.switch_right)) {this.switch_start = -1}; } );
        this.new_line();
        this.key_triggered_button( "Lie Down", [ "k" ], () => { this.down_start = true; }, undefined, () => { this.down_start = false; });
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
                // .times(Mat4.rotation(-Math.PI/2, 0,1,0))
                .times(Mat4.translation( 0,3,5 ))
                .times(Mat4.rotation(-Math.PI/8, 1,0,0))
            );
            program_state.set_camera( transform_camera );
        }
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const light_position = Mat4.rotation( 0,   1,0,0 ).times( vec4( 0,-1,1,0 ) );
        program_state.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ];
    }
}


export class Subway_Surf extends Subway_Surf_Base
{                                                    // **Transforms_Sandbox** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, Transforms_Sandbox_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
    display( context, program_state )
    {                                                // display():  Called once per frame of animation.  For each shape that you want to
        // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
        // different matrix value to control where the shape appears.

        // Variables that are in scope for you to use:
        // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
        // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
        // this.materials.metal:    Selects a shader and draws with a shiny surface.
        // this.materials.plastic:  Selects a shader and draws a more matte surface.
        // this.lights:  A pre-made collection of Light objects.
        // this.hover:  A boolean variable that changes when the user presses a button.
        // program_state:  Information the shader needs for drawing.  Pass to draw().
        // context:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

        // Call the setup code that we left inside the base class:
        super.display( context, program_state );

        /**********************************
         Start coding down here!!!!
         **********************************/
            // From here on down it's just some example shapes drawn for you -- freely
            // replace them with your own!  Notice the usage of the Mat4 functions
            // translation(), scale(), and rotation() to generate matrices, and the
            // function times(), which generates products of matrices.

        const blue = color( 0,0,1,1 ), yellow = color( 1,1,0,1 );

        // Find how much time has passed in seconds; we can use
        // time as an input when calculating new transforms:
        const t = program_state.animation_time/1000, dt = program_state.animation_delta_time/1000;

        let phase = Math.PI/6*Math.cos(10*t);

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

        this.scout.draw(context, program_state, transform_scout, this.materials.metal.override({color: yellow}), phase);
        this.shapes.square.draw(context, program_state, Mat4.rotation(Math.PI/2, 1,0,0), this.materials.metal);

        // Note that our coordinate system stored in model_transform still has non-uniform scaling
        // due to our scale() call.  This could have undesired effects for subsequent transforms;
        // rotations will behave like shears.  To avoid this it may have been better to do the
        // scale() last and then immediately unscale after the draw.  Or better yet, don't store
        // the scaled matrix back in model_transform at all -- but instead in just a temporary
        // expression that we pass into draw(), or store under a different name.
    }
}