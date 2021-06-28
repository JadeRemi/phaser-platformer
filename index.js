var HORIZONTAL_VELOCITY = 400;
var JUMP_VELOCITY = 600;
var JUMP_INTERVAL = 400;
var GRAVITY = 1600;

var game = new Phaser.Game(640, 480, Phaser.CANVAS, 'game');

var PhaserGame = function () {
    this.bg = null;
    this.trees = null;

    this.player = null;
    this.playerSword = null;
    this.playerGroup = null;

    this.stationary = null;
    this.clouds = null;

    this.facing = 'left';
    this.jumpTimer = 0;
    this.cursors;
    this.locked = false;
    this.lockedTo = null;
    this.wasLocked = false;
    this.willJump = false;
};

PhaserGame.prototype = {
    init: function () {
        this.game.renderer.renderSession.roundPixels = true;

        this.world.resize(640*3, 480);

        this.physics.startSystem(Phaser.Physics.ARCADE);
        this.physics.arcade.gravity.y = GRAVITY;
    },
    preload: function () {
        this.load.image('trees', 'assets/trees-h.png');
        this.load.image('background', 'assets/clouds-h.png');
        this.load.image('platform', 'assets/platform.png');
        this.load.image('cloud-platform', 'assets/cloud-platform.png');
        this.load.image('playerSword', 'assets/sword.gif');
        this.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    },
    create: function () {
        this.background = this.add.tileSprite(0, 0, 640, 480, 'background');
        this.background.fixedToCamera = true;

        this.trees = this.add.tileSprite(0, 364, 640, 116, 'trees');
        this.trees.fixedToCamera = true;

        this.stationary = this.add.physicsGroup();

        this.stationary.create(0, 96, 'platform');
        this.stationary.create(632, 220, 'platform');
        this.stationary.create(1100, 300, 'platform');

        this.stationary.setAll('body.allowGravity', false);
        this.stationary.setAll('body.immovable', true);

        this.clouds = this.add.physicsGroup();

        var cloud1 = new CloudPlatform(this.game, 300, 450, 'cloud-platform', this.clouds);
        cloud1.addMotionPath([
            { x: "+200", xSpeed: 2000, xEase: "Linear", y: "-200", ySpeed: 2000, yEase: "Sine.easeIn" },
            { x: "-200", xSpeed: 2000, xEase: "Linear", y: "-200", ySpeed: 2000, yEase: "Sine.easeOut" },
            { x: "-200", xSpeed: 2000, xEase: "Linear", y: "+200", ySpeed: 2000, yEase: "Sine.easeIn" },
            { x: "+200", xSpeed: 2000, xEase: "Linear", y: "+200", ySpeed: 2000, yEase: "Sine.easeOut" }
        ]);

        var cloud2 = new CloudPlatform(this.game, 800, 96, 'cloud-platform', this.clouds);
        cloud2.addMotionPath([
            { x: "+0", xSpeed: 2000, xEase: "Linear", y: "+300", ySpeed: 2000, yEase: "Sine.easeIn" },
            { x: "-0", xSpeed: 2000, xEase: "Linear", y: "-300", ySpeed: 2000, yEase: "Sine.easeOut" }
        ]);

        var cloud3 = new CloudPlatform(this.game, 1300, 290, 'cloud-platform', this.clouds);
        cloud3.addMotionPath([
            { x: "+500", xSpeed: 4000, xEase: "Expo.easeIn", y: "-200", ySpeed: 3000, yEase: "Linear" },
            { x: "-500", xSpeed: 4000, xEase: "Expo.easeOut", y: "+200", ySpeed: 3000, yEase: "Linear" }
        ]);

        this.player = this.add.sprite(32, 0, 'dude');

        this.playerGroup = this.add.group();
        this.playerGroup.add(this.player);
        this.playerGroup.create(0, 0, 'playerSword');

        this.physics.arcade.enable(this.player);

        this.player.body.collideWorldBounds = true;
        this.player.body.setSize(20, 32, 5, 16);

        this.player.animations.add('left', [0, 1, 2, 3], 10, true);
        this.player.animations.add('turn', [4], 20, true);
        this.player.animations.add('right', [5, 6, 7, 8], 10, true);

        this.camera.follow(this.player);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.clouds.callAll('start');

    },
    customSep: function (player, platform) {
        if (!this.locked && player.body.velocity.y > 0) {
            this.locked = true;
            this.lockedTo = platform;
            platform.playerLocked = true;

            player.body.velocity.y = 0;
        }
    },
    checkLock: function () {
        this.player.body.velocity.y = 0;

        if (this.player.body.right < this.lockedTo.body.x || this.player.body.x > this.lockedTo.body.right) {
            this.cancelLock();
        }
    },
    cancelLock: function () {
        this.wasLocked = true;
        this.locked = false;
    },
    preRender: function () {
        if (this.game.paused) {
            return;
        }

        if (this.locked || this.wasLocked) {
            this.player.x += this.lockedTo.deltaX;
            this.player.y = this.lockedTo.y - 48;

            if (this.player.body.velocity.x !== 0) {
                this.player.body.velocity.y = 0;
            }
        }

        if (this.willJump) {
            this.willJump = false;

            if (this.lockedTo && this.lockedTo.deltaY < 0 && this.wasLocked) {
                this.player.body.velocity.y = -JUMP_VELOCITY + (this.lockedTo.deltaY * 10);
            } else {
                this.player.body.velocity.y = -JUMP_VELOCITY;
            }

            this.jumpTimer = this.time.time + JUMP_INTERVAL;
        }

        if (this.wasLocked) {
            this.wasLocked = false;
            this.lockedTo.playerLocked = false;
            this.lockedTo = null;
        }
    },
    update: function () {
        this.background.tilePosition.x = -(this.camera.x * 0.7);
        this.trees.tilePosition.x = -(this.camera.x * 0.9);

        this.physics.arcade.collide(this.player, this.stationary);
        this.physics.arcade.collide(this.player, this.clouds, this.customSep, null, this);

        this.player.body.velocity.x = 0;

        if (this.cursors.left.isDown) {
            this.player.body.velocity.x = -HORIZONTAL_VELOCITY;

            if (this.facing !== 'left') {
                this.player.play('left');
                this.facing = 'left';
            }
        } else if (this.cursors.right.isDown) {
            this.player.body.velocity.x = HORIZONTAL_VELOCITY;

            if (this.facing !== 'right') {
                this.player.play('right');
                this.facing = 'right';
            }
        } else {
            if (this.facing !== 'idle') {
                this.player.animations.stop();

                if (this.facing === 'left') {
                    this.player.frame = 0;
                } else {
                    this.player.frame = 5;
                }

                this.facing = 'idle';
            }
        }

        if (this.cursors.up.isDown && this.time.time > this.jumpTimer) {
            if (this.locked) {
                this.cancelLock();
            }
            this.willJump = true;
        }

        if (this.locked) {
            this.checkLock();
        }
    }
};

