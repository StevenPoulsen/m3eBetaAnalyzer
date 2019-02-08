import {DataService} from "../services/dataService";
import {autoinject} from 'aurelia-framework';
import {FilterService} from "../services/filterService";
import { EventAggregator } from 'aurelia-event-aggregator';
import {MenuService} from "../services/menuService";
import {CrewBuilderService} from "../services/crewBuilderService";


@autoinject
export class Summary {
  private data:any = {};
  private leftMenuShown:boolean = false;
  private rightMenuShown:boolean = false;
  private remaining:number;
  private showRemaining:boolean = false;
  private showRemainingTimer:any;

  constructor(private dataService: DataService,
              private filterService: FilterService,
              private ea: EventAggregator,
              private menuService: MenuService,
              private crewBuilderService: CrewBuilderService){
    filterService.filterChangeFunction = this.filterUpdateFunction();
    if (window.innerWidth < 1000) {
      ea.subscribe("leftMenuShow", response => {
        this.leftMenuShown = true;
      });
      ea.subscribe("leftMenuHide", response => {
        this.leftMenuShown = false;
      });
      ea.subscribe("rightMenuShow", ()=>{
        this.hideRemaining();
        this.rightMenuShown = true;
      });
      ea.subscribe("rightMenuHide", ()=>{
        this.rightMenuShown = false;
      });
      ea.subscribe("crewUpdate", () => {
        this.remaining = this.crewBuilderService.getSoulStonesRemaining();
        this.showRemainingSoulStones();
      });
      menuService.activeLeftMenu();
    }
  }

  activate() {
    this.filterUpdateFunction()();
  }

  filterUpdateFunction() {
    const self = this;
    return function() {
      self.dataService.getData( true).then(data=> {
        self.data = self.filterService.filter(data);
      });
    }
  }

  toggleLeftMenu() {
    this.menuService.toggleLeftMenu();
  }

  toggleRightMenu() {
    this.menuService.toggleRightMenu();
  }

  showRemainingSoulStones() {
    if (this.menuService.isRightMenuShown() || !this.crewBuilderService.isBuilding) {
      return;
    }
    this.showRemaining = true;
    clearTimeout(this.showRemainingTimer);
    const self = this;
    this.showRemainingTimer = setTimeout(()=>{self.showRemaining = false;}, 3000);
  }

  hideRemaining() {
    clearTimeout(this.showRemainingTimer);
    this.showRemaining = false;
  }
}
