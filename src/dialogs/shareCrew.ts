import {DialogController} from "aurelia-dialog";
import {autoinject} from 'aurelia-framework';
import {CrewBuilderService} from "../services/crewBuilderService";
import {DataService} from "../services/dataService";

@autoinject()
export class ShareCrew {

  private shareLink;
  private shareText;
  private shareTextHeight;
  private sharingSupported = 0;

  constructor(private controller: DialogController, private crewBuilderService: CrewBuilderService, private dataService: DataService) {}

  activate(data) {
    this.crewBuilderService.supportsSharing().then(bool => {
      if (bool) {
        this.createShareLink();
        this.createShareText();
        this.sharingSupported = 1;
      } else {
        this.sharingSupported = -1;
      }
    });
  }

  private createShareLink() {
    this.shareLink = this.crewBuilderService.getShareLink();
  }

  private createShareText() {
    const crew = this.crewBuilderService.getCrew();
    let text = crew.faction +", " + crew.soulStones + " SS\n", lineCount = 2;
    text += "Beta version " + crew.versionCode + "\n";
    for (const type of Reflect.ownKeys(this.dataService.typeName)) {
      if (crew.models[type] && crew.models[type].length) {
        text += "[" + this.dataService.getTypeDisplayName(String(type)) + "]\n";
        lineCount++;
        for (const crewModel of crew.models[type]) {
          text += " - " + crewModel.name + (crewModel.name === crew.leader ? ", Leader":"") +"\n";
          if (crewModel.upgrade) {
            text += "   + " + crewModel.upgrade.name + "\n";
          }
          lineCount++;
        }
      }
    }
    this.shareText = text;
    this.shareTextHeight = 'min-height: ' + (lineCount * 18) + 'px;';
  }

  close() {
    this.controller.ok();
  }

  copyShareLink() {
    this.copyShareById("shareLink");
  }

  copyShareText() {
    this.copyShareById("shareText");
  }

  copyShareById(id: string) {
    const shareElm = document.getElementById(id);
    shareElm["select"]();
    document.execCommand("copy");
  }
}
