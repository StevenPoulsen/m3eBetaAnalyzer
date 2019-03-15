import {CrewBuilderService, BuyProblem} from "./crewBuilderService";
import {autoinject,observable} from "aurelia-framework";
import {EventAggregator} from 'aurelia-event-aggregator';
import * as localForage from 'localforage';
import {DataService} from "./dataService";
import {FirebaseService} from "./FirebaseService";

@autoinject()
export class FilterService {
  sortValues: string[] = ["wyrd","name","cost", "mv", "df", "wp", "health", "tax"];
  groupByValues: string[] = ["faction", "type", "none"];
  filters:any = {faction: {}, types: {}, keywords:{}, rules:{}, custom:{}, attacks:{}, tacticals: {}, statFilters: {}};
  options:any = {quickShow: [], sort: {reverse:false, modelSorts:[this.sortValues[0]]}, modelGroupBy:"faction"};
  crewLegalOnly: boolean = false;
  taxFreeOnly: boolean = false;
  @observable()
  freeText: string;
  custom:any = {
    owned:[],
    painted:[],
    favourites:[]
  };
  factions: any = [];
  types: any = [];
  keywords: any = [];
  rules: any = [];
  attacks: any = [];
  tacticals: any = [];
  stats: any = ["cost","df","wp","health","mv"];
  statsRanged = {"cost":{max:0,min:0}, "df":{max:0,min:0}, "wp":{max:0,min:0}, "health":{max:0,min:0}, "mv":{max:0,min:0}};
  filterChangeFunction: any = null;
  quickShows:string[] = ["factions","types","keywords","cost","mv","df","wp","sz","health"];
  customTypes:string[] = ["owned","painted","favourites","other"];
  loaded:any = {filters:false,options:false,custom:false};

  constructor(private crewBuilderService: CrewBuilderService, private ea: EventAggregator, private dataService: DataService, private firebaseService: FirebaseService) {
    this.loadOptions();
    this.loadFilters();
    this.loadCustom();
    ea.subscribe("userDataChanged", userData => {
      if (userData && userData.custom) {
        this.setCustom(userData.custom);
      }
    })
  }

  private loadComplete(name:string) {
    this.loaded[name] = true;
    for (const loadedName of Reflect.ownKeys(this.loaded)) {
      if (!this.loaded[loadedName]) {
        return;
      }
    }
    this.filterChange();
  }

  filterChange():void {
    if (this.filterChangeFunction) {
      this.filterChangeFunction();
    }

    this.saveFilters();
    this.saveOptions();
  }

  toggleCustom(type, model) {
    if (type && model && this.custom[type]) {
      const customs = this.custom[type].slice(0);
      const pos = customs.indexOf(model.name);
      if (pos > -1) {
        customs.splice(pos,1);
      } else {
        customs.push(model.name);
      }
      this.custom[type] = customs;
      if (!this.filters.custom) {
        this.filters.custom = {};
      }
      if (this.filters.custom[type]) {
        this.filterChange();
      }
      this.saveCustom();
    }
  }

  setCrewLegalOnly(bool: boolean) {
    this.crewLegalOnly = bool;
  }

  setQuickShow(key:string, show:boolean) {
    const i = this.options.quickShow.indexOf(key);
    if (show && i == -1) {
      this.options.quickShow.push(key);
    } else {
      if (i > -1) {
        this.options.quickShow = this.options.quickShow.slice(i,1);
      }
    }
  }

