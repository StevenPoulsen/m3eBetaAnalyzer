import {DialogController} from "aurelia-dialog";
import {autoinject} from 'aurelia-framework';
import {DataService} from "../services/dataService";

@autoinject()
export class Upgrades {
  factionName: string;
  upgrades:any[] = [];
  specials:any[] = [];

  constructor(private controller: DialogController, private dataService: DataService) {}

  activate(factionKey) {
    if (factionKey) {
      this.factionName = this.dataService.getFaction(factionKey).displayName;
      this.dataService.getData().then(data => {
        if (data) {
          for (const upgrade of data.factions[factionKey].upgrades) {
            if (upgrade.limitations.special) {
              this.specials.push(upgrade);
            } else {
              this.upgrades.push(upgrade);
            }
          }
        }
      });
    }
  }

  confirm() {
    this.controller.cancel();
  }
}
