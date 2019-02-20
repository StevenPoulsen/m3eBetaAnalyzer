import {autoinject,bindable} from 'aurelia-framework';
import {DataService} from "../services/dataService";
import {ShownService} from "../services/shownService";
import {TrackingService} from "../services/trackingService";
import {FilterService} from "../services/filterService";

@autoinject()
export class Faction {
  @bindable()
  private faction: any;
  @bindable()
  private groupType: string = "faction";
  private shown: boolean = false;
  private name:string;
  private img:string;

  constructor(private dataService: DataService, private shownService: ShownService, private filterService: FilterService){
  }

  bind() {
    this.groupType = this.filterService.options.sort.modelGroupBy;
    console.log("Faction", this.groupType);
    this.shown = this.groupType === "none" ? true : this.shownService.getShown(this.groupType, this.faction.name);
    switch (this.groupType) {
      case "faction":
        this.name = this.dataService.getFactionDisplayName(this.faction.name);
        this.img = '/images/'+this.faction.name+'.png';
        break;
      case "type":
        this.name = this.dataService.getTypeDisplayName(this.faction.name);
        this.img = null;
        break;
      default:
        this.name = this.faction.name;
        this.img = null;
        break;
    }
  }

  toggle() {
    if (this.groupType==="none") {
      return;
    }
    this.shown = !this.shown;
    this.shownService.setShown(this.groupType, this.faction.name, this.shown);
    if (this.shown) {
      TrackingService.event('groupToggle', this.groupType, this.faction.name, null);
    }
  }
}
