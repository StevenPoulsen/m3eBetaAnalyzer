import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";
import {useView} from 'aurelia-framework';
import {DataService} from "../services/dataService";

@autoinject()
@useView('./factionPrompt.html')
export class FactionPrompt {
  private factions = [];

  constructor(private controller: DialogController, private dataService: DataService){}

  activate(factions) {
    if (factions && factions.factions) {
      this.factions = factions.factions;
    }
  }

  getImage(faction){
    return this.dataService.getFactionImage(faction);
  }
}
