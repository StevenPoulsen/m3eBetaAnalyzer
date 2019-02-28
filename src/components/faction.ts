import {autoinject,bindable} from 'aurelia-framework';
import {DataService} from "../services/dataService";
import {ShownService} from "../services/shownService";
import {TrackingService} from "../services/trackingService";
import {FilterService} from "../services/filterService";
import { EventAggregator } from 'aurelia-event-aggregator';
import {DialogService} from "aurelia-dialog";
import {Upgrades} from "../dialogs/upgrades";

@autoinject()
export class Faction {
  @bindable()
  private faction: any;
  @bindable()
  private groupType: string = "faction";
  private shown: boolean = false;
  private name:string;
  private img:string;

  constructor(private dataService: DataService, private shownService: ShownService,
              private ea: EventAggregator, private filterService: FilterService,
              private dialogService: DialogService){
    ea.subscribe("showModelGroup", (data) => {
      if (data) {
        this.shown = data.factions.includes(this.faction.name) || this.dataService.getModelType(data) === this.faction.name;
        if (this.shown) {
          ea.publish("showModel", data);
        }
      }
    });
  }

  bind() {
    this.groupType = this.filterService.options.modelGroupBy;
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

  showFactionUpgrades() {
    if (this.groupType === 'faction') {
      this.dialogService.open({viewModel:Upgrades, model:this.faction.name, lock:false});
    }
  }
}
