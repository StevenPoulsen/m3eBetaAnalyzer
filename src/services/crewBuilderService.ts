import {autoinject, computedFrom} from 'aurelia-framework';
import {DataService, Type} from "./dataService";
import {MenuService} from "./menuService";
import {EventAggregator} from 'aurelia-event-aggregator';
import {DialogService} from 'aurelia-dialog';
import {FactionPrompt} from "../dialogs/factionPrompt";
import {Confirm} from "../dialogs/confirm";
import * as localForage from 'localforage';
import {FirebaseService} from "./FirebaseService";


interface CrewModel {
  id: number;
  name: string;
  cost: number;
}

export interface BuyProblem {
  hide: boolean,
  name: string
}

@autoinject
export class CrewBuilderService {
  private currentCrew: any;
  private lastModified: number;

  constructor(private dataService: DataService, private menuService: MenuService, private ea: EventAggregator, private dialogService: DialogService, private firebaseService:FirebaseService) {
    localForage.getItem("printCrew").then(value => {
      if (value) {
        this.currentCrew = value;
        localForage.removeItem("printCrew");
      }
    });
  }

  @computedFrom('currentCrew', 'lastModified')
  get isBuilding(): boolean {
    return !!this.currentCrew && !!this.lastModified;
  }

  @computedFrom('currentCrew', 'lastModified')
  get hasChanges(): boolean {
    return !!this.currentCrew && !!this.getCrewModelCount() && !!this.lastModified && (!this.currentCrew.lastSave || this.lastModified > this.currentCrew.lastSave);
  }

  getCrewModelCount() {
    if (!this.currentCrew) {
      return 0;
    }
    let count = 0;
    for (const type in this.currentCrew.models) {
      if (this.currentCrew.models.hasOwnProperty(type)) {
        count += this.currentCrew.models[type] ? this.currentCrew.models[type].length : 0;
      }
    }
    return count;
  }

  getCrewUpgradesCount() {
    const count = {};
    if (!this.currentCrew) {
      return count;
    }
    for (const type of Reflect.ownKeys(this.currentCrew.models)) {
      for (const model of this.currentCrew.models[type]) {
        if (model.upgrade) {
          if (!count[model.upgrade.name]) {
            count[model.upgrade.name] = 1;
          } else {
            count[model.upgrade.name]++;
          }
        }
      }
    }
    return count;
  }

  setCrewName(crewName: string) {
    this.currentCrew.saveName = crewName;
  }

  getSoulStonesRemaining(): number {
    return this.currentCrew.soulStones - this.currentCrew.soulStoneUsage;
  }

  hasLeader(): boolean {
    return this.currentCrew && this.currentCrew.leader;
  }

  private publishUpdateEvent() {
    this.currentCrew.soulStoneUsage = this.calculateSoulStoneUsage();
    this.ea.publish("crewUpdate");
  }

  public addModel(model) {
    const type = this.dataService.getModelType(model);
    if (!this.currentCrew.leader) {
      if (type === Type.Master || type === Type.Henchman) {
        this.setLeader(model);
      }
    }
    for (const rule of model.rules) {
      if (rule && rule.text) {
        const match = rule.text.match("When hiring, Crews containing this model treat (.*) as though it were Versatile");
        if (match && match[1]) {
          this.currentCrew.extraVersatile.push(match[1]);
        }
      }
    }
    this.currentCrew.models[type].push(this.extractCrewModel(model));
    this.publishUpdateEvent();
    this.lastModified = new Date().getTime();
  }

  public editModel(crewModel, newCost: number) {
    const model = this.getCurrentCrewModel(crewModel.id);
    if (!model) {
      return;
    }
    let hasChange = false;
    if (model.cost !== newCost) {
      model.cost = newCost;
      hasChange = true;
    }
    if (hasChange) {
      this.publishUpdateEvent();
      this.lastModified = new Date().getTime();
    }
    return;
  }

