import {autoinject,bindable} from 'aurelia-framework';
import {DataService} from "../services/dataService";
import {ShownService} from "../services/shownService";
import {TrackingService} from "../services/trackingService";

@autoinject()
export class Faction {
  @bindable()
  private faction: any;
  private shown: boolean = false;

  constructor(private dataService: DataService, private shownService: ShownService){
  }

  bind() {
    this.shown = this.shownService.getShown("faction", this.faction.name);
  }

  toggle() {
    this.shown = !this.shown;
    this.shownService.setShown("faction", this.faction.name, this.shown);
    if (this.shown) {
      TrackingService.event('factionClick', 'viewFaction', this.faction.name, null);
    }
  }
}
