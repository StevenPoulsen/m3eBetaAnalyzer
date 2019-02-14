import {CrewBuilderService} from "../services/crewBuilderService";
import {DataService} from "../services/dataService";
import {autoinject, observable} from 'aurelia-framework';
import {TrackingService} from "../services/trackingService";
import {SuitValueConverter} from "../converters/suit-value-converter";
import {AppRouter} from "aurelia-router";
import * as localForage from 'localforage';

@autoinject()
export class Print {
  private models:any[] = [];
  private upgrades:any[] = [];
  @observable()
  private edition:string;
  private crew;
  private includeModels:boolean = true;
  private includeUpgrades:boolean = true;
  private images = {};
  private whitePictureText = {};
  private excludeModels:string[] = [];
  private excludeUpgrades:string[] = [];

  constructor(private crewBuilderService: CrewBuilderService, private dataService: DataService, private trackingService: TrackingService, private suitConverter: SuitValueConverter, private router: AppRouter) {
    this.loadCrew();
    this.setEdition();
    window.addEventListener("beforeprint", function(event) {
      TrackingService.event("print", "crewPrint", null, null);
    });
  }

  private loadCrew():void {
    const models:any[] = [];
    const upgrades:any[] = [];
    localForage.getItem("printCrew").then((crew:any) => {
      if (crew && crew.models) {
        this.crew = crew;
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

              if (crewModel.upgrade) {
                this.dataService.getUpgrade(crewModel.upgrade.name).then(upgrade => {
                  upgrades.push(upgrade);
                  this.upgrades = upgrades;
                })
              }
              this.dataService.getModel(crewModel.name).then(model => {
                models.push(model);
                this.images[model.name] = null;
                if (models.length === amount) {
                  this.models = models;
                  this.addSpecialUpgrades();
                }
              });
            }
          }
        }

      }
    });
  }

  private addSpecialUpgrades() {
    this.dataService.getFactionData(this.crew.faction).then(data => {
      if (data && data.upgrades) {
        const upgrades = this.upgrades.slice(0);
        const exclude:string[] = [];
        for (const upgrade of data.upgrades) {
          if (upgrade.limitations.special) {
            exclude.push(upgrade.name);
            upgrades.push(upgrade);
          }
        }
        this.upgrades = upgrades;
        this.excludeUpgrades = exclude;
      }
    });
  }

  editionChanged(newValue, oldValue) {
    localForage.setItem("printEdition", newValue);
  }

  togglePictureTextColor(model) {
    this.whitePictureText[model.name] = !this.whitePictureText[model.name];
  }

  getText(text):string {
    if(text.endsWith(":")) {
      return text;
    }
    const split = text.split(":");
    if (split.length > 1) {
      return '<span class="name">'+this.suitConverter.toView(split[0],'print')+':</span><span>'+this.suitConverter.toView(split[1],'print')+'</span>';
    }
    return text;
  }

  isActionText(text):boolean {
    return !!text.match(/.*gains the following.* Actions?:/i);
  }

  getLimitations(upgrade):string {
    const limitations = [];
    for (const key of Reflect.ownKeys(upgrade.limitations)) {
      if (upgrade.limitations[key]) {
        if (typeof upgrade.limitations[key] === "number"){
          limitations.push(String(key) + " (" + upgrade.limitations[key] + ")");
        } else {
          limitations.push(String(key) + " (" + upgrade.limitations[key].join(", ") + ")");
        }
      }
    }
    return limitations.join(", ");
  }

  private setEdition():void {
    localForage.getItem("printEdition").then((printEdition:string) => {
      if (printEdition) {
        this.edition = printEdition;
      } else {
        this.edition = "m2e";
      }
    });

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

  includeUpgrade(upgrade) {
    const excludes = this.excludeUpgrades.slice(0);
    excludes.splice(excludes.indexOf(upgrade.name),1);
    this.excludeUpgrades = excludes;
  }

  excludeUpgrade(upgrade){
    const excludes = this.excludeUpgrades.slice(0);
    excludes.push(upgrade.name);
    this.excludeUpgrades = excludes;
  }

  includeModel(model) {
    const excludes = this.excludeModels.slice(0);
    excludes.splice(excludes.indexOf(model.name),1);
    this.excludeModels = excludes;
  }

  excludeModel(model) {
    const excludes =this.excludeModels.slice(0);
    excludes.push(model.name);
    this.excludeModels = excludes;
  }
}
