import {CrewBuilderService, BuyProblem} from "./crewBuilderService";
import {autoinject,observable} from "aurelia-framework";
import {EventAggregator} from 'aurelia-event-aggregator';
import * as localForage from 'localforage';

@autoinject()
export class FilterService {
  sortValues: string[] = ["wyrd","name","cost"]
  filters:any = {faction: {}, types: {}, keywords:{}, rules:{}, custom:{}, attacks:{}, tacticals: {}, statFilters: {}};
  options:any = {quickShow: [], sort: {reverse:false, modelSort:this.sortValues[0]}};
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
  quickShows:string[] = ["factions","types","keywords","cost","mv","df","wp","sz"];
  customTypes:string[] = ["owned","painted","favourites","other"];
  loaded:any = {filters:false,options:false,custom:false};

  constructor(private crewBuilderService: CrewBuilderService, private ea: EventAggregator) {
    this.loadFilters();
    this.loadOptions();
    this.loadCustom();
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
    this.options.quickShow[key] = show;
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
      for (const faction in data.factions) {
        filteredData.factions[faction] = {models: [], name: faction};
        let filteredDataFactionModels = filteredData.factions[faction].models;
        if (this.options && this.options.sort && this.options.sort.modelSort !== "wyrd") {
          data.factions[faction].models.sort((a, b) => {
            switch (this.options.sort.modelSort) {
              case "name":
                return FilterService.stringCompare(a.name, b.name);
              case "cost":
                return +a.stats.cost.value - +b.stats.cost.value;
            }
          });
        }
        for (const customType of this.customTypes) {
          this.filters.custom[customType] = this.filters.custom[customType] !== false;
        }
        if (this.options && this.options.sort && this.options.sort.reverseSort) {
          data.factions[faction].models.reverse();
        }

        let factionModels = data.factions[faction].models;
        for (let factionModelIndex = 0, factionModelLength = factionModels.length, model; factionModelIndex < factionModelLength; factionModelIndex++) {
          model = factionModels[factionModelIndex];
          if ((this.filters.custom.owned && this.custom.owned.indexOf(model.name) > -1)
            || (this.filters.custom.painted && this.custom.painted.indexOf(model.name) > -1)
            || (this.filters.custom.favourites && this.custom.favourites.indexOf(model.name) > -1)
            || (this.filters.custom.other && this.custom.owned.indexOf(model.name) + this.custom.painted.indexOf(model.name) + this.custom.favourites.indexOf(model.name) ===-3 )) {

            let primaryFaction = model.factions[0];
            factions[primaryFaction] = true;
            filterFaction[primaryFaction] = filterFaction[primaryFaction] !== false;
            let secondaryFaction = null;
            if (model.factions.length === 2) {
              secondaryFaction = model.factions[1];
              factions[secondaryFaction] = true;
              filterFaction[secondaryFaction] = filterFaction[secondaryFaction] !== false;
            }

            if (!FilterService.isFiltered(model.factions, filterFaction)) {
              let modelCharacteristics = model.charactaristics;
              for (let typeIndex = 0, typeLength = modelCharacteristics.length, type; typeIndex < typeLength; typeIndex++) {
                type = modelCharacteristics[typeIndex];
                types[type] = true;
                filterTypes[type] = filterTypes[type] !== false;
              }
              if (!FilterService.isFiltered(modelCharacteristics, filterTypes)) {
                let modelKeywords = model.keywords;
                if (modelKeywords) {
                  for (let keywordIndex = 0, keywordLength = modelKeywords.length, keyword; keywordIndex < keywordLength; keywordIndex++) {
                    keyword = modelKeywords[keywordIndex];
                    keywords[keyword] = true;
                    filterKeywords[keyword] = filterKeywords[keyword] !== false;
                  }
                } else {
                  keywords['None'] = true;
                  filterKeywords['None'] = filterKeywords['None'] !== false;
                }
                if (!FilterService.isFiltered(modelKeywords, filterKeywords)
                  || (!modelKeywords && filterKeywords['None'] !== false)) {
                  let modelRules = model.rules;
                  for (let ruleIndex = 0, ruleLength = modelRules.length, rule; ruleIndex < ruleLength; ruleIndex++) {
                    rule = modelRules[ruleIndex];
                    rules[rule.name] = true;
                    filterRules[rule.name] = filterRules[rule.name] !== false;
                  }
                  if (!FilterService.isFiltered(modelRules, filterRules)) {
                    let modelAttacks = model.attacks;
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
                    let modelTacticals = model.tacticals;
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
                    if (!FilterService.isFiltered(modelAttacks, filterAttacks)
                      || ((!modelAttacks || !modelAttacks.length) && filterAttacks['None'] !== false)) {
                      if (!FilterService.isFiltered(modelTacticals, filterTacticals)
                        || ((!modelTacticals || !modelTacticals.length) && filterTacticals['None'] !== false)) {
                        let modelStats = model.stats, modelStat, outOfStatRange = false;
                        for (const statKey of this.stats) {
                          modelStat = +modelStats[statKey].value;
                          this.statsRanged[statKey] = {
                            min: 0,
                            max: Math.max(+this.statsRanged[statKey].max, +modelStat)
                          };
                          if ((filterStats[statKey] && filterStats[statKey].min && +modelStat < +filterStats[statKey].min)
                            || (filterStats[statKey] && filterStats[statKey].max && +modelStat > +filterStats[statKey].max)) {
                            outOfStatRange = true;
                            this.missing(statKey, model);
                          }
                        }
                        if (!outOfStatRange) {
                          if ((!this.freeText || this.containsText(model))) {
                            if (this.crewBuilderService.isBuilding) {
                              model.tax = this.crewBuilderService.calculateModelTax(model);
                              let buyProblem: BuyProblem = this.crewBuilderService.buyProblem(model);
                              if (this.crewBuilderService.isBuilding &&
                                (!this.crewLegalOnly || !buyProblem.hide) &&
                                (!this.taxFreeOnly || model.tax <= 0)) {
                                model.problem = this.crewLegalOnly ? buyProblem.name : '';
                                filteredDataFactionModels.push(model);
                              } else {
                                isFiltering["crewBuilder"] = true;
                                this.missing("crewBuilder", model);
                              }
                            } else {
                              filteredDataFactionModels.push(model);
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

  private missing(key:string, model:any) {
      // console.log("Model does not match", key, model);
  }

  clearFilters() {
    this.filters = {faction: {}, types: {}, keywords:{}, rules:{}, custom:{}, attacks:{}, tacticals: {}, statFilters: {}};
    this.options = {quickShow: [], sort: {reverse:false, modelSort:this.sortValues[0]}};
    this.crewLegalOnly = false;
    this.taxFreeOnly = false;
    this.freeText = "";
    this.custom = {
      owned:[],
      painted:[],
      favourites:[]
    };
    this.filterChange();
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

  private saveFilters() {
    localForage.setItem("filters", this.filters);
  }

  private loadOptions() {
    localForage.getItem("options").then(value => {
      if (value) {
        this.options = Object.assign(this.options, value);
      }
      this.loadComplete("options");
    });
  }

  private saveOptions() {
    localForage.setItem("options", this.options);
  }

  private saveCustom() {
    localForage.setItem("custom", this.custom);
  }

  private loadCustom() {
    localForage.getItem("custom").then(value => {
      if (value) {
        this.custom = Object.assign(this.custom, value);
      }
      this.loadComplete("custom");
    });
  }
}