  filter(data): any {
    const filteredData = {factions:{}}, types = {}, keywords = {}, factions = {}, rules = {}, attacks = {}, tacticals = {}, definedStats = {};
    if (data) {
      const isFiltering = {};

      const filterTypes = (this.filters.types = this.filters.types || {}),
        filterFaction = (this.filters.faction = this.filters.faction || {}),
        filterKeywords = (this.filters.keywords = this.filters.keywords || {}),
        filterRules = (this.filters.rules = this.filters.rules || {}),
        filterAttacks = (this.filters.attacks = this.filters.attacks || {}),
        filterTacticals = (this.filters.tacticals = this.filters.tacticals || {}),
        filterStats = (this.filters.statFilters = this.filters.statFilters || {});

      for (const statKey of this.stats) {
        definedStats[statKey] = !!filterStats[statKey];
      }

      for (const customType of this.customTypes) {
        this.filters.custom[customType] = this.filters.custom[customType] !== false;
      }

      for (const faction in data.factions) {

        let factionModels = data.factions[faction].models;
        for (let factionModelIndex = 0, factionModelLength = factionModels.length, model; factionModelIndex < factionModelLength; factionModelIndex++) {
          model = factionModels[factionModelIndex];
          if (model.factions && this.crewBuilderService.isBuilding && !this.crewBuilderService.hasLeader() && !model.factions.includes(this.crewBuilderService.getCrew().faction)) {
            continue;
          }

          const isCrewModel = this.crewBuilderService.hasCrewModel(model.id);
          let isFiltered:boolean = false;

          const customFilterCheck: boolean = ((this.filters.custom.owned && this.custom.owned.indexOf(model.name) > -1)
            || (this.filters.custom.painted && this.custom.painted.indexOf(model.name) > -1)
            || (this.filters.custom.favourites && this.custom.favourites.indexOf(model.name) > -1)
            || (this.filters.custom.other && this.custom.owned.indexOf(model.name) + this.custom.painted.indexOf(model.name) + this.custom.favourites.indexOf(model.name) ===-3 ));
          isFiltered = !customFilterCheck;
          if (customFilterCheck || isCrewModel) {

            if (!isFiltered) {
              let primaryFaction = model.factions[0];
              factions[primaryFaction] = true;
              filterFaction[primaryFaction] = filterFaction[primaryFaction] !== false;
              let secondaryFaction = null;
              if (model.factions.length === 2) {
                secondaryFaction = model.factions[1];
                factions[secondaryFaction] = true;
                filterFaction[secondaryFaction] = filterFaction[secondaryFaction] !== false;
              }
            }

            const factionFilterCheck = !isFiltered && !FilterService.isFiltered(model.factions, filterFaction);
            isFiltered = !factionFilterCheck;

            let modelCharacteristics = model.charactaristics;
            if (factionFilterCheck || isCrewModel) {
              if (!isFiltered) {
                for (let typeIndex = 0, typeLength = modelCharacteristics.length, type; typeIndex < typeLength; typeIndex++) {
                  type = modelCharacteristics[typeIndex];
                  types[type] = true;
                  filterTypes[type] = filterTypes[type] !== false;
                }
              }

              const characteristicsFilterCheck = !isFiltered && !FilterService.isFiltered(modelCharacteristics, filterTypes);
              isFiltered = !characteristicsFilterCheck;

              if (characteristicsFilterCheck || isCrewModel) {
                let modelKeywords = model.keywords;
                if (!isFiltered) {
                  if (modelKeywords) {
                    if (this.crewBuilderService.isBuilding && model.crewKeywords) {
                      modelKeywords = modelKeywords.concat(model.crewKeywords);
                    }
                    for (let keywordIndex = 0, keywordLength = modelKeywords.length, keyword; keywordIndex < keywordLength; keywordIndex++) {
                      keyword = modelKeywords[keywordIndex];
                      keywords[keyword] = true;
                      filterKeywords[keyword] = filterKeywords[keyword] !== false;
                    }
                  } else {
                    keywords['None'] = true;
                    filterKeywords['None'] = filterKeywords['None'] !== false;
                  }
                }

                const keywordFilterCheck = !isFiltered && (!FilterService.isFiltered(modelKeywords, filterKeywords)|| (!modelKeywords && filterKeywords['None'] !== false));
                isFiltered = !keywordFilterCheck;

                if (keywordFilterCheck || isCrewModel) {
                  let modelRules = model.rules;

                  if (!isFiltered) {
                    for (let ruleIndex = 0, ruleLength = modelRules.length, rule; ruleIndex < ruleLength; ruleIndex++) {
                      rule = modelRules[ruleIndex];
                      rules[rule.name] = true;
                      filterRules[rule.name] = filterRules[rule.name] !== false;
                    }
                  }

                  const ruleFilterCheck = !isFiltered && !FilterService.isFiltered(modelRules, filterRules);
                  isFiltered = !ruleFilterCheck;

                  if (ruleFilterCheck || isCrewModel) {
                    let modelAttacks = model.attacks;

                    if (!isFiltered) {
                      if (modelAttacks && modelAttacks.length) {
                        for (let attackIndex = 0, attackLength = modelAttacks.length, attack; attackIndex < attackLength; attackIndex++) {
                          attack = modelAttacks[attackIndex];
                          attacks[attack.name] = true;
                          filterAttacks[attack.name] = filterAttacks[attack.name] !== false;
                        }
                      } else {
                        attacks['None'] = true;
                        filterAttacks['None'] = filterAttacks['None'] !== false;
                      }
                    }

                    let modelTacticals = model.tacticals;
                    if (!isFiltered) {
                      if (modelTacticals && modelTacticals.length) {
                        for (let tacticalIndex = 0, tacticalLength = modelTacticals.length, tactical; tacticalIndex < tacticalLength; tacticalIndex++) {
                          tactical = modelTacticals[tacticalIndex];
                          tacticals[tactical.name] = true;
                          filterTacticals[tactical.name] = filterTacticals[tactical.name] !== false;
                        }
                      } else {
                        tacticals['None'] = true;
                        filterTacticals['None'] = filterTacticals['None'] !== false;
                      }
                    }

                    const attackFilterCheck  = !isFiltered && (!FilterService.isFiltered(modelAttacks, filterAttacks)|| ((!modelAttacks || !modelAttacks.length) && filterAttacks['None'] !== false));
                    isFiltered = !attackFilterCheck;
                    if (attackFilterCheck || isCrewModel) {

                      const tacticalFilterCheck = !isFiltered && (!FilterService.isFiltered(modelTacticals, filterTacticals)
                        || ((!modelTacticals || !modelTacticals.length) && filterTacticals['None'] !== false));
                      isFiltered = !tacticalFilterCheck;

                      if (tacticalFilterCheck || isCrewModel) {
                        let modelStats = model.stats, modelStat, outOfStatRange = false;
                        if (!isFiltered) {
                          for (const statKey of this.stats) {
                            modelStat = +modelStats[statKey].value;
                            this.statsRanged[statKey] = {
                              min: 0,
                              max: Math.max(+this.statsRanged[statKey].max, +modelStat)
                            };
                            if ((filterStats[statKey] && filterStats[statKey].min && +modelStat < +filterStats[statKey].min)
                              || (filterStats[statKey] && filterStats[statKey].max && +modelStat > +filterStats[statKey].max)) {
                              outOfStatRange = true;
                              isFiltered = true;
                              this.missing(statKey, model);
                            }
                          }
                        }
                        
                        if (!outOfStatRange || isCrewModel) {
                          const freeTextFilterCheck = !isFiltered &&(!this.freeText || this.containsText(model));
                          isFiltered = !freeTextFilterCheck;
                          if (freeTextFilterCheck || isCrewModel) {
                            if (this.crewBuilderService.isBuilding) {
                              model.tax = this.crewBuilderService.calculateModelTax(model);
                              let buyProblem: BuyProblem = this.crewBuilderService.buyProblem(model);
                              const crewFilterCheck = !isFiltered && (this.crewBuilderService.isBuilding &&
                                (!this.crewLegalOnly || !buyProblem.hide) &&
                                (!this.taxFreeOnly || model.tax <= 0));
                              isFiltered = !crewFilterCheck;

                              if (crewFilterCheck || isCrewModel) {
                                model.problem = isFiltered ? 'filtered' : (this.crewLegalOnly ? buyProblem.name : '');
                                this.addModelToList(filteredData.factions, faction, model);
                              } else {
                                isFiltering["crewBuilder"] = true;
                                this.missing("crewBuilder", model);
                              }
                            } else {
                              this.addModelToList(filteredData.factions, faction, model);
                            }
                          } else {
                            isFiltering["text"] = true;
                            this.missing("text", model);
                          }
                        } else {
                          isFiltering["stats"] = true;
                          this.missing("stats", model);
                        }
                      } else {
                        isFiltering["tacticals"] = true;
                        this.missing("tacticals", model);
                      }
                    } else {
                      isFiltering["attacks"] = true;
                      this.missing("attacks", model);
                    }
                  } else {
                    isFiltering["rules"] = true;
                    this.missing("rules", model);
                  }
                } else {
                  isFiltering["keywords"] = true;
                  this.missing("keywords", model);
                }
              } else {
                isFiltering["types"] = true;
                this.missing("types", model);
              }
            } else {
              isFiltering["faction"] = true;
              this.missing("faction", model);
            }
          } else {
            isFiltering["custom"] = true;
            this.missing("custom", model);
          }
        }
      }

      for (const group in filteredData.factions) {
        if (this.options && this.options.sort && this.options.sort.modelSorts && this.options.sort.modelSorts.length && !(this.options.sort.modelSorts.length === 1 && this.options.sort.modelSorts[0] === "wyrd")) {
          filteredData.factions[group].models.sort((a, b) => {
            let result = 0, sortRule = 0;
            while (result === 0 && sortRule < this.options.sort.modelSorts.length) {
              switch (this.options.sort.modelSorts[sortRule]) {
                case "wyrd":
                  result = +a.id.split("_")[1] - +b.id.split("_")[1];
                  break;
                case "name":
                  result = FilterService.stringCompare(a.name, b.name);
                  break;
                case "cost":
                  result = (+a.stats.cost.value + (a.tax ? a.tax : 0)) - (+b.stats.cost.value + (b.tax ? b.tax : 0));
                  break;
                case "wp":
                  result = +a.stats.wp.value - +b.stats.wp.value;
                  break;
                case "df":
                  result = +a.stats.df.value - +b.stats.df.value;
                  break;
                case "mv":
                  result = +a.stats.mv.value - +b.stats.mv.value;
                  break;
                case "health":
                  result = +a.stats.health.value - +b.stats.health.value;
                  break;
                case "tax":
                  result = (a.tax ? a.tax : 0) - (b.tax ? b.tax : 0);
              }
              sortRule++;
            }
            return result;
          });
        }

        if (this.options && this.options.sort && this.options.sort.reverseSort) {
          filteredData.factions[group].models.reverse();
        }
      }

      this.types = Object.keys(types);
      this.types.sort((a, b) => {
        return FilterService.stringCompare(a, b)
      });
      this.keywords = Object.keys(keywords);
      this.keywords.sort((a, b) => {
        return FilterService.stringCompare(a, b)
      });
      this.factions = Object.keys(factions);
      this.factions.sort((a, b) => {
        return FilterService.stringCompare(a, b)
      });
      this.rules = Object.keys(rules);
      this.rules.sort((a, b) => {
        return FilterService.stringCompare(a, b)
      });
      this.attacks = Object.keys(attacks);
      this.attacks.sort((a, b) => {
        return FilterService.stringCompare(a, b);
      });
      this.tacticals = Object.keys(tacticals);
      this.tacticals.sort((a, b) => {
        return FilterService.stringCompare(a, b);
      });
      this.ea.publish("filterChanged", {filtering:isFiltering});
    }
    return filteredData;
  }

