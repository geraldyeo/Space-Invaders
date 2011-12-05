ig.module( 
	'game.main' 
)
.requires(
	'impact.game',
	'impact.entity',
	'impact.background-map',
	'impact.timer',
	'impact.font',
	'impact.debug.debug'
)
.defines(function(){

// Player
EntityPlayer = ig.Entity.extend({
	size: {x:26, y:16},
	
	type: ig.Entity.TYPE.A, // Player friendly group
	checkAgainst: ig.Entity.TYPE.NONE,
	collides: ig.Entity.COLLIDES.PASSIVE,
	
	animSheet: new ig.AnimationSheet( 'media/player.png', 26, 16 ),
	
	friction: {x:500, y:0},
	speed: 600,
	
	inertia: null,
	
	// methods
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.inertia = new ig.Timer(0.3);
		this.addAnim('idle', 0.1, [0]);
	},
	
	update: function() {
		if (this.pos.x < 0 || this.pos.x + this.size.x > ig.system.width) {
			this.accel.x = 0;
			this.pos.x = this.last.x;
			return;
		}
		
		if (ig.input.state('left')) {
			this.accel.x = -this.speed;
		}
		else if (ig.input.state('right')) {
			this.accel.x = this.speed;
		}
		else {
			this.accel.x = 0;
		}
		
		if (ig.input.state('shoot') && this.inertia.delta() > 0) {
			ig.game.createPlayerBullet(this.pos.x+(this.size.x/2), this.pos.y);
			this.inertia.reset();
		}
		
		this.parent();
	}
});

// invader
EntityInvader = ig.Entity.extend({
	size: {x:24, y:24},
	
	type: ig.Entity.TYPE.B, // Player hostile group
	checkAgainst: ig.Entity.TYPE.NONE,
	collides: ig.Entity.COLLIDES.PASSIVE,
	
	animSheet: new ig.AnimationSheet( 'media/invaders.png', 24, 24 ),
	
	invaderType: 0,
	inertia: null,
    moveDir:1, // -1, 0, 1
    moveAmt:2,
	
	// methods
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.health = this.invaderType + 1;
		var off = this.invaderType * 2;
		this.addAnim('idle', 1, [0 + off, 1 + off]);
		
		this.inertia = new ig.Timer(5+Math.random()*30);
	},
	
	update: function() {
		this.parent();
        
        if (this.inertia.delta() > 0) {
			var toShoot = (Math.random() > 0.93);
			if (toShoot) {
				ig.game.createInvaderBullet(this.pos.x+(this.size.x/2), this.pos.y+this.size.y);
			}
			this.inertia.reset();
		}
	},

    move: function() {
        if (this.moveAmt === 0) {
            this.moveDown();
            this.moveDir *= -1;
            this.moveAmt = 2;
            return;
        }

        if (this.moveDir === 1) {
            if (this.moveAmt > 0) {
                this.moveLeft();
                this.moveAmt--;
            }
        }
        else if (this.moveDir === -1) {
            if (this.moveAmt > 0) {
                this.moveRight();
                this.moveAmt--;
            }
        }
    },
	
	moveLeft: function() {
		this.pos.x += ig.system.width/12;
	},

    moveRight: function() {
		this.pos.x -= ig.system.width/12;
	},

    moveDown: function() {
        this.pos.y += 30;
    }
});

// bunker
EntityBunker = ig.Entity.extend({
	size: {x:44, y:44},
	
	type: ig.Entity.TYPE.BOTH,
	checkAgainst: ig.Entity.TYPE.B,
	collides: ig.Entity.COLLIDES.PASSIVE,
	
	health: 5,
	animSheet: new ig.AnimationSheet( 'media/bunkers.png', 44, 44 ),
	
	// methods
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.addAnim('idle', 1, [0]);
		this.addAnim('dam1', 1, [1]);
		this.addAnim('dam2', 1, [2]);
		this.addAnim('dam3', 1, [3]);
	},
	
	update: function() {
		if (this.health === 3) {
			this.currentAnim = this.anims.dam1;
		} else if (this.health === 2) {
			this.currentAnim = this.anims.dam2;
		} else if (this.health === 1) {
			this.currentAnim = this.anims.dam3;
		}
	},

    check: function(other) {
        if (other instanceof EntityInvader) {
            ig.game.setGameOver();
        }
    }
});