  public removeModel(id) {
    for (const type of Reflect.ownKeys(this.currentCrew.models)) {
      for (let i = 0, len = this.currentCrew.models[type].length, model; i < len; i++) {
        model = this.currentCrew.models[type][i];
        if (model.id === id) {
          if (model.name === this.currentCrew.leader) {
            this.dialogService.open({
              viewModel: Confirm, model: {
                text: "Removing leader cancels crew building. Proceed?",
                ok: "Proceed",
                no: "Cancel"
              }
            }).whenClosed(response => {
              if (!response.wasCancelled) {
                this.hideCrewList();
              }
            });
          } else {
            this.currentCrew.models[type].splice(i, 1);
            if (this.currentCrew.extraVersatile) {
              this.dataService.getModel(model.name).then((fullModel) => {
                if (fullModel && fullModel.rules) {
                  for (const rule of fullModel.rules) {
                    if (rule && rule.text) {
                      const match = rule.text.match("When hiring, Crews containing this model treat (.*) as though it were Versatile");
                      if (match && match[1]) {
                        const index = this.currentCrew.extraVersatile.indexOf(match[1]);
                        if (index > -1) {
                          this.currentCrew.extraVersatile.splice(index, 1);
                          this.publishUpdateEvent();
                        }
                      }
                    }
                  }
                }
              });
            }
            this.lastModified = new Date().getTime();
          }
          this.publishUpdateEvent();
          return;
        }
      }
    }
  }

  addCrewModelUpgrade(crewModel, upgrade): void {
    if (!this.currentCrew) {
      return;
    }
    const model = this.getCurrentCrewModel(crewModel.id);
    if (!model) {
      return;
    }
    model.upgrade = this.extractUpgrade(upgrade);
    this.publishUpdateEvent();
    this.lastModified = new Date().getTime();
  }

  removeCrewModelUpgrade(crewModel): void {
    if (!this.currentCrew) {
      return;
    }
    const model = this.getCurrentCrewModel(crewModel.id);
    if (!model) {
      return;
    }
    model.upgrade = null;
    this.publishUpdateEvent();
    this.lastModified = new Date().getTime();
  }

  getCurrentCrewModel(id) {
    if (!this.currentCrew) {
      return null;
    }
    for (const type in this.currentCrew.models) {
      if (this.currentCrew.models.hasOwnProperty(type)) {
        for (const model of this.currentCrew.models[type]) {
          if (model.id === id) {
            return model;
          }
        }
      }
    }
    return null;
  }

  hasCrewModel(id) {
    return this.getCurrentCrewModel(id) !== null;
  }

  private extractCrewModel(model): CrewModel {
    return {name: model.name, cost: this.calculateModelCost(model), id: model.id};
  }

  private extractUpgrade(upgrade) {
    return {name: upgrade.name, cost: upgrade.cost, id:upgrade.id};
  }

  private setLeader(model): void {
    this.currentCrew.leader = model.name;
    this.currentCrew.keywords = model.crewKeywords ? model.keywords.concat(model.crewKeywords) : model.keywords;
    for (let rule of model.rules) {
      if (rule && rule.text) {
        const extraVersatile = rule.text.match(/when hiring, Crews containing this model treat (.*)s in their declared Faction as though they were Versatile/i);
        if (extraVersatile && extraVersatile[1]) {
          this.currentCrew.extraVersatile.push(extraVersatile[1]);
        }
      }
    }
    this.currentCrew.leaderType = this.dataService.getModelType(model);
    if (!this.currentCrew.faction || !model.factions.includes(this.currentCrew.faction)) {
      if (model.factions.length > 1 && model.factions[1] !== "Dead Man's Hand") {
        this.dialogService.open({
          viewModel: FactionPrompt, model: {
            factions: model.factions
          }
        }).whenClosed(response => {
          if (response.wasCancelled) {
            this.hideCrewList();
          } else {
            this.currentCrew.faction = response.output;
            this.publishUpdateEvent();
          }
        })
      } else {
        this.currentCrew.faction = model.factions[0];
      }
    }

  }

  public calculateModelCost(model): number {
    return +model.stats.cost.value + this.calculateModelTax(model);
  }