  private addModelToList(list: {}, faction:string, model: any) {
    let groupKey;
    switch (this.options.modelGroupBy) {
      case "faction":
        groupKey = faction;
        break;
      case "type":
        if (!list["master"]) {
          list["master"] = {name:"master", models:[]};
          list["henchman"] = {name:"henchman", models:[]};
          list["enforcer"] = {name:"enforcer", models:[]};
          list["minion"] = {name:"minion", models:[]};
        }
        groupKey = this.dataService.getModelType(model);
        break;
      case "none":
        groupKey = "All";
        break;
    }
    if (!list[groupKey]) {
      list[groupKey] = {name:groupKey, models:[]};
    }
    list[groupKey].models.push(model);
  }

  private missing(key:string, model:any) {
      // console.log("Model does not match", key, model);
  }

  getResetValues():any {
    const resetValues:any = {};
    resetValues.filters = {faction: {}, types: {}, keywords:{}, rules:{}, custom:{}, attacks:{}, tacticals: {}, statFilters: {}};
    resetValues.options = {quickShow: [], sort: {reverse:false, modelSorts:[this.sortValues[0]]}, modelGroupBy: "faction"};
    resetValues.crewLegalOnly = false;
    resetValues.taxFreeOnly = false;
    resetValues.freeText = undefined;
    return resetValues;
  }

