import {CrewBuilderService} from "./crewBuilderService";
import {autoinject,observable} from "aurelia-framework";

@autoinject()
export class FilterService {
  sortValues: string[] = ["wyrd","name","cost"]
  filters:any = {faction: {}, types: {}, keywords:{}, rules:{}};
  options:any = {quickShow: [], sort: {reverse:false, modelSort:this.sortValues[0]}};
  costMax: number = 15;
  costMin: number = 0;
  factions: any = [];
  types: any = [];
  keywords: any = [];
  rules: any = [];
  filterChangeFunction: any = null;
  crewLegalOnly: boolean = false;
  taxFreeOnly: boolean = false;
  @observable()
  freeText: string;
  quickShows:string[] = ["factions","types","keywords","cost","mv","df","wp","sz"];

  constructor(private crewBuilderService: CrewBuilderService) {
    this.loadFilters();
    this.loadOptions();
  }

  filterChange():void {
    if (this.filterChangeFunction) {
      this.filterChangeFunction();
    }
    this.saveFilters();
    this.saveOptions();
  }

  setCrewLegalOnly(bool: boolean) {
    this.crewLegalOnly = bool;
  }

  setQuickShow(key:string, show:boolean) {
    this.options.quickShow[key] = show;
  }

  filter(data): any {
    const filteredData = {factions:{}}, types = {}, keywords = {}, factions = {}, rules = {};
    if (data) {
      for (const faction in data.factions) {
        filteredData.factions[faction] = {models: [], name: faction};
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
        if (this.options && this.options.sort && this.options.sort.reverseSort) {
          data.factions[faction].models.reverse();
        }
        for (let model of data.factions[faction].models) {
          for (let faction of model.factions) {
            factions[faction] = true;
            this.filters.faction[faction] = this.filters.faction[faction] !== false;
          }
          if (!FilterService.isFiltered(model.factions, this.filters.faction)) {
            for (let type of model.charactaristics) {
              types[type] = true;
              this.filters.types[type] = this.filters.types[type] !== false;
            }
            if (!FilterService.isFiltered(model.charactaristics, this.filters.types)) {
              if (model.keywords) {
                for (let keyword of model.keywords) {
                  keywords[keyword] = true;
                  this.filters.keywords[keyword] = this.filters.keywords[keyword] !== false;
                }
              } else {
                keywords['None'] = true;
                this.filters.keywords['None'] = this.filters.keywords['None'] !== false;
              }
              if (!FilterService.isFiltered(model.keywords, this.filters.keywords)
                || (!model.keywords && this.filters.keywords['None'] !== false)) {
                for (let rule of model.rules) {
                  rules[rule.name] = true;
                  this.filters.rules[rule.name] = this.filters.rules[rule.name] !== false;
                }
                if ((model.stats.cost.value >= this.costMin && model.stats.cost.value <= this.costMax)
                  && (!FilterService.isFiltered(model.rules, this.filters.rules))
                  && (!this.freeText || this.containsText(model))) {
                  if (this.crewBuilderService.isBuilding) {
                    model.tax = this.crewBuilderService.calculateModelTax(model);
                    if (this.crewBuilderService.isBuilding &&
                      (!this.crewLegalOnly || this.crewBuilderService.isLegal(model)) &&
                      (!this.taxFreeOnly || model.tax <= 0)) {
                      filteredData.factions[faction].models.push(model);
                    }
                  } else {
                    filteredData.factions[faction].models.push(model);
                  }
                }
              }
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
      }
    }
    return filteredData;
  }

  private containsText(model) {
    const text = this.freeText.toLowerCase();
    if (model.name.toLowerCase().includes(text)) {
      return true;
    }
    if (model.rules) {
      for (const rule of model.rules) {
        if (rule.name.toLowerCase().includes(text) || (rule.text && rule.text.toLowerCase().includes(text))) {
          return true;
        }
      }
    }
    if (model.attacks) {
      for (const attack of model.attacks) {
        if (this.actionContainsText(attack, text)) {
          return true;
        }
      }
    }
    if (model.tacticals) {
      for (const tactical of model.tacticals) {
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
    if (action.triggers) {
      for (const trigger of action.triggers) {
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
    for (const a of values) {
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
    const cacheString = localStorage.getItem("filters");
    if (cacheString) {
      this.filters = JSON.parse(cacheString);
    }
  }

  private saveFilters() {
    localStorage.setItem("filters", JSON.stringify(this.filters));
  }

  private loadOptions() {
    const cacheString = localStorage.getItem("options");
    if (cacheString) {
      this.options = JSON.parse(cacheString);
    }
  }

  private saveOptions() {
    localStorage.setItem("options", JSON.stringify(this.options));
  }
}
