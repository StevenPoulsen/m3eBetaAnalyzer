import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";
import {useView} from 'aurelia-framework';

@autoinject()
@useView('./factionPrompt.html')
export class FactionPrompt {
  private factions = [];
  private icons = {
    'Arcanists': 'arcanists.png',
    'Bayou': 'bayou.png',
    'Guild': 'guild.png',
    'Neverborn': 'neverborn.png',
    "Resurrectionist": "resser.png",
    "Ten Thunders": "tt.png"
  };

  constructor(private controller: DialogController){}

  activate(factions) {
    if (factions && factions.factions) {
      this.factions = factions.factions;
    }
  }

  getImage(faction){
    return this.icons[faction] || (faction.toLowerCase() + ".png");
  }
}