  getCurrentValues():any {
    const currentValues:any = {};
    currentValues.filters = {};
    for (const filterKey of Reflect.ownKeys(this.filters)) {
      if (filterKey !== "__observers__") {
        let filters = Object.assign({},this.filters[filterKey]);
        Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
        currentValues.filters[filterKey] = filters;
      }
    }
    currentValues.options = {quickShow: this.options.quickShow.slice(0),
      sort: {reverse:!!this.options.sort.reverse, modelSorts:this.options.sort.modelSorts?this.options.sort.modelSorts.slice(0): [this.sortValues[0]]},
      modelGroupBy: this.options.modelGroupBy};
    currentValues.crewLegalOnly = this.crewLegalOnly;
    currentValues.taxFreeOnly = this.taxFreeOnly;
    currentValues.freeText = this.freeText;
    return currentValues;
  }

  updateWithValues(values:any):void {
    this.filters = values.filters;
    this.options = values.options;
    this.crewLegalOnly = values.crewLegalOnly;
    this.taxFreeOnly = values.taxFreeOnly;
    this.freeText = values.freeText;
  }

  clearFilters() {
    this.updateWithValues(this.getResetValues());
    this.filterChange();
  }

  saveValues(name:string, values):void {
    localForage.setItem("values_"+name, values);
  }

