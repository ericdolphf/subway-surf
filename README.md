# Project Report

## Team
* Eric Fang 605108653
* Frost Zhang 305125593

# Introduction

This project is a parkour game called *Surf Scout* where players will take control of the main character Scout to avoid 
all the obstacles and try to run as far as possible. The file `surf_scout.js` implements several classes that set up 
the basic scene and kept the metadata of the game. All other objects such as Scout, Road-Block, and train Cabin are 
implemented as subclasses of the `Object` class inside the `object.js` file. Custom textures are implemented inside the
`texture.js` file each as a subclass of `Textured_Phong`. Objects encapsulate their own configuration and the 
`Surf_Scout` class only needs to manage a list of different properties of objects and randomly generate and display the
corresponding shapes according to the properties.

## How to Play

1. General:
   
The overall goal of this game is to jump, slide down and move between rails to avoid getting bumped into the obstacles 
in the tunnel. One can press ‘w’ for a low jump, ‘space’ for a high jump, ‘a’ and ‘d’ for switching left and right, and
‘s’ for sliding down.

2. Different obstacles:

In the surf the Scout will encounter different obstacles. For most of the obstacles, once the Scout bumps into any of 
them, it will lose one life :(. Good news is that our Scout is tough enough that it has 3 lives at the beginning (Whoo)!
Cherish it if you make the Scout bump into an object by accident and it still has more lives!

    a. Road_Block: The most basic obstacle. Our Scout can easily get it over just by a simple low jump.
    b. SignalLight: An obstacle that is higher, but hollow at the bottom. Our Scout can no longer overcome a SignalLight
        by a low jump! Try to pass through it by sliding down, or a high jump. TIP: by performing a high jump the Scout
        loses the chance of jumping again in a certain time (who can jump in the air!?) (but it can still switch between
        rails in the air -- who knows how we make it possible!), so use it carefully!
    c. Cabin: A loooooong obstacle, that is large and sturdy. Unless our Scout is Superman (and unfortunately it isn’t 
        T^T), it cannot overcome the whole Cabin with a single jump! Luckily, the Cabin is hard enough that our Scout 
        could land on top of it! Try a high jump at an accurate time to land and avoid all obstacles on the ground! TIP:
        Though Cabins can give us a highland to avoid obstacles, they are themselves obstacles! Also, since it is so 
        hard and sturdy, our Scout will immediately LOSE ALL ITS LIVES as long as it gets hit by a Cabin! Thus, if you 
        are not so confident of your jumping skills, try to let the Scout avoid the Cabin instead, by moving to another 
        rail. However, do try and practice as it deserves the reward! 

3. Adjust difficulty:

Nice as we are, our group provides the freedom to let the players choose the difficulty at their will! The default 
difficulty is 1, but you can freely adjust the difficulty, from 1 to 9, by pressing ‘]‘ for increase and ‘[’ for 
decrease. One can also press ‘Shift’ to boost the velocity of our Scout. Either increasing difficulty or increasing 
scout velocity will the Scout be able to gain score quicker, which is shown in the top left corner of the screen. 
Higher risk, larger gain!

4. Other features:

    a. Pause: Press ‘=’ at any time to pause the game. Break and take a cup of coffee if you are so professional in this
        game and can run forever! (we wish we could also have that button when we worked on this project 8*) )
   
    b. Restart: If you are bored with the current Scout in a run, you could press ‘Enter’ -- everything will end! And 
        just as when the game starts, you could press ‘Enter’ again to start playing with another brand new Scout! But 
        keep in mind: you can always switch to a new Scout, but you CANNOT constantly switch to a new 
        boyfriend/girlfriend!! 

# Advanced Features

Advanced features in this project mainly involve object collision detection and physics simulation. Object collision 
detection is used to detect if the player collides with another object in the scene to determine when to increase or 
decrease the player’s point. Physics simulation is used to simulate the motions of the player.

## Object collision

Since we only translate and scale the objects in our project, the volume of all objects can be represented as a center 
point and a bounding box. The bounding box can be further divided into 3 intervals in the 3D space, and therefore, 
checking if two objects collide with each other can be decomposed into checking if two objects overlap on all 3 
intervals. The bounding box for each object is hard-coded because there currently lacks an effective way to determine 
the intervals of an object with the given `tiny-graphics` interface, especially for objects created from `.obj` files.

## Physics

In our model we implemented physics-based vertical movement driven by gravity. First, whenever the scout is not on the 
floor (or the cabin if there is one at its location), it’s velocity on y-direction will change uniformly in time, with 
acceleration g defined in the scene. Also, when pressing ‘w’ or space, the scout will be given an initial velocity 
(smaller if pressing ‘w’ and larger if pressing space), so that it could jump forward. After that the velocity and 
position will be totally controlled by the gravity, until it lands on the floor or a cabin.

# References

* Road_Block and SignalLight texture: <https://www.vexels.com/png-svg/preview/149991/road-block-sign-illustration>;
* Rail texture: <https://tekkitclassic.fandom.com/wiki/Track>;
* Tunnel texture: <https://nl.pinterest.com/pin/638807528370979541/>;
* Cabin texture: <http://www.i-tex.de/gallery.php?section=Synthetic&image=logcabin.jpg>. 
* Some of our ideas for this project originated from the game Subway Surfers and Temple Run. 