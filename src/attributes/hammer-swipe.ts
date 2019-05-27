import {inject, customAttribute} from 'aurelia-framework';
import * as Hammer from 'hammerjs';

@customAttribute('hammer-swipe')
@inject(Element)
export class HammerSwipeCustomAttribute {
  private hammer;
  private element;
  private callback;

  constructor(element) {
    this.hammer = new Hammer.Manager(element, {
      recognizers: [
        [Hammer.Swipe, { direction: Hammer.DIRECTION_HORIZONTAL }]
      ]
    });
    this.element = element;
  }

  attached() {
    this.hammer.on('swipe', this.handleSwipe.bind(this));
  }

  detached() {
    this.hammer.off('swipe', this.handleSwipe.bind(this));
    this.hammer.destroy();
  }

  valueChanged(newValue) {
    this.callback = newValue;
  }

  handleSwipe(event) {
    if (this.callback) {
      let direction;
      switch (event.direction) {
        case Hammer.DIRECTION_LEFT:
          direction = 'left';
          break;
        case Hammer.DIRECTION_RIGHT:
          direction = 'right';
          break;
        default:
          direction = null;
          break;
      }
      this.callback.call(null, {direction: direction, hammerEvent: event});
    }
  }

}
