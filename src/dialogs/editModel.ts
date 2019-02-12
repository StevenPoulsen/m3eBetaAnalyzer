import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";
import {CrewBuilderService} from "../services/crewBuilderService";
import {DataService} from "../services/dataService";

@autoinject()
export class EditModel {
  private crewModel;
  private cost;
  private upgrades:any[];

  constructor(private controller: DialogController, private crewBuilderService: CrewBuilderService, private dataService: DataService){}

  activate(crewModel) {
    this.crewModel = crewModel;
    this.cost = crewModel.cost;
    this.setValidUpgrades();
  }

  confirm() {
    this.crewBuilderService.editModel(this.crewModel, this.cost);
    this.controller.ok();
  }

  removeModel() {
    this.crewBuilderService.removeModel(this.crewModel.id);
    this.controller.cancel();
  }

  cancel() {
    this.controller.cancel();
  }

  private setValidUpgrades():void {
    const faction = this.dataService.getFactionKey(this.crewBuilderService.getCrew().faction);
    this.dataService.getData().then(data=>{
      const validUpgrades:any[] = [], model = this.getModelFromData(data, faction, this.crewModel.name);
      if (model && data && data.factions && data.factions[faction]) {
        const upgrades = data.factions[faction].upgrades;
        if (upgrades) {
          const upgradeUsage = this.crewBuilderService.getCrewUpgradesCount();
          for (const upgrade of upgrades) {
            if (upgrade && !upgrade.limitations.special) {
              if (!upgrade.limitations.restricted || this.arrayContainsAnyFromArray(model.charactaristics, upgrade.limitations.restricted) || this.arrayContainsAnyFromArray(model.keywords, upgrade.limitations.restricted)) {
                if (!upgrade.limitations.plentiful === null || !upgradeUsage[upgrade.name] || upgradeUsage[upgrade.name] < upgrade.limitations.plentiful) {
                  validUpgrades.push(upgrade);
                }
              }
            }
          }
        }
      }
      this.upgrades = validUpgrades;
    });
  }

  private getModelFromData(data:any, faction:string, modelName:string):any {
    if (data) {
      for (const model of data.factions[faction].models) {
        if (model.name === modelName) {
          return model;
        }
      }
    }
    return null;
  }

  private arrayContainsAnyFromArray(array:string[], fromArray:string[]):boolean {
    for (const from of fromArray) {
      for (const string of array) {
        if (from.toLowerCase() === string.toLowerCase()) {
          return true;
        }
      }
    }
    return false;
  }
}
