import {DataService} from "../services/dataService";
import {autoinject} from 'aurelia-framework';

@autoinject
export class Data {
  private faction: string = "";
  private rules: string = "";
  private upgrades: string = "";
  private error: string = "";
  private version: string;
  private versions:any = [];
  private showData = {};
  private strategies: string = "";
  private schemes: string = "";
  private errorSandS: string = "";

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
    if (!this.faction || (!this.rules && !this.upgrades) || !this.version) {
      this.error = "Missing input";
      return false;
    }
    if (this.rules) {
      this.dataService.consumeFactionRules(this.version, this.faction, this.rules);
    }
    if (this.upgrades) {
      this.dataService.consumeFactionUpgrades(this.version, this.faction, this.upgrades);
    }
    this.rules = "";
    this.faction = "";
    this.upgrades = "";
    this.reloadVersions(this);
  }

  handleStratAndSchemesConsume() {
    if (!this.strategies || !this.schemes || !this.version) {
      this.errorSandS = "Missing input";
      return false;
    }
    this.dataService.consumeStrategiesAndSchemes(this.version, this.strategies, this.schemes);
    this.strategies = "";
    this.schemes = "";
  }
}


  
