import {tiny, defs} from './examples/common.js';
import {objs, intercept} from './objects.js'
import {txts} from './textures.js'

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;

function mix(src, tar, rate) {
    return (1-rate) * src + rate * tar;
}

class Text_Line extends Shape
{
    // **Text_Line** embeds text in the 3D world, using a crude texture
    // method.  This Shape is made of a horizontal arrangement of quads.
    // Each is textured over with images of ASCII characters, spelling
    // out a string.  Usage:  Instantiate the Shape with the desired
    // character line width.  Then assign it a single-line string by calling
    // set_string("your string") on it. Draw the shape on a material
    // with full ambient weight, and text.png assigned as its texture
    // file.  For multi-line strings, repeat this process and draw with
    // a different matrix.
    constructor( max_size )
    { super( "position", "normal", "texture_coord" );
        this.max_size = max_size;
        var object_transform = Mat4.identity();
        for( var i = 0; i < max_size; i++ )
        {                                       // Each quad is a separate Square instance:
            defs.Square.insert_transformed_copy_into( this, [], object_transform );
            object_transform.post_multiply( Mat4.translation( 1.5,0,0 ) );
        }
    }
    set_string( line, context )
    {           // set_string():  Call this to overwrite the texture coordinates buffer with new
        // values per quad, which enclose each of the string's characters.
        this.arrays.texture_coord = [];
        for( var i = 0; i < this.max_size; i++ )
        {
            var row = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) / 16 ),
                col = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) % 16 );

            var skip = 3, size = 32, sizefloor = size - skip;
            var dim = size * 16,
                left  = (col * size + skip) / dim,      top    = (row * size + skip) / dim,
                right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

            this.arrays.texture_coord.push( ...tiny.Vector.cast( [ left,  1-bottom], [ right, 1-bottom ],
                [ left,  1-top   ], [ right, 1-top    ] ) );
        }
        if( !this.existing )
        { this.copy_onto_graphics_card( context );
            this.existing = true;
        }
        else
            this.copy_onto_graphics_card( context, ["texture_coord"], false );
    }
}

class Tunnel {
    constructor(width, height_side, height_top, length) {
        let arc_start_angle = 2 * Math.atan(width/2/(height_top - height_side)) - Math.PI/2;
        let r = width / (2*Math.cos(arc_start_angle));

        this.shapes = {
            tunnel_top: new defs.Surface_Of_Revolution(2, 50, tiny.Vector3.cast([r*Math.cos(arc_start_angle), r*Math.sin(arc_start_angle), 0],[r*Math.cos(arc_start_angle), r*Math.sin(arc_start_angle), -length]), [[0, r*(Math.PI - 2*arc_start_angle)/2],[0, length/2]], Math.PI - 2*arc_start_angle),
            tunnel_wall_left: new defs.Square(),
            tunnel_wall_right: new defs.Square(),
            tunnel_ground: new defs.Square()
        };
        this.shapes.tunnel_wall_left.arrays.texture_coord = [[0,height_side/2], [0,0], [length/2, height_side/2], [length/2, 0]];
        this.shapes.tunnel_wall_right.arrays.texture_coord = [[0,0], [0,height_side/2], [length/2, 0], [length/2, height_side/2]];
        this.shapes.tunnel_ground.arrays.texture_coord = [[0,width/2], [0,0], [length/2, width/2], [length/2, 0]];
        for (let i = 0; i < this.shapes.tunnel_top.arrays.texture_coord.length; i++) {
            let temp = this.shapes.tunnel_top.arrays.texture_coord[i][0];
            this.shapes.tunnel_top.arrays.texture_coord[i][0] = this.shapes.tunnel_top.arrays.texture_coord[i][1];
            this.shapes.tunnel_top.arrays.texture_coord[i][1] = temp;
        }

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
        this.shapes.tunnel_wall_left.draw(context, program_state, transform_basis.times(this.transforms.tunnel_wall_left), material);
        this.shapes.tunnel_wall_right.draw(context, program_state, transform_basis.times(this.transforms.tunnel_wall_right), material);
        this.shapes.tunnel_ground.draw(context, program_state, transform_basis.times(this.transforms.tunnel_ground), material);
    }
}