CloudPlatform = function (game, x, y, key, group) {
    if (typeof group === 'undefined') { group = game.world; }

    Phaser.Sprite.call(this, game, x, y, key);

    game.physics.arcade.enable(this);

    this.anchor.x = 0.5;

    this.body.customSeparateX = true;
    this.body.customSeparateY = true;
    this.body.allowGravity = false;
    this.body.immovable = true;

    this.playerLocked = false;

    group.add(this);
};

CloudPlatform.prototype = Object.create(Phaser.Sprite.prototype);
CloudPlatform.prototype.constructor = CloudPlatform;

CloudPlatform.prototype.addMotionPath = function (motionPath) {
    this.tweenX = this.game.add.tween(this.body);
    this.tweenY = this.game.add.tween(this.body);

    //  [
    //   { x: "+200", xSpeed: 2000, xEase: "Linear", y: "-200", ySpeed: 2000, yEase: "Sine.easeIn" }
    //  ]

    for (var i = 0; i < motionPath.length; i++) {
        this.tweenX.to( { x: motionPath[i].x }, motionPath[i].xSpeed, motionPath[i].xEase);
        this.tweenY.to( { y: motionPath[i].y }, motionPath[i].ySpeed, motionPath[i].yEase);
    }

    this.tweenX.loop();
    this.tweenY.loop();
};

CloudPlatform.prototype.start = function () {
    this.tweenX.start();
    this.tweenY.start();
};

CloudPlatform.prototype.stop = function () {
    this.tweenX.stop();
    this.tweenY.stop();
};

game.state.add('Game', PhaserGame, true);
