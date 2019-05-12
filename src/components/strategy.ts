import {autoinject,bindable} from 'aurelia-framework';
import {TrackingService} from "../services/trackingService";
import {StratsAndSchemes} from "../dialogs/stratsAndSchemes";
import {ShownService} from "../services/shownService";

@autoinject()
export class Strategy {
  @bindable()
  private strategy: any;
  private shown: boolean = false;
  private chosen:boolean = false;
  @bindable()
  private selectable:boolean = false;

  constructor(private ss: StratsAndSchemes, private shownService: ShownService){}

  bind() {
    this.shown = this.shownService.getShown("strategy", this.strategy.name);
  }

  toggle() {
    this.shown = !this.shown;
    this.shownService.setShown("strategy", this.strategy.name, this.shown);
    if (this.shown) {
      TrackingService.event('strategyToggle', "strategy", this.strategy.name, null);
    }
  }

  select():void {
    this.chosen = !this.chosen;
    if (this.chosen) {
      this.ss.setStrategy(this.strategy);
    } else {
      this.ss.removeStrategy();
    }
  }
}