  public calculateModelTax(model): number {
    if (!this.currentCrew || !this.currentCrew.leader) {
      return 0;
    }
    if ((model.totemFor && model.totemFor === this.currentCrew.leader) || this.currentCrew.leader === model.name) {
      return -1 * model.stats.cost.value;
    }
    if (model.keywords) {
      if (this.currentCrew.leaderType === Type.Henchman && model.keywords.includes("EFFIGY")) {
        return -1 * model.stats.cost.value;
      }

      for (const keyword of this.currentCrew.keywords) {
        if (model.keywords.includes(keyword) || (model.crewKeywords && model.crewKeywords.includes(keyword))) {
          return 0;
        }
      }
    }
    if (model.factions && model.factions.includes(this.currentCrew.faction)) {
      if (model.charactaristics && model.charactaristics.includes("Versatile")) {
        return 0;
      }
      if (this.currentCrew.extraVersatile.includes(model.name)) {
        return 0;
      }
      for (const ver of this.currentCrew.extraVersatile) {
        if (model.charactaristics && model.charactaristics.includes(ver)) {
          return 0;
        }
      }
    }
    return 1;
  }

  public buyProblem(model): BuyProblem {
    const type = this.dataService.getModelType(model);
    let reply: BuyProblem = null;
    if (!this.currentCrew) {
      return {hide: false, name: ""};
    }
    if (model.stats.cost.value > this.getSoulStonesRemaining()) {
      return {hide: true, name: "price"};
    }
    if (this.currentCrew && this.currentCrew.models && this.currentCrew.models[type]) {
      let existingInCrewAlready: number = 0;
      for (const existingModel of this.currentCrew.models[type]) {
        if (model.name === existingModel.name) {
          existingInCrewAlready++;
        }
      }
      if (existingInCrewAlready > 0 && (model.allowance || 1) <= existingInCrewAlready) {
        reply = {hide: false, name: "allowance"};
      }
    }
    if (!this.currentCrew.leader) {
      switch (type) {
        case Type.Master:
        case Type.Henchman:
          return {hide: false, name: ""};
        default:
          return {hide: true, name: "notLeader"};
      }
    }
    if (model.totemFor) {
      let masterIsHired = false;
      for (const crewModel of this.currentCrew.models.master) {
        if (crewModel.name === model.totemFor) {
          masterIsHired = true;
          break;
        }
      }
      if (!masterIsHired) {
        return {hide: true, name: "totemForOther"};
      }
    }
    for (const keyword of this.currentCrew.keywords) {
      if (model.keywords && model.keywords.includes(keyword)) {
        return reply || {hide: false, name: ""};
      }
    }
    if (!model.factions.includes(this.currentCrew.faction)) {
      return {hide: true, name: "faction"};
    }
    return reply || {hide: false, name: ""};
  }

  public calculateSoulStoneUsage() {
    let usage: number = 0;
    for (const type of Reflect.ownKeys(this.currentCrew.models)) {
      for (const crewModel of this.currentCrew.models[type]) {
        if (crewModel.name !== this.currentCrew.leader) {
          usage += crewModel.cost;
        }
        if (crewModel.upgrade) {
          usage += +crewModel.upgrade.cost;
        }
      }
    }
    return usage;
  }

  public newCrew(faction:string = ""): void {
    this.currentCrew = {
      faction: faction ? faction : "",
      leader: "",
      keywords: [],
      extraVersatile: [],
      leaderType: null,
      models: {
        master: [],
        henchman: [],
        enforcer: [],
        minion: [],
        other: []
      },
      saveName: "",
      lastSave: null,
      versionCode: this.dataService.currentVersion,
      soulStones: 50
    };
    this.showCrewList(new Date().getTime());
    this.publishUpdateEvent();
  }

  private cacheKey(): string {
    return "crew_" + this.dataService.currentVersion;
  }

  public getCrew(): any {
    return this.currentCrew;
  }

  public getCrews(fromUserData:boolean = false): Promise<any> {
    if (fromUserData) {
      return new Promise(resolve => {
        resolve(this.firebaseService.getUserData(this.cacheKey()));
      });
    }
    return localForage.getItem(this.cacheKey()).then(this.handleGetCrewsResult);
  }

  private handleGetCrewsResult(value):Promise<any> {
    return new Promise<any>(((resolve, reject) => {
      if (value) {
        resolve(value);
      } else {
        resolve([]);
      }
    }));
  }

