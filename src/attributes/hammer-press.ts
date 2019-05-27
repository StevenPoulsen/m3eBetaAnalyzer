import {inject, customAttribute} from 'aurelia-framework';
import * as Hammer from 'hammerjs';

@customAttribute('hammer-press')
@inject(Element)
export class HammerPressCustomAttribute {
  private hammer;
  private element;
  private callback;

  constructor(element) {
    this.hammer = new Hammer.Manager(element, {
      recognizers: [
        [Hammer.Press]
      ]
    });
    this.element = element;
  }

  attached() {
    this.hammer.on('press', this.handleSwipe.bind(this));
  }

  detached() {
    this.hammer.off('press', this.handleSwipe.bind(this));
    this.hammer.destroy();
  }

  valueChanged(newValue) {
    this.callback = newValue;
  }

  handleSwipe(event) {
    if (this.callback) {
      this.callback.call(null, { hammerEvent: event });
    }
  }
}
