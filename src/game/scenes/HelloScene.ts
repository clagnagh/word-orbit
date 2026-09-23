import Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor() {
    super('Hello');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Hello Orbit', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
