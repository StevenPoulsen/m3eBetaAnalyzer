import {autoinject,bindable} from 'aurelia-framework';
import {CrewBuilderService} from "../services/crewBuilderService";
import {SuitValueConverter} from "../converters/suit-value-converter";

@autoinject()
export class Upgrade {
  @bindable()
  private upgrade;
  @bindable()
  private model;
  private shown:boolean;
  private added:boolean;
  private limitations:string;

  constructor(private crewBuilderService: CrewBuilderService, private suit: SuitValueConverter) {}

  bind() {
    this.added = this.model.upgrade && this.model.upgrade.name === this.upgrade.name;
    this.limitations = this.getLimitations();
  }

  toggle(){
    this.shown = !this.shown;
  }

  toggleForModel() {
    if (this.added) {
      this.removeFromModel();
    } else {
      this.addToModel();
    }
  }

  addToModel() {
    this.added= true;
    this.crewBuilderService.addCrewModelUpgrade(this.model, this.upgrade);
  }

  removeFromModel() {
    this.added = false;
    this.crewBuilderService.removeCrewModelUpgrade(this.model);
  }

  getText(text):string {
    if(text.endsWith(":")) {
      return text;
    }
    const split = text.split(":");
    if (split.length > 1) {
      return '<span class="name">'+this.suit.toView(split[0],'screen')+':</span><span>'+this.suit.toView(split[1],'screen')+'</span>';
    }
    return text;
  }

  isActionText(text):boolean {
    return !!text.match(/.*gains the following.* Actions?:/i);
  }

  getLimitations():string {
    const limitations = [];
    for (const key of Reflect.ownKeys(this.upgrade.limitations)) {
      if (this.upgrade.limitations[key]) {
        if (typeof this.upgrade.limitations[key] === "number"){
          limitations.push(String(key) + " (" + this.upgrade.limitations[key] + ")");
        } else {
          limitations.push(String(key) + " (" + this.upgrade.limitations[key].join(", ") + ")");
        }
      }
    }
    return limitations.join(", ");
  }
}