export class Surf_Scout_Base extends Scene
{
    // **Transforms_Sandbox_Base** is a Scene that can be added to any display canvas.
    // This particular scene is broken up into two pieces for easier understanding.
    // The piece here is the base class, which sets up the machinery to draw a simple
    // scene demonstrating a few concepts.  A subclass of it, Transforms_Sandbox,
    // exposes only the display() method, which actually places and draws the shapes,
    // isolating that code so it can be experimented with on its own.
    constructor()
    {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.debug = false; // for debugging

        this.score = 0; /* Needs Reset */
        this.start = this.start_flag = 0;

        this.camera_pos = vec3(0, 5, 6); /* Needs Reset */
        this.camera_angle = Math.PI/6 - Math.PI/48; // > PI/8 to limit the view

        this.scene_far = this.camera_pos[1] / Math.tan(this.camera_angle - Math.PI/8) - this.camera_pos[2];
        this.scene_far = Math.ceil(this.scene_far/10) * 10;
        this.scene_near = -this.camera_pos[2];
        this.scene_near = Math.floor(this.scene_near/10) * 10;

        this.rail_width = 2;

        this.h_lo = 1.5; // this.camera_pos[1] * 0.3;
        this.h_hi = 3; // this.camera_pos[1] * 0.6;
        this.g_lo = 50;
        this.g_hi = 30;
        this.g = this.g_lo; /* Needs Reset */
        this.v_scout_y_hi = Math.sqrt(2*this.g_hi*this.h_hi);
        this.v_scout_y_lo = Math.sqrt(2*this.g_lo*this.h_lo);
        this.v_scout_y = 0; /* Needs Reset */

        this.v_scout_lo = 15;
        this.v_scout_hi = 1.5 * this.v_scout_lo;

        this.speedup = false; /* Needs Reset */
        this.omega_scout_sway_0 = 10;
        this.v_switch_0 = 10;

        this.omega_scout_sway = this.omega_scout_sway_0; /* Needs Reset */
        this.v_scout = this.v_scout_lo; /* Needs Reset */
        this.v_switch = this.v_switch_0; /* Needs Reset */

        this.pause = false; /* Needs Reset */

        this.switch_left = false; /* Needs Reset */
        this.switch_right = false; /* Needs Reset */

        this.omega_down = 2*Math.PI * 2;
        this.down_start = false; /* Needs Reset */
        this.down = false; /* Needs Reset */
        this.recover = false; /* Needs Reset */

        this.max_lives = this.debug ? 30 : 3;
        this.curr_lives = this.max_lives; /* Needs Reset */
        this.immune = false; /* Needs Reset */
        this.immune_flash_period = 0.5; // in seconds
        this.immune_duration = 2; // in seconds
        this.t_immune = 0; /* Needs Reset */

        this.tunnel_width = 3*this.rail_width + 0.5;
        this.tunnel_height_side = this.camera_pos[1] - 1.5;
        this.tunnel_height_top = this.camera_pos[1] + 1;
        this.tunnel_length = this.scene_far-this.scene_near;

        this.rail_stretch = 3.5;

        this.object_types = [new objs.Road_Block(), new objs.SignalLight(), new objs.Cabin(this.tunnel_length, this.rail_width)];
        this.object_count = 0; /* Needs Reset */
        this.min_difficulty = 1;
        this.max_difficulty = 9;
        this.curr_difficulty = this.min_difficulty; /* Needs Reset */
        this.objects = []; /* Needs Reset */

        this.scout = new objs.Scout();
        this.shapes = {
            box  : new Cube(),
            ball : new Subdivision_Sphere( 4 ),
            square  : new Square(),
            rail: new Square(),
            tunnel: new Tunnel(this.tunnel_width, this.tunnel_height_side, this.tunnel_height_top, this.tunnel_length),
            text: new Text_Line(35)
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
                ambient: .7, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/rail.png", "NEAREST") // texture source: https://tekkitclassic.fandom.com/wiki/Track
            }),
            tunnel: new Material(new txts.Texture_Tunnel(), {
                color: hex_color("#000000"),
                ambient: .6, diffusivity: 0.3, specularity: 0.1,
                texture: new Texture("assets/tunnel.jpg", "NEAREST") // texture source: https://nl.pinterest.com/pin/638807528370979541/
            }),
            text_image: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#ff7700"),
                ambient: 0.5, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/text.png")
            })
        };
    }
    get_obj_gen_rate() {
        return (this.curr_difficulty + 5) / (this.scene_far-this.scene_near) * this.v_scout_lo;
    }
    get_min_obj_dist() {
        return (this.scene_far-this.scene_near) / (this.curr_difficulty + 5);
    }
    get_curr_rail() {
        return Math.floor(this.scout.curr_x / this.rail_width + 1);
    }
    get_floor() {
        for (let obj of this.objects) {
            let obj_type = this.object_types[obj.ind];
            let h = obj_type.roof; // h > 0 means a cabin
            if (obj.if_hitzone && h > 0 && this.scout.check_collision(obj_type, obj.curr_dist, obj.rail_ind, this.rail_width, false)) {
                if (!this.immune)
                    return h + 0.01; // so that the cabin doesn't actually touches the scout, to prevent collision issues
                else {
                    if (this.scout.curr_h <= h + 0.01)
                        return 0;
                    else {
                        this.immune = false;
                        return h + 0.01;
                    }
                }
            }
        }
        return 0;
    }
    make_control_panel()
    {
        // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.

        let silver = '#949393';

        // this.live_string( box => { box.textContent = ( ( this.t % (2*Math.PI)).toFixed(2) + " radians" )} );
        this.key_triggered_button("Start Game", [ "Enter" ], () => { if (this.start === 0) this.start_flag = 1; else if (!this.pause) this.start = 0;}, silver);
        this.new_line();
        this.key_triggered_button( "High Jump", [ " " ], () => { if (this.scout.curr_h <= this.get_floor() && !this.down && !this.recover && !this.pause) { this.v_scout_y = this.scout.curr_h === 0 ? this.v_scout_y_hi : this.v_scout_y_lo; this.g =  this.g_hi; } } , silver);
        this.key_triggered_button( "Low Jump", [ "w" ], () => { if (this.scout.curr_h <= this.get_floor() && !this.down && !this.recover && !this.pause) { this.v_scout_y = this.v_scout_y_lo; this.g =  this.g_lo; } }, silver );
        this.key_triggered_button( "Move Left", [ "a" ], () => { if (this.scout.curr_x > -this.rail_width && !this.pause) {this.switch_left = true; this.switch_right = false;} }, silver );
        this.key_triggered_button( "Move Right", [ "d" ], () => { if (this.scout.curr_x < this.rail_width && !this.pause) {this.switch_left = false; this.switch_right = true;} }, silver );
        this.key_triggered_button( "Lie Down", [ "s" ], () => { if (!this.pause) this.down_start = true; }, silver, () => { if (!this.pause) this.down_start = false; });
        this.key_triggered_button( "Speed Up/Down", [ "Shift" ], () => { if (!this.pause) this.speedup ^= true; }, silver);// , () => { if (!this.pause) this.speedup = false });
        this.key_triggered_button( "Pause/Resume", [ "-" ], () => { this.pause ^= true; } ,silver);
        if (this.debug)
            this.key_triggered_button( "(Debug) Refill Lives", [ "=" ], () => { this.curr_lives = this.max_lives; } ,silver);
        this.new_line();
        this.new_line();
        let color_easy = '#3ff13f';
        let color_hard = '#f17241';
        this.key_triggered_button("- (at least " + this.min_difficulty.toString() + ")", ["["], () => { this.curr_difficulty = Math.max(this.curr_difficulty-1, this.min_difficulty); }, color_easy);
        this.new_line();
        this.new_line();
        this.live_string( box => { box.textContent = "Current Difficulty: " + this.curr_difficulty.toString() });
        this.new_line();
        this.new_line();
        this.key_triggered_button("+ (at most " + this.max_difficulty.toString() + ")", ["]"], () => { this.curr_difficulty = Math.min(this.curr_difficulty+1, this.max_difficulty); }, color_hard);
    }
    reset() {
        this.g = this.g_lo; /* Needs Reset */
        this.camera_pos = vec3(0, 5, 6); /* Needs Reset */
        this.score = 0; /* Needs Reset */
        this.omega_scout_sway = this.omega_scout_sway_0; /* Needs Reset */
        this.v_scout = this.v_scout_lo; /* Needs Reset */
        this.v_scout_y = 0; /* Needs Reset */
        this.speedup = false; /* Needs Reset */
        this.v_switch = this.v_switch_0; /* Needs Reset */
        this.pause = false; /* Needs Reset */
        this.switch_left = false; /* Needs Reset */
        this.switch_right = false; /* Needs Reset */
        this.down_start = false; /* Needs Reset */
        this.down = false; /* Needs Reset */
        this.recover = false; /* Needs Reset */
        this.curr_lives = this.max_lives; /* Needs Reset */
        this.immune = false; /* Needs Reset */
        this.t_immune = 0; /* Needs Reset */

        this.object_count = 0; /* Needs Reset */
        this.curr_difficulty = this.min_difficulty; /* Needs Reset */
        this.objects = []; /* Needs Reset */

        this.scout.curr_x = 0; /* Needs Reset */
        this.scout.curr_h = 0; /* Needs Reset */
        this.scout.angle_down = 0; /* Needs Reset */
        this.scout.sway_phase = 0; /* Needs Reset */
    }
    display( context, program_state )
    {
        // display():  Called once per frame of animation.  We'll isolate out
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
            program_state.curr_dist = 0; /* Needs Reset */
        }
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const light_position = Mat4.rotation( 0,   1,0,0 ).times( vec4( 0,-1,1,0 ) );
        program_state.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ];
    }
}


