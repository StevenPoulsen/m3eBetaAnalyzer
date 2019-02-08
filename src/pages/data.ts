import {DataService} from "../services/dataService";
import {autoinject} from 'aurelia-framework';

@autoinject
export class Data {
  private faction: string = "";
  private rules: string = "";
  private error: string = "";
  private version: string;
  private versions:any = [];
  private showData = {};

  constructor(private dataService: DataService){}

  activate() {
    this.reloadVersions(this);
  }

  private reloadVersions(self:Data) {
    for (const versionCode of self.dataService.versionCodes) {
      if (!self.existsVersionCode(versionCode)) {
        self.showData[versionCode] = false;
        self.dataService.getDataVersion(versionCode).then(dataVersion => {
          self.versions.push(dataVersion);
          self.reloadVersions(self);
        });
        return;
      }
    }
  }

  existsVersionCode(versionCode){
    for (const version of this.versions){
      if (version.version === versionCode) {
        return true;
      }
    }
    return false;
  }

  handleFactionConsume() {
    if (!this.faction || !this.rules || !this.version) {
      this.error = "Missing input";
      return false;
    }
    this.dataService.consumeFactionRules(this.version, this.faction, this.rules);
    this.rules = "";
    this.faction = "";
    this.reloadVersions(this);
  }
}


  
