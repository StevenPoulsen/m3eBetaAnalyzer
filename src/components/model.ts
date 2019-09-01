import {autoinject, bindable} from 'aurelia-framework';
import {FilterService} from "../services/filterService";
import {SuitValueConverter} from "../converters/suit-value-converter";
import {ShownService} from "../services/shownService";
import {CrewBuilderService} from "../services/crewBuilderService";
import { EventAggregator } from 'aurelia-event-aggregator';
import {AppRouter} from 'aurelia-router';

@autoinject()
export class Model {
  @bindable
  private model: any;
  private shown: boolean;

  constructor(
    private filterService: FilterService,
    private suitConverter:SuitValueConverter,
    private shownService: ShownService,
    private ea: EventAggregator,
    private crewBuilderService: CrewBuilderService,
    private element: Element,
    private router: AppRouter) {
    ea.subscribe("showModel", (data) => {
      if (data) {
        this.shown = data.id === this.model.id;
        if (this.shown) {
          const self = this;
          setTimeout(()=>Model.scrollToElement(self.element),10);
        }
      }
    });
    ea.subscribe("hideModel", modelId => {
      if (modelId && this.model.id === modelId) {
        this.shown = false;
        Model.scrollToElement(this.element);
        this.shownService.setShown("model", this.model.name, this.shown);
      }
    })
  }

  bind() {
    this.shown = this.shownService.getShown("model", this.model.name);
  }

  getQuickShow(quickShow) {
    switch (quickShow) {
      case "factions":
        return this.model.factions.join(", ");
      case "types":
        return this.model.charactaristics.join(", ");
      case "keywords":
        return this.model.keywords ? this.model.keywords.join(", ") : "";
      case "cost":
        return "Cost: " + this.model.stats.cost.value + (this.model.tax ? (this.model.tax > 0 ? '+' : '') + this.model.tax : '' );
      case "mv":
        return "Mv:" + this.model.stats.mv.value;
      case "df":
        return "Df:" + this.model.stats.df.value;
      case "wp":
        return "Wp:" + this.model.stats.wp.value;
      case "sz":
        return "Sz:" + this.model.size.height;
      case "health":
        return "Health:" + this.model.stats.health.value;
    }
  }

  characteristics() {
    const chars = [];
    for (const characteristic of this.model.charactaristics) {
      if (characteristic.toLowerCase() === "totem" && this.model.totemFor) {
        chars.push(characteristic + " (" + this.model.totemFor + ")");
      } else {
        chars.push(characteristic);
      }
    }
    if (this.model.allowance && this.model.allowance > 1 && chars.length) {
      chars[0] = chars[0] + " (" + this.model.allowance + ")";
    }
    return chars.join(", ");
  }

  ruleName(rule) {
    return (rule.trigger ? rule.trigger + ' ' : '') +
      (rule.suit ? '(' + this.suitConverter.toView(rule.suit,'screen') + ') ' : '') +
      (rule.name) +
      (rule.value && !rule.type ? ' +' + rule.value : '') +
      (rule.type ? ' (' + this.suitConverter.toView(rule.type,'screen') + (rule.value ? "+"+rule.value:"") + ')' : '') +
      ':'
  }

  getStats() {
    const map = new Map();
    for (const key of Reflect.ownKeys(this.model.stats)) {
      map.set(key, this.model.stats[key]);
    }
    return map;
  }

  toggle() {
    this.shown = !this.shown;
    if (this.shown) {
      this.router.navigateToRoute("summary",{id:this.model.id});
    } else {
      this.router.navigateToRoute('summary');
    }
    Model.scrollToElement(this.element);
    this.shownService.setShown("model", this.model.name, this.shown);
  }

  static scrollToElement(element:Element) {
    if (element["offsetTop"]) {
      const positionTop = element["offsetTop"];
      if (positionTop < window.scrollY || positionTop > window.scrollY + window.innerHeight) {
        element.scrollIntoView();
      }
    }
  }

  addToCrew() {
    this.crewBuilderService.addModel(this.model);
    this.filterService.filterChange();
  }

  togglePersonal(type) {
    this.filterService.toggleCustom(type, this.model);
  }
}