// bullet
EntityBullet = ig.Entity.extend({
	size: {x:2, y:4},
	offset: {x: 2, y: 2},
	maxVel: {x: 0, y: 200},
	
	type: ig.Entity.TYPE.NONE,
	
	animSheet: new ig.AnimationSheet( 'media/bullet.png', 2, 4 ),
	
	// methods
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.checkAgainst = (this.type === ig.Entity.TYPE.A) ? ig.Entity.TYPE.B : ig.Entity.TYPE.A;
		this.vel.y = (this.type === ig.Entity.TYPE.A) ? -100 : 100;
		this.addAnim('idle', 1, [0]);
	},
	
	check: function( other ) {
		other.receiveDamage(1, this);
		this.kill();

        if (other instanceof EntityInvader) {
            ig.game.numKilled++;

            if (ig.game.invaders.length === ig.game.numKilled) {
                ig.game.setGameOver();
            }
        }
	}
});


MyGame = ig.Game.extend({
	
	player: null,
	
	bunkers: [],
	
	invaders: [],
	
	bullets: [],
	
	timer: null,

    gameOver: false,

    numKilled: 0,
	
	// Load a font
	font: new ig.Font( 'media/04b03.font.png' ),
	
	
	init: function() {
		// Initialize your game here; bind keys etc.
		ig.system.smoothPositioning = false;
		
		ig.input.bind(ig.KEY.LEFT_ARROW, 'left');
		ig.input.bind(ig.KEY.RIGHT_ARROW, 'right');
		ig.input.bind(ig.KEY.SPACE, 'shoot');
		
		// spawn invaders
		var dx, dy, invader, w=ig.system.width/12, h=30;
		for (dy = 0; dy < 6; dy++) {
			for (dx = 0; dx < 10; dx++) {
				invader = this.spawnEntity( EntityInvader, 10+(dx*w), 10+(dy*h), {invaderType:Math.floor(dy/2)} );
				this.invaders.push(invader);
			}
		}
		
		// bunkers
		var bunker;
		w=ig.system.width/7;
		for (dx = 0; dx < 6; dx++) {
			bunker = this.spawnEntity( EntityBunker, w/1.5+dx*w, 340 );
			this.bunkers.push(bunker);
		}
		
		this.player = this.spawnEntity( EntityPlayer, ig.system.width/2-13, 410 );

        this.gameOver = false;

		this.timer = new ig.Timer(5);
	},
	
	update: function() {
		// Update all entities and backgroundMaps
		this.parent();
		
		// Add your own, additional update code here
		if (this.timer.delta() > 0) {
			var invader, len=this.invaders.length, w=ig.system.width/12, dx;
			for (var i = 0; i < len; i++) {
				invader = this.invaders[i];
				invader.move();
			}
			this.timer.reset();
		}
	},
	
	draw: function() {
		// Draw all entities and backgroundMaps
        if (this.gameOver) {
            this.font.draw( 'Game Over!', ig.system.width/2, 32, ig.Font.ALIGN.CENTER );
        }
        else {
		    this.parent();
        }
	},

    setGameOver: function() {
        this.gameOver = true;
    },
	
	createPlayerBullet: function(posX, posY) {
		var bullet = this.spawnEntity(EntityBullet, posX, posY, {type:ig.Entity.TYPE.A});
		this.bullets.push(bullet);
	},
	
	createInvaderBullet: function(posX, posY) {
		var bullet = this.spawnEntity(EntityBullet, posX, posY, {type:ig.Entity.TYPE.B});
		this.bullets.push(bullet);
	}
});


// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
ig.main( '#canvas', MyGame, 30, 484, 440, 1 );

});
