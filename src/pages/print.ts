import {CrewBuilderService} from "../services/crewBuilderService";
import {DataService} from "../services/dataService";
import {autoinject, observable} from 'aurelia-framework';
import {TrackingService} from "../services/trackingService";
import {SuitValueConverter} from "../converters/suit-value-converter";
import {AppRouter} from "aurelia-router";

@autoinject()
export class Print {
  private models:any[] = [];
  @observable()
  private edition:string;
  private images = {};

  constructor(private crewBuilderService: CrewBuilderService, private dataService: DataService, private trackingService: TrackingService, private suitConverter: SuitValueConverter, private router: AppRouter) {
    this.loadCrew();
    this.setEdition();
    window.addEventListener("beforeprint", function(event) {
      TrackingService.event("print", "crewPrint", null, null);
    });
  }

  private loadCrew():void {
    const models:any[] = [];
    const cacheString = localStorage.getItem("printCrew");
    if (cacheString) {
      const crew = JSON.parse(cacheString);
      if (crew && crew.models) {
        let amount:number = 0;
        const types = [];
        for (const type of Reflect.ownKeys(crew.models)) {
          if (type && crew.models[type]) {
            amount += crew.models[type].length;
            types.push(type);
          }
        }
        for (const t of types) {
          if (crew.models[t]) {
            for (const crewModel of crew.models[t]) {
              this.dataService.getModel(crewModel.name).then(model => {
                models.push(model);
                this.images[model.name] = null;
                if (models.length === amount) {
                  this.models = models;
                }
              });
            }
          }
        }
      }
    }
  }

  editionChanged(newValue, oldValue) {
    localStorage.setItem("printEdition", newValue);
  }

  private setEdition():void {
    const cacheString = localStorage.getItem("printEdition");
    if (cacheString) {
      this.edition = cacheString;
    } else {
      this.edition = "m2e";
    }
  }

  print() {
    window.print();
  }

  back() {
    this.router.navigateToRoute("summary");
  }

  characteristics(model) {
    const chars = [];
    for (const characteristic of model.charactaristics) {
      if (characteristic.toLowerCase() === "totem" && model.totemFor) {
        chars.push(characteristic + " (" + model.totemFor + ")");
      } else {
        chars.push(characteristic);
      }
    }
    chars.push("Rare " + (model.allowance?model.allowance:1));
    return chars.join(", ");
  }

  ruleName(rule) {
    return (rule.trigger ? rule.trigger + ' ' : '') +
      (rule.suit ? '(' + this.suitConverter.toView(rule.suit,'print') + ') ' : '') +
      (rule.name) +
      (rule.value && !rule.type ? ' +' + rule.value : '') +
      (rule.type ? ' (' + this.suitConverter.toView(rule.type,'print') + (rule.value ? "+"+rule.value:"") + ')' : '') +
      ':'
  }

  loadImages() {
    const cacheString = localStorage.getItem("images");
    
  }
}