  loadValues(name:string): Promise<any> {
    return localForage.getItem("values_"+name);
  }

  private containsText(model) {
    const text = this.freeText.toLowerCase();
    if (model.name.toLowerCase().includes(text)) {
      return true;
    }
    const modelRules = model.rules;
    if (modelRules) {
      for (let ruleIndex = 0, ruleLength = modelRules.length, rule; ruleIndex < ruleLength; ruleIndex++) {
        rule = modelRules[ruleIndex];
        if (rule.text && rule.text.toLowerCase().includes(text)) {
          return true;
        }
        if (rule.name && rule.name.toLowerCase().includes(text)) {
          return true;
        }
      }
    }
    const modelAttacks = model.attacks;
    if (modelAttacks) {
      for (let attackIndex = 0, attackLength  = modelAttacks.length, attack; attackIndex < attackLength; attackIndex++) {
        attack = modelAttacks[attackIndex];
        if (this.actionContainsText(attack, text)) {
          return true;
        }
      }
    }
    const modelTacticals = model.tacticals;
    if (modelTacticals) {
      for (let tacticalIndex = 0, tacticalLength = modelTacticals.length, tactical; tacticalIndex < tacticalLength; tacticalIndex++) {
        tactical = modelTacticals[tacticalIndex];
        if (this.actionContainsText(tactical, text)) {
          return true;
        }
      }
    }
    return false;
  }

  private actionContainsText(action, text) {
    if (!action || !text) {
      return false;
    }
    if (action.name.toLowerCase().includes(text) || (action.rule && action.rule.toLowerCase().includes(text))) {
      return true;
    }
    const actionTriggers = action.triggers;
    if (actionTriggers) {
      for (let triggerIndex = 0, triggerLength = actionTriggers.length, trigger; triggerIndex < triggerLength; triggerIndex++) {
        trigger = actionTriggers[triggerIndex];
        if (trigger.name.toLowerCase().includes(text) || (trigger.rule && trigger.rule.toLowerCase().includes(text))) {
          return true;
        }
      }
    }
    return false;
  }

  freeTextChanged(newValue,oldValue) {
    this.filterChange();
  }

  private static stringCompare(a, b) {
    if (a < b) {return -1;}
    if (b < a) {return 1;}
    return 0;
  }

  private static isFiltered(values, filter) {
    if (!values) {
      return true;
    }
    for (let i = 0, len = values.length, a; i < len; i++) {
      a = values[i];
      if (typeof a === "string") {
        if (filter[a] === true) {
          return false;
        }
      } else if (typeof a === "object") {
        if (a.name) {
          if (filter[a.name] === true) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private loadFilters() {
    localForage.getItem("filters").then((value :any)=> {
      if (value) {
        if (!value.custom) {
          value.custom = {};
          for(const customType of this.customTypes) {
            value.custom[customType] = true;
          }
        }
        this.filters = Object.assign(this.filters, value);
      }
      this.loadComplete("filters");
    });
  }

  private saveFilters():Promise<any> {
    return localForage.setItem("filters", this.getCurrentValues().filters);
  }

  private loadOptions() {
    localForage.getItem("options").then(value => {
      if (value) {
        this.options = Object.assign(this.options, value);
      }
      if (!this.options.modelGroupBy) {
        this.options.modelGroupBy = this.groupByValues[0];
      }
      this.loadComplete("options");
    });
  }

  private saveOptions():Promise<any> {
    return localForage.setItem("options", this.getCurrentValues().options);
  }

  private saveCustom():Promise<any> {
    const customCopy = Object.assign({},this.custom);
    customCopy.saveTime = new Date().getTime();
    if (this.firebaseService.isSignedIn()) {
      this.firebaseService.storeUserData("custom", customCopy);
    }
    return localForage.setItem("custom", customCopy);
  }

  private loadCustom() {
    localForage.getItem("custom").then(value => {
      if (value) {
        this.custom = Object.assign(this.custom, value);
      }
      this.loadComplete("custom");
    });
  }

  private setCustom(custom) {
    if (custom && (!this.custom.saveTime || custom.saveTime > this.custom.saveTime)) {
      this.custom = custom;
    }
  }
}
