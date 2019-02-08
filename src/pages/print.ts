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
  private whitePictureText = {};

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

  togglePictureTextColor(model) {
    this.whitePictureText[model.name] = !this.whitePictureText[model.name];
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
    if (this.edition === "m2e") {
      chars.push("Rare " + (model.allowance?model.allowance:1));
    } else if (model.allowance > 1) {
      chars[0] += " ("+model.allowance+")";
    }
    return chars.join(", ");
  }

  healthPosition(max:number, value:number):number {
    const mid = (1+max) / 2.0, multiplier = .1, pow = 2;
    if (value <= mid) {
      return Math.pow(Math.floor(mid)-value, pow) * multiplier;
    }
    return Math.pow(value - Math.ceil(mid), pow)* multiplier;
  }

  ruleName(rule) {
    return (rule.trigger ? rule.trigger + ' ' : '') +
      (rule.suit ? '(' + this.suitConverter.toView(rule.suit,'print') + ') ' : '') +
      this.capitalize(rule.name) +
      (rule.value && !rule.type ? ' +' + rule.value : '') +
      (rule.type ? ' (' + this.suitConverter.toView(rule.type,'print') + (rule.value ? "+"+rule.value:"") + ')' : '') +
      ':'
  }

  capitalize(string: string) {
    const strings: string[] = string.split(" ");
    const result = [];
    for (const word of strings) {
      result.push(word.charAt(0).toUpperCase()+word.slice(1));
    }
    return result.join(" ");
  }
}
