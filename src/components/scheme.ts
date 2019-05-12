import {autoinject,bindable} from 'aurelia-framework';
import {TrackingService} from "../services/trackingService";
import {StratsAndSchemes} from "../dialogs/stratsAndSchemes";
import {ShownService} from "../services/shownService";

@autoinject()
export class Scheme {
  @bindable()
  private scheme: any;
  private shown: boolean = false;
  private chosen:boolean = false;
  @bindable()
  private selectable:boolean = false;

  constructor(private ss: StratsAndSchemes, private shownService: ShownService){}

  bind() {
    this.shown = this.shownService.getShown("scheme", this.scheme.name);
  }

  toggle() {
    this.shown = !this.shown;
    this.shownService.setShown("scheme", this.scheme.name, this.shown);
    if (this.shown) {
      TrackingService.event('schemeToggle', "scheme", this.scheme.name, null);
    }
  }

  select():void {
    this.chosen = !this.chosen;
    if (this.chosen) {
      this.ss.addScheme(this.scheme);
    } else {
      this.ss.removeScheme(this.scheme);
    }
  }
}