export class Surf_Scout extends Surf_Scout_Base
{
    // **Transforms_Sandbox** is a Scene object that can be added to any display canvas.
     // This particular scene is broken up into two pieces for easier understanding.
     // See the other piece, Transforms_Sandbox_Base, if you need to see the setup code.
     // The piece here exposes only the display() method, which actually places and draws
     // the shapes.  We isolate that code so it can be experimented with on its own.
     // This gives you a very small code sandbox for editing a simple scene, and for
     // experimenting with matrix transformations.
    display( context, program_state ) {
        // display():  Called once per frame of animation.  For each shape that you want to
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

        if (this.start_flag === 1) {
            this.start = 1;
            this.reset();
            program_state.curr_dist = 0; /* Needs Reset */
            this.start_flag = 0;
            let transform_camera = Mat4.inverse(Mat4.identity()
                .times(Mat4.translation( this.camera_pos[0], this.camera_pos[1], this.camera_pos[2] ))
                .times(Mat4.rotation(-this.camera_angle, 1,0,0))
            );
            program_state.set_camera( transform_camera );
        }

        if (this.start === 0) {
            let transform_lines = program_state.camera_transform
                .times(Mat4.translation(0,0, -1.01))
            ;

            let line = 'Score Earned: ' + Math.floor(this.score).toString();
            let n_char = line.length;
            let scale_text = 0.04;
            let transform_line = transform_lines.times(Mat4.translation(- n_char * 1.5 * scale_text / 2, scale_text, 0));
            this.shapes.text.set_string(line, context.context);
            this.shapes.text.draw(context, program_state, transform_line.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image);
            transform_lines = transform_lines.times(Mat4.translation(0, -scale_text * 2, 0));

            line = 'Hit \'Enter\' to Start Surfing!';
            n_char = line.length;
            scale_text = 0.02;
            transform_line = transform_lines.times(Mat4.translation(- n_char * 1.5 * scale_text / 2, scale_text, 0));
            this.shapes.text.set_string(line, context.context);
            this.shapes.text.draw(context, program_state, transform_line.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image);

            return;
        }

        // Find how much time has passed in seconds; we can use
        // time as an input when calculating new transforms:
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // get the value of this.v_scout
        this.v_scout = mix(this.v_scout, this.speedup ? this.v_scout_hi : this.v_scout_lo, 0.2);

        if (this.pause) {
            this.v_scout = 0;
            this.omega_scout_sway = 0;
            this.v_switch = 0;

            let transform_lines = program_state.camera_transform
                .times(Mat4.translation(0,0, -1.01))
            ;
            let line = 'Pause';
            let scale_text = 0.04;
            let transform_line = transform_lines.times(Mat4.translation(- line.length * 1.5 * scale_text / 2, scale_text, 0));
            this.shapes.text.set_string(line, context.context);
            this.shapes.text.draw(context, program_state, transform_line.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image.override(hex_color('#eeeeee')));
            transform_lines = transform_lines.times(Mat4.translation(0, -scale_text * 2, 0));

            line = 'Press \'-\' to Restart!';
            scale_text = 0.02;
            transform_line = transform_lines.times(Mat4.translation(- line.length * 1.5 * scale_text / 2, scale_text, 0));
            this.shapes.text.set_string(line, context.context);
            this.shapes.text.draw(context, program_state, transform_line.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image.override(hex_color('#eeeeee')));

        } else {
            this.v_scout = mix(this.v_scout, this.speedup ? this.v_scout_hi : this.v_scout_lo, 0.1);
            this.omega_scout_sway = mix(this.omega_scout_sway, this.speedup ? this.omega_scout_sway_0 * this.v_scout_hi / this.v_scout_lo : this.omega_scout_sway_0, 0.1);
            this.v_switch = this.v_switch_0;
            program_state.curr_dist += dt * this.v_scout;
            this.score += dt * this.v_scout * (1 + (this.curr_difficulty-this.min_difficulty)/(this.max_difficulty-this.min_difficulty));
        }

        // set the variables in program_state to pass to the shader
        program_state.v_scout = this.v_scout;

        // randomly generate objects
        let expect_frame_per_object = Math.floor(1/(dt * this.get_obj_gen_rate()));
        if ((Math.floor(Math.random() * expect_frame_per_object) % expect_frame_per_object === Math.floor(expect_frame_per_object / 2))) {
            let curr_rail_ind = Math.floor(Math.random() * 3)-1;
            let if_generate = true;
            for (let j = 0; j < this.object_count; j++) {
                let curr_obj = this.object_types[this.objects[j].ind];
                if (this.objects[j].rail_ind === curr_rail_ind && this.objects[j].curr_dist + (curr_obj.front - curr_obj.rear)/2 > this.scene_far - this.get_min_obj_dist()) {
                    // the newly generated object is too close to the previous object on this rail
                    // in this case don't generate the object
                    if_generate = false;
                }
            }
            if (if_generate) {
                this.objects.push({ind: Math.floor(Math.random() * Math.floor(this.object_types.length)), curr_dist: this.scene_far, rail_ind: curr_rail_ind, if_hitzone: true});
                this.object_count += 1;
            }
        }

        // draw and process existing objects
        for (let i = 0; i < this.object_count; i++) {
            let obj_type = this.object_types[this.objects[i].ind];
            this.objects[i].curr_dist -= dt * this.v_scout;
            if (this.objects[i].curr_dist >= this.scene_near - (obj_type.front - obj_type.rear)) {
                if (!this.immune && this.objects[i].if_hitzone && this.scout.check_collision(obj_type, this.objects[i].curr_dist, this.objects[i].rail_ind, this.rail_width)) {
                    this.objects[i].if_hitzone = false;
                    if (obj_type.roof > 0) {
                        this.start = 0;
                        return;
                    }
                    this.curr_lives -= 1;
                    if (this.curr_lives === 0) {
                        // run out of lives!
                        this.start = 0;
                        return;
                    } else {
                        this.immune = true; // does it hurt? no worries!
                        this.t_immune = 0;
                    }
                }
                obj_type.draw(context, program_state, this.objects[i].curr_dist, this.objects[i].rail_ind);

                if (this.debug && this.objects[i].if_hitzone) obj_type.draw_outline(context, program_state, this.objects[i].curr_dist, this.objects[i].rail_ind, this.rail_width);
            } else {
                // object goes out of the view, remove it from the object list
                this.objects.splice(i, 1);
                this.object_count -= 1;
                i--; // since the current element is removed, restore the index by one to not skip any element
            }
        }

        // set the jump and fall movement:
        let curr_floor = this.get_floor();
        if (!this.pause && (this.scout.curr_h > curr_floor || this.v_scout_y !== 0)) {
            this.scout.curr_h += this.v_scout_y * dt;
            this.v_scout_y += -this.g * dt;
            if (this.scout.curr_h <= curr_floor) {
                this.scout.curr_h = curr_floor;
                this.v_scout_y = 0;
            }
        }

        // set the switch rail movement:
        if (this.switch_left) {
            let prev_x = this.scout.curr_x;
            this.scout.curr_x -= this.v_switch * dt;
            if (Math.ceil(prev_x / this.rail_width) !== Math.ceil(this.scout.curr_x / this.rail_width)) {
                this.switch_left = false;
                this.scout.curr_x = Math.ceil(this.scout.curr_x / this.rail_width) * this.rail_width;
            }
        }
        if (this.switch_right) {
            let prev_x = this.scout.curr_x;
            this.scout.curr_x += this.v_switch * dt;
            if (Math.floor(prev_x / this.rail_width) !== Math.floor(this.scout.curr_x / this.rail_width)) {
                this.switch_right = false;
                this.scout.curr_x = Math.floor(this.scout.curr_x / this.rail_width) * this.rail_width;
            }
        }

        // set the sway movement:
        this.scout.sway_phase += this.omega_scout_sway*dt;
        this.scout.sway_phase %= 2*Math.PI;
        if (this.down_start && this.scout.curr_h === this.get_floor()) {
            this.down = true;
        }
        if (!this.down_start && this.down) {
            this.recover = true;
            this.down = false;
        }
        if (this.down) {
            this.scout.angle_down = Math.min(Math.PI/2, this.scout.angle_down + dt * this.omega_down);
            this.scout.sway_phase = 0;
        } else if (this.recover) {
            this.scout.angle_down = Math.max(0, this.scout.angle_down - dt * this.omega_down);
            if (this.scout.angle_down === 0) {
                this.recover = false;
            }
            this.scout.sway_phase = 0;
        }

        if (this.immune) {
            if (this.t_immune >= this.immune_duration) {
                // you've already enjoyed the immune time for long enough!
                this.immune = false;
                this.scout.draw(context, program_state);
                if (this.debug) this.scout.draw_outline(context, program_state);
            } else if (this.t_immune % this.immune_flash_period >= this.immune_flash_period/2) {
                this.scout.draw(context, program_state);
            }
            if (!this.pause) this.t_immune += dt;
        } else {
            this.scout.draw(context, program_state);
            if (this.debug) this.scout.draw_outline(context, program_state);
        }

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

        let scale_text = 0.015;
        let lines = ['Current Score: ', Math.floor(this.score).toString()];
        let transform_lines = program_state.camera_transform
            .times(Mat4.translation(-Math.tan(Math.PI/8) * context.width/context.height + scale_text, Math.tan(Math.PI/8)-scale_text, -1.01))
        ;
        for (let line of lines) {
            this.shapes.text.set_string(line, context.context);
            this.shapes.text.draw(context, program_state, transform_lines.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image);
            transform_lines = transform_lines.times(Mat4.translation(0, -scale_text * 2, 0));
        }

        let line = "Current Difficulty: " + this.curr_difficulty.toString();
        let color_easy = hex_color('#00FF00');
        let color_hard = hex_color('#FF5100');
        let color_curr = color_easy.mix(color_hard, (this.curr_difficulty-this.min_difficulty)/(this.max_difficulty-this.min_difficulty));
        this.shapes.text.set_string(line, context.context);
        this.shapes.text.draw(context, program_state, transform_lines.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image.override(color_curr));

        line = "Current Lives: " + this.curr_lives.toString();
        let transform_line = program_state.camera_transform
            .times(Mat4.translation(Math.tan(Math.PI/8) * context.width/context.height - scale_text * 1.5 * line.length, Math.tan(Math.PI/8) - scale_text, -1.01))
        ;
        color_curr = color_hard.mix(color_easy, (this.curr_lives-1) / (this.max_lives-1));
        this.shapes.text.set_string(line, context.context);
        this.shapes.text.draw(context, program_state, transform_line.times(Mat4.scale(scale_text,scale_text,scale_text)), this.materials.text_image.override(color_curr));

        // Note that our coordinate system stored in model_transform still has non-uniform scaling
        // due to our scale() call.  This could have undesired effects for subsequent transforms;
        // rotations will behave like shears.  To avoid this it may have been better to do the
        // scale() last and then immediately unscale after the draw.  Or better yet, don't store
        // the scaled matrix back in model_transform at all -- but instead in just a temporary
        // expression that we pass into draw(), or store under a different name.
    }
}