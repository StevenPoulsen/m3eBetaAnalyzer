import {HttpClient} from 'aurelia-fetch-client';
import * as localForage from 'localforage';

interface VersionDataEntry {
  version: string,
  timestamp: number,
  factions: any,
  appVersion: string
}

export class DataService {
  private appVersion: string = "0.3";
  private data: VersionDataEntry;
  public factions = {
    "arcanists": {"displayName": "Arcanists"},
    "bayou": {"displayName": "Bayou"},
    "dmh": {"displayName": "Dead mans hand"},
    "guild": {"displayName": "The Guild"},
    "neverborn": {"displayName": "Neverborn"},
    "outcasts": {"displayName": "Outcasts"},
    "resser": {"displayName": "Resser"},
    "tt": {"displayName": "Ten Thunders"}
  };
  private factionKeys = {
    'Arcanists': 'arcanists',
    'Bayou': 'bayou',
    'Guild': 'guild',
    'Neverborn': 'neverborn',
    "Resurrectionist": "resser",
    "Ten Thunders": "tt"
  };
  public versionCodes: string[] = ["1.23", "1.31", "2.6.19", "2.7.19"];
  public currentVersion: string;

  constructor() {
    this.loadDataFromCache();
    this.currentVersion = this.getLatestVersionCode();
  }

  getAppVersion() {
    return this.appVersion;
  }

  getFactionImage(faction:string) {
    return this.getFactionKey(faction) + ".png";
  }

  getFactionKey(faction:string) {
    return this.factionKeys[faction] || faction.toLowerCase();
  }

  public getLatestVersionCode(): string {
    return this.versionCodes[this.versionCodes.length - 1];
  }

  public getFactionMap(): any {
    return DataService.getObjectAsMap(this.factions);
  }