  public saveCrew(saveName: string): void {
    this.getCrews().then(crews => {
      let replace = false;
      this.currentCrew.saveName = saveName;
      this.currentCrew.versionCode = this.dataService.currentVersion;
      this.currentCrew.lastSave = new Date().getTime();
      for (let i = 0, len = crews.length, crew; i < len; i++) {
        crew = crews[i];
        if (crew.saveName === saveName) {
          crews[i] = this.currentCrew;
          replace = true;
          break;
        }
      }
      if (!replace) {
        crews.push(this.currentCrew);
      }
      this.saveCrews(crews);
    });
  }

  public saveCrews(crews, publish:boolean = true): void {
    this.firebaseService.storeUserData(this.cacheKey(), crews);
    localForage.setItem(this.cacheKey(), crews).then(() => {
      if (publish) {
        this.ea.publish("crewSave");
      }
    });
  }

  public loadCrew(saveName: string): void {
    this.getCrews().then(crews => {
      for (let i = 0, len = crews.length, crew; i < len; i++) {
        crew = crews[i];
        if (crew.saveName === saveName) {
          this.currentCrew = crew;
          this.showCrewList(crew.lastSave);
          break;
        }
      }
      this.publishUpdateEvent();
    });
  }

  public deleteCrew(saveName: string): Promise<any> {
    return this.getCrews().then(crews => {
      return new Promise(resolve => {
        for (let i = 0, len = crews.length, crew; i < len; i++) {
          crew = crews[i];
          if (crew.saveName === saveName) {
            crews.splice(i, 1);
            localForage.setItem(this.cacheKey(), crews);
            resolve(crews);
            break;
          }
        }
      });
    });
  }

  public showCrewList(lastModified: number): void {
    this.lastModified = lastModified;
    this.menuService.activateRightMenu();
  }

  public hideCrewList(): void {
    this.lastModified = null;
    if (this.currentCrew) {
      this.currentCrew.faction = null;
      this.currentCrew.leader = null;
      this.currentCrew.keywords = [];
      this.menuService.hideRightMenu();
      this.publishUpdateEvent();
      this.menuService.deactivateRightMenu();
    }
  }

  public supportsSharing(){
    return this.dataService.getData().then(data => {
      return data && data.factions && data.factions["arcanists"] && data.factions["arcanists"].models.length && data.factions["arcanists"].models[0].id;
    })
  }

  public getShareLink():string {
    const crew = this.getCrew();
    let link = "https://m3e.hong-crewet.dk/#/share/?";
    const params:any = {
      v: crew.versionCode,
      ss: crew.soulStones,
      f: crew.faction
    };
    const models = [];
    for (const type of Reflect.ownKeys(crew.models)) {
      for (const crewModel of crew.models[type]) {
        let model = crewModel.id+"|"+crewModel.cost;
        if (crewModel.upgrade){
          model+="|"+crewModel.upgrade.id;
        }
        models.push(model);
      }
    }
    params.m = models.join("-");
    for (const key of Reflect.ownKeys(params)) {
      link += String(key) + "=" + params[key] + "&";
    }
    return link;
  }

  public setCrewFromShare(shareCrew):Promise<any> {
    const self = this;
    return self.dataService.setVersion(shareCrew.v).then(data => {
      self.newCrew();
      self.currentCrew.faction = shareCrew.f;
      self.currentCrew.versionCode = shareCrew.v;
      self.currentCrew.soulStones = +shareCrew.ss;
      const promises = [];
      for (const shareModel of shareCrew.m.split("-")) {
        const split = shareModel.split("|");
        if (split.length > 1) {
          promises.push(self.dataService.getModelById(split[0]).then(model => {
            self.addModel(model);

            self.editModel(model, +split[1]);

            if (split[2]) {
              promises.push(self.dataService.getUpgradeById(split[2]).then(upgrade => {
                if (upgrade) {
                  self.addCrewModelUpgrade(model, upgrade);
                }
              }));
            }
          }));
        }
      }
      return Promise.all(promises);
    });
  }
}