  public static getObjectAsMap(obj): any {
    const map = new Map();
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        map.set(key, obj[key]);
      }
    }
    return map;
  }

  public getFactionDisplayName(factionKey): string {
    if (!factionKey || !this.factions || !this.factions[factionKey]) {
      return "?";
    }
    return this.factions[factionKey].displayName;
  }

  public getModel(name: string): Promise<any> {
    return this.getData(false).then((data) => {
      if (!name || !data) {
        return null;
      }
      for (const faction in data.factions) {
        if (data.factions.hasOwnProperty(faction)) {
          for (const model of data.factions[faction].models) {
            if (name === model.name) {
              return model;
            }
          }
        }
      }
      return null;
    });
  }

  public consumeFactionRules(version, faction, rules): void {
    const data = {name: faction, models: [], timestamp: new Date().getTime()};
    const lines = rules.split("\n");
    let state = "name", model, actionState = "stats", emptyLines = 0, ongoingSkill: boolean = false;
    for (const line of lines) {
      const t = line.trim();
      try {
        if (!t || t.startsWith("Ver. Date")) {
          emptyLines++;
          if (emptyLines > 1 && (state === "attacks" || state === "tacticals")) {
            if (model) {
              data.models.push(model);
            }
            state = "name";
          }
          continue;
        }
        emptyLines = 0;
        switch (state) {
          case "name":
            console.log("Reading model", t);
            model = {name: t, rules: [], stats: {}, attacks: [], tacticals: []};
            state = "charactaristics";
            break;
          case "charactaristics":
            const chars = [], charSplit = t.split(",");
            for (const char of charSplit) {
              const allowance = char.match(/([^(]+) \(([^)]+)\)/);
              if (allowance && allowance.length === 3) {
                chars.push(allowance[1].trim());
                if (chars[chars.length - 1] === "Totem") {
                  model.totemFor = allowance[2];
                } else {
                  model.allowance = +allowance[2];
                }
              } else {
                chars.push(char.trim());
              }
            }
            model.charactaristics = chars;
            state = "keywords";
            break;
          case "keywords":
            if (t.indexOf(":") === -1) {
              model.keywords = t.split(", ");
              break;
            }
            state = "rules";
          case "rules":
            const size = t.match(/([0-9]{2})mm, Sz ([0-9])/);
            if (size && size.length === 3) {
              model.size = {base: +size[1], height: +size[2]};
              state = "faction";
              ongoingSkill = false;
              continue;
            }
            const split = t.split(":");
            if (!ongoingSkill && split.length > 1) {
              ongoingSkill = true;
              const nameSplit = split[0].match(/^([^+]+)\+([0-9])(.*)$/i);
              if (nameSplit) {
                let name = nameSplit[1] + nameSplit[3];
                let value = +nameSplit[2];
                const nameType = name.match(/^([^\(]+) \(([^)]+)\)$/);
                if (nameType) {
                  model.rules.push({name: nameType[1].toLowerCase(), type: nameType[2], value: value});
                } else {
                  model.rules.push({name: name.toLowerCase(), value: value});
                }
              } else {
                const match = split[0].match(/^([^\(]+) \(([^)]+)\)$/);
                if (match && match.length === 3) {
                  model.rules.push({name: match[1].toLowerCase(), type: match[2]});
                } else {
                  const trigger = split[0].match(/^(Df|Wp|Df\/Wp|Df\/Mv) \(([a-z]+)\) (.*)$/i);
                  if (trigger && trigger.length === 4) {
                    model.rules.push({name: trigger[3].toLowerCase(), trigger: trigger[1], suit: trigger[2]});
                  } else {
                    model.rules.push({name: split[0].toLowerCase()});
                  }
                }
              }
              model.rules[model.rules.length - 1].text = split[1].trim();
            } else {
              model.rules[model.rules.length - 1].text = this.appendText(model.rules[model.rules.length - 1].text, t);
            }
            if (t.endsWith(".")) {
              ongoingSkill = false;
            }
            break;
          case "faction":
            model.factions = t.split(", ");
            state = "stats";
            break;
          case "stats":
            const stat = t.split(":");
            if (!model.stats) {

            }
            model.stats[stat[0].toLowerCase()] = this.splitStatSuit(stat[1]);
            if (stat[0] === "Wp") {
              state = "actions";
            }
            break;
          case "actions":
            if (t.startsWith("Attack Actions -")) {
              state = "attacks";
              continue;
            }
            if (t.startsWith("Tactical Actions -")) {
              state = "tacticals";
              continue;
            }
            break;
          case "attacks":
          case "tacticals":
            if (t.startsWith("Tactical Actions -")) {
              state = "tacticals";
              continue;
            }
            let actionStats = this.splitActionStats(t);
            if (actionStats) {
              actionState = "stats";
            }
            switch (actionState) {
              case "stats":
                model[state].push(actionStats);
                actionState = "rule";
                break;
              case "rule":
              case "triggers":
                let newTrigger = t.match(/^([cmtr]+) (.*)/i);
                if (!newTrigger) {
                  if (actionState === "triggers") {
                    model[state][model[state].length - 1][actionState][model[state][model[state].length - 1][actionState].length - 1].rule = this.appendText(model[state][model[state].length - 1][actionState][model[state][model[state].length - 1][actionState].length - 1].rule, t);
                  } else {
                    model[state][model[state].length - 1][actionState] = this.appendText(model[state][model[state].length - 1][actionState], t);
                  }
                } else {
                  let triggerName = newTrigger[2].split(":");
                  model[state][model[state].length - 1].triggers = model[state][model[state].length - 1].triggers || [];
                  model[state][model[state].length - 1].triggers.push({
                    suit: newTrigger[1],
                    name: triggerName[0],
                    rule: triggerName[1]
                  });
                  actionState = "triggers";
                }
                break;

            }
            break;
        }
      } catch (e) {
        console.error("Unable to parse line ", t, model, e);
        return;
      }
    }
    this.addFactionData(version, data);
  }

  public consumeFactionUpgrades(version: string, faction: string, upgrades: string): void {
    const data = {name: faction, upgrades: [], timestamp: new Date().getTime()};
    const lines: string[] = upgrades.split("\n");
    let state: string = "new", upgrade:any, emptyLines: number = 0, text:string = "", limitations:string = "", action:any, actionState:string;
    for (const line of lines) {
      const t = line.trim();
      try {
        if (!t) {
          emptyLines++;
          if (state === "limitations" && limitations && upgrade) {
            upgrade.limitations.special = this.extractLimitations("special",limitations);
            upgrade.limitations.restricted = this.extractLimitations("restricted",limitations);
            upgrade.limitations.plentiful = this.extractLimitations("plentiful", limitations);
            state = "name";
          } else if (state === "content") {
            if (text && upgrade) {
              upgrade.texts.push(text);
              text = "";
            }
          } else if (state === "action") {
            if (action && upgrade){
              upgrade.actions.push(action);
              action = null;
              state = "content";
            }
          }
          continue;
        }
        emptyLines = 0;
        switch (state) {
          case "new":
            if (t === "Cost: SS") {
              state = "content";
              upgrade = {texts: [], abilities: [], minionAbilities: [], name: "", cost: 0, limitations: {}, actions: []};
            }
            break;
          case "name":
            if (t.toLowerCase() === "limitations") {
              if (upgrade) {
                data.upgrades.push(upgrade);
              }
              state = "new";
            } else {
              upgrade.name = t;
            }
            break;
          case "content":
            if (t.match(/^[0-9]+$/)) {
              upgrade.cost = t;
              state = "limitations";
              limitations = "";
              break;
            }
            text = this.appendText(text, t);
            if (t.endsWith(".") || t.endsWith(":")) {
              upgrade.texts.push(text);
              if (text.match(/.*gains the following.* Actions?:/i)) {
                state = "action";
              }
              text = "";
            }
            break;
          case "action":
            if (!action) {
              action = {type:t.split("Rg")[0].trim()};
              break;
            }
            let actionStats = this.splitActionStats(t);
            if (actionStats) {
              actionState = "stats";
            }
            switch (actionState) {
              case "stats":
                Object.assign(action, actionStats);
                actionState = "rule";
                break;
              case "rule":
              case "triggers":
                let newTrigger = t.match(/^([cmtr]+) (.*)/i);
                if (!newTrigger) {
                  if (actionState === "triggers") {
                    action[actionState][action[actionState].length - 1].rule = this.appendText(action[actionState][action[actionState].length - 1].rule, t);
                  } else {
                    action[actionState] = this.appendText(action[actionState], t);
                  }
                } else {
                  let triggerName = newTrigger[2].split(":");
                  action.triggers = action.triggers || [];
                  action.triggers.push({
                    suit: newTrigger[1],
                    name: triggerName[0],
                    rule: triggerName[1]
                  });
                  actionState = "triggers";
                }
                break;

            }
            break;
          case "limitations":
            limitations += t;
            break;
        }
      } catch (e) {
        console.error("Unable to parse upgrade line: ", t, upgrade, e);
      }
    }
    if (upgrade) {
      data.upgrades.push(upgrade);
    }


    this.addFactionUpgrades(version, data);
  }

  private appendText(target, text): string {
    if (!target) {
      target = text;
    } else {
      target += " " + text;
    }
    return target;
  }

  private splitStatSuit(statValue): any {
    if (!statValue) {
      return {value: 0};
    }
    const match = statValue.match(/([0-9]+)([a-z])/i);
    if (match && match.length === 3) {
      return {value: +match[1], suit: match[2]};
    }
    return {value: +statValue};
  }

  private splitActionStats(line): any {
    const match = line.match(/^(.+) (([a-z]?[0-9][0-9]?")|(x)|(-)) (([0-9][0-9]?[a-z\-+]*)|(x)|(-)) ([^ ]*) (([0-9][0-9]?[a-z]?)|(-)|(x))?$/i);
    if (match && match.length === 15) {
      if (match[1].match(/[Ff][A-Z"].*/)) {
        return {name: match[1].substr(1), rg: match[2], stat: match[6], rst: match[10], tn: match[11], bonus: true};
      }
      return {name: match[1], rg: match[2], stat: match[6], rst: match[10], tn: match[11]};
    }
    return null;
  }

  private extractLimitations(name:string, limitations:string) {
    const match = limitations.toLowerCase().match(new RegExp(name.toLowerCase() + " ?.([^()]+)"));;
    if (match) {
      if (name.toLowerCase() === "plentiful") {
        return +match[1];
      }
      return match[1].split(", ");
    }
    return null;
  }

  private addFactionData(version: string, data: any): void {
    let factions;
    if (this.data) {
      factions = this.data.factions;
    } else {
      factions = {};
    }

    if (factions[data.name]) {
      this.factions[data.name].models = data.models;
    } else {
      factions[data.name] = data;
    }
    this.data = {version: version, timestamp: new Date().getTime(), factions: factions, appVersion: this.appVersion};
    this.saveData();
  }

  private addFactionUpgrades(version: string, data: any): void {
    let factions:any;
    if (this.data) {
      factions = this.data.factions;
    } else {
      factions = {};
    }
    if (factions[data.name]) {
      factions[data.name].upgrades = data.upgrades;
    } else {
      factions[data.name] = data;
    }
    console.log("Adding faction upgrades", data, factions);
    this.data = {version: version, timestamp: new Date().getTime(), factions: factions, appVersion: this.appVersion};
    this.saveData();
  }

  public getData(anew: boolean = false): Promise<VersionDataEntry> {
    return this.getDataVersion(this.currentVersion, anew);
  }

  public getDataVersion(version: string, anew: boolean = false): Promise<VersionDataEntry> {
    if (anew || !this.data) {
      return this.loadDataFromCache().then(data => {
        this.data = data;
        return this.ensureDataIsUpToDate(version);
      });
    } else {
      return this.ensureDataIsUpToDate(version);
    }
  }

  private ensureDataIsUpToDate(version: string): Promise<VersionDataEntry> {
    if (this.data && this.data.version === version && this.data.appVersion === this.appVersion) {
      return new Promise<VersionDataEntry>(((resolve, reject) => {
        resolve(this.data);
      }));
    }
    return this.fetchDataFile(version);
  }

  private fetchDataFile(version: string): Promise<VersionDataEntry> {
    const client = new HttpClient();
    const self = this;
    return client.fetch("data/" + version.replace(/\./g, "_") + ".json?noCache="+new Date().getTime())
      .then(response => response.json())
      .then(data => {
        data.appVersion = self.appVersion;
        self.data = data;
        self.saveData();
        return data;
      });
  }

  private loadDataFromCache(): Promise<VersionDataEntry> {
    return localForage.getItem("data");
  }

  private saveData(): void {   
    localForage.setItem("data", this.data);
  }

}
